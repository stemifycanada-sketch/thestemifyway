import { loadConfig } from './server/config.mjs'
import { connectDatabase, migrate } from './server/database.mjs'
import { createMailer } from './server/mail.mjs'
import { createApp } from './server/app.mjs'
import { processZoomEvents, maintenance } from './server/zoom.mjs'

const config = loadConfig()
const db = await connectDatabase(config)
await migrate(db)
const mailer = await createMailer(config)
const app = createApp({ db, config, mailer })
const server = app.listen(config.port, config.host, () => console.log(`Stemify ready at ${config.origin}`))
let working = false
const worker = setInterval(async () => {
  if (working) return
  working = true
  try { await processZoomEvents(db); await maintenance(db) }
  catch { console.error('[zoom] Background processing unavailable; receipts remain queued') }
  finally { working = false }
}, 10000)
worker.unref()
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
  clearInterval(worker)
  server.close(async () => {
    while (working) await new Promise(resolve => setTimeout(resolve, 50))
    await mailer.close?.()
    await db.close()
    process.exit(0)
  })
})
