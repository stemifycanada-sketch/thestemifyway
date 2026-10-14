import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
const derive = promisify(scrypt)
export const token = () => randomBytes(32).toString('base64url')
export const digest = value => createHash('sha256').update(value).digest('hex')
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = await derive(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
  return `scrypt:${salt}:${hash.toString('hex')}`
}
export async function checkPassword(password, stored) {
  const [, salt, hash] = stored.split(':')
  const actual = await derive(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
  return timingSafeEqual(actual, Buffer.from(hash, 'hex'))
}
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status }
}
export async function rateLimit(db, key, maximum, seconds = 900) {
  const { rows: [row] } = await db.query(`INSERT INTO rate_limits(key_hash,count,expires_at)
    VALUES($1,1,now()+$2 * interval '1 second') ON CONFLICT(key_hash) DO UPDATE SET
    count=CASE WHEN rate_limits.expires_at<=now() THEN 1 ELSE LEAST(rate_limits.count+1,100000) END,
    expires_at=CASE WHEN rate_limits.expires_at<=now() THEN EXCLUDED.expires_at ELSE rate_limits.expires_at END RETURNING count`, [digest(key), seconds])
  if (row.count > maximum) throw new HttpError(429, 'Too many attempts. Please try again in 15 minutes.')
}
export async function audit(db, actor, action, resource = null) {
  await db.query('INSERT INTO audit_events(actor_id,action,resource_id) VALUES($1,$2,$3)', [actor, action, resource])
}
export const publicUser = user => ({ id: user.id, name: user.name, email: user.email, role: user.role, verified: Boolean(user.verified_at) })
export function cookieToken(request) {
  return (request.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('stemify_session='))?.slice(16) || ''
}
export function sessionCookie(response, value, production, maxAge = 7 * 86400) {
  response.setHeader('Set-Cookie', `stemify_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${production ? '; Secure' : ''}`)
}
