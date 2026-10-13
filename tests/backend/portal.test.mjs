import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac, randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import request from 'supertest'
import { connectDatabase, migrate } from '../../server/database.mjs'
import { createApp } from '../../server/app.mjs'
import { loadConfig } from '../../server/config.mjs'
import { processZoomEvents, maintenance } from '../../server/zoom.mjs'
import { digest, hashPassword } from '../../server/security.mjs'

let db, app, parent, other, staff, child, studentId, otherStudentId, classId
const mails = [], password = 'Test-only-long-password!'
const config = { production: false, origin: 'http://127.0.0.1:4504', trustProxy: false, zoomSecret: 'test-only-webhook-secret', zoomAccount: 'test-account', dataDir: ':memory:' }
const send = (path, body, actor, method = 'post') => {
  let req = request(app)[method](`/api${path}`).set('Origin', config.origin)
  if (actor) req = req.set('Cookie', actor.cookie).set('x-csrf-token', actor.csrf)
  return req.send(body)
}
const get = (path, actor) => request(app).get(`/api${path}`).set('Cookie', actor.cookie)
async function login(identifier, pwd = password) {
  const res = await send('/auth/login', { identifier, password: pwd }).expect(200)
  return { cookie: res.headers['set-cookie'][0].split(';')[0], csrf: res.body.csrf, user: res.body.user }
}
function mailToken(email, purpose) { return mails.filter(x => x.to === email).at(-1).text.match(new RegExp(`#${purpose}=([\\w-]+)`))[1] }
async function register(email) {
  await send('/auth/register', { name: 'Test parent', email, password, role: 'staff' }).expect(202)
  await send('/auth/verify', { token: mailToken(email, 'verify') }).expect(200)
  return login(email)
}
function zoomPayload(uuid, content = 'Worked on fractions', modified = '2026-10-13T19:00:00Z') {
  return { event: 'meeting.summary_completed', event_ts: Date.parse(modified), payload: { account_id: config.zoomAccount, object: { meeting_uuid: uuid, meeting_id: 12345678901, meeting_start_time: '2026-10-13T18:00:00Z', summary_content: content, next_steps: ['Practise equivalent fractions'], summary_last_modified_time: modified } } }
}
function webhook(body, timestamp = Math.floor(Date.now() / 1000), signature) {
  const raw = JSON.stringify(body)
  const signed = signature || `v0=${createHmac('sha256', config.zoomSecret).update(`v0:${timestamp}:${raw}`).digest('hex')}`
  return request(app).post('/api/webhooks/zoom').set('Content-Type', 'application/json').set('x-zm-request-timestamp', String(timestamp)).set('x-zm-signature', signed).send(raw)
}
const lessonInput = id => ({ studentId: id, title: 'Fractions with confidence', subject: 'Math', teacher: 'Test teacher', startsAt: '2026-10-13T18:00:00Z', durationMinutes: 60, joinUrl: 'https://us02web.zoom.us/j/12345678901', zoomMeetingId: '12345678901', preparation: 'Bring your notebook.' })
before(async () => {
  db = await connectDatabase(config); await migrate(db)
  app = createApp({ db, config, mailer: { send: async message => mails.push(message) } })
})
after(async () => { await db.close() })

