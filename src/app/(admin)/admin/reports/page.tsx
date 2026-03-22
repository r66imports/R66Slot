'use client'

import { useState, useEffect, useMemo } from 'react'

interface LineItem {
  description: string
  qty: number
  unitPrice: number
}

interface OrderDocument {
  id: string
  type: string
  status: string
  date: string
  clientName: string
  lineItems: LineItem[]
}

interface SalesRow {
  sku: string
  title: string
  totalQty: number
  totalRevenue: number
  invoiceCount: number
  lastSold: string
}

const DATE_RANGES = [
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 6 months', days: 180 },
  { label: 'Last 12 months', days: 365 },
  { label: 'All time', days: 0 },
]

function parseSku(description: string): { sku: string; title: string } {
  const sep = description.indexOf(' – ')
  if (sep !== -1) {
    return { sku: description.slice(0, sep).trim(), title: description.slice(sep + 3).trim() }
  }
  return { sku: '', title: description.trim() }
}

export default function ReportsPage() {
  const [docs, setDocs] = useState<OrderDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [rangeDays, setRangeDays] = useState(90)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'qty' | 'revenue' | 'count'>('qty')
  const [excludeCancelled, setExcludeCancelled] = useState(true)

  useEffect(() => {
    fetch('/api/admin/orders/documents?type=invoice')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setDocs(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const rows = useMemo<SalesRow[]>(() => {
    const cutoff = rangeDays > 0
      ? new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000)
      : new Date(0)

    const map = new Map<string, SalesRow>()

    for (const doc of docs) {
      if (excludeCancelled && (doc.status === 'archived' || doc.status === 'rejected')) continue
      const docDate = new Date(doc.date || '')
      if (docDate < cutoff) continue

      for (const li of doc.lineItems) {
        if (!li.description) continue
        const { sku, title } = parseSku(li.description)
        const key = sku || title
        if (!key) continue

        const existing = map.get(key)
        if (existing) {
          existing.totalQty += li.qty
          existing.totalRevenue += li.qty * li.unitPrice
          existing.invoiceCount += 1
          if (doc.date > existing.lastSold) existing.lastSold = doc.date
        } else {
          map.set(key, {
            sku,
            title: title || sku,
            totalQty: li.qty,
            totalRevenue: li.qty * li.unitPrice,
            invoiceCount: 1,
            lastSold: doc.date || '',
          })
        }
      }
    }

    let result = Array.from(map.values())

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((r) =>
        r.sku.toLowerCase().includes(q) || r.title.toLowerCase().includes(q)
      )
    }

    result.sort((a, b) => {
      if (sortBy === 'qty') return b.totalQty - a.totalQty
      if (sortBy === 'revenue') return b.totalRevenue - a.totalRevenue
      return b.invoiceCount - a.invoiceCount
    })

    return result
  }, [docs, rangeDays, search, sortBy, excludeCancelled])

  const totalQty = rows.reduce((s, r) => s + r.totalQty, 0)
  const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0)
  const uniqueSkus = rows.length

  function fmtPrice(n: number) {
    return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  function fmtDate(d: string) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Best-selling items based on invoices — use this to plan your next order</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Date range */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
          {DATE_RANGES.map((dr) => (
            <button
              key={dr.days}
              onClick={() => setRangeDays(dr.days)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                rangeDays === dr.days
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {dr.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search SKU or product name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white shadow-sm w-56"
        />

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'qty' | 'revenue' | 'count')}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white shadow-sm"
        >
          <option value="qty">Sort: Units Sold</option>
          <option value="revenue">Sort: Revenue</option>
          <option value="count">Sort: Invoice Count</option>
        </select>

        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={excludeCancelled}
            onChange={(e) => setExcludeCancelled(e.target.checked)}
            className="rounded"
          />
          Exclude archived / rejected
        </label>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Unique SKUs Sold</div>
          <div className="text-2xl font-bold text-gray-900">{uniqueSkus}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Units Sold</div>
          <div className="text-2xl font-bold text-gray-900">{totalQty.toLocaleString('en-ZA')}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Revenue</div>
          <div className="text-2xl font-bold text-gray-900">{fmtPrice(totalRevenue)}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No sales data for this period</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Units Sold</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoices</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Sold</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const pct = rows[0].totalQty > 0 ? (row.totalQty / rows[0].totalQty) * 100 : 0
                return (
                  <tr key={row.sku || row.title} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-400 text-xs font-medium">{i + 1}</td>
                    <td className="py-3 px-4 font-mono text-xs text-blue-700 font-semibold">
                      {row.sku || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-800">{row.title}</div>
                      {/* Bar showing relative volume */}
                      <div className="mt-1 h-1.5 rounded-full bg-gray-100 w-full max-w-[200px]">
                        <div
                          className="h-1.5 rounded-full bg-indigo-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-gray-900">{row.totalQty}</span>
                      <span className="text-gray-400 text-xs ml-1">units</span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-700">{fmtPrice(row.totalRevenue)}</td>
                    <td className="py-3 px-4 text-right text-gray-500">{row.invoiceCount}</td>
                    <td className="py-3 px-4 text-right text-gray-400 text-xs">{fmtDate(row.lastSold)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
