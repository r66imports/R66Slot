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
  return 'R' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function OrdersPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')

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
    const totalSpent = entries
      .filter(e => ['invoice', 'order'].includes(e.type))
      .reduce((s, e) => s + e.total, 0)

    const now = new Date()
    const thisMonth = entries
      .filter(e => {
        const d = new Date(e.date)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((s, e) => s + e.total, 0)

    const totalItems = entries.reduce((s, e) => s + e.items.reduce((si, i) => si + i.qty, 0), 0)

    // Most ordered item
    const skuCount: Record<string, { desc: string; qty: number }> = {}
    entries.forEach(e => e.items.forEach(i => {
      const key = i.sku || i.description
      if (!key) return
      if (!skuCount[key]) skuCount[key] = { desc: i.description || i.sku, qty: 0 }
      skuCount[key].qty += i.qty
    }))
    const topItem = Object.values(skuCount).sort((a, b) => b.qty - a.qty)[0]

    return { totalSpent, thisMonth, totalItems, topItem }
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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Order History</h2>
        <p className="text-sm text-gray-500 mt-0.5">All your orders, bookings and documents</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Total Spent</p>
          <p className="text-2xl font-bold text-gray-900">{fmt(stats.totalSpent)}</p>
          <p className="text-xs text-gray-400 mt-1">Invoices & shop orders</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">This Month</p>
          <p className="text-2xl font-bold text-red-600">{fmt(stats.thisMonth)}</p>
          <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleString('en-ZA', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Total Items</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
          <p className="text-xs text-gray-400 mt-1">Across {entries.length} records</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Most Ordered</p>
          {stats.topItem ? (
            <>
              <p className="text-sm font-bold text-gray-900 line-clamp-1">{stats.topItem.desc}</p>
              <p className="text-xs text-gray-400 mt-1">{stats.topItem.qty}× ordered</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">—</p>
          )}
        </div>
      </div>

      {/* Monthly spend chart */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <p className="text-sm font-semibold text-gray-700 mb-4">Monthly Spend — Last 6 Months</p>
        <div className="flex items-end gap-3 h-28">
          {monthly.map((m) => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
              <p className="text-xs text-gray-500 font-medium">{m.total > 0 ? fmt(m.total).replace('R','R') : ''}</p>
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
              return (
                <div key={entry.id} className="px-6 py-4 flex items-center gap-4">
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

                  {/* Total */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900">{fmt(entry.total)}</p>
                    <p className="text-xs text-gray-400">{entry.items.reduce((s, i) => s + i.qty, 0)} item{entry.items.reduce((s, i) => s + i.qty, 0) !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
