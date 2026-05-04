'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventExpense {
  id: string
  description: string
  amount: number
  paidBy?: string
  paymentMethod?: string
}

interface EventSalesItem {
  sku: string
  title: string
  totalQty: number
  totalRevenue: number
  totalCogs: number
  invoiceCount: number
}

interface SlotEvent {
  id: string
  name: string
  location: string
  dateFrom: string
  dateTo: string
  timeFrom?: string
  timeTo?: string
  notes: string
  paymentTotals?: { cash: number; card: number; eft: number; other: number }
  expenses: EventExpense[]
  salesItems: EventSalesItem[]
  totalRevenue: number
  totalCogs: number
  totalExpenses: number
  grossProfit: number
  netProfit: number
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}

interface RawInvoice {
  id: string
  type: string
  status: string
  date: string
  clientName: string
  lineItems: Array<{ description: string; qty: number; unitPrice: number }>
  paymentMethod?: string
  paymentMethod2?: string
  paymentMethod1Amount?: number
  paymentMethod2Amount?: number
  discountPct?: number
  shippingCost?: number
}

interface RawProduct {
  sku: string
  cost_per_item?: number
  costPerItem?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(n: number) {
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}
function uid() {
  return `x_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}
function parseSku(desc: string) {
  const i = desc.indexOf(' – ')
  return i !== -1
    ? { sku: desc.slice(0, i).trim(), title: desc.slice(i + 3).trim() }
    : { sku: '', title: desc.trim() }
}

// ─── SVG Bar Chart ─────────────────────────────────────────────────────────────

function BarChart({ items, valueKey, label, color = '#6366f1' }: {
  items: Array<{ label: string; value: number }>
  valueKey?: string
  label: string
  color?: string
}) {
  const max = Math.max(...items.map((i) => i.value), 1)
  const W = 480, barH = 24, gap = 8, labelW = 160, valW = 70
  const h = items.length * (barH + gap) + 20
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${h}`} className="overflow-visible">
      {items.map((item, idx) => {
        const y = idx * (barH + gap)
        const barW = Math.max(4, ((W - labelW - valW - 16) * item.value) / max)
        return (
          <g key={idx} transform={`translate(0,${y})`}>
            <text x={labelW - 8} y={barH / 2 + 5} textAnchor="end" fontSize={11} fill="#6b7280"
              className="font-sans">
              {item.label.length > 22 ? item.label.slice(0, 22) + '…' : item.label}
            </text>
            <rect x={labelW} y={0} width={barW} height={barH} rx={4} fill={color} opacity={0.85} />
            <text x={labelW + barW + 6} y={barH / 2 + 5} fontSize={11} fill="#374151" fontWeight="600"
              className="font-sans">
              {item.value.toLocaleString('en-ZA')}
            </text>
          </g>
        )
      })}
      <text x={0} y={h - 2} fontSize={10} fill="#9ca3af">{label}</text>
    </svg>
  )
}

