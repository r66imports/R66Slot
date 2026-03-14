'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanyInfo {
  name: string; address: string; city: string; postalCode: string
  country: string; phone: string; email: string; vatNumber: string
}

interface Customer {
  id: string; name: string; email: string; phone: string
}

interface ProductRef {
  id: string; sku: string; title: string; brand: string; price: number
}

interface WsItem {
  id: string
  sku: string
  skuSearch: string        // live search text
  description: string
  clientName: string
  clientSearch: string     // live search text
  qty: number
  wholesalePrice: number
  retailOverride: string   // empty = auto-calculated
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCY_DEFAULTS: Record<string, number> = {
  USD: 18.5, EUR: 20.0, GBP: 23.5, SGD: 13.5, CNY: 2.55, HKD: 2.4, ZAR: 1.0,
}

const DISPLAY_CURRENCIES = ['USD', 'EUR', 'GBP', 'SGD', 'CNY', 'HKD']

function newWsItem(): WsItem {
  return {
    id: `ws_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sku: '', skuSearch: '', description: '',
    clientName: '', clientSearch: '',
    qty: 1, wholesalePrice: 0, retailOverride: '',
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorksheetPage() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '', address: '', city: '', postalCode: '', country: '', phone: '', email: '', vatNumber: '',
  })
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<ProductRef[]>([])

  const load = useCallback(async () => {
    try {
      const [tmplRes, clRes, ctRes, prodRes] = await Promise.all([
        fetch('/api/admin/company-info'),
        fetch('/api/admin/clients'),
        fetch('/api/admin/contacts'),
        fetch('/api/admin/products'),
      ])
      if (tmplRes.ok) setCompanyInfo(await tmplRes.json())

      // Merge clients + contacts
      const clList: any[] = clRes.ok ? await clRes.json() : []
      const ctList: any[] = ctRes.ok ? await ctRes.json() : []
      const seen = new Set<string>()
      const merged: Customer[] = []
      for (const c of [...clList, ...ctList]) {
        const name = `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.companyName || c.email || ''
        const key = (c.email || c.id || name).toLowerCase()
        if (!key || seen.has(key)) continue
        seen.add(key)
        merged.push({ id: c.id, name, email: c.email || '', phone: c.phone || '' })
      }
      merged.sort((a, b) => a.name.localeCompare(b.name))
      setCustomers(merged)

      // Products
      if (prodRes.ok) {
        const raw: any[] = await prodRes.json()
        setProducts(raw.map((p) => ({
          id: p.id, sku: p.sku || '', title: p.title || '',
          brand: p.brand || '', price: Number(p.price) || 0,
        })).filter((p) => p.sku || p.title))
      }
    } catch (e) {
      console.error('Worksheet load error', e)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Work Sheet</h1>
        <p className="text-sm text-gray-500 mt-1">Costing calculator &amp; pricing worksheet</p>
      </div>
      <WorksheetEditor
        companyInfo={companyInfo}
        customers={customers}
        products={products}
        onRefresh={load}
      />
    </div>
  )
}

// ─── Worksheet Editor ─────────────────────────────────────────────────────────

