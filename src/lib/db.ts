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
    max: 10,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 60000,
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

// db.query() with up to 3 retries on genuine network-level connection errors.
// NOTE: only retries on OS-level errors (ECONNREFUSED, ETIMEDOUT etc.) —
// NOT on pool exhaustion timeouts, which would destroy the pool unnecessarily
// and cause the compounding 30-second stall.
async function query(sql: string, params?: any[]): Promise<any> {
  const maxAttempts = 3
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await getPool().query(sql, params)
    } catch (err: any) {
      const isNetworkErr =
        err?.code === 'ECONNREFUSED' ||
        err?.code === 'ECONNRESET' ||
        err?.code === 'ENOTFOUND' ||
        err?.code === 'ENETUNREACH' ||
        err?.code === 'ETIMEDOUT'

      if (isNetworkErr && attempt < maxAttempts) {
        console.error(`[db] Network error (attempt ${attempt}/${maxAttempts}), retrying in ${attempt}s:`, err.message)
        try { await _pool?.end() } catch { /* ignore */ }
        _pool = null
        await new Promise(r => setTimeout(r, attempt * 1000))
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
