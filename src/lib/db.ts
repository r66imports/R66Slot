import { Pool } from 'pg'

// Lazy pool — only created on first query (not at build time)
let _pool: Pool | null = null

function getPool(): Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL
    if (!connectionString) {
      throw new Error('Missing DATABASE_URL environment variable')
    }
    // Railway internal connections (postgres.railway.internal) don't use SSL.
    // Public connections do. Detect by hostname.
    const isInternal = connectionString.includes('railway.internal')
    const ssl = isInternal ? false : { rejectUnauthorized: false }

    _pool = new Pool({
      connectionString,
      ssl,
      max: 5,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 30000,
      statement_timeout: 30000,
    })

    // If the pool hits an unrecoverable error, reset it so the next
    // request triggers a fresh pool (handles SIGTERM stale connections)
    _pool.on('error', (err) => {
      console.error('[db] Pool error, resetting:', err.message)
      _pool = null
    })
  }
  return _pool
}

// Proxy so existing code using db.query() works unchanged
export const db = new Proxy({} as Pool, {
  get(_, prop) {
    return (getPool() as any)[prop]
  }
})
