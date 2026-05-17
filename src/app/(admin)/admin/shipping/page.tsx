'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface ShippingZone {
  id: string
  name: string
  regions: string
  rate: string
  freeAbove: string
  enabled: boolean
}

interface ShippingRow {
  id: string
  docNumber: string
  date: string
  clientName: string
  shippingMethod: string
  shippingCost: number
  status: string
  shippingPaid: boolean
  shippingPaidAt: string | null
}

interface AccountsData {
  rows: ShippingRow[]
  total: number
  totalPaid: number
  outstanding: number
}

const DEFAULT_ZONES: ShippingZone[] = [
  { id: '1', name: 'Local (Gauteng)',         regions: 'Gauteng',          rate: '75',  freeAbove: '500', enabled: true },
  { id: '2', name: 'National (South Africa)', regions: 'All SA provinces', rate: '120', freeAbove: '750', enabled: true },
  { id: '3', name: 'International',           regions: 'Rest of world',    rate: '350', freeAbove: '',    enabled: false },
]

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function fmt(n: number) {
  return 'R' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}

const STATUS_COLOR: Record<string, string> = {
  paid:     'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
  complete: 'bg-green-100 text-green-700',
  sent:     'bg-blue-100 text-blue-700',
  draft:    'bg-gray-100 text-gray-600',
  accepted: 'bg-purple-100 text-purple-700',
}

