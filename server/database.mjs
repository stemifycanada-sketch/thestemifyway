import { readFile, readdir, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export async function connectDatabase(config) {
  if (config.databaseUrl) {
    const { default: pg } = await import('pg')
    const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10, connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000, statement_timeout: 15000 })
    pool.on('error', () => console.error('[database] Connection unavailable'))
    return { query: (sql, args) => pool.query(sql, args), close: () => pool.end(),
      async transaction(work) {
        const client = await pool.connect()
        try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result }
        catch (error) { await client.query('ROLLBACK'); throw error }
        finally { client.release() }
      } }
  }
  if (config.production) throw new Error('Production requires DATABASE_URL for durable PostgreSQL storage.')
  const { PGlite } = await import('@electric-sql/pglite')
  const path = config.dataDir === ':memory:' ? undefined : resolve(config.dataDir || '.data/postgres')
  if (path) await mkdir(path, { recursive: true, mode: 0o700 })
  const db = new PGlite(path)
  await db.waitReady
  return { query: (sql, args) => db.query(sql, args), transaction: work => db.transaction(work), close: () => db.close() }
}

export async function migrate(db) {
  await db.transaction(async tx => {
    // PostgreSQL transaction lock also serializes simultaneous deployment migrations.
    await tx.query('SELECT pg_advisory_xact_lock(7241013)')
    await tx.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())')
    const folder = fileURLToPath(new URL('./migrations/', import.meta.url))
    for (const name of (await readdir(folder)).filter(x => x.endsWith('.sql')).sort()) {
      if ((await tx.query('SELECT name FROM schema_migrations WHERE name=$1', [name])).rows.length) continue
      // Migration files contain trusted, repository-owned SQL only.
      const sql = await readFile(resolve(folder, name), 'utf8')
      for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await tx.query(statement)
      await tx.query('INSERT INTO schema_migrations(name) VALUES($1)', [name])
    }
  })
}