test('production refuses missing durable database or email config', () => {
  assert.throws(() => loadConfig({ NODE_ENV: 'production', APP_ORIGIN: 'https://stemify.ca' }), /DATABASE_URL/)
  assert.throws(() => loadConfig({ NODE_ENV: 'production' }), /HTTPS/)
})
test('register, verify single-use token, secure session, no self-promotion', async () => {
  await send('/auth/register', { name: 'Parent', email: 'parent@example.test', password, role: 'staff' }).expect(202)
  const unverified = await login('parent@example.test')
  await get('/dashboard', unverified).expect(403)
  const secret = mailToken('parent@example.test', 'verify')
  await send('/auth/verify', { token: secret }).expect(200)
  await send('/auth/verify', { token: secret }).expect(400)
  parent = await login('PARENT@example.test')
  assert.equal(parent.user.role, 'parent')
  assert.equal(parent.user.verified, true)
  const stored = (await db.query('SELECT password_hash FROM users WHERE id=$1', [parent.user.id])).rows[0]
  assert.notEqual(stored.password_hash, password)
  assert.equal(stored.password_hash.startsWith('scrypt:'), true)
  assert.equal((await db.query('SELECT token_hash FROM sessions WHERE user_id=$1', [parent.user.id])).rows.some(x => x.token_hash === parent.cookie.split('=')[1]), false)
})
test('cross-origin requests and missing CSRF are rejected', async () => {
  await request(app).post('/api/auth/login').set('Origin', 'https://untrusted.test').send({ identifier: 'parent@example.test', password }).expect(403)
  await request(app).post('/api/students').set('Origin', config.origin).set('Cookie', parent.cookie).send({ name: 'Student', grade: 'Grade 5' }).expect(403)
  await request(app).get('/api/dashboard').expect(401)
})
test('parents add children scoped to their own account', async () => {
  studentId = (await send('/students', { name: 'First child', grade: 'Grade 5' }, parent).expect(201)).body.id
  other = await register('other@example.test')
  otherStudentId = (await send('/students', { name: 'Other child', grade: 'Grade 8', parent_id: parent.user.id }, other).expect(201)).body.id
  const data = (await get('/dashboard', parent).expect(200)).body
  assert.deepEqual(data.students.map(s => s.id), [studentId])
  assert.equal(JSON.stringify(data).includes('Other child'), false)
})
test('only parent can provision their own child login', async () => {
  await send(`/students/${otherStudentId}/login`, { username: 'wrong-child', password }, parent).expect(404)
  await send(`/students/${studentId}/login`, { username: 'test-student', password }, parent).expect(200)
  child = await login('test-student')
  assert.equal(child.user.role, 'student')
  const data = (await get('/dashboard', child).expect(200)).body
  assert.deepEqual(data.students.map(s => s.id), [studentId])
  await send('/students', { name: 'Not allowed', grade: 'Grade 3' }, child).expect(403)
  await send(`/students/${studentId}/login`, { username: 'another', password }, child).expect(403)
})
test('staff scheduling is authorized and input validated', async () => {
  staff = await register('staff@example.test')
  await db.query("UPDATE users SET role='staff' WHERE id=$1", [staff.user.id])
  staff = await login('staff@example.test')
  await send('/classes', lessonInput(studentId), parent).expect(403)
  await send('/classes', { ...lessonInput(studentId), joinUrl: 'https://zoom.us.evil.test/j/123' }, staff).expect(400)
  await send('/classes', { ...lessonInput(studentId), startsAt: 'not-a-date' }, staff).expect(400)
  classId = (await send('/classes', lessonInput(studentId), staff).expect(201)).body.id
  await send('/classes', { ...lessonInput(otherStudentId), zoomMeetingId: '99999999999' }, staff).expect(201)
  assert.equal((await get('/dashboard', parent)).body.classes.length, 1)
  assert.equal((await get('/dashboard', child)).body.classes.length, 1)
  assert.equal((await get('/dashboard', staff)).body.classes.length, 2)
})
test('teacher drafts remain private until explicitly published', async () => {
  await send(`/classes/${classId}/notes`, { summary: 'Private draft', nextSteps: 'Practice', version: 1 }, staff, 'put').expect(200)
  const visible = (await get('/dashboard', parent)).body.classes[0]
  assert.equal(visible.draft_summary, undefined)
  assert.equal(visible.zoom_uuid, undefined)
  assert.equal(visible.published_at, null)
  await send(`/classes/${classId}/publish`, { version: 2 }, parent).expect(403)
  await send(`/classes/${classId}/publish`, { version: 1 }, staff).expect(409)
  await send(`/classes/${classId}/publish`, { version: 2 }, staff).expect(200)
  assert.equal((await get('/dashboard', child)).body.classes[0].published_summary, 'Private draft')
})
test('Zoom challenge validates signature and returns encrypted token', async () => {
  const body = { event: 'endpoint.url_validation', payload: { plainToken: 'test-challenge' } }
  const response = await webhook(body).expect(200)
  assert.equal(response.body.encryptedToken, createHmac('sha256', config.zoomSecret).update('test-challenge').digest('hex'))
  await webhook(body, undefined, `v0=${'0'.repeat(64)}`).expect(401)
  await webhook(body, Math.floor(Date.now() / 1000) - 301).expect(401)
})
test('wrong Zoom account is rejected and duplicate delivery stored only once', async () => {
  const body = zoomPayload('instance-one')
  await webhook({ ...body, payload: { ...body.payload, account_id: 'another-account' } }).expect(403)
  await webhook(body).expect(202)
  await webhook(body).expect(202)
  assert.equal((await db.query('SELECT count(*)::int AS count FROM zoom_events')).rows[0].count, 1)
})
test('Zoom worker matches exact occurrence and updates only draft', async () => {
  await processZoomEvents(db)
  const lesson = (await get('/dashboard', staff)).body.classes.find(c => c.id === classId)
  assert.equal(lesson.zoom_uuid, 'instance-one')
  assert.equal(lesson.draft_summary, 'Worked on fractions')
  assert.equal(lesson.published_summary, 'Private draft')
  assert.equal((await db.query('SELECT payload FROM zoom_events')).rows[0].payload.constructor, Object)
  assert.deepEqual((await db.query('SELECT payload FROM zoom_events')).rows[0].payload, {})
})
test('out-of-order summaries cannot overwrite a newer draft', async () => {
  await webhook(zoomPayload('instance-one', 'Older summary', '2026-10-13T18:30:00Z')).expect(202)
  await processZoomEvents(db)
  assert.equal((await db.query('SELECT draft_summary FROM lesson_notes WHERE class_id=$1', [classId])).rows[0].draft_summary, 'Worked on fractions')
  const body = zoomPayload('instance-one', 'Updated summary', '2026-10-13T20:00:00Z'); body.event = 'meeting.summary_updated'
  await webhook(body).expect(202); await processZoomEvents(db)
  assert.equal((await get('/dashboard', parent)).body.classes[0].published_summary, 'Private draft')
})
test('recurring meeting ID alone never attaches a different occurrence', async () => {
  const body = zoomPayload('future-instance'); body.payload.object.meeting_start_time = '2026-12-20T18:00:00Z'
  await webhook(body).expect(202); await processZoomEvents(db)
  const row = (await db.query('SELECT status,payload FROM zoom_events WHERE meeting_uuid=$1', ['future-instance'])).rows[0]
  assert.equal(row.status, 'unmatched')
  assert.equal(row.payload.payload.object.summary_content, 'Worked on fractions')
})
test('unmatched receipt can be reconciled by staff and retried durably', async () => {
  const input = { ...lessonInput(studentId), startsAt: '2026-12-20T18:00:00Z', zoomUuid: 'future-instance' }
  const id = (await send('/classes', input, staff).expect(201)).body.id
  await processZoomEvents(db)
  assert.equal((await db.query('SELECT status FROM zoom_events WHERE meeting_uuid=$1', ['future-instance'])).rows[0].status, 'processed')
  assert.equal((await db.query('SELECT draft_summary FROM lesson_notes WHERE class_id=$1', [id])).rows[0].draft_summary, 'Worked on fractions')
})
test('ambiguous occurrences remain unmatched instead of leaking between families', async () => {
  const start = '2026-11-05T18:00:00Z'
  await send('/classes', { ...lessonInput(studentId), startsAt: start }, staff).expect(201)
  await send('/classes', { ...lessonInput(otherStudentId), startsAt: start }, staff).expect(201)
  const body = zoomPayload('ambiguous'); body.payload.object.meeting_start_time = start
  await webhook(body).expect(202); await processZoomEvents(db)
  assert.equal((await db.query('SELECT status FROM zoom_events WHERE meeting_uuid=$1', ['ambiguous'])).rows[0].status, 'unmatched')
})
test('malformed summary stays queued for retry without modifying class notes', async () => {
  await webhook(zoomPayload('instance-one', '', '2026-10-14T20:00:00Z')).expect(202)
  await processZoomEvents(db)
  const row = (await db.query("SELECT status,attempts FROM zoom_events WHERE status='pending'")).rows[0]
  assert.equal(row.attempts, 1)
  assert.equal((await db.query('SELECT draft_summary FROM lesson_notes WHERE class_id=$1', [classId])).rows[0].draft_summary, 'Updated summary')
})
test('optimistic concurrency prevents overwriting edited class or notes', async () => {
  const lesson = (await get('/dashboard', staff)).body.classes.find(c => c.id === classId)
  await send(`/classes/${classId}`, { ...lessonInput(studentId), title: 'Revised title', version: lesson.version }, staff, 'put').expect(200)
  await send(`/classes/${classId}`, { ...lessonInput(studentId), version: lesson.version }, staff, 'put').expect(409)
  await send(`/classes/${classId}/notes`, { summary: 'Stale draft', nextSteps: '', version: 1 }, staff, 'put').expect(409)
})
test('parent reset invalidates all old sessions and reset token is single-use', async () => {
  await send('/auth/request-reset', { email: 'parent@example.test' }).expect(202)
  const secret = mailToken('parent@example.test', 'reset')
  await send('/auth/reset', { token: secret, password: 'Changed-parent-password!' }).expect(200)
  await get('/dashboard', parent).expect(401)
  await send('/auth/reset', { token: secret, password }).expect(400)
  parent = await login('parent@example.test', 'Changed-parent-password!')
})
test('parent reset and disable of child login revoke child sessions', async () => {
  await send(`/students/${studentId}/login`, { username: 'test-student', password: 'Changed-student-password!' }, parent).expect(200)
  await get('/dashboard', child).expect(401)
  child = await login('test-student', 'Changed-student-password!')
  await send(`/students/${studentId}/login`, {}, parent, 'delete').expect(200)
  await get('/dashboard', child).expect(401)
  assert.equal((await get('/dashboard', parent)).body.students[0].account_id, null)
})
test('reset tokens expire and expired sessions are rejected', async () => {
  await send('/auth/request-reset', { email: 'other@example.test' }).expect(202)
  const secret = mailToken('other@example.test', 'reset')
  await db.query("UPDATE auth_tokens SET expires_at=now()-interval '1 second' WHERE token_hash=$1", [digest(secret)])
  await send('/auth/reset', { token: secret, password }).expect(400)
  await db.query("UPDATE sessions SET expires_at=now()-interval '1 second' WHERE user_id=$1", [other.user.id])
  await get('/dashboard', other).expect(401)
})
test('login rate limit and logout invalidate access', async () => {
  for (let i = 0; i < 10; i++) await send('/auth/login', { identifier: 'unknown@example.test', password }).expect(401)
  await send('/auth/login', { identifier: 'unknown@example.test', password }).expect(429)
  await send('/auth/logout', {}, parent).expect(200)
  await get('/dashboard', parent).expect(401)
})
test('maintenance removes retained unmatched content after seven days', async () => {
  await db.query("UPDATE zoom_events SET received_at=now()-interval '8 days' WHERE meeting_uuid='ambiguous'")
  await maintenance(db)
  assert.deepEqual((await db.query("SELECT payload FROM zoom_events WHERE meeting_uuid='ambiguous'")).rows[0].payload, {})
})
test('database migrations are repeatable and local records survive reopen', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'stemify-db-'))
  const cfg = { dataDir: join(folder, 'pg') }
  let local = await connectDatabase(cfg)
  try {
    await migrate(local); await migrate(local)
    const id = randomUUID()
    await local.query('INSERT INTO users(id,email,name,password_hash) VALUES($1,$2,$3,$4)', [id, 'persist@example.test', 'Persistence test', await hashPassword(password)])
    await local.close(); local = await connectDatabase(cfg)
    assert.equal((await local.query('SELECT id FROM users')).rows[0].id, id)
  } finally { await local.close(); await rm(folder, { recursive: true, force: true }) }
})

