'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface DashItem {
  id: string
  supplier: string
  retailPrice: string
  estimatedRetailPrice: string
  cutoffDate?: string
  orderPlaced?: boolean
  customers: { qty: number; depositPaid?: boolean; isNew?: boolean }[]
}

function cutoffAlertActive(date?: string): boolean {
  if (!date) return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  const days = Math.ceil((d.getTime() - today.getTime()) / 86_400_000)
  return days >= 0 && days <= 2
}

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

  return (
    <div className="flex gap-5 min-h-[70vh]">
      {/* ─── Sidebar ─── */}
      <aside className="w-44 shrink-0">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden sticky top-4 shadow-sm">
          <div className="px-3 py-2.5 bg-gray-800">
            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Pre-Order</p>
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

        {loading && <div className="py-20 text-center text-gray-400 text-sm">Loading…</div>}

        {/* Supplier list */}
        {!loading && (
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
