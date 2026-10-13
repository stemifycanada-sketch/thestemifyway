import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { connectDatabase, migrate } from '../../server/database.mjs'
import { createApp } from '../../server/app.mjs'
import { hashPassword } from '../../server/security.mjs'

const config = { production: false, origin: 'http://127.0.0.1:4504', trustProxy: false, dataDir: ':memory:' }
const password = 'Learning-tests-only-password!'
const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n')
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0xff, 0xd9])
let db, app, parent, other, staff, secondStaff, child, sibling, unverified
let childId, siblingId, otherChildId, libraryId, privateId, draftId, libraryFileId, privateFileId, draftFileId

function post(path, body, actor) {
  let req = request(app).post(`/api/learning${path}`).set('Origin', config.origin)
  if (actor) req = req.set('Cookie', actor.cookie).set('x-csrf-token', actor.csrf)
  return req.send(body)
}
function get(path = '', actor) {
  let req = request(app).get(`/api/learning${path}`)
  if (actor) req = req.set('Cookie', actor.cookie)
  return req
}
function upload(actor, body = pdf, type = 'application/pdf', name = 'fractions.pdf') {
  let req = request(app).post('/api/learning/files').set('Origin', config.origin).set('Content-Type', type).set('X-File-Name', encodeURIComponent(name))
  if (actor) req = req.set('Cookie', actor.cookie).set('x-csrf-token', actor.csrf)
  return req.send(body)
}
async function seedActor(label, role = 'parent', verified = true) {
  const id = randomUUID(), email = `${label}@example.test`
  await db.query('INSERT INTO users(id,email,name,password_hash,role,verified_at) VALUES($1,$2,$3,$4,$5,$6)',
    [id, email, label, await hashPassword(password), role, verified ? new Date() : null])
  const res = await request(app).post('/api/auth/login').set('Origin', config.origin).send({ identifier: email, password }).expect(200)
  return { id, cookie: res.headers['set-cookie'][0].split(';')[0], csrf: res.body.csrf }
}
async function seedStudent(parentActor, name, account) {
  const id = randomUUID()
  await db.query('INSERT INTO students(id,parent_id,account_id,name,grade) VALUES($1,$2,$3,$4,$5)', [id, parentActor.id, account?.id || null, name, 'Grade 5'])
  return id
}
const resource = overrides => ({ title: 'Equivalent fractions', description: 'Draw and compare equal parts.', subject: 'Math', grade: 'Grade 5', kind: 'worksheet', visibility: 'assigned', published: true, ...overrides })
const assignment = (studentId, overrides) => ({ studentId, title: 'Fraction practice', instructions: 'Explain your thinking.', ...overrides })
const ids = rows => rows.map(row => row.id)

before(async () => {
  db = await connectDatabase(config)
  await migrate(db)
  app = createApp({ db, config, mailer: { send: async () => {} } })
  parent = await seedActor('learning-parent')
  other = await seedActor('other-family')
  staff = await seedActor('learning-teacher', 'staff')
  secondStaff = await seedActor('second-teacher', 'staff')
  child = await seedActor('first-student', 'student')
  sibling = await seedActor('second-student', 'student')
  unverified = await seedActor('unverified-parent', 'parent', false)
  childId = await seedStudent(parent, 'First child', child)
  siblingId = await seedStudent(parent, 'Sibling', sibling)
  otherChildId = await seedStudent(other, 'Other family child')
})
after(async () => { await db?.close() })

test('learning requires verified login and reserves resource/assignment writes for staff', async () => {
  await get().expect(401)
  await get('', unverified).expect(403)
  await upload(undefined).expect(401)
  await upload(unverified).expect(403)
  for (const actor of [parent, child]) {
    await post('/resources', resource(), actor).expect(403)
    await post('/assignments', assignment(childId), actor).expect(403)
  }
  await request(app).post('/api/learning/resources').set('Origin', config.origin).set('Cookie', staff.cookie).send(resource()).expect(403)
  await request(app).post('/api/learning/resources').set('Origin', 'https://foreign.example').set('Cookie', staff.cookie).set('x-csrf-token', staff.csrf).send(resource()).expect(403)
})

