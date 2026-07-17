'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Contact {
  id: string; firstName: string; lastName: string; email?: string; phone?: string
}

interface SupplierContact {
  id: string; name: string; preferredCurrency?: string
}

interface DashboardCustomer {
  id: string; name: string; email?: string; phone?: string
  qty: number; depositPaid?: boolean; depositPaidDate?: string
  linkedDocNumber?: string
  linkedDocId?: string
}

interface DashboardItem {
  id: string
  sku: string
  description: string
  retailPrice: string
  estimatedRetailPrice: string
  wholesalePrice?: string
  wholesaleCurrency?: string
  supplierSRP?: string
  supplierDiscount?: string
  wholesalePrice2?: string
  wholesaleCurrency2?: string
  supplierSRP2?: string
  supplierDiscount2?: string
  estimatedRetailPrice2?: string
  moq2Qty?: number
  moq2Enabled?: boolean
  moq2ResellerOnly?: boolean
  showRetail?: boolean
  eta: string
  cutoffDate?: string
  orderPlaced?: boolean
  published?: boolean
  supplier: string
  brand: string
  unit: string
  imageUrl?: string
  seoTitle?: string
  seoDescription?: string
  seoImageUrl?: string
  shipmentStatus?: 'preorder' | 'shipping_soon' | 'shipping'
  linkedWsId?: string
  customers: DashboardCustomer[]
  extraQty?: number
  minOrderQty?: number | null
  resellerMoq?: number
  resellerOnly?: boolean
  onSalesPage?: boolean
  salesTier1Discount?: number | null
  salesTier2Discount?: number | null
  notes?: string
  createdAt: string
  updatedAt?: string
}

type FormState = Omit<DashboardItem, 'id' | 'createdAt'>

interface DashboardOptions { brands: string[]; units: string[]; etas: string[] }

interface CostingSettings { shippingMarkup: number; markup: number; includeVAT: boolean }

const CURRENCIES = ['ZAR', 'USD', 'CNY', 'EUR', 'GBP', 'HKD', 'SGD', 'JPY', 'AUD', 'CAD']

const EMPTY_FORM = (): FormState => ({
  sku: '', description: '', retailPrice: '', estimatedRetailPrice: '',
  wholesalePrice: '', wholesaleCurrency: 'ZAR', supplierSRP: '', supplierDiscount: '',
  wholesalePrice2: '', wholesaleCurrency2: 'CNY', supplierSRP2: '', supplierDiscount2: '',
  estimatedRetailPrice2: '', moq2Qty: 0, moq2Enabled: false, moq2ResellerOnly: false,
  eta: '', cutoffDate: '', orderPlaced: false, published: false, supplier: '', brand: '', unit: '',
  imageUrl: undefined, customers: [], extraQty: 0, minOrderQty: null,
  resellerMoq: 1, resellerOnly: false,
  onSalesPage: false, salesTier1Discount: null, salesTier2Discount: null,
  seoTitle: '', seoDescription: '', seoImageUrl: undefined,
  shipmentStatus: undefined, linkedWsId: undefined,
  showRetail: true,
})

function daysUntilCutoff(date: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const cutoff = new Date(date); cutoff.setHours(0, 0, 0, 0)
  return Math.ceil((cutoff.getTime() - today.getTime()) / 86_400_000)
}

function cutoffAlert(cutoffDate?: string): { active: boolean; days: number } {
  if (!cutoffDate) return { active: false, days: Infinity }
  const days = daysUntilCutoff(cutoffDate)
  return { active: days >= 0 && days <= 2, days }
}

function parsePrice(s: string): number {
  const n = parseFloat((s || '').replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

function calcRetailPrice(
  wholesalePrice: string,
  currency: string,
  rates: Record<string, number>,
  settings: CostingSettings,
  supplier?: string
): string {
  const price = parsePrice(wholesalePrice)
  if (!price || !currency) return ''
  const toZAR = currency === 'ZAR' ? 1 : (rates[currency] || 0)
  if (!toZAR) return ''

  // Motorhelix fixed formula: wholesale USD × 1.20 × 1.30 → ZAR (no VAT, no shipping markup)
  if (supplier?.toLowerCase() === 'motorhelix' && currency === 'USD') {
    return (price * 1.20 * 1.30 * toZAR).toFixed(2)
  }

  const costZAR = price * toZAR
  const withShipping = costZAR * (1 + settings.shippingMarkup / 100)
  const withMarkup = withShipping * (1 + settings.markup / 100)
  const final = settings.includeVAT ? withMarkup * 1.15 : withMarkup
  return final.toFixed(2)
}

// ─── TagInputDropdown ─────────────────────────────────────────────────────────
function TagInputDropdown({ value, onChange, options, onAddOption, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]
  onAddOption: (v: string) => void; placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const filtered = value.trim() ? options.filter(o => o.toLowerCase().includes(value.toLowerCase())) : options
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const canAdd = value.trim().length > 0 && !options.includes(value.trim())
  return (
    <div ref={ref} className="relative flex gap-1">
      <div className="flex-1 relative">
        <input type="text" value={value} onChange={e => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)} placeholder={placeholder}
          className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
        {open && filtered.length > 0 && (
          <ul className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto mt-0.5">
            {filtered.map(o => (
              <li key={o} onMouseDown={() => { onChange(o); setOpen(false) }}
                className="px-3 py-2 cursor-pointer hover:bg-indigo-50 text-sm">{o}</li>
            ))}
          </ul>
        )}
      </div>
      {canAdd && (
        <button type="button" onMouseDown={e => { e.preventDefault(); onAddOption(value.trim()) }}
          className="shrink-0 text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 font-semibold">
          Add+
        </button>
      )}
    </div>
  )
}

// ─── ContactSearch ────────────────────────────────────────────────────────────
function ContactSearch({ contacts, onSelect, onAddManual, placeholder = 'Search or type name, press Enter…' }: {
  contacts: Contact[]; onSelect: (c: Contact) => void
  onAddManual: (name: string) => void; placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const filtered = query.trim()
    ? contacts.filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase()) || c.email?.toLowerCase().includes(query.toLowerCase()))
    : contacts.slice(0, 8)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const commit = () => { if (!query.trim()) return; onAddManual(query.trim()); setQuery(''); setOpen(false) }
  return (
    <div ref={ref} className="relative flex gap-1">
      <div className="flex-1 relative">
        <input type="text" value={query} onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}
          placeholder={placeholder}
          className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
        {open && (filtered.length > 0 || query.trim()) && (
          <ul className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto mt-0.5">
            {filtered.map(c => (
              <li key={c.id} onMouseDown={() => { onSelect(c); setQuery(''); setOpen(false) }}
                className="px-3 py-2 cursor-pointer hover:bg-indigo-50 text-sm">
                <span className="font-medium">{c.firstName} {c.lastName}</span>
                {c.email && <span className="ml-2 text-gray-400 text-xs">{c.email}</span>}
              </li>
            ))}
            {query.trim() && (
              <li onMouseDown={commit}
                className="px-3 py-2 cursor-pointer hover:bg-green-50 text-sm text-green-700 border-t border-gray-100 font-medium">
                + Add &quot;{query.trim()}&quot;
              </li>
            )}
          </ul>
        )}
      </div>
      {query.trim() && (
        <button type="button" onMouseDown={e => { e.preventDefault(); commit() }}
          className="shrink-0 text-xs px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 font-semibold">
          Add+
        </button>
      )}
    </div>
  )
}

// ─── Poster Generator ────────────────────────────────────────────────────────
function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = (text || '').split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line + word + ' '
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line.trim()); line = word + ' ' }
    else line = test
  }
  if (line.trim()) lines.push(line.trim())
  return lines
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function extractDominantHue(img: HTMLImageElement): number | null {
  const size = 80
  const tmp = document.createElement('canvas')
  tmp.width = size; tmp.height = size
  const tc = tmp.getContext('2d')!
  tc.drawImage(img, 0, 0, size, size)
  const data = tc.getImageData(0, 0, size, size).data
  const buckets = new Array(36).fill(0)
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255, a = data[i + 3]
    if (a < 128) continue
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
    const l = (max + min) / 2
    if (l < 0.1 || l > 0.88 || d < 0.18) continue // skip near-black, near-white, grey
    let h = 0
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
    buckets[Math.floor(h * 36)]++
  }
  let best = -1, bestCount = 0
  buckets.forEach((c, i) => { if (c > bestCount) { bestCount = c; best = i } })
  return bestCount >= 8 ? best * 10 + 5 : null
}

