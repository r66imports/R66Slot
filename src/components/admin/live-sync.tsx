'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Live admin: when someone saves on a page, everyone else on that page (or on a
 * page that loaded the same data) sees it without reloading.
 *
 * No page has to opt in. A fetch hook notes which /api resources the page reads
 * and announces every successful write to /api/admin/live; when another user's
 * write touches what this page shows, the page is remounted so its own loaders
 * run again. A remount throws away anything typed and not saved, so a page the
 * user has been working on is never refreshed under them; they get a banner
 * and choose when to load the other person's changes.
 *
 * See src/lib/admin-live.ts for the server side.
 */

type Presence = { clientId: string; user: string; page: string; editing: boolean; at: number }
type Change = { clientId: string; user: string; page: string; resource: string; method: string; at: number }

const HEARTBEAT_MS = 20_000
const EDITING_WINDOW_MS = 8_000
const REFRESH_DEBOUNCE_MS = 1_200
// A write only counts as a save if the user clicked or typed shortly before it.
// Writes a page makes by itself on load would otherwise ping-pong: A's mount
// POST refreshes B, whose remount POST refreshes A, and so on.
const SAVE_AFTER_INPUT_MS = 60_000

/** "/api/admin/products/123" → "admin/products"; "/api/checkout" → "checkout". */
function resourceOf(pathname: string): string | null {
  if (!pathname.startsWith('/api/')) return null
  if (pathname.startsWith('/api/admin/live') || pathname.startsWith('/api/admin/auth')) return null
  const parts = pathname.slice(5).split('/').filter(Boolean)
  if (!parts.length) return null
  return parts[0] === 'admin' ? parts.slice(0, 2).join('/') : parts[0]
}

const label = (s: string) => s.replace(/^\/?admin\/?/, '') || 'dashboard'

function ago(at: number) {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

// ── fetch hook (installed once per tab) ──────────────────────────────────────
let ignoreReads = new Set<string>()
type Hooks = { onRead: (resource: string) => void; onWrite: (resource: string, method: string) => void }
let hooks: Hooks | null = null
let originalFetch: typeof fetch | null = null

function installFetchHook() {
  if (originalFetch || typeof window === 'undefined') return
  originalFetch = window.fetch.bind(window)
  const base = originalFetch
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await base(input, init)
    try {
      const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const url = new URL(raw, window.location.origin)
      const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase()
      const resource = url.origin === window.location.origin ? resourceOf(url.pathname) : null
      if (resource && hooks && window.location.pathname.startsWith('/admin')) {
        if (method === 'GET') { if (!ignoreReads.has(resource)) hooks.onRead(resource) }
        else if (res.ok) hooks.onWrite(resource, method)
      }
    } catch { /* never let the hook break the page's own fetch */ }
    return res
  }
}

function post(body: unknown, beacon = false) {
  const json = JSON.stringify(body)
  if (beacon && navigator.sendBeacon) { navigator.sendBeacon('/api/admin/live', json); return }
  ;(originalFetch ?? fetch)('/api/admin/live', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: json,
    keepalive: true,
  }).catch(() => {})
}

/**
 * layoutReads: resources the admin layout itself polls on every page (badge
 * counts). Those reads say nothing about what the page shows, so they only
 * count on their own page — otherwise every save to them would refresh every page.
 */
