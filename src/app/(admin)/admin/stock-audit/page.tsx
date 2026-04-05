'use client'

import { useState, useEffect } from 'react'

interface SkuAuditRow {
  sku: string
  title: string
  currentQty: number
  soldQty: number
  reservedQty: number
  unsyncedQty: number
  unsyncedDocs: string[]
  status: 'ok' | 'unsynced' | 'oversold'
}

interface AuditData {
  totalDocs: number
  syncedDocs: number
  unsyncedDocs: number
  rows: SkuAuditRow[]
}

export default function StockAuditPage() {
  const [data, setData] = useState<AuditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'unsynced' | 'oversold' | 'ok'>('all')

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

  const filtered = data?.rows.filter(row => {
    if (filter !== 'all' && row.status !== filter) return false
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
          <p className="text-sm text-gray-500 mt-1">Compare current stock against invoices & sales orders</p>
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
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Synced</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{data.syncedDocs}</p>
          </div>
          <div className="bg-white rounded-lg border border-amber-200 p-4">
            <p className="text-xs text-amber-600 uppercase tracking-wide">Unsynced Docs</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{data.unsyncedDocs}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">SKUs Tracked</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{data.rows.length}</p>
          </div>
        </div>
      )}

      {/* Filter tabs + search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['all', 'unsynced', 'oversold', 'ok'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                f === 'unsynced' ? 'bg-amber-100 text-amber-700' :
                f === 'oversold' ? 'bg-red-100 text-red-700' :
                f === 'ok' ? 'bg-green-100 text-green-700' :
                'bg-gray-200 text-gray-600'
              }`}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search SKU or product..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">In Stock</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sold</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reserved</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unsynced</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unsynced Docs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(row => (
                  <tr
                    key={row.sku}
                    className={
                      row.status === 'oversold' ? 'bg-red-50 hover:bg-red-100' :
                      row.status === 'unsynced' ? 'bg-amber-50 hover:bg-amber-100' :
                      'hover:bg-gray-50'
                    }
                  >
                    <td className="px-4 py-3">
                      {row.status === 'ok' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          OK
                        </span>
                      )}
                      {row.status === 'unsynced' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          Unsynced
                        </span>
                      )}
                      {row.status === 'oversold' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Oversold
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.sku}</td>
                    <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{row.title}</td>
                    <td className={`px-4 py-3 text-right font-medium ${row.currentQty === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {row.currentQty}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.soldQty || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.reservedQty || '—'}</td>
                    <td className={`px-4 py-3 text-right font-medium ${row.unsyncedQty > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                      {row.unsyncedQty || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {row.unsyncedDocs.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.unsyncedDocs.slice(0, 3).map(d => (
                            <span key={d} className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono">{d}</span>
                          ))}
                          {row.unsyncedDocs.length > 3 && (
                            <span className="text-xs text-gray-400">+{row.unsyncedDocs.length - 3} more</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <span><span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1"></span>OK — stock deducted, no issues</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1"></span>Unsynced — invoices/SOs not yet deducted from stock</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1"></span>Oversold — sold more than starting stock (stock floored at 0)</span>
      </div>
    </div>
  )
}