test('file uploads validate signatures, size and request origin before allowing private downloads', async () => {
  for (const [bytes, type, name] of [[pdf, 'application/pdf', 'practice.pdf'], [png, 'image/png', 'work.png'], [jpeg, 'image/jpeg', 'work.jpg']]) {
    const saved = (await upload(child, bytes, type, name).expect(201)).body
    assert.equal(typeof saved.id, 'string')
    assert.equal(saved.name, name)
    const downloaded = await get(`/files/${saved.id}`, child).expect(200)
    assert.match(downloaded.headers['content-disposition'], /^attachment;/)
    assert.equal(downloaded.headers['x-content-type-options'], 'nosniff')
    assert.match(downloaded.headers['cache-control'], /(?:^|, )no-store(?:,|$)/)
    assert.deepEqual(downloaded.body, bytes)
    await get(`/files/${saved.id}`).expect(401)
    await get(`/files/${saved.id}`, other).expect(404)
  }
  await upload(child, Buffer.from('<html><script>alert(1)</script></html>'), 'text/html', 'page.html').expect(400)
  await upload(child, Buffer.from('<html>not a PDF</html>')).expect(400)
  await upload(child, pdf, 'image/png', 'fake.png').expect(400)
  await upload(child, Buffer.alloc(5 * 1024 * 1024 + 1, 0x41)).expect(413)
  await request(app).post('/api/learning/files').set('Origin', config.origin).set('Cookie', child.cookie).set('Content-Type', 'application/pdf').set('X-File-Name', 'missing-csrf.pdf').send(pdf).expect(403)
  await request(app).post('/api/learning/files').set('Origin', 'https://foreign.example').set('Cookie', child.cookie).set('x-csrf-token', child.csrf).set('Content-Type', 'application/pdf').set('X-File-Name', 'cross-origin.pdf').send(pdf).expect(403)
  const unsafe = await upload(child, pdf, 'application/pdf', '../private/worksheet\r\n.html.pdf')
  assert.ok([201, 400].includes(unsafe.status), 'unsafe filenames must be rejected or sanitized')
  if (unsafe.status === 201) {
    assert.doesNotMatch(unsafe.body.name, /[\\/\r\n]/)
    const download = await get(`/files/${unsafe.body.id}`, child).expect(200)
    assert.doesNotMatch(download.headers['content-disposition'], /[\r\n]/)
  }
})

test('library resources are shared while assigned resources, drafts and their attachments stay scoped', async () => {
  libraryFileId = (await upload(staff, pdf, 'application/pdf', 'library.pdf').expect(201)).body.id
  privateFileId = (await upload(staff, pdf, 'application/pdf', 'assigned.pdf').expect(201)).body.id
  draftFileId = (await upload(staff, pdf, 'application/pdf', 'draft.pdf').expect(201)).body.id
  libraryId = (await post('/resources', resource({ fileId: libraryFileId, visibility: 'library', title: 'Family library' }), staff).expect(201)).body.id
  privateId = (await post('/resources', resource({ fileId: privateFileId, title: 'Private worksheet' }), staff).expect(201)).body.id
  draftId = (await post('/resources', resource({ fileId: draftFileId, visibility: 'library', published: false, title: 'Unpublished draft' }), staff).expect(201)).body.id
  await post('/assignments', assignment(childId, { resourceId: privateId }), staff).expect(201)
  for (const actor of [parent, child, sibling, other]) {
    const data = (await get('', actor).expect(200)).body
    assert.ok(ids(data.resources).includes(libraryId))
    assert.equal(ids(data.resources).includes(privateId), actor === parent || actor === child)
    assert.ok(!ids(data.resources).includes(draftId))
    await get(`/files/${libraryFileId}`, actor).expect(200)
    await get(`/files/${privateFileId}`, actor).expect(actor === parent || actor === child ? 200 : 404)
    await get(`/files/${draftFileId}`, actor).expect(404)
  }
  const staffData = (await get('', staff).expect(200)).body
  assert.ok(ids(staffData.resources).includes(draftId))
  await get(`/files/${draftFileId}`, staff).expect(200)
  await post('/assignments', assignment(childId, { resourceId: draftId }), staff).expect(404)
})

