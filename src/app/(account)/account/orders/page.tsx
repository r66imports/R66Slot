'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'

interface Item {
  sku: string
  description: string
  qty: number
  price: number
}

interface Entry {
  id: string
  ref: string
  type: 'order' | 'preorder' | 'booking' | 'quote' | 'salesorder' | 'invoice'
  date: string
  status: string
  total: number
  amountPaid?: number
  discountPct?: number
  shippingCost?: number
  items: Item[]
}

const TYPE_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  order:      { label: 'Shop Order',   color: 'text-green-700',  bg: 'bg-green-100',  icon: '🛒' },
  preorder:   { label: 'Pre-Order',    color: 'text-orange-700', bg: 'bg-orange-100', icon: '📦' },
  booking:    { label: 'Booking',      color: 'text-orange-700', bg: 'bg-orange-100', icon: '📋' },
  quote:      { label: 'Quote',        color: 'text-blue-700',   bg: 'bg-blue-100',   icon: '📄' },
  salesorder: { label: 'Sales Order',  color: 'text-purple-700', bg: 'bg-purple-100', icon: '📑' },
  invoice:    { label: 'Invoice',      color: 'text-red-700',    bg: 'bg-red-100',    icon: '🧾' },
}

const STATUS_COLOR: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-700',
  active:     'bg-yellow-100 text-yellow-700',
  processing: 'bg-yellow-100 text-yellow-700',
  draft:      'bg-gray-100 text-gray-600',
  sent:       'bg-blue-100 text-blue-700',
  accepted:   'bg-green-100 text-green-700',
  complete:   'bg-green-100 text-green-700',
  delivered:  'bg-green-100 text-green-700',
  paid:       'bg-green-100 text-green-700',
  shipped:    'bg-blue-100 text-blue-700',
  archived:   'bg-gray-100 text-gray-500',
  cancelled:  'bg-red-100 text-red-700',
  rejected:   'bg-red-100 text-red-700',
}

