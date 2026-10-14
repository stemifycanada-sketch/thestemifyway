import { loadConfig } from '../server/config.mjs'
import { connectDatabase, migrate } from '../server/database.mjs'
import { audit } from '../server/security.mjs'
const email = process.argv[2]?.trim().toLowerCase()
if (!email || !email.includes('@')) throw new Error('Usage: npm run staff:grant -- verified-staff-email')
const db = await connectDatabase(loadConfig())
try {
  await migrate(db)
  await db.transaction(async tx => {
    const { rows: [user] } = await tx.query(`UPDATE users SET role='staff' WHERE email=$1 AND verified_at IS NOT NULL AND role IN ('parent','staff') RETURNING id`, [email])
    if (!user) throw new Error('Register and verify this account before granting staff access.')
    await tx.query('DELETE FROM sessions WHERE user_id=$1', [user.id])
    await audit(tx, user.id, 'staff_access_granted', user.id)
  })
  console.log('Staff access granted. Sign in again.')
} finally { await db.close() }
