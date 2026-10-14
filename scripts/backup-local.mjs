import { chmod, lstat, mkdir, rm, rmdir } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createConnection } from 'node:net'
import { randomBytes } from 'node:crypto'
import { loadConfig } from '../server/config.mjs'

const run = promisify(execFile)
const lsofCommand = process.platform === 'darwin' ? '/usr/sbin/lsof' : 'lsof'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const mode = process.argv[2]
const fail = message => { throw new Error(message) }
process.chdir(root)
process.umask(0o077)

async function stat(path) {
  try { return await lstat(path) } catch (error) { if (error.code === 'ENOENT') return null; throw error }
}
async function checkPath(path, required = false) {
  const local = relative(root, path)
  if (!local || local.startsWith(`..${sep}`) || isAbsolute(local)) fail('The local data folder must stay inside this project.')
  let current = root
  for (const part of local.split(sep)) {
    current = resolve(current, part)
    const entry = await stat(current)
    if (!entry) { if (required) fail('The local database folder does not exist yet. Start and stop the portal before backing it up.'); return }
    if (entry.isSymbolicLink() || !entry.isDirectory()) fail('Local data folders must be ordinary directories, not links or files.')
  }
}
async function lsof(args) {
  try { return (await run(lsofCommand, args, { maxBuffer: 1024 * 1024 })).stdout }
  catch (error) { if (error.code === 1 && !error.stderr?.trim()) return error.stdout || ''; fail('Cannot confirm the database is stopped. This helper requires lsof; close the portal and try again.') }
}
async function portIsOpen(host, port) {
  return new Promise((resolvePort, reject) => {
    const socket = createConnection({ host, port })
    socket.once('connect', () => { socket.destroy(); resolvePort(true) })
    socket.once('error', error => {
      socket.destroy()
      if (['ECONNREFUSED', 'EAFNOSUPPORT', 'EADDRNOTAVAIL'].includes(error.code)) resolvePort(false)
      else reject(new Error('Cannot check the local port safely. Stop the portal and try again.'))
    })
    socket.setTimeout(1000, () => { socket.destroy(); reject(new Error('The local port check timed out. Stop the portal and try again.')) })
  })
}
async function assertStopped(config, dataPath) {
  const sockets = await Promise.all(['127.0.0.1', '::1'].map(host => portIsOpen(host, config.port)))
  if (sockets.some(Boolean)) fail('The configured local port is already in use. Stop the portal with Control-C; do not start a second database writer.')
  // Also catch a server started directly with npm or on a different port from this checkout.
  const processes = await lsof(['-a', '-d', 'cwd', '-Fpc', '--', root])
  let pid
  for (const line of processes.split('\n')) {
    if (line.startsWith('p')) pid = Number(line.slice(1))
    if (line.startsWith('c') && pid !== process.pid && /^(node|npm|bun)(?:\b|$)/i.test(line.slice(1))) fail('Another Node/npm process is using this project. Stop it before starting or backing up this database.')
  }
  if (await stat(dataPath)) {
    const holders = await lsof(['-t', '+D', dataPath])
    if (holders.trim()) fail('The database folder still has open files. Close the portal and any database tools, then try again.')
  }
}
function localConfig() {
  if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL) fail('This helper is only for a local database. Production mode and DATABASE_URL are refused.')
  const config = loadConfig()
  const origin = new URL(config.origin)
  if (!['127.0.0.1', 'localhost', '::1'].includes(config.host) || !['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname) || origin.protocol !== 'http:') fail('Use a loopback HOST and a local http:// APP_ORIGIN. Public network binding is refused.')
  if (!Number.isInteger(config.port) || config.port < 1024 || config.port > 65535 || Number(origin.port || 80) !== config.port) fail('PORT must be between 1024 and 65535 and match APP_ORIGIN.')
  const folder = config.dataDir
  const dataPath = resolve(root, folder), local = relative(root, dataPath)
  if (isAbsolute(folder) || !local.startsWith(`.data${sep}`) || ['backups', 'mail', 'local-operation.lock'].includes(local.split(sep)[1])) fail('LOCAL_DATA_DIR must be a database folder under .data, such as .data/postgres.')
  return { config, dataPath, local }
}

let lockOwned = false, archive
try {
  if (mode === '--help') {
    console.log('Stop the local portal, then run: node --env-file-if-exists=.env scripts/backup-local.mjs\nBacks up the local database and local mail into private .data/backups. Never includes .env.\nThe launcher uses --check-start for a read-only safety check.')
  } else {
    if (mode && mode !== '--check-start') fail('Unknown option. Use --help for instructions.')
    const { config, dataPath, local } = localConfig()
    await checkPath(resolve(root, '.data'))
    await checkPath(dataPath, mode !== '--check-start')
    if (mode === '--check-start') {
      if (config.smtpUrl) fail('Local-only startup uses private mail files. Remove SMTP_URL from the local environment before starting.')
      for (const module of ['express', 'pg', 'nodemailer', 'zod', '@electric-sql/pglite']) {
        if (!(await stat(resolve(root, 'node_modules', module, 'package.json')))) fail('Dependencies are missing. Complete the one-time installation in docs/local-portal.md; this launcher never installs packages.')
      }
      if (!(await stat(resolve(root, 'dist/index.html')))) fail('The website build is missing. Run npm run build before starting.')
      await assertStopped(config, dataPath)
      console.log(`${config.origin}/portal`)
    } else {
      await mkdir(resolve(root, '.data/local-operation.lock'), { mode: 0o700 }).catch(error => { if (error.code === 'EEXIST') fail('A local start or backup is already in progress. Stop the portal first. See docs/local-portal.md for a stale lock.'); throw error })
      lockOwned = true
      await assertStopped(config, dataPath)
      const mailPath = resolve(root, '.data/mail')
      await checkPath(mailPath)
      const backupPath = resolve(root, '.data/backups')
      await checkPath(backupPath)
      await mkdir(backupPath, { recursive: true, mode: 0o700 })
      await chmod(backupPath, 0o700)
      archive = resolve(backupPath, `stemify-local-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomBytes(3).toString('hex')}.tar.gz`)
      const files = [local, ...(await stat(mailPath) ? ['.data/mail'] : [])]
      await run('/usr/bin/tar', ['-czf', archive, '--exclude=.env', '--exclude=.env.*', '-C', root, '--', ...files], { maxBuffer: 1024 * 1024 })
      await chmod(archive, 0o600)
      console.log(`Local backup saved: ${archive}\nIt contains private student records and account email links. Keep it protected.`)
      archive = undefined
    }
  }
} catch (error) {
  console.error(`STEMIFY: ${error.message}`)
  process.exitCode = 1
} finally {
  if (archive) await rm(archive, { force: true })
  if (lockOwned) await rmdir(resolve(root, '.data/local-operation.lock'))
}