test('production session cookies are Secure and HttpOnly', async () => {
  const prodApp = createApp({ db, config: { ...config, production: true }, mailer: { send: async () => {} } })
  const response = await request(prodApp).post('/api/auth/login').set('Origin', config.origin).send({ identifier: 'staff@example.test', password }).expect(200)
  assert.match(response.headers['set-cookie'][0], /; Secure/)
  assert.match(response.headers['set-cookie'][0], /; HttpOnly/)
  assert.match(response.headers['set-cookie'][0], /; SameSite=Lax/)
})
test('signed invalid JSON shape is rejected rather than processed', async () => {
  await webhook(null).expect(400)
  await webhook(zoomPayload('invalid-signature'), undefined, `v0=${'é'.repeat(64)}`).expect(401)
})
test('staff cannot reassign existing lesson notes to another family', async () => {
  const current = (await get('/dashboard', staff)).body.classes.find(c => c.id === classId)
  await send(`/classes/${classId}`, { ...lessonInput(otherStudentId), version: current.version }, staff, 'put').expect(409)
})
test('meeting.started binds the exact instance and legacy summary imports afterwards', async () => {
  const startsAt = '2026-12-25T15:00:00Z'
  const id = (await send('/classes', { ...lessonInput(studentId), startsAt, zoomMeetingId: '22222222222' }, staff).expect(201)).body.id
  await webhook({ event: 'meeting.started', event_ts: Date.now(), payload: { account_id: config.zoomAccount, object: { uuid: 'started-instance', id: 22222222222, start_time: startsAt } } }).expect(202)
  await processZoomEvents(db)
  assert.equal((await db.query('SELECT zoom_uuid FROM classes WHERE id=$1', [id])).rows[0].zoom_uuid, 'started-instance')
  const body = zoomPayload('started-instance'); delete body.payload.object.summary_content
  body.payload.object.summary_overview = 'Overview'
  body.payload.object.summary_details = [{ label: 'Practice', summary: 'Equal parts' }]
  await webhook(body).expect(202); await processZoomEvents(db)
  const note = (await db.query('SELECT draft_summary,draft_next_steps FROM lesson_notes WHERE class_id=$1', [id])).rows[0]
  assert.equal(note.draft_summary, 'Overview\n\nPractice\nEqual parts')
  assert.equal(note.draft_next_steps, 'Practise equivalent fractions')
})
test('built portal entry and original landing page are served successfully', async t => {
  const { existsSync } = await import('node:fs')
  if (!existsSync(new URL('../../dist/index.html', import.meta.url))) return t.skip('Run npm run build to include static serving checks')
  const portal = await request(app).get('/portal').expect(200)
  assert.match(portal.headers['content-security-policy'], /frame-ancestors 'none'/)
  assert.match(portal.text, /id="root"/)
  await request(app).get('/').expect(200)
  await request(app).get('/api/health').expect(200)
})
