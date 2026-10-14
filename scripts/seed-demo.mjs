import { randomUUID } from 'node:crypto'
import { connectDatabase, migrate } from '../server/database.mjs'
import { hashPassword } from '../server/security.mjs'
// Deliberately isolated synthetic accounts; this script never connects to a remote database.
if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL || !process.argv.includes('--local-demo')) throw new Error('Demo seeding is available only with --local-demo and no production database.')
const db = await connectDatabase({ dataDir: '.data/demo-postgres' })
try {
  await migrate(db)
  if ((await db.query('SELECT id FROM users LIMIT 1')).rows.length) throw new Error('Demo database already initialized. Existing accounts retained.')
  const hash = await hashPassword('Stemify-demo-only-2026!')
  await db.transaction(async tx => {
    const parent = randomUUID(), staff = randomUUID(), child = randomUUID(), student = randomUUID()
    for (const [id, email, name, role, username] of [[parent, 'parent@example.test', 'Demo Parent', 'parent', null], [staff, 'teacher@example.test', 'Demo Teacher', 'staff', null], [child, null, 'Demo Learner', 'student', 'demo-learner']]) {
      await tx.query('INSERT INTO users(id,email,name,role,login_name,password_hash,verified_at) VALUES($1,$2,$3,$4,$5,$6,now())', [id, email, name, role, username, hash])
    }
    await tx.query('INSERT INTO students(id,parent_id,account_id,name,grade) VALUES($1,$2,$3,$4,$5)', [student, parent, child, 'Demo Learner', 'Grade 5'])
    for (const [days, title, status, summary] of [[1, 'Fractions, one discovery at a time', 'scheduled', ''], [-3, 'Making sense of equal parts', 'completed', 'Demo notes: We explored equivalent fractions using fraction strips. The learner explained why two quarters and one half represent the same amount.']]) {
      const id = randomUUID(), start = new Date(Date.now() + days * 86400000)
      start.setMinutes(0, 0, 0)
      await tx.query('INSERT INTO classes(id,student_id,title,subject,teacher,starts_at,duration_minutes,status,preparation) VALUES($1,$2,$3,$4,$5,$6,60,$7,$8)', [id, student, title, 'Mathematics', 'Demo Teacher', start.toISOString(), status, days > 0 ? 'Bring a pencil, your notebook and a question about fractions.' : ''])
      await tx.query('INSERT INTO lesson_notes(class_id,draft_summary,published_summary,published_next_steps,published_at,published_by,published_version) VALUES($1,$2,$2,$3,$4,$5,$6)', [id, summary, summary ? 'Demo practice: Draw three different ways to represent one half.' : '', summary ? new Date().toISOString() : null, summary ? staff : null, summary ? 1 : 0])
    }
  })
  console.log('Isolated demo accounts created. See docs/portal-setup.md for local-only sign-in details.')
} finally { await db.close() }