const TABS = [
  { key: 'all',        label: 'All' },
  { key: 'order',      label: 'Shop Orders' },
  { key: 'booking',    label: 'Bookings' },
  { key: 'quote',      label: 'Quotes' },
  { key: 'salesorder', label: 'Sales Orders' },
  { key: 'invoice',    label: 'Invoices' },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmt(n: number) {
  return 'R' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function getOutstanding(entry: Entry): number {
  if (entry.type !== 'invoice') return 0
  const paid = entry.amountPaid ?? 0
  return Math.max(0, entry.total - paid)
}

export default function OrdersPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/account/orders')
      .then((r) => {
        if (r.status === 401) { window.location.href = '/account/login'; return null }
        return r.json()
      })
      .then((data) => { if (Array.isArray(data)) setEntries(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Stats
  const stats = useMemo(() => {
    const invoices = entries.filter(e => e.type === 'invoice')

    const totalInvoiced = invoices.reduce((s, e) => s + e.total, 0)
    const totalPaid = invoices.reduce((s, e) => s + (e.amountPaid ?? 0), 0)
    const totalOutstanding = invoices.reduce((s, e) => s + getOutstanding(e), 0)
    const totalCredit = invoices.reduce((s, e) => {
      const paid = (e.amountPaid ?? 0) + ((e as any).creditApplied ?? 0)
      return s + Math.max(0, paid - e.total)
    }, 0)

    const totalItems = entries.reduce((s, e) => s + e.items.reduce((si, i) => si + i.qty, 0), 0)

    const skuCount: Record<string, { desc: string; qty: number }> = {}
    entries.forEach(e => e.items.forEach(i => {
      const key = i.sku || i.description
      if (!key) return
      if (!skuCount[key]) skuCount[key] = { desc: i.description || i.sku, qty: 0 }
      skuCount[key].qty += i.qty
    }))
    const topItem = Object.values(skuCount).sort((a, b) => b.qty - a.qty)[0]

    return { totalInvoiced, totalPaid, totalOutstanding, totalCredit, totalItems, topItem }
  }, [entries])

  // Monthly breakdown — last 6 months
  const monthly = useMemo(() => {
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      return { year: d.getFullYear(), month: d.getMonth(), label: MONTHS[d.getMonth()] }
    })
    return months.map(m => {
      const total = entries
        .filter(e => {
          const d = new Date(e.date)
          return d.getMonth() === m.month && d.getFullYear() === m.year
        })
        .reduce((s, e) => s + e.total, 0)
      return { label: m.label, total }
    })
  }, [entries])

  const maxMonthly = Math.max(...monthly.map(m => m.total), 1)

  // Filtered entries
  const filtered = tab === 'all'
    ? entries
    : entries.filter(e => {
        if (tab === 'booking') return e.type === 'booking' || e.type === 'preorder'
        return e.type === tab
      })

  // Tab counts
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: entries.length }
    entries.forEach(e => { c[e.type] = (c[e.type] || 0) + 1 })
    c['booking'] = (c['booking'] || 0) + (c['preorder'] || 0)
    return c
  }, [entries])

  function downloadStatement() {
    const invoices = entries.filter(e => e.type === 'invoice')
    const totalOutstanding = stats.totalOutstanding
    const totalCredit = stats.totalCredit

    const rowsHtml = invoices.map(e => {
      const outstanding = getOutstanding(e)
      const paid = e.amountPaid ?? 0
      const statusCls = outstanding > 0
        ? 'color:#b91c1c;font-weight:700'
        : 'color:#15803d;font-weight:700'
      const statusLabel = outstanding > 0 ? `Due: R ${outstanding.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}` : 'Paid'
      return `<tr>
        <td style="padding:8px 12px;font-size:12px;">${new Date(e.date).toLocaleDateString('en-ZA', { day:'2-digit', month:'short', year:'numeric' })}</td>
        <td style="padding:8px 12px;font-size:12px;font-weight:600;">#${e.ref}</td>
        <td style="padding:8px 12px;font-size:12px;">${e.status.charAt(0).toUpperCase() + e.status.slice(1)}</td>
        <td style="padding:8px 12px;text-align:right;font-size:12px;">R ${e.total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</td>
        <td style="padding:8px 12px;text-align:right;font-size:12px;">R ${paid.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</td>
        <td style="padding:8px 12px;text-align:right;font-size:12px;${statusCls}">${statusLabel}</td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Account Statement</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;padding:20mm}
    h1{font-size:24px;font-weight:800;margin-bottom:4px}
    .sub{font-size:13px;color:#6b7280;margin-bottom:28px}
    table{width:100%;border-collapse:collapse;margin-top:20px}
    thead tr{border-bottom:2px solid #111}
    th{padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280}
    th.r{text-align:right}
    tbody tr{border-bottom:1px solid #f3f4f6}
    tbody tr:nth-child(even){background:#f9fafb}
    .summary{margin-top:24px;text-align:right}
    .summary p{font-size:13px;margin-bottom:4px}
    .due{font-size:16px;font-weight:800;color:#b91c1c}
    .credit{font-size:16px;font-weight:800;color:#15803d}
    @page{size:A4;margin:0}</style>
    </head><body>
    <h1>Account Statement</h1>
    <p class="sub">Generated ${new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
    <table>
      <thead><tr>
        <th>Date</th><th>Invoice #</th><th>Status</th>
        <th class="r">Total</th><th class="r">Paid</th><th class="r">Balance</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <div class="summary">
      ${totalOutstanding > 0 ? `<p class="due">Amount Due: R ${totalOutstanding.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</p>` : ''}
      ${totalCredit > 0 ? `<p class="credit">Credit: R ${totalCredit.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</p>` : ''}
      ${totalOutstanding === 0 && totalCredit === 0 ? '<p style="color:#15803d;font-weight:700;">All invoices paid — account is clear</p>' : ''}
    </div>
    </body></html>`

    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 350) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
        <div className="text-6xl mb-4">📦</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No history yet</h2>
        <p className="text-gray-500 mb-6">Start shopping to see your orders here</p>
        <Link href="/products" className="inline-block px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors">
          Browse Products
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Order History</h2>
          <p className="text-sm text-gray-500 mt-0.5">All your orders, bookings and documents</p>
        </div>
        {entries.some(e => e.type === 'invoice') && (
          <button
            onClick={downloadStatement}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Download Statement
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Total Invoiced</p>
          <p className="text-2xl font-bold text-gray-900">{fmt(stats.totalInvoiced)}</p>
          <p className="text-xs text-gray-400 mt-1">Total billed to you</p>
        </div>

        {/* Total Paid */}
        <div className="bg-green-50 border border-green-100 rounded-2xl shadow-sm p-5">
          <p className="text-xs font-semibold text-green-500 uppercase tracking-wide mb-1">Total Paid</p>
          <p className="text-2xl font-bold text-green-600">{fmt(stats.totalPaid)}</p>
          <p className="text-xs text-green-500 mt-1">Payments recorded</p>
        </div>

        {/* Outstanding */}
        {stats.totalOutstanding > 0 ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl shadow-sm p-5">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1">Outstanding</p>
            <p className="text-2xl font-bold text-red-600">{fmt(stats.totalOutstanding)}</p>
            <p className="text-xs text-red-400 mt-1">Amount still owed</p>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-100 rounded-2xl shadow-sm p-5">
            <p className="text-xs font-semibold text-green-500 uppercase tracking-wide mb-1">Outstanding</p>
            <p className="text-2xl font-bold text-green-600">All Clear</p>
            <p className="text-xs text-green-500 mt-1">No amount owing</p>
          </div>
        )}

        {/* Credits */}
        {stats.totalCredit > 0 ? (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl shadow-sm p-5">
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">Store Credit</p>
            <p className="text-2xl font-bold text-blue-600">{fmt(stats.totalCredit)}</p>
            <p className="text-xs text-blue-400 mt-1">Available credit</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Total Items</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
            <p className="text-xs text-gray-400 mt-1">Across {entries.length} records</p>
          </div>
        )}
      </div>

      {/* Monthly spend chart */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <p className="text-sm font-semibold text-gray-700 mb-4">Monthly Spend — Last 6 Months</p>
        <div className="flex items-end gap-3 h-28">
          {monthly.map((m) => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
              <p className="text-xs text-gray-500 font-medium">{m.total > 0 ? fmt(m.total) : ''}</p>
              <div className="w-full rounded-t-lg bg-red-100 relative" style={{ height: '80px' }}>
                <div
                  className="absolute bottom-0 left-0 right-0 bg-red-600 rounded-t-lg transition-all duration-500"
                  style={{ height: `${Math.round((m.total / maxMonthly) * 80)}px` }}
                />
              </div>
              <p className="text-xs text-gray-500">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-100">
          {TABS.map((t) => {
            const count = counts[t.key] || 0
            if (t.key !== 'all' && count === 0) return null
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  tab === t.key
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {t.label}
                {count > 0 && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm">No records in this category</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((entry) => {
              const meta = TYPE_META[entry.type] || TYPE_META.order
              const statusCls = STATUS_COLOR[entry.status] || 'bg-gray-100 text-gray-600'
              const itemSummary = entry.items.length === 1
                ? entry.items[0].description || entry.items[0].sku
                : `${entry.items.length} items`
              const outstanding = getOutstanding(entry)
              const isInvoice = entry.type === 'invoice'
              const isExpanded = expandedId === entry.id

              return (
                <div key={entry.id}>
                  {/* Row */}
                  <div
                    className={`px-6 py-4 flex items-center gap-4 ${isInvoice ? 'cursor-pointer hover:bg-gray-50/60 transition-colors' : ''}`}
                    onClick={() => isInvoice && setExpandedId(isExpanded ? null : entry.id)}
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0">
                      {meta.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                          {meta.label}
                        </span>
                        <span className="font-semibold text-sm text-gray-900">#{entry.ref}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCls}`}>
                          {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5 truncate">{itemSummary}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(entry.date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    {/* Total + outstanding badge */}
                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                      <p className="font-bold text-gray-900">{fmt(entry.total)}</p>
                      <p className="text-xs text-gray-400">{entry.items.reduce((s, i) => s + i.qty, 0)} item{entry.items.reduce((s, i) => s + i.qty, 0) !== 1 ? 's' : ''}</p>
                      {isInvoice && outstanding > 0 && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          Due {fmt(outstanding)}
                        </span>
                      )}
                      {isInvoice && outstanding === 0 && (entry.amountPaid ?? 0) > 0 && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          Paid
                        </span>
                      )}
                    </div>

                    {/* Expand chevron for invoices */}
                    {isInvoice && (
                      <svg
                        className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>

                  {/* Expanded invoice detail */}
                  {isInvoice && isExpanded && (
                    <div className="bg-gray-50 border-t border-gray-100 px-6 py-4">
                      <table className="w-full text-sm mb-4">
                        <thead>
                          <tr className="text-xs text-gray-400 uppercase border-b border-gray-200">
                            <th className="text-left pb-2 font-semibold">Item</th>
                            <th className="text-center pb-2 font-semibold w-16">Qty</th>
                            <th className="text-right pb-2 font-semibold w-28">Unit Price</th>
                            <th className="text-right pb-2 font-semibold w-28">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.items.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-100">
                              <td className="py-2 text-gray-700">
                                {item.sku && <span className="font-mono text-xs text-blue-600 mr-2">{item.sku}</span>}
                                {item.description}
                              </td>
                              <td className="py-2 text-center text-gray-600">{item.qty}</td>
                              <td className="py-2 text-right text-gray-600">{fmt(item.price)}</td>
                              <td className="py-2 text-right font-semibold text-gray-900">{fmt(item.price * item.qty)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Totals breakdown */}
                      <div className="flex justify-end">
                        <div className="w-64 space-y-1 text-sm">
                          {(() => {
                            const sub = entry.items.reduce((s, i) => s + i.price * i.qty, 0)
                            const disc = entry.discountPct ? sub * (entry.discountPct / 100) : 0
                            const ship = entry.shippingCost ?? 0
                            const vatBase = sub - disc + ship
                            const vat = vatBase * 0.15
                            const paid = entry.amountPaid ?? 0
                            return (
                              <>
                                {disc > 0 && (
                                  <>
                                    <div className="flex justify-between text-gray-500">
                                      <span>Subtotal</span><span>{fmt(sub)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-500">
                                      <span>Discount ({entry.discountPct}%)</span><span>−{fmt(disc)}</span>
                                    </div>
                                  </>
                                )}
                                {ship > 0 && (
                                  <div className="flex justify-between text-gray-500">
                                    <span>Shipping</span><span>{fmt(ship)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-gray-500">
                                  <span>VAT (15%)</span><span>{fmt(vat)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1">
                                  <span>Total</span><span>{fmt(entry.total)}</span>
                                </div>
                                {paid > 0 && (
                                  <div className="flex justify-between text-green-600">
                                    <span>Paid</span><span>−{fmt(paid)}</span>
                                  </div>
                                )}
                                {outstanding > 0 && (
                                  <div className="flex justify-between font-bold text-red-600 border-t border-red-100 pt-1">
                                    <span>Amount Due</span><span>{fmt(outstanding)}</span>
                                  </div>
                                )}
                                {outstanding === 0 && paid > 0 && (
                                  <div className="flex justify-between font-bold text-green-600 border-t border-green-100 pt-1">
                                    <span>Balance</span><span>Paid in full</span>
                                  </div>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
