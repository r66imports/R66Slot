import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-session'
import {
  ensureListening,
  presenceSnapshot,
  publishLive,
  recentActivity,
  subscribeLive,
} from '@/lib/admin-live'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')

/** SSE stream of saves and presence for the live admin bar. Auth is middleware's job. */
export async function GET(request: NextRequest) {
  const session = verifyAdminSession(request.cookies.get('admin-session')?.value)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await ensureListening()
  } catch (err: any) {
    console.error('[admin-live] could not LISTEN:', err?.message)
    return NextResponse.json({ error: 'Live updates unavailable' }, { status: 503 })
  }

  const encoder = new TextEncoder()
  let cleanup = () => {}

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }
      send('hello', { user: session.username, presence: presenceSnapshot(), activity: recentActivity() })

      const unsubscribe = subscribeLive(send)
      // Railway's proxy drops a silent connection; a comment line keeps it open.
      const ping = setInterval(() => {
        try { controller.enqueue(encoder.encode(': ping\n\n')) } catch { cleanup() }
      }, 20_000)

      cleanup = () => {
        clearInterval(ping)
        unsubscribe()
        try { controller.close() } catch { /* already closed */ }
      }
      request.signal.addEventListener('abort', () => cleanup())
    },
    cancel() { cleanup() },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      // next start gzips responses, and gzip buffers an event stream until it ends.
      'Content-Encoding': 'none',
    },
  })
}

/**
 * The admin browser's announcements: a save it just made, a presence heartbeat,
 * or leaving. The username always comes from the session, never the body.
 * Accepts text/plain too, since navigator.sendBeacon can't set JSON.
 */
export async function POST(request: NextRequest) {
  const session = verifyAdminSession(request.cookies.get('admin-session')?.value)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = JSON.parse(await request.text()) } catch {
    return NextResponse.json({ error: 'Bad body' }, { status: 400 })
  }

  const clientId = str(body?.clientId, 64)
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })
  const user = session.username
  const at = Date.now()

  try {
    if (body.type === 'change') {
      await publishLive({
        type: 'change', clientId, user, at,
        page: str(body.page, 300),
        resource: str(body.resource, 120),
        method: str(body.method, 10).toUpperCase(),
      })
    } else if (body.type === 'presence') {
      await publishLive({ type: 'presence', clientId, user, at, page: str(body.page, 300), editing: !!body.editing })
    } else if (body.type === 'leave') {
      await publishLive({ type: 'leave', clientId })
    } else {
      return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
    }
  } catch (err: any) {
    console.error('[admin-live] publish failed:', err?.message)
    return NextResponse.json({ error: 'Publish failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
