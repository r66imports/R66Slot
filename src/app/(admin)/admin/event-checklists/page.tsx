'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { invoiceTotal, paymentBucketOf, paymentSplit, type PaymentSplit, type SplitInvoice } from '@/lib/invoice-payment-split'
import { useAdminAuth } from '@/lib/admin-auth-context'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventChecklistItem {
  id: string
  sku: string
  title: string
  /** Event Stock — units taken to the event. */
  qtyOut: number
  qtyIn: number | null
  /** Staff confirmed the unsold stock is back in the shop. */
  returned?: boolean
  returnedAt?: string
  returnedBy?: string
}

interface EventChecklist {
  id: string
  name: string
  location: string
  date: string
  dateTo: string
  notes: string
  items: EventChecklistItem[]
  excludedInvoiceIds: string[]
  archived: boolean
  createdAt: string
  updatedAt: string
}

interface Product {
  id: string
  sku: string
  title: string
  price: number
  quantity: number
}

interface Invoice extends SplitInvoice {
  docNumber: string
  date: string
  createdAt: string
  clientName: string
}

type Split = PaymentSplit

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(n: number) {
  return `R ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`
}
function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtRange(from: string, to: string) {
  return to && to !== from ? `${fmtDate(from)} — ${fmtDate(to)}` : fmtDate(from)
}
function uid() {
  return `eci_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}
function todayLocal() {
  return new Date().toLocaleDateString('en-CA')
}
// Same split as the Orders page: em-dash first, then the first space-hyphen-space.
// Never splits on a hyphen inside a SKU such as "SC-5068".
function splitSkuTitle(description: string): { sku: string; title: string } {
  if (!description) return { sku: '', title: '' }
  const emIdx = description.indexOf('–')
  if (emIdx > -1) return { sku: description.slice(0, emIdx).trim(), title: description.slice(emIdx + 1).trim() }
  const m = description.match(/^(.+?)\s+-\s+(.+)$/)
  if (m) return { sku: m[1].trim(), title: m[2].trim() }
  return { sku: '', title: description }
}

interface InvoiceRow { doc: Invoice; total: number; split: Split; included: boolean; methods: string; methodList: string[] }

/** One invoice's share of a SKU — the trail behind the Sold figure. */
/** Payment-mix colours, validated as a set (dataviz validate_palette, light surface). */
const PAY_COLORS = {
  card: { label: 'Card', hex: '#4f46e5', chip: 'bg-indigo-600' },
  cash: { label: 'Cash', hex: '#059669', chip: 'bg-emerald-600' },
  eft: { label: 'EFT', hex: '#c026d3', chip: 'bg-fuchsia-600' },
  other: { label: 'Other / Credit', hex: '#0891b2', chip: 'bg-cyan-600' },
} as const

interface Allocation { docId: string; docNumber: string; clientName: string; qty: number; methods: string[]; unpaid: number }

function methodChipCls(m: string) {
  const b = paymentBucketOf(m)
  return `${PAY_COLORS[b].chip} text-white`
}

interface Report {
  invoices: InvoiceRow[]
  totals: Split & { sales: number; count: number }
  invoicedBySku: Map<string, Allocation[]>
  /** Line value per SKU after line and document discounts — what each SKU brought in. */
  revenueBySku: Map<string, number>
  unlisted: Array<{ sku: string; title: string; qty: number }>
}

const allocatedQty = (a: Allocation[] | undefined) => (a || []).reduce((s, x) => s + x.qty, 0)

const EXCLUDED_STATUSES = new Set(['rejected', 'cancelled'])

function buildReport(cl: EventChecklist, allInvoices: Invoice[]): Report {
  const excluded = new Set(cl.excludedInvoiceIds || [])
  const to = cl.dateTo || cl.date
  const invoices: InvoiceRow[] = allInvoices
    .filter((doc) => {
      if (EXCLUDED_STATUSES.has(doc.status)) return false
      const d = (doc.date || doc.createdAt || '').slice(0, 10)
      return d >= cl.date && d <= to
    })
    .map((doc) => {
      const total = invoiceTotal(doc)
      // Methods money was actually taken by — payments[] first (Rule 44), legacy fields after.
      const fromHistory = (doc.payments || [])
        .filter((p) => (Number(p.amountPaid) || 0) > 0.005)
        .map((p) => String(p.paymentMethod || '').trim()).filter(Boolean)
      const methodList = Array.from(new Set(fromHistory.length || (doc.payments || []).length ? fromHistory
        : [doc.paymentMethod, doc.paymentMethod2].map((m) => String(m || '').trim()).filter(Boolean)))
      return { doc, total, split: paymentSplit(doc, total), included: !excluded.has(doc.id), methods: methodList.join(' + '), methodList }
    })
    .sort((a, b) => (a.doc.date || '').localeCompare(b.doc.date || '') || (a.doc.docNumber || '').localeCompare(b.doc.docNumber || ''))

  const totals = { sales: 0, count: 0, card: 0, cash: 0, eft: 0, other: 0, unpaid: 0 }
  const invoicedBySku = new Map<string, Allocation[]>()
  const revenueBySku = new Map<string, number>()
  const invoicedTitles = new Map<string, { sku: string; title: string }>()
  for (const row of invoices) {
    if (!row.included) continue
    totals.sales += row.total
    totals.count += 1
    for (const k of ['card', 'cash', 'eft', 'other', 'unpaid'] as const) totals[k] += row.split[k]
    for (const li of row.doc.lineItems || []) {
      const { sku, title } = splitSkuTitle(li.description || '')
      if (!sku) continue
      const key = sku.toLowerCase()
      const qty = Number(li.qty) || 0
      const list = invoicedBySku.get(key) || []
      // The same SKU on two lines of one invoice is still one entry in the trail.
      const same = list.find((a) => a.docId === row.doc.id)
      if (same) same.qty += qty
      else list.push({ docId: row.doc.id, docNumber: row.doc.docNumber || '—', clientName: row.doc.clientName || '', qty, methods: row.methodList, unpaid: row.split.unpaid })
      invoicedBySku.set(key, list)
      const lineValue = qty * (Number(li.unitPrice) || 0) * (1 - (Number(li.discountPct) || 0) / 100)
        * (1 - (Number(row.doc.discountPct) || 0) / 100)
      revenueBySku.set(key, (revenueBySku.get(key) || 0) + lineValue)
      if (!invoicedTitles.has(key)) invoicedTitles.set(key, { sku, title })
    }
  }

  const onList = new Set(cl.items.map((it) => it.sku.trim().toLowerCase()).filter(Boolean))
  const unlisted = Array.from(invoicedBySku.entries())
    .map(([key, allocs]) => ({ key, qty: allocatedQty(allocs) }))
    .filter(({ key, qty }) => !onList.has(key) && qty !== 0)
    .map(({ key, qty }) => ({ ...invoicedTitles.get(key)!, qty }))
    .sort((a, b) => a.sku.localeCompare(b.sku))

  return { invoices, totals, invoicedBySku, revenueBySku, unlisted }
}

// ─── Statistics ───────────────────────────────────────────────────────────────

interface SkuStat { sku: string; title: string; taken: number; sold: number; counted: boolean; revenue: number }

/**
 * Sold is the invoiced quantity — the same figure as the checklist's Sold column. SKUs
 * invoiced but not on the checklist are included too.
 */
function buildStats(cl: EventChecklist, report: Report) {
  const rows: SkuStat[] = []
  for (const it of cl.items) {
    const key = it.sku.trim().toLowerCase()
    if (!key) continue
    const counted = it.qtyIn !== null
    rows.push({
      sku: it.sku.trim(),
      title: it.title,
      taken: it.qtyOut || 0,
      sold: soldFor(it, report),
      counted,
      revenue: report.revenueBySku.get(key) || 0,
    })
  }
  for (const u of report.unlisted) {
    rows.push({ sku: u.sku, title: u.title, taken: 0, sold: u.qty, counted: false, revenue: report.revenueBySku.get(u.sku.toLowerCase()) || 0 })
  }
  const sellers = rows.filter((r) => r.sold > 0).sort((a, b) => b.sold - a.sold || b.revenue - a.revenue)
  const taken = rows.reduce((s, r) => s + r.taken, 0)
  const soldFromTaken = rows.filter((r) => r.taken > 0).reduce((s, r) => s + Math.min(r.sold, r.taken), 0)
  return {
    sellers,
    top: sellers[0] || null,
    notSold: rows.filter((r) => r.counted && r.taken > 0 && r.sold === 0),
    skusTaken: rows.filter((r) => r.taken > 0).length,
    taken,
    returned: cl.items.reduce((s, it) => s + (it.qtyIn || 0), 0),
    sold: rows.reduce((s, r) => s + r.sold, 0),
    sellThrough: taken > 0 ? (soldFromTaken / taken) * 100 : null,
    avgSale: report.totals.count > 0 ? report.totals.sales / report.totals.count : 0,
  }
}
type EventStats = ReturnType<typeof buildStats>

function StatsCard({ stats, onOpen, onHide }: { stats: EventStats; onOpen: () => void; onHide: () => void }) {
  return (
    <div role="button" tabIndex={0} onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      className="relative flex-1 min-w-[170px] text-left bg-white rounded-xl border border-indigo-200 shadow-sm p-4 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all">
      <button type="button" onClick={(e) => { e.stopPropagation(); onHide() }} title="Hide statistics"
        className="absolute top-2 right-2 text-gray-300 hover:text-gray-600 text-sm leading-none px-1">✕</button>
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">📊 Statistics</div>
      {stats.top ? (
        <>
          <div className="text-sm font-bold text-gray-900 truncate pr-4" title={stats.top.title}>🏆 {stats.top.sku}</div>
          <div className="text-xs text-gray-500 mt-0.5">{stats.top.sold} sold · click for all</div>
        </>
      ) : (
        <div className="text-sm text-gray-400 mt-1">No sales yet</div>
      )}
    </div>
  )
}

function StatsModal({ cl, report, stats, onClose }: { cl: EventChecklist; report: Report; stats: EventStats; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const t = report.totals
  const mix = (['card', 'cash', 'eft', 'other'] as const)
    .map((k) => ({ key: k, ...PAY_COLORS[k], value: t[k] }))
    .filter((m) => m.value > 0.005)
  const received = mix.reduce((s, m) => s + m.value, 0)
  const maxSold = stats.sellers[0]?.sold || 1
  const pct = (v: number) => `${((v / received) * 100).toFixed(0)}%`

  const tiles: Array<{ label: string; value: string; sub?: string }> = [
    { label: 'Units sold', value: String(stats.sold) },
    { label: 'Sell-through', value: stats.sellThrough === null ? '—' : `${stats.sellThrough.toFixed(0)}%`, sub: 'of Event Stock' },
    { label: 'Total sales', value: fmtPrice(t.sales) },
    { label: 'Avg per invoice', value: t.count ? fmtPrice(stats.avgSale) : '—', sub: `${t.count} invoice${t.count === 1 ? '' : 's'}` },
    { label: 'SKUs taken', value: String(stats.skusTaken) },
    { label: 'Units taken', value: String(stats.taken) },
    { label: 'Units returned', value: String(stats.returned) },
    { label: 'Unpaid', value: t.unpaid > 0.005 ? fmtPrice(t.unpaid) : '—' },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">📊 Statistics · {cl.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{fmtRange(cl.date, cl.dateTo)}{cl.location ? ` · ${cl.location}` : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4">✕</button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* KPI tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tiles.map((k) => (
              <div key={k.label} className="bg-gray-50 rounded-xl p-3">
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{k.label}</div>
                <div className="text-lg font-bold text-gray-900 mt-0.5">{k.value}</div>
                {k.sub && <div className="text-[11px] text-gray-400">{k.sub}</div>}
              </div>
            ))}
          </div>

          {/* Payment mix — one stacked bar, 2px surface gaps, labelled legend */}
          <section>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Payment mix</h3>
            {received > 0.005 ? (
              <>
                <div className="flex h-3 gap-[2px] rounded overflow-hidden bg-white">
                  {mix.map((m) => (
                    <div key={m.key} style={{ width: pct(m.value), background: m.hex }}
                      title={`${m.label}: ${fmtPrice(m.value)} (${pct(m.value)})`} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2">
                  {mix.map((m) => (
                    <div key={m.key} className="flex items-center gap-1.5 text-xs text-gray-700">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: m.hex }} />
                      <span className="font-semibold">{m.label}</span>
                      <span className="text-gray-500">{fmtPrice(m.value)} · {pct(m.value)}</span>
                    </div>
                  ))}
                </div>
                {t.unpaid > 0.005 && <p className="text-xs text-orange-600 mt-1.5">⏳ {fmtPrice(t.unpaid)} still unpaid — not in the mix above</p>}
              </>
            ) : (
              <p className="text-sm text-gray-400">No payments recorded yet</p>
            )}
          </section>

          {/* Top sellers — single series, one hue, ranked by units sold */}
          <section>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Top sellers</h3>
            {stats.sellers.length === 0 ? (
              <p className="text-sm text-gray-400">Nothing sold yet</p>
            ) : (
              <div className="space-y-1">
                {stats.sellers.map((r, i) => (
                  <div key={r.sku} className="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1.2fr)_auto] items-center gap-3 py-1 px-1 rounded hover:bg-gray-50"
                    title={`${r.sku} — ${r.title}: ${r.sold} sold${r.taken ? ` of ${r.taken} taken` : ''} · ${fmtPrice(r.revenue)}`}>
                    <span className="text-xs text-gray-400 text-right">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-gray-800 truncate">{r.sku}</div>
                      <div className="text-[11px] text-gray-500 truncate">{r.title || '—'}</div>
                    </div>
                    <div className="h-3 bg-gray-100 rounded">
                      <div className="h-3 rounded bg-indigo-600" style={{ width: `${Math.max(2, (r.sold / maxSold) * 100)}%` }} />
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{r.sold} sold</div>
                      <div className="text-[11px] text-gray-500">
                        {fmtPrice(r.revenue)}{r.taken > 0 ? ` · ${Math.round((Math.min(r.sold, r.taken) / r.taken) * 100)}% of ${r.taken}` : ' · not on list'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {stats.notSold.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Didn&rsquo;t sell ({stats.notSold.length})</h3>
              <div className="flex flex-wrap gap-1.5">
                {stats.notSold.map((r) => (
                  <span key={r.sku} title={r.title} className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">{r.sku} · {r.taken} taken</span>
                ))}
              </div>
            </section>
          )}

          <p className="text-[11px] text-gray-400">
            Sold = the quantity invoiced. Sales and payment mix come from the invoices counted for this event.
          </p>
        </div>
      </div>
    </div>
  )
}


const STATS_HIDDEN_KEY = 'r66.eventChecklist.statsHidden'

const toInt = (v: string) => Math.max(0, Math.floor(Number(v) || 0))

/** Sold is what was invoiced — the trail. QTY In is the physical count back, never used to derive Sold. */
function soldFor(it: EventChecklistItem, report: Report) {
  const key = it.sku.trim().toLowerCase()
  return key ? allocatedQty(report.invoicedBySku.get(key)) : 0
}

function qtyTotals(items: EventChecklistItem[], report: Report) {
  let out = 0, back = 0, sold = 0, rows = 0, returned = 0
  const invoiceIds = new Set<string>()
  for (const it of items) {
    if (it.sku || it.qtyOut) rows += 1
    if (it.returned) returned += 1
    out += it.qtyOut || 0
    sold += soldFor(it, report)
    for (const a of report.invoicedBySku.get(it.sku.trim().toLowerCase()) || []) invoiceIds.add(a.docId)
    if (it.qtyIn !== null) back += it.qtyIn
  }
  return { out, back, sold, rows, returned, invoices: invoiceIds.size }
}

// ─── SKU input with catalogue autofill ────────────────────────────────────────

const DROPDOWN_MAX_H = 240

function SkuInput({ rowId, value, products, autoFocus, onType, onPick }: {
  rowId: string
  value: string
  products: Product[]
  autoFocus?: boolean
  onType: (v: string) => void
  onPick: (p: Product, viaBlur: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number } | null>(null)
  const ref = useRef<HTMLInputElement>(null)
  const q = value.trim().toLowerCase()

  const matches = useMemo(() => {
    if (!q) return []
    const rank = (p: Product) => {
      const s = p.sku.toLowerCase()
      return s === q ? 0 : s.startsWith(q) ? 1 : s.includes(q) ? 2 : 3
    }
    return products
      .filter((p) => p.sku.toLowerCase().includes(q) || p.title.toLowerCase().includes(q))
      .sort((a, b) => rank(a) - rank(b) || a.sku.localeCompare(b.sku))
      .slice(0, 15)
  }, [q, products])

  const place = useCallback(() => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    // Fixed-positioned so the table's overflow container cannot clip the list.
    const below = window.innerHeight - r.bottom - 8
    const above = r.top - 8
    const up = below < DROPDOWN_MAX_H && above > below
    setPos({
      ...(up ? { bottom: window.innerHeight - r.top + 2 } : { top: r.bottom + 2 }),
      left: r.left,
      width: Math.max(r.width, 360),
      maxHeight: Math.min(DROPDOWN_MAX_H, Math.max(up ? above : below, 120)),
    })
  }, [])

  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, place])

  function pick(p: Product) {
    onPick(p, false)
    setOpen(false)
  }

  return (
    <>
      <input
        ref={ref}
        id={`sku-${rowId}`}
        autoFocus={autoFocus}
        value={value}
        placeholder="Type SKU or name…"
        autoComplete="off"
        onChange={(e) => { onType(e.target.value); setHi(0); place(); setOpen(true) }}
        onFocus={() => { if (value) { place(); setOpen(true) } }}
        onKeyDown={(e) => {
          if (!open || matches.length === 0) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, matches.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)) }
          else if (e.key === 'Enter') { e.preventDefault(); pick(matches[hi]) }
          else if (e.key === 'Escape') setOpen(false)
        }}
        onBlur={() => setTimeout(() => {
          setOpen(false)
          // Typed a full SKU and tabbed away — fill the title without needing the list.
          const exact = products.find((p) => p.sku.toLowerCase() === value.trim().toLowerCase())
          if (exact) onPick(exact, true)
        }, 150)}
        className="w-full min-w-[140px] px-2 py-1.5 font-mono text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      {open && pos && matches.length > 0 && (
        <div
          style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, maxHeight: pos.maxHeight, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-y-auto"
        >
          {matches.map((p, i) => (
            <button
              key={p.id || p.sku}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHi(i)}
              onClick={() => pick(p)}
              className={`w-full text-left px-3 py-2 text-sm border-b border-gray-50 last:border-0 flex items-center gap-2 ${i === hi ? 'bg-indigo-50' : ''}`}
            >
              <span className="font-mono text-xs text-indigo-600 shrink-0">{p.sku}</span>
              <span className="text-gray-800 truncate flex-1">{p.title}</span>
              <span className={`text-[10px] shrink-0 ${p.quantity > 0 ? 'text-gray-400' : 'text-red-400'}`}>{p.quantity} in stock</span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

// ─── Create modal ─────────────────────────────────────────────────────────────

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: EventChecklist) => void }) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState(todayLocal())
  const [dateTo, setDateTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function create() {
    if (!date) return setError('Date is required')
    if (dateTo && dateTo < date) return setError('End date is before the start date')
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/admin/event-checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, location, date, dateTo: dateTo || date }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed')
      onCreated(await res.json())
    } catch (e: any) {
      setError(e.message)
      setSaving(false)
    }
  }

  const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Create Event Checklist</h2>
            <p className="text-xs text-gray-500 mt-0.5">Add the SKUs you take once it is created</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">End date <span className="font-normal text-gray-400">(multi-day)</span></label>
              <input type="date" value={dateTo} min={date} onChange={(e) => setDateTo(e.target.value)} className={input} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Johannesburg Slot Car Club" className={input} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Name <span className="font-normal text-gray-400">(defaults to location)</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. BSCC Round 3" className={input} />
          </div>
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={create} disabled={saving}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Totals cards ─────────────────────────────────────────────────────────────

function MoneyCards({ totals, children }: { totals: Report['totals']; children?: React.ReactNode }) {
  const cards = [
    { label: 'Total Sales', value: totals.sales, icon: '🧾', color: 'text-gray-900', show: true, sub: `${totals.count} invoice${totals.count === 1 ? '' : 's'}` },
    { label: 'Card', value: totals.card, icon: '💳', color: 'text-indigo-700', show: true },
    { label: 'Cash', value: totals.cash, icon: '💵', color: 'text-emerald-700', show: true },
    { label: 'EFT', value: totals.eft, icon: '🏦', color: 'text-fuchsia-700', show: totals.eft > 0.005 },
    { label: 'Other / Credit', value: totals.other, icon: '📋', color: 'text-gray-700', show: totals.other > 0.005 },
    { label: 'Unpaid', value: totals.unpaid, icon: '⏳', color: 'text-orange-600', show: totals.unpaid > 0.005 },
  ].filter((c) => c.show)
  return (
    <div className="flex flex-wrap gap-3">
      {cards.map((c) => (
        <div key={c.label} className="flex-1 min-w-[150px] bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{c.icon} {c.label}</div>
          <div className={`text-lg font-bold ${c.color}`}>{fmtPrice(c.value)}</div>
          {c.sub && <div className="text-xs text-gray-400 mt-0.5">{c.sub}</div>}
        </div>
      ))}
      {children}
    </div>
  )
}

// ─── Checklist detail ─────────────────────────────────────────────────────────

function ChecklistDetail({ initial, products, invoices, refreshing, onRefreshInvoices, onBack, onSaved, onDeleted }: {
  initial: EventChecklist
  products: Product[]
  invoices: Invoice[]
  refreshing: boolean
  onRefreshInvoices: () => void
  onBack: () => void
  onSaved: (c: EventChecklist) => void
  onDeleted: (id: string) => void
}) {
  const { username } = useAdminAuth()
  const [cl, setCl] = useState<EventChecklist>(initial)
  // Mirrors `cl` synchronously so back-to-back edits (e.g. a blur autofill landing right
  // after a keystroke) always build on the latest state, never a stale render.
  const clRef = useRef<EventChecklist>(initial)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [focusId, setFocusId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [showInvoices, setShowInvoices] = useState(false)
  const [showStats, setShowStats] = useState(false)
  // Hiding the Statistics card is a per-browser preference, not part of the checklist.
  const [statsHidden, setStatsHidden] = useState(() => {
    try { return localStorage.getItem(STATS_HIDDEN_KEY) === '1' } catch { return false }
  })
  function setStatsHiddenPref(hidden: boolean) {
    setStatsHidden(hidden)
    try { localStorage.setItem(STATS_HIDDEN_KEY, hidden ? '1' : '0') } catch {}
  }

  // Debounced autosave, serialised so an older PATCH can never land after a newer one.
  const pending = useRef<EventChecklist | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chain = useRef<Promise<void>>(Promise.resolve())

  const flush = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    const next = pending.current
    if (!next) return
    pending.current = null
    setSaveState('saving')
    chain.current = chain.current.then(async () => {
      try {
        const res = await fetch('/api/admin/event-checklists', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        })
        if (!res.ok) throw new Error()
        onSaved(await res.json())
        setSaveState(pending.current ? 'saving' : 'saved')
      } catch {
        setSaveState('error')
      }
    })
  }, [onSaved])

  useEffect(() => () => flush(), [flush])

  function update(patch: Partial<EventChecklist>) {
    const next = { ...clRef.current, ...patch }
    clRef.current = next
    setCl(next)
    pending.current = next
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, 700)
  }

  function setItem(id: string, patch: Partial<EventChecklistItem>) {
    update({ items: clRef.current.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) })
  }

  function addRow() {
    const id = uid()
    update({ items: [...clRef.current.items, { id, sku: '', title: '', qtyOut: 0, qtyIn: null }] })
    setFocusId(id)
  }

  /** `viaBlur` — autofill from a fully typed SKU on leaving the field; never steals focus. */
  function pickProduct(rowId: string, p: Product, viaBlur: boolean) {
    const items = clRef.current.items
    const row = items.find((it) => it.id === rowId)
    if (!row || (row.sku === p.sku && row.title === p.title)) return
    const dupe = items.find((it) => it.id !== rowId && it.sku.trim().toLowerCase() === p.sku.toLowerCase())
    if (dupe) {
      setMsg(`${p.sku} is already on the list — update that row instead`)
      setTimeout(() => setMsg(''), 3500)
      if (!row.qtyOut && row.qtyIn === null) update({ items: items.filter((it) => it.id !== rowId) })
      if (!viaBlur) setTimeout(() => document.getElementById(`out-${dupe.id}`)?.focus(), 50)
      return
    }
    // Same cap as typing into Event Stock — a quantity entered first can't outrun the SKU picked after.
    const cap = Math.max(0, p.quantity) + allocatedQty(report.invoicedBySku.get(p.sku.toLowerCase()))
    const clamp = row.qtyOut > cap ? { qtyOut: cap, qtyIn: row.qtyIn !== null && row.qtyIn > cap ? cap : row.qtyIn } : {}
    setItem(rowId, { sku: p.sku, title: p.title, ...clamp })
    if (!viaBlur) setTimeout(() => document.getElementById(`out-${rowId}`)?.focus(), 50)
  }

  const report = useMemo(() => buildReport(cl, invoices), [cl, invoices])
  const stats = useMemo(() => buildStats(cl, report), [cl, report])
  const q = qtyTotals(cl.items, report)
  const allocsFor = (it: EventChecklistItem) => (it.sku ? report.invoicedBySku.get(it.sku.trim().toLowerCase()) || [] : [])

  const productBySku = useMemo(() => new Map(products.map((p) => [p.sku.toLowerCase(), p])), [products])
  /**
   * Most that can go to the event: what inventory holds now, plus what this event has already
   * invoiced (those units left inventory on invoice, but were part of the stock taken).
   * A SKU that is not in inventory can't be booked at all. null = catalogue not loaded — no cap.
   */
  function capFor(it: EventChecklistItem): number | null {
    if (products.length === 0 || !it.sku.trim()) return null
    const p = productBySku.get(it.sku.trim().toLowerCase())
    return Math.max(0, p ? p.quantity : 0) + allocatedQty(allocsFor(it))
  }

  function setEventStock(it: EventChecklistItem, raw: string) {
    let qty = toInt(raw)
    const cap = capFor(it)
    if (cap !== null && qty > cap) qty = cap
    // Stock back in can never be more than the stock that went out.
    const qtyIn = it.qtyIn !== null && it.qtyIn > qty ? qty : it.qtyIn
    setItem(it.id, { qtyOut: qty, qtyIn })
  }

  function setReturned(it: EventChecklistItem, returned: boolean) {
    setItem(it.id, returned
      ? { returned: true, returnedAt: new Date().toISOString(), returnedBy: username || 'Admin' }
      : { returned: false, returnedAt: undefined, returnedBy: undefined })
  }

  function toggleInvoice(id: string) {
    const ex = new Set(clRef.current.excludedInvoiceIds || [])
    if (ex.has(id)) ex.delete(id); else ex.add(id)
    update({ excludedInvoiceIds: Array.from(ex) })
  }

  const numInput = 'w-16 px-2 py-1.5 text-sm text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400'

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <button onClick={() => { flush(); onBack() }} className="text-sm text-indigo-600 hover:text-indigo-800 mb-2">← Back to Event Checklists</button>
          <input value={cl.name} onChange={(e) => update({ name: e.target.value })}
            className="block w-full text-2xl font-bold text-gray-900 bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-indigo-400 focus:outline-none" />
          <div className="flex items-center gap-2 mt-2 flex-wrap text-sm">
            <span className="text-gray-400">📅</span>
            <input type="date" value={cl.date}
              onChange={(e) => { const d = e.target.value; if (d) update({ date: d, dateTo: cl.dateTo < d ? d : cl.dateTo }) }}
              className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
            <span className="text-gray-400 text-xs">to</span>
            <input type="date" value={cl.dateTo} min={cl.date}
              onChange={(e) => update({ dateTo: e.target.value && e.target.value >= cl.date ? e.target.value : cl.date })}
              className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
            <span className="text-gray-400 ml-2">📍</span>
            <input value={cl.location} onChange={(e) => update({ location: e.target.value })} placeholder="Location"
              className="px-2 py-1 border border-gray-200 rounded-lg text-xs w-56 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${saveState === 'error' ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✓ Saved' : saveState === 'error' ? '⚠ Not saved — check connection' : ''}
          </span>
          <button onClick={onRefreshInvoices} disabled={refreshing}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 disabled:opacity-50"
            title="Re-load invoices to pick up sales captured since this page opened">
            {refreshing ? '⟳ Loading…' : '↺ Refresh Invoices'}
          </button>
          <button onClick={() => update({ archived: !cl.archived })}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
            {cl.archived ? 'Restore' : 'Archive'}
          </button>
        </div>
      </div>

      {/* Money totals — from invoices */}
      <MoneyCards totals={report.totals}>
        {!statsHidden && <StatsCard stats={stats} onOpen={() => setShowStats(true)} onHide={() => setStatsHiddenPref(true)} />}
      </MoneyCards>
      {showStats && <StatsModal cl={cl} report={report} stats={stats} onClose={() => setShowStats(false)} />}
      <p className="text-xs text-gray-400 mt-2 mb-6">
        {statsHidden && (
          <button onClick={() => setStatsHiddenPref(false)} className="text-indigo-600 hover:underline mr-2">📊 Show statistics</button>
        )}
        Sales are the invoices dated {fmtRange(cl.date, cl.dateTo)}, split by the payment method recorded on each invoice.{' '}
        <button onClick={() => setShowInvoices(true)} className="text-indigo-600 hover:underline">
          {report.invoices.length} invoice{report.invoices.length === 1 ? '' : 's'} in range{report.invoices.length !== report.totals.count ? ` · ${report.invoices.length - report.totals.count} excluded` : ''}
        </button>
      </p>

      {/* Stock checklist */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Stock Checklist</h2>
            <p className="text-xs text-gray-400">Counting here never changes stock — stock drops when the sale is invoiced. Tick Returned once the stock is back in the shop.</p>
          </div>
          {q.rows > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${q.returned === q.rows ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {q.returned === q.rows ? '✓ All returned to inventory' : `${q.returned}/${q.rows} returned to inventory`}
            </span>
          )}
        </div>
        {msg && <div className="px-4 py-2 bg-amber-50 text-amber-800 text-xs border-b border-amber-100">{msg}</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase w-8">#</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">SKU</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Event Stock</th>
                <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">QTY In</th>
                <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Sold</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Returned</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {cl.items.map((it, i) => {
                const allocs = allocsFor(it)
                const sold = allocatedQty(allocs)
                const expectedBack = Math.max(0, (it.qtyOut || 0) - sold)
                const cap = capFor(it)
                const overCap = cap !== null && (it.qtyOut || 0) > cap
                return (
                  <tr key={it.id} className={`border-b border-gray-100 ${it.returned ? 'bg-green-50/60' : ''}`}>
                    <td className="py-2 px-3 text-xs text-gray-400">{i + 1}</td>
                    <td className="py-2 px-3">
                      <SkuInput rowId={it.id} value={it.sku} products={products} autoFocus={focusId === it.id}
                        onType={(v) => setItem(it.id, { sku: v })}
                        onPick={(p, viaBlur) => pickProduct(it.id, p, viaBlur)} />
                    </td>
                    <td className="py-2 px-3 min-w-[200px]">
                      <input value={it.title} onChange={(e) => setItem(it.id, { title: e.target.value })} placeholder="Fills from SKU"
                        className="w-full px-2 py-1.5 text-sm text-gray-700 border border-transparent hover:border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input id={`out-${it.id}`} type="number" min={0} max={cap ?? undefined} inputMode="numeric" value={it.qtyOut || ''}
                        disabled={it.returned} title={it.returned ? 'Untick Returned to change' : undefined}
                        onChange={(e) => setEventStock(it, e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRow() } }}
                        className={`${numInput} ${overCap ? 'border-red-400 text-red-600' : ''} disabled:bg-transparent disabled:border-transparent`} />
                      {cap !== null && !it.returned && (
                        <div className={`text-[10px] mt-0.5 whitespace-nowrap ${overCap ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                          {cap === 0 && !productBySku.has(it.sku.trim().toLowerCase()) ? 'Not in inventory' : overCap ? `Only ${cap} in inventory` : `of ${cap} in inventory`}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input type="number" min={0} max={it.qtyOut || 0} inputMode="numeric" value={it.qtyIn ?? ''} placeholder="—"
                        disabled={it.returned} title={it.returned ? 'Untick Returned to change' : undefined}
                        onChange={(e) => setItem(it.id, { qtyIn: e.target.value === '' ? null : Math.min(toInt(e.target.value), it.qtyOut || 0) })}
                        className={`${numInput} disabled:bg-transparent disabled:border-transparent`} />
                      {it.sku && !it.returned && (it.qtyOut || 0) > 0 && (
                        <div className={`text-[10px] mt-0.5 whitespace-nowrap ${it.qtyIn !== null && it.qtyIn !== expectedBack ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>
                          {it.qtyIn !== null && it.qtyIn !== expectedBack ? `expected ${expectedBack}` : `expect ${expectedBack} back`}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-gray-900">{it.sku ? sold : ''}</td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-1">
                        {allocs.map((a) => (
                          <span key={a.docId} title={[a.clientName, a.unpaid > 0.005 ? `${fmtPrice(a.unpaid)} unpaid` : ''].filter(Boolean).join(' · ') || undefined}
                            className="inline-flex items-center gap-1 font-mono text-[11px] pl-1.5 pr-0.5 py-0.5 rounded bg-indigo-50 text-indigo-700 whitespace-nowrap">
                            {a.docNumber}<span className="text-indigo-400">×</span><span className="font-semibold">{a.qty}</span>
                            {a.methods.map((m) => (
                              <span key={m} className={`font-sans text-[10px] font-semibold px-1.5 rounded ${methodChipCls(m)}`}>{m}</span>
                            ))}
                            {a.methods.length === 0 && (
                              <span className="font-sans text-[10px] font-semibold px-1.5 rounded bg-orange-100 text-orange-700">Unpaid</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input type="checkbox" checked={!!it.returned} disabled={it.qtyIn === null}
                        onChange={(e) => setReturned(it, e.target.checked)}
                        title={it.qtyIn === null ? 'Enter QTY In first' : 'Stock returned to the shop — confirmation only, stock levels are not changed'}
                        className="w-5 h-5 accent-green-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30" />
                      {it.returned && it.returnedAt && (
                        <div className="text-[10px] text-green-700 whitespace-nowrap mt-0.5">
                          {it.returnedBy ? `${it.returnedBy} · ` : ''}{fmtDate(it.returnedAt)}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button onClick={() => update({ items: clRef.current.items.filter((x) => x.id !== it.id) })}
                        className="text-gray-300 hover:text-red-500 text-lg leading-none px-1" title="Remove row">✕</button>
                    </td>
                  </tr>
                )
              })}
              {cl.items.length === 0 && (
                <tr><td colSpan={9} className="py-10 text-center text-gray-400 text-sm">No SKUs yet — add what you are taking to the event</td></tr>
              )}
            </tbody>
            {cl.items.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={3} className="py-2.5 px-3 text-xs font-bold text-gray-500 uppercase">Total · {cl.items.length} SKU{cl.items.length === 1 ? '' : 's'}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-gray-900">{q.out}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-gray-900">{q.back}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-indigo-700">{q.sold}</td>
                  <td className="py-2.5 px-3 text-xs font-semibold text-gray-600">{q.invoices > 0 ? `${q.invoices} invoice${q.invoices === 1 ? '' : 's'}` : ''}</td>
                  <td className="py-2.5 px-3 text-center text-xs font-bold text-gray-600">{q.returned}/{q.rows}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="p-3 border-t border-gray-100">
          <button onClick={addRow}
            className="w-full border-2 border-dashed border-gray-200 rounded-lg py-2.5 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
            + Add SKU
          </button>
        </div>
      </div>

      {/* Invoiced SKUs that are not on the checklist */}
      {report.unlisted.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">Invoiced but not on the checklist</p>
          <p className="text-xs text-amber-700 mb-3">Either the SKU went to the event without being listed, or the invoice is not an event sale — exclude it below.</p>
          <div className="space-y-1">
            {report.unlisted.map((u) => (
              <div key={u.sku} className="flex items-center justify-between text-sm">
                <span className="truncate"><span className="font-mono text-xs text-indigo-700 mr-2">{u.sku}</span><span className="text-gray-700">{u.title}</span></span>
                <span className="font-semibold text-gray-800 shrink-0 ml-3">{u.qty} invoiced</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoices in range */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <button onClick={() => setShowInvoices((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 text-left">
          <span className="text-sm font-semibold text-gray-800">Invoices counted ({report.totals.count} of {report.invoices.length})</span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${showInvoices ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showInvoices && (
          report.invoices.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-gray-400">No invoices dated {fmtRange(cl.date, cl.dateTo)}.</p>
          ) : (
            <div className="overflow-x-auto border-t border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="py-2 px-3 w-10" />
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Invoice</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Client</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Payment</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.invoices.map((row) => (
                    <tr key={row.doc.id} className={`border-b border-gray-100 ${row.included ? '' : 'opacity-40'}`}>
                      <td className="py-2 px-3">
                        <input type="checkbox" checked={row.included} onChange={() => toggleInvoice(row.doc.id)}
                          className="w-4 h-4 accent-indigo-600 cursor-pointer" title={row.included ? 'Counted — untick if not an event sale' : 'Excluded'} />
                      </td>
                      <td className="py-2 px-3 font-mono text-xs text-gray-800">{row.doc.docNumber || '—'}{row.doc.status === 'archived' && <span className="ml-1 text-[10px] text-gray-400">archived</span>}</td>
                      <td className="py-2 px-3 text-xs text-gray-600">{fmtDate(row.doc.date)}</td>
                      <td className="py-2 px-3 text-xs text-gray-800">{row.doc.clientName || '—'}</td>
                      <td className="py-2 px-3 text-xs">
                        {row.methods || <span className="text-gray-400">—</span>}
                        {row.split.unpaid > 0.005 && <span className="ml-1.5 text-orange-600">· {fmtPrice(row.split.unpaid)} unpaid</span>}
                      </td>
                      <td className="py-2 px-3 text-right text-xs font-semibold text-gray-900">{fmtPrice(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</label>
        <textarea value={cl.notes} onChange={(e) => update({ notes: e.target.value })} rows={2} placeholder="Any event notes…"
          className="w-full text-sm text-gray-700 border-0 focus:outline-none resize-none" />
      </div>

      {/* Danger zone */}
      <div className="pt-4 border-t border-gray-200">
        {deleteConfirm ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-600 font-medium">Delete this checklist permanently?</span>
            <button onClick={async () => {
              if (timer.current) clearTimeout(timer.current)
              pending.current = null
              const res = await fetch(`/api/admin/event-checklists?id=${cl.id}`, { method: 'DELETE' })
              if (res.ok) onDeleted(cl.id)
            }} className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            <button onClick={() => setDeleteConfirm(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setDeleteConfirm(true)} className="text-xs text-red-400 hover:text-red-600">Delete checklist</button>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventChecklistsPage() {
  const [checklists, setChecklists] = useState<EventChecklist[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const loadInvoices = useCallback(async () => {
    const res = await fetch('/api/admin/orders/documents?type=invoice')
    if (res.ok) setInvoices(await res.json())
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/event-checklists').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/admin/products?inventory=1').then((r) => (r.ok ? r.json() : [])),
      loadInvoices(),
    ]).then(([cls, prods]) => {
      setChecklists(cls)
      setProducts((prods as any[])
        .filter((p) => p.sku)
        .map((p) => ({ id: String(p.id), sku: String(p.sku).trim(), title: p.title || '', price: Number(p.price) || 0, quantity: Number(p.quantity) || 0 })))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [loadInvoices])

  // Payments are usually recorded in another tab (Orders → Record Payment) — pick them up
  // as soon as this tab is looked at again instead of waiting for a manual refresh.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') loadInvoices().catch(() => {}) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadInvoices])

  async function refreshInvoices() {
    setRefreshing(true)
    try { await loadInvoices() } finally { setRefreshing(false) }
  }

  const handleSaved = useCallback((saved: EventChecklist) => {
    setChecklists((prev) => prev.map((c) => (c.id === saved.id ? saved : c)))
  }, [])

  const open = checklists.find((c) => c.id === openId)
  if (open) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <ChecklistDetail
          key={open.id}
          initial={open}
          products={products}
          invoices={invoices}
          refreshing={refreshing}
          onRefreshInvoices={refreshInvoices}
          onBack={() => setOpenId(null)}
          onSaved={handleSaved}
          onDeleted={(id) => { setChecklists((prev) => prev.filter((c) => c.id !== id)); setOpenId(null) }}
        />
      </div>
    )
  }

  const visible = checklists.filter((c) => (showArchived ? c.archived : !c.archived))
  const archivedCount = checklists.filter((c) => c.archived).length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Checklists</h1>
          <p className="text-sm text-gray-500 mt-0.5">Stock out, stock back in, and what sold — checked against the invoices</p>
        </div>
        <div className="flex items-center gap-3">
          {archivedCount > 0 && (
            <button onClick={() => setShowArchived((s) => !s)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${showArchived ? 'bg-gray-100 border-gray-300 text-gray-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              {showArchived ? '← Active' : `Archived (${archivedCount})`}
            </button>
          )}
          <button onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-sm">
            + Create Event Checklist
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-4xl mb-3">🏁</div>
          <p className="text-gray-500 font-medium">{showArchived ? 'No archived checklists' : 'No event checklists yet — create your first one'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((cl) => {
            const r = buildReport(cl, invoices)
            const q = qtyTotals(cl.items, r)
            return (
              <button key={cl.id} onClick={() => setOpenId(cl.id)}
                className="text-left bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all p-5 group">
                <h3 className="font-bold text-gray-900 group-hover:text-indigo-700 truncate">{cl.name}</h3>
                {cl.location && <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {cl.location}</p>}
                <p className="text-xs text-gray-400 mt-0.5">📅 {fmtRange(cl.date, cl.dateTo)}</p>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[
                    { label: 'Event Stock', value: q.out },
                    { label: 'In', value: q.back },
                    { label: 'Sold', value: q.sold },
                  ].map((s) => (
                    <div key={s.label} className="bg-gray-50 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-gray-400 uppercase">{s.label}</div>
                      <div className="text-sm font-bold text-gray-900">{s.value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Total sales</span><span className="font-bold text-gray-900">{fmtPrice(r.totals.sales)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">💳 Card</span><span className="font-semibold text-gray-700">{fmtPrice(r.totals.card)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">💵 Cash</span><span className="font-semibold text-gray-700">{fmtPrice(r.totals.cash)}</span></div>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  {cl.items.length} SKU{cl.items.length === 1 ? '' : 's'}
                  {q.rows > 0 && (q.returned === q.rows
                    ? <span className="text-green-600 font-semibold"> · ✓ All returned</span>
                    : ` · ${q.returned}/${q.rows} returned`)}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={(c) => { setChecklists((prev) => [c, ...prev]); setShowCreate(false); setOpenId(c.id) }}
        />
      )}
    </div>
  )
}
