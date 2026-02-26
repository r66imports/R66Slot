import { Pool } from 'pg'

// Lazy pool — only created on first query (not at build time)
let _pool: Pool | null = null

function getPool(): Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL
    if (!connectionString) {
      throw new Error('Missing DATABASE_URL environment variable')
    }
    _pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      statement_timeout: 30000,
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
