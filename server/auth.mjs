import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { hashPassword, checkPassword, token, digest, HttpError, rateLimit, audit, publicUser, cookieToken, sessionCookie } from './security.mjs'
import { sendAccountEmail } from './mail.mjs'

export const passwordSchema = z.string().min(12, 'Use at least 12 characters for your password.').max(128)
export const nameSchema = z.string().trim().min(1).max(100)
const emailSchema = z.string().trim().toLowerCase().email().max(254)
const secretSchema = z.string().min(32).max(100)
export function requireUser(req, roles) {
  if (!req.user) throw new HttpError(401, 'Please sign in to continue.')
  if (!req.user.verified_at) throw new HttpError(403, 'Please verify your email before using your account.')
  if (roles && !roles.includes(req.user.role)) throw new HttpError(403, 'You do not have access to this action.')
  return req.user
}
export function mountAuth(app, db, config, mailer) {
  // A dummy hash keeps unknown-user and wrong-password checks on the same expensive path.
  const dummyHash = hashPassword(token())
  app.use('/api', async (req, res, next) => {
    const secret = cookieToken(req)
    if (secret && secret.length < 100) {
      const { rows: [row] } = await db.query(`SELECT u.*,s.csrf FROM sessions s JOIN users u ON u.id=s.user_id
        WHERE s.token_hash=$1 AND s.expires_at>now()`, [digest(secret)])
      req.user = row
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.headers.origin !== config.origin) throw new HttpError(403, 'This request must come from the Stemify website.')
      if (req.user && req.headers['x-csrf-token'] !== req.user.csrf) throw new HttpError(403, 'Please refresh this page and try again.')
    }
    res.setHeader('Cache-Control', 'no-store')
    next()
  })
  app.get('/api/session', (req, res) => res.json({ user: req.user ? publicUser(req.user) : null, csrf: req.user?.csrf || null }))
  async function issueEmail(user, purpose) {
    const secret = token()
    await db.transaction(async tx => {
      await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [user.id])
      await tx.query('DELETE FROM auth_tokens WHERE user_id=$1 AND purpose=$2', [user.id, purpose])
      await tx.query(`INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES($1,$2,$3,now()+$4*interval '1 minute')`,
        [digest(secret), user.id, purpose, purpose === 'verify' ? 1440 : 30])
    })
    await sendAccountEmail(mailer, config, user.email, purpose, secret)
  }
  app.post('/api/auth/register', async (req, res) => {
    await rateLimit(db, `register:${req.ip}`, 10)
    const input = z.object({ name: nameSchema, email: emailSchema, password: passwordSchema }).parse(req.body)
    const id = randomUUID()
    const result = await db.query(`INSERT INTO users(id,email,name,password_hash) VALUES($1,$2,$3,$4)
      ON CONFLICT(email) DO NOTHING RETURNING id,email`, [id, input.email, input.name, await hashPassword(input.password)])
    if (result.rows[0]) await issueEmail(result.rows[0], 'verify')
    res.status(202).json({ message: 'Check your email to verify your account. If you already registered, sign in or reset your password.' })
  })
  app.post('/api/auth/login', async (req, res) => {
    const input = z.object({ identifier: z.string().trim().toLowerCase().min(1).max(254), password: z.string().min(1).max(128) }).parse(req.body)
    await rateLimit(db, `login-ip:${req.ip}`, 40)
    await rateLimit(db, `login-account:${input.identifier}`, 10)
    const { rows: [user] } = await db.query('SELECT * FROM users WHERE email=$1 OR login_name=$1', [input.identifier])
    const matches = await checkPassword(input.password, user?.password_hash || await dummyHash)
    if (!user || !matches) throw new HttpError(401, 'Email, student username or password is incorrect.')
    const secret = token(), csrf = token()
    await db.transaction(async tx => {
      // Serializes login with password resets so an old password cannot create a new session after reset.
      const { rows: [current] } = await tx.query('SELECT password_hash FROM users WHERE id=$1 FOR UPDATE', [user.id])
      if (current.password_hash !== user.password_hash) throw new HttpError(401, 'Please sign in again.')
      await tx.query('DELETE FROM sessions WHERE token_hash=$1 OR expires_at<=now()', [digest(cookieToken(req))])
      await tx.query(`INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES($1,$2,$3,now()+interval '7 days')`, [digest(secret), user.id, csrf])
      await audit(tx, user.id, 'signed_in', user.id)
    })
    sessionCookie(res, secret, config.production)
    res.json({ user: publicUser(user), csrf })
  })
  app.post('/api/auth/logout', async (req, res) => {
    await db.query('DELETE FROM sessions WHERE token_hash=$1', [digest(cookieToken(req))])
    sessionCookie(res, '', config.production, 0)
    res.json({ ok: true })
  })
  for (const purpose of ['verify', 'reset']) {
    app.post(`/api/auth/request-${purpose}`, async (req, res) => {
      const { email } = z.object({ email: emailSchema }).parse(req.body)
      await rateLimit(db, `email-ip:${req.ip}`, 15)
      await rateLimit(db, `email:${purpose}:${email}`, 3)
      const { rows: [user] } = await db.query('SELECT id,email,verified_at FROM users WHERE email=$1', [email])
      if (user && (purpose === 'reset' || !user.verified_at)) await issueEmail(user, purpose)
      res.status(202).json({ message: 'If an eligible account exists, an email is on its way. Student passwords can be reset by their parent.' })
    })
    app.post(`/api/auth/${purpose}`, async (req, res) => {
      await rateLimit(db, `consume:${req.ip}`, 20)
      const input = z.object({ token: secretSchema, password: purpose === 'reset' ? passwordSchema : z.string().optional() }).parse(req.body)
      const hash = purpose === 'reset' ? await hashPassword(input.password) : null
      await db.transaction(async tx => {
        const { rows: [candidate] } = await tx.query('SELECT user_id FROM auth_tokens WHERE token_hash=$1 AND purpose=$2', [digest(input.token), purpose])
        if (!candidate) throw new HttpError(400, 'This link is invalid or expired. Request a new email.')
        await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [candidate.user_id])
        const { rows: [record] } = await tx.query('DELETE FROM auth_tokens WHERE token_hash=$1 AND purpose=$2 AND expires_at>now() RETURNING user_id', [digest(input.token), purpose])
        if (!record) throw new HttpError(400, 'This link is invalid or expired. Request a new email.')
        if (purpose === 'verify') await tx.query('UPDATE users SET verified_at=COALESCE(verified_at,now()) WHERE id=$1', [record.user_id])
        else {
          await tx.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, record.user_id])
          await tx.query('DELETE FROM sessions WHERE user_id=$1', [record.user_id])
        }
        await audit(tx, record.user_id, `${purpose}_completed`, record.user_id)
      })
      res.json({ message: purpose === 'verify' ? 'Email verified. You can sign in now.' : 'Password updated. Please sign in again.' })
    })
  }
}
