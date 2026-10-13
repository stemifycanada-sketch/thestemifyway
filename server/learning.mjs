import express from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { requireUser, nameSchema } from './auth.mjs'
import { HttpError, audit, rateLimit } from './security.mjs'

const idSchema = z.string().uuid()
const maximumFileSize = 5 * 1024 * 1024
const pageSize = 50
const pageSchema = z.string().regex(/^\d+$/, 'Choose a valid page.').default('0').transform(Number).pipe(z.number().int().min(0).max(10000))
const resourceColumns = 'r.id,r.title,r.description,r.subject,r.grade,r.kind,r.visibility,r.file_id,f.name AS file_name,r.link_url,r.embed_url,r.published,r.created_at'
const secureUrl = value => {
  if (!value) return true
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') } catch { return false }
}
const waygroundUrl = value => {
  if (!value || !secureUrl(value)) return false
  const url = new URL(value)
  return ['wayground.com', 'quizizz.com'].some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`))
}
const optionalUrl = z.string().trim().max(2000).default('').refine(secureUrl, 'Use an HTTPS link without embedded credentials.')
const resourceSchema = z.object({ title: nameSchema, description: z.string().trim().max(10000).default(''), subject: nameSchema,
  grade: z.string().trim().min(1).max(60), kind: z.enum(['worksheet','wayground','reference']), visibility: z.enum(['assigned','library']),
  fileId: idSchema.nullish(), linkUrl: optionalUrl, embedUrl: optionalUrl, published: z.boolean().default(false) }).superRefine((data, ctx) => {
  if (!data.description && !data.fileId && !data.linkUrl && !data.embedUrl) ctx.addIssue({ code: 'custom', message: 'Add a file, a link or resource instructions.' })
  if (data.kind === 'wayground') {
    if (!data.linkUrl && !data.embedUrl) ctx.addIssue({ code: 'custom', message: 'Add an official Wayground share or embed link.' })
    if (data.linkUrl && !waygroundUrl(data.linkUrl)) ctx.addIssue({ code: 'custom', message: 'Use an official Wayground or Quizizz link.' })
    if (data.embedUrl && !waygroundUrl(data.embedUrl)) ctx.addIssue({ code: 'custom', message: 'Use the official HTTPS embed link copied from Wayground.' })
  } else if (data.embedUrl) ctx.addIssue({ code: 'custom', message: 'Only Wayground resources can be embedded.' })
})
function studentScope(user, alias = 's', arg = '$1') {
  return user.role === 'staff' ? 'TRUE' : `${alias}.${user.role === 'parent' ? 'parent_id' : 'account_id'}=${arg}`
}
function resourceScope(user, alias = 'r', arg = '$1') {
  return user.role === 'staff' ? 'TRUE' : `(${alias}.published AND (${alias}.visibility='library' OR EXISTS(SELECT 1 FROM learning_assignments access_a JOIN students access_s ON access_s.id=access_a.student_id WHERE access_a.resource_id=${alias}.id AND ${studentScope(user, 'access_s', arg)})))`
}
async function attachFile(tx, id, userId) {
  if (!id) return
  const result = await tx.query('UPDATE learning_files SET attached=true WHERE id=$1 AND uploaded_by=$2 AND attached=false RETURNING id', [id, userId])
  if (!result.rows.length) throw new HttpError(404, 'Upload your own new file before attaching it.')
}
function validFile(mime, bytes) {
  if (mime === 'application/pdf') return bytes.subarray(0, 5).toString() === '%PDF-'
  if (mime === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
  if (mime === 'image/jpeg') return bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))
  return false
}
export function mountLearning(app, db) {
  app.get('/api/learning', async (req, res) => {
    const user = requireUser(req), args = user.role === 'staff' ? [] : [user.id]
    const page = pageSchema.parse(req.query.page), extraArg = `$${args.length + 1}`
    const [resourcePage, assignmentPage] = await Promise.all([
      db.query(`SELECT ${resourceColumns}
        FROM learning_resources r LEFT JOIN learning_files f ON f.id=r.file_id WHERE ${resourceScope(user)} ORDER BY r.created_at DESC,r.id DESC LIMIT 51 OFFSET ${extraArg}`, [...args, page * pageSize]),
      db.query(`SELECT a.id,a.student_id,s.name AS student_name,a.resource_id,a.title,a.instructions,a.due_at,a.status,a.version,a.created_at
        FROM learning_assignments a JOIN students s ON s.id=a.student_id WHERE ${studentScope(user)}
        ORDER BY (a.status='reviewed') ASC,a.created_at DESC,a.id DESC LIMIT 51 OFFSET ${extraArg}`, [...args, page * pageSize]),
    ])
    const assignments = assignmentPage.rows.slice(0, pageSize)
    const resourceIds = [...new Set(assignments.map(row => row.resource_id).filter(Boolean))]
    // Assigned worksheets remain available even when they fall outside the current library page.
    const [linkedResources, submissions] = await Promise.all([
      resourceIds.length ? db.query(`SELECT ${resourceColumns} FROM learning_resources r LEFT JOIN learning_files f ON f.id=r.file_id
        WHERE ${resourceScope(user)} AND r.id=ANY(${extraArg}::uuid[]) ORDER BY r.created_at DESC,r.id DESC`, [...args, resourceIds]) : { rows: [] },
      assignments.length ? db.query(`SELECT sub.id,sub.assignment_id,sub.attempt,sub.answer_text,sub.file_id,f.name AS file_name,sub.submitted_at,sub.feedback,sub.score,sub.review_status,sub.reviewed_at
        FROM learning_submissions sub JOIN learning_assignments a ON a.id=sub.assignment_id JOIN students s ON s.id=a.student_id LEFT JOIN learning_files f ON f.id=sub.file_id
        WHERE ${studentScope(user)} AND a.id=ANY(${extraArg}::uuid[]) ORDER BY sub.attempt DESC,sub.submitted_at DESC,sub.id DESC`, [...args, assignments.map(row => row.id)]) : { rows: [] },
    ])
    const resources = [...new Map([...resourcePage.rows.slice(0, pageSize), ...linkedResources.rows].map(row => [row.id, row])).values()]
    res.json({ resources, assignments, submissions: submissions.rows.map(row => ({ ...row, score: row.score === null ? null : Number(row.score) })),
      page, hasMore: resourcePage.rows.length > pageSize || assignmentPage.rows.length > pageSize })
  })
  app.post('/api/learning/files', (req, _res, next) => { requireUser(req); next() }, express.raw({ type: ['application/pdf','image/png','image/jpeg'], limit: maximumFileSize }), async (req, res) => {
    const user = requireUser(req)
    await rateLimit(db, `learning-upload:${user.id}`, 20)
    let name
    try { name = decodeURIComponent(req.headers['x-file-name'] || '') } catch { throw new HttpError(400, 'Invalid file name.') }
    if (!name || name.length > 180 || /[/\\]/.test(name) || [...name].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) throw new HttpError(400, 'Use a file name without paths or control characters.')
    const mime = req.headers['content-type']?.split(';')[0]?.trim().toLowerCase(), content = req.body
    if (!Buffer.isBuffer(content) || !content.length || !validFile(mime, content)) throw new HttpError(400, 'Upload a PDF, PNG or JPEG file with the correct file type.')
    const extension = mime === 'application/pdf' ? '.pdf' : mime === 'image/png' ? '.png' : '.jpg'
    // Force the downloaded extension to match the validated type; never download user-supplied HTML names.
    name = name.replace(/\.[^.]+$/, '') + extension
    const id = randomUUID()
    await db.transaction(async tx => {
      let quotaOwner = user.id
      if (user.role === 'student') {
        const { rows: [student] } = await tx.query('SELECT parent_id FROM students WHERE account_id=$1', [user.id])
        if (!student) throw new HttpError(401, 'Please sign in again.')
        quotaOwner = student.parent_id
      }
      // A family shares one durable allowance, even after a child login is replaced.
      const { rows: [owner] } = await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [quotaOwner])
      if (!owner) throw new HttpError(401, 'Please sign in again.')
      const { rows: [quota] } = await tx.query('SELECT COALESCE(sum(byte_size),0)::bigint AS bytes,count(*)::int AS count FROM learning_files WHERE quota_owner=$1', [quotaOwner])
      if (Number(quota.bytes) + content.length > 100 * 1024 * 1024 || quota.count >= 200) throw new HttpError(413, 'Your upload allowance is full. Ask the teaching team for help.')
      await tx.query('INSERT INTO learning_files(id,uploaded_by,quota_owner,name,mime_type,byte_size,content) VALUES($1,$2,$3,$4,$5,$6,$7)', [id, user.id, quotaOwner, name, mime, content.length, content])
      await audit(tx, user.id, 'learning_file_uploaded', id)
    })
    res.status(201).json({ id, name })
  })
  app.get('/api/learning/files/:id', async (req, res) => {
    const user = requireUser(req), id = idSchema.parse(req.params.id)
    const access = user.role === 'staff' ? 'TRUE' : `(f.uploaded_by=$2 OR EXISTS(SELECT 1 FROM learning_resources r WHERE r.file_id=f.id AND ${resourceScope(user, 'r', '$2')})
      OR EXISTS(SELECT 1 FROM learning_submissions sub JOIN learning_assignments a ON a.id=sub.assignment_id JOIN students s ON s.id=a.student_id WHERE sub.file_id=f.id AND ${studentScope(user, 's', '$2')}))`
    const args = user.role === 'staff' ? [id] : [id, user.id]
    const { rows: [file] } = await db.query(`SELECT f.name,f.mime_type,f.content FROM learning_files f WHERE f.id=$1 AND ${access}`, args)
    if (!file) throw new HttpError(404, 'File not found.')
    res.setHeader('Content-Type', file.mime_type)
    res.setHeader('Content-Disposition', `attachment; filename="worksheet${file.mime_type === 'application/pdf' ? '.pdf' : file.mime_type === 'image/png' ? '.png' : '.jpg'}"; filename*=UTF-8''${encodeURIComponent(file.name).replace(/'/g, '%27')}`)
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox")
    res.setHeader('Cache-Control', 'private, no-store')
    res.send(Buffer.from(file.content))
  })
  app.post('/api/learning/resources', async (req, res) => {
    const user = requireUser(req, ['staff']), input = resourceSchema.parse(req.body), id = randomUUID()
    await db.transaction(async tx => {
      await attachFile(tx, input.fileId, user.id)
      await tx.query(`INSERT INTO learning_resources(id,title,description,subject,grade,kind,visibility,file_id,link_url,embed_url,published,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [id, input.title, input.description, input.subject, input.grade, input.kind, input.visibility, input.fileId || null, input.linkUrl, input.embedUrl, input.published, user.id])
      await audit(tx, user.id, 'learning_resource_created', id)
    })
    res.status(201).json({ id })
  })
  app.post('/api/learning/assignments', async (req, res) => {
    const user = requireUser(req, ['staff']), id = randomUUID()
    const input = z.object({ studentId: idSchema, resourceId: idSchema.nullish(), title: nameSchema, instructions: z.string().trim().max(10000).default(''), dueAt: z.string().datetime({ offset: true }).nullish() }).parse(req.body)
    await db.transaction(async tx => {
      if (!(await tx.query('SELECT id FROM students WHERE id=$1', [input.studentId])).rows.length) throw new HttpError(404, 'Student not found.')
      if (input.resourceId && !(await tx.query('SELECT id FROM learning_resources WHERE id=$1 AND published=true', [input.resourceId])).rows.length) throw new HttpError(404, 'Select a published resource.')
      await tx.query('INSERT INTO learning_assignments(id,student_id,resource_id,title,instructions,due_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)', [id, input.studentId, input.resourceId || null, input.title, input.instructions, input.dueAt || null, user.id])
      await audit(tx, user.id, 'homework_assigned', id)
    })
    res.status(201).json({ id })
  })
  app.post('/api/learning/assignments/:id/submissions', async (req, res) => {
    const user = requireUser(req, ['parent','student']), assignmentId = idSchema.parse(req.params.id), id = randomUUID()
    const input = z.object({ answerText: z.string().trim().max(20000).default(''), fileId: idSchema.nullish(), version: z.number().int().positive() }).refine(value => Boolean(value.answerText || value.fileId), 'Add your answer or upload your work.').parse(req.body)
    await rateLimit(db, `homework-submit:${user.id}`, 30)
    await db.transaction(async tx => {
      const { rows: [assignment] } = await tx.query(`SELECT a.* FROM learning_assignments a JOIN students s ON s.id=a.student_id WHERE a.id=$1 AND ${studentScope(user, 's', '$2')} FOR UPDATE OF a`, [assignmentId, user.id])
      if (!assignment) throw new HttpError(404, 'Assignment not found.')
      if (assignment.version !== input.version || !['assigned','needs_revision'].includes(assignment.status)) throw new HttpError(409, 'This assignment changed or is already submitted. Refresh to see the latest feedback.')
      await attachFile(tx, input.fileId, user.id)
      const { rows: [last] } = await tx.query('SELECT COALESCE(max(attempt),0)::int AS attempt FROM learning_submissions WHERE assignment_id=$1', [assignmentId])
      await tx.query('INSERT INTO learning_submissions(id,assignment_id,attempt,answer_text,file_id,submitted_by) VALUES($1,$2,$3,$4,$5,$6)', [id, assignmentId, last.attempt + 1, input.answerText, input.fileId || null, user.id])
      await tx.query("UPDATE learning_assignments SET status='submitted',version=version+1 WHERE id=$1", [assignmentId])
      await audit(tx, user.id, 'homework_submitted', assignmentId)
    })
    res.status(201).json({ id })
  })
  app.post('/api/learning/submissions/:id/review', async (req, res) => {
    const user = requireUser(req, ['staff']), id = idSchema.parse(req.params.id)
    const input = z.object({ feedback: z.string().trim().max(10000).default(''), score: z.number().min(0).max(100).nullish(), status: z.enum(['reviewed','needs_revision']), version: z.number().int().positive() }).refine(value => value.status !== 'needs_revision' || value.feedback.length > 0, 'Explain what the student should revise.').parse(req.body)
    await db.transaction(async tx => {
      const { rows: [submission] } = await tx.query('SELECT assignment_id,attempt FROM learning_submissions WHERE id=$1', [id])
      if (!submission) throw new HttpError(404, 'Submission not found.')
      const { rows: [assignment] } = await tx.query('SELECT * FROM learning_assignments WHERE id=$1 FOR UPDATE', [submission.assignment_id])
      const { rows: [latest] } = await tx.query('SELECT id FROM learning_submissions WHERE assignment_id=$1 ORDER BY attempt DESC LIMIT 1', [assignment.id])
      if (assignment.version !== input.version || latest.id !== id || assignment.status !== 'submitted') throw new HttpError(409, 'Review the latest unreviewed attempt after refreshing.')
      await tx.query('UPDATE learning_submissions SET feedback=$1,score=$2,review_status=$3,reviewed_by=$4,reviewed_at=now() WHERE id=$5', [input.feedback, input.score ?? null, input.status, user.id, id])
      await tx.query('UPDATE learning_assignments SET status=$1,version=version+1 WHERE id=$2', [input.status, assignment.id])
      await audit(tx, user.id, 'homework_reviewed', assignment.id)
    })
    res.json({ ok: true })
  })
}
export async function learningMaintenance(db) {
  // Abandoned uploads never become a permanent repository. Attached homework remains with its history.
  await db.query("DELETE FROM learning_files WHERE attached=false AND created_at<now()-interval '24 hours'")
}