function EventCompareChart({ events }: { events: SlotEvent[] }) {
  if (events.length === 0) return null
  const active = events.filter((e) => e.status === 'active').slice(0, 8)
  const maxRev = Math.max(...active.map((e) => e.totalRevenue), 1)
  const W = 520, barH = 18, gap = 6, labelW = 150, spacing = barH * 2 + gap + 4
  const h = active.length * spacing + 24
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${h}`} className="overflow-visible">
      {active.map((evt, idx) => {
        const y = idx * spacing
        const revW = Math.max(4, ((W - labelW - 60) * evt.totalRevenue) / maxRev)
        const profW = Math.max(0, ((W - labelW - 60) * Math.max(0, evt.netProfit)) / maxRev)
        return (
          <g key={evt.id} transform={`translate(0,${y})`}>
            <text x={labelW - 6} y={barH / 2 + 5} textAnchor="end" fontSize={11} fill="#6b7280">
              {evt.name.length > 20 ? evt.name.slice(0, 20) + '…' : evt.name}
            </text>
            <rect x={labelW} y={0} width={revW} height={barH} rx={3} fill="#6366f1" opacity={0.8} />
            <rect x={labelW} y={barH + 4} width={profW} height={barH} rx={3} fill="#10b981" opacity={0.8} />
            <text x={labelW + revW + 5} y={barH / 2 + 5} fontSize={10} fill="#374151">{fmtPrice(evt.totalRevenue)}</text>
            <text x={labelW + profW + 5} y={barH * 1.5 + 9} fontSize={10} fill="#059669">{fmtPrice(evt.netProfit)}</text>
          </g>
        )
      })}
      <g transform={`translate(0,${h - 16})`}>
        <rect x={0} width={10} height={10} rx={2} fill="#6366f1" opacity={0.8} />
        <text x={14} y={9} fontSize={10} fill="#6b7280">Revenue</text>
        <rect x={70} width={10} height={10} rx={2} fill="#10b981" opacity={0.8} />
        <text x={84} y={9} fontSize={10} fill="#6b7280">Net Profit</text>
      </g>
    </svg>
  )
}

// ─── Shared: build sales items from invoices in a date range ──────────────────

function categorizePM(method: string): 'cash' | 'card' | 'eft' | 'other' {
  const m = method.toLowerCase().trim()
  if (m.includes('cash')) return 'cash'
  if (m.includes('card')) return 'card'
  if (m.includes('eft') || m.includes('transfer') || m.includes('bank')) return 'eft'
  return 'other'
}

async function buildSalesItems(from: string, to: string): Promise<{ items: EventSalesItem[]; revenue: number; cogs: number; paymentTotals: { cash: number; card: number; eft: number; other: number } }> {
    const [docsRes, prodsRes] = await Promise.all([
      fetch('/api/admin/orders/documents?type=invoice'),
      fetch('/api/admin/products'),
    ])
    const docs: RawInvoice[] = docsRes.ok ? await docsRes.json() : []
    const prods: RawProduct[] = prodsRes.ok ? await prodsRes.json() : []

    const costMap = new Map<string, number>()
    for (const p of prods) {
      if (p.sku) costMap.set(p.sku.trim().toLowerCase(), Number(p.cost_per_item ?? p.costPerItem) || 0)
    }

    const fromDate = new Date(from)
    const toDate = new Date(to)
    toDate.setHours(23, 59, 59, 999)

    const map = new Map<string, EventSalesItem>()
    const paymentTotals = { cash: 0, card: 0, eft: 0, other: 0 }

    for (const doc of docs) {
      if (doc.status === 'archived' || doc.status === 'rejected') continue
      const d = new Date(doc.date || '')
      if (d < fromDate || d > toDate) continue

      // Track payment method totals
      const subtotal = doc.lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0)
      const discountAmt = subtotal * (doc.discountPct || 0) / 100
      const docTotal = subtotal - discountAmt + (doc.shippingCost || 0)
      const pm1 = doc.paymentMethod || ''
      const pm2 = doc.paymentMethod2 || ''
      const pm2Amt = Number(doc.paymentMethod2Amount) || 0
      const pm1Amt = pm2 && pm2Amt > 0 ? docTotal - pm2Amt : docTotal
      if (pm1) paymentTotals[categorizePM(pm1)] += pm1Amt
      if (pm2 && pm2Amt > 0) paymentTotals[categorizePM(pm2)] += pm2Amt
      if (!pm1 && !pm2) paymentTotals.other += docTotal

      for (const li of doc.lineItems) {
        if (!li.description) continue
        const { sku, title } = parseSku(li.description)
        const key = sku || title
        const cogs = li.qty * (costMap.get(sku.toLowerCase()) || 0)
        const rev = li.qty * li.unitPrice
        const existing = map.get(key)
        if (existing) {
          existing.totalQty += li.qty
          existing.totalRevenue += rev
          existing.totalCogs += cogs
          existing.invoiceCount += 1
        } else {
          map.set(key, { sku, title: title || sku, totalQty: li.qty, totalRevenue: rev, totalCogs: cogs, invoiceCount: 1 })
        }
      }
    }

    const items = Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty)
    const revenue = items.reduce((s, i) => s + i.totalRevenue, 0)
    const cogs = items.reduce((s, i) => s + i.totalCogs, 0)
    return { items, revenue, cogs, paymentTotals }
}

// ─── Create Event Modal ────────────────────────────────────────────────────────

function CreateEventModal({ onClose, onSaved }: { onClose: () => void; onSaved: (e: SlotEvent) => void }) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [timeFrom, setTimeFrom] = useState('')
  const [timeTo, setTimeTo] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<EventSalesItem[]>([])
  const [previewRevenue, setPreviewRevenue] = useState(0)
  const [error, setError] = useState('')

  async function handlePreview() {
    if (!dateFrom || !dateTo) return setError('Select date range first')
    setPreviewing(true); setError('')
    try {
      const { items, revenue } = await buildSalesItems(dateFrom, dateTo)
      setPreview(items); setPreviewRevenue(revenue)
    } catch { setError('Failed to load invoices') }
    finally { setPreviewing(false) }
  }

  async function handleSave() {
    if (!name.trim()) return setError('Event name is required')
    if (!dateFrom || !dateTo) return setError('Date range is required')
    setLoading(true); setError('')
    try {
      const { items, revenue, cogs, paymentTotals } = await buildSalesItems(dateFrom, dateTo)
      const grossProfit = revenue - cogs
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), location, dateFrom, dateTo, timeFrom, timeTo, notes,
          salesItems: items, expenses: [], paymentTotals,
          totalRevenue: revenue, totalCogs: cogs,
          totalExpenses: 0, grossProfit, netProfit: grossProfit,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      onSaved(await res.json())
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Create Event</h2>
            <p className="text-xs text-gray-500 mt-0.5">Capture sales from a slot car event by date range</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Event Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. BSCC Round 3 — April 2026"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Johannesburg Slot Car Club"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date From *</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date To *</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Start Time</label>
              <input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">End Time</label>
              <input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any additional notes…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>

          {/* Preview */}
          <div>
            <button type="button" onClick={handlePreview} disabled={previewing || !dateFrom || !dateTo}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-40 flex items-center gap-1.5">
              {previewing ? '⟳ Loading…' : '👁 Preview sales for this period'}
            </button>
          </div>
          {preview.length > 0 && (
            <div className="bg-indigo-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-indigo-700">{preview.length} products · {fmtPrice(previewRevenue)} revenue</span>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {preview.slice(0, 10).map((item) => (
                  <div key={item.sku || item.title} className="flex justify-between text-xs">
                    <span className="text-gray-700 truncate max-w-[70%]">{item.sku && <span className="font-mono text-indigo-600 mr-1">{item.sku}</span>}{item.title}</span>
                    <span className="font-semibold text-gray-800 shrink-0">{item.totalQty} units</span>
                  </div>
                ))}
                {preview.length > 10 && <div className="text-xs text-gray-400">+{preview.length - 10} more…</div>}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Saving…' : 'Save Event'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── SKU Invoice Drill-down Modal ─────────────────────────────────────────────

interface SkuInvoiceRow {
  date: string
  clientName: string
  qty: number
  unitPrice: number
  lineTotal: number
}

function SkuDetailModal({ item, event, onClose }: {
  item: EventSalesItem
  event: SlotEvent
  onClose: () => void
}) {
  const [rows, setRows] = useState<SkuInvoiceRow[]>([])
  const [stock, setStock] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/orders/documents?type=invoice').then((r) => r.ok ? r.json() : []),
      fetch('/api/admin/products').then((r) => r.ok ? r.json() : []),
    ]).then(([docs, prodsData]) => {
      const products: any[] = prodsData.products || prodsData || []

      // Current stock for this SKU
      if (item.sku) {
        const prod = products.find((p: any) => p.sku?.trim().toLowerCase() === item.sku.toLowerCase())
        setStock(prod?.quantity ?? null)
      }

      const fromDate = new Date(event.dateFrom)
      const toDate = new Date(event.dateTo)
      toDate.setHours(23, 59, 59, 999)

      const result: SkuInvoiceRow[] = []
      for (const doc of docs as RawInvoice[]) {
        if (doc.status === 'archived' || doc.status === 'rejected') continue
        const d = new Date(doc.date || '')
        if (d < fromDate || d > toDate) continue
        for (const li of doc.lineItems) {
          const { sku, title } = parseSku(li.description)
          const match = item.sku
            ? sku.trim().toLowerCase() === item.sku.toLowerCase()
            : (title || li.description).trim() === item.title.trim()
          if (match) {
            result.push({
              date: doc.date,
              clientName: (doc as any).clientName || '—',
              qty: li.qty,
              unitPrice: li.unitPrice,
              lineTotal: li.qty * li.unitPrice,
            })
          }
        }
      }
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setRows(result)
    }).catch(() => {}).finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const totalQty = rows.reduce((s, r) => s + r.qty, 0)
  const totalRev = rows.reduce((s, r) => s + r.lineTotal, 0)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {item.sku && <span className="font-mono text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{item.sku}</span>}
              <h2 className="text-base font-bold text-gray-900">{item.title}</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Invoice breakdown · {event.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4">✕</button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-px bg-gray-100 border-b border-gray-100">
          {[
            { label: 'Units sold', value: String(totalQty), color: 'text-indigo-700' },
            { label: 'Revenue', value: fmtPrice(totalRev), color: 'text-gray-900' },
            { label: 'In stock now', value: stock === null ? '—' : String(stock), color: stock === null ? 'text-gray-400' : stock > 0 ? 'text-green-600' : 'text-red-500' },
            { label: 'Invoices', value: String(rows.length), color: 'text-gray-600' },
          ].map((s) => (
            <div key={s.label} className="bg-gray-50 px-4 py-3 text-center">
              <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Invoice table */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Loading invoices…</div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No invoice lines found for this period</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Client</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Unit Price</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{fmtDate(row.date)}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-800 font-medium">{row.clientName}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-gray-900">{row.qty}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-600">{fmtPrice(row.unitPrice)}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-gray-800">{fmtPrice(row.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={3} className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase">Total</td>
                  <td className="px-4 py-2.5 text-right font-bold text-indigo-700">{totalQty}</td>
                  <td />
                  <td className="px-4 py-2.5 text-right font-bold text-gray-900">{fmtPrice(totalRev)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Expense Row ───────────────────────────────────────────────────────────────

const PAID_BY_OPTIONS = ['', 'Route 66 Imports', 'Self']
const PAYMENT_METHOD_OPTIONS = ['', 'Cash', 'Card', 'EFT']

function ExpenseRow({ exp, onChange, onRemove }: {
  exp: EventExpense
  onChange: (updated: EventExpense) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input value={exp.description} onChange={(e) => onChange({ ...exp, description: e.target.value })}
        placeholder="Description (e.g. Table fee, Fuel)"
        className="flex-1 min-w-[160px] px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
        <span className="px-2 text-xs text-gray-400 bg-gray-50 border-r border-gray-200 py-1.5">R</span>
        <input type="number" min={0} step={0.01} value={exp.amount || ''}
          onChange={(e) => onChange({ ...exp, amount: Number(e.target.value) })}
          className="w-24 px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-indigo-500" />
      </div>
      <select
        value={exp.paymentMethod || ''}
        onChange={(e) => onChange({ ...exp, paymentMethod: e.target.value })}
        className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
        title="Payment method"
      >
        {PAYMENT_METHOD_OPTIONS.map((o) => (
          <option key={o} value={o}>{o || 'Method…'}</option>
        ))}
      </select>
      <select
        value={exp.paidBy || ''}
        onChange={(e) => onChange({ ...exp, paidBy: e.target.value })}
        className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
        title="Paid by"
      >
        {PAID_BY_OPTIONS.map((o) => (
          <option key={o} value={o}>{o || 'Paid by…'}</option>
        ))}
      </select>
      <button onClick={onRemove} className="text-gray-300 hover:text-red-500 text-lg leading-none px-1">✕</button>
    </div>
  )
}

// ─── Event Detail View ─────────────────────────────────────────────────────────

function EventDetail({ event: initialEvent, onBack, onUpdate }: {
  event: SlotEvent
  onBack: () => void
  onUpdate: (updated: SlotEvent) => void
}) {
  const [event, setEvent] = useState<SlotEvent>(initialEvent)
  const [expenses, setExpenses] = useState<EventExpense[]>(initialEvent.expenses || [])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [tab, setTab] = useState<'sales' | 'expenses' | 'charts'>('sales')
  const [notes, setNotes] = useState(initialEvent.notes || '')
  const [timeFrom, setTimeFrom] = useState(initialEvent.timeFrom || '')
  const [timeTo, setTimeTo] = useState(initialEvent.timeTo || '')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [salesSearch, setSalesSearch] = useState('')
  const [selectedSkuItem, setSelectedSkuItem] = useState<EventSalesItem | null>(null)
  const [drillDownEnabled, setDrillDownEnabled] = useState(true)

  useEffect(() => {
    fetch('/api/admin/site-rules')
      .then((r) => r.ok ? r.json() : [])
      .then((rules: Array<{ id: string; active: boolean }>) => {
        const rule = rules.find((r) => r.id === 'event_sku_drill_down')
        if (rule) setDrillDownEnabled(rule.active)
      })
      .catch(() => {})
  }, [])

  // Auto-sync sales from invoices whenever this event is opened
  useEffect(() => {
    let cancelled = false
    const currentExpenses = initialEvent.expenses.reduce((s, e) => s + (e.amount || 0), 0)
    buildSalesItems(initialEvent.dateFrom, initialEvent.dateTo)
      .then(({ items, revenue, cogs, paymentTotals }) => {
        if (cancelled) return
        const grossProfit = revenue - cogs
        return fetch(`/api/admin/events/${initialEvent.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ salesItems: items, totalRevenue: revenue, totalCogs: cogs, grossProfit, netProfit: grossProfit - currentExpenses, paymentTotals }),
        }).then((r) => r.ok ? r.json() : null).then((updated) => {
          if (!cancelled && updated) { setEvent(updated); onUpdate(updated) }
        })
      })
      .catch(() => {})
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEvent.id])

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const netProfit = event.grossProfit - totalExpenses

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenses, notes, timeFrom, timeTo, totalExpenses, netProfit }),
      })
      if (res.ok) {
        const updated = await res.json()
        setEvent(updated); onUpdate(updated)
        setSaved(true); setTimeout(() => setSaved(false), 2000)
      }
    } finally { setSaving(false) }
  }

  async function syncSales() {
    setSyncing(true)
    try {
      const { items, revenue, cogs, paymentTotals } = await buildSalesItems(event.dateFrom, event.dateTo)
      const grossProfit = revenue - cogs
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesItems: items, totalRevenue: revenue, totalCogs: cogs, grossProfit, netProfit: grossProfit - totalExpenses, paymentTotals }),
      })
      if (res.ok) {
        const updated = await res.json()
        setEvent(updated); onUpdate(updated)
      }
    } finally { setSyncing(false) }
  }

  async function archive() {
    const res = await fetch(`/api/admin/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: event.status === 'archived' ? 'active' : 'archived' }),
    })
    if (res.ok) { const u = await res.json(); setEvent(u); onUpdate(u) }
  }

  const top10 = [...(event.salesItems || [])].sort((a, b) => b.totalQty - a.totalQty).slice(0, 10)
  const top10Rev = [...(event.salesItems || [])].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10)

  return (
    <div>
      {/* Back + header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={onBack} className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-2">
            ← Back to Events
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {event.location && <span className="mr-3">📍 {event.location}</span>}
            📅 {fmtDate(event.dateFrom)}{event.timeFrom ? ` ${event.timeFrom}` : ''} — {fmtDate(event.dateTo)}{event.timeTo ? ` ${event.timeTo}` : ''}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-gray-400">Start:</span>
            <input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)}
              className="text-xs px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400" />
            <span className="text-xs text-gray-400">End:</span>
            <input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)}
              className="text-xs px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${event.status === 'archived' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
            {event.status === 'archived' ? 'Archived' : 'Active'}
          </span>
          <button onClick={syncSales} disabled={syncing}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors disabled:opacity-50"
            title="Re-fetch all invoices in this date range and update sales">
            {syncing ? '⟳ Syncing…' : '↺ Sync Sales'}
          </button>
          <button onClick={archive}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
            {event.status === 'archived' ? 'Restore' : 'Archive'}
          </button>
          <button onClick={save} disabled={saving}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${saved ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'} disabled:opacity-50`}>
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* P&L Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Revenue', value: fmtPrice(event.totalRevenue), color: 'text-gray-900' },
          { label: 'Cost of Goods', value: fmtPrice(event.totalCogs), color: 'text-red-600' },
          { label: 'Gross Profit', value: fmtPrice(event.grossProfit), color: event.grossProfit >= 0 ? 'text-green-700' : 'text-red-600' },
          { label: 'Expenses', value: fmtPrice(totalExpenses), color: 'text-orange-600' },
          { label: 'Net Profit', value: fmtPrice(netProfit), color: netProfit >= 0 ? 'text-emerald-700' : 'text-red-700' },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{c.label}</div>
            <div className={`text-lg font-bold ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Margin bar */}
      {event.totalRevenue > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Profit Margin</span>
            <span className="font-semibold text-gray-800">{event.totalRevenue > 0 ? ((netProfit / event.totalRevenue) * 100).toFixed(1) : 0}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-3 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min(100, Math.max(0, (netProfit / event.totalRevenue) * 100))}%` }} />
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="Any event notes…"
          className="w-full text-sm text-gray-700 border-0 focus:outline-none resize-none" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {(['sales', 'expenses', 'charts'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'sales' ? `Sales (${event.salesItems?.length || 0})` : t === 'expenses' ? `Expenses (${expenses.length})` : 'Charts'}
          </button>
        ))}
      </div>

      {/* Sales Tab */}
      {tab === 'sales' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Search bar */}
          <div className="px-4 py-3 border-b border-gray-100">
            <input
              type="text"
              placeholder="Search SKU or product name…"
              value={salesSearch}
              onChange={(e) => setSalesSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
            />
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase w-8">#</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">SKU</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Units</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">COGS</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Gross</th>
              </tr>
            </thead>
            <tbody>
              {(event.salesItems || [])
                .filter((item) => {
                  if (!salesSearch.trim()) return true
                  const q = salesSearch.toLowerCase()
                  return item.sku.toLowerCase().includes(q) || item.title.toLowerCase().includes(q)
                })
                .sort((a, b) => b.totalQty - a.totalQty).map((item, i) => {
                const gross = item.totalRevenue - item.totalCogs
                const maxQty = event.salesItems[0]?.totalQty || 1
                return (
                  <tr key={item.sku || item.title} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2.5 px-4 text-xs text-gray-400">{i + 1}</td>
                    <td className="py-2.5 px-4">
                      {drillDownEnabled ? (
                        <button
                          onClick={() => setSelectedSkuItem(item)}
                          className="font-mono text-xs text-indigo-700 font-semibold hover:underline hover:text-indigo-900 transition-colors"
                          title="Click to see invoice breakdown"
                        >
                          {item.sku || '—'}
                        </button>
                      ) : (
                        <span className="font-mono text-xs text-indigo-700 font-semibold">{item.sku || '—'}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="text-gray-800 font-medium text-xs">{item.title}</div>
                      <div className="mt-0.5 h-1 bg-gray-100 rounded-full w-full max-w-[140px]">
                        <div className="h-1 bg-indigo-400 rounded-full" style={{ width: `${(item.totalQty / maxQty) * 100}%` }} />
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-gray-900">{item.totalQty}</td>
                    <td className="py-2.5 px-4 text-right text-gray-700">{fmtPrice(item.totalRevenue)}</td>
                    <td className="py-2.5 px-4 text-right text-red-500 text-xs">{item.totalCogs > 0 ? fmtPrice(item.totalCogs) : '—'}</td>
                    <td className={`py-2.5 px-4 text-right font-semibold text-xs ${gross >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.totalCogs > 0 ? fmtPrice(gross) : '—'}
                    </td>
                  </tr>
                )
              })}
              {(!event.salesItems || event.salesItems.length === 0) && (
                <tr><td colSpan={7} className="py-10 text-center text-gray-400 text-sm">No sales data</td></tr>
              )}
              {event.salesItems && event.salesItems.length > 0 && salesSearch.trim() &&
                event.salesItems.filter((item) => {
                  const q = salesSearch.toLowerCase()
                  return item.sku.toLowerCase().includes(q) || item.title.toLowerCase().includes(q)
                }).length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-gray-400 text-sm">No items match &ldquo;{salesSearch}&rdquo;</td></tr>
              )}
            </tbody>
          </table>
          {/* Payment Method Totals */}
          {event.paymentTotals && (event.paymentTotals.cash > 0 || event.paymentTotals.card > 0 || event.paymentTotals.eft > 0 || event.paymentTotals.other > 0) && (
            <div className="px-4 py-4 border-t border-gray-100 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Sales by Payment Method</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {event.paymentTotals.cash > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-base">💵</span>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cash</span>
                    </div>
                    <div className="text-sm font-bold text-gray-900">{fmtPrice(event.paymentTotals.cash)}</div>
                  </div>
                )}
                {event.paymentTotals.card > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-base">💳</span>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Card</span>
                    </div>
                    <div className="text-sm font-bold text-gray-900">{fmtPrice(event.paymentTotals.card)}</div>
                  </div>
                )}
                {event.paymentTotals.eft > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-base">🏦</span>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">EFT</span>
                    </div>
                    <div className="text-sm font-bold text-gray-900">{fmtPrice(event.paymentTotals.eft)}</div>
                  </div>
                )}
                {event.paymentTotals.other > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-base">📋</span>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Other</span>
                    </div>
                    <div className="text-sm font-bold text-gray-900">{fmtPrice(event.paymentTotals.other)}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expenses Tab */}
      {tab === 'expenses' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-700">Event Expenses</h3>
            <span className="text-sm font-bold text-orange-600">{fmtPrice(totalExpenses)}</span>
          </div>
          {expenses.map((exp) => (
            <ExpenseRow key={exp.id} exp={exp}
              onChange={(u) => setExpenses((prev) => prev.map((e) => e.id === exp.id ? u : e))}
              onRemove={() => setExpenses((prev) => prev.filter((e) => e.id !== exp.id))} />
          ))}
          <button
            onClick={() => setExpenses((prev) => [...prev, { id: uid(), description: '', amount: 0, paidBy: '' }])}
            className="w-full border-2 border-dashed border-gray-200 rounded-lg py-2.5 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2">
            + Add Expense
          </button>
          {expenses.length > 0 && (
            <div className="pt-3 border-t border-gray-100 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Expenses</span>
                <span className="font-bold text-orange-600">{fmtPrice(totalExpenses)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Net Profit</span>
                <span className={`font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPrice(netProfit)}</span>
              </div>

              {/* Reimbursement summary — grouped by paidBy */}
              {(() => {
                const groups = new Map<string, { exps: EventExpense[]; total: number }>()
                for (const e of expenses) {
                  const key = e.paidBy?.trim() || ''
                  if (!key) continue
                  const g = groups.get(key) || { exps: [], total: 0 }
                  g.exps.push(e)
                  g.total += e.amount || 0
                  groups.set(key, g)
                }
                if (groups.size === 0) return null
                return (
                  <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Reimbursements Owed</p>
                    {Array.from(groups.entries()).map(([person, { exps, total }]) => (
                      <div key={person} className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-indigo-700">{person}</span>
                          <span className="text-sm font-bold text-indigo-700">{fmtPrice(total)}</span>
                        </div>
                        <div className="bg-indigo-50 rounded-lg px-3 py-2 space-y-1">
                          {exps.map((e) => (
                            <div key={e.id} className="flex justify-between text-xs">
                              <span className="text-gray-600">{e.description || '(no description)'}</span>
                              <span className="font-semibold text-gray-800">{fmtPrice(e.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}
          <div className="pt-2">
            <button onClick={save} disabled={saving}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Expenses'}
            </button>
          </div>
        </div>
      )}

      {/* Charts Tab */}
      {tab === 'charts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Top 10 — Units Sold</h3>
              {top10.length > 0 ? (
                <BarChart
                  items={top10.map((i) => ({ label: i.sku || i.title, value: i.totalQty }))}
                  label="Units sold"
                  color="#6366f1"
                />
              ) : <p className="text-sm text-gray-400">No data</p>}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Top 10 — Revenue (R)</h3>
              {top10Rev.length > 0 ? (
                <BarChart
                  items={top10Rev.map((i) => ({ label: i.sku || i.title, value: Math.round(i.totalRevenue) }))}
                  label="Revenue (R)"
                  color="#10b981"
                />
              ) : <p className="text-sm text-gray-400">No data</p>}
            </div>
          </div>

          {/* P&L breakdown bars */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">P&amp;L Breakdown</h3>
            <div className="space-y-3">
              {[
                { label: 'Revenue', value: event.totalRevenue, color: 'bg-indigo-500' },
                { label: 'Cost of Goods', value: event.totalCogs, color: 'bg-red-400' },
                { label: 'Expenses', value: totalExpenses, color: 'bg-orange-400' },
                { label: 'Gross Profit', value: event.grossProfit, color: 'bg-emerald-400' },
                { label: 'Net Profit', value: netProfit, color: 'bg-emerald-600' },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-28 shrink-0">{row.label}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-6 rounded-full ${row.color} transition-all`}
                      style={{ width: `${event.totalRevenue > 0 ? Math.min(100, Math.max(0, (Math.abs(row.value) / event.totalRevenue) * 100)) : 0}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-28 text-right shrink-0">{fmtPrice(row.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SKU drill-down modal */}
      {selectedSkuItem && drillDownEnabled && (
        <SkuDetailModal item={selectedSkuItem} event={event} onClose={() => setSelectedSkuItem(null)} />
      )}

      {/* Danger zone */}
      <div className="mt-8 pt-4 border-t border-gray-200">
        {deleteConfirm ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-600 font-medium">Delete this event permanently?</span>
            <button onClick={async () => {
              await fetch(`/api/admin/events/${event.id}`, { method: 'DELETE' })
              onUpdate({ ...event, status: 'archived' }); onBack()
            }} className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            <button onClick={() => setDeleteConfirm(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setDeleteConfirm(true)} className="text-xs text-red-400 hover:text-red-600">Delete event</button>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const [events, setEvents] = useState<SlotEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<SlotEvent | null>(null)
  const [tab, setTab] = useState<'active' | 'archived'>('active')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/events')
    if (res.ok) setEvents(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const visible = events.filter((e) => tab === 'archived' ? e.status === 'archived' : e.status !== 'archived')

  // All-events stats (active only)
  const activeEvents = events.filter((e) => e.status === 'active')
  const allRevenue = activeEvents.reduce((s, e) => s + e.totalRevenue, 0)
  const allNetProfit = activeEvents.reduce((s, e) => s + e.netProfit, 0)
  const allExpenses = activeEvents.reduce((s, e) => s + e.totalExpenses, 0)

  function handleCreated(evt: SlotEvent) {
    setEvents((prev) => [evt, ...prev])
    setShowCreate(false)
    setSelected(evt)
  }
  function handleUpdate(updated: SlotEvent) {
    setEvents((prev) => prev.map((e) => e.id === updated.id ? updated : e))
    if (selected?.id === updated.id) setSelected(updated)
  }

  if (selected) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <EventDetail event={selected} onBack={() => setSelected(null)} onUpdate={handleUpdate} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-sm text-gray-500 mt-0.5">Catalogue sales from slot car events — track what sells and your profit</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-sm flex items-center gap-2">
          + Create Event
        </button>
      </div>

      {/* Aggregate stats */}
      {activeEvents.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Events', value: activeEvents.length.toString(), sub: 'active' },
            { label: 'Combined Revenue', value: fmtPrice(allRevenue), sub: 'all active events' },
            { label: 'Total Expenses', value: fmtPrice(allExpenses), sub: 'all active events' },
            { label: 'Combined Net Profit', value: fmtPrice(allNetProfit), sub: allNetProfit >= 0 ? '🟢 Profitable' : '🔴 Loss', highlight: true },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl border shadow-sm p-4 ${c.highlight ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}`}>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{c.label}</div>
              <div className={`text-xl font-bold ${c.highlight ? 'text-emerald-700' : 'text-gray-900'}`}>{c.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Events comparison chart */}
      {activeEvents.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Events Comparison — Revenue vs Net Profit</h2>
          <EventCompareChart events={events} />
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {(['active', 'archived'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t} ({events.filter((e) => t === 'archived' ? e.status === 'archived' : e.status !== 'archived').length})
          </button>
        ))}
      </div>

      {/* Events grid */}
      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-4xl mb-3">🏁</div>
          <p className="text-gray-500 font-medium">{tab === 'active' ? 'No events yet — create your first one' : 'No archived events'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((evt) => {
            const margin = evt.totalRevenue > 0 ? (evt.netProfit / evt.totalRevenue) * 100 : 0
            const topItem = [...(evt.salesItems || [])].sort((a, b) => b.totalQty - a.totalQty)[0]
            return (
              <button key={evt.id} onClick={() => setSelected(evt)}
                className="text-left bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all p-5 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 group-hover:text-indigo-700 truncate">{evt.name}</h3>
                    {evt.location && <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {evt.location}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">📅 {fmtDate(evt.dateFrom)} — {fmtDate(evt.dateTo)}</p>
                  </div>
                  <span className={`ml-2 shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold ${evt.status === 'archived' ? 'bg-gray-100 text-gray-400' : 'bg-green-100 text-green-700'}`}>
                    {evt.status === 'archived' ? 'Archived' : 'Active'}
                  </span>
                </div>

                {/* Mini stats */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-xs text-gray-400">Revenue</div>
                    <div className="text-sm font-bold text-gray-900">{fmtPrice(evt.totalRevenue)}</div>
                  </div>
                  <div className={`rounded-lg p-2.5 ${evt.netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    <div className="text-xs text-gray-400">Net Profit</div>
                    <div className={`text-sm font-bold ${evt.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmtPrice(evt.netProfit)}</div>
                  </div>
                </div>

                {/* Margin bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Margin</span><span>{margin.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-1.5 rounded-full ${margin >= 20 ? 'bg-emerald-500' : margin >= 0 ? 'bg-yellow-400' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(100, Math.max(0, margin))}%` }} />
                  </div>
                </div>

                {/* Top seller */}
                {topItem && (
                  <div className="text-xs text-gray-500 border-t border-gray-100 pt-2.5">
                    🏆 <span className="font-semibold text-gray-700">{topItem.sku || topItem.title}</span>
                    <span className="ml-1 text-gray-400">— {topItem.totalQty} units sold</span>
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-1">{evt.salesItems?.length || 0} products · {evt.expenses?.length || 0} expenses</div>
              </button>
            )
          })}
        </div>
      )}

      {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} onSaved={handleCreated} />}
    </div>
  )
}
