'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SupplierContact {
  id: string
  name: string
  code: string
  country: string
  preferredCurrency?: string
}

interface DashItem {
  id: string
  sku: string
  description: string
  supplier: string
  retailPrice?: string
  estimatedRetailPrice?: string
  orderPlaced?: boolean
  customers?: { qty: number; paid?: boolean }[]
  eta?: string
}

interface WsItem {
  qty: number
  wholesalePrice: number
  sku: string
  description: string
  sentToInventory?: boolean
}

interface WsSheet {
  id: string
  name: string
  supplier: string
  date: string
  archived: boolean
  currency: string
  supplierInvNumber?: string
  items: WsItem[]
}

interface PipelineStat {
  supplier: SupplierContact
  itemCount: number
  totalQty: number
  totalValue: number
  paidQty: number
  orderPlaced: boolean
  latestEta: string
}

interface WsStat {
  supplier: SupplierContact
  sheetCount: number
  activeCount: number
  archivedCount: number
  totalCost: number
  activeCost: number
  totalItems: number
  latestDate: string
}

type Tab = 'overview' | 'pipeline' | 'worksheets' | 'by-supplier'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return 'R ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return `R${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `R${Math.round(n / 1_000)}k`
  return `R${Math.round(n)}`
}

function wsValue(sheet: WsSheet) {
  return (sheet.items || []).reduce((s, i) => s + (i.wholesalePrice || 0) * (i.qty || 0), 0)
}

function matchSup(name: string, sup: SupplierContact) {
  if (!name) return false
  const n = name.trim().toLowerCase()
  return n === sup.name.trim().toLowerCase() || n === sup.code.trim().toLowerCase()
}

// ─── Chart components ──────────────────────────────────────────────────────────

