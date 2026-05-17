'use client'

import { useState, useEffect, useCallback } from 'react'

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
}

interface AccountsData {
  rows: ShippingRow[]
  total: number
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
}

export default function ShippingPage() {
  const [zones, setZones] = useState<ShippingZone[]>(DEFAULT_ZONES)
  const [editing, setEditing] = useState<string | null>(null)

  // Shipping Accounts
  const now = new Date()
  const [selYear,  setSelYear]  = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth())
  const [accounts, setAccounts] = useState<AccountsData>({ rows: [], total: 0 })
  const [loading,  setLoading]  = useState(false)

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/shipping-accounts?year=${selYear}&month=${selMonth}`)
      if (res.ok) setAccounts(await res.json())
    } finally { setLoading(false) }
  }, [selYear, selMonth])

  useEffect(() => { loadAccounts() }, [loadAccounts])

  const toggleZone = (id: string) => {
    setZones(zones.map(z => z.id === id ? { ...z, enabled: !z.enabled } : z))
  }

  const updateZone = (id: string, field: keyof ShippingZone, value: string) => {
    setZones(zones.map(z => z.id === id ? { ...z, [field]: value } : z))
  }

  // Year options: current year down to 2023
  const years = Array.from({ length: now.getFullYear() - 2022 }, (_, i) => now.getFullYear() - i)

  function printStatement() {
    const period = `${MONTHS[selMonth]} ${selYear}`
    const rowsHtml = accounts.rows.map(r => `
      <tr>
        <td style="padding:7px 10px;font-size:12px;">${fmtDate(r.date)}</td>
        <td style="padding:7px 10px;font-size:12px;font-weight:600;">${r.docNumber}</td>
        <td style="padding:7px 10px;font-size:12px;">${r.clientName}</td>
        <td style="padding:7px 10px;font-size:12px;">${r.shippingMethod || '—'}</td>
        <td style="padding:7px 10px;text-align:right;font-size:12px;font-weight:700;">${fmt(r.shippingCost)}</td>
        <td style="padding:7px 10px;font-size:12px;">
          <span style="padding:2px 8px;border-radius:9999px;background:${r.status==='paid'||r.status==='archived'||r.status==='complete'?'#dcfce7':'#f3f4f6'};color:${r.status==='paid'||r.status==='archived'||r.status==='complete'?'#15803d':'#374151'};font-weight:700;">
            ${r.status}
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
    th.r{text-align:right}
    tbody tr{border-bottom:1px solid #f3f4f6}
    tbody tr:nth-child(even){background:#f9fafb}
    .total{margin-top:20px;text-align:right;font-size:16px;font-weight:800;}
    @page{size:A4;margin:0}</style>
    </head><body>
    <h1>Shipping Statement</h1>
    <p class="sub">${period} · ${accounts.rows.length} shipment${accounts.rows.length !== 1 ? 's' : ''}</p>
    <table>
      <thead><tr>
        <th>Date</th><th>Invoice #</th><th>Client</th><th>Method</th><th class="r">Shipping</th><th>Status</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <div class="total">Total Shipping: ${fmt(accounts.total)}</div>
    </body></html>`

    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 400)
  }

  return (
    <div className="space-y-8 max-w-4xl">
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
                    <input type="number" value={zone.rate}
                      onChange={e => updateZone(zone.id, 'rate', e.target.value)}
                      className="w-24 px-2 py-1 border rounded text-sm block" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Free above (R)</label>
                    <input type="number" value={zone.freeAbove} placeholder="Never"
                      onChange={e => updateZone(zone.id, 'freeAbove', e.target.value)}
                      className="w-24 px-2 py-1 border rounded text-sm block" />
                  </div>
                  <button onClick={() => setEditing(null)}
                    className="mt-4 px-4 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-semibold">
                    Done
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold">R{zone.rate}</p>
                    {zone.freeAbove && <p className="text-xs text-green-600">Free above R{zone.freeAbove}</p>}
                  </div>
                  <button onClick={() => setEditing(zone.id)}
                    className="px-4 py-1.5 border rounded-lg text-sm font-semibold hover:bg-gray-50">
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Shipping Accounts ── */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        {/* Section header */}
        <div className="flex items-center justify-between px-6 py-5 border-b">
          <div>
            <h2 className="text-lg font-bold">Shipping Accounts</h2>
            <p className="text-xs text-gray-500 mt-0.5">Shipping charges billed on invoices</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Month selector */}
            <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}
              className="border rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none">
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            {/* Year selector */}
            <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
              className="border rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={printStatement} disabled={accounts.rows.length === 0}
              className="px-4 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-semibold disabled:opacity-40 hover:bg-gray-700">
              🖨 Statement
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 divide-x border-b">
          <div className="px-6 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Shipments</p>
            <p className="text-2xl font-bold">{accounts.rows.length}</p>
          </div>
          <div className="px-6 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Total Shipping</p>
            <p className="text-2xl font-bold text-blue-700">{fmt(accounts.total)}</p>
          </div>
          <div className="px-6 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Period</p>
            <p className="text-xl font-bold">{MONTHS[selMonth]} {selYear}</p>
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
            <p className="text-sm font-medium">No shipping charges for {MONTHS[selMonth]} {selYear}</p>
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
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accounts.rows.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-600">{fmtDate(r.date)}</td>
                    <td className="px-5 py-3 font-semibold">{r.docNumber}</td>
                    <td className="px-5 py-3">{r.clientName}</td>
                    <td className="px-5 py-3 text-gray-500">{r.shippingMethod || '—'}</td>
                    <td className="px-5 py-3 text-right font-bold">{fmt(r.shippingCost)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status] || 'bg-gray-100 text-gray-500'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={4} className="px-5 py-3 text-sm font-semibold text-gray-600">Total</td>
                  <td className="px-5 py-3 text-right font-bold text-blue-700">{fmt(accounts.total)}</td>
                  <td />
                </tr>
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