test('file ownership and single-use association prevent foreign-file attachment and unintended reuse', async () => {
  const foreignFile = (await upload(secondStaff).expect(201)).body.id
  await post('/resources', resource({ fileId: foreignFile }), staff).expect(404)
  await post('/resources', resource({ fileId: libraryFileId }), staff).expect(404)
  await post('/resources', resource({ fileId: randomUUID(), description: '' }), staff).expect(404)
  await post('/resources', resource({ description: '' }), staff).expect(400)
  await post('/assignments', assignment(randomUUID()), staff).expect(404)
})

test('families see all their children but students cannot read or submit for siblings or other families', async () => {
  const ownAssignment = (await post('/assignments', assignment(childId), staff).expect(201)).body.id
  const siblingAssignment = (await post('/assignments', assignment(siblingId), staff).expect(201)).body.id
  const otherAssignment = (await post('/assignments', assignment(otherChildId), staff).expect(201)).body.id
  const all = (await get('', parent).expect(200)).body
  assert.ok(ids(all.assignments).includes(ownAssignment))
  assert.ok(ids(all.assignments).includes(siblingAssignment))
  assert.ok(!ids(all.assignments).includes(otherAssignment))
  assert.ok((await get('', child)).body.assignments.every(row => row.student_id === childId))
  assert.ok((await get('', sibling)).body.assignments.every(row => row.student_id === siblingId))
  await post(`/assignments/${siblingAssignment}/submissions`, { answerText: 'Claiming another child', version: 1, studentId: childId }, child).expect(404)
  await post(`/assignments/${otherAssignment}/submissions`, { answerText: 'Claiming another family', version: 1, parentId: other.id }, parent).expect(404)
  const saved = (await post(`/assignments/${ownAssignment}/submissions`, { answerText: 'My own answer', version: 1, studentId: otherChildId, parentId: other.id, score: 100, status: 'reviewed' }, child).expect(201)).body
  const actual = (await get('', child).expect(200)).body
  const submission = actual.submissions.find(row => row.id === saved.id)
  assert.equal(submission.score, null)
  assert.equal(actual.assignments.find(row => row.id === ownAssignment).status, 'submitted')
  assert.ok(!(await get('', sibling)).body.submissions.some(row => row.id === saved.id))
  assert.ok(!(await get('', other)).body.submissions.some(row => row.id === saved.id))
})

test('submission attachments become visible only to the owning family and reviewing staff', async () => {
  const id = (await post('/assignments', assignment(childId), staff).expect(201)).body.id
  const otherFile = (await upload(other).expect(201)).body.id
  await post(`/assignments/${id}/submissions`, { answerText: '', fileId: otherFile, version: 1 }, child).expect(404)
  await post(`/assignments/${id}/submissions`, { answerText: '   ', version: 1 }, child).expect(400)
  const fileId = (await upload(child, png, 'image/png', 'homework.png').expect(201)).body.id
  const saved = (await post(`/assignments/${id}/submissions`, { answerText: '', fileId, version: 1 }, child).expect(201)).body
  for (const actor of [parent, child, staff]) await get(`/files/${fileId}`, actor).expect(200)
  for (const actor of [other, sibling]) await get(`/files/${fileId}`, actor).expect(404)
  assert.ok((await get('', parent)).body.submissions.some(row => row.id === saved.id))
  await post(`/assignments/${id}/submissions`, { answerText: 'Reuse my previous file', fileId, version: 2 }, child).expect(409)
})

