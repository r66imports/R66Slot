'use client'

import { useState, useEffect } from 'react'

interface InvoiceLine {
  docNumber: string
  type: 'invoice' | 'salesorder'
  date: string
  clientName: string
  qty: number
  synced: boolean
}

interface SkuAuditRow {
  sku: string
  title: string
  supplier: string
  currentQty: number
  impliedStarting: number
  totalSoldQty: number
  syncedSoldQty: number
  totalReservedQty: number
  unsyncedDocs: string[]
  invoices: InvoiceLine[]
  status: 'ok' | 'unsynced' | 'oversold'
}

interface AuditData {
  totalDocs: number
  syncedDocs: number
  unsyncedDocs: number
  rows: SkuAuditRow[]
}

function fmt(d: string) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}

export default function StockAuditPage() {
  const [data, setData] = useState<AuditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'unsynced' | 'oversold' | 'ok'>('all')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [detail, setDetail] = useState<SkuAuditRow | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/orders/stock-audit')
      if (!res.ok) throw new Error(await res.text())
      setData(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Unique suppliers from rows
  const suppliers = data
    ? ['all', ...Array.from(new Set(data.rows.map(r => r.supplier).filter(Boolean))).sort()]
    : ['all']

  const filtered = data?.rows.filter(row => {
    if (filter !== 'all' && row.status !== filter) return false
    if (supplierFilter !== 'all' && row.supplier !== supplierFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!row.sku.toLowerCase().includes(q) && !row.title.toLowerCase().includes(q)) return false
    }
    return true
  }) ?? []

  const counts = {
    all: data?.rows.length ?? 0,
    unsynced: data?.rows.filter(r => r.status === 'unsynced').length ?? 0,
    oversold: data?.rows.filter(r => r.status === 'oversold').length ?? 0,
    ok: data?.rows.filter(r => r.status === 'ok').length ?? 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Audit</h1>
          <p className="text-sm text-gray-500 mt-1">
            Total purchased vs sold vs remaining — click any row for invoice breakdown
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      )}

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Documents</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{data.totalDocs}</p>
          </div>
          <div className="bg-white rounded-lg border border-green-200 p-4">
            <p className="text-xs text-green-600 uppercase tracking-wide">Synced to Stock</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{data.syncedDocs}</p>
          </div>
          <div className="bg-white rounded-lg border border-amber-200 p-4">
            <p className="text-xs text-amber-600 uppercase tracking-wide">Not Yet Synced</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{data.unsyncedDocs}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">SKUs Tracked</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{data.rows.length}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['all', 'unsynced', 'oversold', 'ok'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                f === 'unsynced' ? 'bg-amber-100 text-amber-700' :
                f === 'oversold' ? 'bg-red-100 text-red-700' :
                f === 'ok' ? 'bg-green-100 text-green-700' :
                'bg-gray-200 text-gray-600'
              }`}>{counts[f]}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={supplierFilter}
            onChange={e => setSupplierFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {suppliers.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All Suppliers' : s}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search SKU or product..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-60 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading audit data...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No rows match your filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Supplier</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide" title="Estimated starting stock = Current + Sold + Reserved">Est. Starting</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Sold</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Synced</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reserved (SO)</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">In Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(row => {
                  const unsynced = row.totalSoldQty - row.syncedSoldQty
                  return (
                    <tr
                      key={row.sku}
                      onClick={() => setDetail(row)}
                      className={`cursor-pointer transition-colors ${
                        row.status === 'oversold' ? 'bg-red-50 hover:bg-red-100' :
                        row.status === 'unsynced' ? 'bg-amber-50 hover:bg-amber-100' :
                        'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-3 py-3">
                        {row.status === 'ok' && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">OK</span>}
                        {row.status === 'unsynced' && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Unsynced</span>}
                        {row.status === 'oversold' && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Oversold</span>}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-indigo-700 font-semibold">{row.sku.toUpperCase()}</td>
                      <td className="px-3 py-3 text-gray-900 max-w-[200px] truncate">{row.title}</td>
                      <td className="px-3 py-3 text-gray-500 text-xs">{row.supplier || '—'}</td>
                      <td className="px-3 py-3 text-right font-medium text-gray-700">{row.impliedStarting}</td>
                      <td className="px-3 py-3 text-right font-bold text-gray-900">
                        {row.totalSoldQty || '—'}
                        {unsynced > 0 && (
                          <span className="ml-1 text-xs text-amber-600 font-normal">({unsynced} unsynced)</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-green-700">{row.syncedSoldQty || '—'}</td>
                      <td className="px-3 py-3 text-right text-blue-600">{row.totalReservedQty || '—'}</td>
                      <td className={`px-3 py-3 text-right font-bold ${row.currentQty === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {row.currentQty}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
        <span><strong>Est. Starting</strong> = Current stock + All sold + All reserved</span>
        <span><strong>Total Sold</strong> = Every invoice line item (synced or not)</span>
        <span><strong>Synced</strong> = Stock actually deducted in system</span>
        <span>Click any row for full invoice breakdown</span>
      </div>

      {/* Detail Modal */}
      {detail && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-sm font-bold text-indigo-700">{detail.sku.toUpperCase()}</p>
                  <h2 className="text-lg font-bold text-gray-900 mt-0.5">{detail.title}</h2>
                  {detail.supplier && <p className="text-sm text-gray-500 mt-0.5">Supplier: {detail.supplier}</p>}
                </div>
                <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
              </div>

              {/* SKU stats */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Est. Starting</p>
                  <p className="text-xl font-bold text-gray-900">{detail.impliedStarting}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-red-600">Total Sold</p>
                  <p className="text-xl font-bold text-red-700">{detail.totalSoldQty}</p>
                  <p className="text-xs text-gray-400">{detail.syncedSoldQty} synced</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-600">Reserved (SO)</p>
                  <p className="text-xl font-bold text-blue-700">{detail.totalReservedQty || 0}</p>
                </div>
                <div className={`rounded-lg p-3 text-center ${detail.currentQty === 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className={`text-xs ${detail.currentQty === 0 ? 'text-red-600' : 'text-green-600'}`}>In Stock Now</p>
                  <p className={`text-xl font-bold ${detail.currentQty === 0 ? 'text-red-700' : 'text-green-700'}`}>{detail.currentQty}</p>
                </div>
              </div>
            </div>

            {/* Invoice list */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Doc #</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Client</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Stock Synced</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detail.invoices.map((inv, i) => (
                    <tr key={i} className={inv.synced ? '' : 'bg-amber-50'}>
                      <td className="px-4 py-2.5 font-mono text-xs text-indigo-700 font-semibold">{inv.docNumber}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          inv.type === 'invoice' ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {inv.type === 'invoice' ? 'Invoice' : 'Sales Order'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs">{fmt(inv.date)}</td>
                      <td className="px-4 py-2.5 text-gray-900 max-w-[180px] truncate">{inv.clientName || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-900">{inv.qty}</td>
                      <td className="px-4 py-2.5 text-center">
                        {inv.synced
                          ? <span className="text-green-600 text-sm">✓</span>
                          : <span className="text-amber-500 text-xs font-medium">Pending</span>}
                      </td>
                    </tr>
                  ))}
                  {detail.invoices.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No document history found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
