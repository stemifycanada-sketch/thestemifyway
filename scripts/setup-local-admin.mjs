import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { lstat, mkdir, open, rm, rmdir } from 'node:fs/promises'
import { connect } from 'node:net'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { z } from 'zod'
import { loadConfig } from '../server/config.mjs'
import { connectDatabase, migrate } from '../server/database.mjs'
import { audit, digest, hashPassword, token } from '../server/security.mjs'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const localHosts = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])
const emailSchema = z.string().trim().toLowerCase().email().max(254)
const run = promisify(execFile)
const lsofCommand = process.platform === 'darwin' ? '/usr/sbin/lsof' : 'lsof'
class LocalSetupError extends Error {}

export function validateLocalAdminConfig(config) {
  if (config.production) throw new LocalSetupError('Local admin setup cannot run in production.')
  if (config.databaseUrl) throw new LocalSetupError('Local admin setup supports the local PGlite database only. Remove DATABASE_URL from this local configuration.')
  let origin
  try { origin = new URL(config.origin) } catch { throw new LocalSetupError('Configure a valid loopback APP_ORIGIN for local setup.') }
  if (!['http:', 'https:'].includes(origin.protocol) || origin.origin !== config.origin || origin.username || origin.password || !localHosts.has(origin.hostname) || !localHosts.has(config.host)) {
    throw new LocalSetupError('Local admin setup requires a loopback APP_ORIGIN and HOST.')
  }
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535 || Number(origin.port || (origin.protocol === 'https:' ? 443 : 80)) !== config.port) {
    throw new LocalSetupError('APP_ORIGIN must use the configured local application port.')
  }
}

async function inspectProcesses(args) {
  try { return (await run(lsofCommand, args, { maxBuffer: 1024 * 1024, timeout: 5000 })).stdout }
  catch (error) {
    // macOS may return status 1 for a partially matched directory scan while still reporting holders.
    if (error.code === 1 && !error.stderr?.trim()) return error.stdout || ''
    throw new LocalSetupError('Could not confirm that the local database is stopped. This helper requires lsof.')
  }
}

export async function assertLocalDatabaseStopped(config, workspaceRoot, databasePath) {
  for (const host of ['127.0.0.1', '::1']) {
    await new Promise((resolveCheck, reject) => {
      const socket = connect({ host, port: config.port })
      socket.setTimeout(750)
      socket.once('connect', () => { socket.destroy(); reject(new LocalSetupError('Stop the local portal before setting up the first admin.')) })
      socket.once('timeout', () => { socket.destroy(); reject(new LocalSetupError('Could not confirm that the local portal is stopped.')) })
      socket.once('error', error => {
        socket.destroy()
        if (['ECONNREFUSED', 'EAFNOSUPPORT', 'EADDRNOTAVAIL'].includes(error.code)) resolveCheck()
        else reject(new LocalSetupError('Could not confirm that the local portal is stopped.'))
      })
    })
  }
  // A direct server may use another port and may not hold the launcher lock.
  const processes = await inspectProcesses(['-a', '-d', 'cwd', '-Fpc', '--', resolve(workspaceRoot)])
  let pid
  for (const line of processes.split('\n')) {
    if (line.startsWith('p')) pid = Number(line.slice(1))
    if (line.startsWith('c') && pid !== process.pid && /^(node|npm|bun)(?:\b|$)/i.test(line.slice(1))) {
      throw new LocalSetupError('Another Node/npm process is using this project. Stop it before setting up the first admin.')
    }
  }
  if (databasePath) {
    let exists = false
    try { exists = (await lstat(databasePath)).isDirectory() } catch (error) { if (error.code !== 'ENOENT') throw error }
    if (exists && (await inspectProcesses(['-t', '+D', databasePath])).trim()) {
      throw new LocalSetupError('The database folder still has open files. Close the portal and any database tools before setting up the first admin.')
    }
  }
}