test('homework review preserves zero marks, review history and version conflicts across resubmissions', async () => {
  const id = (await post('/assignments', assignment(childId, { dueAt: '2020-01-01T12:00:00.000Z' }), staff).expect(201)).body.id
  const first = (await post(`/assignments/${id}/submissions`, { answerText: 'First answer, submitted after due date', version: 1 }, parent).expect(201)).body.id
  await post(`/assignments/${id}/submissions`, { answerText: 'Duplicate stale attempt', version: 1 }, child).expect(409)
  await post(`/submissions/${first}/review`, { feedback: 'I reviewed myself', score: 100, status: 'reviewed', version: 2 }, child).expect(403)
  await post(`/submissions/${first}/review`, { feedback: 'Try again', score: 0, status: 'needs_revision', version: 1 }, staff).expect(409)
  await post(`/submissions/${first}/review`, { feedback: 'Please show equal-sized parts.', score: 0, status: 'needs_revision', version: 2 }, staff).expect(200)
  let data = (await get('', parent)).body
  assert.equal(data.assignments.find(row => row.id === id).version, 3)
  assert.equal(data.assignments.find(row => row.id === id).status, 'needs_revision')
  assert.equal(data.submissions.find(row => row.id === first).score, 0)
  const second = (await post(`/assignments/${id}/submissions`, { answerText: 'Corrected answer with equal-sized parts', version: 3 }, child).expect(201)).body.id
  await post(`/submissions/${first}/review`, { feedback: 'Overwrite historical feedback', score: 50, status: 'reviewed', version: 4 }, staff).expect(409)
  await post(`/submissions/${second}/review`, { feedback: 'Correct.', score: 95, status: 'reviewed', version: 3 }, staff).expect(409)
  await post(`/submissions/${second}/review`, { feedback: 'Correct, with clear working.', score: 95, status: 'reviewed', version: 4 }, staff).expect(200)
  data = (await get('', parent)).body
  assert.equal(data.assignments.find(row => row.id === id).status, 'reviewed')
  assert.equal(data.assignments.find(row => row.id === id).version, 5)
  assert.equal(data.submissions.filter(row => row.assignment_id === id).length, 2)
  assert.equal(data.submissions.find(row => row.id === first).score, 0)
  assert.equal(data.submissions.find(row => row.id === first).feedback, 'Please show equal-sized parts.')
  assert.equal(data.submissions.find(row => row.id === second).score, 95)
  assert.ok(!(await get('', other)).body.submissions.some(row => [first, second].includes(row.id)))
})

test('Wayground supports approved HTTPS quiz links and embeds while rejecting unsafe hosts and arbitrary frames', async () => {
  for (const linkUrl of ['https://wayground.com/join?gc=123456', 'https://quizizz.com/join?gc=123456']) {
    await post('/resources', resource({ kind: 'wayground', linkUrl, visibility: 'library' }), staff).expect(201)
  }
  for (const embedUrl of ['https://wayground.com/embed/quiz/quiz-example', 'https://quizizz.com/embed/quiz/quiz-example', 'https://wayground.com/join?gc=123456']) {
    await post('/resources', resource({ kind: 'wayground', embedUrl, visibility: 'library' }), staff).expect(201)
  }
  for (const linkUrl of ['http://wayground.com/join', 'javascript:alert(1)', 'https://wayground.com.evil.example/join', 'https://evil.example/?next=wayground.com', 'https://wayground.com@evil.example/join', 'https://wayground.com:444/join', 'https://user:password@wayground.com/join']) {
    await post('/resources', resource({ kind: 'wayground', linkUrl }), staff).expect(400)
  }
  for (const embedUrl of ['https://evil.example/embed/quiz/123', 'http://quizizz.com/embed/quiz/123', 'https://quizizz.com.evil.example/embed/quiz/123', 'https://quizizz.com@evil.example/embed/quiz/123', 'https://quizizz.com:444/embed/quiz/123', 'https://username:password@quizizz.com/embed/quiz/123']) {
    await post('/resources', resource({ kind: 'wayground', embedUrl }), staff).expect(400)
  }
  await post('/resources', resource({ kind: 'wayground' }), staff).expect(400)
  const data = (await get('', parent).expect(200)).body
  assert.ok(data.resources.some(row => row.kind === 'wayground'))
  assert.ok(data.resources.filter(row => row.kind === 'wayground').every(row => !row.verified_score && !row.completed))
})

test('simultaneous parent and child submissions accept one attempt without losing or duplicating work', async () => {
  const id = (await post('/assignments', assignment(childId), staff).expect(201)).body.id
  const responses = await Promise.all([
    post(`/assignments/${id}/submissions`, { answerText: 'Parent submits work', version: 1 }, parent),
    post(`/assignments/${id}/submissions`, { answerText: 'Child submits work', version: 1 }, child),
  ])
  assert.deepEqual(responses.map(res => res.status).sort(), [201, 409])
  const data = (await get('', parent)).body
  assert.equal(data.assignments.find(row => row.id === id).version, 2)
  assert.equal(data.submissions.filter(row => row.assignment_id === id).length, 1)
})

