'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Live admin: when someone saves on a page, everyone else on that page (or on a
 * page that loaded the same data) sees it on its own — no reload, no button.
 *
 * No page has to opt in. A fetch hook notes which /api resources the page reads
 * and announces every successful write to /api/admin/live. When another user's
 * write touches what this page shows, a second copy of the page is mounted
 * hidden, runs its own loaders, and once its data is in it is swapped in place
 * of the visible copy. Before the swap, anything the user typed and has not yet
 * saved is copied into the new copy, and the scroll position and cursor are put
 * back, so the swap is invisible apart from the other person's changes.
 *
 * The swap waits while the user is mid-keystroke or has a modal open, and while
 * an unsaved field can't be matched in the new copy (their typing would be lost);
 * it goes ahead by itself as soon as that clears. Tab, sort and expand state that
 * lives only in page memory does reset on a swap.
 *
 * See src/lib/admin-live.ts for the server side.
 */

type Presence = { clientId: string; user: string; page: string; editing: boolean; at: number }
type Change = { clientId: string; user: string; page: string; resource: string; method: string; at: number }

const HEARTBEAT_MS = 20_000
const EDITING_WINDOW_MS = 8_000
// A write only counts as a save if the user clicked or typed shortly before it.
// Writes a page makes by itself on load would otherwise ping-pong: A's mount
// POST refreshes B, whose remount POST refreshes A, and so on.
const SAVE_AFTER_INPUT_MS = 60_000
// Swap timing: let the hidden copy start its loads, then wait for the network to go quiet.
const PRELOAD_MIN_MS = 500
const QUIET_MS = 300
const PRELOAD_MAX_MS = 8_000
// Don't swap under someone who is still typing.
const TYPING_PAUSE_MS = 2_500

const FIELD = 'input, textarea, select'
const MODAL = '[role="dialog"], [aria-modal="true"], .fixed.inset-0'

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

// ── matching a field in the old copy to the same field in the new copy ───────
type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

function sigOf(el: Element) {
  const key = el.getAttribute('name') || el.id || el.getAttribute('aria-label') || el.getAttribute('placeholder') || ''
  return `${el.tagName}|${(el as HTMLInputElement).type || ''}|${key}`
}

/** Fields with the same signature are told apart by position — only trusted when both copies have the same number of them. */
function counterpart(el: Element, from: Element, to: Element): Field | null {
  const sig = sigOf(el)
  const a = [...from.querySelectorAll(FIELD)].filter((f) => sigOf(f) === sig)
  const b = [...to.querySelectorAll(FIELD)].filter((f) => sigOf(f) === sig)
  if (a.length !== b.length) return null
  return (b[a.indexOf(el)] as Field) ?? null
}

const isToggle = (el: Element) => el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')

/** Set a value the way typing would, so the page's React state takes it. */
function writeValue(target: Field, source: Field) {
  if (isToggle(target)) {
    if ((target as HTMLInputElement).checked !== (source as HTMLInputElement).checked) (target as HTMLInputElement).click()
    return
  }
  if (target.value === source.value) return
  const proto = Object.getPrototypeOf(target)
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(target, source.value)
  target.dispatchEvent(new Event('input', { bubbles: true }))
  target.dispatchEvent(new Event('change', { bubbles: true }))
}

// ── fetch hook (installed once per tab) ──────────────────────────────────────
let ignoreReads = new Set<string>()
type Hooks = { onRead: (resource: string) => void; onWrite: (resource: string, method: string) => void }
let hooks: Hooks | null = null
let originalFetch: typeof fetch | null = null
let inflight = 0
let lastFetchAt = 0

