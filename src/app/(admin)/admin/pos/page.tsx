'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'

type Product = {
  id: string
  title: string
  sku: string
  barcode: string | null
  brand: string | null
  price: number
  quantity: number | null
  trackQuantity: boolean
  status: string
  imageUrl: string | null
  images: string[]
}

type LogEntry = {
  id: string
  ts: string
  product: Product
  mode: 'add' | 'subtract' | 'set'
  qty: number
  newQty: number
}

type Mode = 'add' | 'subtract' | 'set'

type OrderTemplate = {
  companyName?: string
  companyAddress?: string
  companyVAT?: string
  companyPhone?: string
  companyEmail?: string
  logoUrl?: string
  bankName?: string
  bankAccount?: string
  bankBranch?: string
  bankType?: string
  invoiceTerms?: string
  footerText?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(n: number) {
  return `R ${n.toFixed(2)}`
}

function fmtDateLong(d: string) {
  return new Date(d).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })
}

function genInvoiceNumber() {
  const now = new Date()
  return `POS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
}

// Groups session log entries by product for invoice line items
function buildLineItems(log: LogEntry[]) {
  const map = new Map<string, { description: string; qty: number; unitPrice: number; sku: string }>()
  for (const entry of log) {
    if (entry.mode !== 'subtract') continue
    const key = entry.product.id
    if (map.has(key)) {
      map.get(key)!.qty += entry.qty
    } else {
      map.set(key, {
        description: entry.product.title + (entry.product.sku ? ` (${entry.product.sku})` : ''),
        qty: entry.qty,
        unitPrice: entry.product.price,
        sku: entry.product.sku,
      })
    }
  }
  return Array.from(map.values())
}

function generateInvoiceHTML(
  invoiceNumber: string,
  clientName: string,
  clientEmail: string,
  clientPhone: string,
  lineItems: { description: string; qty: number; unitPrice: number }[],
  template: OrderTemplate
): string {
  const subtotal = lineItems.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const vat = subtotal * 0.15
  const total = subtotal + vat
  const date = new Date().toISOString()

  const rowsHTML = lineItems.map((li, i) =>
    `<tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
      <td style="padding:7px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#9ca3af">${i + 1}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #f3f4f6">${li.description}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #f3f4f6;text-align:right">${li.qty}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #f3f4f6;text-align:right">${fmtPrice(li.unitPrice)}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600">${fmtPrice(li.qty * li.unitPrice)}</td>
    </tr>`
  ).join('')

  const bankHTML = template.bankName
    ? `<div style="margin-bottom:16px;padding:12px;background:#eff6ff;border-radius:8px;border:1px solid #dbeafe">
        <div style="font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;margin-bottom:6px">Banking Details</div>
        <table style="width:100%"><tr>
          <td style="font-size:12px">Bank: <strong>${template.bankName}</strong></td>
          <td style="font-size:12px">Account: <strong>${template.bankAccount}</strong></td>
        </tr><tr>
          <td style="font-size:12px">Branch: <strong>${template.bankBranch}</strong></td>
          <td style="font-size:12px">Type: <strong>${template.bankType}</strong></td>
        </tr></table>
      </div>`
    : ''

  return `<!DOCTYPE html><html><head><title>${invoiceNumber}</title>
  <style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:40px;color:#111;font-size:14px}@media print{body{margin:20px}}</style>
  </head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
    <div>${template.logoUrl ? `<img src="${template.logoUrl}" style="height:64px;width:auto;object-fit:contain"/>` : ''}</div>
    <div style="text-align:right">
      <div style="font-size:24px;font-weight:700;letter-spacing:0.1em;color:#1f2937">INVOICE</div>
      <div style="font-size:16px;font-weight:600;margin-top:4px">${invoiceNumber}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:2px">${fmtDateLong(date)}</div>
    </div>
  </div>
  <div style="display:flex;gap:32px;margin-bottom:20px;padding-top:16px;border-top:1px solid #e5e7eb">
    <div style="flex:1">
      <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">From</div>
      <div style="font-weight:600">${template.companyName || 'R66 Slot'}</div>
      ${template.companyAddress ? `<div style="font-size:12px;color:#4b5563;white-space:pre-line">${template.companyAddress}</div>` : ''}
      ${template.companyVAT ? `<div style="font-size:12px;color:#6b7280">VAT: ${template.companyVAT}</div>` : ''}
      ${template.companyPhone ? `<div style="font-size:12px;color:#6b7280">Tel: ${template.companyPhone}</div>` : ''}
      ${template.companyEmail ? `<div style="font-size:12px;color:#6b7280">${template.companyEmail}</div>` : ''}
    </div>
    <div style="flex:1">
      <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Bill To</div>
      <div style="font-weight:600">${clientName || 'Walk-in Customer'}</div>
      ${clientEmail ? `<div style="font-size:12px;color:#4b5563">${clientEmail}</div>` : ''}
      ${clientPhone ? `<div style="font-size:12px;color:#4b5563">${clientPhone}</div>` : ''}
    </div>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
    <thead><tr style="background:#1f2937;color:white">
      <th style="padding:8px 12px;text-align:left;font-size:13px">#</th>
      <th style="padding:8px 12px;text-align:left;font-size:13px">Description</th>
      <th style="padding:8px 12px;text-align:right;font-size:13px">Qty</th>
      <th style="padding:8px 12px;text-align:right;font-size:13px">Unit Price</th>
      <th style="padding:8px 12px;text-align:right;font-size:13px">Total</th>
    </tr></thead>
    <tbody>${rowsHTML}</tbody>
  </table>
  <div style="display:flex;justify-content:flex-end;margin-bottom:20px">
    <div style="width:260px">
      <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f3f4f6"><span style="color:#6b7280">Subtotal (excl. VAT)</span><span style="font-weight:500">${fmtPrice(subtotal)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f3f4f6"><span style="color:#6b7280">VAT (15%)</span><span style="font-weight:500">${fmtPrice(vat)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 12px;margin-top:4px;background:#1f2937;color:white;border-radius:8px;font-weight:700"><span>TOTAL</span><span>${fmtPrice(total)}</span></div>
    </div>
  </div>
  ${bankHTML}
  ${template.invoiceTerms ? `<div style="margin-bottom:16px"><div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Terms &amp; Conditions</div><div style="font-size:12px;color:#6b7280;white-space:pre-line">${template.invoiceTerms}</div></div>` : ''}
  ${template.footerText ? `<div style="padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af">${template.footerText}</div>` : ''}
  </body></html>`
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function POSPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const qtyRef = useRef<HTMLInputElement>(null)

  const [scanValue, setScanValue] = useState('')
  const [qty, setQty] = useState(1)
  const [mode, setMode] = useState<Mode>('subtract')
  const [product, setProduct] = useState<Product | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [log, setLog] = useState<LogEntry[]>([])
  const [flash, setFlash] = useState<'success' | 'error' | null>(null)
  const [template, setTemplate] = useState<OrderTemplate>({})

  // Invoice modal state
  const [showInvoice, setShowInvoice] = useState(false)
  const [invoiceClient, setInvoiceClient] = useState({ name: '', email: '', phone: '' })

  // Load order template for company details
  useEffect(() => {
    fetch('/api/admin/orders/template')
      .then(r => r.ok ? r.json() : {})
      .then(t => setTemplate(t || {}))
      .catch(() => {})
  }, [])

  // Always keep barcode input focused (unless invoice modal is open)
  const refocus = useCallback(() => {
    setTimeout(() => { if (!showInvoice) inputRef.current?.focus() }, 50)
  }, [showInvoice])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const triggerFlash = (type: 'success' | 'error') => {
    setFlash(type)
    setTimeout(() => setFlash(null), 800)
  }

  const handleScan = useCallback(async (value: string) => {
    const q = value.trim()
    if (!q) return
    setScanValue('')
    setError(null)
    setProduct(null)
    setLoading(true)

    try {
      const res = await fetch(`/api/admin/pos/scan?q=${encodeURIComponent(q)}`)
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Product not found')
        triggerFlash('error')
        refocus()
        return
      }
      const data: Product = await res.json()
      setProduct(data)
      await applyStock(data, mode, qty)
    } finally {
      setLoading(false)
      refocus()
    }
  }, [mode, qty, refocus]) // eslint-disable-line react-hooks/exhaustive-deps

  const applyStock = async (p: Product, m: Mode, q: number) => {
    setUpdating(true)
    try {
      const res = await fetch('/api/admin/pos/stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, mode: m, qty: q }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Update failed')
        triggerFlash('error')
        return
      }
      const data = await res.json()
      const updated = { ...p, quantity: data.quantity }
      setProduct(updated)
      const entry: LogEntry = {
        id: `${Date.now()}-${p.id}`,
        ts: new Date().toLocaleTimeString(),
        product: updated,
        mode: m,
        qty: q,
        newQty: data.quantity,
      }
      setLog(prev => [entry, ...prev].slice(0, 100))
      triggerFlash('success')
    } finally {
      setUpdating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleScan(scanValue)
  }

  const handleManualApply = () => {
    if (product) applyStock(product, mode, qty)
  }

  const handleNewSale = () => {
    setLog([])
    setProduct(null)
    setError(null)
    setScanValue('')
    setInvoiceClient({ name: '', email: '', phone: '' })
    setShowInvoice(false)
    refocus()
  }

  // Invoice actions
  const saleItems = buildLineItems(log)
  const subtotal = saleItems.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const vat = subtotal * 0.15
  const total = subtotal + vat

  const handlePrintInvoice = () => {
    const invNum = genInvoiceNumber()
    const html = generateInvoiceHTML(invNum, invoiceClient.name, invoiceClient.email, invoiceClient.phone, saleItems, template)
    const win = window.open('', '_blank', 'width=920,height=750')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  const handleEmailInvoice = () => {
    const invNum = genInvoiceNumber()
    const lines = saleItems.map((li, i) =>
      `  ${i + 1}. ${li.description}  ×${li.qty}  @  ${fmtPrice(li.unitPrice)}  =  ${fmtPrice(li.qty * li.unitPrice)}`
    ).join('\n')
    const banking = template.bankName
      ? `\nBANKING DETAILS\nBank: ${template.bankName}  |  Account: ${template.bankAccount}\nBranch: ${template.bankBranch}  |  Type: ${template.bankType}\n`
      : ''
    const subject = `Invoice ${invNum} – ${template.companyName || 'R66 Slot'}`
    const body = [
      `Dear ${invoiceClient.name || 'Customer'},`,
      '',
      'Please see your invoice details below.',
      '',
      `INVOICE: ${invNum}`,
      `Date: ${fmtDateLong(new Date().toISOString())}`,
      '',
      'ITEMS',
      '─'.repeat(52),
      lines,
      '─'.repeat(52),
      `Subtotal (excl. VAT):  ${fmtPrice(subtotal)}`,
      `VAT (15%):             ${fmtPrice(vat)}`,
      `TOTAL (incl. VAT):     ${fmtPrice(total)}`,
      banking,
      template.invoiceTerms ? `\nTERMS & CONDITIONS\n${template.invoiceTerms}` : '',
      '',
      'Kind regards,',
      template.companyName || 'R66 Slot',
      template.companyPhone ? `Tel: ${template.companyPhone}` : '',
      template.companyEmail || '',
    ].filter(l => l !== undefined).join('\n')

    window.location.href = `mailto:${invoiceClient.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const handleWhatsAppInvoice = () => {
    const invNum = genInvoiceNumber()
    const lines = saleItems.map((li, i) =>
      `${i + 1}. ${li.description} ×${li.qty} @ ${fmtPrice(li.unitPrice)} = ${fmtPrice(li.qty * li.unitPrice)}`
    ).join('\n')
    const msg = [
      `*Invoice ${invNum}*`,
      `Date: ${fmtDateLong(new Date().toISOString())}`,
      '',
      lines,
      '',
      `Subtotal: ${fmtPrice(subtotal)}`,
      `VAT (15%): ${fmtPrice(vat)}`,
      `*TOTAL: ${fmtPrice(total)}*`,
      template.bankName ? `\nBanking: ${template.bankName} – ${template.bankAccount}` : '',
    ].filter(Boolean).join('\n')

    const phone = invoiceClient.phone.replace(/\D/g, '').replace(/^0/, '27')
    window.open(`https://wa.me/${phone || ''}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const modeColor: Record<Mode, string> = {
    add: 'bg-green-600 hover:bg-green-700',
    subtract: 'bg-red-600 hover:bg-red-700',
    set: 'bg-blue-600 hover:bg-blue-700',
  }

  const flashBorder =
    flash === 'success' ? 'ring-4 ring-green-400' :
    flash === 'error' ? 'ring-4 ring-red-400' : ''

  const imageUrl = product?.images?.[0] || product?.imageUrl || null
  const hasSaleItems = saleItems.length > 0

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Point of Sale</h1>
          </div>
          <div className="flex items-center gap-2">
            {hasSaleItems && (
              <>
                <button
                  onClick={() => setShowInvoice(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors shadow"
                >
                  📄 Send Invoice
                </button>
                <button
                  onClick={handleNewSale}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  🆕 New Sale
                </button>
              </>
            )}
            <a
              href="/admin/products"
              className="text-sm text-gray-400 hover:text-white border border-gray-700 rounded px-3 py-1.5 transition-colors"
            >
              ← Products
            </a>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 mb-4 text-sm">
          <p className="text-gray-400 font-semibold mb-1.5 text-xs uppercase tracking-wider">How to use</p>
          <ol className="text-gray-400 space-y-0.5 list-none">
            <li><span className="text-white font-medium">1.</span> Set <span className="text-white">Mode</span> — <span className="text-red-400">Sell −</span> to sell, <span className="text-green-400">Receive +</span> to add stock, <span className="text-blue-400">Set =</span> to set exact quantity</li>
            <li><span className="text-white font-medium">2.</span> Set <span className="text-white">Quantity</span> (default 1), then <span className="text-white">scan a barcode</span> — stock updates instantly</li>
            <li><span className="text-white font-medium">3.</span> Keep scanning products. Each scan is logged in the session below</li>
            <li><span className="text-white font-medium">4.</span> When done, click <span className="text-indigo-400 font-medium">Send Invoice</span> → enter customer details → Print, Email or WhatsApp</li>
            <li><span className="text-white font-medium">5.</span> Click <span className="text-gray-300 font-medium">New Sale</span> to clear the session and start fresh</li>
          </ol>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left — Scanner + Controls */}
          <div className="space-y-4">
            {/* Mode Selector */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Mode</p>
              <div className="grid grid-cols-3 gap-2">
                {(['subtract', 'add', 'set'] as Mode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); refocus() }}
                    className={`py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
                      mode === m
                        ? modeColor[m] + ' text-white shadow-lg scale-105'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {m === 'add' ? 'Receive +' : m === 'subtract' ? 'Sell −' : 'Set ='}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {mode === 'add' ? 'Add stock (receiving goods)' : mode === 'subtract' ? 'Sell / remove stock' : 'Set exact stock count'}
              </p>
            </div>

            {/* Quantity */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Quantity</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setQty(q => Math.max(1, q - 1)); refocus() }}
                  className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 text-xl font-bold flex items-center justify-center"
                >−</button>
                <input
                  ref={qtyRef}
                  type="number"
                  min={1}
                  value={qty}
                  onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  onBlur={() => setTimeout(() => refocus(), 100)}
                  className="w-20 text-center text-xl font-bold bg-gray-800 border border-gray-700 rounded-lg py-2 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => { setQty(q => q + 1); refocus() }}
                  className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 text-xl font-bold flex items-center justify-center"
                >+</button>
              </div>
            </div>

            {/* Barcode Input */}
            <div className={`bg-gray-900 rounded-xl p-4 border border-gray-800 transition-all ${flashBorder}`}>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Barcode / SKU</p>
              <input
                ref={inputRef}
                type="text"
                value={scanValue}
                onChange={e => setScanValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Waiting for scan..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-lg font-mono focus:outline-none focus:border-blue-500 placeholder-gray-600"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <p className="text-xs text-gray-600 mt-2">Scanner sends Enter automatically — or type SKU and press Enter</p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Loading */}
            {(loading || updating) && (
              <div className="text-center text-gray-400 text-sm py-2 animate-pulse">
                {loading ? 'Looking up product...' : 'Updating stock...'}
              </div>
            )}
          </div>

          {/* Right — Product Card + Session Log */}
          <div className="space-y-4">
            {/* Last Scanned Product */}
            {product ? (
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="flex gap-4 p-4">
                  {imageUrl ? (
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
                      <Image src={imageUrl} alt={product.title} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-gray-800 flex items-center justify-center text-gray-600 text-2xl">
                      📦
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-white leading-tight">{product.title}</h2>
                    {product.brand && <p className="text-sm text-gray-400 mt-0.5">{product.brand}</p>}
                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                      {product.sku && <span>SKU: {product.sku}</span>}
                      {product.barcode && <span>Barcode: {product.barcode}</span>}
                    </div>
                    <p className="text-sm text-gray-300 mt-1">R {product.price?.toFixed(2)}</p>
                  </div>
                </div>

                <div className="border-t border-gray-800 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Stock on Hand</p>
                    <p className={`text-3xl font-bold mt-0.5 ${
                      product.quantity === null ? 'text-gray-500' :
                      product.quantity <= 0 ? 'text-red-400' :
                      product.quantity <= 5 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {product.trackQuantity ? (product.quantity ?? '—') : 'Untracked'}
                    </p>
                  </div>
                  <button
                    onClick={handleManualApply}
                    disabled={updating}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${modeColor[mode]} text-white`}
                  >
                    {mode === 'add' ? `+ ${qty}` : mode === 'subtract' ? `− ${qty}` : `= ${qty}`}
                  </button>
                </div>

                <div className="border-t border-gray-800 px-4 py-2 flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${product.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <span className="text-xs text-gray-500 capitalize">{product.status}</span>
                  <a
                    href={`/admin/products/${product.id}`}
                    className="ml-auto text-xs text-blue-400 hover:text-blue-300"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Edit product →
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-xl border border-dashed border-gray-700 p-10 text-center text-gray-600">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-sm">Scan a barcode or type a SKU to get started</p>
              </div>
            )}

            {/* Session Log */}
            {log.length > 0 && (
              <div className="bg-gray-900 rounded-xl border border-gray-800">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Session Log</p>
                    {hasSaleItems && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {saleItems.reduce((s, l) => s + l.qty, 0)} items sold · <span className="text-white font-medium">{fmtPrice(total)}</span> incl. VAT
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setLog([])}
                    className="text-xs text-gray-600 hover:text-gray-400"
                  >
                    Clear
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-800">
                  {log.map(entry => (
                    <div key={entry.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                      <span className="text-gray-600 text-xs w-14 flex-shrink-0">{entry.ts}</span>
                      <span className={`text-xs font-bold w-4 flex-shrink-0 ${
                        entry.mode === 'add' ? 'text-green-400' :
                        entry.mode === 'subtract' ? 'text-red-400' : 'text-blue-400'
                      }`}>
                        {entry.mode === 'add' ? '+' : entry.mode === 'subtract' ? '−' : '='}
                      </span>
                      <span className="flex-1 truncate text-gray-300">{entry.product.title}</span>
                      <span className="text-gray-500 text-xs flex-shrink-0">
                        {entry.mode === 'add' ? `+${entry.qty}` : entry.mode === 'subtract' ? `−${entry.qty}` : `=${entry.qty}`}
                        {' → '}
                        <span className={entry.newQty <= 0 ? 'text-red-400' : 'text-white'}>{entry.newQty}</span>
                      </span>
                    </div>
                  ))}
                </div>
                {hasSaleItems && (
                  <div className="px-4 py-3 border-t border-gray-800 flex gap-2">
                    <button
                      onClick={() => setShowInvoice(true)}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      📄 Send Invoice
                    </button>
                    <button
                      onClick={handleNewSale}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold rounded-lg transition-colors"
                    >
                      New Sale
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoice && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowInvoice(false) }}
        >
          <div className="bg-white text-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Send Invoice</h2>
                <p className="text-sm text-gray-500">{saleItems.length} line item{saleItems.length !== 1 ? 's' : ''} · {fmtPrice(total)} incl. VAT</p>
              </div>
              <button
                onClick={() => { setShowInvoice(false); refocus() }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 text-xl"
              >×</button>
            </div>

            {/* Customer Details */}
            <div className="px-6 py-4 space-y-3 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer Details (optional)</p>
              <input
                type="text"
                placeholder="Customer name"
                value={invoiceClient.name}
                onChange={e => setInvoiceClient(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
              <input
                type="email"
                placeholder="Email address"
                value={invoiceClient.email}
                onChange={e => setInvoiceClient(prev => ({ ...prev, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
              <input
                type="tel"
                placeholder="WhatsApp / phone number"
                value={invoiceClient.phone}
                onChange={e => setInvoiceClient(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Line Items Summary */}
            <div className="px-6 py-4 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Items</p>
              <div className="space-y-1.5">
                {saleItems.map((li, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700 flex-1 truncate pr-3">{li.description} <span className="text-gray-400">×{li.qty}</span></span>
                    <span className="font-medium text-gray-900 flex-shrink-0">{fmtPrice(li.qty * li.unitPrice)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal (excl. VAT)</span><span>{fmtPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>VAT (15%)</span><span>{fmtPrice(vat)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-900 pt-1">
                  <span>Total</span><span>{fmtPrice(total)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handlePrintInvoice}
                  className="flex flex-col items-center gap-1 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  <span className="text-xl">🖨️</span>
                  Print
                </button>
                <button
                  onClick={handleEmailInvoice}
                  className="flex flex-col items-center gap-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  <span className="text-xl">✉️</span>
                  Email
                </button>
                <button
                  onClick={handleWhatsAppInvoice}
                  className="flex flex-col items-center gap-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  <span className="text-xl">💬</span>
                  WhatsApp
                </button>
              </div>
              <button
                onClick={() => {
                  setShowInvoice(false)
                  handleNewSale()
                }}
                className="w-full py-2.5 border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-xl text-sm font-bold transition-colors"
              >
                ✓ Done — Start New Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
