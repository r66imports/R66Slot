'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'

// ── Types ─────────────────────────────────────────────────────────────────────

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

type ClientContact = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  companyName: string
  companyAddress: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Client Autofill Dropdown ──────────────────────────────────────────────────

function ClientAutofill({
  clients,
  onSelect,
}: {
  clients: ClientContact[]
  onSelect: (c: ClientContact) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? clients.filter(c => {
        const q = query.toLowerCase()
        return (
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.companyName.toLowerCase().includes(q)
        )
      })
    : clients

  useEffect(() => {
    function h(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleSelect = (c: ClientContact) => {
    setQuery(`${c.firstName} ${c.lastName}`.trim())
    setOpen(false)
    onSelect(c)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">🔍</span>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search saved customers to autofill…"
          className="w-full border-2 border-blue-200 focus:border-blue-400 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none bg-blue-50 focus:bg-white transition-colors"
          autoComplete="off"
        />
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-xl max-h-48 overflow-y-auto">
          {filtered.map(c => (
            <li
              key={c.id}
              onMouseDown={() => handleSelect(c)}
              className="flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-blue-50 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                {c.firstName.charAt(0)}{c.lastName.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{c.firstName} {c.lastName}</div>
                <div className="text-xs text-gray-500 truncate">{c.email}{c.phone ? ` · ${c.phone}` : ''}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── PDF Generation (matches orders page) ─────────────────────────────────────

async function buildPDFDoc(
  invoiceNumber: string,
  clientName: string,
  clientEmail: string,
  clientPhone: string,
  clientAddress: string,
  lineItems: { description: string; qty: number; unitPrice: number }[],
  template: OrderTemplate
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 18
  const col2 = pageW / 2 + 5
  let y = 18

  const subtotal = lineItems.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const vat = subtotal * 0.15
  const total = subtotal + vat

  // Logo
  if (template.logoUrl) {
    try {
      const res = await fetch(template.logoUrl)
      const blob = await res.blob()
      const dataUrl = await new Promise<string>(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      const ext = (template.logoUrl.split('.').pop() ?? 'png').toUpperCase()
      const fmt = ext === 'JPG' ? 'JPEG' : ['PNG', 'JPEG', 'WEBP'].includes(ext) ? ext : 'PNG'
      doc.addImage(dataUrl, fmt as 'PNG', margin, y, 0, 16)
    } catch { /* logo optional */ }
  }

  // Title block
  doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(31, 41, 55)
  doc.text('INVOICE', pageW - margin, y + 6, { align: 'right' })
  doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(50)
  doc.text(invoiceNumber, pageW - margin, y + 13, { align: 'right' })
  doc.setFontSize(9); doc.setTextColor(120)
  doc.text(fmtDateLong(new Date().toISOString()), pageW - margin, y + 19, { align: 'right' })
  y += 30

  // Divider
  doc.setDrawColor(220); doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y); y += 6

  // From / Bill To
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(160)
  doc.text('FROM', margin, y); doc.text('BILL TO', col2, y); y += 4
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30)
  doc.text(template.companyName || 'R66 Slot', margin, y)
  doc.text(clientName || 'Walk-in Customer', col2, y)
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(80)

  let fromY = y + 5
  if (template.companyAddress) {
    const lines = doc.splitTextToSize(template.companyAddress, pageW / 2 - margin - 5)
    doc.text(lines, margin, fromY); fromY += lines.length * 4.5
  }
  if (template.companyVAT) { doc.text(`VAT: ${template.companyVAT}`, margin, fromY); fromY += 4.5 }
  if (template.companyPhone) { doc.text(`Tel: ${template.companyPhone}`, margin, fromY); fromY += 4.5 }
  if (template.companyEmail) { doc.text(template.companyEmail, margin, fromY); fromY += 4.5 }

  let toY = y + 5
  if (clientEmail) { doc.text(clientEmail, col2, toY); toY += 4.5 }
  if (clientPhone) { doc.text(clientPhone, col2, toY); toY += 4.5 }
  if (clientAddress) {
    const lines = doc.splitTextToSize(clientAddress, pageW / 2 - margin - 5)
    doc.text(lines, col2, toY); toY += lines.length * 4.5
  }
  y = Math.max(fromY, toY) + 8

  // Line items table
  autoTable(doc, {
    startY: y,
    head: [['#', 'Description', 'Qty', 'Unit Price', 'Total']],
    body: lineItems.map((li, i) => [i + 1, li.description || '—', li.qty, fmtPrice(li.unitPrice), fmtPrice(li.qty * li.unitPrice)]),
    foot: [
      ['', '', '', 'Subtotal (excl. VAT)', fmtPrice(subtotal)],
      ['', '', '', 'VAT (15%)', fmtPrice(vat)],
      ['', '', '', 'TOTAL (incl. VAT)', fmtPrice(total)],
    ],
    headStyles: { fillColor: [31, 41, 55], fontSize: 8, fontStyle: 'bold', textColor: 255 },
    bodyStyles: { fontSize: 8.5, textColor: [40, 40, 40] },
    footStyles: { fontSize: 8.5, textColor: [31, 41, 55] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      2: { halign: 'right', cellWidth: 12 },
      3: { halign: 'right', cellWidth: 38 },
      4: { halign: 'right', cellWidth: 38, fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
    didParseCell(hookData) {
      if (hookData.section === 'foot' && hookData.row.index === 2) {
        hookData.cell.styles.fillColor = [31, 41, 55]
        hookData.cell.styles.textColor = [255, 255, 255]
        hookData.cell.styles.fontStyle = 'bold'
      }
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8

  // Banking
  if (template.bankName) {
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(29, 78, 216)
    doc.text('BANKING DETAILS', margin, y); y += 4
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(50)
    doc.text(`Bank: ${template.bankName}   |   Account: ${template.bankAccount}`, margin, y); y += 4.5
    doc.text(`Branch Code: ${template.bankBranch}   |   Account Type: ${template.bankType}`, margin, y); y += 8
  }

  // Terms
  if (template.invoiceTerms) {
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(150)
    doc.text('TERMS & CONDITIONS', margin, y); y += 4
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(120)
    const termLines = doc.splitTextToSize(template.invoiceTerms, pageW - margin * 2)
    doc.text(termLines, margin, y)
  }

  // Footer
  if (template.footerText) {
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(160)
    doc.text(template.footerText, pageW / 2, pageH - 10, { align: 'center' })
  }

  return doc
}

async function generateAndDownloadPDF(
  invoiceNumber: string,
  clientName: string,
  clientEmail: string,
  clientPhone: string,
  clientAddress: string,
  lineItems: { description: string; qty: number; unitPrice: number }[],
  template: OrderTemplate
) {
  const doc = await buildPDFDoc(invoiceNumber, clientName, clientEmail, clientPhone, clientAddress, lineItems, template)
  doc.save(`${invoiceNumber}.pdf`)
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
  const [clients, setClients] = useState<ClientContact[]>([])

  // Invoice modal
  const [showInvoice, setShowInvoice] = useState(false)
  const [invoiceClient, setInvoiceClient] = useState({ name: '', email: '', phone: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [savedInvoiceNum, setSavedInvoiceNum] = useState<string | null>(null)

  // Load template + clients
  useEffect(() => {
    fetch('/api/admin/orders/template')
      .then(r => r.ok ? r.json() : {})
      .then(t => setTemplate(t || {}))
      .catch(() => {})
    fetch('/api/admin/clients')
      .then(r => r.ok ? r.json() : [])
      .then(data => setClients(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const refocus = useCallback(() => {
    setTimeout(() => { if (!showInvoice) inputRef.current?.focus() }, 50)
  }, [showInvoice])

  useEffect(() => { inputRef.current?.focus() }, [])

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
    setInvoiceClient({ name: '', email: '', phone: '', address: '' })
    setShowInvoice(false)
    setSavedInvoiceNum(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // Invoice data
  const saleItems = buildLineItems(log)
  const subtotal = saleItems.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const vat = subtotal * 0.15
  const total = subtotal + vat
  const hasSaleItems = saleItems.length > 0

  // Save invoice to Orders then download PDF
  const handleSendInvoice = async () => {
    if (!hasSaleItems) return
    setSaving(true)
    try {
      const invNum = savedInvoiceNum || genInvoiceNumber()

      // Save to orders system
      if (!savedInvoiceNum) {
        const res = await fetch('/api/admin/orders/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'invoice',
            docNumber: invNum,
            date: new Date().toISOString().slice(0, 10),
            clientName: invoiceClient.name || 'Walk-in Customer',
            clientEmail: invoiceClient.email,
            clientPhone: invoiceClient.phone,
            clientAddress: invoiceClient.address,
            lineItems: saleItems.map((li, i) => ({
              id: `li_${i}`,
              description: li.description,
              qty: li.qty,
              unitPrice: li.unitPrice,
            })),
            notes: 'Created via POS scanner',
            terms: template.invoiceTerms || '',
            status: 'sent',
          }),
        })
        if (res.ok) setSavedInvoiceNum(invNum)
      }

      // Download PDF
      await generateAndDownloadPDF(
        invNum,
        invoiceClient.name,
        invoiceClient.email,
        invoiceClient.phone,
        invoiceClient.address,
        saleItems,
        template
      )
    } finally {
      setSaving(false)
    }
  }

  // WhatsApp — generate PDF and share via Web Share API (or download + open chat as fallback)
  const handleWhatsApp = async () => {
    if (!hasSaleItems) return
    setSaving(true)
    try {
      const invNum = savedInvoiceNum || genInvoiceNumber()

      // Save to orders if not yet saved
      if (!savedInvoiceNum) {
        const res = await fetch('/api/admin/orders/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'invoice',
            docNumber: invNum,
            date: new Date().toISOString().slice(0, 10),
            clientName: invoiceClient.name || 'Walk-in Customer',
            clientEmail: invoiceClient.email,
            clientPhone: invoiceClient.phone,
            clientAddress: invoiceClient.address,
            lineItems: saleItems.map((li, i) => ({
              id: `li_${i}`,
              description: li.description,
              qty: li.qty,
              unitPrice: li.unitPrice,
            })),
            notes: 'Created via POS scanner',
            terms: template.invoiceTerms || '',
            status: 'sent',
          }),
        })
        if (res.ok) setSavedInvoiceNum(invNum)
      }

      // Generate PDF blob
      const doc = await buildPDFDoc(
        invNum,
        invoiceClient.name,
        invoiceClient.email,
        invoiceClient.phone,
        invoiceClient.address,
        saleItems,
        template
      )
      const pdfBlob = doc.output('blob')
      const fileName = `${invNum}.pdf`
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' })

      // Try Web Share API with file (works on mobile + some desktop browsers)
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Invoice ${invNum}`,
          text: `Invoice ${invNum} from ${template.companyName || 'R66 Slot'}`,
        })
      } else {
        // Fallback: download the PDF, then open WhatsApp chat
        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        a.click()
        URL.revokeObjectURL(url)
        // Open WhatsApp (user attaches the downloaded PDF manually)
        const phone = invoiceClient.phone.replace(/\D/g, '').replace(/^0/, '27')
        const msg = `Hi, please find your invoice ${invNum} attached (just downloaded).`
        window.open(`https://wa.me/${phone || ''}?text=${encodeURIComponent(msg)}`, '_blank')
      }
    } finally {
      setSaving(false)
    }
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

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Point of Sale</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInvoice(true)}
              disabled={!hasSaleItems}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors shadow disabled:opacity-40 disabled:cursor-not-allowed"
            >
              📄 Send Invoice
            </button>
            <button
              onClick={handleNewSale}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              🆕 New Sale
            </button>
            <a
              href="/admin/products"
              className="text-sm text-gray-400 hover:text-white border border-gray-700 rounded px-3 py-1.5 transition-colors"
            >
              ← Products
            </a>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 mb-4">
          <p className="text-gray-400 font-semibold mb-1.5 text-xs uppercase tracking-wider">How to use</p>
          <ol className="text-gray-400 text-sm space-y-0.5">
            <li><span className="text-white font-medium">1.</span> Set <span className="text-white">Mode</span> — <span className="text-red-400">Sell −</span> for sales, <span className="text-green-400">Receive +</span> for stock intake, <span className="text-blue-400">Set =</span> for exact count</li>
            <li><span className="text-white font-medium">2.</span> Set <span className="text-white">Quantity</span> (default 1), then <span className="text-white">scan barcode</span> — stock updates instantly</li>
            <li><span className="text-white font-medium">3.</span> Keep scanning products — all scans are logged in the session</li>
            <li><span className="text-white font-medium">4.</span> Click <span className="text-indigo-400 font-medium">Send Invoice</span> → optionally search a saved customer → click <span className="text-white font-medium">Download PDF</span> or <span className="text-green-400 font-medium">WhatsApp</span> — invoice saves to Orders automatically</li>
            <li><span className="text-white font-medium">5.</span> Click <span className="text-gray-300 font-medium">New Sale</span> to clear and start fresh</li>
          </ol>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left — Controls + Scanner */}
          <div className="space-y-4">
            {/* Mode */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Mode</p>
              <div className="grid grid-cols-3 gap-2">
                {(['subtract', 'add', 'set'] as Mode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); refocus() }}
                    className={`py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
                      mode === m ? modeColor[m] + ' text-white shadow-lg scale-105' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
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

            {error && (
              <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-red-300 text-sm">{error}</div>
            )}
            {(loading || updating) && (
              <div className="text-center text-gray-400 text-sm py-2 animate-pulse">
                {loading ? 'Looking up product...' : 'Updating stock...'}
              </div>
            )}
          </div>

          {/* Right — Product Card + Session Log */}
          <div className="space-y-4">
            {product ? (
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="flex gap-4 p-4">
                  {imageUrl ? (
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
                      <Image src={imageUrl} alt={product.title} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-gray-800 flex items-center justify-center text-gray-600 text-2xl">📦</div>
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
                    className={`flex flex-col items-center px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${modeColor[mode]} text-white shadow-lg`}
                  >
                    <span className="text-lg leading-none">{mode === 'add' ? `+${qty}` : mode === 'subtract' ? `−${qty}` : `=${qty}`}</span>
                    <span className="text-[10px] font-semibold opacity-90 mt-0.5">{updating ? 'Saving…' : 'Save to Inventory'}</span>
                  </button>
                </div>
                <div className="border-t border-gray-800 px-4 py-2 flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${product.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <span className="text-xs text-gray-500 capitalize">{product.status}</span>
                  <a href={`/admin/products/${product.id}`} className="ml-auto text-xs text-blue-400 hover:text-blue-300" target="_blank" rel="noreferrer">
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
                  <button onClick={() => setLog([])} className="text-xs text-gray-600 hover:text-gray-400">Clear</button>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-gray-800">
                  {log.map(entry => (
                    <div key={entry.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                      <span className="text-gray-600 text-xs w-14 flex-shrink-0">{entry.ts}</span>
                      <span className={`text-xs font-bold w-4 flex-shrink-0 ${
                        entry.mode === 'add' ? 'text-green-400' : entry.mode === 'subtract' ? 'text-red-400' : 'text-blue-400'
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
          <div className="bg-white text-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Send Invoice</h2>
                <p className="text-sm text-gray-500">
                  {saleItems.length} line item{saleItems.length !== 1 ? 's' : ''} · {fmtPrice(total)} incl. VAT
                  {savedInvoiceNum && <span className="ml-2 text-green-600 font-medium">✓ Saved to Orders</span>}
                </p>
              </div>
              <button
                onClick={() => { setShowInvoice(false); refocus() }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 text-xl"
              >×</button>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* Customer Search */}
              <div className="px-6 pt-4 pb-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Customer</p>
                {clients.length > 0 && (
                  <div className="mb-3">
                    <ClientAutofill
                      clients={clients}
                      onSelect={c => setInvoiceClient({
                        name: `${c.firstName} ${c.lastName}`.trim(),
                        email: c.email,
                        phone: c.phone,
                        address: c.companyAddress || '',
                      })}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Name (or leave blank for Walk-in Customer)"
                    value={invoiceClient.name}
                    onChange={e => setInvoiceClient(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="email"
                      placeholder="Email"
                      value={invoiceClient.email}
                      onChange={e => setInvoiceClient(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="tel"
                      placeholder="WhatsApp / phone"
                      value={invoiceClient.phone}
                      onChange={e => setInvoiceClient(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Line Items Summary */}
              <div className="px-6 py-4 border-b border-gray-100">
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
            </div>

            {/* Actions */}
            <div className="px-6 py-4 flex flex-col gap-2 border-t border-gray-100 flex-shrink-0">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSendInvoice}
                  disabled={saving}
                  className="flex flex-col items-center gap-1 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  <span className="text-xl">📥</span>
                  {saving ? 'Saving...' : 'Download PDF'}
                </button>
                <button
                  onClick={handleWhatsApp}
                  disabled={saving}
                  className="flex flex-col items-center gap-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  <span className="text-xl">💬</span>
                  {saving ? 'Preparing…' : 'WhatsApp PDF'}
                </button>
              </div>
              <button
                onClick={() => { setShowInvoice(false); handleNewSale() }}
                className="w-full py-2.5 border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-xl text-sm font-bold transition-colors"
              >
                ✓ Done — Start New Sale
              </button>
              <a
                href="/admin/orders#invoices"
                className="text-center text-xs text-gray-400 hover:text-gray-600"
                target="_blank"
                rel="noreferrer"
              >
                View all invoices in Orders →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
