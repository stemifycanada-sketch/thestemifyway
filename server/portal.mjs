import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { requireUser, nameSchema, passwordSchema } from './auth.mjs'
import { hashPassword, HttpError, audit, rateLimit } from './security.mjs'

const idSchema = z.string().uuid()
const timezoneSchema = z.string().max(100).refine(value => {
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true } catch { return false }
}, 'Choose a valid time zone.')
const joinUrlSchema = z.string().max(2000).refine(value => {
  if (!value) return true
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && (u.hostname === 'zoom.us' || u.hostname.endsWith('.zoom.us') || u.hostname === 'zoom.com' || u.hostname.endsWith('.zoom.com')) } catch { return false }
}, 'Enter a secure Zoom meeting link.')
const classSchema = z.object({ studentId: idSchema, title: nameSchema, subject: nameSchema, teacher: nameSchema,
  startsAt: z.string().datetime({ offset: true }), durationMinutes: z.number().int().min(10).max(240),
  status: z.enum(['scheduled', 'completed', 'cancelled']).default('scheduled'), joinUrl: joinUrlSchema.default(''),
  zoomMeetingId: z.string().regex(/^\d{9,11}$|^$/).default(''), zoomUuid: z.string().max(200).default(''), preparation: z.string().trim().max(5000).default('') })

