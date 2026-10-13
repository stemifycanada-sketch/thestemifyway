import express from 'express'
import { fileURLToPath } from 'node:url'
import { ZodError } from 'zod'
import { mountZoom } from './zoom.mjs'
import { mountAuth } from './auth.mjs'
import { mountPortal } from './portal.mjs'
import { mountLearning } from './learning.mjs'
import { HttpError } from './security.mjs'

export function createApp({ db, config, mailer }) {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', config.trustProxy)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    if (config.production) res.setHeader('Strict-Transport-Security', 'max-age=31536000')
    next()
  })
  app.get('/api/health', async (_req, res) => {
    await db.query('SELECT 1')
    res.json({ ok: true })
  })
  mountZoom(app, db, config)
  app.use(express.json({ limit: '100kb' }))
  mountAuth(app, db, config, mailer)
  mountPortal(app, db, config)
  mountLearning(app, db)
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found.')))
  const dist = fileURLToPath(new URL('../dist/', import.meta.url))
  app.get(['/portal', '/portal/'], (_req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src https://wayground.com https://*.wayground.com https://quizizz.com https://*.quizizz.com; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
    res.sendFile('index.html', { root: dist })
  })
  app.use('/thestemifyway', express.static(dist))
  app.use(express.static(dist))
  app.use((_req, res) => res.sendStatus(404))
  app.use((error, _req, res, next) => {
    if (res.headersSent) return next(error)
    if (error instanceof ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Check the supplied fields.' })
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.message })
    if (error.code === '23505') return res.status(409).json({ error: 'This username or meeting instance is already in use.' })
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large.' })
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request.' })
    console.error('[portal] Request failed')
    res.status(503).json({ error: 'Unable to complete this request. Please try again. For account emails, use Resend verification or Reset password.' })
  })
  return app
}