async function generatePoster(form: FormState, sku: string): Promise<void> {
  const W = 1080, H = 1920
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Load Play font via FontFace API — fetch CSS to get real WOFF2 URLs then load directly
  if (!document.fonts.check('30px "Play"')) {
    try {
      const css = await fetch('https://fonts.googleapis.com/css2?family=Play:wght@400;700&display=block').then(r => r.text())
      const urls = [...css.matchAll(/url\(([^)]+\.woff2)\)/g)].map(m => m[1].replace(/['"]/g, '').trim())
      const unique = [...new Set(urls)]
      const loaded = await Promise.all(unique.map(url => new FontFace('Play', `url(${url})`).load()))
      loaded.forEach(f => document.fonts.add(f))
    } catch { /* fall back to system font */ }
  }

  // Load product image first so we can extract its dominant colour
  const prod = form.imageUrl ? await loadImage(form.imageUrl) : null
  const hue = prod ? extractDominantHue(prod) : null

  let ACCENT: string, DARK: string, MID: string
  if (hue !== null) {
    // Derive palette from the car's dominant colour
    ACCENT = hslToHex(hue, 0.88, 0.48)
    DARK   = hslToHex(hue, 0.45, 0.07)
    MID    = hslToHex(hue, 0.30, 0.13)
  } else {
    // Fallback: vibrant red when no image or image is mostly grey/white
    ACCENT = '#C41230'; DARK = '#111111'; MID = '#1e1e1e'
  }

  // Background
  ctx.fillStyle = DARK
  ctx.fillRect(0, 0, W, H)

  // Header strip
  ctx.fillStyle = ACCENT
  ctx.fillRect(0, 0, W, 130)

  // Logo (top left)
  const logo = await loadImage('/logo.webp')
  if (logo) {
    ctx.drawImage(logo, 14, 10, 110, 110)
  } else {
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 30px Arial'
    ctx.textAlign = 'left'
    ctx.fillText('R66', 16, 60)
    ctx.font = 'bold 22px Arial'
    ctx.fillText('EMPORIUM', 16, 90)
  }

  // PRE ORDER label
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 66px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('PRE ORDER', W / 2 + 55, 90)

  // Product image zone
  const imgTop = 142, imgH = 820
  ctx.fillStyle = MID
  ctx.fillRect(0, imgTop, W, imgH)

  if (prod) {
    const scale = Math.min(980 / prod.naturalWidth, (imgH - 30) / prod.naturalHeight)
    const w = prod.naturalWidth * scale, h = prod.naturalHeight * scale
    ctx.drawImage(prod, (W - w) / 2, imgTop + (imgH - h) / 2, w, h)
  }

  // Accent separator
  const sepY = imgTop + imgH + 24
  ctx.fillStyle = ACCENT
  ctx.fillRect(40, sepY, W - 80, 8)

  // Content — two-pass auto-spacing: measure sections, then distribute evenly
  type Sec = { h: number; draw: (top: number) => void }
  const secs: Sec[] = []

  // SKU
  secs.push({ h: 46, draw: (top) => {
    ctx.fillStyle = '#ffffff'; ctx.font = '38px Arial'; ctx.textAlign = 'left'
    ctx.fillText(`SKU: ${sku || form.sku || '—'}`, 60, top + 38)
  }})

  // Brand pill
  if (form.brand) {
    secs.push({ h: 64, draw: (top) => {
      ctx.font = 'bold 38px Arial'; ctx.textAlign = 'left'
      const bw = ctx.measureText(form.brand).width + 52
      ctx.fillStyle = ACCENT
      ctx.beginPath(); ctx.roundRect(60, top, bw, 64, 10); ctx.fill()
      ctx.fillStyle = '#ffffff'; ctx.fillText(form.brand, 86, top + 50)
    }})
  }

  // Description
  ctx.font = 'bold 46px Arial'
  const descLines = wrapTextLines(ctx, form.description || '—', W - 120).slice(0, 3)
  secs.push({ h: descLines.length * 72, draw: (top) => {
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 46px Arial'; ctx.textAlign = 'left'
    descLines.forEach((ln, i) => ctx.fillText(ln, 60, top + 52 + i * 72))
  }})

  // Notes
  if (form.notes) {
    ctx.font = 'italic 40px Arial'
    const noteLines = wrapTextLines(ctx, form.notes, W - 120).slice(0, 2)
    secs.push({ h: noteLines.length * 52, draw: (top) => {
      ctx.fillStyle = '#ffffff'; ctx.font = 'italic 40px Arial'; ctx.textAlign = 'left'
      noteLines.forEach((ln, i) => ctx.fillText(ln, 60, top + 40 + i * 52))
    }})
  }

  // Price
  if (form.showRetail !== false) {
    const price = parseFloat(form.retailPrice || form.estimatedRetailPrice || '0')
    const priceText = price > 0 ? `R ${price.toFixed(2)}` : 'POA'
    secs.push({ h: 120, draw: (top) => {
      ctx.fillStyle = ACCENT; ctx.font = 'bold 104px Arial'; ctx.textAlign = 'left'
      ctx.fillText(priceText, 60, top + 104)
    }})
  }

  // ETA
  secs.push({ h: 50, draw: (top) => {
    ctx.textAlign = 'left'
    ctx.fillStyle = '#ffffff'; ctx.font = '42px Arial'; ctx.fillText('ETA', 60, top + 42)
    ctx.font = 'bold 42px Arial'; ctx.fillText(form.eta || '—', 180, top + 42)
  }})

  // Availability
  const totalQty = form.customers.reduce((s, c) => s + c.qty, 0)
  const moq = form.minOrderQty ?? 0
  const inStock = moq > 0 ? Math.max(0, moq - totalQty) : (form.extraQty ?? 0)
  const isSoldOut = !!form.orderPlaced && inStock === 0

  if (isSoldOut) {
    ctx.font = '30px Play'
    const stw = ctx.measureText('SOLD OUT').width
    const sbw = stw + 48, sbh = 56
    secs.push({ h: sbh, draw: (top) => {
      ctx.fillStyle = '#ef4444'
      ctx.beginPath(); ctx.roundRect(60, top, sbw, sbh, 8); ctx.fill()
      ctx.fillStyle = '#ffffff'; ctx.font = '30px Play'; ctx.textAlign = 'left'
      ctx.fillText('SOLD OUT', 84, top + 34)
    }})
  } else if (moq > 0) {
    const labelText = 'Qty Available'
    const qtyText = `${totalQty} of ${moq} Reserved`
    ctx.font = '30px Play'
    const labelW = ctx.measureText(labelText).width
    const qtyW = ctx.measureText(qtyText).width
    const bPadX = 20, bh = 56, boxGap = 20
    secs.push({ h: bh, draw: (top) => {
      ctx.font = '30px Play'; ctx.textAlign = 'left'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(labelText, 60, top + 34)
      const bx = 60 + labelW + boxGap
      ctx.fillStyle = '#FFD700'
      ctx.beginPath(); ctx.roundRect(bx, top, qtyW + bPadX * 2, bh, 8); ctx.fill()
      ctx.fillStyle = '#000000'
      ctx.fillText(qtyText, bx + bPadX, top + 34)
    }})
  } else {
    secs.push({ h: 50, draw: (top) => {
      ctx.fillStyle = '#22c55e'; ctx.font = 'bold 42px Arial'; ctx.textAlign = 'left'
      ctx.fillText('Pre-Order Now', 60, top + 42)
    }})
  }

  // Distribute sections evenly across the content area
  const contentTop = sepY + 16
  const contentBottom = H - 90
  const totalH = secs.reduce((s, sec) => s + sec.h, 0)
  const gap = Math.max(16, Math.floor((contentBottom - contentTop - totalH) / (secs.length + 1)))
  let y = contentTop + gap
  for (const sec of secs) { sec.draw(y); y += sec.h + gap }

  // Footer strip
  ctx.fillStyle = ACCENT
  ctx.fillRect(0, H - 90, W, 90)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 40px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('www.r66slot.co.za', W / 2, H - 28)

  // Download
  canvas.toBlob(blob => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sku || form.sku || 'preorder'}-poster.jpg`
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/jpeg', 0.92)
}

// ─── SendToDropdown ───────────────────────────────────────────────────────────
function SendToDropdown({ customer, form, unitPrice, onLinked }: {
  customer: DashboardCustomer
  form: FormState
  unitPrice: number
  onLinked?: (docNumber: string, docId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [existingDocs, setExistingDocs] = useState<any[]>([])
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [pendingQuoteBank, setPendingQuoteBank] = useState(false)
  // Initialize from persisted customer data so it survives page refresh
  const [linkedDocNumber, setLinkedDocNumber] = useState(customer.linkedDocNumber || '')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Keep local state in sync if parent updates the customer (e.g. after refresh)
  useEffect(() => {
    setLinkedDocNumber(customer.linkedDocNumber || '')
  }, [customer.linkedDocNumber])

  const openDropdown = async () => {
    const next = !open
    if (!next) { setOpen(false); return }
    setOpen(true)
    setPendingQuoteBank(false)
    setLoading(true)
    try {
      const [docs, banks] = await Promise.all([
        fetch('/api/admin/orders/documents').then(r => r.json()),
        fetch('/api/admin/bank-accounts').then(r => r.json()).catch(() => []),
      ])
      const openStatuses = ['draft', 'sent', 'accepted', 'pending', 'processing', 'active']
      const matches = (Array.isArray(docs) ? docs : []).filter((d: any) =>
        openStatuses.includes(d.status) && (
          (customer.email && d.clientEmail?.toLowerCase() === customer.email.toLowerCase()) ||
          d.clientName?.toLowerCase() === customer.name.toLowerCase()
        )
      )
      setExistingDocs(matches)
      setBankAccounts(Array.isArray(banks) ? banks : [])
      // If this customer has a linked doc, look up its current docNumber
      // (handles Quote → SO → Invoice conversions)
      if (customer.linkedDocId) {
        const live = docs.find((d: any) => d.id === customer.linkedDocId)
        if (live && live.docNumber !== linkedDocNumber) {
          setLinkedDocNumber(live.docNumber)
          onLinked?.(live.docNumber, live.id)
        }
      }
    } catch {}
    setLoading(false)
  }

  const lineItem = () => ({
    id: `li_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    description: `${form.sku} – ${form.description}`,
    qty: customer.qty,
    unitPrice,
  })

  const nextDocNumber = (docs: any[], type: 'quote' | 'salesorder' | 'invoice') => {
    if (type === 'quote') {
      const nums = docs.map((d: any) => { const m = /^QR66(\d+)$/i.exec(d.docNumber || ''); return m ? parseInt(m[1]) : 0 })
      return `QR66${Math.max(0, ...nums) + 1}`
    }
    if (type === 'salesorder') {
      const nums = docs.map((d: any) => { const m = /^SO(\d+)$/i.exec(d.docNumber || ''); return m ? parseInt(m[1]) : 0 })
      return `SO${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`
    }
    const nums = docs.map((d: any) => { const m = /^R66INV(\d+)$/i.exec(d.docNumber || '') || /^INV(\d+)$/i.exec(d.docNumber || ''); return m ? parseInt(m[1]) : 0 })
    return `R66INV${Math.max(0, ...nums) + 1}`
  }

  const notify = (docNumber: string, docId: string) => {
    setLinkedDocNumber(docNumber)
    onLinked?.(docNumber, docId)
  }

  const sendTo = async (type: 'quote' | 'salesorder' | 'invoice', existingDoc?: any, bankAccountId?: string, convertToInvoice?: boolean) => {
    setLoading(true)
    setOpen(false)
    setPendingQuoteBank(false)
    try {
      const target = existingDoc ?? null
      if (target) {
        // Merge qty if same SKU line item already exists on this document
        const skuPrefix = form.sku ? `${form.sku} –` : null
        const existingItems: any[] = target.lineItems || []
        const existingIdx = skuPrefix ? existingItems.findIndex((i: any) => i.description?.startsWith(skuPrefix)) : -1
        const updatedItems = existingIdx >= 0
          ? existingItems.map((i: any, idx: number) =>
              idx === existingIdx ? { ...i, qty: (Number(i.qty) || 0) + customer.qty } : i
            )
          : [...existingItems, lineItem()]
        const patch: any = { lineItems: updatedItems }
        if (convertToInvoice) patch.type = 'invoice'
        const res = await fetch(`/api/admin/orders/documents/${target.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
        if (res.ok) notify(target.docNumber, target.id)
      } else {
        const allDocs: any[] = await fetch('/api/admin/orders/documents').then(r => r.json())
        const docNumber = nextDocNumber(allDocs, type)
        const body: any = {
          type, docNumber,
          date: new Date().toISOString().slice(0, 10),
          clientName: customer.name,
          clientEmail: customer.email || '',
          clientPhone: (customer as any).phone || '',
          clientAddress: '',
          lineItems: [lineItem()],
          notes: `Pre-order: ${form.supplier || ''} — ${form.description}`,
          terms: '', status: 'draft',
        }
        if (bankAccountId) body.bankAccountId = bankAccountId
        const res = await fetch('/api/admin/orders/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const doc = await res.json()
        if (doc.id) notify(doc.docNumber, doc.id)
      }
    } catch {}
    setLoading(false)
  }

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1">
      <button
        onClick={openDropdown}
        disabled={loading}
        className="text-[10px] px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 font-semibold whitespace-nowrap disabled:opacity-60"
      >
        {loading ? '…' : 'Send to →'}
      </button>
      {linkedDocNumber && (
        <a
          href="/admin/orders"
          target="_blank"
          className="text-[10px] font-mono font-bold text-green-700 bg-green-100 border border-green-300 px-1.5 py-0.5 rounded leading-none hover:bg-green-200 whitespace-nowrap"
          title="Open in Orders"
        >
          ✓ {linkedDocNumber}
        </a>
      )}
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 min-w-[200px]">
          {pendingQuoteBank ? (
            <div className="py-1.5">
              <p className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Send funds to</p>
              {bankAccounts.length === 0 && (
                <p className="px-3 py-2 text-xs text-gray-400">No bank accounts found</p>
              )}
              {bankAccounts.map((b: any) => (
                <button key={b.id} onClick={() => sendTo('quote', undefined, b.id)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-green-50 font-medium">
                  <span className="text-green-800">🏦 {b.companyName || b.bankName}</span>
                  {b.companyName && b.bankName && (
                    <span className="text-gray-400 block text-[10px]">{b.bankName}</span>
                  )}
                </button>
              ))}
              <div className="border-t my-1" />
              <button onClick={() => setPendingQuoteBank(false)}
                className="w-full text-left px-3 py-1.5 text-[10px] text-gray-400 hover:text-gray-600">
                ← Back
              </button>
            </div>
          ) : (
            <div className="py-1.5">
              <p className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Create New</p>
              {(['quote', 'salesorder', 'invoice'] as const).map(type => {
                const icon = type === 'quote' ? '📄' : type === 'salesorder' ? '📦' : '🧾'
                const label = type === 'quote' ? 'Quote' : type === 'salesorder' ? 'Sales Order' : 'Invoice'
                return (
                  <button key={type}
                    onClick={() => {
                      if (type === 'quote') {
                        const unitLower = (form.unit || '').toLowerCase().trim()
                        const autoBank = unitLower
                          ? bankAccounts.find((b: any) => {
                              const name = (b.companyName || '').toLowerCase()
                              return name && (name.includes(unitLower) || unitLower.includes(name))
                            })
                          : null
                        if (autoBank) sendTo('quote', undefined, autoBank.id)
                        else setPendingQuoteBank(true)
                      } else {
                        sendTo(type, undefined)
                      }
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-green-50 font-medium flex items-center gap-2">
                    <span className="text-green-700">+ {icon} New {label}</span>
                  </button>
                )
              })}
              {loading && <p className="px-3 py-1 text-[10px] text-gray-400">Loading…</p>}
              {!loading && existingDocs.length > 0 && (
                <>
                  <div className="border-t my-1" />
                  <p className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Add to Existing</p>
                  {existingDocs.map(doc => (
                    <div key={doc.id} className="flex items-center gap-1 px-2 py-1 hover:bg-indigo-50">
                      <button onClick={() => sendTo(doc.type, doc)} className="flex-1 text-left py-1 text-xs min-w-0">
                        <span className="font-semibold text-indigo-700">{doc.docNumber}</span>
                        <span className="text-gray-400 ml-1 capitalize">({doc.type})</span>
                        {doc.clientName && <span className="text-gray-500 block text-[10px] truncate">{doc.clientName}</span>}
                      </button>
                      {doc.type === 'quote' && (
                        <button
                          onClick={() => sendTo(doc.type, doc, undefined, true)}
                          className="shrink-0 text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 border border-orange-300 rounded font-semibold hover:bg-orange-200 whitespace-nowrap"
                          title="Add line item and convert this quote to an invoice"
                        >
                          → Invoice
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ItemCard ─────────────────────────────────────────────────────────────────
function ItemCard({
  item, contacts, suppliers, options, exchangeRates, costingSettings,
  onSave, onDelete, onDuplicate, onAddOption, onSendToWorksheet, isNew, onCancelNew,
}: {
  item: DashboardItem & { _draft?: boolean }
  contacts: Contact[]
  suppliers: SupplierContact[]
  options: DashboardOptions
  exchangeRates: Record<string, number>
  costingSettings: CostingSettings
  onSave: (id: string, data: Partial<FormState>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onDuplicate: (id: string) => Promise<void>
  onAddOption: (type: 'brand' | 'unit' | 'eta', value: string) => Promise<void>
  onSendToWorksheet: (id: string, form: FormState) => Promise<void>
  isNew?: boolean
  onCancelNew?: () => void
}) {
  const [form, setForm] = useState<FormState>({
    sku: item.sku,
    description: item.description,
    retailPrice: item.retailPrice ?? '',
    estimatedRetailPrice: item.estimatedRetailPrice,
    wholesalePrice: item.wholesalePrice ?? '',
    wholesaleCurrency: item.wholesaleCurrency ?? 'ZAR',
    supplierSRP: item.supplierSRP ?? '',
    supplierDiscount: item.supplierDiscount ?? '',
    wholesalePrice2: item.wholesalePrice2 ?? '',
    wholesaleCurrency2: item.wholesaleCurrency2 ?? 'CNY',
    supplierSRP2: item.supplierSRP2 ?? '',
    supplierDiscount2: item.supplierDiscount2 ?? '',
    estimatedRetailPrice2: item.estimatedRetailPrice2 ?? '',
    moq2Qty: item.moq2Qty ?? 0,
    moq2Enabled: item.moq2Enabled ?? false,
    moq2ResellerOnly: item.moq2ResellerOnly ?? false,
    eta: item.eta,
    cutoffDate: item.cutoffDate ?? '',
    orderPlaced: item.orderPlaced ?? false,
    published: item.published ?? false,
    supplier: item.supplier,
    brand: item.brand,
    unit: item.unit ?? '',
    imageUrl: item.imageUrl,
    customers: item.customers,
    extraQty: item.extraQty ?? 0,
    minOrderQty: item.minOrderQty ?? 0,
    resellerMoq: item.resellerMoq ?? 1,
    resellerOnly: item.resellerOnly ?? false,
    seoTitle: item.seoTitle ?? '',
    seoDescription: item.seoDescription ?? '',
    seoImageUrl: item.seoImageUrl,
    shipmentStatus: item.shipmentStatus,
    linkedWsId: item.linkedWsId,
    showRetail: item.showRetail !== false,
    notes: item.notes ?? '',
  })
  const formRef = useRef(form)
  formRef.current = form
  const customersDirty = useRef(false)  // only send customers to server when admin explicitly changed them

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [sendingWs, setSendingWs] = useState(false)
  const [posterLoading, setPosterLoading] = useState(false)
  const [supplierOpen, setSupplierOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [imageSize, setImageSize] = useState<'sm' | 'md' | 'lg'>('sm')
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'pending' | 'saving' | 'saved'>('idle')
  const [fetchingImage, setFetchingImage] = useState(false)
  const [autoCalc, setAutoCalc] = useState(true)
  const [autoCalc2, setAutoCalc2] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showSeo, setShowSeo] = useState(false)
  const seoImageInputRef = useRef<HTMLInputElement>(null)
  const [showWsPicker, setShowWsPicker] = useState(false)
  const [wsList, setWsList] = useState<any[]>([])
  const [loadingWsList, setLoadingWsList] = useState(false)
  const supplierRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const imageZoneRef = useRef<HTMLDivElement>(null)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)
  const lastFetchedSku = useRef('')

  // Auto-calculate Wholesale Price from Supplier SRP + Discount
  useEffect(() => {
    const srp = parseFloat(form.supplierSRP || '')
    const disc = parseFloat(form.supplierDiscount || '')
    if (!isNaN(srp) && srp > 0 && !isNaN(disc) && disc >= 0 && disc < 100) {
      const wp = (srp * (1 - disc / 100)).toFixed(2)
      setForm(f => ({ ...f, wholesalePrice: wp }))
    }
  }, [form.supplierSRP, form.supplierDiscount])

  // Auto-calculate Est. Retail Price from wholesale price + currency
  useEffect(() => {
    if (!autoCalc) return
    const wp = form.wholesalePrice || ''
    const curr = form.wholesaleCurrency || 'ZAR'
    if (!wp || !parsePrice(wp)) return
    const calc = calcRetailPrice(wp, curr, exchangeRates, costingSettings, form.supplier)
    if (calc) setForm(f => ({ ...f, estimatedRetailPrice: calc }))
  }, [form.wholesalePrice, form.wholesaleCurrency, form.supplier, autoCalc, exchangeRates])

  // SRP2 + Discount2 → wholesale price 2
  useEffect(() => {
    const srp = parseFloat((form as any).supplierSRP2 || '')
    const disc = parseFloat((form as any).supplierDiscount2 || '')
    if (!isNaN(srp) && srp > 0 && !isNaN(disc) && disc >= 0 && disc < 100) {
      setForm(f => ({ ...f, wholesalePrice2: (srp * (1 - disc / 100)).toFixed(2) }))
    }
  }, [(form as any).supplierSRP2, (form as any).supplierDiscount2])

  // Auto-calculate Est. Retail Price 2 from wholesale price 2 + currency 2
  useEffect(() => {
    if (!autoCalc2) return
    const wp = (form as any).wholesalePrice2 || ''
    const curr = (form as any).wholesaleCurrency2 || 'ZAR'
    if (!wp || !parsePrice(wp)) return
    const calc = calcRetailPrice(wp, curr, exchangeRates, costingSettings, form.supplier)
    if (calc) setForm(f => ({ ...f, estimatedRetailPrice2: calc }))
  }, [(form as any).wholesalePrice2, (form as any).wholesaleCurrency2, form.supplier, autoCalc2, exchangeRates])

  // Auto-set currency from supplier's preferredCurrency
  useEffect(() => {
    if (!form.supplier) return
    const sup = suppliers.find(s => s.name === form.supplier)
    if (sup?.preferredCurrency && sup.preferredCurrency !== form.wholesaleCurrency) {
      setForm(f => ({ ...f, wholesaleCurrency: sup.preferredCurrency! }))
    }
  }, [form.supplier])

  // Debounced autosave — never sends customers unless admin explicitly changed them
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (isNew) return
    setAutoSaveStatus('pending')
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaveStatus('saving')
      try {
        const { customers, ...fieldsOnly } = formRef.current
        const data = customersDirty.current ? formRef.current : fieldsOnly
        await onSave(item.id, data)
        if (customersDirty.current) customersDirty.current = false
        setAutoSaveStatus('saved')
        setTimeout(() => setAutoSaveStatus('idle'), 3000)
      } catch { setAutoSaveStatus('idle') }
    }, 1500)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [form])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) setSupplierOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const set = (field: keyof FormState, value: any) => setForm(f => ({ ...f, [field]: value }))

  const autoFetchImage = async (sku: string) => {
    const trimmed = sku.trim()
    if (!trimmed || trimmed === lastFetchedSku.current || formRef.current.imageUrl) return
    lastFetchedSku.current = trimmed
    setFetchingImage(true)
    try {
      const res = await fetch('/api/admin/cldc-scanner/sku-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sku: trimmed }) })
      if (res.ok) { const d = await res.json(); if (d.imageUrl) set('imageUrl', d.imageUrl) }
    } catch {}
    setFetchingImage(false)
  }

  const handleImageFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => set('imageUrl', e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const it = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    if (it) { e.preventDefault(); const f = it.getAsFile(); if (f) handleImageFile(f) }
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true) }
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false) }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false)
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'))
    if (file) { handleImageFile(file); return }
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')
    if (url && (url.startsWith('http') || url.startsWith('data:image'))) set('imageUrl', url)
  }

  const addCustomer = (c: Contact) => {
    customersDirty.current = true
    setForm(f => {
      if (f.customers.find(cu => cu.id === c.id)) return f
      const moq = f.minOrderQty ?? 0
      const currentTotal = f.customers.reduce((s, cu) => s + cu.qty, 0)
      const available = moq > 0 ? Math.max(0, moq - currentTotal) : (f.extraQty ?? 0)
      const defaultQty = isPastCutoff ? Math.min(1, available) : 1
      return { ...f, customers: [...f.customers, { id: c.id, name: `${c.firstName} ${c.lastName}`, email: c.email, phone: c.phone, qty: defaultQty, depositPaid: false }] }
    })
  }

  const updateCustomer = (id: string, patch: Partial<DashboardCustomer>) => {
    customersDirty.current = true
    setForm(f => ({ ...f, customers: f.customers.map(c => c.id === id ? { ...c, ...patch } : c) }))
  }

  const removeCustomer = (id: string) => {
    customersDirty.current = true
    setForm(f => ({ ...f, customers: f.customers.filter(c => c.id !== id) }))
  }

  const addManualCustomer = (name: string) => {
    customersDirty.current = true
    setForm(f => {
      if (f.customers.find(cu => cu.name.toLowerCase() === name.toLowerCase())) return f
      const moq = f.minOrderQty ?? 0
      const currentTotal = f.customers.reduce((s, cu) => s + cu.qty, 0)
      const available = moq > 0 ? Math.max(0, moq - currentTotal) : (f.extraQty ?? 0)
      const defaultQty = isPastCutoff ? Math.min(1, available) : 1
      return { ...f, customers: [...f.customers, { id: `manual_${Date.now()}`, name, qty: defaultQty, depositPaid: false }] }
    })
  }

  const refreshCustomers = async () => {
    try {
      const res = await fetch(`/api/admin/preorder-dashboard/${item.id}`)
      if (res.ok) {
        const fresh = await res.json()
        setForm(f => ({ ...f, customers: fresh.customers || [] }))
        customersDirty.current = false
      }
    } catch {}
  }

  const openWsPicker = async () => {
    setShowWsPicker(true)
    setLoadingWsList(true)
    try {
      const data = await fetch('/api/admin/worksheets').then(r => r.json())
      setWsList(Array.isArray(data) ? data.filter((w: any) => !w.archived) : [])
    } catch { setWsList([]) }
    setLoadingWsList(false)
  }

  const addToExistingWorksheet = async (ws: any) => {
    setShowWsPicker(false)
    setSendingWs(true)
    try {
      const totalQty = formRef.current.customers.reduce((sum, c) => sum + c.qty, 0)
      const newLineItem = {
        id: `ws_${Date.now()}_item`,
        sku: formRef.current.sku,
        skuSearch: formRef.current.sku,
        description: formRef.current.description,
        unit: formRef.current.unit || '',
        category: formRef.current.brand || '',
        inStock: 0,
        retailPrice: parsePrice(formRef.current.retailPrice || formRef.current.estimatedRetailPrice),
        preOrderPrice: 0,
        qty: totalQty || 1,
        wholesalePrice: parsePrice(formRef.current.wholesalePrice || '0'),
        retailOverride: '',
        sentToInventory: false,
      }
      const updated = { ...ws, items: [...(ws.items || []), newLineItem], preOrderItemId: item.id }
      const res = await fetch('/api/admin/worksheets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
      if (res.ok) {
        await fetch(`/api/admin/preorder-dashboard/${item.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shipmentStatus: 'shipping_soon', linkedWsId: ws.id }),
        })
        set('shipmentStatus', 'shipping_soon')
        set('linkedWsId', ws.id)
      }
    } finally { setSendingWs(false) }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { customers, ...fieldsOnly } = formRef.current
      const data = customersDirty.current ? formRef.current : fieldsOnly
      await onSave(item.id, data)
      if (customersDirty.current) customersDirty.current = false
    } finally { setSaving(false) }
  }
  const handleDelete = async () => { setDeleting(true); try { await onDelete(item.id) } finally { setDeleting(false); setConfirmDelete(false) } }
  const handleSendToWorksheet = async () => {
    setSendingWs(true)
    try { await onSendToWorksheet(item.id, formRef.current) }
    finally { setSendingWs(false) }
  }

  const unitPrice = parsePrice(form.estimatedRetailPrice)
  const totalQty = form.customers.reduce((sum, c) => sum + c.qty, 0)
  const minOrderQty = form.minOrderQty ?? 0
  const moqGap = minOrderQty > 0 ? minOrderQty - totalQty : 0   // positive = still need more, negative = surplus
  const moqMet = minOrderQty > 0 && moqGap <= 0
  const alertRaw = cutoffAlert(form.cutoffDate)
  const alert = { ...alertRaw, active: alertRaw.active && !form.orderPlaced }
  const cutoffColors = alert.active
    ? alert.days <= 0
      ? { badge: 'bg-red-700 text-white', header: 'bg-red-600 border-red-500', border: 'border-red-400', pulse: true }
      : alert.days === 1
        ? { badge: 'bg-orange-500 text-white', header: 'bg-orange-500 border-orange-400', border: 'border-orange-400', pulse: false }
        : { badge: 'bg-yellow-400 text-black', header: 'bg-yellow-400 border-yellow-300', border: 'border-yellow-300', pulse: false }
    : null

  // Lock flags
  const isPastCutoff = !!form.cutoffDate && daysUntilCutoff(form.cutoffDate) <= 0
  const isOrderLocked = !!form.orderPlaced          // once placed: no removals / qty reductions
  const extraQty = form.extraQty ?? 0
  // inStock = units ordered but not yet reserved; gates post-cutoff booking
  const inStock = minOrderQty > 0 ? Math.max(0, minOrderQty - totalQty) : extraQty
  const canAddNew = !isPastCutoff || inStock > 0
  const IMAGE_HEIGHTS = { sm: 'h-36', md: 'h-52', lg: 'h-72' }
  const hasWholesale = !!(form.wholesalePrice && parsePrice(form.wholesalePrice) > 0)

  return (
    <div className={`bg-white rounded-2xl border shadow-sm flex flex-col ${cutoffColors ? cutoffColors.border : 'border-gray-200'}`}>
      {/* Header — two rows so buttons never overlap the card body */}
      <div className={`px-3 pt-2 pb-1.5 border-b rounded-t-2xl ${cutoffColors ? `${cutoffColors.header} ${cutoffColors.pulse ? 'animate-pulse' : ''}` : 'bg-gray-50 border-gray-100'}`}>

        {/* ── Row 1: status + checkbox + autosave | Delete + Save ── */}
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Left: badges + checkbox + autosave */}
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            {alertRaw.active && !form.orderPlaced && cutoffColors && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${cutoffColors.badge}`}>
                ⚠ Cut-off {alertRaw.days === 0 ? 'TODAY' : `in ${alertRaw.days}d`}
              </span>
            )}
            {form.orderPlaced && (
              <span className="text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full whitespace-nowrap">✓ Placed</span>
            )}
            {isOrderLocked && (
              <span className="text-[11px] font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full whitespace-nowrap" title="Locked for customers">🔒</span>
            )}
            {form.shipmentStatus === 'shipping_soon' && (
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full whitespace-nowrap">🚢 Soon</span>
            )}
            {form.shipmentStatus === 'shipping' && (
              <span className="text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full whitespace-nowrap">📦 Shipped</span>
            )}
            {form.linkedWsId && (
              <a href={`/admin/worksheet?id=${form.linkedWsId}`} target="_blank" rel="noreferrer"
                className="text-[11px] font-semibold text-indigo-600 hover:underline whitespace-nowrap">🧮 WS</a>
            )}
            <label className="flex items-center gap-1 cursor-pointer" title="Tick when supplier order is placed">
              <input type="checkbox" checked={!!form.orderPlaced} onChange={e => set('orderPlaced', e.target.checked)} className="w-3.5 h-3.5 accent-green-600" />
              <span className={`text-[11px] font-medium whitespace-nowrap ${alert.active ? (alert.days <= 1 ? 'text-white' : 'text-black') : form.orderPlaced ? 'text-green-700' : 'text-gray-500'}`}>Order placed</span>
            </label>
            {!isNew && (
              <span className={`text-[10px] font-medium whitespace-nowrap ${alert.active ? (alert.days <= 1 ? 'text-white/70' : 'text-black/60') : 'text-gray-400'}`}>
                {autoSaveStatus === 'pending' && '…'}
                {autoSaveStatus === 'saving' && 'Saving…'}
                {autoSaveStatus === 'saved' && '✓ Saved'}
                {autoSaveStatus === 'idle' && item.updatedAt && `Saved ${new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              </span>
            )}
          </div>

          {/* Right: Delete + Save */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {confirmDelete ? (
              <>
                <button onClick={() => setConfirmDelete(false)} className="text-[11px] px-2.5 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 whitespace-nowrap">Cancel</button>
                <button onClick={handleDelete} disabled={deleting} className="text-[11px] px-2.5 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 font-semibold whitespace-nowrap">{deleting ? 'Deleting…' : 'Confirm'}</button>
              </>
            ) : (
              <>
                {isNew && onCancelNew && <button onClick={onCancelNew} className="text-[11px] px-2.5 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 whitespace-nowrap">Cancel</button>}
                <button onClick={() => setConfirmDelete(true)} className={`text-[11px] px-2.5 py-1 rounded-lg whitespace-nowrap ${alert.active ? (alert.days <= 1 ? 'text-red-200 hover:bg-red-700' : 'text-red-700 hover:bg-yellow-300') : 'text-red-600 hover:bg-red-50'}`}>Delete</button>
                <button onClick={handleSave} disabled={saving} className="text-[11px] px-3 py-1 rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-60 font-semibold whitespace-nowrap">
                  {saving ? 'Saving…' : isNew ? 'Add' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Row 2: action buttons ── */}
        {!isNew && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {/* Worksheet picker modal */}
            {showWsPicker && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowWsPicker(false)}>
                <div className="bg-white rounded-2xl shadow-2xl p-4 w-80 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800 text-sm">Send to Worksheet</h3>
                    <button onClick={() => setShowWsPicker(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                  </div>
                  {loadingWsList ? (
                    <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
                  ) : (
                    <div className="space-y-1.5">
                      <button onClick={() => { setShowWsPicker(false); handleSendToWorksheet() }} className="w-full text-left px-3 py-2.5 rounded-xl text-sm bg-blue-600 text-white hover:bg-blue-700 font-semibold">+ New Worksheet</button>
                      {wsList.length > 0 && <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pt-1 px-1">Add to existing</p>}
                      {wsList.map(ws => (
                        <button key={ws.id} onClick={() => addToExistingWorksheet(ws)} className="w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-gray-50 border border-gray-100 transition-colors">
                          <div className="font-medium text-gray-800 truncate">{ws.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{ws.date}{ws.supplier ? ` · ${ws.supplier}` : ''} · {ws.items?.length ?? 0} item{ws.items?.length !== 1 ? 's' : ''}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <button onClick={openWsPicker} disabled={sendingWs} title="Send to Worksheet" className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 font-semibold whitespace-nowrap">{sendingWs ? 'Sending…' : '📋 Worksheet'}</button>
            <label className="flex items-center gap-1 cursor-pointer" title="Show retail price on poster">
              <input type="checkbox" checked={form.showRetail !== false}
                onChange={e => set('showRetail', e.target.checked)}
                className="w-3.5 h-3.5 accent-rose-600" />
              <span className="text-[10px] font-semibold text-gray-600 whitespace-nowrap">Show Retail</span>
            </label>
            <button onClick={async () => { setPosterLoading(true); try { await generatePoster(formRef.current, item.sku) } finally { setPosterLoading(false) } }} disabled={posterLoading} title="Download poster" className="text-[11px] px-2.5 py-1 rounded-lg bg-rose-700 text-white hover:bg-rose-800 disabled:opacity-60 font-semibold whitespace-nowrap">{posterLoading ? '⏳' : '🖼 Poster'}</button>
            <button onClick={() => set('published', !form.published)} title={form.published ? 'Click to unpublish' : 'Click to publish'} className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors ${form.published ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{form.published ? '🟢 Published' : '⚫ Publish'}</button>
            <button
              onClick={async () => {
                const f = formRef.current as any
                const price = parseFloat(f.estimatedRetailPrice || f.retailPrice || '0') || 0
                await fetch('/api/admin/resellers-sales-page', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id: item.id,
                    sku: f.sku,
                    title: f.description,
                    brand: f.brand,
                    imageUrl: f.imageUrl,
                    retailPrice: price,
                    salesTier1Discount: f.salesTier1Discount ?? null,
                    salesTier2Discount: f.salesTier2Discount ?? null,
                  }),
                })
                set('onSalesPage', true)
              }}
              title="Send to Resellers Sales Page — permanent copy, survives dashboard deletion"
              className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors ${(form as any).onSalesPage ? 'bg-green-700 text-white hover:bg-green-800' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
            >
              {(form as any).onSalesPage ? '🛒 On Sales Page' : '🛒 Send to Resellers Sales Page'}
            </button>
            <button onClick={() => onDuplicate(item.id)} title="Duplicate item" className="text-[11px] px-2.5 py-1 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 whitespace-nowrap transition-colors">⧉ Duplicate</button>
            {form.published && (
              <button onClick={() => { const url = encodeURIComponent(`${window.location.origin}/preorder/${item.id}`); window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400') }} title="Share on Facebook" className="text-[11px] px-2.5 py-1 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap">f Share</button>
            )}
            <button onClick={() => { const url = `${window.location.origin}/preorder/${item.id}`; navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }) }} title="Copy link" className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors ${copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{copied ? '✓ Copied' : '🔗 Copy Link'}</button>
            {form.published && (
              <button onClick={() => window.open(`/preorder/${item.id}`, '_blank')} title="Open public page" className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold whitespace-nowrap">🌐 Pre-Order Page</button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col md:flex-row flex-1">
        {/* Left — item details */}
        <div className="flex-1 p-4 space-y-3 border-b md:border-b-0 md:border-r border-gray-100">
          {/* Image zone */}
          <div className="relative group">
            <div className="absolute top-1.5 right-1.5 z-10 flex gap-0.5 bg-white/80 backdrop-blur-sm rounded-md px-1 py-0.5 shadow-sm border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">
              {(['sm', 'md', 'lg'] as const).map(s => (
                <button key={s} onClick={e => { e.stopPropagation(); setImageSize(s) }}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold transition-colors ${imageSize === s ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
            <div ref={imageZoneRef} tabIndex={0} onPaste={handlePaste}
              onDragOver={handleDragOver} onDragEnter={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              onMouseEnter={() => imageZoneRef.current?.focus()}
              onClick={() => { if (!form.imageUrl) imageInputRef.current?.click() }}
              className={`relative w-full ${IMAGE_HEIGHTS[imageSize]} border-2 border-dashed rounded-lg overflow-hidden cursor-pointer transition-all flex items-center justify-center focus:outline-none
                ${isDragging ? 'border-indigo-500 bg-indigo-50 scale-[1.01]' : 'border-gray-200 bg-gray-50 hover:border-indigo-300'}`}>
              {form.imageUrl ? (
                <>
                  <img src={form.imageUrl} alt="product" className="object-contain h-full w-full" />
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100 gap-2">
                    <button onClick={e => { e.stopPropagation(); imageInputRef.current?.click() }} className="bg-white rounded-lg px-2 py-1 text-xs font-medium text-gray-700 shadow hover:bg-gray-100">Replace</button>
                    <button onClick={e => { e.stopPropagation(); set('imageUrl', undefined) }} className="bg-white rounded-lg px-2 py-1 text-xs font-medium text-red-600 shadow hover:bg-red-50">Remove</button>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-400 text-xs select-none pointer-events-none">
                  {fetchingImage ? (
                    <><div className="text-2xl mb-1 animate-spin">⏳</div><div className="font-medium text-indigo-600">Fetching HD image…</div></>
                  ) : isDragging ? (
                    <><div className="text-2xl mb-1">⬇️</div><div className="font-medium text-indigo-600">Drop image here</div></>
                  ) : (
                    <><div className="text-2xl mb-1">📷</div><div className="font-medium">Click to browse</div><div className="mt-0.5 text-gray-300">or hover &amp; Ctrl+V · drag &amp; drop</div></>
                  )}
                </div>
              )}
            </div>
          </div>
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleImageFile(e.target.files[0]) }} />

          {/* SKU + Retail Price */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">SKU</label>
              <input type="text" value={form.sku} onChange={e => set('sku', e.target.value)}
                onBlur={e => autoFetchImage(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="SKU-001" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Retail Price (R)</label>
              <input type="text" value={form.retailPrice} onChange={e => set('retailPrice', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="0.00" />
            </div>
          </div>

          {/* Wholesale / SRP / Discount — 4-col grid: [CCY | Wholesale | SRP | Discount] */}
          <div className="space-y-1">
            {/* Labels */}
            <div className="grid gap-2" style={{ gridTemplateColumns: '64px 1fr 1fr 1fr' }}>
              <span className="text-xs text-gray-500">CCY</span>
              <span className="text-xs text-gray-500">Wholesale / Cost Price</span>
              <span className="text-xs text-gray-500">Supplier SRP</span>
              <span className="text-xs text-gray-500">Supplier Disc. %</span>
            </div>
            {/* Inputs */}
            <div className="grid gap-2" style={{ gridTemplateColumns: '64px 1fr 1fr 1fr' }}>
              {/* Currency select */}
              <select
                value={form.wholesaleCurrency || 'ZAR'}
                onChange={e => set('wholesaleCurrency', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {/* Wholesale price */}
              <input
                type="text"
                value={form.wholesalePrice || ''}
                onChange={e => set('wholesalePrice', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="0.00"
              />
              {/* Supplier SRP */}
              <input
                type="number"
                value={form.supplierSRP || ''}
                onChange={e => set('supplierSRP', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              {/* Supplier Discount % */}
              <div className="relative">
                <input
                  type="number"
                  value={form.supplierDiscount || ''}
                  onChange={e => set('supplierDiscount', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  placeholder="0"
                  min="0"
                  max="99"
                  step="0.1"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
              </div>
            </div>
            {/* Calc preview + live rate */}
            <div className="flex items-center gap-3">
              {form.supplierSRP && form.supplierDiscount && parseFloat(form.supplierSRP) > 0 && (
                <p className="text-[10px] text-indigo-600 font-medium">
                  SRP {parseFloat(form.supplierSRP).toFixed(2)} − {form.supplierDiscount}% = {form.wholesaleCurrency} {(parseFloat(form.supplierSRP) * (1 - parseFloat(form.supplierDiscount) / 100)).toFixed(2)}
                </p>
              )}
              {hasWholesale && form.wholesaleCurrency !== 'ZAR' && exchangeRates[form.wholesaleCurrency!] && (
                <p className="text-[10px] text-gray-400">
                  1 {form.wholesaleCurrency} = R{exchangeRates[form.wholesaleCurrency!]?.toFixed(2)} · Rate live
                </p>
              )}
            </div>
          </div>

          {/* Est. Retail Price — auto-calculated */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-xs text-gray-500">Est. Retail Price (R)</label>
                <button
                  type="button"
                  onClick={() => setAutoCalc(a => !a)}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border transition-colors ${autoCalc ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}
                  title={autoCalc ? 'Auto-calculating from wholesale price — click to override' : 'Manual — click to enable auto-calculate'}
                >
                  {autoCalc ? '⚡ Auto' : '✏ Manual'}
                </button>
              </div>
              <input
                type="text"
                value={form.estimatedRetailPrice}
                onChange={e => { setAutoCalc(false); set('estimatedRetailPrice', e.target.value) }}
                className={`w-full text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${autoCalc && hasWholesale ? 'bg-green-50 border-green-300 text-green-800' : 'border-gray-300'}`}
                placeholder="0.00"
                readOnly={autoCalc && hasWholesale}
              />
              {autoCalc && hasWholesale && (() => {
                const wp = parsePrice(form.wholesalePrice || '')
                const curr = form.wholesaleCurrency || 'ZAR'
                const isMotorhelix = form.supplier?.toLowerCase() === 'motorhelix' && curr === 'USD'
                if (isMotorhelix) return null
                const toZAR = curr === 'ZAR' ? 1 : (exchangeRates[curr] || 0)
                if (!toZAR) return null
                const costZAR = wp * toZAR
                const withShipping = costZAR * (1 + costingSettings.shippingMarkup / 100)
                const withMarkup = withShipping * (1 + costingSettings.markup / 100)
                const final = costingSettings.includeVAT ? withMarkup * 1.15 : withMarkup
                const fmt = (n: number) => `R${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`
                return (
                  <div className="mt-1 text-[10px] text-gray-400 space-y-0.5 bg-gray-50 rounded px-2 py-1.5 border border-gray-100">
                    <div className="flex justify-between">
                      <span>Cost{curr !== 'ZAR' ? ` (${curr}→ZAR)` : ''}:</span>
                      <span className="font-medium">{fmt(costZAR)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>+ Shipping & Customs ({costingSettings.shippingMarkup}%):</span>
                      <span>{fmt(withShipping - costZAR)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>+ Markup ({costingSettings.markup}%):</span>
                      <span>{fmt(withMarkup - withShipping)}</span>
                    </div>
                    {costingSettings.includeVAT && (
                      <div className="flex justify-between">
                        <span>+ VAT (15%):</span>
                        <span>{fmt(final - withMarkup)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-green-700 border-t border-gray-200 pt-0.5">
                      <span>= Est. Retail:</span>
                      <span>{fmt(final)}</span>
                    </div>
                  </div>
                )
              })()}
            </div>
            <div className="flex flex-col justify-end pb-1 gap-1">
              {(totalQty > 0 || minOrderQty > 0) && (
                <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1 flex-wrap">
                  {totalQty > 0 && <span>Total Qty: {totalQty} unit{totalQty !== 1 ? 's' : ''}</span>}
                  {minOrderQty > 0 && (
                    <span className={`font-semibold ${inStock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      ({inStock} in stock)
                    </span>
                  )}
                </span>
              )}
              {/* Supplier Order gap indicator */}
              {minOrderQty > 0 && (
                <span className={`text-xs font-semibold ${moqMet ? 'text-green-600' : 'text-orange-600'}`}>
                  {moqMet
                    ? `✓ Supplier Order met (+${Math.abs(moqGap)} surplus)`
                    : `Supplier Order: need ${moqGap} more`}
                </span>
              )}
              <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-500 whitespace-nowrap">Supplier Order:</label>
                  <input
                    type="number"
                    min={0}
                    value={form.minOrderQty || ''}
                    placeholder="0"
                    onChange={e => {
                      const v = parseInt(e.target.value)
                      set('minOrderQty', (!isNaN(v) && v > 0) ? v : null)
                    }}
                    className="w-16 text-xs border border-gray-300 rounded px-1 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    title="Units ordered from supplier — item hides from website once fully booked"
                  />
                </div>
              <div className="flex items-center gap-1">
                <label className="text-xs text-purple-600 whitespace-nowrap font-medium">Reseller MOQ:</label>
                <input
                  type="number"
                  min={1}
                  value={(form as any).resellerMoq ?? 1}
                  onChange={e => set('resellerMoq', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 text-xs border border-purple-300 rounded px-1 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-purple-400"
                  title="Minimum order quantity for resellers (enforced on Reseller page only)"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <input
                  type="checkbox"
                  id={`resellerOnly-${item.id}`}
                  checked={!!(form as any).resellerOnly}
                  onChange={e => set('resellerOnly', e.target.checked)}
                  className="w-3.5 h-3.5 accent-purple-600"
                />
                <label htmlFor={`resellerOnly-${item.id}`} className="text-xs text-purple-600 font-medium cursor-pointer">
                  Reseller Page Only
                </label>
              </div>
            </div>
          </div>

          {/* ── Pricing Tier 2 ── */}
          <div className="border border-dashed border-indigo-200 rounded-xl p-3 space-y-2 bg-indigo-50/30">
            {/* Tier 2 header + enable tick + reseller-only tick */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id={`moq2-${item.id}`}
                  checked={!!(form as any).moq2Enabled}
                  onChange={e => set('moq2Enabled', e.target.checked)}
                  className="w-3.5 h-3.5 accent-indigo-600"
                />
                <label htmlFor={`moq2-${item.id}`} className="text-xs font-bold text-indigo-700 cursor-pointer">
                  Pricing Tier 2 — activate lower price at higher MOQ
                </label>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id={`moq2Reseller-${item.id}`}
                  checked={!!(form as any).moq2ResellerOnly}
                  onChange={e => set('moq2ResellerOnly', e.target.checked)}
                  className="w-3.5 h-3.5 accent-purple-600"
                />
                <label htmlFor={`moq2Reseller-${item.id}`} className="text-xs font-semibold text-purple-600 cursor-pointer">
                  Resellers Page Only
                </label>
              </div>
            </div>

            {/* Wholesale 2 — CCY | Cost | SRP | Disc */}
            <div className="space-y-1">
              <div className="grid gap-2" style={{ gridTemplateColumns: '64px 1fr 1fr 1fr' }}>
                <span className="text-[11px] text-indigo-500">CCY</span>
                <span className="text-[11px] text-indigo-500">Wholesale 2</span>
                <span className="text-[11px] text-indigo-500">Supplier SRP 2</span>
                <span className="text-[11px] text-indigo-500">Disc. %</span>
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: '64px 1fr 1fr 1fr' }}>
                <select
                  value={(form as any).wholesaleCurrency2 || 'CNY'}
                  onChange={e => set('wholesaleCurrency2', e.target.value)}
                  className="w-full text-sm border border-indigo-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                  type="text"
                  value={(form as any).wholesalePrice2 || ''}
                  onChange={e => set('wholesalePrice2', e.target.value)}
                  className="w-full text-sm border border-indigo-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  placeholder="0.00"
                />
                <input
                  type="number"
                  value={(form as any).supplierSRP2 || ''}
                  onChange={e => set('supplierSRP2', e.target.value)}
                  className="w-full text-sm border border-indigo-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  placeholder="0.00"
                  min="0" step="0.01"
                />
                <div className="relative">
                  <input
                    type="number"
                    value={(form as any).supplierDiscount2 || ''}
                    onChange={e => set('supplierDiscount2', e.target.value)}
                    className="w-full text-sm border border-indigo-200 rounded px-2 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    placeholder="0"
                    min="0" max="99" step="0.1"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                </div>
              </div>
              {(form as any).wholesaleCurrency2 && (form as any).wholesaleCurrency2 !== 'ZAR' && exchangeRates[(form as any).wholesaleCurrency2] && (
                <p className="text-[10px] text-gray-400">1 {(form as any).wholesaleCurrency2} = R{exchangeRates[(form as any).wholesaleCurrency2]?.toFixed(2)} · Rate live</p>
              )}
            </div>

            {/* Est. Retail Price 2 + MOQ2 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-xs text-indigo-600 font-medium">Est. Retail Price 2 (R)</label>
                  <button
                    type="button"
                    onClick={() => setAutoCalc2(a => !a)}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border transition-colors ${autoCalc2 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}
                  >
                    {autoCalc2 ? '⚡ Auto' : '✏ Manual'}
                  </button>
                </div>
                <input
                  type="text"
                  value={(form as any).estimatedRetailPrice2 || ''}
                  onChange={e => { setAutoCalc2(false); set('estimatedRetailPrice2', e.target.value) }}
                  className={`w-full text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${autoCalc2 && (form as any).wholesalePrice2 ? 'bg-green-50 border-green-300 text-green-800' : 'border-indigo-200'}`}
                  placeholder="0.00"
                  readOnly={autoCalc2 && !!(form as any).wholesalePrice2}
                />
              </div>
              <div className="flex flex-col justify-start gap-1 pt-4">
                <div className="flex items-center gap-1">
                  <label className="text-xs text-indigo-600 whitespace-nowrap font-medium">MOQ 2 Qty:</label>
                  <input
                    type="number"
                    min={0}
                    value={(form as any).moq2Qty ?? 0}
                    onChange={e => set('moq2Qty', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-14 text-xs border border-indigo-300 rounded px-1 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
                {(form as any).moq2Qty > 0 && (
                  totalQty >= (form as any).moq2Qty
                    ? <span className="text-xs font-semibold text-green-600">✓ MOQ 2 reached — Price 2 active</span>
                    : <span className="text-xs font-semibold text-orange-500">MOQ 2: need {(form as any).moq2Qty - totalQty} more</span>
                )}
              </div>
            </div>
          </div>

          {/* ── Resellers Sales Page ───────────────────────────── */}
          <div className={`rounded-lg border px-3 py-2.5 space-y-2 ${(form as any).onSalesPage ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">Resellers Sales Page</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${(form as any).onSalesPage ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                {(form as any).onSalesPage ? '● Live on Sales Page' : '○ Not on Sales Page'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-blue-600 font-semibold mb-0.5">Tier 1 Discount %</label>
                <input
                  type="number" min={0} max={100} step={0.5}
                  value={(form as any).salesTier1Discount ?? ''}
                  placeholder="e.g. 10"
                  onChange={e => { const v = parseFloat(e.target.value); set('salesTier1Discount', isNaN(v) ? null : v) }}
                  className="w-full text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 text-center"
                />
              </div>
              <div>
                <label className="block text-xs text-indigo-600 font-semibold mb-0.5">Tier 2 Discount %</label>
                <input
                  type="number" min={0} max={100} step={0.5}
                  value={(form as any).salesTier2Discount ?? ''}
                  placeholder="e.g. 15"
                  onChange={e => { const v = parseFloat(e.target.value); set('salesTier2Discount', isNaN(v) ? null : v) }}
                  className="w-full text-sm border border-indigo-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 text-center"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Item Description</label>
            <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="Description" />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Notes <span className="text-gray-400">(shown on poster)</span></label>
            <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)}
              rows={2}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none" placeholder="Extra info for the pre-order poster…" />
          </div>

          {/* Brand + Unit */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Item / Brand</label>
              <TagInputDropdown value={form.brand} onChange={v => set('brand', v)} options={options.brands} onAddOption={v => onAddOption('brand', v)} placeholder="Brand name" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Item / Unit</label>
              <TagInputDropdown value={form.unit} onChange={v => set('unit', v)} options={options.units} onAddOption={v => onAddOption('unit', v)} placeholder="e.g. Each, Box" />
            </div>
          </div>

          {/* ETA + Supplier */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">ETA</label>
              <TagInputDropdown value={form.eta} onChange={v => set('eta', v)} options={options.etas} onAddOption={v => onAddOption('eta', v)} placeholder="e.g. June 2026" />
            </div>
            <div ref={supplierRef} className="relative">
              <label className="block text-xs text-gray-500 mb-0.5">Supplier</label>
              <input type="text" value={form.supplier}
                onChange={e => { set('supplier', e.target.value); setSupplierOpen(true) }}
                onFocus={() => setSupplierOpen(true)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="Supplier name" />
              {supplierOpen && suppliers.length > 0 && (
                <ul className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto mt-0.5">
                  {suppliers.filter(s => !form.supplier || s.name.toLowerCase().includes(form.supplier.toLowerCase()))
                    .map(s => (
                      <li key={s.id} onMouseDown={() => { set('supplier', s.name); setSupplierOpen(false) }}
                        className="px-3 py-2 cursor-pointer hover:bg-indigo-50 text-sm flex items-center justify-between">
                        <span>{s.name}</span>
                        {s.preferredCurrency && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{s.preferredCurrency}</span>}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>

          {/* Cut-off date */}
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Order Cut-off Date</label>
            <input type="date" value={form.cutoffDate || ''} onChange={e => set('cutoffDate', e.target.value)}
              className={`w-full text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${
                alert.active
                  ? alert.days <= 0 ? 'border-red-400 bg-red-50 text-red-700 font-semibold'
                  : alert.days === 1 ? 'border-orange-400 bg-orange-50 text-orange-700 font-semibold'
                  : 'border-yellow-400 bg-yellow-50 text-yellow-700 font-semibold'
                  : 'border-gray-300'
              }`} />
            {alert.active && (
              <p className={`text-xs font-semibold mt-0.5 ${alert.days <= 0 ? 'text-red-600' : alert.days === 1 ? 'text-orange-600' : 'text-yellow-600'}`}>
                ⚠ Cut-off {alert.days === 0 ? 'is TODAY' : `in ${alert.days} day${alert.days !== 1 ? 's' : ''}`}
              </p>
            )}
          </div>

          {/* SEO / Social Sharing */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSeo(s => !s)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-600 transition-colors"
            >
              <span>🔍 SEO / Social Sharing</span>
              <span className={`transition-transform text-gray-400 ${showSeo ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {showSeo && (
              <div className="p-3 space-y-2 bg-white">
                {!isNew && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Pre-Order Page Link</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        readOnly
                        value={`${typeof window !== 'undefined' ? window.location.origin : 'https://r66slot.co.za'}/preorder/${item.id}`}
                        className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 bg-gray-50 text-gray-600 select-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/preorder/${item.id}`
                          navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
                        }}
                        className={`shrink-0 text-xs px-2 py-1 rounded font-semibold transition-colors ${copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        {copied ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
                {/* SEO / OG Image */}
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">OG Image <span className="text-gray-400">(social share preview — defaults to product image)</span></label>
                  <input ref={seoImageInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) { const r = new FileReader(); r.onload = ev => set('seoImageUrl', ev.target?.result as string); r.readAsDataURL(e.target.files![0]) } }} />
                  {form.seoImageUrl ? (
                    <div className="relative group h-20 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                      <img src={form.seoImageUrl} alt="OG" className="h-full w-full object-contain" />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100 gap-2">
                        <button type="button" onClick={() => seoImageInputRef.current?.click()} className="bg-white rounded px-2 py-0.5 text-xs font-medium shadow hover:bg-gray-100">Replace</button>
                        <button type="button" onClick={() => set('seoImageUrl', undefined)} className="bg-white rounded px-2 py-0.5 text-xs font-medium text-red-600 shadow hover:bg-red-50">Remove</button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="h-20 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center gap-2 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-xs text-gray-400 select-none"
                      onClick={() => seoImageInputRef.current?.click()}
                      onPaste={e => { const it = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/')); if (it) { e.preventDefault(); const f = it.getAsFile(); if (f) { const r = new FileReader(); r.onload = ev => set('seoImageUrl', ev.target?.result as string); r.readAsDataURL(f) } } }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); const f = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/')); if (f) { const r = new FileReader(); r.onload = ev => set('seoImageUrl', ev.target?.result as string); r.readAsDataURL(f) } }}
                      tabIndex={0}
                    >
                      <span className="text-lg">🖼</span>
                      <span>Click · Paste · Drag &amp; drop</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">SEO Title</label>
                  <input
                    type="text"
                    value={form.seoTitle || ''}
                    onChange={e => set('seoTitle', e.target.value)}
                    placeholder={form.description || 'Auto-fills from description if blank'}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">SEO Description</label>
                  <textarea
                    value={form.seoDescription || ''}
                    onChange={e => set('seoDescription', e.target.value)}
                    rows={2}
                    placeholder="Brief description for Google and social sharing previews"
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right — customers */}
        <div className="flex-1 p-4 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customers ({form.customers.length})</span>
              {!isNew && (
                <button
                  onClick={refreshCustomers}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 font-medium"
                  title="Refresh customer list from server (picks up new online reservations)"
                >⟳ Refresh</button>
              )}
              {!isNew && form.customers.some((c: any) => c.isNew) && (
                <button
                  onClick={() => {
                    const cleared = form.customers.map((c: any) => ({ ...c, isNew: false }))
                    setForm(f => ({ ...f, customers: cleared }))
                    customersDirty.current = true
                  }}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200 font-bold animate-pulse"
                  title="Mark all new reservations as seen"
                >✓ Mark Seen</button>
              )}
            </div>
            {unitPrice > 0 && <span className="text-xs text-gray-400">50% deposit = R{(unitPrice * 0.5).toFixed(2)}</span>}
          </div>

          <div className="space-y-2 mb-3">
            {form.customers.length === 0 && <p className="text-xs text-gray-400 italic">No customers added yet.</p>}
            {form.customers.map(c => {
              const deposit = unitPrice > 0 ? unitPrice * 0.5 * c.qty : 0
              return (
                <div key={c.id} className={`rounded-lg px-2 py-2 space-y-1.5 ${(c as any).isNew ? 'bg-green-50 border border-green-300' : 'bg-indigo-50'}`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-gray-800 truncate">{c.name}</span>
                        <span className="shrink-0 text-[10px] font-bold bg-indigo-600 text-white rounded-full px-1.5 py-0.5 leading-none">×{c.qty}</span>
                        {(c as any).isNew && (
                          <span className="text-[10px] font-bold bg-green-600 text-white rounded-full px-1.5 py-0.5 leading-none animate-pulse">NEW</span>
                        )}
                        {(c as any).reservedAt && (
                          <span className="text-[10px] text-gray-400">{new Date((c as any).reservedAt).toLocaleString('en-ZA', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
                        )}
                      </div>
                      {c.email && <span className="text-xs text-gray-500 truncate block">{c.email}</span>}
                    </div>
                    <button
                      onClick={() => removeCustomer(c.id)}
                      className="text-xs leading-none shrink-0 mt-0.5 text-gray-400 hover:text-red-500"
                      title="Remove customer"
                    >✕</button>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-gray-500">Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={c.qty}
                        onChange={e => {
                          const newQty = Math.max(1, parseInt(e.target.value) || 1)
                          updateCustomer(c.id, { qty: newQty })
                        }}
                        className="w-12 text-xs border rounded px-1 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white border-gray-300"
                      />
                    </div>
                    {deposit > 0 && <span className="text-xs text-indigo-700 font-medium">Deposit: R{deposit.toFixed(2)}</span>}
                    <label className="flex items-center gap-1 cursor-pointer ml-auto">
                      <input type="checkbox" checked={!!c.depositPaid}
                        onChange={e => updateCustomer(c.id, { depositPaid: e.target.checked, depositPaidDate: e.target.checked ? (c.depositPaidDate || new Date().toISOString().slice(0, 10)) : undefined })}
                        className="w-3.5 h-3.5 accent-indigo-600" />
                      <span className="text-xs text-gray-600">Paid</span>
                    </label>
                    {c.depositPaid && (
                      <input type="date" value={c.depositPaidDate || ''}
                        onChange={e => updateCustomer(c.id, { depositPaidDate: e.target.value })}
                        className="text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white" />
                    )}
                    <SendToDropdown
                      customer={c} form={form} unitPrice={unitPrice}
                      onLinked={(docNumber, docId) => {
                        updateCustomer(c.id, { linkedDocNumber: docNumber, linkedDocId: docId })
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-xs text-gray-500">Add+ Customer</label>
              {isPastCutoff && (
                <span className={`text-xs font-semibold ${canAddNew ? 'text-emerald-700' : 'text-red-600'}`}>
                  {canAddNew
                    ? minOrderQty > 0
                      ? `In stock: ${inStock} unit${inStock !== 1 ? 's' : ''} remaining`
                      : `Extra stock: ${inStock} unit${inStock !== 1 ? 's' : ''} available`
                    : '🔒 Cut-off passed — no new orders'}
                </span>
              )}
            </div>
            {canAddNew ? (
              <ContactSearch contacts={contacts} onSelect={addCustomer} onAddManual={addManualCustomer} />
            ) : (
              <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
                {minOrderQty > 0
                  ? 'Cut-off passed — all stock is fully reserved. Increase Supplier Order to accept more orders.'
                  : 'Cut-off date has passed. Add extra stock units above to accept new orders.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Supplier Section ─────────────────────────────────────────────────────────
type SortBy = 'az' | 'sku' | 'brand' | 'price' | 'date' | 'cutoff'

function SupplierSection({
  supplierName, items, contacts, suppliers, options, exchangeRates, costingSettings,
  onSave, onDelete, onDuplicate, onAddOption, onSendToWorksheet,
}: {
  supplierName: string
  items: DashboardItem[]
  contacts: Contact[]
  suppliers: SupplierContact[]
  options: DashboardOptions
  exchangeRates: Record<string, number>
  costingSettings: CostingSettings
  onSave: (id: string, data: Partial<FormState>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onDuplicate: (id: string) => Promise<void>
  onAddOption: (type: 'brand' | 'unit' | 'eta', value: string) => Promise<void>
  onSendToWorksheet: (id: string, form: FormState) => Promise<void>
}) {
  const [collapsed, setCollapsed] = useState(true)
  const [sortBy, setSortBy] = useState<SortBy>('az')
  const [asc, setAsc] = useState(true)
  const [showItemsModal, setShowItemsModal] = useState(false)
  const [modalFullscreen, setModalFullscreen] = useState(false)
  const [modalSort, setModalSort] = useState<'sku' | 'description' | 'price' | 'qty' | 'eta' | 'cutoff'>('description')
  const [modalAsc, setModalAsc] = useState(true)
  const alertCount = items.filter(i => cutoffAlert(i.cutoffDate).active && !i.orderPlaced).length
  const newOrderCount = items.reduce((s, i) => s + (i.customers ?? []).filter((c: any) => c.isNew).length, 0)

  const sortedItems = [...items].sort((a, b) => {
    let cmp = 0
    switch (sortBy) {
      case 'sku':   cmp = a.sku.localeCompare(b.sku); break
      case 'brand': cmp = (a.brand || '').localeCompare(b.brand || ''); break
      case 'price': cmp = parseFloat(a.retailPrice || '0') - parseFloat(b.retailPrice || '0'); break
      case 'date':   cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break
      case 'cutoff': cmp = (a.cutoffDate || '').localeCompare(b.cutoffDate || ''); break
      case 'az':
      default:      cmp = a.description.localeCompare(b.description)
    }
    return asc ? cmp : -cmp
  })

  return (
    <div className="space-y-3">
      {/* Supplier header */}
      <div className={`w-full flex items-center justify-between px-4 py-2.5 text-white rounded-xl shadow-sm ${newOrderCount > 0 ? 'bg-green-600' : 'bg-indigo-600'}`}>
        {/* Clickable left — collapse/expand */}
        <button
          type="button"
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <span className="text-base font-bold tracking-wide">{supplierName || 'No Supplier'}</span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium shrink-0">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          {newOrderCount > 0 && (
            <span className="text-xs bg-white/30 text-white px-2 py-0.5 rounded-full font-bold shrink-0 animate-pulse">
              🟢 {newOrderCount} new order{newOrderCount !== 1 ? 's' : ''}
            </span>
          )}
          {alertCount > 0 && (
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold shrink-0">
              ⚠ {alertCount} cutoff alert{alertCount !== 1 ? 's' : ''}
            </span>
          )}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setShowItemsModal(true) }}
            className="text-xs bg-white/20 border border-white/40 text-white px-2.5 py-0.5 rounded-full font-semibold hover:bg-white/30 transition-colors shrink-0"
          >
            📋 View All
          </button>
        </button>
        {/* Right — sort + asc/desc + chevron */}
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
            onClick={e => e.stopPropagation()}
            className="text-xs bg-white/20 text-white border border-white/30 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
          >
            <option value="az" className="text-gray-800">A-Z</option>
            <option value="sku" className="text-gray-800">SKU</option>
            <option value="brand" className="text-gray-800">Brand</option>
            <option value="price" className="text-gray-800">Price</option>
            <option value="date" className="text-gray-800">Date Added</option>
            <option value="cutoff" className="text-gray-800">Cut-off Alert</option>
          </select>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setAsc(a => !a) }}
            className="text-xs bg-white/20 border border-white/30 rounded-lg px-2 py-1 hover:bg-white/30 transition-colors font-bold"
            title={asc ? 'Ascending' : 'Descending'}
          >
            {asc ? '↑' : '↓'}
          </button>
          <button type="button" onClick={() => setCollapsed(c => !c)} className="text-sm">
            <span className={`inline-block transition-transform ${collapsed ? 'rotate-0' : 'rotate-180'}`}>▼</span>
          </button>
        </div>
      </div>

      {/* Items grid */}
      {!collapsed && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pl-2">
          {sortedItems.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              contacts={contacts}
              suppliers={suppliers}
              options={options}
              exchangeRates={exchangeRates}
              costingSettings={costingSettings}
              onSave={onSave}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onAddOption={onAddOption}
              onSendToWorksheet={onSendToWorksheet}
            />
          ))}
        </div>
      )}

      {/* ── All Items Modal ── */}
      {showItemsModal && (() => {
        const modalSorted = [...items].sort((a, b) => {
          let cmp = 0
          const qtyA = (a.customers ?? []).reduce((s: number, c: any) => s + c.qty, 0)
          const qtyB = (b.customers ?? []).reduce((s: number, c: any) => s + c.qty, 0)
          switch (modalSort) {
            case 'sku': cmp = a.sku.localeCompare(b.sku); break
            case 'price': cmp = parseFloat(a.retailPrice || '0') - parseFloat(b.retailPrice || '0'); break
            case 'qty': cmp = qtyA - qtyB; break
            case 'eta': cmp = (a.eta || '').localeCompare(b.eta || ''); break
            case 'cutoff': cmp = (a.cutoffDate || '').localeCompare(b.cutoffDate || ''); break
            default: cmp = a.description.localeCompare(b.description)
          }
          return modalAsc ? cmp : -cmp
        })
        const cols: { key: typeof modalSort; label: string }[] = [
          { key: 'sku', label: 'SKU' },
          { key: 'description', label: 'Description' },
          { key: 'price', label: 'Retail Price' },
          { key: 'qty', label: 'Qty Booked' },
          { key: 'eta', label: 'ETA' },
          { key: 'cutoff', label: 'Cut-off Date' },
        ]
        const totalQty = modalSorted.reduce((s, i) => s + (i.customers ?? []).reduce((ss: number, c: any) => ss + c.qty, 0), 0)
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className={`bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all ${modalFullscreen ? 'fixed inset-0 rounded-none' : 'w-full max-w-5xl max-h-[90vh]'}`}>
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900 text-base">{supplierName || 'No Supplier'}</span>
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">{items.length} items</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{totalQty} total qty booked</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setModalFullscreen(f => !f)}
                    className="text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-200 text-sm font-mono"
                    title={modalFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  >
                    {modalFullscreen ? '⛶' : '⛶'}
                    <span className="text-xs ml-1">{modalFullscreen ? 'Exit' : 'Full'}</span>
                  </button>
                  <button onClick={() => { setShowItemsModal(false); setModalFullscreen(false) }} className="text-gray-400 hover:text-gray-700 text-xl leading-none px-1">×</button>
                </div>
              </div>
              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm border-collapse table-fixed">
                  <colgroup>
                    <col style={{width:'3%'}} />
                    <col style={{width:'12%'}} />
                    <col style={{width:'33%'}} />
                    <col style={{width:'14%'}} />
                    <col style={{width:'10%'}} />
                    <col style={{width:'14%'}} />
                    <col style={{width:'14%'}} />
                  </colgroup>
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs text-gray-400 font-semibold uppercase">#</th>
                      {cols.map(col => (
                        <th
                          key={col.key}
                          onClick={() => { if (modalSort === col.key) setModalAsc(a => !a); else { setModalSort(col.key); setModalAsc(true) } }}
                          className="px-3 py-2 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide cursor-pointer select-none hover:text-gray-800 hover:bg-gray-100 transition-colors"
                        >
                          <span className="inline-flex items-center gap-1">
                            {col.label}
                            {modalSort === col.key
                              ? <span className="text-indigo-600">{modalAsc ? ' ↑' : ' ↓'}</span>
                              : <span className="text-gray-300"> ↕</span>}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modalSorted.map((item, idx) => {
                      const qtyBooked = (item.customers ?? []).reduce((s: number, c: any) => s + c.qty, 0)
                      const alert = cutoffAlert(item.cutoffDate)
                      const price = parseFloat(item.retailPrice || item.estimatedRetailPrice || '0')
                      return (
                        <tr key={item.id} className={`border-b border-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-indigo-50/30`}>
                          <td className="px-3 py-2 text-xs text-gray-300">{idx + 1}</td>
                          <td className="px-3 py-2 font-mono text-xs text-indigo-700 font-semibold whitespace-nowrap">{item.sku || '—'}</td>
                          <td className="px-3 py-2 text-gray-800 font-medium truncate max-w-0" title={item.description}>{item.description}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900 whitespace-nowrap tabular-nums">
                            {price > 0 ? `R ${price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {qtyBooked > 0
                              ? <span className="inline-block bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-0.5 rounded-full">{qtyBooked}</span>
                              : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{item.eta || '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {item.cutoffDate
                              ? <span className={`text-xs font-semibold px-2 py-0.5 rounded ${alert.active && !item.orderPlaced ? 'bg-red-100 text-red-700' : 'text-gray-600'}`}>
                                  {item.cutoffDate}
                                  {alert.active && !item.orderPlaced && <span className="ml-1">⚠</span>}
                                </span>
                              : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-xs text-gray-500 font-semibold">{items.length} items</td>
                      <td className="px-3 py-2 text-center">
                        <span className="text-xs font-bold text-indigo-800">{totalQty}</span>
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PreOrderDashboardPage() {
  const [items, setItems] = useState<DashboardItem[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [suppliers, setSuppliers] = useState<SupplierContact[]>([])
  const [options, setOptions] = useState<DashboardOptions>({ brands: [], units: [], etas: [] })
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({})
  const [costingSettings, setCostingSettings] = useState<CostingSettings>({ shippingMarkup: 45, markup: 30, includeVAT: false })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newDraft, setNewDraft] = useState<DashboardItem | null>(null)

  // Fetch with optional timeout — background fetches get 10s, critical data gets unlimited
  const safeFetch = useCallback(async (url: string, timeoutMs?: number): Promise<any> => {
    const ctrl = new AbortController()
    const timer = timeoutMs ? setTimeout(() => ctrl.abort(), timeoutMs) : null
    try {
      const res = await fetch(url, { signal: ctrl.signal })
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    } finally {
      if (timer) clearTimeout(timer)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)

    // Critical: items + options — NO timeout, wait as long as needed
    const [itemsData, optionsData] = await Promise.all([
      safeFetch('/api/admin/preorder-dashboard'),
      safeFetch('/api/admin/preorder-dashboard/options'),
    ])

    if (itemsData === null) {
      // Fetch failed — show error state, data is NOT gone
      setLoadError(true)
    } else {
      setItems(Array.isArray(itemsData) ? itemsData : [])
    }
    setOptions({ brands: [], units: [], etas: [], ...(optionsData?.brands ? optionsData : {}) })
    setLoading(false)

    // Secondary data — 10s timeout each, fills in after page is visible
    safeFetch('/api/admin/supplier-contacts', 10000).then(d => { if (Array.isArray(d)) setSuppliers(d) })
    safeFetch('/api/admin/contacts', 10000).then(d => { if (Array.isArray(d)) setContacts(d) })
    safeFetch('/api/admin/exchange-rate', 10000).then(d => { if (d?.rates) setExchangeRates(d.rates) })
    // cldc-scanner settings endpoint is R66Emporium-only; R66Slot uses fixed defaults above
  }, [safeFetch])

  useEffect(() => { load() }, [load])

  const startNew = () => {
    const draft: DashboardItem = { id: `_new_${Date.now()}`, ...EMPTY_FORM(), createdAt: new Date().toISOString() }
    setNewDraft(draft)
    setShowNew(true)
  }

  const cancelNew = () => { setShowNew(false); setNewDraft(null) }

  const handleAddOption = async (type: 'brand' | 'unit' | 'eta', value: string) => {
    const res = await fetch('/api/admin/preorder-dashboard/options', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, value }) })
    if (res.ok) setOptions(await res.json())
  }

  const handleSave = async (id: string, data: Partial<FormState>) => {
    if (id.startsWith('_new_')) {
      const res = await fetch('/api/admin/preorder-dashboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.ok) { const created = await res.json(); setItems(prev => [created, ...prev]); setShowNew(false); setNewDraft(null) }
    } else {
      const res = await fetch(`/api/admin/preorder-dashboard/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (res.ok) { const updated = await res.json(); setItems(prev => prev.map(i => i.id === id ? updated : i)) }
    }
  }

  const handleDelete = async (id: string) => {
    if (id.startsWith('_new_')) { cancelNew(); return }
    const res = await fetch(`/api/admin/preorder-dashboard/${id}`, { method: 'DELETE' })
    if (res.ok) setItems(prev => prev.filter(i => i.id !== id))
  }

  const handleDuplicate = async (id: string) => {
    const source = items.find(i => i.id === id)
    if (!source) return
    const newId = `pod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const duplicate = {
      ...source,
      id: newId,
      customers: [],
      orderPlaced: false,
      published: false,
      shipmentStatus: undefined,
      linkedWsId: undefined,
      cutoffDate: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const res = await fetch('/api/admin/preorder-dashboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(duplicate) })
    if (res.ok) { const created = await res.json(); setItems(prev => [created, ...prev]) }
  }

  const handleSendToWorksheet = async (_id: string, form: FormState) => {
    const totalQty = form.customers.reduce((sum, c) => sum + c.qty, 0)
    const currency = form.wholesaleCurrency || 'ZAR'
    const rate = currency === 'ZAR' ? 1 : (exchangeRates[currency] || costingSettings.shippingMarkup)
    const wsId = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const wsSheet = {
      id: wsId,
      name: `Pre-Order — ${form.supplier || 'Unknown'} — ${new Date().toLocaleDateString('en-GB')}`,
      supplier: form.supplier || '',
      date: new Date().toISOString().slice(0, 10),
      archived: false,
      currency,
      exchangeRate: rate,
      markupPct: costingSettings.markup,
      shippingPct: costingSettings.shippingMarkup,
      vatPct: costingSettings.includeVAT ? 15 : 0,
      finalCurrency: 'ZAR',
      finalExRate: 1,
      finalShippingCost: 0,
      finalCustomsCost: 0,
      finalMarkupPct: costingSettings.markup,
      finalVatPct: costingSettings.includeVAT ? 15 : 0,
      preOrderItemId: _id,
      items: [{
        id: `ws_${Date.now()}_item`,
        sku: form.sku,
        skuSearch: form.sku,
        description: form.description,
        unit: form.unit || '',
        category: form.brand || '',
        inStock: 0,
        retailPrice: parsePrice(form.retailPrice || form.estimatedRetailPrice),
        preOrderPrice: 0,
        qty: totalQty || 1,
        wholesalePrice: parsePrice(form.wholesalePrice || '0'),
        retailOverride: '',
        sentToInventory: false,
      }],
    }
    const res = await fetch('/api/admin/worksheets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(wsSheet) })
    if (res.ok) {
      await fetch(`/api/admin/preorder-dashboard/${_id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentStatus: 'shipping_soon', linkedWsId: wsId }),
      })
      setItems(prev => prev.map(i => i.id === _id ? { ...i, shipmentStatus: 'shipping_soon', linkedWsId: wsId } : i))
    }
  }

  // Group items by supplier
  const grouped = items.reduce<Record<string, DashboardItem[]>>((acc, item) => {
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

  const sharedProps = { contacts, suppliers, options, exchangeRates, costingSettings, onSave: handleSave, onDelete: handleDelete, onDuplicate: handleDuplicate, onAddOption: handleAddOption, onSendToWorksheet: handleSendToWorksheet }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-play">Pre-Order Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track upcoming pre-order items and interested customers</p>
        </div>
        <button onClick={startNew} disabled={showNew}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 transition-colors shadow-sm">
          <span className="text-base leading-none">+</span> New Item
        </button>
      </div>

      {/* Quick-access buttons */}
      <div className="flex justify-center gap-3 flex-wrap">
        <a
          href="/pre-orders"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-dark transition-colors shadow-sm"
        >
          <span>🌐</span> View Pre-Orders Page
          <svg className="w-3.5 h-3.5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </a>
        <a
          href="/admin/preorder-list"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-6 py-2.5 bg-white border-2 border-primary text-primary font-bold rounded-xl text-sm hover:bg-primary hover:text-white transition-colors shadow-sm"
        >
          <span>📋</span> List of Pre-Orders
          <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </a>
        <a
          href="/admin/preorder-header"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-6 py-2.5 bg-white border-2 border-gray-400 text-gray-600 font-bold rounded-xl text-sm hover:bg-gray-100 transition-colors shadow-sm"
        >
          <span>🎨</span> Pre-Orders Header
          <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </a>
      </div>

      {/* Costing info bar */}
      {Object.keys(exchangeRates).length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2">
          <span className="font-semibold text-gray-700">Live Rates:</span>
          {['USD','CNY','EUR','GBP','HKD','SGD'].map(c => exchangeRates[c] ? (
            <span key={c}><span className="font-medium text-gray-700">{c}</span> = R{exchangeRates[c].toFixed(2)}</span>
          ) : null)}
          <span className="ml-auto text-gray-400">Markup: {costingSettings.markup}% | Shipping: {costingSettings.shippingMarkup}%{costingSettings.includeVAT ? ' | +VAT' : ''}</span>
        </div>
      )}

      {loading && <div className="text-center py-16 text-gray-400 font-play">Loading…</div>}

      {!loading && (
        <div className="space-y-6">
          {/* New item card */}
          {showNew && newDraft && (
            <div className="mb-4">
              <ItemCard item={newDraft} {...sharedProps} isNew onCancelNew={cancelNew} />
            </div>
          )}

          {loadError ? (
            <div className="text-center py-20">
              <div className="text-4xl mb-3">⚠️</div>
              <p className="font-semibold text-red-600">Failed to load pre-order items</p>
              <p className="text-sm text-gray-500 mt-1">Your data is safe — the server took too long to respond.</p>
              <button onClick={load} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark">Retry</button>
            </div>
          ) : items.length === 0 && !showNew ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-4xl mb-3">📋</div>
              <p className="font-medium">No pre-order items yet</p>
              <p className="text-sm mt-1">Click "New Item" to add your first pre-order.</p>
            </div>
          ) : (
            supplierKeys.map(supplierName => (
              <SupplierSection
                key={supplierName}
                supplierName={supplierName}
                items={grouped[supplierName]}
                {...sharedProps}
              />
            ))
          )}
        </div>
      )}

    </div>
  )
}
