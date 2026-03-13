'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanyInfo {
  name: string
  address: string
  city: string
  postalCode: string
  country: string
  phone: string
  email: string
  vatNumber: string
}

interface Customer {
  id: string
  name: string
  email: string
}

interface WsItem {
  id: string
  sku: string
  description: string
  wholesalePrice: number
  retailOverride: string // empty = auto-calculated
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCY_DEFAULTS: Record<string, number> = {
  USD: 18.5,
  EUR: 20.0,
  GBP: 23.5,
  ZAR: 1.0,
}

function newWsItem(): WsItem {
  return {
    id: `ws_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sku: '',
    description: '',
    wholesalePrice: 0,
    retailOverride: '',
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorksheetPage() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({ name: '', address: '', city: '', postalCode: '', country: '', phone: '', email: '', vatNumber: '' })
  const [customers, setCustomers] = useState<Customer[]>([])

  const load = useCallback(async () => {
    try {
      const [tmplRes, clRes, ctRes] = await Promise.all([
        fetch('/api/admin/company-info'),
        fetch('/api/admin/clients'),
        fetch('/api/admin/contacts'),
      ])
      if (tmplRes.ok) setCompanyInfo(await tmplRes.json())

      const clList: any[] = clRes.ok ? await clRes.json() : []
      const ctList: any[] = ctRes.ok ? await ctRes.json() : []
      const seen = new Set<string>()
      const merged: Customer[] = []
      for (const c of [...clList, ...ctList]) {
        const name = `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.companyName || c.email || ''
        const key = (c.email || c.id || name).toLowerCase()
        if (!key || seen.has(key)) continue
        seen.add(key)
        merged.push({ id: c.id, name, email: c.email || '' })
      }
      merged.sort((a, b) => a.name.localeCompare(b.name))
      setCustomers(merged)
    } catch (e) {
      console.error('Worksheet load error', e)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Work Sheet</h1>
        <p className="text-sm text-gray-500 mt-1">Costing calculator &amp; pricing worksheet</p>
      </div>

      <WorksheetEditor companyInfo={companyInfo} customers={customers} />
    </div>
  )
}

// ─── Worksheet Editor ─────────────────────────────────────────────────────────