export default function LiveSync({ children, layoutReads = [] }: { children: React.ReactNode; layoutReads?: string[] }) {
  const pathname = usePathname()
  ignoreReads = new Set(layoutReads)
  const [mountKey, setMountKey] = useState(0)
  const [connected, setConnected] = useState(false)
  const [presence, setPresence] = useState<Presence[]>([])
  const [activity, setActivity] = useState<Change[]>([])
  const [pending, setPending] = useState<Change | null>(null)
  const [open, setOpen] = useState(false)
  const [, tick] = useState(0)

  const clientId = useRef('')
  if (!clientId.current) {
    clientId.current = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36)
  }
  const anchorRef = useRef<HTMLSpanElement | null>(null)
  const pathRef = useRef(pathname)
  const loaded = useRef(new Set<string>())
  // Has the user touched this page since it (re)mounted? Then don't refresh under them.
  const engaged = useRef(false)
  const typedSinceMount = useRef(false)
  const lastTyped = useRef(0)
  const lastInput = useRef(0)
  const editingSent = useRef(false)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sendPresence = useCallback(() => {
    editingSent.current = Date.now() - lastTyped.current < EDITING_WINDOW_MS
    post({ type: 'presence', clientId: clientId.current, page: pathRef.current, editing: editingSent.current })
  }, [])

  const remount = useCallback(() => {
    const main = anchorRef.current?.closest('main') ?? null
    const top = main?.scrollTop ?? 0
    loaded.current.clear()
    engaged.current = false
    typedSinceMount.current = false
    lastInput.current = 0
    setPending(null)
    setMountKey((k) => k + 1)
    // The page reloads its data asynchronously; keep putting the scroll back
    // until the content is tall enough to hold it.
    if (main && top > 0) {
      const started = Date.now()
      const iv = setInterval(() => {
        main.scrollTop = top
        if (Math.abs(main.scrollTop - top) < 2 || Date.now() - started > 2500) clearInterval(iv)
      }, 100)
    }
  }, [])

  // New page: fresh slate, tell the others where we are.
  useEffect(() => {
    pathRef.current = pathname
    loaded.current.clear()
    engaged.current = false
    typedSinceMount.current = false
    setPending(null)
    sendPresence()
  }, [pathname, sendPresence])

  // Fetch hook + interaction tracking.
  useEffect(() => {
    installFetchHook()
    hooks = {
      onRead: (r) => loaded.current.add(r),
      onWrite: (resource, method) => {
        if (Date.now() - lastInput.current > SAVE_AFTER_INPUT_MS) return
        post({ type: 'change', clientId: clientId.current, page: pathRef.current, resource, method })
      },
    }
    const inLiveUi = (t: EventTarget | null) => t instanceof Element && !!t.closest('[data-live-ui]')
    const onType = (e: Event) => {
      if (inLiveUi(e.target)) return
      engaged.current = true
      typedSinceMount.current = true
      lastTyped.current = lastInput.current = Date.now()
      if (!editingSent.current) sendPresence()
    }
    const onClick = (e: Event) => {
      if (inLiveUi(e.target)) return
      lastInput.current = Date.now()
      // Buttons open modals, switch tabs, sort tables: all state a remount would lose.
      if (e.target instanceof Element && e.target.closest('button, [role="button"], [role="tab"], select')) engaged.current = true
    }
    document.addEventListener('input', onType, true)
    document.addEventListener('change', onType, true)
    document.addEventListener('click', onClick, true)

    const beat = setInterval(sendPresence, HEARTBEAT_MS)
    // Drop the "editing" flag soon after typing stops, not at the next heartbeat.
    const idle = setInterval(() => {
      if (editingSent.current && Date.now() - lastTyped.current >= EDITING_WINDOW_MS) sendPresence()
      tick((n) => n + 1)
    }, 2_000)
    const leave = () => post({ type: 'leave', clientId: clientId.current }, true)
    window.addEventListener('pagehide', leave)

    return () => {
      hooks = null
      document.removeEventListener('input', onType, true)
      document.removeEventListener('change', onType, true)
      document.removeEventListener('click', onClick, true)
      clearInterval(beat)
      clearInterval(idle)
      window.removeEventListener('pagehide', leave)
      leave()
    }
  }, [sendPresence])

  // Event stream.
  useEffect(() => {
    let es: EventSource | null = null
    let retry: ReturnType<typeof setTimeout> | null = null
    let closed = false

    const onChange = (c: Change) => {
      setActivity((a) => [c, ...a.filter((x) => x.at !== c.at || x.clientId !== c.clientId)].slice(0, 25))
      if (c.clientId === clientId.current) return
      const relevant = c.page === pathRef.current || loaded.current.has(c.resource)
      if (!relevant) return
      if (engaged.current) { setPending(c); return }
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null
        // They may have started working while the timer ran.
        if (engaged.current) setPending(c)
        else remount()
      }, REFRESH_DEBOUNCE_MS)
    }

    const open = () => {
      if (closed) return
      es = new EventSource('/api/admin/live')
      es.addEventListener('open', () => setConnected(true))
      es.addEventListener('hello', (e) => {
        const d = JSON.parse((e as MessageEvent).data)
        setPresence(d.presence ?? [])
        setActivity(d.activity ?? [])
        sendPresence()
      })
      es.addEventListener('presence', (e) => setPresence(JSON.parse((e as MessageEvent).data)))
      es.addEventListener('change', (e) => onChange(JSON.parse((e as MessageEvent).data)))
      es.addEventListener('error', () => {
        setConnected(false)
        // EventSource retries a dropped stream itself, but gives up for good on an error status.
        if (es?.readyState === EventSource.CLOSED) {
          es.close()
          retry = setTimeout(open, 10_000)
        }
      })
    }
    open()

    return () => {
      closed = true
      es?.close()
      if (retry) clearTimeout(retry)
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
    }
  }, [remount, sendPresence])

  const others = presence.filter((p) => p.clientId !== clientId.current)
  const here = others.filter((p) => p.page === pathname)
  const elsewhere = others.filter((p) => p.page !== pathname)
  const onlineUsers = new Set(others.map((p) => p.user)).size

  return (
    <>
      <span ref={anchorRef} hidden />
      <Fragment key={mountKey}>{children}</Fragment>

      {pending && (
        <div data-live-ui className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 shadow-lg text-sm font-play">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span>
            <b>{pending.user}</b> saved changes to {label(pending.resource)}
            {typedSinceMount.current && <span className="text-amber-700"> · your unsaved typing will be lost</span>}
          </span>
          <button onClick={remount} className="rounded bg-amber-500 px-3 py-1 text-white font-medium hover:bg-amber-600">Load</button>
          <button onClick={() => setPending(null)} className="text-gray-500 hover:text-gray-800" aria-label="Dismiss">✕</button>
        </div>
      )}

      <div data-live-ui className="fixed bottom-4 right-4 z-[9998] font-play text-sm">
        {open && (
          <div className="mb-2 w-80 max-h-[60vh] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl">
            <Section title="On this page">
              {here.length === 0 && <Empty>Just you</Empty>}
              {here.map((p) => <Person key={p.clientId} p={p} />)}
            </Section>
            <Section title="Elsewhere">
              {elsewhere.length === 0 && <Empty>Nobody else online</Empty>}
              {elsewhere.map((p) => <Person key={p.clientId} p={p} showPage />)}
            </Section>
            <Section title="Recent saves">
              {activity.length === 0 && <Empty>None yet</Empty>}
              {activity.map((c) => (
                <div key={c.clientId + c.at} className="flex justify-between gap-2 py-1">
                  <span className="truncate">
                    <b>{c.clientId === clientId.current ? 'You' : c.user}</b> · {label(c.resource)}
                    <span className="text-gray-400"> on {label(c.page)}</span>
                  </span>
                  <span className="shrink-0 text-gray-400">{ago(c.at)}</span>
                </div>
              ))}
            </Section>
          </div>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          className="ml-auto flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-md hover:bg-gray-50"
          title={connected ? 'Live: other users\' saves appear here' : 'Live updates reconnecting…'}
        >
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
          {here.length > 0
            ? here.map((p) => (
                <span key={p.clientId} className={p.editing ? 'text-amber-600' : ''}>
                  {p.user}{p.editing ? ' ✎' : ''}
                </span>
              ))
            : <span className="text-gray-600">Live</span>}
          {onlineUsers > 0 && <span className="text-gray-400">· {onlineUsers} online</span>}
        </button>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-100 px-3 py-2 last:border-0">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">{title}</div>
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-1 text-gray-400">{children}</div>
}

function Person({ p, showPage }: { p: Presence; showPage?: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className={`h-2 w-2 rounded-full ${p.editing ? 'bg-amber-500' : 'bg-green-500'}`} />
      <b>{p.user}</b>
      {p.editing && <span className="text-amber-600">editing…</span>}
      {showPage && <span className="truncate text-gray-400">{label(p.page)}</span>}
    </div>
  )
}
