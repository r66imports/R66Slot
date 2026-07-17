'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface SupplierContact {
  id: string
  name: string
  code: string
  country: string
  website: string
  preferredCurrency?: string
  isActive?: boolean
}

interface DashboardItem {
  id: string
  sku: string
  description: string
  supplier: string
  retailPrice?: string
  estimatedRetailPrice?: string
  orderPlaced?: boolean
  customers?: { qty: number; paid?: boolean; linkedDocNumber?: string }[]
  eta?: string
  createdAt?: string
}

interface SupplierStat {
  supplier: SupplierContact
  itemCount: number
  totalQty: number
  totalValue: number
  paidQty: number
  linkedDocs: number
  orderPlaced: boolean
  latestEta: string
}

function fmt(n: number) {
  return 'R ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export default function SupplierNetworkPage() {
  const [suppliers, setSuppliers] = useState<SupplierContact[]>([])
  const [items, setItems] = useState<DashboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'value' | 'qty' | 'items' | 'name'>('value')

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/supplier-contacts').then(r => r.json()).catch(() => []),
      fetch('/api/admin/preorder-dashboard').then(r => r.json()).catch(() => []),
    ]).then(([sc, dash]) => {
      setSuppliers(Array.isArray(sc) ? sc : [])
      setItems(Array.isArray(dash) ? dash : [])
      setLoading(false)
    })
  }, [])

  const stats: SupplierStat[] = suppliers.map(sup => {
    const supItems = items.filter(i =>
      i.supplier?.trim().toLowerCase() === sup.name.trim().toLowerCase() ||
      i.supplier?.trim().toLowerCase() === sup.code.trim().toLowerCase()
    )
    let totalQty = 0, totalValue = 0, paidQty = 0, linkedDocs = 0
    let orderPlaced = false
    const etas: string[] = []
    for (const it of supItems) {
      const price = parseFloat(it.retailPrice || it.estimatedRetailPrice || '0')
      const custs = it.customers ?? []
      const qty = custs.reduce((s, c) => s + c.qty, 0)
      totalQty += qty
      totalValue += price * qty
      paidQty += custs.filter(c => c.paid).reduce((s, c) => s + c.qty, 0)
      linkedDocs += custs.filter(c => c.linkedDocNumber).length
      if (it.orderPlaced) orderPlaced = true
      if (it.eta) etas.push(it.eta)
    }
    return {
      supplier: sup,
      itemCount: supItems.length,
      totalQty,
      totalValue,
      paidQty,
      linkedDocs,
      orderPlaced,
      latestEta: etas.sort().at(-1) || '',
    }
  }).filter(s => s.itemCount > 0 || s.totalValue > 0)

  const sorted = [...stats].sort((a, b) => {
    if (sortBy === 'value') return b.totalValue - a.totalValue
    if (sortBy === 'qty') return b.totalQty - a.totalQty
    if (sortBy === 'items') return b.itemCount - a.itemCount
    return a.supplier.name.localeCompare(b.supplier.name)
  })

  const maxValue = Math.max(1, ...sorted.map(s => s.totalValue))
  const totalValue = stats.reduce((s, x) => s + x.totalValue, 0)
  const totalQty = stats.reduce((s, x) => s + x.totalQty, 0)
  const totalItems = stats.reduce((s, x) => s + x.itemCount, 0)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Network</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pre-order pipeline by supplier</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/supplier-contacts" className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
            Contacts
          </Link>
          <Link href="/admin/supplier-stock-sheets" className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
            Stock Sheets
          </Link>
          <Link href="/admin/suppliers" className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
            Orders
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Active Suppliers', value: stats.length, sub: `of ${suppliers.length} total` },
            { label: 'Total Items', value: totalItems, sub: 'product lines' },
            { label: 'Total Qty Booked', value: totalQty, sub: 'units' },
            { label: 'Pipeline Value', value: fmt(totalValue), sub: 'excl. VAT', big: true },
          ].map(c => (
            <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{c.label}</p>
              <p className={`font-bold text-gray-900 mt-1 ${c.big ? 'text-lg' : 'text-2xl'}`}>{c.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sort */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Sort by</span>
        {(['value', 'qty', 'items', 'name'] as const).map(k => (
          <button
            key={k}
            onClick={() => setSortBy(k)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${sortBy === k ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {k === 'value' ? 'Value' : k === 'qty' ? 'Qty' : k === 'items' ? 'Items' : 'Name'}
          </button>
        ))}
      </div>

      {/* Graph / bars */}
      {loading ? (
        <div className="py-20 text-center text-gray-400 text-sm">Loading…</div>
      ) : sorted.length === 0 ? (
        <div className="py-20 text-center text-gray-400 text-sm">
          No pre-order data yet. Add items on the{' '}
          <Link href="/admin/preorder-dashboard" className="text-indigo-600 hover:underline">Pre-Order Dashboard</Link>.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Supplier</span>
            <div className="grid grid-cols-4 gap-6 text-xs font-bold text-gray-400 uppercase tracking-wide w-80 text-right">
              <span>Items</span>
              <span>Qty</span>
              <span>Paid</span>
              <span>Value</span>
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {sorted.map(s => {
              const barWidth = Math.max(4, Math.round((s.totalValue / maxValue) * 100))
              const paidPct = s.totalQty > 0 ? Math.round((s.paidQty / s.totalQty) * 100) : 0
              return (
                <div key={s.supplier.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-4">
                    {/* Supplier info */}
                    <div className="min-w-[160px] shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">{s.supplier.name}</span>
                        {s.orderPlaced && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">Order Placed</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] text-gray-400">{s.supplier.code}</span>
                        {s.supplier.country && <span className="text-[10px] text-gray-400">· {s.supplier.country}</span>}
                        {s.latestEta && <span className="text-[10px] text-indigo-500">ETA {s.latestEta}</span>}
                      </div>
                    </div>

                    {/* Bar */}
                    <div className="flex-1 mx-4">
                      <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      {paidPct > 0 && (
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full rounded-full bg-green-400 transition-all"
                            style={{ width: `${paidPct}%` }}
                            title={`${paidPct}% paid`}
                          />
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-6 text-sm w-80 text-right shrink-0">
                      <span className="font-semibold text-gray-700">{s.itemCount}</span>
                      <span className="font-semibold text-gray-700">{s.totalQty}</span>
                      <span className={`font-semibold ${paidPct === 100 ? 'text-green-600' : paidPct > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                        {s.paidQty}/{s.totalQty}
                      </span>
                      <span className="font-bold text-indigo-700 tabular-nums">{fmt(s.totalValue)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center gap-6 text-[11px] text-gray-400">
            <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-full bg-indigo-400" /> Pipeline value</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-green-400" /> Paid ratio</div>
          </div>
        </div>
      )}
    </div>
  )
}