async function validateDatabasePath(config, workspaceRoot) {
  const folder = config.dataDir || '.data/postgres'
  const databasePath = resolve(workspaceRoot, folder), local = relative(workspaceRoot, databasePath)
  if (isAbsolute(folder) || !local.startsWith(`.data${sep}`) || ['backups', 'mail', 'local-operation.lock', 'local-admin-setup.json'].includes(local.split(sep)[1])) {
    throw new LocalSetupError('LOCAL_DATA_DIR must be an ordinary database folder inside this project’s .data directory, such as .data/postgres.')
  }
  let current = resolve(workspaceRoot)
  for (const part of local.split(sep)) {
    current = join(current, part)
    try {
      const entry = await lstat(current)
      if (entry.isSymbolicLink() || !entry.isDirectory()) throw new LocalSetupError('Local database folders must be ordinary directories, not symbolic links or files.')
    } catch (error) { if (error.code === 'ENOENT') break; throw error }
  }
  return databasePath
}

// This is an offline, first-owner command. It never sends mail or exposes the setup secret in its return value.
export async function provisionLocalAdmin({ config, email, workspaceRoot = repositoryRoot, db: suppliedDb }) {
  validateLocalAdminConfig(config)
  const parsedEmail = emailSchema.safeParse(email)
  if (!parsedEmail.success) throw new LocalSetupError('Supply a valid admin email address.')
  const directory = join(resolve(workspaceRoot), '.data')
  const lock = join(directory, 'local-operation.lock')
  const path = join(directory, 'local-admin-setup.json')
  const databasePath = suppliedDb ? null : await validateDatabasePath(config, resolve(workspaceRoot))
  try {
    const existing = await lstat(directory)
    if (existing.isSymbolicLink() || !existing.isDirectory()) throw new LocalSetupError('The local .data path must be a real directory, not a symbolic link.')
  } catch (error) { if (error.code !== 'ENOENT') throw error }
  await mkdir(directory, { recursive: true, mode: 0o700 })
  try { await mkdir(lock, { mode: 0o700 }) }
  catch (error) {
    if (error.code === 'EEXIST') throw new LocalSetupError('A local operation is already running. Stop it before setting up the first admin; existing locks are never cleared automatically.')
    throw error
  }
  let db, fileCreated = false
  try {
    await assertLocalDatabaseStopped(config, workspaceRoot, databasePath)
    db = suppliedDb || await connectDatabase({ ...config, dataDir: databasePath })
    if (!suppliedDb) await migrate(db)
    let expiresAt
    try {
      await db.transaction(async tx => {
        // Prevent a simultaneous first-user insertion from turning this command into an account takeover.
        await tx.query('LOCK TABLE users IN ACCESS EXCLUSIVE MODE')
        if ((await tx.query('SELECT id FROM users LIMIT 1')).rows.length) {
          throw new LocalSetupError('This database already has users. First-admin setup cannot change, promote or reset an existing account.')
        }
        const id = randomUUID(), resetSecret = token()
        const passwordHash = await hashPassword(token())
        await tx.query("INSERT INTO users(id,email,name,password_hash,role,verified_at) VALUES($1,$2,'STEMIFY Admin',$3,'staff',now())", [id, parsedEmail.data, passwordHash])
        const { rows: [reset] } = await tx.query("INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES($1,$2,'reset',now()+interval '30 minutes') RETURNING expires_at", [digest(resetSecret), id])
        expiresAt = new Date(reset.expires_at).toISOString()
        await audit(tx, id, 'local_owner_provisioned', id)
        let handle
        try { handle = await open(path, 'wx', 0o600) }
        catch (error) {
          if (error.code === 'EEXIST') throw new LocalSetupError('A private setup file already exists. It will not be overwritten.')
          throw error
        }
        fileCreated = true
        try {
          await handle.writeFile(JSON.stringify({ url: `${config.origin}/portal#reset=${resetSecret}`, email: parsedEmail.data, expiresAt }, null, 2) + '\n')
          await handle.sync()
        } finally { await handle.close() }
      })
    } catch (error) {
      if (fileCreated) await rm(path, { force: true })
      throw error
    }
    return { path, email: parsedEmail.data, expiresAt }
  } finally {
    try { if (db && !suppliedDb) await db.close() }
    finally { await rmdir(lock) }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await provisionLocalAdmin({ config: loadConfig(), email: process.argv[2] })
    console.log(`Local admin setup is ready. Private setup file: ${result.path}`)
  } catch (error) {
    console.error(error instanceof LocalSetupError ? error.message : 'Local admin setup failed. No setup credentials were printed; inspect the local configuration and try again.')
    process.exitCode = 1
  }
}
