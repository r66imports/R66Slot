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
  docNumber: string
  status: string
  date: string
  clientName: string
  lineItems: LineItem[]
}

interface Product {
  id: string
  sku: string
  quantity: number
}

interface SalesRow {
  sku: string
  title: string
  totalQty: number
  totalRevenue: number
  invoiceCount: number
  lastSold: string
  inStock: number
}

interface InvoiceDrillRow {
  docNumber: string
  date: string
  clientName: string
  qty: number
  unitPrice: number
  lineTotal: number
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

function fmtPrice(n: number) {
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ReportsPage() {
  const [docs, setDocs] = useState<OrderDocument[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [rangeDays, setRangeDays] = useState(90)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'qty' | 'revenue' | 'count'>('qty')
  const [excludeCancelled, setExcludeCancelled] = useState(true)
  const [drillSku, setDrillSku] = useState<SalesRow | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/orders/documents?type=invoice').then((r) => r.ok ? r.json() : []),
      fetch('/api/admin/products').then((r) => r.ok ? r.json() : []),
    ]).then(([docData, prodData]) => {
      setDocs(Array.isArray(docData) ? docData : [])
      setProducts(Array.isArray(prodData) ? prodData : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // SKU → stock quantity map
  const stockMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of products) {
      if (p.sku) m.set(p.sku.trim().toUpperCase(), p.quantity ?? 0)
    }
    return m
  }, [products])

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
          const inStock = stockMap.get(sku.toUpperCase()) ?? -1
          map.set(key, {
            sku,
            title: title || sku,
            totalQty: li.qty,
            totalRevenue: li.qty * li.unitPrice,
            invoiceCount: 1,
            lastSold: doc.date || '',
            inStock,
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
  }, [docs, rangeDays, search, sortBy, excludeCancelled, stockMap])

  // Invoice drill-down: all invoices containing the selected SKU (any date, not range-filtered)
  const drillRows = useMemo<InvoiceDrillRow[]>(() => {
    if (!drillSku) return []
    const results: InvoiceDrillRow[] = []
    for (const doc of docs) {
      for (const li of doc.lineItems) {
        const { sku } = parseSku(li.description)
        if (sku === drillSku.sku || (!drillSku.sku && li.description.trim() === drillSku.title)) {
          results.push({
            docNumber: doc.docNumber || doc.id,
            date: doc.date || '',
            clientName: doc.clientName || '—',
            qty: li.qty,
            unitPrice: li.unitPrice,
            lineTotal: li.qty * li.unitPrice,
          })
        }
      }
    }
    results.sort((a, b) => b.date.localeCompare(a.date))
    return results
  }, [drillSku, docs])

  const totalQty = rows.reduce((s, r) => s + r.totalQty, 0)
  const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0)
  const uniqueSkus = rows.length

