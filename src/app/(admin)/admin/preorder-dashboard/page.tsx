'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface DashCustomer {
  id?: string
  name?: string
  email?: string
  qty: number
  depositPaid?: boolean
  isNew?: boolean
  linkedDocNumber?: string
}

interface DashItem {
  id: string
  sku?: string
  description?: string
  brand?: string
  supplier: string
  retailPrice: string
  estimatedRetailPrice: string
  eta?: string
  cutoffDate?: string
  orderPlaced?: boolean
  customers: DashCustomer[]
}

function cutoffAlertActive(date?: string): boolean {
  if (!date) return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  const days = Math.ceil((d.getTime() - today.getTime()) / 86_400_000)
  return days >= 0 && days <= 2
}

type SearchTab = 'client' | 'sku' | 'brand' | 'supplier' | 'quote' | 'invoice'

const SEARCH_TABS: { key: SearchTab; label: string; hint: string; placeholder: string }[] = [
  { key: 'client',   label: 'Client',   placeholder: 'Client name or email…',     hint: 'Every order this client has placed, across every supplier. Narrow it below.' },
  { key: 'sku',      label: 'SKU',      placeholder: 'SKU or description…',       hint: 'Items by SKU or description, with everyone booked on them.' },
  { key: 'brand',    label: 'Brand',    placeholder: 'Brand name…',               hint: 'Items of this brand, with everyone booked on them.' },
  { key: 'supplier', label: 'Supplier', placeholder: 'Supplier name…',            hint: 'Items from this supplier, with everyone booked on them.' },
  { key: 'quote',    label: 'Quotes',   placeholder: 'Quote number or client…',   hint: 'Orders sitting on a Quote (QR66…). Type the number, or a client to see all of theirs.' },
  { key: 'invoice',  label: 'Invoices', placeholder: 'Invoice number or client…', hint: 'Orders sitting on an Invoice (INV…). Type the number, or a client to see all of theirs.' },
]

// The four fields that narrow a result set once a tab has produced one
const NARROW_FIELDS: { key: 'sku' | 'brand' | 'quote' | 'invoice'; label: string; placeholder: string }[] = [
  { key: 'sku',     label: 'SKU',       placeholder: 'SKU…' },
  { key: 'brand',   label: 'Brand',     placeholder: 'Brand…' },
  { key: 'quote',   label: 'Quote #',   placeholder: 'QR66…' },
  { key: 'invoice', label: 'Invoice #', placeholder: 'INV…' },
]

// Document numbering on R66Slot: quotes QR66…, sales orders SO…, invoices INV0026…
// (see nextDocNumber in the supplier page — note invoices are INV here, not R66INV.)
function docKind(n?: string): 'invoice' | 'salesorder' | 'quote' | null {
  if (!n) return null
  if (/^INV/i.test(n)) return 'invoice'
  if (/^SO/i.test(n)) return 'salesorder'
  return 'quote'
}

const DOC_TAB: Record<'invoice' | 'salesorder' | 'quote', string> = {
  invoice: 'invoices', salesorder: 'salesorders', quote: 'quotes',
}

const supplierKeyOf = (i: DashItem) => i.supplier?.trim() || '— No Supplier'

const NAV_PAGES = [
  { label: 'List of Pre-Orders', href: '/admin/preorder-list' },
  { label: 'Pre-Orders Header', href: '/admin/preorder-header' },
  { label: 'Supplier Network', href: '/admin/supplier-network' },
]

