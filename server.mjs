import express from 'express'
import { fileURLToPath } from 'node:url'

const app = express()
const dist = fileURLToPath(new URL('./dist/', import.meta.url))
app.disable('x-powered-by')
app.get('/api/health', (_request, response) => response.json({ ok: true }))
// Keep the published asset paths working at the existing Render root address.
app.use('/thestemifyway', express.static(dist))
app.use(express.static(dist))
app.use((_request, response) => response.sendStatus(404))

const server = app.listen(Number(process.env.PORT || 10000), process.env.HOST || '0.0.0.0', () => {
  console.log('Stemify website ready')
})
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