test('disabling a child login revokes access while preserving submitted work and attachments for the family', async () => {
  const before = (await get('', parent)).body
  const attachment = before.submissions.find(row => row.file_id)
  assert.ok(attachment)
  await request(app).delete(`/api/students/${childId}/login`).set('Origin', config.origin).set('Cookie', parent.cookie).set('x-csrf-token', parent.csrf).send({}).expect(200)
  await get('', child).expect(401)
  await get(`/files/${attachment.file_id}`, child).expect(401)
  const after = (await get('', parent)).body
  assert.deepEqual(ids(after.submissions).sort(), ids(before.submissions).sort())
  await get(`/files/${attachment.file_id}`, parent).expect(200)
  await get(`/files/${attachment.file_id}`, staff).expect(200)
  await get(`/files/${attachment.file_id}`, other).expect(404)
})

test('family upload quota survives child account replacement and serializes concurrent family uploads', async () => {
  const quotaParent = await seedActor('quota-parent')
  const quotaChild = await seedActor('quota-child', 'student')
  const studentId = await seedStudent(quotaParent, 'Quota child', quotaChild)
  const fileId = (await upload(quotaChild).expect(201)).body.id
  const homeworkId = (await post('/assignments', assignment(studentId), staff).expect(201)).body.id
  await post(`/assignments/${homeworkId}/submissions`, { fileId, version: 1 }, quotaChild).expect(201)
  assert.equal((await db.query('SELECT quota_owner FROM learning_files WHERE id=$1', [fileId])).rows[0].quota_owner, quotaParent.id)
  await request(app).delete(`/api/students/${studentId}/login`).set('Origin', config.origin).set('Cookie', quotaParent.cookie).set('x-csrf-token', quotaParent.csrf).send({}).expect(200)
  const preserved = (await db.query('SELECT uploaded_by,quota_owner FROM learning_files WHERE id=$1', [fileId])).rows[0]
  assert.equal(preserved.uploaded_by, null)
  assert.equal(preserved.quota_owner, quotaParent.id)
  await get(`/files/${fileId}`, quotaParent).expect(200)
  await request(app).post(`/api/students/${studentId}/login`).set('Origin', config.origin).set('Cookie', quotaParent.cookie).set('x-csrf-token', quotaParent.csrf).send({ username: 'quota-recreated-child', password }).expect(200)
  const login = await request(app).post('/api/auth/login').set('Origin', config.origin).send({ identifier: 'quota-recreated-child', password }).expect(200)
  const replacement = { cookie: login.headers['set-cookie'][0].split(';')[0], csrf: login.body.csrf }
  // Seed the rest of the family's existing small files to exercise the real 200-file limit without 200 HTTP uploads.
  await db.transaction(async tx => {
    for (let index = 0; index < 198; index++) {
      await tx.query('INSERT INTO learning_files(id,uploaded_by,quota_owner,name,mime_type,byte_size,content) VALUES($1,$2,$2,$3,$4,$5,$6)',
        [randomUUID(), quotaParent.id, `existing-${index}.pdf`, 'application/pdf', pdf.length, pdf])
    }
  })
  const concurrent = await Promise.all([upload(replacement), upload(quotaParent)])
  assert.deepEqual(concurrent.map(response => response.status).sort(), [201, 413])
  assert.equal((await db.query('SELECT count(*)::int AS total FROM learning_files WHERE quota_owner=$1', [quotaParent.id])).rows[0].total, 200)
  await upload(replacement).expect(413)
  await upload(quotaParent).expect(413)
  await upload(other).expect(201)
})

