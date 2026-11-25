import { db } from '@/lib/db'

/**
 * Every admin login attempt, successful or not, so "has X tried to log in?" has
 * an answer. Before this the login route wrote nothing at all — a deleted user
 * hammering the login form left no trace anywhere.
 *
 * Viewable by the main Admin at /admin/settings/users/login-log.
 */

export type LoginOutcome =
  | 'success'
  | 'bad_password'
  | 'unknown_user' // no such account — includes deleted users
  | 'inactive'
  | 'error'

export interface LoginLogEntry {
  id: number
  username: string
  outcome: LoginOutcome
  ip: string | null
  userAgent: string | null
  createdAt: string
}

let tableReady = false

async function ensureTable() {
  if (tableReady) return
  await db.query(`
    CREATE TABLE IF NOT EXISTS admin_login_log (
      id          BIGSERIAL PRIMARY KEY,
      username    TEXT NOT NULL,
      outcome     TEXT NOT NULL,
      ip          TEXT,
      user_agent  TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`CREATE INDEX IF NOT EXISTS admin_login_log_ts_idx   ON admin_login_log (created_at DESC)`)
  await db.query(`CREATE INDEX IF NOT EXISTS admin_login_log_user_idx ON admin_login_log (LOWER(username))`)
  tableReady = true
}

/** Cloudflare sits in front of both sites, so its header is the real client. */
function clientIp(request: Request): string | null {
  const cf = request.headers.get('cf-connecting-ip')
  if (cf) return cf
  const fwd = request.headers.get('x-forwarded-for')
  return fwd ? fwd.split(',')[0].trim() : null
}

/** Never throws — a logging failure must not block a login. */
export async function logLoginAttempt(request: Request, username: string, outcome: LoginOutcome): Promise<void> {
  try {
    await ensureTable()
    await db.query(
      `INSERT INTO admin_login_log (username, outcome, ip, user_agent) VALUES ($1, $2, $3, $4)`,
      [
        String(username || '').slice(0, 200),
        outcome,
        clientIp(request),
        (request.headers.get('user-agent') || '').slice(0, 500) || null,
      ]
    )
  } catch (err: any) {
    console.error('[admin-login-log] write failed:', err?.message || err)
  }
}

export async function getLoginLog(opts: { username?: string; limit?: number } = {}): Promise<LoginLogEntry[]> {
  await ensureTable()
  const limit = Math.min(Math.max(opts.limit ?? 500, 1), 2000)
  const params: unknown[] = []
  let where = ''
  if (opts.username) {
    params.push(opts.username.toLowerCase())
    where = `WHERE LOWER(username) = $1`
  }
  params.push(limit)
  const result = await db.query(
    `SELECT id, username, outcome, ip, user_agent, created_at
       FROM admin_login_log ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length}`,
    params
  )
  return result.rows.map((r: any) => ({
    id: Number(r.id),
    username: r.username,
    outcome: r.outcome,
    ip: r.ip,
    userAgent: r.user_agent,
    createdAt: new Date(r.created_at).toISOString(),
  }))
}