export default function ShippingPage() {
  const [zones, setZones] = useState<ShippingZone[]>(DEFAULT_ZONES)
  const [editing, setEditing] = useState<string | null>(null)

  // Shipping Accounts
  const [fromDate, setFromDate] = useState('')
  const [toDate,   setToDate]   = useState('')
  const [accounts, setAccounts] = useState<AccountsData>({ rows: [], total: 0, totalPaid: 0, outstanding: 0 })
  const [loading,  setLoading]  = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (fromDate) params.set('from', fromDate)
      if (toDate)   params.set('to',   toDate)
      const res = await fetch(`/api/admin/shipping-accounts?${params}`)
      if (res.ok) setAccounts(await res.json())
    } finally { setLoading(false) }
  }, [fromDate, toDate])

  useEffect(() => { loadAccounts() }, [loadAccounts])

  const toggleZone = (id: string) => setZones(zones.map(z => z.id === id ? { ...z, enabled: !z.enabled } : z))
  const updateZone = (id: string, field: keyof ShippingZone, value: string) =>
    setZones(zones.map(z => z.id === id ? { ...z, [field]: value } : z))

  async function togglePaid(row: ShippingRow) {
    const newPaid = !row.shippingPaid
    // Optimistic update
    setAccounts(prev => {
      const rows = prev.rows.map(r => r.id === row.id ? { ...r, shippingPaid: newPaid } : r)
      const totalPaid = rows.filter(r => r.shippingPaid).reduce((s, r) => s + r.shippingCost, 0)
      return { ...prev, rows, totalPaid, outstanding: prev.total - totalPaid }
    })
    setSavingId(row.id)
    try {
      await fetch('/api/admin/shipping-accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: row.id, paid: newPaid }),
      })
    } finally { setSavingId(null) }
  }

  function printStatement() {
    const period = fromDate || toDate
      ? `${fromDate ? fmtDate(fromDate + 'T00:00:00') : 'All'} — ${toDate ? fmtDate(toDate + 'T00:00:00') : 'All'}`
      : 'All Time'

    const rowsHtml = accounts.rows.map(r => `
      <tr>
        <td style="padding:7px 10px;font-size:12px;">${fmtDate(r.date)}</td>
        <td style="padding:7px 10px;font-size:12px;font-weight:600;">${r.docNumber}</td>
        <td style="padding:7px 10px;font-size:12px;">${r.clientName}</td>
        <td style="padding:7px 10px;font-size:12px;">${r.shippingMethod || '—'}</td>
        <td style="padding:7px 10px;text-align:right;font-size:12px;font-weight:700;">${fmt(r.shippingCost)}</td>
        <td style="padding:7px 10px;font-size:12px;text-align:center;">
          <span style="padding:2px 8px;border-radius:9999px;font-weight:700;font-size:11px;background:${r.shippingPaid ? '#dcfce7' : '#fef3c7'};color:${r.shippingPaid ? '#15803d' : '#92400e'}">
            ${r.shippingPaid ? 'Paid' : 'Outstanding'}
          </span>
        </td>
      </tr>`).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Shipping Statement — ${period}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;padding:18mm}
    h1{font-size:22px;font-weight:800;margin-bottom:4px}
    .sub{font-size:13px;color:#6b7280;margin-bottom:24px}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    thead tr{border-bottom:2px solid #111}
    th{padding:7px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280}
    th.r{text-align:right}th.c{text-align:center}
    tbody tr{border-bottom:1px solid #f3f4f6}
    tbody tr:nth-child(even){background:#f9fafb}
    .summary{margin-top:20px;display:flex;gap:32px;justify-content:flex-end}
    .summary div{text-align:right}
    .summary .label{font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700}
    .summary .val{font-size:15px;font-weight:800}
    @page{size:A4;margin:0}</style>
    </head><body>
    <h1>Shipping Statement</h1>
    <p class="sub">${period} · ${accounts.rows.length} shipment${accounts.rows.length !== 1 ? 's' : ''}</p>
    <table>
      <thead><tr>
        <th>Date</th><th>Invoice #</th><th>Client</th><th>Method</th>
        <th class="r">Shipping</th><th class="c">Payment</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <div class="summary">
      <div><div class="label">Outstanding</div><div class="val" style="color:#b91c1c">${fmt(accounts.outstanding)}</div></div>
      <div><div class="label">Paid</div><div class="val" style="color:#15803d">${fmt(accounts.totalPaid)}</div></div>
      <div><div class="label">Total Shipping</div><div class="val">${fmt(accounts.total)}</div></div>
    </div>
    </body></html>`

    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 400)
  }

  const period = fromDate || toDate
    ? `${fromDate ? fmtDate(fromDate + 'T00:00:00') : '…'} → ${toDate ? fmtDate(toDate + 'T00:00:00') : 'Now'}`
    : 'All Time'

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Shipping</h1>
        <p className="text-gray-600 mt-1">Configure shipping zones and rates for your store</p>
      </div>

      {/* ── Zones ── */}
      <div className="space-y-4">
        {zones.map(zone => (
          <div key={zone.id} className="bg-white rounded-2xl border p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={zone.enabled} onChange={() => toggleZone(zone.id)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                </label>
                <div>
                  <h3 className="font-semibold text-lg">{zone.name}</h3>
                  <p className="text-sm text-gray-500">{zone.regions}</p>
                </div>
              </div>
              {editing === zone.id ? (
                <div className="flex items-center gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Rate (R)</label>
                    <input type="number" value={zone.rate} onChange={e => updateZone(zone.id, 'rate', e.target.value)}
                      className="w-24 px-2 py-1 border rounded text-sm block" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Free above (R)</label>
                    <input type="number" value={zone.freeAbove} placeholder="Never"
                      onChange={e => updateZone(zone.id, 'freeAbove', e.target.value)}
                      className="w-24 px-2 py-1 border rounded text-sm block" />
                  </div>
                  <button onClick={() => setEditing(null)}
                    className="mt-4 px-4 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-semibold">Done</button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold">R{zone.rate}</p>
                    {zone.freeAbove && <p className="text-xs text-green-600">Free above R{zone.freeAbove}</p>}
                  </div>
                  <button onClick={() => setEditing(zone.id)}
                    className="px-4 py-1.5 border rounded-lg text-sm font-semibold hover:bg-gray-50">Edit</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Shipping Accounts ── */}
      <div className="bg-white rounded-2xl border overflow-hidden">

        {/* Header row */}
        <div className="flex items-center justify-between px-6 py-5 border-b gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold">Shipping Accounts</h2>
            <p className="text-xs text-gray-500 mt-0.5">Shipping charges billed on invoices</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-500 font-medium">From</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-500 font-medium">To</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            {(fromDate || toDate) && (
              <button onClick={() => { setFromDate(''); setToDate('') }}
                className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1.5 border rounded-lg hover:bg-gray-50">
                Clear
              </button>
            )}
            <button onClick={printStatement} disabled={accounts.rows.length === 0}
              className="px-4 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-semibold disabled:opacity-40 hover:bg-gray-700 flex items-center gap-1.5">
              🖨 Statement
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x border-b">
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Shipments</p>
            <p className="text-2xl font-bold">{accounts.rows.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">{period}</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Total Shipping</p>
            <p className="text-2xl font-bold">{fmt(accounts.total)}</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Paid</p>
            <p className="text-2xl font-bold text-green-700">{fmt(accounts.totalPaid)}</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Outstanding</p>
            <p className={`text-2xl font-bold ${accounts.outstanding > 0 ? 'text-red-600' : 'text-green-700'}`}>
              {fmt(accounts.outstanding)}
            </p>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : accounts.rows.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">📦</div>
            <p className="text-sm font-medium">No shipping charges found</p>
            {(fromDate || toDate) && (
              <button onClick={() => { setFromDate(''); setToDate('') }}
                className="mt-3 text-xs text-blue-600 hover:underline">Clear date filter</button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice #</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Method</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Shipping</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Inv. Status</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accounts.rows.map(r => (
                  <tr key={r.id} className={r.shippingPaid ? 'bg-green-50/50' : 'hover:bg-gray-50'}>
                    <td className="px-5 py-3 text-gray-500 text-sm">{fmtDate(r.date)}</td>
                    <td className="px-5 py-3 font-semibold">{r.docNumber}</td>
                    <td className="px-5 py-3">{r.clientName}</td>
                    <td className="px-5 py-3 text-gray-500">{r.shippingMethod || '—'}</td>
                    <td className={`px-5 py-3 text-right font-bold ${r.shippingPaid ? 'text-green-700 line-through decoration-green-400' : ''}`}>
                      {fmt(r.shippingCost)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status] || 'bg-gray-100 text-gray-500'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={r.shippingPaid}
                          disabled={savingId === r.id}
                          onChange={() => togglePaid(r)}
                          className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer disabled:opacity-50"
                        />
                        {savingId === r.id && (
                          <span className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                        )}
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={4} className="px-5 py-3 text-sm font-semibold text-gray-600">Total</td>
                  <td className="px-5 py-3 text-right font-bold">{fmt(accounts.total)}</td>
                  <td />
                  <td className="px-5 py-3 text-center">
                    <span className="text-xs text-green-700 font-semibold">
                      {accounts.rows.filter(r => r.shippingPaid).length}/{accounts.rows.length} paid
                    </span>
                  </td>
                </tr>
                {accounts.outstanding > 0 && (
                  <tr className="bg-red-50">
                    <td colSpan={4} className="px-5 py-2 text-sm font-semibold text-red-600">Outstanding</td>
                    <td className="px-5 py-2 text-right font-bold text-red-600">{fmt(accounts.outstanding)}</td>
                    <td colSpan={2} />
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Info card */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 flex items-start gap-4">
        <div className="text-3xl">🚚</div>
        <div>
          <h3 className="font-semibold mb-2">Shipping Configuration</h3>
          <ul className="space-y-1 text-sm text-gray-700">
            <li>• Toggle zones on/off to enable or disable shipping to those regions</li>
            <li>• Set flat rates per zone or configure free shipping thresholds</li>
            <li>• Rates are displayed at checkout for customers</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