export default function PreOrderDashboardPage() {
  const [items, setItems] = useState<DashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newSupplier, setNewSupplier] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [searchTab, setSearchTab] = useState<SearchTab>('client')
  const [query, setQuery] = useState('')
  const [narrow, setNarrow] = useState<Record<'sku' | 'brand' | 'quote' | 'invoice', string>>({
    sku: '', brand: '', quote: '', invoice: '',
  })
  const router = useRouter()

  useEffect(() => {
    fetch('/api/admin/preorder-dashboard')
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const grouped = items.reduce<Record<string, DashItem[]>>((acc, item) => {
    const key = item.supplier?.trim() || '— No Supplier'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const supplierKeys = Object.keys(grouped).sort((a, b) => {
    if (a === '— No Supplier') return 1
    if (b === '— No Supplier') return -1
    return a.localeCompare(b)
  })

  const totalItems = items.length
  const totalNewOrders = items.reduce((s, i) => s + (i.customers ?? []).filter(c => c.isNew).length, 0)
  const totalBooked = items.reduce((s, i) => s + (i.customers ?? []).reduce((ss, c) => ss + c.qty, 0), 0)

  const q = query.trim().toLowerCase()
  const activeTab = SEARCH_TABS.find(t => t.key === searchTab)!
  const narrowSku = narrow.sku.trim().toLowerCase()
  const narrowBrand = narrow.brand.trim().toLowerCase()
  const narrowQuote = narrow.quote.trim().toLowerCase()
  const narrowInvoice = narrow.invoice.trim().toLowerCase()
  const narrowActive = !!(narrowSku || narrowBrand || narrowQuote || narrowInvoice)
  const searchActive = !!q || narrowActive

  // Two stages. The tab decides which orders come back — a client's whole book, say.
  // The narrow fields then cut that set down without the user retyping the client.
  const results = useMemo(() => {
    if (!searchActive) return []
    const hit = (v: string | undefined, needle: string) => !!v && v.toLowerCase().includes(needle)

    // Stage 1a — tabs that match the item itself; every booking on it comes along.
    const itemMatches = (i: DashItem) => {
      switch (searchTab) {
        case 'sku':      return hit(i.sku, q) || hit(i.description, q)
        case 'brand':    return hit(i.brand, q)
        case 'supplier': return hit(supplierKeyOf(i), q)
        default:         return false
      }
    }

    // Stage 1b — tabs that match a person; only their rows come back.
    const customerMatches = (c: DashCustomer) => {
      const person = hit(c.name, q) || hit(c.email, q)
      switch (searchTab) {
        case 'client': return person
        case 'quote':
        case 'invoice': {
          // Restrict to rows that actually carry a document of that kind, then let the user
          // find it either by its number or by whose it is.
          if (docKind(c.linkedDocNumber) !== searchTab) return false
          return hit(c.linkedDocNumber, q) || person
        }
        default: return false
      }
    }

    const rowTab = searchTab === 'client' || searchTab === 'quote' || searchTab === 'invoice'
    const out: { item: DashItem; rows: DashCustomer[] }[] = []

    for (const item of items) {
      const customers = item.customers ?? []

      // Stage 1 — with no primary term the tab matches everything, so the narrow
      // fields can drive the search on their own.
      let rows: DashCustomer[]
      if (!q) {
        rows = customers
      } else if (rowTab) {
        rows = customers.filter(customerMatches)
        if (!rows.length) continue
      } else {
        if (!itemMatches(item)) continue
        rows = customers
      }

      // Stage 2 — narrowing. SKU and Brand judge the item, so a miss drops it whole.
      if (narrowSku && !hit(item.sku, narrowSku) && !hit(item.description, narrowSku)) continue
      if (narrowBrand && !hit(item.brand, narrowBrand)) continue

      // Quote and Invoice judge the individual bookings.
      if (narrowQuote) {
        rows = rows.filter(c => docKind(c.linkedDocNumber) === 'quote' && hit(c.linkedDocNumber, narrowQuote))
        if (!rows.length) continue
      }
      if (narrowInvoice) {
        rows = rows.filter(c => docKind(c.linkedDocNumber) === 'invoice' && hit(c.linkedDocNumber, narrowInvoice))
        if (!rows.length) continue
      }

      out.push({ item, rows })
    }

    out.sort((a, b) =>
      supplierKeyOf(a.item).localeCompare(supplierKeyOf(b.item)) ||
      (a.item.description || '').localeCompare(b.item.description || '')
    )
    return out
  }, [items, q, searchTab, narrowSku, narrowBrand, narrowQuote, narrowInvoice, searchActive])

  const resultUnits = results.reduce((s, r) => s + r.rows.reduce((ss, c) => ss + (c.qty || 0), 0), 0)
  const RESULT_CAP = 60
  const shownResults = results.slice(0, RESULT_CAP)

  return (
    <div className="flex gap-5 min-h-[70vh]">
      {/* ─── Sidebar ─── */}
      <aside className="w-44 shrink-0">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden sticky top-4 shadow-sm">
          <div className="px-3 py-2.5 bg-gray-800">
            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Pre-Order</p>
          </div>
          <div className="p-2 space-y-0.5 border-b border-gray-100">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-2 pt-1.5 pb-1">Search</p>
            {SEARCH_TABS.map(t => {
              const active = searchTab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setSearchTab(t.key)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    active ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{t.label}</span>
                  {active && searchActive && (
                    <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded-full font-bold tabular-nums leading-none">
                      {results.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <nav className="p-2 space-y-0.5">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-2 pt-1.5 pb-1">Pages</p>
            {NAV_PAGES.map(p => (
              <Link key={p.href} href={p.href}
                className="flex items-center justify-between px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-lg font-medium">
                <span>{p.label}</span>
                <span className="text-gray-300 text-[10px]">↗</span>
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <div className="flex-1 min-w-0 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pre-Order Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track upcoming pre-order items and interested customers</p>
          </div>
          <button
            onClick={() => { setNewSupplier(''); setShowNewModal(true) }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <span className="text-base leading-none">+</span> New Item
          </button>
        </div>

        {/* KPI cards */}
        {!loading && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-sm">
              <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wide">Total Items</p>
              <p className="font-bold text-gray-900 mt-1 text-xl">{totalItems}</p>
              <p className="text-xs text-indigo-400 mt-0.5">{supplierKeys.length} supplier{supplierKeys.length !== 1 ? 's' : ''}</p>
            </div>
            <div className={`border rounded-xl p-4 shadow-sm ${totalNewOrders > 0 ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${totalNewOrders > 0 ? 'text-green-500' : 'text-gray-400'}`}>New Orders</p>
              <p className="font-bold text-gray-900 mt-1 text-xl">{totalNewOrders}</p>
              <p className={`text-xs mt-0.5 ${totalNewOrders > 0 ? 'text-green-500 font-medium' : 'text-gray-400'}`}>{totalNewOrders > 0 ? 'Requires attention' : 'All seen'}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Total Booked</p>
              <p className="font-bold text-gray-900 mt-1 text-xl">{totalBooked}</p>
              <p className="text-xs text-gray-400 mt-0.5">units reserved</p>
            </div>
          </div>
        )}

        {/* ─── Deep Search ─── */}
        {!loading && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3.5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                Search — {activeTab.label}
              </p>
              {searchActive && (
                <button
                  onClick={() => { setQuery(''); setNarrow({ sku: '', brand: '', quote: '', invoice: '' }) }}
                  className="text-[11px] font-semibold text-gray-400 hover:text-gray-700"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="px-4 pt-2.5 pb-3.5">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm pointer-events-none">🔍</span>
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') setQuery('') }}
                  placeholder={activeTab.placeholder}
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    title="Clear"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-lg leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">{activeTab.hint}</p>

              {/* Narrow down — stacks on top of whatever the tab found */}
              <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Narrow down</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {NARROW_FIELDS.map(f => (
                    <div key={f.key} className="relative">
                      <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">{f.label}</label>
                      <input
                        type="text"
                        value={narrow[f.key]}
                        onChange={e => setNarrow(n => ({ ...n, [f.key]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Escape') setNarrow(n => ({ ...n, [f.key]: '' })) }}
                        placeholder={f.placeholder}
                        className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                          narrow[f.key].trim() ? 'border-indigo-400 bg-indigo-50/50' : 'border-gray-200'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {searchActive && (
              <div className="border-t border-gray-100">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-600">
                    {results.length === 0
                      ? 'No matches'
                      : `${results.length} item${results.length !== 1 ? 's' : ''} · ${resultUnits} unit${resultUnits !== 1 ? 's' : ''} booked`}
                  </p>
                  {results.length > RESULT_CAP && (
                    <p className="text-[11px] text-gray-400">showing first {RESULT_CAP} — narrow the search</p>
                  )}
                </div>

                {results.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">
                    {q
                      ? `Nothing found for "${query.trim()}" in ${activeTab.label}${narrowActive ? ' with those narrow filters' : ''}.`
                      : 'Nothing matches those narrow filters.'}
                  </div>
                ) : (
                  <div className="max-h-[32rem] overflow-y-auto divide-y divide-gray-100">
                    {shownResults.map(r => {
                      const supKey = supplierKeyOf(r.item)
                      const units = r.rows.reduce((s, c) => s + (c.qty || 0), 0)
                      const title = [r.item.sku, r.item.description].filter(Boolean).join('  —  ') || '(untitled item)'
                      return (
                        <div key={r.item.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <Link
                              href={`/admin/preorder-dashboard/${encodeURIComponent(supKey)}${q ? `?q=${encodeURIComponent(query.trim())}` : ''}`}
                              className="min-w-0 group"
                            >
                              <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 truncate">{title}</p>
                              <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                                {supKey}
                                {r.item.brand ? ` · ${r.item.brand}` : ''}
                                {r.item.eta ? ` · ETA ${r.item.eta}` : ''}
                                {r.item.orderPlaced ? ' · ✓ Order placed' : ''}
                              </p>
                            </Link>
                            <span className="text-[11px] text-gray-400 shrink-0 tabular-nums pt-0.5">
                              {units} unit{units !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {r.rows.length === 0 ? (
                            <p className="text-[11px] text-gray-300 mt-1.5">No reservations</p>
                          ) : (
                            <div className="mt-1.5 space-y-1">
                              {r.rows.map((c, idx) => {
                                const kind = docKind(c.linkedDocNumber)
                                return (
                                  <div key={c.id || idx} className="flex items-center gap-2 flex-wrap text-xs">
                                    <span className="font-medium text-gray-800">{c.name || '—'}</span>
                                    {c.email && <span className="text-gray-400">{c.email}</span>}
                                    <span className="text-gray-500 tabular-nums">× {c.qty}</span>
                                    {c.isNew && (
                                      <span className="text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded-full font-bold leading-none">new</span>
                                    )}
                                    {c.depositPaid && (
                                      <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded font-semibold leading-none">Deposit paid</span>
                                    )}
                                    {c.linkedDocNumber && kind && (
                                      <a
                                        href={`/admin/orders?tab=${DOC_TAB[kind]}&open=${encodeURIComponent(c.linkedDocNumber)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={`Open ${c.linkedDocNumber}`}
                                        className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded leading-none hover:bg-indigo-100 whitespace-nowrap"
                                      >
                                        {c.linkedDocNumber}
                                      </a>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {loading && <div className="py-20 text-center text-gray-400 text-sm">Loading…</div>}

        {/* Supplier list — stood down while search results are on screen */}
        {!loading && !searchActive && (
          <div className="space-y-2">
            {supplierKeys.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-4xl mb-3">📋</div>
                <p className="font-medium">No pre-order items yet</p>
                <p className="text-sm mt-1">Click &quot;New Item&quot; to get started.</p>
              </div>
            ) : (
              supplierKeys.map(name => {
                const supItems = grouped[name]
                const newCount = supItems.reduce((s, i) => s + (i.customers ?? []).filter(c => c.isNew).length, 0)
                const alertCount = supItems.filter(i => cutoffAlertActive(i.cutoffDate) && !i.orderPlaced).length
                const totalQty = supItems.reduce((s, i) => s + (i.customers ?? []).reduce((ss, c) => ss + c.qty, 0), 0)
                const paidQty = supItems.reduce((s, i) => s + (i.customers ?? []).filter(c => c.depositPaid).reduce((ss, c) => ss + c.qty, 0), 0)

                return (
                  <Link
                    key={name}
                    href={`/admin/preorder-dashboard/${encodeURIComponent(name)}`}
                    className={`flex items-center justify-between px-5 py-3.5 rounded-xl border shadow-sm transition-all hover:shadow-md ${newCount > 0 ? 'bg-green-50 border-green-200 hover:bg-green-100' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`font-bold text-base ${newCount > 0 ? 'text-green-800' : 'text-gray-900'}`}>{name}</span>
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold shrink-0">
                        {supItems.length} item{supItems.length !== 1 ? 's' : ''}
                      </span>
                      {newCount > 0 && (
                        <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-bold shrink-0 animate-pulse">
                          🟢 {newCount} new
                        </span>
                      )}
                      {alertCount > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold shrink-0">
                          ⚠ {alertCount} cutoff
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm shrink-0 ml-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Booked</p>
                        <p className="font-semibold text-gray-800 tabular-nums">{totalQty}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Paid</p>
                        <p className={`font-semibold tabular-nums ${paidQty > 0 ? 'text-green-700' : 'text-gray-400'}`}>{paidQty}</p>
                      </div>
                      <span className="text-gray-300 text-xl font-light">›</span>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        )}

        {/* Quick links */}
        {!loading && (
          <div className="flex justify-center gap-3 pt-2">
            <a href="/admin/preorder-list" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 transition-colors shadow-sm">
              📋 List of Pre-Orders
            </a>
            <a href="/admin/preorder-header" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 transition-colors shadow-sm">
              🎨 Pre-Orders Header
            </a>
          </div>
        )}
      </div>

      {/* ─── New Item Modal ─── */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowNewModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold text-gray-900 mb-1">Add New Pre-Order Item</h2>
            <p className="text-xs text-gray-500 mb-4">Select or type the supplier name, then open that supplier&apos;s page to add the item.</p>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Supplier</label>
            <input
              type="text"
              value={newSupplier}
              onChange={e => setNewSupplier(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const name = newSupplier.trim() || '— No Supplier'
                  router.push(`/admin/preorder-dashboard/${encodeURIComponent(name)}?new=1`)
                  setShowNewModal(false)
                }
              }}
              list="supplier-datalist"
              placeholder="Type supplier name…"
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
            />
            <datalist id="supplier-datalist">
              {supplierKeys.filter(k => k !== '— No Supplier').map(k => <option key={k} value={k} />)}
            </datalist>
            <div className="flex gap-2">
              <button onClick={() => setShowNewModal(false)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => {
                  const name = newSupplier.trim() || '— No Supplier'
                  router.push(`/admin/preorder-dashboard/${encodeURIComponent(name)}?new=1`)
                  setShowNewModal(false)
                }}
                className="flex-1 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700">
                Open →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