test('resource pagination retains worksheets referenced by returned homework even behind newer library resources', async () => {
  const pagingParent = await seedActor('resource-paging-parent')
  const studentId = await seedStudent(pagingParent, 'Resource paging child')
  const oldResourceId = randomUUID(), oldAssignmentId = randomUUID(), oldSubmissionId = randomUUID()
  const newerResources = Array.from({ length: 60 }, () => randomUUID())
  await db.transaction(async tx => {
    await tx.query(`INSERT INTO learning_resources(id,title,description,subject,grade,kind,visibility,published,created_at)
      VALUES($1,'Older assigned worksheet','Still needed for active homework','Math','Grade 5','worksheet','assigned',true,'2000-01-01')`, [oldResourceId])
    await tx.query(`INSERT INTO learning_assignments(id,student_id,resource_id,title,status,created_at)
      VALUES($1,$2,$3,'Long-running homework','submitted','2000-01-01')`, [oldAssignmentId, studentId, oldResourceId])
    await tx.query(`INSERT INTO learning_submissions(id,assignment_id,attempt,answer_text)
      VALUES($1,$2,1,'Old work awaiting review')`, [oldSubmissionId, oldAssignmentId])
    for (let index = 0; index < newerResources.length; index++) {
      await tx.query(`INSERT INTO learning_resources(id,title,description,subject,grade,kind,visibility,published,created_at)
        VALUES($1,$2,'New library material','Math','Grade 5','worksheet','library',true,now()+$3*interval '1 minute')`,
      [newerResources[index], `New library resource ${index}`, index + 1])
    }
  })
  const page0 = (await get('?page=0', pagingParent).expect(200)).body
  assert.equal(page0.page, 0)
  assert.equal(page0.hasMore, true)
  assert.deepEqual(ids(page0.assignments), [oldAssignmentId])
  assert.ok(ids(page0.resources).includes(oldResourceId), 'the old homework keeps its worksheet alongside the current library page')
  assert.ok(ids(page0.resources).includes(newerResources.at(-1)))
  assert.ok(!ids(page0.resources).includes(newerResources[0]))
  assert.deepEqual(ids(page0.submissions), [oldSubmissionId])
  const page1 = (await get('?page=1', pagingParent).expect(200)).body
  assert.equal(page1.page, 1)
  assert.ok(ids(page1.resources).includes(newerResources[0]), 'older library material remains reachable on the next page')
  assert.deepEqual(page1.assignments, [])
  assert.deepEqual(page1.submissions, [], 'history is returned only with assignments on this page')
  for (const page of ['-1', '0.5', 'invalid', '10001']) await get(`?page=${page}`, pagingParent).expect(400)
})

test('assignment pages expose every older task and only the full submission histories for those tasks', async () => {
  const pagingParent = await seedActor('assignment-paging-parent')
  const studentId = await seedStudent(pagingParent, 'Assignment paging child')
  const resourceId = randomUUID(), assignmentIds = Array.from({ length: 55 }, () => randomUUID())
  await db.transaction(async tx => {
    await tx.query(`INSERT INTO learning_resources(id,title,description,subject,grade,kind,visibility,published,created_at)
      VALUES($1,'Assigned reference','For every homework page','Math','Grade 5','reference','assigned',true,'1999-01-01')`, [resourceId])
    for (let index = 0; index < assignmentIds.length; index++) {
      await tx.query(`INSERT INTO learning_assignments(id,student_id,resource_id,title,status,created_at)
        VALUES($1,$2,$3,$4,'submitted',now()+$5*interval '1 minute')`, [assignmentIds[index], studentId, resourceId, `Homework ${index}`, index])
      for (let attempt = 1; attempt <= 2; attempt++) {
        await tx.query('INSERT INTO learning_submissions(id,assignment_id,attempt,answer_text) VALUES($1,$2,$3,$4)',
          [randomUUID(), assignmentIds[index], attempt, `Attempt ${attempt}`])
      }
    }
  })
  const page0 = (await get('?page=0', pagingParent).expect(200)).body
  const page1 = (await get('?page=1', pagingParent).expect(200)).body
  assert.equal(page0.page, 0)
  assert.equal(page0.assignments.length, 50)
  assert.equal(page0.hasMore, true)
  assert.equal(page1.page, 1)
  assert.equal(page1.assignments.length, 5)
  assert.equal(page1.hasMore, false)
  assert.deepEqual([...ids(page0.assignments), ...ids(page1.assignments)].sort(), [...assignmentIds].sort())
  for (const page of [page0, page1]) {
    const currentIds = new Set(ids(page.assignments))
    assert.ok(ids(page.resources).includes(resourceId))
    assert.equal(page.submissions.length, page.assignments.length * 2)
    assert.ok(page.submissions.every(row => currentIds.has(row.assignment_id)))
    assert.ok(page.assignments.every(row => row.student_id === studentId))
  }
  const outsideFamily = (await get('?page=1', other).expect(200)).body
  assert.ok(!outsideFamily.assignments.some(row => assignmentIds.includes(row.id)))
  assert.ok(!outsideFamily.resources.some(row => row.id === resourceId))
  assert.ok(!outsideFamily.submissions.some(row => assignmentIds.includes(row.assignment_id)))
})