function WorksheetEditor({ companyInfo, customers }: { companyInfo: CompanyInfo; customers: Customer[] }) {
  const [currency, setCurrency] = useState('USD')
  const [exchangeRate, setExchangeRate] = useState(18.5)
  const [markupPct, setMarkupPct] = useState(40)
  const [shippingPct, setShippingPct] = useState(0)
  const [vatPct, setVatPct] = useState(15)
  const [clientSearch, setClientSearch] = useState('')
  const [clientName, setClientName] = useState('')
  const [showClientDrop, setShowClientDrop] = useState(false)
  const [items, setItems] = useState<WsItem[]>([newWsItem()])
  const clientRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) setShowClientDrop(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleCurrencyChange(c: string) {
    setCurrency(c)
    setExchangeRate(CURRENCY_DEFAULTS[c] ?? 1)
  }

  function calcLanded(wholesalePrice: number): number {
    return wholesalePrice * exchangeRate * (1 + shippingPct / 100)
  }

  function calcRetail(wholesalePrice: number): number {
    return wholesalePrice * exchangeRate * (1 + shippingPct / 100) * (1 + markupPct / 100) * (1 + vatPct / 100)
  }

  function fmtFC(n: number) {
    return n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function updateItem(id: string, field: keyof WsItem, value: string | number) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)))
  }

  function addItem() { setItems((prev) => [...prev, newWsItem()]) }
  function removeItem(id: string) { setItems((prev) => prev.filter((it) => it.id !== id)) }

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(clientSearch.toLowerCase())
  )

  const hasItems = items.some((it) => it.sku || it.description)

  // ── PDF export ──
  function downloadPDF() {
    const date = new Date().toLocaleDateString('en-ZA')
    const rows = items
      .filter((it) => it.sku || it.description)
      .map((it, i) => {
        const landed = calcLanded(it.wholesalePrice)
        const retail = it.retailOverride !== '' ? Number(it.retailOverride) : calcRetail(it.wholesalePrice)
        return `<tr>
          <td style="padding:7px 10px;color:#6b7280;font-size:12px;">${i + 1}</td>
          <td style="padding:7px 10px;font-family:monospace;font-size:12px;font-weight:600;">${it.sku || '—'}</td>
          <td style="padding:7px 10px;font-size:12px;">${it.description || '—'}</td>
          <td style="padding:7px 10px;text-align:right;font-size:12px;">${currency} ${fmtFC(it.wholesalePrice)}</td>
          <td style="padding:7px 10px;text-align:right;font-size:12px;">R ${fmtFC(landed)}</td>
          <td style="padding:7px 10px;text-align:right;font-weight:700;font-size:12px;">R ${fmtFC(retail)}</td>
        </tr>`
      }).join('')

    const companyBlock = companyInfo.name
      ? `<p style="font-weight:700;font-size:13px;">${companyInfo.name}</p>
         ${companyInfo.address ? `<p style="font-size:12px;color:#6b7280;">${companyInfo.address}</p>` : ''}
         ${companyInfo.phone ? `<p style="font-size:12px;color:#6b7280;">${companyInfo.phone}</p>` : ''}
         ${companyInfo.email ? `<p style="font-size:12px;color:#6b7280;">${companyInfo.email}</p>` : ''}
         ${companyInfo.vatNumber ? `<p style="font-size:11px;color:#9ca3af;">VAT: ${companyInfo.vatNumber}</p>` : ''}`
      : ''

    const html = `<!DOCTYPE html><html><head>
  <meta charset="utf-8">
  <title>Supplier Work Sheet</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,sans-serif;padding:18mm;background:white}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}
    .meta-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;margin-bottom:22px;display:flex;gap:24px;flex-wrap:wrap}
    .meta-box span{font-size:11px;color:#6b7280;}
    .meta-box strong{font-size:12px;color:#111827;}
    table{width:100%;border-collapse:collapse}
    thead tr{border-bottom:2px solid #111827}
    th{padding:7px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280}
    th.right{text-align:right}
    tbody tr{border-bottom:1px solid #f3f4f6}
    tbody tr:nth-child(even){background:#f9fafb}
    @page{size:A4;margin:0}
  </style>
</head><body>
  <div class="header">
    <div>${companyBlock}</div>
    <div style="text-align:right">
      <p style="font-size:22px;font-weight:800;">WORK SHEET</p>
      <p style="font-size:12px;color:#6b7280;margin-top:3px;">Date: ${date}</p>
      ${clientName ? `<p style="font-size:13px;font-weight:600;margin-top:4px;">Client: ${clientName}</p>` : ''}
    </div>
  </div>
  <div class="meta-box">
    <div><span>Currency </span><strong>${currency}</strong></div>
    <div><span>Exchange Rate </span><strong>1 ${currency} = R ${exchangeRate}</strong></div>
    <div><span>Shipping &amp; Customs </span><strong>${shippingPct}%</strong></div>
    <div><span>Markup </span><strong>${markupPct}%</strong></div>
    <div><span>VAT </span><strong>${vatPct}%</strong></div>
  </div>
  <table>
    <thead><tr>
      <th style="width:36px">#</th>
      <th>SKU</th>
      <th>Description</th>
      <th class="right">Wholesale (${currency})</th>
      <th class="right">Landed Cost (ZAR)</th>
      <th class="right">Est Retail (ZAR incl. VAT)</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 350)
    }
  }

  // ── CSV export ──
  function downloadCSV() {
    const headers = ['#', 'SKU', 'Description', `Wholesale Price (${currency})`, 'Landed Cost (ZAR)', 'Est Retail Price (ZAR incl. VAT)']
    const rows = items
      .filter((it) => it.sku || it.description)
      .map((it, i) => {
        const landed = calcLanded(it.wholesalePrice)
        const retail = it.retailOverride !== '' ? Number(it.retailOverride) : calcRetail(it.wholesalePrice)
        return [i + 1, it.sku, `"${it.description.replace(/"/g, '""')}"`, it.wholesalePrice.toFixed(2), landed.toFixed(2), retail.toFixed(2)]
      })
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `worksheet-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Compact Costing Calculator */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3">Costing Calculator</p>
        <div className="flex flex-wrap items-end gap-3">
          {/* Currency */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Currency</label>
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {Object.keys(CURRENCY_DEFAULTS).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Exchange rate */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">1 {currency} = R</label>
            <input
              type="number" min={0} step={0.01}
              value={exchangeRate}
              onChange={(e) => setExchangeRate(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm w-24 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Shipping & Customs */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Shipping &amp; Customs %</label>
            <input
              type="number" min={0} step={1}
              value={shippingPct}
              onChange={(e) => setShippingPct(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm w-24 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Markup */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Markup %</label>
            <input
              type="number" min={0} step={1}
              value={markupPct}
              onChange={(e) => setMarkupPct(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm w-20 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* VAT */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">VAT %</label>
            <input
              type="number" min={0} step={1}
              value={vatPct}
              onChange={(e) => setVatPct(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm w-20 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Client selector */}
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]" ref={clientRef}>
            <label className="text-xs text-gray-500">Client</label>
            <div className="relative">
              <input
                value={clientName || clientSearch}
                onFocus={() => { setClientSearch(''); setShowClientDrop(true) }}
                onChange={(e) => { setClientSearch(e.target.value); setClientName(''); setShowClientDrop(true) }}
                placeholder="Search client..."
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {clientName && (
                <button onClick={() => { setClientName(''); setClientSearch('') }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
              {showClientDrop && filteredCustomers.length > 0 && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 w-full max-h-48 overflow-y-auto py-1">
                  {filteredCustomers.slice(0, 20).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                      onClick={() => { setClientName(c.name); setClientSearch(''); setShowClientDrop(false) }}
                    >
                      <span className="font-medium text-gray-900">{c.name}</span>
                      {c.email && <span className="ml-2 text-xs text-gray-400">{c.email}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">Items</p>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadCSV}
              disabled={!hasItems}
              className="flex items-center gap-1.5 border border-gray-300 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M4 6h16" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={downloadPDF}
              disabled={!hasItems}
              className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </button>
          </div>
        </div>
        <div className="p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-400">
                <th className="text-left pb-2 w-8">#</th>
                <th className="text-left pb-2 px-2">SKU</th>
                <th className="text-left pb-2 px-2">Description</th>
                <th className="text-right pb-2 px-2">Wholesale ({currency})</th>
                <th className="text-right pb-2 px-2">Landed Cost (ZAR)</th>
                <th className="text-right pb-2 px-2">Est Retail (ZAR)</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const landedCost = calcLanded(it.wholesalePrice)
                const autoRetail = calcRetail(it.wholesalePrice)
                return (
                  <tr key={it.id} className="border-b border-gray-50 group">
                    <td className="py-2 text-xs text-gray-400 w-8">{i + 1}</td>
                    <td className="py-2 px-2">
                      <input
                        value={it.sku}
                        onChange={(e) => updateItem(it.id, 'sku', e.target.value)}
                        placeholder="SKU"
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        value={it.description}
                        onChange={(e) => updateItem(it.id, 'description', e.target.value)}
                        placeholder="Description"
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-end">
                        <span className="text-xs text-gray-400 mr-1">{currency}</span>
                        <input
                          type="number" min={0} step={0.01}
                          value={it.wholesalePrice || ''}
                          onChange={(e) => updateItem(it.id, 'wholesalePrice', Number(e.target.value))}
                          placeholder="0.00"
                          className="w-28 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                    </td>
                    {/* Landed Cost — read-only, auto-calculated */}
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-gray-400">R</span>
                        <span className={`w-28 px-2.5 py-1.5 text-xs text-right rounded-lg ${it.wholesalePrice > 0 ? 'text-gray-700 bg-gray-50 border border-gray-100' : 'text-gray-300'}`}>
                          {it.wholesalePrice > 0 ? fmtFC(landedCost) : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-gray-400">R</span>
                        <input
                          type="number" min={0} step={0.01}
                          value={it.retailOverride !== '' ? it.retailOverride : (it.wholesalePrice > 0 ? autoRetail.toFixed(2) : '')}
                          onChange={(e) => updateItem(it.id, 'retailOverride', e.target.value)}
                          onBlur={(e) => { if (!e.target.value) updateItem(it.id, 'retailOverride', '') }}
                          placeholder={it.wholesalePrice > 0 ? autoRetail.toFixed(2) : '0.00'}
                          className="w-28 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        {it.retailOverride !== '' && (
                          <button onClick={() => updateItem(it.id, 'retailOverride', '')} title="Reset to auto" className="text-gray-300 hover:text-blue-500 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-2 w-8">
                      <button
                        onClick={() => removeItem(it.id)}
                        disabled={items.length === 1}
                        className="text-gray-300 hover:text-red-400 disabled:opacity-20 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button
            onClick={addItem}
            className="mt-3 w-full border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-500 rounded-xl py-2 text-sm transition-colors"
          >
            + Add Row
          </button>
        </div>
      </div>
    </div>
  )
}
