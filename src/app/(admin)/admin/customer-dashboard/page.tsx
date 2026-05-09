'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Contact {
  id: string; firstName: string; lastName: string; email: string; phone: string
}

interface LineItem {
  sku: string; description: string; qty: number; unitPrice: number
}

interface Document {
  id: string; type: string; docNumber: string; clientName: string; clientEmail?: string
  status: string; createdAt: string; lineItems: LineItem[]
  discountPct?: number; shippingCost?: number; amountPaid?: number; paymentMethod?: string
  _total: number
}

interface CreditTxn {
  id: string; type: string; invoiceNumber: string; amount: number; date: string; notes?: string
}

interface CreditRecord { balance: number; transactions: CreditTxn[] }

interface DashData { documents: Document[]; credit: CreditRecord }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
const presets = [
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'This year',    days: -1 },
  { label: 'All time',     days: 0 },
]

function applyPreset(days: number): { from: string; to: string } {
  const to = new Date().toISOString().slice(0, 10)
  if (days === 0) return { from: '', to: '' }
  if (days === -1) return { from: `${new Date().getFullYear()}-01-01`, to }
  const from = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
  return { from, to }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomerDashboardPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [showDrop, setShowDrop] = useState(false)
  const [selected, setSelected] = useState<Contact | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'history' | 'items' | 'outstanding' | 'credits'>('history')

  useEffect(() => {
    fetch('/api/admin/contacts').then(r => r.ok ? r.json() : []).then((list: any[]) =>
      setContacts(list.map(c => ({ id: c.id, firstName: c.firstName || '', lastName: c.lastName || '', email: c.email || '', phone: c.phone || '' })))
    ).catch(() => {})
  }, [])

  const load = useCallback(async (contact: Contact, from: string, to: string) => {
    setLoading(true)
    setData(null)
    try {
      const name = `${contact.firstName} ${contact.lastName}`.trim()
      const params = new URLSearchParams({ client: name })
      if (from) params.set('from', from)
      if (to)   params.set('to', to)
      const res = await fetch(`/api/admin/customer-dashboard?${params}`)
      if (res.ok) setData(await res.json())
    } finally { setLoading(false) }
  }, [])

  function selectContact(c: Contact) {
    setSelected(c); setSearch(`${c.firstName} ${c.lastName}`.trim()); setShowDrop(false)
    load(c, dateFrom, dateTo)
  }

  function applyDates(from: string, to: string) {
    setDateFrom(from); setDateTo(to)
    if (selected) load(selected, from, to)
  }

  // ─── Derived ───────────────────────────────────────────────────────────────

  const invoices  = data ? data.documents.filter(d => d.type === 'invoice') : []
  const paidInv   = invoices.filter(d => d.status === 'paid' || d.status === 'archived')
  const unpaidInv = invoices.filter(d => d.status !== 'paid' && d.status !== 'archived' && d.status !== 'cancelled')

  const totalInvoiced  = invoices.reduce((s, d) => s + d._total, 0)
  const totalPaid      = invoices.reduce((s, d) => s + (d.amountPaid || 0), 0)
  const totalOutstanding = unpaidInv.reduce((s, d) => s + (d._total - (d.amountPaid || 0)), 0)
  const creditBalance  = data?.credit.balance ?? 0

  // Items breakdown — aggregate all line items across all invoices
  const itemsMap: Record<string, { sku: string; description: string; totalQty: number; totalSpent: number; count: number }> = {}
  invoices.forEach(d => {
    (d.lineItems || []).forEach(li => {
      const key = li.sku || li.description
      if (!key) return
      if (!itemsMap[key]) itemsMap[key] = { sku: li.sku, description: li.description, totalQty: 0, totalSpent: 0, count: 0 }
      itemsMap[key].totalQty   += li.qty || 0
      itemsMap[key].totalSpent += (li.qty || 0) * (li.unitPrice || 0)
      itemsMap[key].count++
    })
  })
  const itemsList = Object.values(itemsMap).sort((a, b) => b.totalSpent - a.totalSpent)

  // ─── PDF ───────────────────────────────────────────────────────────────────

  function downloadPDF() {
    if (!selected || !data) return
    const name = `${selected.firstName} ${selected.lastName}`.trim()
    const dateRange = dateFrom || dateTo
      ? `${dateFrom || '—'} to ${dateTo || '—'}`
      : 'All time'

    const invRows = invoices.map((d, i) => `<tr>
      <td>${i + 1}</td><td>${fmtDate(d.createdAt)}</td>
      <td>${d.docNumber}</td>
      <td style="text-align:right">${fmt(d._total)}</td>
      <td style="text-align:right">${fmt(d.amountPaid || 0)}</td>
      <td style="text-align:right;color:${d._total - (d.amountPaid || 0) > 0 ? '#dc2626' : '#16a34a'}">${fmt(d._total - (d.amountPaid || 0))}</td>
      <td>${d.status}</td>
    </tr>`).join('')

    const itemRows = itemsList.map((it, i) => `<tr>
      <td>${i + 1}</td><td>${it.sku}</td><td>${it.description}</td>
      <td style="text-align:center">${it.totalQty}</td>
      <td style="text-align:right">${fmt(it.totalSpent)}</td>
    </tr>`).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Customer Statement – ${name}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;padding:16mm;font-size:13px}
    h1{font-size:22px;font-weight:800}h2{font-size:14px;font-weight:700;margin:20px 0 8px;text-transform:uppercase;letter-spacing:.05em;color:#374151}
    .meta{color:#6b7280;font-size:12px;margin-top:4px}
    .cards{display:flex;gap:16px;margin:16px 0}
    .card{flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px}
    .card-label{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em}
    .card-value{font-size:18px;font-weight:800;margin-top:4px}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th{background:#f3f4f6;padding:7px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
    td{padding:7px 10px;border-bottom:1px solid #f3f4f6;font-size:12px}
    @page{size:A4;margin:0}</style>
    </head><body>
    <h1>Customer Statement</h1>
    <p class="meta">${name}${selected.email ? ` · ${selected.email}` : ''}${selected.phone ? ` · ${selected.phone}` : ''}</p>
    <p class="meta">Period: ${dateRange} · Generated: ${new Date().toLocaleDateString('en-ZA')}</p>
    <div class="cards">
      <div class="card"><div class="card-label">Total Invoiced</div><div class="card-value">${fmt(totalInvoiced)}</div></div>
      <div class="card"><div class="card-label">Total Paid</div><div class="card-value" style="color:#16a34a">${fmt(totalPaid)}</div></div>
      <div class="card"><div class="card-label">Outstanding</div><div class="card-value" style="color:${totalOutstanding > 0 ? '#dc2626' : '#374151'}">${fmt(totalOutstanding)}</div></div>
      <div class="card"><div class="card-label">Credits</div><div class="card-value" style="color:#2563eb">${fmt(creditBalance)}</div></div>
    </div>
    <h2>Invoice History</h2>
    <table><thead><tr><th>#</th><th>Date</th><th>Invoice #</th><th style="text-align:right">Total</th><th style="text-align:right">Paid</th><th style="text-align:right">Balance</th><th>Status</th></tr></thead>
    <tbody>${invRows || '<tr><td colspan="7" style="text-align:center;color:#9ca3af">No invoices</td></tr>'}</tbody></table>
    <h2>Items Purchased</h2>
    <table><thead><tr><th>#</th><th>SKU</th><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Total Spent</th></tr></thead>
    <tbody>${itemRows || '<tr><td colspan="5" style="text-align:center;color:#9ca3af">No items</td></tr>'}</tbody></table>
    </body></html>`
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 350) }
  }

  function emailStatement() {
    if (!selected) return
    const name = `${selected.firstName} ${selected.lastName}`.trim()
    const subject = encodeURIComponent(`Your Account Statement – Route 66`)
    const body = encodeURIComponent(
      `Dear ${selected.firstName},\n\nPlease find your account summary below:\n\n` +
      `Total Invoiced: ${fmt(totalInvoiced)}\n` +
      `Total Paid: ${fmt(totalPaid)}\n` +
      `Outstanding Balance: ${fmt(totalOutstanding)}\n` +
      `Store Credits: ${fmt(creditBalance)}\n\n` +
      `Please contact us if you have any queries.\n\nRoute 66`
    )
    window.open(`mailto:${selected.email}?subject=${subject}&body=${body}`)
  }

  const filteredContacts = contacts.filter(c => {
    const q = search.toLowerCase()
    return !q || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
  }).slice(0, 30)

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customer Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Purchase history, outstanding invoices and credits per customer</p>
      </div>

      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Customer selector */}
          <div className="flex-1 min-w-[240px] relative">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Customer</label>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setShowDrop(true) }}
              onFocus={() => setShowDrop(true)}
              onBlur={() => setTimeout(() => setShowDrop(false), 200)}
              placeholder="Search by name or email…"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {showDrop && filteredContacts.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-56 overflow-y-auto">
                {filteredContacts.map(c => (
                  <button key={c.id} onMouseDown={() => selectContact(c)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0">
                    <span className="font-medium text-gray-900">{c.firstName} {c.lastName}</span>
                    {c.email && <span className="text-gray-400 ml-2">{c.email}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date range */}
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">From</label>
              <input type="date" value={dateFrom} onChange={e => applyDates(e.target.value, dateTo)}
                className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">To</label>
              <input type="date" value={dateTo} onChange={e => applyDates(dateFrom, e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Actions */}
          {selected && data && (
            <div className="flex gap-2">
              <button onClick={downloadPDF}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Download PDF
              </button>
              {selected.email && (
                <button onClick={emailStatement}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  Email Statement
                </button>
              )}
            </div>
          )}
        </div>

        {/* Preset buttons */}
        <div className="flex gap-2 flex-wrap">
          {presets.map(p => (
            <button key={p.label}
              onClick={() => { const d = applyPreset(p.days); applyDates(d.from, d.to) }}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-gray-600">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading…
        </div>
      )}

      {/* No customer selected */}
      {!loading && !selected && (
        <div className="text-center py-20 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm font-medium">Select a customer to view their dashboard</p>
        </div>
      )}

      {/* Dashboard content */}
      {!loading && selected && data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Invoiced', value: fmt(totalInvoiced), color: 'text-gray-900' },
              { label: 'Total Paid', value: fmt(totalPaid), color: 'text-green-700' },
              { label: 'Outstanding', value: fmt(totalOutstanding), color: totalOutstanding > 0 ? 'text-red-600' : 'text-gray-400' },
              { label: 'Store Credits', value: fmt(creditBalance), color: 'text-blue-700' },
            ].map(c => (
              <div key={c.label} className="bg-white border border-gray-200 rounded-2xl p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{c.label}</p>
                <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="flex border-b border-gray-200">
              {([
                { key: 'history', label: `Invoices (${invoices.length})` },
                { key: 'items', label: `Items (${itemsList.length})` },
                { key: 'outstanding', label: `Outstanding (${unpaidInv.length})` },
                { key: 'credits', label: `Credits & Payments` },
              ] as { key: typeof activeTab; label: string }[]).map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Invoice History */}
            {activeTab === 'history' && (
              <div className="overflow-x-auto">
                {invoices.length === 0 ? (
                  <p className="text-center py-12 text-gray-400 text-sm">No invoices found</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Items</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Paid</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Balance</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(d => {
                        const bal = d._total - (d.amountPaid || 0)
                        return (
                          <tr key={d.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-600">{fmtDate(d.createdAt)}</td>
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">{d.docNumber}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{(d.lineItems || []).length} line{(d.lineItems || []).length !== 1 ? 's' : ''}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(d._total)}</td>
                            <td className="px-4 py-3 text-right text-green-700">{fmt(d.amountPaid || 0)}</td>
                            <td className={`px-4 py-3 text-right font-semibold ${bal > 0.005 ? 'text-red-600' : 'text-gray-400'}`}>{fmt(Math.max(0, bal))}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                d.status === 'paid' ? 'bg-green-100 text-green-700' :
                                d.status === 'archived' ? 'bg-gray-100 text-gray-500' :
                                d.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>{d.status}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Items Breakdown */}
            {activeTab === 'items' && (
              <div className="overflow-x-auto">
                {itemsList.length === 0 ? (
                  <p className="text-center py-12 text-gray-400 text-sm">No items found</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">SKU</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Total Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total Spent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {itemsList.map(it => (
                        <tr key={it.sku || it.description} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">{it.sku || '—'}</td>
                          <td className="px-4 py-3 text-gray-700">{it.description}</td>
                          <td className="px-4 py-3 text-center font-semibold text-gray-900">{it.totalQty}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(it.totalSpent)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-gray-500 text-right uppercase">Total</td>
                        <td className="px-4 py-3 text-center font-bold text-gray-900">{itemsList.reduce((s, it) => s + it.totalQty, 0)}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(itemsList.reduce((s, it) => s + it.totalSpent, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )}

            {/* Outstanding */}
            {activeTab === 'outstanding' && (
              <div className="overflow-x-auto">
                {unpaidInv.length === 0 ? (
                  <p className="text-center py-12 text-gray-400 text-sm">No outstanding invoices</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Invoice Total</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Paid</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Balance Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {unpaidInv.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map(d => (
                        <tr key={d.id} className="hover:bg-red-50/30">
                          <td className="px-4 py-3 text-gray-600">{fmtDate(d.createdAt)}</td>
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">{d.docNumber}</td>
                          <td className="px-4 py-3 text-right text-gray-900">{fmt(d._total)}</td>
                          <td className="px-4 py-3 text-right text-green-700">{fmt(d.amountPaid || 0)}</td>
                          <td className="px-4 py-3 text-right font-bold text-red-600">{fmt(Math.max(0, d._total - (d.amountPaid || 0)))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-red-50 border-t-2 border-red-200">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right text-xs font-semibold text-red-500 uppercase">Total Outstanding</td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">{fmt(totalOutstanding)}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )}

            {/* Credits & Payments */}
            {activeTab === 'credits' && (
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-gray-700">Credit Balance</p>
                  <p className="text-2xl font-bold text-blue-700">{fmt(creditBalance)}</p>
                </div>
                {(data.credit.transactions || []).length === 0 ? (
                  <p className="text-center py-8 text-gray-400 text-sm">No credit transactions</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Invoice</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[...data.credit.transactions].reverse().map(txn => (
                        <tr key={txn.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">{fmtDate(txn.date)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              txn.type === 'overpayment' ? 'bg-blue-100 text-blue-700' :
                              txn.type === 'credit_applied' ? 'bg-green-100 text-green-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>{txn.type.replace('_', ' ')}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-blue-700">{txn.invoiceNumber}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${txn.amount >= 0 ? 'text-blue-700' : 'text-green-700'}`}>
                            {txn.amount >= 0 ? '+' : ''}{fmt(Math.abs(txn.amount))}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{txn.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