function installFetchHook() {
  if (originalFetch || typeof window === 'undefined') return
  originalFetch = window.fetch.bind(window)
  const base = originalFetch
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let resource: string | null = null
    let method = 'GET'
    try {
      const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const url = new URL(raw, window.location.origin)
      method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase()
      if (url.origin === window.location.origin) resource = resourceOf(url.pathname)
    } catch { /* never let the hook break the page's own fetch */ }

    if (resource) { inflight++; lastFetchAt = Date.now() }
    try {
      const res = await base(input, init)
      try {
        if (resource && hooks && window.location.pathname.startsWith('/admin')) {
          if (method === 'GET') { if (!ignoreReads.has(resource)) hooks.onRead(resource) }
          else if (res.ok) hooks.onWrite(resource, method)
        }
      } catch { /* as above */ }
      return res
    } finally {
      if (resource) { inflight--; lastFetchAt = Date.now() }
    }
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
  // Two copies of the page: `cur` is shown, `next` (when set) loads hidden.
  const [cur, setCur] = useState(0)
  const [next, setNext] = useState<number | null>(null)
  const [connected, setConnected] = useState(false)
  const [presence, setPresence] = useState<Presence[]>([])
  const [activity, setActivity] = useState<Change[]>([])
  const [open, setOpen] = useState(false)
  const [, tick] = useState(0)

  const clientId = useRef('')
  if (!clientId.current) {
    clientId.current = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36)
  }
  const curRef = useRef<HTMLDivElement | null>(null)
  const nextRef = useRef<HTMLDivElement | null>(null)
  const keySeq = useRef(0)
  const nextKey = useRef<number | null>(null)
  const preloadAt = useRef(0)
  const pathRef = useRef(pathname)
  const loaded = useRef(new Set<string>())
  // Fields the user has changed since their last save — carried across a swap.
  const touched = useRef(new Set<Element>())
  const restoring = useRef(false)
  const lastTyped = useRef(0)
  const lastInput = useRef(0)
  const editingSent = useRef(false)
  // What to put back once the new copy is on screen.
  const afterSwap = useRef<{ scrollTop: number; focus: Field | null; sel: [number | null, number | null] } | null>(null)

  const sendPresence = useCallback(() => {
    editingSent.current = Date.now() - lastTyped.current < EDITING_WINDOW_MS
    post({ type: 'presence', clientId: clientId.current, page: pathRef.current, editing: editingSent.current })
  }, [])

  const startPreload = useCallback(() => {
    keySeq.current += 1
    nextKey.current = keySeq.current
    preloadAt.current = Date.now()
    setNext(keySeq.current)
  }, [])

  const cancelPreload = useCallback(() => {
    nextKey.current = null
    setNext(null)
  }, [])

  /** Swap the hidden copy in, if that can be done without the user losing anything. */
  const trySwap = useCallback(() => {
    const from = curRef.current
    const to = nextRef.current
    if (nextKey.current === null || !from || !to) return
    const now = Date.now()
    const waited = now - preloadAt.current
    if (waited < PRELOAD_MIN_MS) return
    if (waited < PRELOAD_MAX_MS && (inflight > 0 || now - lastFetchAt < QUIET_MS)) return
    if (now - lastTyped.current < TYPING_PAUSE_MS) return
    // Modals are often portalled to <body>, so look everywhere but the hidden copy.
    if ([...document.querySelectorAll(MODAL)].some((m) => !to.contains(m) && !m.closest('[data-live-ui]'))) return

    // Every unsaved text edit must have a home in the new copy, or we wait.
    const moves: [Field, Field][] = []
    for (const el of touched.current) {
      if (!el.isConnected || !from.contains(el)) continue
      const target = counterpart(el, from, to)
      if (target) moves.push([target, el as Field])
      else if (!isToggle(el)) return
    }

    const active = document.activeElement
    const focus = active && from.contains(active) && active.matches(FIELD) ? counterpart(active, from, to) : null
    const sel: [number | null, number | null] = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement
      ? (() => { try { return [active.selectionStart, active.selectionEnd] } catch { return [null, null] } })()
      : [null, null]

    restoring.current = true
    try { for (const [target, source] of moves) writeValue(target, source) } finally { restoring.current = false }
    touched.current = new Set(moves.map(([t]) => t))

    afterSwap.current = { scrollTop: from.closest('main')?.scrollTop ?? 0, focus, sel }
    const k = nextKey.current
    nextKey.current = null
    setNext(null)
    setCur(k)
  }, [])

  // New copy on screen: put scroll and cursor back before the browser paints.
  useLayoutEffect(() => {
    const a = afterSwap.current
    if (!a) return
    afterSwap.current = null
    const main = curRef.current?.closest('main')
    if (main) main.scrollTop = a.scrollTop
    if (a.focus?.isConnected) {
      a.focus.focus({ preventScroll: true })
      const [s, e] = a.sel
      if (s !== null && e !== null && 'setSelectionRange' in a.focus) {
        try { (a.focus as HTMLInputElement).setSelectionRange(s, e) } catch { /* not a text type */ }
      }
    }
  }, [cur])

  // New page: fresh slate, tell the others where we are.
  useEffect(() => {
    pathRef.current = pathname
    loaded.current.clear()
    touched.current.clear()
    cancelPreload()
    sendPresence()
  }, [pathname, sendPresence, cancelPreload])

  // Fetch hook + interaction tracking + swap loop.
  useEffect(() => {
    installFetchHook()
    hooks = {
      onRead: (r) => loaded.current.add(r),
      onWrite: (resource, method) => {
        // Writes the hidden copy makes as it mounts aren't the user saving anything.
        if (nextKey.current !== null && lastInput.current < preloadAt.current) return
        if (Date.now() - lastInput.current > SAVE_AFTER_INPUT_MS) return
        touched.current.clear()
        post({ type: 'change', clientId: clientId.current, page: pathRef.current, resource, method })
      },
    }
    const inLiveUi = (t: EventTarget | null) => t instanceof Element && !!t.closest('[data-live-ui]')
    const onType = (e: Event) => {
      if (restoring.current || inLiveUi(e.target)) return
      if (e.target instanceof Element && e.target.matches(FIELD)) touched.current.add(e.target)
      lastTyped.current = lastInput.current = Date.now()
      if (!editingSent.current) sendPresence()
    }
    const onClick = (e: Event) => {
      if (restoring.current || inLiveUi(e.target)) return
      lastInput.current = Date.now()
    }
    document.addEventListener('input', onType, true)
    document.addEventListener('change', onType, true)
    document.addEventListener('click', onClick, true)

    const swapLoop = setInterval(trySwap, 200)
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
      clearInterval(swapLoop)
      clearInterval(beat)
      clearInterval(idle)
      window.removeEventListener('pagehide', leave)
      leave()
    }
  }, [sendPresence, trySwap])

  // Event stream.
  useEffect(() => {
    let es: EventSource | null = null
    let retry: ReturnType<typeof setTimeout> | null = null
    let closed = false

    const onChange = (c: Change) => {
      setActivity((a) => [c, ...a.filter((x) => x.at !== c.at || x.clientId !== c.clientId)].slice(0, 25))
      if (c.clientId === clientId.current) return
      if (c.page === pathRef.current || loaded.current.has(c.resource)) startPreload()
    }

    const connect = () => {
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
          retry = setTimeout(connect, 10_000)
        }
      })
    }
    connect()

    return () => {
      closed = true
      es?.close()
      if (retry) clearTimeout(retry)
    }
  }, [startPreload, sendPresence])

  const others = presence.filter((p) => p.clientId !== clientId.current)
  const here = others.filter((p) => p.page === pathname)
  const elsewhere = others.filter((p) => p.page !== pathname)
  const onlineUsers = new Set(others.map((p) => p.user)).size

  return (
    <>
      {/* display: contents — the wrappers add no box, so page layout is unchanged. */}
      <div key={`page-${cur}`} ref={curRef} style={{ display: 'contents' }}>{children}</div>
      {next !== null && (
        <div key={`page-${next}`} ref={nextRef} style={{ display: 'none' }} aria-hidden>{children}</div>
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
          title={!connected ? 'Live updates reconnecting…' : next !== null ? 'Bringing in a new save…' : 'Live: other users\' saves appear by themselves'}
        >
          <span className={`h-2 w-2 rounded-full ${!connected ? 'bg-gray-400' : next !== null ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`} />
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