export function mountPortal(app, db, config) {
  app.get('/api/dashboard', async (req, res) => {
    const user = requireUser(req)
    const staff = user.role === 'staff'
    const scope = staff ? 'TRUE' : user.role === 'parent' ? 's.parent_id=$1' : 's.account_id=$1'
    const args = staff ? [] : [user.id]
    const students = await db.query(`SELECT s.id,s.name,s.grade,s.timezone,s.account_id,u.login_name${staff ? ',p.name AS parent_name,p.email AS parent_email' : ''}
      FROM students s LEFT JOIN users u ON u.id=s.account_id JOIN users p ON p.id=s.parent_id WHERE ${scope} ORDER BY s.name`, args)
    const classes = await db.query(`SELECT c.*,s.name AS student_name,s.timezone,n.published_summary,n.published_next_steps,n.published_at
      ${staff ? ',n.draft_summary,n.draft_next_steps,n.source,n.version AS note_version,n.published_version' : ''}
      FROM classes c JOIN students s ON s.id=c.student_id LEFT JOIN lesson_notes n ON n.class_id=c.id
      WHERE ${scope} ORDER BY c.starts_at DESC LIMIT 500`, args)
    // Parent and student responses omit webhook identifiers and all unpublished text.
    const visibleClasses = classes.rows.map(row => {
      if (!staff) { delete row.zoom_uuid; delete row.zoom_meeting_id }
      return row
    })
    let integration
    if (staff) {
      const counts = await db.query('SELECT status,count(*)::int AS count FROM zoom_events GROUP BY status')
      const state = await db.query('SELECT key,value FROM integration_state')
      const unresolved = await db.query(`SELECT id,event_type,meeting_uuid,status,received_at,payload->'payload'->'object'->>'meeting_id' AS meeting_id,payload->'payload'->'object'->>'meeting_start_time' AS starts_at FROM zoom_events WHERE status IN ('unmatched','failed') AND payload <> '{}'::jsonb ORDER BY received_at DESC LIMIT 30`)
      integration = { configured: Boolean(config.zoomSecret && config.zoomAccount), counts: counts.rows, unresolved: unresolved.rows, state: Object.fromEntries(state.rows.map(r => [r.key, r.value])) }
    }
    res.json({ students: students.rows, classes: visibleClasses, integration })
  })
  app.post('/api/students', async (req, res) => {
    const user = requireUser(req, ['parent'])
    const input = z.object({ name: nameSchema, grade: z.string().trim().min(1).max(40), timezone: timezoneSchema.default('America/Toronto') }).parse(req.body)
    await rateLimit(db, `students:${user.id}`, 20)
    const id = randomUUID()
    await db.transaction(async tx => {
      await tx.query('INSERT INTO students(id,parent_id,name,grade,timezone) VALUES($1,$2,$3,$4,$5)', [id, user.id, input.name, input.grade, input.timezone])
      await audit(tx, user.id, 'student_created', id)
    })
    res.status(201).json({ id })
  })
  app.post('/api/students/:id/login', async (req, res) => {
    const user = requireUser(req, ['parent'])
    const id = idSchema.parse(req.params.id)
    const input = z.object({ username: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9._-]{3,39}$/, 'Use 4–40 letters, numbers, dots or dashes; start with a letter.'), password: passwordSchema }).parse(req.body)
    await rateLimit(db, `child-login:${user.id}`, 20)
    const hash = await hashPassword(input.password)
    await db.transaction(async tx => {
      const { rows: [student] } = await tx.query('SELECT * FROM students WHERE id=$1 AND parent_id=$2 FOR UPDATE', [id, user.id])
      if (!student) throw new HttpError(404, 'Student not found.')
      let accountId = student.account_id
      if (accountId) {
        await tx.query('UPDATE users SET login_name=$1,password_hash=$2 WHERE id=$3', [input.username, hash, accountId])
        await tx.query('DELETE FROM sessions WHERE user_id=$1', [accountId])
      } else {
        accountId = randomUUID()
        await tx.query(`INSERT INTO users(id,login_name,name,password_hash,role,verified_at) VALUES($1,$2,$3,$4,'student',now())`, [accountId, input.username, student.name, hash])
        await tx.query('UPDATE students SET account_id=$1 WHERE id=$2', [accountId, id])
      }
      await audit(tx, user.id, 'student_login_set', id)
    })
    res.json({ message: 'Student login saved. Share the username and password with your child privately.' })
  })
  app.delete('/api/students/:id/login', async (req, res) => {
    const user = requireUser(req, ['parent']), id = idSchema.parse(req.params.id)
    await db.transaction(async tx => {
      const { rows: [student] } = await tx.query('SELECT account_id FROM students WHERE id=$1 AND parent_id=$2 FOR UPDATE', [id, user.id])
      if (!student) throw new HttpError(404, 'Student not found.')
      if (student.account_id) {
        await tx.query('UPDATE students SET account_id=NULL WHERE id=$1', [id])
        await tx.query('DELETE FROM users WHERE id=$1', [student.account_id])
      }
      await audit(tx, user.id, 'student_login_disabled', id)
    })
    res.json({ ok: true })
  })
  async function saveClass(req, res, updating) {
    const user = requireUser(req, ['staff']), input = classSchema.parse(req.body)
    const id = updating ? idSchema.parse(req.params.id) : randomUUID()
    const version = updating ? z.number().int().positive().parse(req.body.version) : null
    await db.transaction(async tx => {
      if (!(await tx.query('SELECT id FROM students WHERE id=$1', [input.studentId])).rows.length) throw new HttpError(404, 'Student not found.')
      const values = [input.studentId, input.title, input.subject, input.teacher, input.startsAt, input.durationMinutes, input.status, input.joinUrl, input.zoomMeetingId, input.zoomUuid || null, input.preparation, id]
      if (updating) {
        const result = await tx.query(`UPDATE classes SET student_id=$1,title=$2,subject=$3,teacher=$4,starts_at=$5,duration_minutes=$6,status=$7,join_url=$8,zoom_meeting_id=$9,zoom_uuid=$10,preparation=$11,version=version+1 WHERE id=$12 AND version=$13 AND student_id=$1 RETURNING id`, [...values, version])
        if (!result.rows.length) throw new HttpError(409, 'This class changed. Refresh before saving again.')
      } else {
        await tx.query(`INSERT INTO classes(student_id,title,subject,teacher,starts_at,duration_minutes,status,join_url,zoom_meeting_id,zoom_uuid,preparation,id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, values)
        await tx.query('INSERT INTO lesson_notes(class_id) VALUES($1)', [id])
      }
      await audit(tx, user.id, updating ? 'class_updated' : 'class_created', id)
      await tx.query(`UPDATE zoom_events SET status='pending',attempts=0,next_attempt=now() WHERE status IN ('unmatched','failed') AND payload <> '{}'::jsonb`)
    })
    res.status(updating ? 200 : 201).json({ id })
  }
  app.post('/api/classes', (req, res) => saveClass(req, res, false))
  app.put('/api/classes/:id', (req, res) => saveClass(req, res, true))
  app.put('/api/classes/:id/notes', async (req, res) => {
    const user = requireUser(req, ['staff']), id = idSchema.parse(req.params.id)
    const input = z.object({ summary: z.string().trim().max(30000), nextSteps: z.string().trim().max(10000), version: z.number().int().positive() }).parse(req.body)
    await db.transaction(async tx => {
      const result = await tx.query(`UPDATE lesson_notes SET draft_summary=$1,draft_next_steps=$2,version=version+1,updated_at=now(),source='Teacher review'
        WHERE class_id=$3 AND version=$4 RETURNING class_id`, [input.summary, input.nextSteps, id, input.version])
      if (!result.rows.length) throw new HttpError(409, 'Notes changed. Refresh before saving again.')
      await audit(tx, user.id, 'notes_edited', id)
    })
    res.json({ ok: true })
  })
  app.post('/api/classes/:id/publish', async (req, res) => {
    const user = requireUser(req, ['staff']), id = idSchema.parse(req.params.id)
    const { version } = z.object({ version: z.number().int().positive() }).parse(req.body)
    await db.transaction(async tx => {
      const result = await tx.query(`UPDATE lesson_notes SET published_summary=draft_summary,published_next_steps=draft_next_steps,published_at=now(),published_by=$1,published_version=version
        WHERE class_id=$2 AND version=$3 AND length(trim(draft_summary))>0 RETURNING class_id`, [user.id, id, version])
      if (!result.rows.length) throw new HttpError(409, 'Save a summary and refresh the notes before publishing.')
      await audit(tx, user.id, 'notes_published', id)
    })
    res.json({ ok: true })
  })
}
