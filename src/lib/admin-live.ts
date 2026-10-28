import { Client } from 'pg'
import { db } from '@/lib/db'

/**
 * Live admin — lets two people on the same admin page see each other's saves.
 *
 * The browser announces every successful admin save (POST /api/admin/live), this
 * module puts it on Postgres NOTIFY, and every server process LISTENs and fans it
 * out to its open SSE streams (GET /api/admin/live). NOTIFY rather than an
 * in-memory bus so it still works across a redeploy overlap or a second replica.
 *
 * Presence (who is on which page, who is typing) rides the same channel as
 * heartbeats; each process keeps its own map and prunes anyone silent for 45s.
 */

const CHANNEL = 'admin_live'
const PRESENCE_TTL_MS = 45_000
const ACTIVITY_KEEP = 25

export type LiveChange = {
  type: 'change'
  clientId: string
  user: string
  page: string
  /** Resource key, e.g. "admin/products" for /api/admin/products/123. */
  resource: string
  method: string
  at: number
}

export type LivePresence = {
  type: 'presence'
  clientId: string
  user: string
  page: string
  editing: boolean
  at: number
}

export type LiveLeave = { type: 'leave'; clientId: string }

type LiveMessage = LiveChange | LivePresence | LiveLeave
type Listener = (event: string, data: unknown) => void

type LiveState = {
  client: Client | null
  connecting: Promise<void> | null
  listeners: Set<Listener>
  presence: Map<string, LivePresence>
  activity: LiveChange[]
  presenceTimer: ReturnType<typeof setTimeout> | null
}

// globalThis so dev hot reload doesn't stack up LISTEN connections.
const g = globalThis as unknown as { __adminLive?: LiveState }
const state: LiveState = g.__adminLive ??= {
  client: null,
  connecting: null,
  listeners: new Set(),
  presence: new Map(),
  activity: [],
  presenceTimer: null,
}

function emit(event: string, data: unknown) {
  for (const l of state.listeners) {
    try { l(event, data) } catch { /* a dead stream is cleaned up by its own abort */ }
  }
}

export function presenceSnapshot(): LivePresence[] {
  const cutoff = Date.now() - PRESENCE_TTL_MS
  for (const [id, p] of state.presence) if (p.at < cutoff) state.presence.delete(id)
  return [...state.presence.values()]
}

// Many heartbeats land together; one snapshot per half second is plenty.
function schedulePresence() {
  if (state.presenceTimer) return
  state.presenceTimer = setTimeout(() => {
    state.presenceTimer = null
    emit('presence', presenceSnapshot())
  }, 500)
}

function handle(msg: LiveMessage) {
  if (msg.type === 'change') {
    state.activity.unshift(msg)
    state.activity.length = Math.min(state.activity.length, ACTIVITY_KEEP)
    emit('change', msg)
  } else if (msg.type === 'presence') {
    state.presence.set(msg.clientId, msg)
    schedulePresence()
  } else if (msg.type === 'leave') {
    if (state.presence.delete(msg.clientId)) schedulePresence()
  }
}

function connectionString() {
  const cs = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL
  if (!cs) throw new Error('Missing DATABASE_URL environment variable')
  return cs
}

async function connect(): Promise<void> {
  const cs = connectionString()
  // Dedicated client, not the pool: LISTEN holds its connection for life.
  const client = new Client({
    connectionString: cs,
    ssl: cs.includes('railway.internal') ? false : { rejectUnauthorized: false },
  })
  const reconnect = () => {
    if (state.client !== client) return
    state.client = null
    try { client.end() } catch { /* already gone */ }
    setTimeout(() => { if (state.listeners.size) ensureListening().catch(() => {}) }, 3000)
  }
  client.on('error', (err) => { console.error('[admin-live] listener error:', err.message); reconnect() })
  client.on('end', reconnect)
  client.on('notification', (n) => {
    if (n.channel !== CHANNEL || !n.payload) return
    try { handle(JSON.parse(n.payload)) } catch { /* ignore malformed */ }
  })
  await client.connect()
  await client.query(`LISTEN ${CHANNEL}`)
  state.client = client
}

export function ensureListening(): Promise<void> {
  if (state.client) return Promise.resolve()
  if (!state.connecting) {
    state.connecting = connect().finally(() => { state.connecting = null })
  }
  return state.connecting
}

export async function publishLive(msg: LiveMessage) {
  // NOTIFY payloads cap at 8000 bytes; ours are tiny, but never let a long path break a save.
  const payload = JSON.stringify(msg)
  if (payload.length > 7500) return
  await db.query('SELECT pg_notify($1, $2)', [CHANNEL, payload])
}

export function subscribeLive(listener: Listener): () => void {
  state.listeners.add(listener)
  return () => { state.listeners.delete(listener) }
}

export function recentActivity(): LiveChange[] {
  return state.activity
}