function SageTable({ title, rows, valueLabel }: {
  title: string
  rows: { name: string; value: number }[]
  valueLabel: string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-700">
        <span className="text-sm font-semibold text-white">{title}</span>
        <span className="text-[11px] text-gray-300 font-medium">{valueLabel} ▼</span>
      </div>
      <div className="bg-gray-600">
        <table className="w-full">
          <thead>
            <tr>
              <th className="px-4 py-1.5 text-left text-[11px] text-gray-300 font-semibold">Name</th>
              <th className="px-4 py-1.5 text-right text-[11px] text-gray-300 font-semibold">{valueLabel}</th>
            </tr>
          </thead>
        </table>
      </div>
      <div className="overflow-hidden max-h-52 overflow-y-auto">
        <table className="w-full text-sm">
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={2} className="px-4 py-6 text-center text-xs text-gray-400">No data yet</td></tr>
            ) : rows.slice(0, 8).map((r, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2 text-xs text-blue-600 font-medium">{r.name}</td>
                <td className="px-4 py-2 text-xs text-right tabular-nums text-gray-700 font-semibold">{fmt(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function VertBarChart({ title, data, color = 'bg-green-500', subtitle }: {
  title: string
  data: { label: string; value: number }[]
  color?: string
  subtitle?: string
}) {
  const max = Math.max(1, ...data.map(d => d.value))
  const gridLines = [1, 0.75, 0.5, 0.25, 0]

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-700">
        <div>
          <span className="text-sm font-semibold text-white">{title}</span>
          {subtitle && <span className="text-[10px] text-gray-400 ml-2">{subtitle}</span>}
        </div>
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <div className="p-4">
        {data.length === 0 ? (
          <div className="h-36 flex items-center justify-center text-xs text-gray-300">No data</div>
        ) : (
          <div className="flex gap-2">
            {/* Y-axis */}
            <div className="flex flex-col justify-between h-36 pr-1 shrink-0">
              {gridLines.map(g => (
                <span key={g} className="text-[8px] text-gray-400 leading-none text-right">{g > 0 ? fmtShort(g * max) : 'R0'}</span>
              ))}
            </div>
            {/* Chart */}
            <div className="flex-1 relative">
              {/* Gridlines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none h-36">
                {gridLines.map(g => (
                  <div key={g} className="border-t border-gray-100 w-full" />
                ))}
              </div>
              {/* Bars */}
              <div className="flex items-end gap-1 h-36">
                {data.map((d, i) => {
                  const pct = max > 0 ? Math.max(2, (d.value / max) * 100) : 2
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-0.5">
                      {d.value > 0 && (
                        <span className="text-[8px] text-gray-500 font-medium leading-none">{fmtShort(d.value)}</span>
                      )}
                      <div
                        className={`w-3/4 ${color} rounded-t min-h-[2px] transition-all`}
                        style={{ height: `${pct}%` }}
                        title={`${d.label}: ${fmt(d.value)}`}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
        {/* X-axis labels */}
        {data.length > 0 && (
          <div className="flex gap-2 mt-2 ml-8 border-t border-gray-100 pt-1.5">
            {data.map((d, i) => (
              <div key={i} className="flex-1 text-center">
                <span className="text-[8px] text-gray-400 block truncate">{d.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SupplierNetworkPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [sortBy, setSortBy] = useState<'value' | 'qty' | 'items' | 'name'>('value')
  const [wsFilter, setWsFilter] = useState<'all' | 'active' | 'archived'>('all')
  const [wsSupplier, setWsSupplier] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [suppliers, setSuppliers] = useState<SupplierContact[]>([])
  const [dashItems, setDashItems] = useState<DashItem[]>([])
  const [worksheets, setWorksheets] = useState<WsSheet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/supplier-contacts').then(r => r.json()).catch(() => []),
      fetch('/api/admin/preorder-dashboard').then(r => r.json()).catch(() => []),
      fetch('/api/admin/worksheets').then(r => r.json()).catch(() => []),
    ]).then(([sc, dash, ws]) => {
      setSuppliers(Array.isArray(sc) ? sc : [])
      setDashItems(Array.isArray(dash) ? dash : [])
      setWorksheets(Array.isArray(ws) ? ws : [])
      setLoading(false)
    })
  }, [])

  // ─── Compute stats ──────────────────────────────────────────────────────────

  const pipelineStats: PipelineStat[] = suppliers.map(sup => {
    const items = dashItems.filter(i => matchSup(i.supplier, sup))
    let totalQty = 0, totalValue = 0, paidQty = 0, orderPlaced = false
    const etas: string[] = []
    for (const it of items) {
      const price = parseFloat(it.retailPrice || it.estimatedRetailPrice || '0')
      const custs = it.customers ?? []
      const qty = custs.reduce((s, c) => s + c.qty, 0)
      totalQty += qty
      totalValue += price * qty
      paidQty += custs.filter(c => c.paid).reduce((s, c) => s + c.qty, 0)
      if (it.orderPlaced) orderPlaced = true
      if (it.eta) etas.push(it.eta)
    }
    return { supplier: sup, itemCount: items.length, totalQty, totalValue, paidQty, orderPlaced, latestEta: etas.sort().at(-1) || '' }
  }).filter(s => s.itemCount > 0)

  const wsStats: WsStat[] = suppliers.map(sup => {
    const sheets = worksheets.filter(ws => matchSup(ws.supplier, sup))
    const active = sheets.filter(w => !w.archived)
    const archived = sheets.filter(w => w.archived)
    const totalCost = sheets.reduce((s, w) => s + wsValue(w), 0)
    return {
      supplier: sup,
      sheetCount: sheets.length,
      activeCount: active.length,
      archivedCount: archived.length,
      totalCost,
      activeCost: active.reduce((s, w) => s + wsValue(w), 0),
      totalItems: sheets.reduce((s, w) => s + (w.items?.length || 0), 0),
      latestDate: sheets.map(w => w.date).filter(Boolean).sort().at(-1) || '',
    }
  }).filter(s => s.sheetCount > 0)

  // Totals
  const totalPipelineValue = pipelineStats.reduce((s, x) => s + x.totalValue, 0)
  const totalPipelineQty = pipelineStats.reduce((s, x) => s + x.totalQty, 0)
  const totalPipelineItems = pipelineStats.reduce((s, x) => s + x.itemCount, 0)
  const unmatchedWsValue = worksheets
    .filter(ws => !suppliers.some(s => matchSup(ws.supplier, s)))
    .reduce((s, w) => s + wsValue(w), 0)
  const totalWsCost = wsStats.reduce((s, x) => s + x.totalCost, 0) + unmatchedWsValue
  const totalActiveWs = worksheets.filter(w => !w.archived).length
  const totalArchivedWs = worksheets.filter(w => w.archived).length

  // Sorted pipeline
  const sortedPipeline = [...pipelineStats].sort((a, b) => {
    if (sortBy === 'value') return b.totalValue - a.totalValue
    if (sortBy === 'qty') return b.totalQty - a.totalQty
    if (sortBy === 'items') return b.itemCount - a.itemCount
    return a.supplier.name.localeCompare(b.supplier.name)
  })
  const maxPipelineValue = Math.max(1, ...sortedPipeline.map(s => s.totalValue))

  // Chart data
  const pipelineChartData = [...pipelineStats]
    .sort((a, b) => b.totalValue - a.totalValue).slice(0, 8)
    .map(s => ({ label: s.supplier.code || s.supplier.name.slice(0, 5), value: s.totalValue }))

  const purchasesChartData = [...wsStats]
    .sort((a, b) => b.totalCost - a.totalCost).slice(0, 8)
    .map(s => ({ label: s.supplier.code || s.supplier.name.slice(0, 5), value: s.totalCost }))

  // Monthly from worksheets (last 8 months)
  const monthlyMap = worksheets.reduce((acc, ws) => {
    if (!ws.date) return acc
    const m = ws.date.substring(0, 7)
    acc[m] = (acc[m] || 0) + wsValue(ws)
    return acc
  }, {} as Record<string, number>)
  const monthlySeries = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b)).slice(-8)
    .map(([m, v]) => ({
      label: new Date(m + '-01').toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' }),
      value: v,
    }))

  // Supplier table data for Sage tables
  const topByPipeline = [...pipelineStats]
    .sort((a, b) => b.totalValue - a.totalValue)
    .map(s => ({ name: s.supplier.name, value: s.totalValue }))

  const topByPurchases = [...wsStats]
    .sort((a, b) => b.totalCost - a.totalCost)
    .map(s => ({ name: s.supplier.name, value: s.totalCost }))

  // Worksheet tab filters
  const wsSupplierNames = [...new Set(worksheets.map(w => w.supplier).filter(Boolean))].sort()
  const filteredWs = worksheets.filter(ws => {
    if (wsFilter === 'active' && ws.archived) return false
    if (wsFilter === 'archived' && !ws.archived) return false
    if (wsSupplier !== 'all' && ws.supplier?.trim().toLowerCase() !== wsSupplier.toLowerCase()) return false
    return true
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  // Combined supplier list for By Supplier tab
  const allActiveSupplierIds = new Set([
    ...pipelineStats.map(s => s.supplier.id),
    ...wsStats.map(s => s.supplier.id),
  ])

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'pipeline', label: 'Pipeline' },
    { key: 'worksheets', label: `Worksheets (${worksheets.length})` },
    { key: 'by-supplier', label: 'By Supplier' },
  ]

  const NAV_PAGES = [
    { label: 'Work Sheet', href: '/admin/worksheet' },
    { label: 'Pre-Orders', href: '/admin/preorder-dashboard' },
    { label: 'Supplier Orders', href: '/admin/suppliers' },
    { label: 'Contacts', href: '/admin/supplier-contacts' },
    { label: 'Stock Sheets', href: '/admin/supplier-stock-sheets' },
  ]

  return (
    <div className="flex gap-5 min-h-[70vh]">
      {/* ─── Left Sidebar ─── */}
      <aside className="w-44 shrink-0">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden sticky top-4 shadow-sm">
          <div className="px-3 py-2.5 bg-gray-800">
            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Supplier Network</p>
          </div>
          <nav className="p-2 space-y-0.5">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-2 pt-1.5 pb-1">Views</p>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg font-medium transition-colors ${tab === t.key ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {t.label}
              </button>
            ))}
            <div className="border-t border-gray-100 my-2" />
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-2 pb-1">Pages</p>
            {NAV_PAGES.map(p => (
              <Link
                key={p.href}
                href={p.href}
                className="flex items-center justify-between px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-lg font-medium"
              >
                <span>{p.label}</span>
                <span className="text-gray-300 text-[10px]">↗</span>
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <div className="flex-1 min-w-0 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Network</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pipeline, purchases and supplier management</p>
        </div>

        {/* KPI Summary Cards */}
        {!loading && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-sm">
              <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wide">Pre-Order Pipeline</p>
              <p className="font-bold text-gray-900 mt-1 text-xl tabular-nums">{fmt(totalPipelineValue)}</p>
              <p className="text-xs text-indigo-400 mt-0.5">{totalPipelineItems} items · {totalPipelineQty} units booked</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
              <p className="text-[11px] font-semibold text-green-500 uppercase tracking-wide">Worksheet Purchases</p>
              <p className="font-bold text-gray-900 mt-1 text-xl tabular-nums">{fmt(totalWsCost)}</p>
              <p className="text-xs text-green-500 mt-0.5">{totalActiveWs} active · {totalArchivedWs} archived</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Active Suppliers</p>
              <p className="font-bold text-gray-900 mt-1 text-xl">{allActiveSupplierIds.size}</p>
              <p className="text-xs text-gray-400 mt-0.5">of {suppliers.length} total contacts</p>
            </div>
          </div>
        )}

        {loading && <div className="py-20 text-center text-gray-400 text-sm">Loading…</div>}

        {/* ═══════════════════════════════════════════════════════ OVERVIEW ═══ */}
        {!loading && tab === 'overview' && (
          <div className="space-y-4">
            {/* Row 1 — Pipeline */}
            <div className="grid grid-cols-2 gap-4">
              <SageTable title="Top Suppliers by Pipeline Value" rows={topByPipeline} valueLabel="Pipeline Value" />
              <VertBarChart title="Pipeline by Supplier" data={pipelineChartData} color="bg-indigo-500" subtitle="pre-order retail value" />
            </div>

            {/* Row 2 — Purchases */}
            <div className="grid grid-cols-2 gap-4">
              <SageTable title="Top Suppliers by Purchases" rows={topByPurchases} valueLabel="Purchases Value" />
              <VertBarChart
                title={monthlySeries.length > 1 ? 'Purchases by Month' : 'Purchases by Supplier'}
                data={monthlySeries.length > 1 ? monthlySeries : purchasesChartData}
                color="bg-green-500"
                subtitle={monthlySeries.length > 1 ? 'from worksheets' : 'worksheet cost'}
              />
            </div>

            {/* Recent Worksheets */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-700">
                <span className="text-sm font-semibold text-white">Recent Worksheets</span>
                <button onClick={() => setTab('worksheets')} className="text-xs text-indigo-300 hover:text-white transition-colors">View all →</button>
              </div>
              {worksheets.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  No worksheets yet.{' '}
                  <Link href="/admin/worksheet" className="text-indigo-600 hover:underline">Open Worksheet →</Link>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-600">
                    <tr>
                      <th className="px-4 py-1.5 text-left text-[11px] text-gray-300 font-semibold">Date</th>
                      <th className="px-4 py-1.5 text-left text-[11px] text-gray-300 font-semibold">Supplier</th>
                      <th className="px-4 py-1.5 text-left text-[11px] text-gray-300 font-semibold">Name</th>
                      <th className="px-4 py-1.5 text-right text-[11px] text-gray-300 font-semibold">Items</th>
                      <th className="px-4 py-1.5 text-right text-[11px] text-gray-300 font-semibold">Cost</th>
                      <th className="px-4 py-1.5 text-center text-[11px] text-gray-300 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...worksheets].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 7).map((ws, i) => (
                      <tr key={ws.id} className={i % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                        <td className="px-4 py-1.5 text-xs text-gray-600 tabular-nums">{ws.date || '—'}</td>
                        <td className="px-4 py-1.5 text-xs font-medium text-blue-600">{ws.supplier || '—'}</td>
                        <td className="px-4 py-1.5 text-xs text-gray-600">{ws.name || '—'}</td>
                        <td className="px-4 py-1.5 text-xs text-right text-gray-600">{ws.items?.length || 0}</td>
                        <td className="px-4 py-1.5 text-xs text-right tabular-nums font-semibold text-gray-800">{fmt(wsValue(ws))}</td>
                        <td className="px-4 py-1.5 text-center">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${ws.archived ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                            {ws.archived ? 'Archived' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Supplier Reports links (Sage-style) */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 bg-gray-700">
                <span className="text-sm font-semibold text-white">Supplier Reports</span>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { label: 'List of Suppliers', href: '/admin/supplier-contacts', desc: 'View and manage supplier contact details.' },
                  { label: 'Supplier Orders', href: '/admin/suppliers', desc: 'All supplier order sheets and invoice tracking.' },
                  { label: 'Stock Sheets', href: '/admin/supplier-stock-sheets', desc: 'Uploaded price lists and Google Sheets per supplier.' },
                  { label: 'Pre-Order Dashboard', href: '/admin/preorder-dashboard', desc: 'Customer reservations and booking pipeline.' },
                  { label: 'Work Sheet', href: '/admin/worksheet', desc: 'Costing and purchase order worksheets.' },
                ].map(r => (
                  <Link key={r.href} href={r.href} className="flex items-center gap-4 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <span className="text-sm text-blue-600 font-medium w-44 shrink-0">{r.label}</span>
                    <span className="text-xs text-gray-500">{r.desc}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ PIPELINE ═══ */}
        {!loading && tab === 'pipeline' && (
          <div className="space-y-4">
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

            {sortedPipeline.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">
                No pre-order pipeline yet.{' '}
                <Link href="/admin/preorder-dashboard" className="text-indigo-600 hover:underline">Open Pre-Order Dashboard →</Link>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Supplier</span>
                  <div className="grid grid-cols-4 gap-6 text-xs font-bold text-gray-400 uppercase tracking-wide w-80 text-right">
                    <span>Items</span><span>Qty</span><span>Paid</span><span>Value</span>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {sortedPipeline.map(s => {
                    const barPct = Math.max(4, Math.round((s.totalValue / maxPipelineValue) * 100))
                    const paidPct = s.totalQty > 0 ? Math.round((s.paidQty / s.totalQty) * 100) : 0
                    return (
                      <div key={s.supplier.id} className="px-5 py-3.5">
                        <div className="flex items-center justify-between gap-4">
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
                          <div className="flex-1 mx-4">
                            <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400" style={{ width: `${barPct}%` }} />
                            </div>
                            {paidPct > 0 && (
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                                <div className="h-full rounded-full bg-green-400" style={{ width: `${paidPct}%` }} title={`${paidPct}% paid`} />
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-4 gap-6 text-sm w-80 text-right shrink-0">
                            <span className="font-semibold text-gray-700">{s.itemCount}</span>
                            <span className="font-semibold text-gray-700">{s.totalQty}</span>
                            <span className={`font-semibold ${paidPct === 100 ? 'text-green-600' : paidPct > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{s.paidQty}/{s.totalQty}</span>
                            <span className="font-bold text-indigo-700 tabular-nums">{fmt(s.totalValue)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center gap-6 text-[11px] text-gray-400">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-full bg-indigo-400" /> Pipeline value</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-green-400" /> Paid ratio</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ WORKSHEETS ═══ */}
        {!loading && tab === 'worksheets' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'active', 'archived'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setWsFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${wsFilter === f ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {f === 'all' ? `All (${worksheets.length})` : f === 'active' ? `Active (${totalActiveWs})` : `Archived (${totalArchivedWs})`}
                </button>
              ))}
              <select
                value={wsSupplier}
                onChange={e => setWsSupplier(e.target.value)}
                className="px-2.5 py-1 border border-gray-200 rounded-lg text-xs text-gray-700 bg-white"
              >
                <option value="all">All suppliers</option>
                {wsSupplierNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <Link href="/admin/worksheet" className="ml-auto px-4 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                Open Worksheet ↗
              </Link>
            </div>

            {/* Summary cards for worksheets tab */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Total Worksheets</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{worksheets.length}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 shadow-sm">
                <p className="text-[10px] text-green-500 font-semibold uppercase tracking-wide">Active</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{totalActiveWs}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 shadow-sm">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Archived</p>
                <p className="text-xl font-bold text-gray-500 mt-0.5">{totalArchivedWs}</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-700 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">
                  {filteredWs.length} worksheet{filteredWs.length !== 1 ? 's' : ''}
                </span>
              </div>
              {filteredWs.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400">No worksheets match this filter.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-600">
                    <tr>
                      <th className="px-4 py-2 text-left text-[11px] text-gray-300 font-semibold">Date</th>
                      <th className="px-4 py-2 text-left text-[11px] text-gray-300 font-semibold">Supplier</th>
                      <th className="px-4 py-2 text-left text-[11px] text-gray-300 font-semibold">Name</th>
                      <th className="px-4 py-2 text-left text-[11px] text-gray-300 font-semibold">Inv #</th>
                      <th className="px-4 py-2 text-right text-[11px] text-gray-300 font-semibold">Items</th>
                      <th className="px-4 py-2 text-right text-[11px] text-gray-300 font-semibold">Total Cost</th>
                      <th className="px-4 py-2 text-center text-[11px] text-gray-300 font-semibold">Status</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWs.map((ws, i) => (
                      <tr key={ws.id} className={i % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                        <td className="px-4 py-2 text-xs text-gray-600 tabular-nums">{ws.date || '—'}</td>
                        <td className="px-4 py-2 text-xs font-medium text-blue-600">{ws.supplier || '—'}</td>
                        <td className="px-4 py-2 text-xs text-gray-700 max-w-[160px] truncate">{ws.name || '—'}</td>
                        <td className="px-4 py-2 text-xs text-gray-500 font-mono">{ws.supplierInvNumber || '—'}</td>
                        <td className="px-4 py-2 text-xs text-right text-gray-600">{ws.items?.length || 0}</td>
                        <td className="px-4 py-2 text-xs text-right tabular-nums font-semibold text-gray-800">{fmt(wsValue(ws))}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${ws.archived ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                            {ws.archived ? 'Archived' : 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Link
                            href={`/admin/worksheet?id=${ws.id}`}
                            className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-100 font-medium"
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ BY SUPPLIER ═══ */}
        {!loading && tab === 'by-supplier' && (
          <div className="space-y-3">
            {suppliers.filter(s => allActiveSupplierIds.has(s.id)).length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                No supplier data yet. Add items on the{' '}
                <Link href="/admin/preorder-dashboard" className="text-indigo-600 hover:underline">Pre-Order Dashboard</Link>{' '}
                or open a{' '}
                <Link href="/admin/worksheet" className="text-indigo-600 hover:underline">Worksheet</Link>.
              </div>
            ) : (
              suppliers
                .filter(s => allActiveSupplierIds.has(s.id))
                .map(sup => {
                  const pipe = pipelineStats.find(s => s.supplier.id === sup.id)
                  const ws = wsStats.find(s => s.supplier.id === sup.id)
                  const expanded = expandedId === sup.id
                  return (
                    <div key={sup.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                      <button
                        onClick={() => setExpandedId(expanded ? null : sup.id)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-sm">{sup.name}</span>
                            <span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-1.5 rounded">{sup.code}</span>
                            {sup.country && <span className="text-[10px] text-gray-400">{sup.country}</span>}
                            {pipe?.orderPlaced && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">Order Placed</span>}
                          </div>
                          <div className="flex items-center gap-5 mt-0.5">
                            {pipe && <span className="text-xs text-indigo-600 font-medium">Pipeline {fmt(pipe.totalValue)} · {pipe.itemCount} items</span>}
                            {ws && <span className="text-xs text-green-600 font-medium">Purchases {fmt(ws.totalCost)} · {ws.sheetCount} worksheet{ws.sheetCount !== 1 ? 's' : ''}</span>}
                            {pipe?.latestEta && <span className="text-[11px] text-indigo-400">ETA {pipe.latestEta}</span>}
                          </div>
                        </div>
                        <span className="text-gray-400 text-sm shrink-0">{expanded ? '▲' : '▼'}</span>
                      </button>

                      {expanded && (
                        <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 grid grid-cols-2 gap-6">
                          {/* Pipeline column */}
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Pre-Order Pipeline</p>
                            {pipe ? (
                              <div className="space-y-1.5 text-xs">
                                {[
                                  { label: 'Product Lines', value: String(pipe.itemCount) },
                                  { label: 'Total Qty Booked', value: String(pipe.totalQty) },
                                  { label: 'Qty Paid', value: `${pipe.paidQty} / ${pipe.totalQty}` },
                                  { label: 'Pipeline Value', value: fmt(pipe.totalValue), bold: true, color: 'text-indigo-700' },
                                  ...(pipe.latestEta ? [{ label: 'ETA', value: pipe.latestEta, color: 'text-indigo-500' }] : []),
                                ].map(r => (
                                  <div key={r.label} className="flex justify-between">
                                    <span className="text-gray-500">{r.label}</span>
                                    <span className={`font-semibold ${r.color || 'text-gray-800'} ${r.bold ? 'font-bold' : ''}`}>{r.value}</span>
                                  </div>
                                ))}
                                <Link href="/admin/preorder-dashboard" className="text-[11px] text-indigo-600 hover:underline block mt-2">
                                  View in Pre-Orders →
                                </Link>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400">No pipeline items</p>
                            )}
                          </div>

                          {/* Worksheets column */}
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Purchase History (Worksheets)</p>
                            {ws ? (
                              <div className="space-y-1.5 text-xs">
                                {[
                                  { label: 'Total Worksheets', value: String(ws.sheetCount) },
                                  { label: 'Active', value: String(ws.activeCount), color: 'text-green-600' },
                                  { label: 'Archived', value: String(ws.archivedCount), color: 'text-gray-400' },
                                  { label: 'Total Purchase Cost', value: fmt(ws.totalCost), bold: true, color: 'text-green-700' },
                                  { label: 'Active Value', value: fmt(ws.activeCost), color: 'text-gray-600' },
                                  ...(ws.latestDate ? [{ label: 'Latest Worksheet', value: ws.latestDate }] : []),
                                ].map(r => (
                                  <div key={r.label} className="flex justify-between">
                                    <span className="text-gray-500">{r.label}</span>
                                    <span className={`font-semibold ${r.color || 'text-gray-800'} ${r.bold ? 'font-bold' : ''}`}>{r.value}</span>
                                  </div>
                                ))}
                                <Link href="/admin/worksheet" className="text-[11px] text-indigo-600 hover:underline block mt-2">
                                  Open Worksheet →
                                </Link>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400">No worksheets for this supplier</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
