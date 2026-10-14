import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, mkdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import request from 'supertest'
import { assertLocalDatabaseStopped, provisionLocalAdmin, validateLocalAdminConfig } from '../../scripts/setup-local-admin.mjs'
import { connectDatabase, migrate } from '../../server/database.mjs'
import { createApp } from '../../server/app.mjs'
import { digest } from '../../server/security.mjs'

const listen = server => new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
const stop = server => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
async function context(t) {
  const workspaceRoot = await mkdtemp(join(tmpdir(), 'stemify-local-admin-'))
  const server = createServer(socket => socket.destroy())
  await listen(server)
  const port = server.address().port
  await stop(server)
  const config = { production: false, port, origin: `http://127.0.0.1:${port}`, host: '127.0.0.1', dataDir: ':memory:', trustProxy: false }
  const db = await connectDatabase(config)
  await migrate(db)
  t.after(async () => { await db.close(); await rm(workspaceRoot, { recursive: true, force: true }) })
  return { workspaceRoot, config, db, email: ' ADMIN@Stemify.test ' }
}

test('local admin rejects production, database URLs and non-loopback configurations', () => {
  const config = { production: false, host: '127.0.0.1', origin: 'http://127.0.0.1:4504', port: 4504 }
  assert.doesNotThrow(() => validateLocalAdminConfig(config))
  for (const change of [
    { production: true }, { databaseUrl: 'postgresql://user:password@remote.example/db' },
    { databaseUrl: 'postgresql://localhost/local' }, { host: '0.0.0.0' },
    { origin: 'https://stemify.ca' }, { origin: 'http://127.0.0.1:4504.evil.example' },
    { origin: 'http://127.0.0.1:4505' }, { origin: 'http://user:secret@127.0.0.1:4504' },
  ]) assert.throws(() => validateLocalAdminConfig({ ...config, ...change }))
})

test('first admin receives only a private single-use reset file and chooses a real password', async t => {
  const ctx = await context(t)
  const result = await provisionLocalAdmin(ctx)
  assert.equal(result.email, 'admin@stemify.test')
  assert.equal(result.url, undefined)
  assert.equal(result.token, undefined)
  assert.equal((await stat(result.path)).mode & 0o777, 0o600)
  const metadata = JSON.parse(await readFile(result.path, 'utf8'))
  assert.deepEqual(Object.keys(metadata).sort(), ['email', 'expiresAt', 'url'])
  assert.equal(metadata.email, result.email)
  const url = new URL(metadata.url), secret = new URLSearchParams(url.hash.slice(1)).get('reset')
  assert.equal(url.origin, ctx.config.origin)
  assert.equal(url.pathname, '/portal')
  assert.match(secret, /^[A-Za-z0-9_-]{43}$/)
  const user = (await ctx.db.query('SELECT * FROM users')).rows[0]
  assert.equal(user.name, 'STEMIFY Admin')
  assert.equal(user.role, 'staff')
  assert.ok(user.verified_at)
  assert.match(user.password_hash, /^scrypt:/)
  const stored = (await ctx.db.query('SELECT * FROM auth_tokens')).rows[0]
  assert.equal(stored.token_hash, digest(secret))
  assert.equal(stored.purpose, 'reset')
  assert.equal(new Date(stored.expires_at).toISOString(), metadata.expiresAt)
  assert.ok(Date.parse(metadata.expiresAt) - Date.now() > 29 * 60 * 1000)
  assert.ok(Date.parse(metadata.expiresAt) - Date.now() <= 30 * 60 * 1000)
  await assert.rejects(stat(join(ctx.workspaceRoot, '.data/local-operation.lock')), { code: 'ENOENT' })

  const app = createApp({ db: ctx.db, config: ctx.config, mailer: { send: async () => { throw new Error('No mail should be sent during local setup or password choice') } } })
  const password = 'Test-only-owner-password!'
  const reset = () => request(app).post('/api/auth/reset').set('Origin', ctx.config.origin).send({ token: secret, password })
  await reset().expect(200)
  await reset().expect(400)
  const login = await request(app).post('/api/auth/login').set('Origin', ctx.config.origin).send({ identifier: result.email, password }).expect(200)
  assert.equal(login.body.user.role, 'staff')
  assert.equal(login.body.user.verified, true)
})

test('existing users prevent a reset, promotion or second owner', async t => {
  const ctx = await context(t)
  const original = await provisionLocalAdmin(ctx)
  await rm(original.path)
  const before = (await ctx.db.query('SELECT * FROM users')).rows
  await assert.rejects(provisionLocalAdmin({ ...ctx, email: 'different@example.test' }), /already has users/)
  assert.deepEqual((await ctx.db.query('SELECT * FROM users')).rows, before)
  assert.equal((await ctx.db.query('SELECT count(*)::int AS count FROM auth_tokens')).rows[0].count, 1)
  await assert.rejects(stat(original.path), { code: 'ENOENT' })
})