  function downloadCSV() {
    const rangLabel = DATE_RANGES.find((d) => d.days === rangeDays)?.label || 'Custom'
    const headers = ['#', 'SKU', 'Product', 'Units Sold', 'In Stock', 'Revenue (ZAR)', 'Invoices', 'Last Sold']
    const dataRows = rows.map((r, i) => [
      i + 1,
      r.sku || '',
      `"${r.title.replace(/"/g, '""')}"`,
      r.totalQty,
      r.inStock < 0 ? '' : r.inStock,
      r.totalRevenue.toFixed(2),
      r.invoiceCount,
      r.lastSold ? new Date(r.lastSold).toLocaleDateString('en-ZA') : '',
    ])
    const totalsRow = ['', '', 'TOTAL', totalQty, '', totalRevenue.toFixed(2), '', '']
    const csv = [
      `# Sales Report — ${rangLabel} — exported ${new Date().toLocaleDateString('en-ZA')}`,
      headers.join(','),
      ...dataRows.map((r) => r.join(',')),
      totalsRow.join(','),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-report-${rangLabel.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Best-selling items based on invoices — double-click a row to see invoice breakdown</p>
        </div>
        <button
          onClick={downloadCSV}
          disabled={rows.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
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

        <input
          type="text"
          placeholder="Search SKU or product name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white shadow-sm w-56"
        />

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
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">In Stock</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoices</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Sold</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const pct = rows[0].totalQty > 0 ? (row.totalQty / rows[0].totalQty) * 100 : 0
                return (
                  <tr
                    key={row.sku || row.title}
                    className="border-b border-gray-100 hover:bg-indigo-50 transition-colors cursor-pointer select-none"
                    onDoubleClick={() => setDrillSku(row)}
                    title="Double-click to see invoice breakdown"
                  >
                    <td className="py-3 px-4 text-gray-400 text-xs font-medium">{i + 1}</td>
                    <td className="py-3 px-4 font-mono text-xs text-blue-700 font-semibold">
                      {row.sku || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-800">{row.title}</div>
                      <div className="mt-1 h-1.5 rounded-full bg-gray-100 w-full max-w-[200px]">
                        <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-gray-900">{row.totalQty}</span>
                      <span className="text-gray-400 text-xs ml-1">units</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {row.inStock < 0 ? (
                        <span className="text-gray-300 text-xs">—</span>
                      ) : (
                        <span className={`font-semibold text-sm ${row.inStock === 0 ? 'text-red-500' : row.inStock <= 3 ? 'text-amber-600' : 'text-green-600'}`}>
                          {row.inStock}
                        </span>
                      )}
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

      {/* Invoice Drill-down Modal */}
      {drillSku && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDrillSku(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Invoice Breakdown</p>
                <h2 className="text-base font-bold text-gray-900 font-mono">{drillSku.sku || drillSku.title}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{drillSku.sku ? drillSku.title : ''}</p>
              </div>
              <button onClick={() => setDrillSku(null)} className="text-gray-400 hover:text-gray-600 mt-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Stats bar */}
            <div className="flex divide-x divide-gray-100 bg-indigo-50 border-b border-indigo-100">
              <div className="flex-1 px-5 py-3 text-center">
                <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider">Total Sold</p>
                <p className="text-xl font-bold text-indigo-700">{drillRows.reduce((s, r) => s + r.qty, 0)}</p>
              </div>
              <div className="flex-1 px-5 py-3 text-center">
                <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider">In Stock Now</p>
                <p className={`text-xl font-bold ${drillSku.inStock < 0 ? 'text-gray-400' : drillSku.inStock === 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {drillSku.inStock < 0 ? '—' : drillSku.inStock}
                </p>
              </div>
              <div className="flex-1 px-5 py-3 text-center">
                <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider">Revenue</p>
                <p className="text-xl font-bold text-indigo-700">{fmtPrice(drillRows.reduce((s, r) => s + r.lineTotal, 0))}</p>
              </div>
              <div className="flex-1 px-5 py-3 text-center">
                <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider">Invoices</p>
                <p className="text-xl font-bold text-indigo-700">{drillRows.length}</p>
              </div>
            </div>

            {/* Invoice list */}
            <div className="overflow-y-auto max-h-[60vh]">
              {drillRows.length === 0 ? (
                <p className="p-8 text-center text-gray-400 text-sm">No invoices found for this SKU.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                      <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit Price</th>
                      <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillRows.map((r, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2.5 px-4 font-mono text-xs text-blue-700 font-semibold">{r.docNumber}</td>
                        <td className="py-2.5 px-4 text-gray-500 text-xs">{fmtDate(r.date)}</td>
                        <td className="py-2.5 px-4 text-gray-700">{r.clientName}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-gray-900">{r.qty}</td>
                        <td className="py-2.5 px-4 text-right text-gray-600">{fmtPrice(r.unitPrice)}</td>
                        <td className="py-2.5 px-4 text-right font-semibold text-gray-800">{fmtPrice(r.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