function WorksheetEditor({
  companyInfo, customers, products, onRefresh,
}: {
  companyInfo: CompanyInfo
  customers: Customer[]
  products: ProductRef[]
  onRefresh: () => void
}) {
  const [currency, setCurrency] = useState('USD')
  const [exchangeRate, setExchangeRate] = useState(18.5)
  const [markupPct, setMarkupPct] = useState(40)
  const [shippingPct, setShippingPct] = useState(0)
  const [vatPct, setVatPct] = useState(15)
  const [headerClient, setHeaderClient] = useState('')
  const [headerClientSearch, setHeaderClientSearch] = useState('')
  const [showHeaderClientDrop, setShowHeaderClientDrop] = useState(false)
  const [items, setItems] = useState<WsItem[]>([newWsItem()])
  // Final Costing Calculator — independent settings
  const [finalCurrency, setFinalCurrency] = useState('USD')
  const [finalExRate, setFinalExRate] = useState(18.5)
  const [finalShippingPct, setFinalShippingPct] = useState(0)
  const [finalMarkupPct, setFinalMarkupPct] = useState(40)
  const [finalVatPct, setFinalVatPct] = useState(15)

  // Live FX rates (1 CURRENCY = R ?)
  const [fxRates, setFxRates] = useState<Record<string, number>>(CURRENCY_DEFAULTS)
  const [fxUpdated, setFxUpdated] = useState('')
  const [fxLoading, setFxLoading] = useState(false)

  const fetchRates = useCallback(async () => {
    setFxLoading(true)
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/ZAR')
      const data = await res.json()
      const raw = data.rates as Record<string, number>
      const zarRates: Record<string, number> = { ZAR: 1 }
      for (const [cur, r] of Object.entries(raw)) {
        if (r > 0) zarRates[cur] = parseFloat((1 / r).toFixed(4))
      }
      setFxRates(zarRates)
      setFxUpdated(new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }))
    } catch { /* keep defaults */ } finally {
      setFxLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRates()
    const t = setInterval(fetchRates, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [fetchRates])

  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showAddClient, setShowAddClient] = useState(false)
  // track which row's dropdown is open
  const [activeSkuRow, setActiveSkuRow] = useState<string | null>(null)
  const [activeClientRow, setActiveClientRow] = useState<string | null>(null)
  const headerClientRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (headerClientRef.current && !headerClientRef.current.contains(e.target as Node)) {
        setShowHeaderClientDrop(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleCurrencyChange(c: string) {
    setCurrency(c)
    setExchangeRate(fxRates[c] ?? CURRENCY_DEFAULTS[c] ?? 1)
  }

  function calcLanded(w: number) { return w * exchangeRate * (1 + shippingPct / 100) }
  function calcRetail(w: number) { return w * exchangeRate * (1 + shippingPct / 100) * (1 + markupPct / 100) * (1 + vatPct / 100) }
  function calcFinalLanded(w: number) { return w * finalExRate * (1 + finalShippingPct / 100) }
  function calcFinalRetail(w: number) { return w * finalExRate * (1 + finalShippingPct / 100) * (1 + finalMarkupPct / 100) * (1 + finalVatPct / 100) }
  function fmtFC(n: number) { return n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

  function updateItem(id: string, patch: Partial<WsItem>) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, ...patch } : it))
  }
  function addItem() { setItems((prev) => [...prev, newWsItem()]) }
  function removeItem(id: string) { setItems((prev) => prev.filter((it) => it.id !== id)) }

  const hasItems = items.some((it) => it.sku || it.description)

  // ── Filtered dropdowns ──
  function filteredProducts(search: string) {
    const q = search.toLowerCase()
    return products.filter((p) =>
      p.sku.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q)
    ).slice(0, 12)
  }

  function filteredCustomers(search: string) {
    const q = search.toLowerCase()
    return customers.filter((c) =>
      c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    ).slice(0, 12)
  }

  // Header client dropdown
  const headerClientMatches = filteredCustomers(headerClientSearch)

  // ── PDF export ──
  function downloadPDF() {
    const date = new Date().toLocaleDateString('en-ZA')
    const rows = items
      .filter((it) => it.sku || it.description)
      .map((it, i) => {
        const landed = calcLanded(it.wholesalePrice)
        const retail = it.retailOverride !== '' ? Number(it.retailOverride) : calcRetail(it.wholesalePrice)
        const finalLanded = calcFinalLanded(it.wholesalePrice)
        const landedRetail = calcFinalRetail(it.wholesalePrice)
        return `<tr>
          <td style="padding:7px 10px;color:#6b7280;font-size:12px;">${i + 1}</td>
          <td style="padding:7px 10px;font-family:monospace;font-size:12px;font-weight:600;">${it.sku || '—'}</td>
          <td style="padding:7px 10px;font-size:12px;">${it.description || '—'}</td>
          <td style="padding:7px 10px;font-size:12px;">${it.clientName || '—'}</td>
          <td style="padding:7px 10px;text-align:center;font-size:12px;">${it.qty}</td>
          <td style="padding:7px 10px;text-align:right;font-size:12px;">${currency} ${fmtFC(it.wholesalePrice)}</td>
          <td style="padding:7px 10px;text-align:right;font-size:12px;">R ${fmtFC(landed)}</td>
          <td style="padding:7px 10px;text-align:right;font-weight:700;font-size:12px;">R ${fmtFC(retail)}</td>
          <td style="padding:7px 10px;text-align:right;font-size:12px;color:#065f46;">R ${it.wholesalePrice > 0 ? fmtFC(finalLanded) : '—'}</td>
          <td style="padding:7px 10px;text-align:right;font-weight:700;font-size:12px;color:#065f46;">R ${it.wholesalePrice > 0 ? fmtFC(landedRetail) : '—'}</td>
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
  <meta charset="utf-8"><title>Supplier Work Sheet</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,sans-serif;padding:18mm;background:white}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}
    .meta-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;margin-bottom:22px;display:flex;gap:24px;flex-wrap:wrap}
    .meta-box span{font-size:11px;color:#6b7280;} .meta-box strong{font-size:12px;color:#111827;}
    table{width:100%;border-collapse:collapse}
    thead tr{border-bottom:2px solid #111827}
    th{padding:7px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280}
    th.right{text-align:right} th.center{text-align:center}
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
      ${headerClient ? `<p style="font-size:13px;font-weight:600;margin-top:4px;">Client: ${headerClient}</p>` : ''}
    </div>
  </div>
  <div class="meta-box">
    <div><span>Currency </span><strong>${currency}</strong></div>
    <div><span>Exchange Rate </span><strong>1 ${currency} = R ${exchangeRate}</strong></div>
    <div><span>Shipping &amp; Customs </span><strong>${shippingPct}%</strong></div>
    <div><span>Markup </span><strong>${markupPct}%</strong></div>
    <div><span>VAT </span><strong>${vatPct}%</strong></div>
  </div>
  <div class="meta-box" style="background:#ecfdf5;border-color:#a7f3d0;">
    <div><span style="color:#065f46;">Final Currency </span><strong>${finalCurrency}</strong></div>
    <div><span style="color:#065f46;">Final Ex Rate </span><strong>1 ${finalCurrency} = R ${finalExRate}</strong></div>
    <div><span style="color:#065f46;">Final Shipping </span><strong>${finalShippingPct}%</strong></div>
    <div><span style="color:#065f46;">Final Markup </span><strong>${finalMarkupPct}%</strong></div>
    <div><span style="color:#065f46;">Final VAT </span><strong>${finalVatPct}%</strong></div>
  </div>
  <table>
    <thead><tr>
      <th style="width:36px">#</th><th>SKU</th><th>Description</th><th>Client</th>
      <th class="center" style="width:50px">Qty</th>
      <th class="right">Wholesale (${currency})</th>
      <th class="right">Landed Cost (ZAR)</th>
      <th class="right">Est Retail (ZAR incl. VAT)</th>
      <th class="right" style="color:#065f46;">Final Landed (ZAR)</th>
      <th class="right" style="color:#065f46;">Landed Retail (ZAR)</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`

    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 350) }
  }

  // ── CSV export ──
  function downloadCSV() {
    const headers = ['#', 'SKU', 'Description', 'Client', 'Qty', `Wholesale (${currency})`, 'Landed Cost (ZAR)', 'Est Retail (ZAR incl. VAT)', 'Final Landed (ZAR)', 'Landed Retail (ZAR)']
    const rows = items.filter((it) => it.sku || it.description).map((it, i) => {
      const landed = calcLanded(it.wholesalePrice)
      const retail = it.retailOverride !== '' ? Number(it.retailOverride) : calcRetail(it.wholesalePrice)
      const finalLanded = calcFinalLanded(it.wholesalePrice)
      const landedRetail = calcFinalRetail(it.wholesalePrice)
      return [i + 1, it.sku, `"${it.description.replace(/"/g, '""')}"`, `"${it.clientName}"`, it.qty, it.wholesalePrice.toFixed(2), landed.toFixed(2), retail.toFixed(2), it.wholesalePrice > 0 ? finalLanded.toFixed(2) : '', it.wholesalePrice > 0 ? landedRetail.toFixed(2) : '']
    })
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `worksheet-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Live Exchange Rates */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Live Exchange Rates → ZAR</p>
          <div className="flex items-center gap-3">
            {fxUpdated && <span className="text-xs text-gray-400">Updated {fxUpdated}</span>}
            <button onClick={fetchRates} disabled={fxLoading}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40 flex items-center gap-1">
              {fxLoading ? '⏳' : '↻'} {fxLoading ? 'Fetching…' : 'Refresh'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {DISPLAY_CURRENCIES.map((cur) => {
            const rate = fxRates[cur] ?? CURRENCY_DEFAULTS[cur]
            const isActive = currency === cur
            return (
              <button key={cur} onClick={() => { setCurrency(cur); setExchangeRate(rate) }}
                className={`rounded-xl p-3 text-center border transition-all ${isActive ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-300'}`}>
                <p className={`text-[11px] font-bold uppercase ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>{cur}</p>
                <p className={`text-lg font-bold leading-tight ${isActive ? 'text-white' : 'text-gray-900'}`}>R {rate.toFixed(2)}</p>
                <p className={`text-[10px] ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>per 1 {cur}</p>
              </button>
            )
          })}
        </div>
        <p className="text-[10px] text-gray-400 mt-2">Click a currency to apply it to the Costing Calculator · Rates via exchangerate-api.com · Auto-refresh every 5 min</p>
      </div>

      {/* Compact Costing Calculator */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3">Costing Calculator</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Currency</label>
            <select value={currency} onChange={(e) => handleCurrencyChange(e.target.value)}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              {Object.keys(CURRENCY_DEFAULTS).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">1 {currency} = R</label>
            <input type="number" min={0} step={0.01} value={exchangeRate} onChange={(e) => setExchangeRate(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm w-24 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Shipping &amp; Customs %</label>
            <input type="number" min={0} step={1} value={shippingPct} onChange={(e) => setShippingPct(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm w-24 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Markup %</label>
            <input type="number" min={0} step={1} value={markupPct} onChange={(e) => setMarkupPct(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm w-20 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">VAT %</label>
            <input type="number" min={0} step={1} value={vatPct} onChange={(e) => setVatPct(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm w-20 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          {/* Header client */}
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]" ref={headerClientRef}>
            <label className="text-xs text-gray-500">Client (header)</label>
            <div className="relative">
              <input
                value={headerClient || headerClientSearch}
                onFocus={() => { setHeaderClientSearch(''); setShowHeaderClientDrop(true) }}
                onChange={(e) => { setHeaderClientSearch(e.target.value); setHeaderClient(''); setShowHeaderClientDrop(true) }}
                placeholder="Search client..."
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {headerClient && (
                <button onClick={() => { setHeaderClient(''); setHeaderClientSearch('') }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
              {showHeaderClientDrop && headerClientMatches.length > 0 && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 w-full max-h-48 overflow-y-auto py-1">
                  {headerClientMatches.map((c) => (
                    <button key={c.id} type="button" onClick={() => { setHeaderClient(c.name); setHeaderClientSearch(''); setShowHeaderClientDrop(false) }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
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

      {/* Final Costing Calculator */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">Final Costing Calculator</p>
        <p className="text-xs text-emerald-600 mb-3">Drives the <span className="font-semibold">Final Landed</span> and <span className="font-semibold">Landed Retail</span> columns in the table below.</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Currency</label>
            <select value={finalCurrency} onChange={(e) => { setFinalCurrency(e.target.value); setFinalExRate(fxRates[e.target.value] ?? CURRENCY_DEFAULTS[e.target.value] ?? 1) }}
              className="border border-emerald-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400">
              {Object.keys(CURRENCY_DEFAULTS).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">1 {finalCurrency} = R</label>
            <input type="number" min={0} step={0.01} value={finalExRate} onChange={(e) => setFinalExRate(Number(e.target.value))}
              className="border border-emerald-200 rounded-lg px-2.5 py-1.5 text-sm w-24 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Shipping &amp; Customs %</label>
            <input type="number" min={0} step={1} value={finalShippingPct} onChange={(e) => setFinalShippingPct(Number(e.target.value))}
              className="border border-emerald-200 rounded-lg px-2.5 py-1.5 text-sm w-24 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Markup %</label>
            <input type="number" min={0} step={1} value={finalMarkupPct} onChange={(e) => setFinalMarkupPct(Number(e.target.value))}
              className="border border-emerald-200 rounded-lg px-2.5 py-1.5 text-sm w-20 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">VAT %</label>
            <input type="number" min={0} step={1} value={finalVatPct} onChange={(e) => setFinalVatPct(Number(e.target.value))}
              className="border border-emerald-200 rounded-lg px-2.5 py-1.5 text-sm w-20 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-gray-700">Items</p>
            <button onClick={() => setShowAddProduct(true)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg px-2.5 py-1 hover:bg-blue-50 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Product
            </button>
            <button onClick={() => setShowAddClient(true)}
              className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 border border-green-200 rounded-lg px-2.5 py-1 hover:bg-green-50 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Client
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadCSV} disabled={!hasItems}
              className="flex items-center gap-1.5 border border-gray-300 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M4 6h16" /></svg>
              Export CSV
            </button>
            <button onClick={downloadPDF} disabled={!hasItems}
              className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Download PDF
            </button>
          </div>
        </div>
        <div className="overflow-x-auto p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-400">
                <th className="text-left pb-2 w-6">#</th>
                <th className="text-left pb-2 px-2" style={{minWidth:'120px'}}>SKU</th>
                <th className="text-left pb-2 px-2" style={{minWidth:'160px'}}>Description</th>
                <th className="text-left pb-2 px-2" style={{minWidth:'140px'}}>Client</th>
                <th className="text-center pb-2 px-2 w-16">Qty</th>
                <th className="text-right pb-2 px-2" style={{minWidth:'130px'}}>Wholesale ({currency})</th>
                <th className="text-right pb-2 px-2" style={{minWidth:'120px'}}>Landed (ZAR)</th>
                <th className="text-right pb-2 px-2" style={{minWidth:'120px'}}>Est Retail (ZAR)</th>
                <th className="text-right pb-2 px-2" style={{minWidth:'130px'}}>Final Landed (ZAR)</th>
                <th className="text-right pb-2 px-2" style={{minWidth:'130px'}}>Landed Retail (ZAR)</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const landedCost = calcLanded(it.wholesalePrice)
                const autoRetail = calcRetail(it.wholesalePrice)
                const skuMatches = filteredProducts(it.skuSearch || it.sku)
                const clientMatches = filteredCustomers(it.clientSearch || it.clientName)
                return (
                  <tr key={it.id} className="border-b border-gray-50">
                    <td className="py-2 text-xs text-gray-400">{i + 1}</td>

                    {/* SKU — with product autofill */}
                    <td className="py-2 px-2">
                      <div className="relative">
                        <input
                          value={it.sku || it.skuSearch}
                          onFocus={() => setActiveSkuRow(it.id)}
                          onChange={(e) => { updateItem(it.id, { sku: '', skuSearch: e.target.value }); setActiveSkuRow(it.id) }}
                          placeholder="SKU or name"
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        {activeSkuRow === it.id && skuMatches.length > 0 && (
                          <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 w-64 max-h-48 overflow-y-auto py-1">
                            {skuMatches.map((p) => (
                              <button key={p.id} type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  updateItem(it.id, { sku: p.sku, skuSearch: '', description: p.title })
                                  setActiveSkuRow(null)
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50">
                                <span className="font-mono font-semibold text-blue-700">{p.sku}</span>
                                <span className="ml-2 text-gray-600">{p.title}</span>
                                {p.brand && <span className="ml-1 text-gray-400">· {p.brand}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-2 px-2">
                      <input
                        value={it.description}
                        onChange={(e) => updateItem(it.id, { description: e.target.value })}
                        onFocus={() => { setActiveSkuRow(null); setActiveClientRow(null) }}
                        placeholder="Description"
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </td>

                    {/* Client — with customer autofill */}
                    <td className="py-2 px-2">
                      <div className="relative">
                        <input
                          value={it.clientName || it.clientSearch}
                          onFocus={() => { setActiveClientRow(it.id); setActiveSkuRow(null) }}
                          onChange={(e) => { updateItem(it.id, { clientName: '', clientSearch: e.target.value }); setActiveClientRow(it.id) }}
                          onBlur={() => { if (!it.clientName && it.clientSearch) updateItem(it.id, { clientName: it.clientSearch, clientSearch: '' }) }}
                          placeholder="Client name"
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        {activeClientRow === it.id && clientMatches.length > 0 && (
                          <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 w-56 max-h-48 overflow-y-auto py-1">
                            {clientMatches.map((c) => (
                              <button key={c.id} type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => { updateItem(it.id, { clientName: c.name, clientSearch: '' }); setActiveClientRow(null) }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50">
                                <span className="font-medium text-gray-900">{c.name}</span>
                                {c.email && <span className="ml-1 text-gray-400 text-[10px]">{c.email}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Qty */}
                    <td className="py-2 px-2">
                      <input
                        type="number" min={1} step={1}
                        value={it.qty}
                        onChange={(e) => updateItem(it.id, { qty: Math.max(1, Number(e.target.value)) })}
                        onFocus={() => { setActiveSkuRow(null); setActiveClientRow(null) }}
                        className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </td>

                    {/* Wholesale */}
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-end">
                        <span className="text-xs text-gray-400 mr-1">{currency}</span>
                        <input
                          type="number" min={0} step={0.01}
                          value={it.wholesalePrice || ''}
                          onChange={(e) => updateItem(it.id, { wholesalePrice: Number(e.target.value) })}
                          onFocus={() => { setActiveSkuRow(null); setActiveClientRow(null) }}
                          placeholder="0.00"
                          className="w-24 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                    </td>

                    {/* Landed Cost — read-only */}
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-gray-400">R</span>
                        <span className={`w-24 px-2.5 py-1.5 text-xs text-right rounded-lg ${it.wholesalePrice > 0 ? 'text-gray-700 bg-gray-50 border border-gray-100' : 'text-gray-300'}`}>
                          {it.wholesalePrice > 0 ? fmtFC(landedCost) : '—'}
                        </span>
                      </div>
                    </td>

                    {/* Est Retail */}
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-gray-400">R</span>
                        <input
                          type="number" min={0} step={0.01}
                          value={it.retailOverride !== '' ? it.retailOverride : (it.wholesalePrice > 0 ? autoRetail.toFixed(2) : '')}
                          onChange={(e) => updateItem(it.id, { retailOverride: e.target.value })}
                          onBlur={(e) => { if (!e.target.value) updateItem(it.id, { retailOverride: '' }) }}
                          onFocus={() => { setActiveSkuRow(null); setActiveClientRow(null) }}
                          placeholder={it.wholesalePrice > 0 ? autoRetail.toFixed(2) : '0.00'}
                          className="w-24 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        {it.retailOverride !== '' && (
                          <button onClick={() => updateItem(it.id, { retailOverride: '' })} title="Reset to auto"
                            className="text-gray-300 hover:text-blue-500 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Final Landed Cost — read-only, uses Final calculator */}
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-gray-400">R</span>
                        <span className={`w-24 px-2.5 py-1.5 text-xs text-right rounded-lg ${it.wholesalePrice > 0 ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' : 'text-gray-300'}`}>
                          {it.wholesalePrice > 0 ? fmtFC(calcFinalLanded(it.wholesalePrice)) : '—'}
                        </span>
                      </div>
                    </td>

                    {/* Landed Retail — read-only, uses Final calculator */}
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-gray-400">R</span>
                        <span className={`w-24 px-2.5 py-1.5 text-xs text-right rounded-lg font-semibold ${it.wholesalePrice > 0 ? 'text-emerald-800 bg-emerald-100 border border-emerald-200' : 'text-gray-300'}`}>
                          {it.wholesalePrice > 0 ? fmtFC(calcFinalRetail(it.wholesalePrice)) : '—'}
                        </span>
                      </div>
                    </td>

                    {/* Remove */}
                    <td className="py-2 w-8">
                      <button onClick={() => removeItem(it.id)} disabled={items.length === 1}
                        className="text-gray-300 hover:text-red-400 disabled:opacity-20 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button onClick={addItem}
            className="mt-3 w-full border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-500 rounded-xl py-2 text-sm transition-colors">
            + Add Row
          </button>
        </div>
      </div>

      {/* ── Add Product Modal ── */}
      {showAddProduct && (
        <AddProductModal
          onClose={() => setShowAddProduct(false)}
          onSaved={() => { onRefresh(); setShowAddProduct(false) }}
        />
      )}

      {/* ── Add Client Modal ── */}
      {showAddClient && (
        <AddClientModal
          onClose={() => setShowAddClient(false)}
          onSaved={() => { onRefresh(); setShowAddClient(false) }}
        />
      )}
    </div>
  )
}

// ─── Add Product Modal ────────────────────────────────────────────────────────

function AddProductModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: '', sku: '', brand: '', description: '', price: '', cost_per_item: '',
    quantity: '', status: 'active', supplier: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) { setForm((f) => ({ ...f, [field]: value })) }

  async function save() {
    if (!form.title.trim()) { setError('Product name is required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: form.price ? Number(form.price) : 0,
          cost_per_item: form.cost_per_item ? Number(form.cost_per_item) : null,
          quantity: form.quantity ? Number(form.quantity) : 0,
        }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to save'); return }
      onSaved()
    } catch (e: any) {
      setError(e.message)
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Add New Product</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Product Name *</label>
              <input autoFocus value={form.title} onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Revo Slot Car 1/32"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">SKU</label>
              <input value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="SKU-001"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Brand</label>
              <input value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="e.g. Revo"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Retail Price (ZAR)</label>
              <input type="number" min={0} step={0.01} value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="0.00"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cost Price (ZAR)</label>
              <input type="number" min={0} step={0.01} value={form.cost_per_item} onChange={(e) => set('cost_per_item', e.target.value)} placeholder="0.00"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Qty in Stock</label>
              <input type="number" min={0} value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Short description..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Supplier</label>
              <input value={form.supplier} onChange={(e) => set('supplier', e.target.value)} placeholder="Supplier name"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving || !form.title.trim()}
            className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Client Modal ─────────────────────────────────────────────────────────

function AddClientModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    companyName: '', companyAddress: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) { setForm((f) => ({ ...f, [field]: value })) }

  async function save() {
    if (!form.firstName.trim() && !form.lastName.trim() && !form.email.trim()) {
      setError('At least a name or email is required'); return
    }
    setSaving(true); setError('')
    try {
      const body = { ...form, id: `client_${Date.now()}` }
      const [clRes, ctRes] = await Promise.all([
        fetch('/api/admin/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
        fetch('/api/admin/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      ])
      if (!clRes.ok && !ctRes.ok) { setError('Failed to save client'); return }
      onSaved()
    } catch (e: any) {
      setError(e.message)
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Add New Client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
              <input autoFocus value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="John"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
              <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Smith"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="john@example.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+27 ..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
              <input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="Company name (optional)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
              <input value={form.companyAddress} onChange={(e) => set('companyAddress', e.target.value)} placeholder="Delivery / billing address"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any notes..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 bg-green-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Add Client'}
          </button>
        </div>
      </div>
    </div>
  )
}
