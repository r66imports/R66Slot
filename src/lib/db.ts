import { Pool } from 'pg'

let _pool: Pool | null = null

function buildPool(): Pool {
  const connectionString = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL
  if (!connectionString) throw new Error('Missing DATABASE_URL environment variable')

  // Railway internal hostname doesn't support SSL; public proxy does.
  const isInternal = connectionString.includes('railway.internal')
  const ssl = isInternal ? false : { rejectUnauthorized: false }

  const pool = new Pool({
    connectionString,
    ssl,
    max: 5,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 30000,
    statement_timeout: 30000,
  })

  pool.on('error', (err) => {
    console.error('[db] Idle client error, resetting pool:', err.message)
    _pool = null
  })

  return pool
}

function getPool(): Pool {
  if (!_pool) _pool = buildPool()
  return _pool
}

// db.query() with up to 3 retries on connection errors (handles Railway
// startup window where the DB takes a few seconds to become reachable)
async function query(sql: string, params?: any[]): Promise<any> {
  const maxAttempts = 3
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await getPool().query(sql, params)
    } catch (err: any) {
      const isConnErr =
        err?.code === 'ECONNREFUSED' ||
        err?.code === 'ETIMEDOUT' ||
        err?.message?.includes('timeout') ||
        err?.message?.includes('connect')

      if (isConnErr && attempt < maxAttempts) {
        console.error(`[db] Connection error (attempt ${attempt}/${maxAttempts}), retrying in ${attempt * 2}s:`, err.message)
        try { await _pool?.end() } catch { /* ignore */ }
        _pool = null
        await new Promise(r => setTimeout(r, attempt * 2000))
        continue
      }
      throw err
    }
  }
}

// Proxy for non-query methods (connect, end, etc.); query is overridden above
export const db = new Proxy({ query } as unknown as Pool, {
  get(target, prop) {
    if (prop === 'query') return target.query
    return (getPool() as any)[prop]
  }
})