test('existing operation locks are retained and prevent all provisioning', async t => {
  const ctx = await context(t), lock = join(ctx.workspaceRoot, '.data/local-operation.lock')
  await mkdir(lock, { recursive: true })
  await assert.rejects(provisionLocalAdmin(ctx), /operation is already running/)
  assert.equal((await stat(lock)).isDirectory(), true)
  assert.equal((await ctx.db.query('SELECT count(*)::int AS count FROM users')).rows[0].count, 0)
})

test('a running local server blocks setup and releases only the acquired lock', async t => {
  const ctx = await context(t), server = createServer(socket => socket.destroy())
  await listen(server)
  t.after(() => stop(server))
  const port = server.address().port, config = { ...ctx.config, port, origin: `http://127.0.0.1:${port}` }
  await assert.rejects(provisionLocalAdmin({ ...ctx, config }), /Stop the local portal/)
  assert.equal((await ctx.db.query('SELECT count(*)::int AS count FROM users')).rows[0].count, 0)
  await assert.rejects(stat(join(ctx.workspaceRoot, '.data/local-operation.lock')), { code: 'ENOENT' })
})

test('invalid emails and existing setup files leave the database unchanged', async t => {
  const ctx = await context(t)
  await assert.rejects(provisionLocalAdmin({ ...ctx, email: 'not-an-email' }), /valid admin email/)
  const directory = join(ctx.workspaceRoot, '.data'), path = join(directory, 'local-admin-setup.json')
  await mkdir(directory, { recursive: true })
  await writeFile(path, 'existing private setup file', { mode: 0o600 })
  await assert.rejects(provisionLocalAdmin(ctx), /will not be overwritten/)
  assert.equal(await readFile(path, 'utf8'), 'existing private setup file')
  assert.equal((await ctx.db.query('SELECT count(*)::int AS count FROM users')).rows[0].count, 0)
  assert.equal((await ctx.db.query('SELECT count(*)::int AS count FROM auth_tokens')).rows[0].count, 0)
})

test('outside storage and a symlinked .data are refused before opening a database', async t => {
  const ctx = await context(t)
  await assert.rejects(provisionLocalAdmin({ ...ctx, db: undefined, config: { ...ctx.config, dataDir: join(ctx.workspaceRoot, 'outside') } }), /inside this project/)
  const other = join(ctx.workspaceRoot, 'other')
  await mkdir(other)
  await symlink(other, join(ctx.workspaceRoot, '.data'))
  await assert.rejects(provisionLocalAdmin(ctx), /not a symbolic link/)
  assert.equal((await ctx.db.query('SELECT count(*)::int AS count FROM users')).rows[0].count, 0)
})

test('reserved database destinations and symlinked descendants are refused', async t => {
  const ctx = await context(t)
  for (const dataDir of ['.data', '.data/backups/db', '.data/mail', '.data/local-operation.lock/db', '.data/local-admin-setup.json']) {
    await assert.rejects(provisionLocalAdmin({ ...ctx, db: undefined, config: { ...ctx.config, dataDir } }), /ordinary database folder/)
  }
  const outside = join(ctx.workspaceRoot, 'outside'), parent = join(ctx.workspaceRoot, '.data/nested')
  await mkdir(outside)
  await mkdir(parent, { recursive: true })
  await symlink(outside, join(parent, 'linked'))
  await assert.rejects(provisionLocalAdmin({ ...ctx, db: undefined, config: { ...ctx.config, dataDir: '.data/nested/linked/database' } }), /not symbolic links/)
})

async function backgroundProcess(t, cwd, script, args = []) {
  const child = spawn(process.execPath, ['-e', script, ...args], { cwd, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] })
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) { const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited } })
  await once(child, 'message')
  return child
}

test('a same-project server on another port blocks provisioning', async t => {
  const ctx = await context(t)
  await backgroundProcess(t, ctx.workspaceRoot, "require('node:net').createServer(socket=>socket.destroy()).listen(0,'127.0.0.1',()=>process.send('ready'))")
  await assert.rejects(provisionLocalAdmin(ctx), /Another Node\/npm process/)
  assert.equal((await ctx.db.query('SELECT count(*)::int AS count FROM users')).rows[0].count, 0)
})

test('an open database file blocks setup even when its process has a different working directory', async t => {
  const ctx = await context(t), dataPath = join(ctx.workspaceRoot, '.data/postgres'), file = join(dataPath, 'held-test-file')
  await mkdir(dataPath, { recursive: true })
  await writeFile(file, 'synthetic database hold')
  await backgroundProcess(t, tmpdir(), "require('node:fs').openSync(process.argv[1],'r');process.send('ready');setInterval(()=>{},1000)", [file])
  await assert.rejects(assertLocalDatabaseStopped(ctx.config, ctx.workspaceRoot, dataPath), /still has open files/)
})
