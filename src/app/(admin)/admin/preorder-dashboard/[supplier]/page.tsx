'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { tagPaymentsFromQuote, mergeQuoteRefs } from '@/lib/quote-merge'
import {
  calcCosting, calcRetailPrice,
  DEFAULT_SHIP_PCT, DEFAULT_CUSTOMS_PCT, DEFAULT_MARKUP_PCT, DEFAULT_VAT_PCT,
  isDefaultPcts, resolvePcts, type CostingPcts,
} from '@/lib/preorder-dashboard-price'

// Photos go up as files the moment they are chosen, and the card saves only the link that
// comes back. They used to ride inside every autosave as base64 — a third bigger than the
// file — and past ~7.5MB that crossed the server's 10MB request limit: the save failed, the
// page never said so, and every later save on that card failed with it (found on R66Emporium,
// 12 Sept 2026). Large photos are scaled down first; the storefront never shows more than 2400px.
async function shrinkImage(file: Blob): Promise<Blob> {
  if (file.size <= 3 * 1024 * 1024 || !/^image\/(jpeg|png|webp)$/.test(file.type)) return file
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const out = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.88))
    return out && out.size < file.size ? out : file
  } catch { return file }
}
async function uploadImageFile(file: Blob, name = 'image.jpg'): Promise<string> {
  const body = await shrinkImage(file)
  const fd = new FormData()
  fd.append('file', body, body === file ? name : name.replace(/\.\w+$/, '') + '.jpg')
  const res = await fetch('/api/admin/media/upload', { method: 'POST', body: fd })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.url) throw new Error(data.error || `upload failed (${res.status})`)
  return data.url
}

interface Contact { id: string; firstName: string; lastName: string; email?: string; phone?: string }
interface SupplierContact { id: string; name: string; preferredCurrency?: string }
interface DashboardCustomer {
  id: string; name: string; email?: string; phone?: string
  qty: number; depositPaid?: boolean; depositPaidDate?: string
  linkedDocNumber?: string; linkedDocId?: string
}
interface DashboardItem {
  id: string; sku: string; description: string; retailPrice: string; estimatedRetailPrice: string
  wholesalePrice?: string; wholesaleCurrency?: string; supplierSRP?: string; supplierDiscount?: string
  wholesalePrice2?: string; wholesaleCurrency2?: string; supplierSRP2?: string; supplierDiscount2?: string
  estimatedRetailPrice2?: string; moq2Qty?: number; moq2Enabled?: boolean; moq2ResellerOnly?: boolean
  showRetail?: boolean; eta: string; cutoffDate?: string; orderPlaced?: boolean; published?: boolean
  supplier: string; brand: string; unit: string; imageUrl?: string; seoTitle?: string; seoDescription?: string
  seoImageUrl?: string; shipmentStatus?: 'preorder' | 'shipping_soon' | 'shipping'; linkedWsId?: string
  customers: DashboardCustomer[]; extraQty?: number; minOrderQty?: number | null
  resellerMoq?: number; resellerOnly?: boolean
  shipPct?: number; customsPct?: number; markupPct?: number; vatPct?: number; priceManual?: boolean
  priceSource?: 'live' | 'landed' | 'manual' | 'stored'; priceFloating?: boolean
  notes?: string; createdAt: string; updatedAt?: string
  sentToLatestArrivals?: boolean; sentToLandingSoon?: boolean
}
type FormState = Omit<DashboardItem, 'id' | 'createdAt'>
interface DashboardOptions { brands: string[]; units: string[]; etas: string[] }
type SortBy = 'az' | 'sku' | 'brand' | 'price' | 'date' | 'cutoff' | 'new'

const CURRENCIES = ['ZAR','USD','CNY','EUR','GBP','HKD','SGD','JPY','AUD','CAD']
const PAGE_SIZE = 10

function parsePrice(v: string | undefined | null): number { return parseFloat((v||'').replace(/[^\d.-]/g,''))||0 }

function daysUntilCutoff(date: string): number {
  const today = new Date(); today.setHours(0,0,0,0)
  const cutoff = new Date(date); cutoff.setHours(0,0,0,0)
  return Math.ceil((cutoff.getTime()-today.getTime())/86_400_000)
}
function cutoffAlert(date?: string): { active: boolean; days: number } {
  if (!date) return { active: false, days: 999 }
  const days = daysUntilCutoff(date)
  return { active: days >= 0 && days <= 2, days }
}

// Per-item costing calculator. The percentages default to 25/20/30/15 — the normal
// calculation — but every one of them is editable on the item, so a supplier with
// different freight is handled by typing a number rather than by adding a branch
// in code. There are deliberately NO per-supplier formulas: Motorhelix used to have
// a hard-coded x1.20 x1.30 USD branch here and it is gone.
function CostingCalculator({ form, set, exchangeRates }: {
  form: FormState; set: (k: keyof FormState, v: any) => void; exchangeRates: Record<string, number>
}) {
  const p = resolvePcts(form as CostingPcts)
  const ccy = form.wholesaleCurrency || 'ZAR'
  const c = calcCosting(form.wholesalePrice || '', ccy, exchangeRates, form as CostingPcts)
  const isDefault = isDefaultPcts(p)
  const money = (n: number) => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const pctBox = (label: string, key: 'shipPct'|'customsPct'|'markupPct'|'vatPct', val: number) => (
    <div className="flex items-center gap-1">
      <label className="text-[10px] text-gray-500 whitespace-nowrap">{label}</label>
      <div className="relative">
        <input type="number" min={0} step={0.1} value={val}
          onChange={e => { const v = parseFloat(e.target.value); set(key, isNaN(v) ? 0 : v) }}
          className={`w-14 text-xs border rounded px-1 py-0.5 pr-4 text-center focus:outline-none focus:ring-1 focus:ring-indigo-400 ${isDefault ? 'border-gray-300' : 'border-amber-400 bg-amber-50 text-amber-800 font-semibold'}`}/>
        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none">%</span>
      </div>
    </div>
  )
  return (
    <div className="mt-1.5 border border-dashed border-gray-300 rounded-lg px-2 py-1.5 bg-gray-50/60 space-y-1">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">Costing</span>
        {!isDefault && (
          <button type="button"
            onClick={() => { set('shipPct', DEFAULT_SHIP_PCT); set('customsPct', DEFAULT_CUSTOMS_PCT); set('markupPct', DEFAULT_MARKUP_PCT); set('vatPct', DEFAULT_VAT_PCT) }}
            className="text-[9px] px-1.5 py-0.5 rounded font-semibold border border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200">
            &#8634; Reset {DEFAULT_SHIP_PCT}/{DEFAULT_CUSTOMS_PCT}/{DEFAULT_MARKUP_PCT}/{DEFAULT_VAT_PCT}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {pctBox('Ship', 'shipPct', p.ship)}
        {pctBox('Customs', 'customsPct', p.customs)}
        {pctBox('Markup', 'markupPct', p.markup)}
        {pctBox('VAT', 'vatPct', p.vat)}
      </div>
      {c ? (
        <div className="space-y-0.5 pt-0.5 border-t border-gray-200">
          <p className="text-[10px] text-gray-500">
            {ccy} {parsePrice(form.wholesalePrice || '').toFixed(2)}
            {ccy !== 'ZAR' && <> &times; R{c.rate.toFixed(2)}</>} = R{money(c.cost)}
          </p>
          <p className="text-[10px] text-gray-600">
            + {p.ship}% ship + {p.customs}% customs = <strong className="text-gray-800">Landed R{money(c.landed)}</strong>
          </p>
          <p className="text-[11px] text-green-700">
            + {p.markup}% markup + {p.vat}% VAT = <strong>Retail R{money(c.retail)}</strong>
          </p>
        </div>
      ) : (
        <p className="text-[10px] text-gray-400 pt-0.5 border-t border-gray-200">Enter a wholesale price to calculate.</p>
      )}
    </div>
  )
}

function TagInputDropdown({ value, onChange, options, onAddOption, placeholder }: {
  value:string; onChange:(v:string)=>void; options:string[]; onAddOption:(v:string)=>void; placeholder?:string
}) {
  const [open,setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const filtered = value.trim() ? options.filter(o=>o.toLowerCase().includes(value.toLowerCase())) : options
  useEffect(()=>{
    const h=(e:MouseEvent)=>{ if(ref.current&&!ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  },[])
  return (
    <div ref={ref} className="relative">
      <input type="text" value={value} onChange={e=>{onChange(e.target.value);setOpen(true)}} onFocus={()=>setOpen(true)}
        placeholder={placeholder} className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"/>
      {open&&(filtered.length>0||(value.trim()&&!options.includes(value.trim())))&&(
        <ul className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto mt-0.5">
          {filtered.map(o=><li key={o} onMouseDown={()=>{onChange(o);setOpen(false)}} className="px-3 py-1.5 cursor-pointer hover:bg-indigo-50 text-sm">{o}</li>)}
          {value.trim()&&!options.includes(value.trim())&&<li onMouseDown={async()=>{await onAddOption(value.trim());setOpen(false)}} className="px-3 py-1.5 cursor-pointer hover:bg-green-50 text-sm text-green-700 font-medium border-t border-gray-100">+ Add &ldquo;{value.trim()}&rdquo;</li>}
        </ul>
      )}
    </div>
  )
}

function ContactSearch({ contacts, onSelect, onAddManual }: {
  contacts:Contact[]; onSelect:(c:Contact)=>void; onAddManual:(name:string)=>void
}) {
  const [q,setQ]=useState(''); const [open,setOpen]=useState(false); const ref=useRef<HTMLDivElement>(null)
  const results = q.trim().length>0 ? contacts.filter(c=>`${c.firstName} ${c.lastName} ${c.email||''} ${c.phone||''}`.toLowerCase().includes(q.toLowerCase())).slice(0,8) : []
  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node)) setOpen(false)}
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  },[])
  return (
    <div ref={ref} className="relative">
      <input type="text" value={q} onChange={e=>{setQ(e.target.value);setOpen(true)}} onFocus={()=>setOpen(true)}
        placeholder="Search customers…" className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"/>
      {open&&q.trim().length>0&&(
        <ul className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto mt-0.5">
          {results.map(c=>(
            <li key={c.id} onMouseDown={()=>{onSelect(c);setQ('');setOpen(false)}} className="px-3 py-2 cursor-pointer hover:bg-indigo-50 flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{c.firstName} {c.lastName}</span>
              {c.email&&<span className="text-xs text-gray-400 truncate">{c.email}</span>}
            </li>
          ))}
          {q.trim()&&<li onMouseDown={()=>{onAddManual(q.trim());setQ('');setOpen(false)}} className="px-3 py-2 cursor-pointer hover:bg-green-50 text-sm text-green-700 font-medium border-t border-gray-100">+ Add &ldquo;{q.trim()}&rdquo; manually</li>}
          {results.length===0&&!q.trim()&&<li className="px-3 py-2 text-sm text-gray-400">Type to search…</li>}
        </ul>
      )}
    </div>
  )
}

/* ─── Pre-order poster ─────────────────────────────────────────────────────
   Drawn on a canvas, client-side, and downloaded as a JPEG. This is the same
   generator R66Emporium uses — the two must stay in step, so port changes both
   ways rather than re-inventing one side.

   The poster is COLOUR-MATCHED TO THE CAR: the dominant hue of the product
   image drives the accent (header band, brand pill, price, footer), the page
   background and the image panel. A car with no strong hue falls back to the
   house red. This is the defining behaviour of the poster — see the
   `preorder-poster` skill before changing it. */

function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = (text || '').split(' '); const lines: string[] = []; let line = ''
  for (const word of words) {
    const test = line + word + ' '
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line.trim()); line = word + ' ' }
    else line = test
  }
  if (line.trim()) lines.push(line.trim()); return lines
}
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image(); img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = src
  })
}
function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => { const k = (n + h / 30) % 12; const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); return Math.round(255 * c).toString(16).padStart(2, '0') }
  return `#${f(0)}${f(8)}${f(4)}`
}
function extractDominantHue(img: HTMLImageElement): number | null {
  const size = 80; const tmp = document.createElement('canvas'); tmp.width = size; tmp.height = size
  const tc = tmp.getContext('2d')!; tc.drawImage(img, 0, 0, size, size)
  const data = tc.getImageData(0, 0, size, size).data; const buckets = new Array(36).fill(0)
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255, a = data[i + 3]
    if (a < 128) continue
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
    const l = (max + min) / 2
    if (l < 0.1 || l > 0.88 || d < 0.18) continue
    let hh = 0
    if (max === r) hh = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) hh = ((b - r) / d + 2) / 6
    else hh = ((r - g) / d + 4) / 6
    buckets[Math.floor(hh * 36)]++
  }
  let best = -1, bestCount = 0
  buckets.forEach((c, i) => { if (c > bestCount) { bestCount = c; best = i } })
  return bestCount >= 8 ? best * 10 + 5 : null
}

async function generatePoster(form: FormState, sku: string): Promise<void> {
  /* 16:9 landscape. The portrait stack becomes two columns: product image on
     the left, details on the right, with the accent bands top and bottom. */
  const W = 1920, H = 1080; const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!
  if (!document.fonts.check('30px "Play"')) {
    try {
      const css = await fetch('https://fonts.googleapis.com/css2?family=Play:wght@400;700&display=block').then(r => r.text())
      const urls = [...css.matchAll(/url\(([^)]+\.woff2)\)/g)].map(m => m[1].replace(/['"]/g, '').trim())
      const loaded = await Promise.all([...new Set(urls)].map(url => new FontFace('Play', `url(${url})`).load()))
      loaded.forEach(f => document.fonts.add(f))
    } catch {}
  }
  const prod = form.imageUrl ? await loadImage(form.imageUrl) : null
  const hue = prod ? extractDominantHue(prod) : null
  let ACCENT: string, DARK: string, MID: string
  if (hue !== null) { ACCENT = hslToHex(hue, 0.88, 0.48); DARK = hslToHex(hue, 0.45, 0.07); MID = hslToHex(hue, 0.30, 0.13) }
  else { ACCENT = '#C41230'; DARK = '#111111'; MID = '#1e1e1e' }

  /* BAND is sized off the logo's VISIBLE artwork, not its box: logo.webp is
     256x256 but the art only occupies 172 of that (letterboxed), so at
     LOGO=220 the drawn artwork is ~148px tall. A 210 band left 31px of air
     above and below it; 179 halves that to ~15px while keeping the logo and
     the PRE ORDER type at their current sizes. */
  const BAND = 179, FOOT = 104
  ctx.fillStyle = DARK; ctx.fillRect(0, 0, W, H)

  // ── Header band ──
  ctx.fillStyle = ACCENT; ctx.fillRect(0, 0, W, BAND)
  const LOGO = 220 // double the old 110
  const logo = await loadImage('/logo.webp')
  if (logo) { ctx.drawImage(logo, 24, (BAND - LOGO) / 2, LOGO, LOGO) }
  else { ctx.fillStyle = '#ffffff'; ctx.font = 'bold 52px Arial'; ctx.textAlign = 'left'; ctx.fillText('R66', 28, 100); ctx.font = 'bold 38px Arial'; ctx.fillText('SLOT', 28, 150) }
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 92px Arial'; ctx.textAlign = 'center'
  ctx.fillText('PRE ORDER', 24 + LOGO + (W - 24 - LOGO) / 2, BAND / 2 + 32)

  // ── Left column: product image ──
  const colGap = 40
  const imgW = Math.round(W * 0.52)
  const bodyTop = BAND, bodyH = H - BAND - FOOT
  ctx.fillStyle = MID; ctx.fillRect(0, bodyTop, imgW, bodyH)
  if (prod) {
    const scale = Math.min((imgW - 60) / prod.naturalWidth, (bodyH - 60) / prod.naturalHeight)
    const w = prod.naturalWidth * scale, h = prod.naturalHeight * scale
    ctx.drawImage(prod, (imgW - w) / 2, bodyTop + (bodyH - h) / 2, w, h)
  }
  // Accent divider between the columns
  ctx.fillStyle = ACCENT; ctx.fillRect(imgW, bodyTop, 8, bodyH)

  // ── Right column: details ──
  const colX = imgW + 8 + colGap
  const colW = W - colX - colGap
  type Sec = { h: number; draw: (top: number) => void }
  const secs: Sec[] = []
  secs.push({ h: 46, draw: (top) => { ctx.fillStyle = '#ffffff'; ctx.font = '38px Arial'; ctx.textAlign = 'left'; ctx.fillText(`SKU: ${sku || form.sku || '—'}`, colX, top + 38) } })
  if (form.brand) { secs.push({ h: 64, draw: (top) => { ctx.font = 'bold 38px Arial'; ctx.textAlign = 'left'; const bw = ctx.measureText(form.brand).width + 52; ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.roundRect(colX, top, bw, 64, 10); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.fillText(form.brand, colX + 26, top + 50) } }) }
  ctx.font = 'bold 50px Arial'
  const descLines = wrapTextLines(ctx, form.description || '—', colW).slice(0, 3)
  secs.push({ h: descLines.length * 66, draw: (top) => { ctx.fillStyle = '#ffffff'; ctx.font = 'bold 50px Arial'; ctx.textAlign = 'left'; descLines.forEach((ln, i) => ctx.fillText(ln, colX, top + 50 + i * 66)) } })
  if (form.notes) { ctx.font = 'italic 38px Arial'; const noteLines = wrapTextLines(ctx, form.notes, colW).slice(0, 2); secs.push({ h: noteLines.length * 50, draw: (top) => { ctx.fillStyle = '#ffffff'; ctx.font = 'italic 38px Arial'; ctx.textAlign = 'left'; noteLines.forEach((ln, i) => ctx.fillText(ln, colX, top + 38 + i * 50)) } }) }
  if (form.showRetail !== false) { const price = parseFloat(form.estimatedRetailPrice || form.retailPrice || '0'); const priceText = price > 0 ? `R ${price.toFixed(2)}` : 'POA'; secs.push({ h: 112, draw: (top) => { ctx.fillStyle = ACCENT; ctx.font = 'bold 100px Arial'; ctx.textAlign = 'left'; ctx.fillText(priceText, colX, top + 98) } }) }
  secs.push({ h: 50, draw: (top) => { ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff'; ctx.font = '42px Arial'; ctx.fillText('ETA', colX, top + 42); ctx.font = 'bold 42px Arial'; ctx.fillText(form.eta || '—', colX + 120, top + 42) } })
  const totalQtyP = form.customers.reduce((s, c) => s + c.qty, 0); const moqP = form.minOrderQty ?? 0; const inStockP = moqP > 0 ? Math.max(0, moqP - totalQtyP) : (form.extraQty ?? 0); const isSoldOut = !!form.orderPlaced && inStockP === 0
  if (isSoldOut) { ctx.font = '30px Play'; const stw = ctx.measureText('SOLD OUT').width; const sbw = stw + 48, sbh = 56; secs.push({ h: sbh, draw: (top) => { ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.roundRect(colX, top, sbw, sbh, 8); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.font = '30px Play'; ctx.textAlign = 'left'; ctx.fillText('SOLD OUT', colX + 24, top + 34) } }) }
  else if (moqP > 0) { const labelText = 'Qty Available'; const qtyText = `${totalQtyP} of ${moqP} Reserved`; ctx.font = '30px Play'; const labelW = ctx.measureText(labelText).width; const qtyW = ctx.measureText(qtyText).width; const bPadX = 20, bh = 56, boxGap = 20; secs.push({ h: bh, draw: (top) => { ctx.font = '30px Play'; ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff'; ctx.fillText(labelText, colX, top + 34); const bx = colX + labelW + boxGap; ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.roundRect(bx, top, qtyW + bPadX * 2, bh, 8); ctx.fill(); ctx.fillStyle = '#000000'; ctx.fillText(qtyText, bx + bPadX, top + 34) } }) }
  else { secs.push({ h: 50, draw: (top) => { ctx.fillStyle = '#22c55e'; ctx.font = 'bold 42px Arial'; ctx.textAlign = 'left'; ctx.fillText('Pre-Order Now', colX, top + 42) } }) }

  const contentTop = bodyTop + 30, contentBottom = H - FOOT - 30, totalH = secs.reduce((s, sec) => s + sec.h, 0)
  const gap = Math.max(14, Math.floor((contentBottom - contentTop - totalH) / (secs.length + 1)))
  let y = contentTop + gap; for (const sec of secs) { sec.draw(y); y += sec.h + gap }

  // ── Footer ──
  ctx.fillStyle = ACCENT; ctx.fillRect(0, H - FOOT, W, FOOT); ctx.fillStyle = '#ffffff'; ctx.font = 'bold 44px Arial'; ctx.textAlign = 'center'; ctx.fillText('www.r66slot.co.za', W / 2, H - 36)
  canvas.toBlob(blob => { if (!blob) return; const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${sku || form.sku || 'preorder'}-poster.jpg`; a.click(); URL.revokeObjectURL(url) }, 'image/jpeg', 0.92)
}

function SendToDropdown({ customer, form, unitPrice, onLinked }: {
  customer: DashboardCustomer; form: FormState; unitPrice: number
  onLinked: (docNumber: string, docId: string) => void
}) {
  const [open,setOpen]=useState(false)
  const [loading,setLoading]=useState(false)
  const [existingDocs,setExistingDocs]=useState<any[]>([])
  const [allOpenDocs,setAllOpenDocs]=useState<any[]>([])
  const [existingDocsSearch,setExistingDocsSearch]=useState('')
  const [bankAccounts,setBankAccounts]=useState<any[]>([])
  const [pendingQuoteBank,setPendingQuoteBank]=useState(false)
  const [pendingConvertQuote,setPendingConvertQuote]=useState<any>(null)
  const [linkedDocNumber,setLinkedDocNumber]=useState(customer.linkedDocNumber||'')
  const ref=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node)) setOpen(false)}
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  },[])
  useEffect(()=>{setLinkedDocNumber(customer.linkedDocNumber||'')},[customer.linkedDocNumber])
  // Rule 60 — another card's Send-to converted the Quote this entry belongs to. A Quote
  // covers every SKU the customer reserved, so all of its cards move to the Invoice together.
  useEffect(()=>{
    const apply=(d:any)=>{
      if(!d) return
      // Either identifier is enough — same rule as the server sweep.
      const mine=(!!d.fromDocId&&customer.linkedDocId===d.fromDocId)||(!!d.fromDocNumber&&customer.linkedDocNumber===d.fromDocNumber)
      if(mine&&d.toDocNumber!==customer.linkedDocNumber){setLinkedDocNumber(d.toDocNumber);onLinked(d.toDocNumber,d.toDocId)}
    }
    const h=(e:Event)=>apply((e as CustomEvent).detail)
    // A conversion made in another tab — the Orders page, or a second dashboard window —
    // arrives through localStorage, which fires `storage` in every tab but the writer's.
    const s=(e:StorageEvent)=>{if(e.key==='preorder-doc-relinked'&&e.newValue){try{apply(JSON.parse(e.newValue))}catch{}}}
    window.addEventListener('preorder-doc-relinked',h)
    window.addEventListener('storage',s)
    return ()=>{window.removeEventListener('preorder-doc-relinked',h);window.removeEventListener('storage',s)}
  })

  const openDropdown=async()=>{
    const next=!open; if(!next){setOpen(false);return}
    setOpen(true); setPendingQuoteBank(false); setPendingConvertQuote(null); setLoading(true); setExistingDocsSearch('')
    try{
      const [all,banks]=await Promise.all([
        fetch('/api/admin/orders/documents').then(r=>r.ok?r.json():[]),
        fetch('/api/admin/bank-accounts').then(r=>r.ok?r.json():[]).catch(()=>[]),
      ])
      const docs=Array.isArray(all)?all:[]
      const openStatuses=['draft','sent','accepted','pending','processing','active']
      // Invoices: every non-archived one, so items can be added to an already-paid invoice too.
      const isOpenDoc=(d:any)=>d.type==='invoice'?d.status!=='archived':openStatuses.includes(d.status)
      const openDocs=docs.filter(isOpenDoc)
      setAllOpenDocs(openDocs)
      setExistingDocs(openDocs.filter((d:any)=>
        (customer.email&&d.clientEmail?.toLowerCase()===customer.email.toLowerCase())||
        d.clientName?.toLowerCase()===customer.name.toLowerCase()
      ))
      setBankAccounts(Array.isArray(banks)?banks:[])
      // The chip can be stale — the linked document may have been renumbered or converted
      // from the Orders page since this card was last saved.
      if(customer.linkedDocId){
        const live=docs.find((d:any)=>d.id===customer.linkedDocId)
        if(live&&live.docNumber!==linkedDocNumber){setLinkedDocNumber(live.docNumber);onLinked(live.docNumber,live.id)}
      }
    }catch{setExistingDocs([]);setAllOpenDocs([])}
    finally{setLoading(false)}
  }

  const searchQ=existingDocsSearch.trim().toLowerCase()
  // Typing a search widens the list from just this customer's docs to every open Quote/SO/Invoice
  const docsToShow=searchQ
    ?allOpenDocs.filter((d:any)=>(d.docNumber||'').toLowerCase().includes(searchQ)||(d.clientName||'').toLowerCase().includes(searchQ))
    :existingDocs

  const nextDocNumber=(existing:any[],type:'quote'|'salesorder'|'invoice')=>{
    if(type==='quote'){const nums=existing.map((d:any)=>{const m=/^QR66(\d+)$/i.exec(d.docNumber||'');return m?parseInt(m[1],10):0});return `QR66${Math.max(0,...nums)+1}`}
    if(type==='salesorder'){const nums=existing.map((d:any)=>{const m=/^SO(\d+)$/i.exec(d.docNumber||'');return m?parseInt(m[1],10):0});return `SO${String(Math.max(0,...nums)+1).padStart(3,'0')}`}
    const nums=existing.map((d:any)=>{const m=/^INV(\d+)$/i.exec(d.docNumber||'');return m?parseInt(m[1],10):0}).filter((n:number)=>n>0)
    const next=(nums.length>0?Math.max(...nums):25)+1
    return `INV${String(next).padStart(4,'0')}`
  }

  const lineItem=()=>({id:`li_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,description:`${(form.sku||'').trim()} – ${form.description}`,qty:customer.qty,unitPrice})
  const notify=(docNumber:string,docId:string)=>{setLinkedDocNumber(docNumber);onLinked(docNumber,docId)}
  // Rule 60 — converting a Quote moves the whole document, so every dashboard entry it
  // covers has to follow it, not just the card whose dropdown was used. The server sweeps
  // the entire blob because one Quote can span suppliers; the event keeps the cards already
  // on screen in step without forcing a reload that would discard unsaved edits.
  const relinkQuoteEntries=async(quoteDoc:any,toDocNumber:string,toDocId:string)=>{
    const detail={fromDocId:quoteDoc.id,fromDocNumber:quoteDoc.docNumber,toDocId,toDocNumber}
    try{
      await fetch('/api/admin/preorder-dashboard/relink',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(detail)})
      window.dispatchEvent(new CustomEvent('preorder-doc-relinked',{detail}))
      // …and to every OTHER tab. A dashboard left open in a second window would otherwise
      // keep showing the Quote until it was reloaded, which reads as the send having failed.
      try{localStorage.setItem('preorder-doc-relinked',JSON.stringify({...detail,t:Date.now()}))}catch{}
    }catch{}
  }

  // A visible line for the invoice's Notes so the customer can see each deposit that was allocated
  // when several Quotes get consolidated onto one Invoice.
  const depositNoteFor=(quoteDoc:any)=>{
    const deposit=Number(quoteDoc.amountPaid||0)+Number(quoteDoc.creditApplied||0)
    if(deposit<=0.005) return null
    const dateStr=new Date().toLocaleDateString('en-ZA',{day:'2-digit',month:'short',year:'numeric'})
    return `Deposit R${deposit.toFixed(2)} allocated from Quote ${quoteDoc.docNumber} (${dateStr})`
  }

  // Nothing that is not on the shelf may be invoiced — an invoice against an empty product
  // used to deduct nothing at all, so the sale never came off inventory. The server enforces
  // this too; checking here names the offending SKU instead of showing a bare error. A failed
  // lookup blocks rather than waving the invoice through — guessing costs stock accuracy.
  // products.quantity is ALREADY net of every Sales Order reservation — an SO deducts stock
  // the moment it is created (Rule 3), so the shelf figure IS the available figure.
  const stockBlockReasons=async(items:any[]):Promise<string[]>=>{
    try{
      const products:any[]=await fetch('/api/admin/products?fields=sku,quantity').then(r=>r.json())
      const stockMap:Record<string,number>={}
      for(const p of products){if(p.sku) stockMap[p.sku.toString().toUpperCase()]=p.quantity??0}
      const reasons:string[]=[]
      for(const item of items){
        const rawSku=item.sku?item.sku.toString():(()=>{const em=(item.description||'').indexOf('–');return em>-1?item.description.slice(0,em).trim():''})()
        const sku=rawSku.toUpperCase()
        if(!sku||!(sku in stockMap)) continue
        const available=stockMap[sku]||0; const requested=Number(item.qty)||0
        if(available<=0){reasons.push(`• ${sku}: not in stock — Worksheet Qty not updated`)}
        else if(requested>available) reasons.push(`• ${sku}: Qty not available in Inventory (${available} available, ${requested} requested)`)
      }
      return reasons
    }catch{
      return ['• Could not verify stock levels — please try again']
    }
  }
  const blockedByStock=async(items:any[]):Promise<boolean>=>{
    const reasons=await stockBlockReasons(items)
    if(reasons.length===0) return false
    window.alert(`Cannot create invoice:\n\n${reasons.join('\n')}`)
    setLoading(false)
    return true
  }

  const appendQuoteToInvoice=async(quoteDoc:any,invoiceDoc:any)=>{
    setLoading(true);setOpen(false);setPendingConvertQuote(null)
    try{
      // Re-read BOTH documents. This dropdown's copies were fetched when it opened, so the
      // invoice's notes and payment totals must not be written back from a stale snapshot —
      // and the Quote's lineItems must come from the server, never from the list copy. A
      // Quote whose lines were missing from that copy used to append an EMPTY array: the
      // deposits, payments and Quote Ref all merged, the Quote was archived and every
      // dashboard card was re-badged to the Invoice, while the goods themselves never
      // arrived on it. Nothing then deducted that stock, so Inventory read high for ever.
      const freshList:any[]=await fetch('/api/admin/orders/documents').then(r=>r.json()).catch(()=>[])
      const list=Array.isArray(freshList)?freshList:[]
      const inv=list.find((d:any)=>d.id===invoiceDoc.id)||invoiceDoc
      const quote=list.find((d:any)=>d.id===quoteDoc.id)||quoteDoc
      const quoteLines:any[]=quote.lineItems||[]
      // A Quote with no lines has nothing to merge. Bail BEFORE any money moves — merging
      // the payments and archiving it would strand the goods with no way back.
      if(quoteLines.length===0){
        window.alert(`Cannot merge ${quote.docNumber||'this Quote'} into ${inv.docNumber}: it has no line items.\n\nNothing has been changed.`)
        setLoading(false);return
      }
      if(await blockedByStock(quoteLines)) return
      const before=(inv.lineItems||[]).length
      const depositNote=depositNoteFor(quote)
      const mergedNotes=[inv.notes,depositNote].filter(Boolean).join('\n')
      const mergedPayments=[...(inv.payments||[]),...tagPaymentsFromQuote(quote.payments,quote.docNumber)]
      const res=await fetch(`/api/admin/orders/documents/${inv.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        appendLineItems:quoteLines,
        notes:mergedNotes,
        amountPaid:Number(inv.amountPaid||0)+Number(quote.amountPaid||0),
        creditApplied:Number(inv.creditApplied||0)+Number(quote.creditApplied||0),
        payments:mergedPayments,
        // Rule 28 — every Quote merged in stays named in "Quote Ref:", not just the one
        // that created the invoice.
        sourceQuoteNumber:mergeQuoteRefs(inv.sourceQuoteNumber,quote.docNumber),
      })})
      if(!res.ok){
        const e=await res.json().catch(()=>({}))
        window.alert(e.error||`Could not merge into ${inv.docNumber}. Nothing has been changed.`)
        setLoading(false);return
      }
      // A 200 is not proof the lines landed. Confirm against what the server actually saved
      // before archiving the Quote or re-badging any card — those two steps are what make a
      // dropped append permanent and invisible.
      const saved=await res.json().catch(()=>null)
      if((saved?.lineItems||[]).length<before+quoteLines.length){
        window.alert(`${inv.docNumber} did not accept the ${quoteLines.length} line item(s) from ${quote.docNumber}.\n\nThe Quote has NOT been archived and no card has been re-linked, so nothing is lost — please try again.`)
        setLoading(false);return
      }
      await fetch(`/api/admin/orders/documents/${quote.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'archived'})})
      await relinkQuoteEntries(quote,inv.docNumber,inv.id)
      notify(inv.docNumber,inv.id)
    }catch(err:any){
      // This used to swallow everything, which is how a half-finished merge looked like a
      // clean one to the person clicking the button.
      window.alert(`Merge failed: ${err?.message||'unknown error'}. Nothing has been changed.`)
    }
    setLoading(false)
  }

  // One entry point for every send: Create New, Add to Existing, and Quote → new Invoice.
  const sendTo=async(type:'quote'|'salesorder'|'invoice',existingDoc?:any,bankAccountId?:string,convertToInvoice?:boolean)=>{
    setLoading(true); setOpen(false); setPendingQuoteBank(false); setPendingConvertQuote(null)
    try{
      const target=existingDoc??null
      if(target&&convertToInvoice){
        const allRaw:any[]=await fetch('/api/admin/orders/documents').then(r=>r.json()).catch(()=>[])
        const allDocs=Array.isArray(allRaw)?allRaw:[]
        // Same rule as appendQuoteToInvoice — the lines must come from the server, not from
        // the copy this dropdown is holding, and a Quote with none of them never gets
        // converted. Creating an empty Invoice and archiving the Quote behind it loses the
        // goods while keeping the deposit.
        const freshTarget=allDocs.find((d:any)=>d.id===target.id)||target
        const invoiceItems:any[]=freshTarget.lineItems||[]
        if(invoiceItems.length===0){
          window.alert(`Cannot convert ${freshTarget.docNumber||'this Quote'}: it has no line items.\n\nNothing has been changed.`)
          setLoading(false);return
        }
        if(await blockedByStock(invoiceItems)) return
        const invDocNumber=nextDocNumber(allDocs,'invoice')
        const depositNote=depositNoteFor(freshTarget)
        const newInvRes=await fetch('/api/admin/orders/documents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
          type:'invoice',docNumber:invDocNumber,date:new Date().toISOString().slice(0,10),
          clientName:freshTarget.clientName,clientEmail:freshTarget.clientEmail||'',clientPhone:freshTarget.clientPhone||'',clientAddress:freshTarget.clientAddress||'',
          lineItems:invoiceItems,notes:[freshTarget.notes,depositNote].filter(Boolean).join('\n'),terms:freshTarget.terms||'',status:'draft',
          // Deposit mode is a Quotes-only presentation — an Invoice raised off one bills in full.
          discountPct:freshTarget.discountPct||0,depositMode:false,sourceQuoteNumber:freshTarget.docNumber,
          amountPaid:freshTarget.amountPaid||0,creditApplied:freshTarget.creditApplied||0,payments:tagPaymentsFromQuote(freshTarget.payments,freshTarget.docNumber),
        })})
        if(!newInvRes.ok){
          const e=await newInvRes.json().catch(()=>({}))
          window.alert(e.error||`Could not create the Invoice. ${freshTarget.docNumber} has NOT been archived — nothing has been changed.`)
          setLoading(false);return
        }
        const newInv=await newInvRes.json()
        // Confirm the goods actually landed before archiving the Quote behind them.
        if(!newInv?.id||(newInv.lineItems||[]).length<invoiceItems.length){
          window.alert(`The new Invoice did not accept all ${invoiceItems.length} line item(s) from ${freshTarget.docNumber}.\n\nThe Quote has NOT been archived, so nothing is lost — please check the Invoice and try again.`)
          setLoading(false);return
        }
        await fetch(`/api/admin/orders/documents/${freshTarget.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'archived'})})
        await relinkQuoteEntries(freshTarget,newInv.docNumber,newInv.id)
        notify(newInv.docNumber,newInv.id)
      }else if(target){
        const skuPrefix=form.sku?.trim()?`${form.sku.trim()} –`:null
        // Only the newly added quantity is checked — what the invoice already holds was
        // deducted when it was raised.
        if(target.type==='invoice'&&await blockedByStock([lineItem()])) return
        // Re-read the target: the copy this dropdown holds was fetched when it opened, and a
        // send made from another card since would be wiped out by a whole-array write.
        const freshList:any[]=await fetch('/api/admin/orders/documents').then(r=>r.json()).catch(()=>[])
        const fresh=(Array.isArray(freshList)?freshList:[]).find((d:any)=>d.id===target.id)||target
        const existingItems:any[]=fresh.lineItems||[]
        const existingIdx=skuPrefix?existingItems.findIndex((i:any)=>i.description?.startsWith(skuPrefix)):-1
        // A line for this SKU already there gets topped up; anything new is appended
        // server-side, where nothing can slip in between the read and the write.
        const patchBody=existingIdx>=0
          ?{lineItems:existingItems.map((i:any,idx:number)=>idx===existingIdx?{...i,qty:(Number(i.qty)||0)+customer.qty}:i)}
          :{appendLineItems:[lineItem()]}
        const res=await fetch(`/api/admin/orders/documents/${target.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(patchBody)})
        if(!res.ok){const e=await res.json().catch(()=>({}));window.alert(e.error||`Could not update ${target.docNumber}`);setLoading(false);return}
        // Only badge the card once the line is provably on the document. Badging on res.ok
        // alone is how a card ends up naming an Invoice that has no line for its SKU — and
        // once a Quote it points at is later merged, the relink sweep carries that empty
        // badge onto the Invoice, where nothing will ever deduct its stock.
        const savedDoc=await res.json().catch(()=>null)
        const landed=skuPrefix
          ?(savedDoc?.lineItems||[]).some((i:any)=>i.description?.startsWith(skuPrefix))
          :(savedDoc?.lineItems||[]).length>existingItems.length
        if(!landed){
          window.alert(`${target.docNumber} did not accept ${form.sku||'this item'}.\n\nThe card has NOT been linked, so nothing is lost — please try again.`)
          setLoading(false);return
        }
        notify(target.docNumber,target.id)
      }else{
        if(type==='invoice'&&await blockedByStock([lineItem()])) return
        const allRaw:any[]=await fetch('/api/admin/orders/documents').then(r=>r.json()).catch(()=>[])
        const docNumber=nextDocNumber(Array.isArray(allRaw)?allRaw:[],type)
        const body:any={
          type,docNumber,date:new Date().toISOString().slice(0,10),
          clientName:customer.name,clientEmail:customer.email||'',clientPhone:customer.phone||'',clientAddress:'',
          lineItems:[lineItem()],notes:`Pre-order: ${form.supplier||''} — ${form.description}`,terms:'',status:'draft',
        }
        if(type==='invoice') body.depositMode=false
        if(bankAccountId) body.bankAccountId=bankAccountId
        const res=await fetch('/api/admin/orders/documents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
        const doc=await res.json().catch(()=>({}))
        if(!doc.id){window.alert(doc.error||'Could not create document');setLoading(false);return}
        // Same rule as the other paths — a document that came back without the line is not
        // something to badge the card against.
        if((doc.lineItems||[]).length===0){
          window.alert(`${doc.docNumber} was created without ${form.sku||'the item'}.\n\nThe card has NOT been linked — please check the document.`)
          setLoading(false);return
        }
        notify(doc.docNumber,doc.id)
      }
    }catch(err:any){
      window.alert(`Send failed: ${err?.message||'unknown error'}.`)
    }
    setLoading(false)
  }

  return (
    <div ref={ref} className="relative ml-auto inline-flex items-center gap-1">
      {/* The Send to button STAYS once a document is linked (Rule 60 — the chip sits beside
          Send to, it does not replace it). Hiding it is what made a linked Quote impossible
          to convert from the dashboard: the card was badged, so the only route to an
          Invoice disappeared with the button. */}
      <button disabled={loading} onClick={e=>{e.stopPropagation();openDropdown()}}
        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-200 hover:bg-indigo-50 disabled:opacity-50 whitespace-nowrap">{loading?'…':'→ Send to'}</button>
      {linkedDocNumber&&(()=>{
        const docTab=/^INV/i.test(linkedDocNumber)?'invoices':/^SO/i.test(linkedDocNumber)?'salesorders':'quotes'
        return <a href={`/admin/orders?tab=${docTab}&open=${encodeURIComponent(linkedDocNumber)}`} target="_blank" rel="noreferrer"
          className="text-[10px] font-mono font-bold text-green-700 bg-green-100 border border-green-300 px-1.5 py-0.5 rounded leading-none hover:bg-green-200 whitespace-nowrap" title={`Open ${linkedDocNumber}`}>✓ {linkedDocNumber}</a>
      })()}
      {open&&(
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl w-64 overflow-hidden">
          {pendingConvertQuote?(
            <div className="py-1.5">
              <div className="flex items-center gap-2 px-3 py-1 border-b border-gray-100 mb-1">
                <button onClick={()=>setPendingConvertQuote(null)} className="text-[10px] text-gray-400 hover:text-gray-600">← Back</button>
                <p className="text-[10px] font-bold text-gray-500 truncate">Convert {pendingConvertQuote.docNumber}</p>
              </div>
              <button onClick={()=>sendTo(pendingConvertQuote.type,pendingConvertQuote,undefined,true)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-green-50 font-medium text-green-700">+ 🧾 New Invoice</button>
              <div className="border-t my-1"/>
              <p className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Add to Existing</p>
              {existingDocs.filter((d:any)=>d.type==='invoice').length===0&&<p className="px-3 py-2 text-xs text-gray-400">No open invoices for this client</p>}
              {existingDocs.filter((d:any)=>d.type==='invoice').map((inv:any)=>(
                <button key={inv.id} onClick={()=>appendQuoteToInvoice(pendingConvertQuote,inv)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 font-medium">
                  <span className="font-semibold text-indigo-700">{inv.docNumber}</span>
                  <span className="text-gray-400 ml-1 capitalize text-[10px]">({inv.status})</span>
                </button>
              ))}
            </div>
          ):pendingQuoteBank?(
            <div className="py-1.5">
              <p className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Send funds to</p>
              {bankAccounts.length===0&&<p className="px-3 py-2 text-xs text-gray-400">No bank accounts found</p>}
              {bankAccounts.map((b:any)=>(
                <button key={b.id} onClick={()=>sendTo('quote',undefined,b.id)} className="w-full text-left px-3 py-2 text-xs hover:bg-green-50 font-medium">
                  <span className="text-green-800">🏦 {b.companyName||b.bankName}</span>
                  {b.companyName&&b.bankName&&<span className="text-gray-400 block text-[10px]">{b.bankName}</span>}
                </button>
              ))}
              <div className="border-t my-1"/>
              <button onClick={()=>setPendingQuoteBank(false)} className="w-full text-left px-3 py-1.5 text-[10px] text-gray-400 hover:text-gray-600">← Back</button>
            </div>
          ):(
            <div className="py-1.5">
              <p className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Create New</p>
              {/* R66Slot keeps Sales Orders — unlike Emporium, where they are hidden. */}
              {(['quote','salesorder','invoice'] as const).map(type=>{
                const icon=type==='quote'?'📄':type==='salesorder'?'📋':'🧾'
                const label=type==='quote'?'Quote':type==='salesorder'?'Sales Order':'Invoice'
                return (
                  <button key={type} onClick={()=>{
                    if(type==='quote'){
                      const unitLower=(form.unit||'').toLowerCase().trim()
                      const autoBank=unitLower?bankAccounts.find((b:any)=>{const name=(b.companyName||'').toLowerCase();return name&&(name.includes(unitLower)||unitLower.includes(name))}):null
                      if(autoBank) sendTo('quote',undefined,autoBank.id); else setPendingQuoteBank(true)
                    }else sendTo(type,undefined)
                  }} className="w-full text-left px-3 py-2 text-xs hover:bg-green-50 font-medium flex items-center gap-2">
                    <span className="text-green-700">+ {icon} New {label}</span>
                  </button>
                )
              })}
              {loading&&<p className="px-3 py-1 text-[10px] text-gray-400">Loading…</p>}
              {!loading&&allOpenDocs.length>0&&(
                <>
                  <div className="border-t my-1"/>
                  <div className="px-3 py-1">
                    <input type="text" value={existingDocsSearch} onChange={e=>setExistingDocsSearch(e.target.value)}
                      placeholder="Search any Quote/SO/Invoice…"
                      className="w-full text-[11px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                  </div>
                  <p className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                    {searchQ?`Search Results (${docsToShow.length})`:'Add to Existing'}
                  </p>
                  <div className="max-h-56 overflow-y-auto">
                    {docsToShow.length===0&&<p className="px-3 py-2 text-xs text-gray-400">{searchQ?'No matches':'No open documents for this client — use the search above'}</p>}
                    {docsToShow.map((d:any)=>(
                      <div key={d.id} className="flex items-center gap-1 px-2 py-1 hover:bg-indigo-50">
                        <button onClick={()=>sendTo(d.type,d)} className="flex-1 text-left py-1 text-[11px] min-w-0">
                          <span className="font-semibold text-indigo-700">{d.docNumber}</span>
                          <span className="text-gray-400 ml-1 capitalize">({d.type})</span>
                          {d.clientName&&<span className="text-gray-500 block text-[10px] truncate">{d.clientName}</span>}
                        </button>
                        {d.type==='quote'&&(
                          <button onClick={()=>{
                            const clientInvoices=existingDocs.filter((x:any)=>x.type==='invoice')
                            if(clientInvoices.length>0) setPendingConvertQuote(d)
                            else sendTo(d.type,d,undefined,true)
                          }}
                            className="shrink-0 text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 border border-orange-300 rounded font-semibold hover:bg-orange-200 whitespace-nowrap">→ Invoice</button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ItemCard ────────────────────────────────────────────────────────────────
function ItemCard({
  item, contacts, suppliers, options, exchangeRates,
  onSave, onDelete, onDuplicate, onAddOption, onSendToWorksheet, isNew, onCancelNew, isSelected, onToggleSelect,
}: {
  item: DashboardItem & { _draft?: boolean }
  contacts: Contact[]; suppliers: SupplierContact[]; options: DashboardOptions
  exchangeRates: Record<string, number>
  onSave: (id: string, data: Partial<FormState>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onDuplicate: (id: string) => Promise<void>
  onAddOption: (type: 'brand' | 'unit' | 'eta', value: string) => Promise<void>
  onSendToWorksheet: (id: string, form: FormState) => Promise<void>
  isNew?: boolean; onCancelNew?: () => void; isSelected?: boolean; onToggleSelect?: (id: string) => void
}) {
  const [form, setForm] = useState<FormState>({
    sku:item.sku, description:item.description, retailPrice:item.retailPrice??'', estimatedRetailPrice:item.estimatedRetailPrice,
    wholesalePrice:item.wholesalePrice??'', wholesaleCurrency:item.wholesaleCurrency??'ZAR', supplierSRP:item.supplierSRP??'', supplierDiscount:item.supplierDiscount??'',
    wholesalePrice2:item.wholesalePrice2??'', wholesaleCurrency2:item.wholesaleCurrency2??'CNY', supplierSRP2:item.supplierSRP2??'', supplierDiscount2:item.supplierDiscount2??'',
    estimatedRetailPrice2:item.estimatedRetailPrice2??'', moq2Qty:item.moq2Qty??0, moq2Enabled:item.moq2Enabled??false, moq2ResellerOnly:item.moq2ResellerOnly??false,
    eta:item.eta, cutoffDate:item.cutoffDate??'', orderPlaced:item.orderPlaced??false, published:item.published??false,
    supplier:item.supplier, brand:item.brand, unit:item.unit??'', imageUrl:item.imageUrl,
    customers:item.customers, extraQty:item.extraQty??0, minOrderQty:item.minOrderQty??0,
    resellerMoq:item.resellerMoq??1, resellerOnly:item.resellerOnly??false,
    // Left as the stored value, NOT defaulted here — undefined means "use the
    // standard percentages", so a card only carries them once they are changed.
    shipPct:item.shipPct, customsPct:item.customsPct, markupPct:item.markupPct, vatPct:item.vatPct,
    priceManual:item.priceManual??false,
    seoTitle:item.seoTitle??'', seoDescription:item.seoDescription??'', seoImageUrl:item.seoImageUrl,
    shipmentStatus:item.shipmentStatus, linkedWsId:item.linkedWsId, showRetail:item.showRetail!==false, notes:item.notes??'',
  } as FormState)
  const formRef = useRef(form); formRef.current = form
  const customersDirty = useRef(false)
  const [saving,setSaving]=useState(false); const [deleting,setDeleting]=useState(false); const [confirmDelete,setConfirmDelete]=useState(false)
  const [sendingWs,setSendingWs]=useState(false); const [posterLoading,setPosterLoading]=useState(false)
  const [sendingArrivals,setSendingArrivals]=useState(false); const [sendingLanding,setSendingLanding]=useState(false)
  const [supplierOpen,setSupplierOpen]=useState(false); const [isDragging,setIsDragging]=useState(false)
  const [imageSize,setImageSize]=useState<'sm'|'md'|'lg'>('sm')
  const [autoSaveStatus,setAutoSaveStatus]=useState<'idle'|'pending'|'saving'|'saved'|'error'>('idle')
  const [imageUploading,setImageUploading]=useState(false)
  const [autoCalc,setAutoCalc]=useState(!item.priceManual); const [autoCalc2,setAutoCalc2]=useState(true)
  const [copied,setCopied]=useState(false); const [showSeo,setShowSeo]=useState(false)
  const [showWsPicker,setShowWsPicker]=useState(false); const [wsList,setWsList]=useState<any[]>([]); const [loadingWsList,setLoadingWsList]=useState(false)
  const supplierRef=useRef<HTMLDivElement>(null); const imageInputRef=useRef<HTMLInputElement>(null)
  const imageZoneRef=useRef<HTMLDivElement>(null); const seoImageInputRef=useRef<HTMLInputElement>(null)
  const autoSaveTimer=useRef<ReturnType<typeof setTimeout>|null>(null); const isFirstRender=useRef(true)

  useEffect(()=>{
    const srp=parseFloat(form.supplierSRP||''),disc=parseFloat(form.supplierDiscount||'')
    if(!isNaN(srp)&&srp>0&&!isNaN(disc)&&disc>=0&&disc<100) setForm(f=>({...f,wholesalePrice:(srp*(1-disc/100)).toFixed(2)}))
  },[form.supplierSRP,form.supplierDiscount])
  useEffect(()=>{
    if(!autoCalc) return
    const calc=calcRetailPrice(form.wholesalePrice||'',form.wholesaleCurrency||'ZAR',exchangeRates,form as CostingPcts)
    if(calc&&calc!==form.estimatedRetailPrice) setForm(f=>({...f,estimatedRetailPrice:calc}))
  },[form.wholesalePrice,form.wholesaleCurrency,form.shipPct,form.customsPct,form.markupPct,form.vatPct,autoCalc,exchangeRates])
  // Tier 2 buys at a different price but carries the same cost structure, so it
  // rides on this item's percentages rather than having its own. Guarded on value
  // inequality because autosave fires on every form change and an unguarded write loops.
  useEffect(()=>{
    if(!autoCalc2) return
    const calc=calcRetailPrice((form as any).wholesalePrice2||'',(form as any).wholesaleCurrency2||'ZAR',exchangeRates,form as CostingPcts)
    if(calc&&calc!==(form as any).estimatedRetailPrice2) setForm(f=>({...f,estimatedRetailPrice2:calc}))
  },[(form as any).wholesalePrice2,(form as any).wholesaleCurrency2,form.shipPct,form.customsPct,form.markupPct,form.vatPct,autoCalc2,exchangeRates])
  useEffect(()=>{
    if(!form.supplier) return
    const sup=suppliers.find(s=>s.name===form.supplier)
    if(sup?.preferredCurrency&&sup.preferredCurrency!==form.wholesaleCurrency) setForm(f=>({...f,wholesaleCurrency:sup.preferredCurrency!}))
  },[form.supplier])
  useEffect(()=>{
    if(isFirstRender.current){isFirstRender.current=false;return}
    if(isNew) return
    setAutoSaveStatus('pending')
    if(autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current=setTimeout(async()=>{
      setAutoSaveStatus('saving')
      try{
        const{customers,...fieldsOnly}=formRef.current
        const data=customersDirty.current?formRef.current:fieldsOnly
        await onSave(item.id,data)
        if(customersDirty.current) customersDirty.current=false
        setAutoSaveStatus('saved'); setTimeout(()=>setAutoSaveStatus('idle'),3000)
      }catch{setAutoSaveStatus('error')}   // the next edit retries
    },1500)
    return()=>{if(autoSaveTimer.current) clearTimeout(autoSaveTimer.current)}
  },[form])
  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(supplierRef.current&&!supplierRef.current.contains(e.target as Node)) setSupplierOpen(false)}
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  },[])

  const set=(field:keyof FormState,value:any)=>setForm(f=>({...f,[field]:value}))
  const handleImageFile=async(file:Blob,name='image.jpg')=>{
    setImageUploading(true)
    try{set('imageUrl',await uploadImageFile(file,(file as File).name||name))}
    catch(e:any){window.alert(`Image not saved — ${e?.message||'upload failed'}`)}
    finally{setImageUploading(false)}
  }
  const handleDragOver=(e:React.DragEvent)=>{e.preventDefault();e.stopPropagation();setIsDragging(true)}
  const handleDragLeave=(e:React.DragEvent)=>{e.preventDefault();e.stopPropagation();setIsDragging(false)}
  const handleDrop=(e:React.DragEvent)=>{
    e.preventDefault();e.stopPropagation();setIsDragging(false)
    const file=Array.from(e.dataTransfer.files).find(f=>f.type.startsWith('image/'))
    if(file){handleImageFile(file);return}
    const url=e.dataTransfer.getData('text/uri-list')||e.dataTransfer.getData('text/plain')
    if(url?.startsWith('data:image')){fetch(url).then(r=>r.blob()).then(b=>handleImageFile(b,'dropped.png')).catch(()=>{});return}
    if(url&&url.startsWith('http')) set('imageUrl',url)
  }
  const isPastCutoff=!!form.cutoffDate&&daysUntilCutoff(form.cutoffDate)<=0
  const addCustomer=(c:Contact)=>{
    customersDirty.current=true
    setForm(f=>{
      if(f.customers.find(cu=>cu.id===c.id)) return f
      const moq=f.minOrderQty??0,currentTotal=f.customers.reduce((s,cu)=>s+cu.qty,0)
      const available=moq>0?Math.max(0,moq-currentTotal):(f.extraQty??0)
      return{...f,customers:[...f.customers,{id:c.id,name:`${c.firstName} ${c.lastName}`,email:c.email,phone:c.phone,qty:isPastCutoff?Math.min(1,available):1,depositPaid:false}]}
    })
  }
  const updateCustomer=(id:string,patch:Partial<DashboardCustomer>)=>{customersDirty.current=true;setForm(f=>({...f,customers:f.customers.map(c=>c.id===id?{...c,...patch}:c)}))}
  const removeCustomer=(id:string)=>{customersDirty.current=true;setForm(f=>({...f,customers:f.customers.filter(c=>c.id!==id)}))}
  const addManualCustomer=(name:string)=>{
    customersDirty.current=true
    setForm(f=>{
      if(f.customers.find(cu=>cu.name.toLowerCase()===name.toLowerCase())) return f
      const moq=f.minOrderQty??0,currentTotal=f.customers.reduce((s,cu)=>s+cu.qty,0)
      const available=moq>0?Math.max(0,moq-currentTotal):(f.extraQty??0)
      return{...f,customers:[...f.customers,{id:`manual_${Date.now()}`,name,qty:isPastCutoff?Math.min(1,available):1,depositPaid:false}]}
    })
  }
  const refreshCustomers=async()=>{
    try{const res=await fetch(`/api/admin/preorder-dashboard/${item.id}`);if(res.ok){const fresh=await res.json();setForm(f=>({...f,customers:fresh.customers||[]}));customersDirty.current=false}}catch{}
  }
  const openWsPicker=async()=>{
    setShowWsPicker(true);setLoadingWsList(true)
    try{const data=await fetch('/api/admin/worksheets').then(r=>r.json());setWsList(Array.isArray(data)?data.filter((w:any)=>!w.archived):[])}
    catch{setWsList([])}
    setLoadingWsList(false)
  }
  const addToExistingWorksheet=async(ws:any)=>{
    setShowWsPicker(false);setSendingWs(true)
    try{
      const customerQty=formRef.current.customers.reduce((sum,c)=>sum+c.qty,0)
      const moq=formRef.current.minOrderQty??0
      const totalQty=moq>0?moq:customerQty
      const newLineItem={id:`ws_${Date.now()}_item`,sku:formRef.current.sku,skuSearch:formRef.current.sku,description:formRef.current.description,unit:formRef.current.unit||'',category:formRef.current.brand||'',inStock:0,retailPrice:parsePrice(formRef.current.retailPrice||formRef.current.estimatedRetailPrice),preOrderPrice:0,qty:totalQty||1,wholesalePrice:parsePrice(formRef.current.wholesalePrice||'0'),retailOverride:'',sentToInventory:false}
      const updated={...ws,items:[...(ws.items||[]),newLineItem],preOrderItemId:item.id}
      const res=await fetch('/api/admin/worksheets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(updated)})
      if(res.ok){await fetch(`/api/admin/preorder-dashboard/${item.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({shipmentStatus:'shipping_soon',linkedWsId:ws.id})});set('shipmentStatus','shipping_soon');set('linkedWsId',ws.id)}
    }finally{setSendingWs(false)}
  }
  const handleSave=async()=>{setSaving(true);try{const{customers,...fieldsOnly}=formRef.current;const data=customersDirty.current?formRef.current:fieldsOnly;await onSave(item.id,data);if(customersDirty.current) customersDirty.current=false}catch(e:any){window.alert(`Not saved — ${e?.message||'server error'}`)}finally{setSaving(false)}}
  const handleDelete=async()=>{setDeleting(true);try{await onDelete(item.id)}finally{setDeleting(false);setConfirmDelete(false)}}
  const handleSendToWorksheet=async()=>{setSendingWs(true);try{await onSendToWorksheet(item.id,formRef.current)}finally{setSendingWs(false)}}
  // Latest Arrivals is the post-arrival slider, so the card's qty is live Inventory stock,
  // not the dashboard's own reservation slots. compareAtPrice is deliberately NOT sent —
  // on R66Slot it holds Average Cost, which must never reach a public card.
  const handleSendToLatestArrivals=async()=>{
    const f=formRef.current
    if(!f.sku||/chasecar/i.test(f.sku)||/chasecar/i.test(f.description||'')){window.alert('This item cannot be sent to Latest Arrivals.');return}
    setSendingArrivals(true)
    try{
      const prod=await fetch('/api/admin/products?fields=sku,quantity,price,id').then(r=>r.json()).catch(()=>[])
      const match=(Array.isArray(prod)?prod:[]).find((p:any)=>p.sku?.trim().toLowerCase()===f.sku.trim().toLowerCase())
      const payload={
        sku:f.sku,
        title:f.description||f.sku,
        imageUrl:f.imageUrl||'',
        price:parsePrice(f.retailPrice||f.estimatedRetailPrice||'0')||Number(match?.price)||0,
        quantity:Number(match?.quantity)||0,
        productId:match?.id||undefined,
      }
      const res=await fetch('/api/admin/latest-arrivals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      if(res.ok) set('sentToLatestArrivals',true)
      else{const err=await res.json().catch(()=>({}));window.alert(`Latest Arrivals failed: ${err.error||res.status}`)}
    }catch{window.alert('Latest Arrivals failed — please try again.')}
    finally{setSendingArrivals(false)}
  }
  // Same payload as Latest Arrivals, different blob — Landing Soon is the pre-arrival
  // slider, so a dashboard item can sit on it before the shipment lands and move across
  // afterwards. Chasecars stay off both: neither reveal is meant to be public.
  const handleSendToLandingSoon=async()=>{
    const f=formRef.current
    if(!f.sku||/chasecar/i.test(f.sku)||/chasecar/i.test(f.description||'')){window.alert('This item cannot be sent to Landing Soon.');return}
    setSendingLanding(true)
    try{
      const prod=await fetch('/api/admin/products?fields=sku,quantity,price,id').then(r=>r.json()).catch(()=>[])
      const match=(Array.isArray(prod)?prod:[]).find((p:any)=>p.sku?.trim().toLowerCase()===f.sku.trim().toLowerCase())
      // Pre-arrival, so the card's qty is the dashboard's remaining slots — the same
      // "(N in stock)" figure shown on this card — not Inventory, which is still 0 until
      // the shipment lands. /api/landing-soon recomputes this live; this is only the
      // snapshot written to the blob.
      const reserved=(f.customers||[]).reduce((s,c)=>s+(Number(c.qty)||0),0)
      const moq=Number(f.minOrderQty)||0
      const available=moq>0?Math.max(0,moq-reserved):Math.max(0,Number(f.extraQty)||0)
      const landingPayload={
        sku:f.sku,
        title:f.description||f.sku,
        imageUrl:f.imageUrl||'',
        price:parsePrice(f.estimatedRetailPrice||f.retailPrice||'0')||Number(match?.price)||0,
        quantity:available,
        productId:match?.id||undefined,
      }
      const res=await fetch('/api/admin/landing-soon',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(landingPayload)})
      if(res.ok) set('sentToLandingSoon',true)
      else{const err=await res.json().catch(()=>({}));window.alert(`Landing Soon failed: ${err.error||res.status}`)}
    }catch{window.alert('Landing Soon failed — please try again.')}
    finally{setSendingLanding(false)}
  }

  const unitPrice=parsePrice(form.estimatedRetailPrice)
  const totalQty=form.customers.reduce((sum,c)=>sum+c.qty,0)
  const minOrderQty=form.minOrderQty??0; const moqGap=minOrderQty>0?minOrderQty-totalQty:0; const moqMet=minOrderQty>0&&moqGap<=0
  const alertRaw=cutoffAlert(form.cutoffDate); const alert={...alertRaw,active:alertRaw.active&&!form.orderPlaced}
  const cutoffColors=alert.active
    ?alert.days<=0?{badge:'bg-red-700 text-white',header:'bg-red-600 border-red-500',border:'border-red-400',pulse:true}
    :alert.days===1?{badge:'bg-orange-500 text-white',header:'bg-orange-500 border-orange-400',border:'border-orange-400',pulse:false}
    :{badge:'bg-yellow-400 text-black',header:'bg-yellow-400 border-yellow-300',border:'border-yellow-300',pulse:false}
    :null
  const isOrderLocked=!!form.orderPlaced; const extraQty=form.extraQty??0
  const inStock=minOrderQty>0?Math.max(0,minOrderQty-totalQty):extraQty; const canAddNew=!isPastCutoff||inStock>0
  const IMAGE_HEIGHTS={sm:'h-36',md:'h-52',lg:'h-72'}; const hasWholesale=!!(form.wholesalePrice&&parsePrice(form.wholesalePrice)>0)

  return (
    <div className={`bg-white rounded-2xl border shadow-sm flex flex-col ${cutoffColors?cutoffColors.border:'border-gray-200'}`}>
      <div className={`px-3 pt-2 pb-1.5 border-b rounded-t-2xl ${cutoffColors?`${cutoffColors.header} ${cutoffColors.pulse?'animate-pulse':''}`:'bg-gray-50 border-gray-100'}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            {!isNew&&onToggleSelect&&<input type="checkbox" checked={!!isSelected} onChange={()=>onToggleSelect(item.id)} onClick={e=>e.stopPropagation()} className="w-3.5 h-3.5 accent-red-600 flex-shrink-0 cursor-pointer" title="Select for bulk delete"/>}
            {alertRaw.active&&!form.orderPlaced&&cutoffColors&&<span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${cutoffColors.badge}`}>⚠ Cut-off {alertRaw.days===0?'TODAY':`in ${alertRaw.days}d`}</span>}
            {form.orderPlaced&&<span className="text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full whitespace-nowrap">✓ Placed</span>}
            {form.shipmentStatus==='shipping_soon'&&<span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full whitespace-nowrap">🚢 Soon</span>}
            {form.shipmentStatus==='shipping'&&<span className="text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full whitespace-nowrap">📦 Shipped</span>}
            {form.linkedWsId&&<a href={`/admin/worksheet?id=${form.linkedWsId}`} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-indigo-600 hover:underline whitespace-nowrap">🧮 WS</a>}
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={!!form.orderPlaced} onChange={e=>set('orderPlaced',e.target.checked)} className="w-3.5 h-3.5 accent-green-600"/>
              <span className={`text-[11px] font-medium whitespace-nowrap ${alert.active?(alert.days<=1?'text-white':'text-black'):form.orderPlaced?'text-green-700':'text-gray-500'}`}>Order placed</span>
            </label>
            {!isNew&&<span className={`text-[10px] font-medium whitespace-nowrap ${alert.active?(alert.days<=1?'text-white/70':'text-black/60'):'text-gray-400'}`}>
              {autoSaveStatus==='pending'&&'…'}{autoSaveStatus==='saving'&&'Saving…'}{autoSaveStatus==='saved'&&'✓ Saved'}
              {autoSaveStatus==='error'&&<span className="text-red-600 font-semibold">⚠ Not saved</span>}
              {autoSaveStatus==='idle'&&item.updatedAt&&`Saved ${new Date(item.updatedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`}
            </span>}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {confirmDelete?(
              <><button onClick={()=>setConfirmDelete(false)} className="text-[11px] px-2.5 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 whitespace-nowrap">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="text-[11px] px-2.5 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 font-semibold whitespace-nowrap">{deleting?'Deleting…':'Confirm'}</button></>
            ):(
              <>{isNew&&onCancelNew&&<button onClick={onCancelNew} className="text-[11px] px-2.5 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 whitespace-nowrap">Cancel</button>}
              <button onClick={()=>setConfirmDelete(true)} className="text-[11px] px-2.5 py-1 rounded-lg whitespace-nowrap text-red-600 hover:bg-red-50">Delete</button>
              <button onClick={handleSave} disabled={saving} className="text-[11px] px-3 py-1 rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-60 font-semibold whitespace-nowrap">{saving?'Saving…':isNew?'Add':'Save'}</button></>
            )}
          </div>
        </div>
        {!isNew&&(
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {showWsPicker&&(
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={()=>setShowWsPicker(false)}>
                <div className="bg-white rounded-2xl shadow-2xl p-4 w-80 max-h-[80vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-gray-800 text-sm">Send to Worksheet</h3><button onClick={()=>setShowWsPicker(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button></div>
                  {loadingWsList?<p className="text-sm text-gray-400 text-center py-6">Loading…</p>:(
                    <div className="space-y-1.5">
                      <button onClick={()=>{setShowWsPicker(false);handleSendToWorksheet()}} className="w-full text-left px-3 py-2.5 rounded-xl text-sm bg-blue-600 text-white hover:bg-blue-700 font-semibold">+ New Worksheet</button>
                      {wsList.length>0&&<p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pt-1 px-1">Add to existing</p>}
                      {wsList.map(ws=>(
                        <button key={ws.id} onClick={()=>addToExistingWorksheet(ws)} className="w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-gray-50 border border-gray-100 transition-colors">
                          <div className="font-medium text-gray-800 truncate">{ws.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{ws.date}{ws.supplier?` · ${ws.supplier}`:''} · {ws.items?.length??0} item{ws.items?.length!==1?'s':''}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <button onClick={openWsPicker} disabled={sendingWs} className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 font-semibold whitespace-nowrap">{sendingWs?'Sending…':'📋 Worksheet'}</button>
            <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={form.showRetail!==false} onChange={e=>set('showRetail',e.target.checked)} className="w-3.5 h-3.5 accent-rose-600"/><span className="text-[10px] font-semibold text-gray-600 whitespace-nowrap">Show Retail</span></label>
            <button onClick={async()=>{setPosterLoading(true);try{await generatePoster(formRef.current,item.sku)}finally{setPosterLoading(false)}}} disabled={posterLoading} className="text-[11px] px-2.5 py-1 rounded-lg bg-rose-700 text-white hover:bg-rose-800 disabled:opacity-60 font-semibold whitespace-nowrap">{posterLoading?'⏳':'🖼 Poster'}</button>
            <button onClick={()=>set('published',!form.published)} className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors ${form.published?'bg-emerald-600 text-white hover:bg-emerald-700':'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{form.published?'🟢 Published':'⚫ Publish'}</button>
            <button onClick={handleSendToLatestArrivals} disabled={sendingArrivals} className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors disabled:opacity-60 ${form.sentToLatestArrivals?'bg-purple-700 text-white hover:bg-purple-800':'bg-purple-100 text-purple-800 hover:bg-purple-200'}`} title="Send this item to the Latest Arrivals section on the Home Page">
              {sendingArrivals?'Sending…':form.sentToLatestArrivals?'🆕 In Latest Arrivals':'🆕 Send to Latest Arrivals'}
            </button>
            <button onClick={handleSendToLandingSoon} disabled={sendingLanding} className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors disabled:opacity-60 ${form.sentToLandingSoon?'bg-sky-700 text-white hover:bg-sky-800':'bg-sky-100 text-sky-800 hover:bg-sky-200'}`} title="Send this item to the Landing Soon section on the Home Page">
              {sendingLanding?'Sending…':form.sentToLandingSoon?'🛬 In Landing Soon':'🛬 Send to Landing Soon'}
            </button>
            <button onClick={()=>onDuplicate(item.id)} className="text-[11px] px-2.5 py-1 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 whitespace-nowrap transition-colors">⧉ Duplicate</button>
            <button onClick={()=>{const url=`${window.location.origin}/preorder/${item.id}`;navigator.clipboard.writeText(url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000)})}} className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors ${copied?'bg-green-100 text-green-700':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{copied?'✓ Copied':'🔗 Copy Link'}</button>
            {form.published&&<button onClick={()=>window.open(`/preorder/${item.id}`,'_blank')} className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold whitespace-nowrap">🌐 Pre-Order Page</button>}
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row flex-1">
        <div className="flex-1 p-4 space-y-3 border-b md:border-b-0 md:border-r border-gray-100">
          <div className="relative group">
            <div className="absolute top-1.5 right-1.5 z-10 flex gap-0.5 bg-white/80 backdrop-blur-sm rounded-md px-1 py-0.5 shadow-sm border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">
              {(['sm','md','lg'] as const).map(s=><button key={s} onClick={e=>{e.stopPropagation();setImageSize(s)}} className={`text-[10px] px-1.5 py-0.5 rounded font-semibold transition-colors ${imageSize===s?'bg-indigo-600 text-white':'text-gray-500 hover:bg-gray-100'}`}>{s.toUpperCase()}</button>)}
            </div>
            <div ref={imageZoneRef} tabIndex={0} onDragOver={handleDragOver} onDragEnter={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={()=>{if(!form.imageUrl) imageInputRef.current?.click()}}
              className={`relative w-full ${IMAGE_HEIGHTS[imageSize]} border-2 border-dashed rounded-lg overflow-hidden cursor-pointer transition-all flex items-center justify-center focus:outline-none ${isDragging?'border-indigo-500 bg-indigo-50 scale-[1.01]':'border-gray-200 bg-gray-50 hover:border-indigo-300'}`}>
              {imageUploading&&<div className="absolute inset-0 z-10 bg-white/80 flex items-center justify-center text-xs font-semibold text-indigo-600">Uploading…</div>}
              {form.imageUrl?(
                <><img src={form.imageUrl} alt="product" className="object-contain h-full w-full"/>
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100 gap-2">
                  <button onClick={e=>{e.stopPropagation();imageInputRef.current?.click()}} className="bg-white rounded-lg px-2 py-1 text-xs font-medium text-gray-700 shadow hover:bg-gray-100">Replace</button>
                  <button onClick={e=>{e.stopPropagation();set('imageUrl',undefined)}} className="bg-white rounded-lg px-2 py-1 text-xs font-medium text-red-600 shadow hover:bg-red-50">Remove</button>
                </div></>
              ):(
                <div className="text-center text-gray-400 text-xs select-none pointer-events-none">
                  {isDragging?<><div className="text-2xl mb-1">⬇️</div><div className="font-medium text-indigo-600">Drop image here</div></>
                  :<><div className="text-2xl mb-1">📷</div><div className="font-medium">Click to browse</div><div className="mt-0.5 text-gray-300">or drag &amp; drop</div></>}
                </div>
              )}
            </div>
          </div>
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={e=>{if(e.target.files?.[0]) handleImageFile(e.target.files[0])}}/>

          <div className="grid grid-cols-2 gap-2">
            <div><label className="block text-xs text-gray-500 mb-0.5">SKU</label><input type="text" value={form.sku} onChange={e=>set('sku',e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="SKU-001"/></div>
            <div><label className="block text-xs text-gray-500 mb-0.5">Retail Price (R)</label><input type="text" value={form.retailPrice} onChange={e=>set('retailPrice',e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="0.00"/></div>
          </div>

          <div className="space-y-1">
            <div className="grid gap-2" style={{gridTemplateColumns:'64px 1fr 1fr 1fr'}}>
              <span className="text-xs text-gray-500">CCY</span><span className="text-xs text-gray-500">Wholesale / Cost Price</span><span className="text-xs text-gray-500">Supplier SRP</span><span className="text-xs text-gray-500">Supplier Disc. %</span>
            </div>
            <div className="grid gap-2" style={{gridTemplateColumns:'64px 1fr 1fr 1fr'}}>
              <select value={form.wholesaleCurrency||'ZAR'} onChange={e=>set('wholesaleCurrency',e.target.value)} className="w-full text-sm border border-gray-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white">{CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}</select>
              <input type="text" value={form.wholesalePrice||''} onChange={e=>set('wholesalePrice',e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="0.00"/>
              <input type="number" value={form.supplierSRP||''} onChange={e=>set('supplierSRP',e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="0.00" min="0" step="0.01"/>
              <div className="relative"><input type="number" value={form.supplierDiscount||''} onChange={e=>set('supplierDiscount',e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="0" min="0" max="99" step="0.1"/><span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-xs text-gray-500">Est. Retail Price (R)</label>
                <button type="button" onClick={()=>{const next=!autoCalc;setAutoCalc(next);set('priceManual',!next)}} className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border transition-colors ${autoCalc?'bg-green-50 text-green-700 border-green-200':'bg-gray-100 text-gray-500 border-gray-200'}`}>{autoCalc?'⚡ Auto':'✏ Manual'}</button>
              </div>
              <input type="text" value={form.estimatedRetailPrice} onChange={e=>{setAutoCalc(false);set('priceManual',true);set('estimatedRetailPrice',e.target.value)}} className={`w-full text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${autoCalc&&hasWholesale?'bg-green-50 border-green-300 text-green-800':'border-gray-300'}`} placeholder="0.00" readOnly={autoCalc&&hasWholesale}/>
              {autoCalc&&hasWholesale&&<p className="text-[9px] text-green-700 mt-0.5">Floats with the rate until the Worksheet lands it.</p>}
              <CostingCalculator form={form} set={set} exchangeRates={exchangeRates}/>
            </div>
            <div className="flex flex-col justify-end pb-1 gap-1">
              {(totalQty>0||minOrderQty>0)&&<span className="text-xs font-semibold text-indigo-600">{totalQty>0&&<span>Total Qty: {totalQty}</span>}{minOrderQty>0&&<span className={`font-semibold ml-1 ${inStock>0?'text-emerald-600':'text-red-500'}`}>({inStock} in stock)</span>}</span>}
              {minOrderQty>0&&<span className={`text-xs font-semibold ${moqMet?'text-green-600':'text-orange-600'}`}>{moqMet?`✓ MOQ met`:`Need ${moqGap} more`}</span>}
              <div className="flex items-center gap-1"><label className="text-xs text-gray-500 whitespace-nowrap">Supplier Order:</label><input type="number" min={0} value={form.minOrderQty||''} placeholder="0" onChange={e=>{const v=parseInt(e.target.value);set('minOrderQty',(!isNaN(v)&&v>0)?v:null)}} className="w-16 text-xs border border-gray-300 rounded px-1 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"/></div>
            </div>
          </div>

          <div className="border border-dashed border-indigo-200 rounded-xl p-3 space-y-2 bg-indigo-50/30">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5"><input type="checkbox" id={`moq2-${item.id}`} checked={!!(form as any).moq2Enabled} onChange={e=>set('moq2Enabled',e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600"/><label htmlFor={`moq2-${item.id}`} className="text-xs font-bold text-indigo-700 cursor-pointer">Pricing Tier 2</label></div>
            </div>
            <div className="space-y-1">
              <div className="grid gap-2" style={{gridTemplateColumns:'64px 1fr 1fr 1fr'}}>
                <span className="text-[11px] text-indigo-500">CCY</span><span className="text-[11px] text-indigo-500">Wholesale 2</span><span className="text-[11px] text-indigo-500">SRP 2</span><span className="text-[11px] text-indigo-500">Disc. %</span>
              </div>
              <div className="grid gap-2" style={{gridTemplateColumns:'64px 1fr 1fr 1fr'}}>
                <select value={(form as any).wholesaleCurrency2||'CNY'} onChange={e=>set('wholesaleCurrency2',e.target.value)} className="w-full text-sm border border-indigo-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white">{CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}</select>
                <input type="text" value={(form as any).wholesalePrice2||''} onChange={e=>set('wholesalePrice2',e.target.value)} className="w-full text-sm border border-indigo-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="0.00"/>
                <input type="number" value={(form as any).supplierSRP2||''} onChange={e=>set('supplierSRP2',e.target.value)} className="w-full text-sm border border-indigo-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="0.00" min="0" step="0.01"/>
                <div className="relative"><input type="number" value={(form as any).supplierDiscount2||''} onChange={e=>set('supplierDiscount2',e.target.value)} className="w-full text-sm border border-indigo-200 rounded px-2 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="0" min="0" max="99" step="0.1"/><span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex items-center justify-between mb-0.5"><label className="text-xs text-indigo-600 font-medium">Est. Retail 2 (R)</label><button type="button" onClick={()=>setAutoCalc2(a=>!a)} className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border transition-colors ${autoCalc2?'bg-green-50 text-green-700 border-green-200':'bg-gray-100 text-gray-500 border-gray-200'}`}>{autoCalc2?'⚡ Auto':'✏ Manual'}</button></div>
                <input type="text" value={(form as any).estimatedRetailPrice2||''} onChange={e=>{setAutoCalc2(false);set('estimatedRetailPrice2',e.target.value)}} className={`w-full text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${autoCalc2&&(form as any).wholesalePrice2?'bg-green-50 border-green-300 text-green-800':'border-indigo-200'}`} placeholder="0.00" readOnly={autoCalc2&&!!(form as any).wholesalePrice2}/>
              </div>
              <div className="flex flex-col justify-start gap-1 pt-4">
                <div className="flex items-center gap-1"><label className="text-xs text-indigo-600 whitespace-nowrap font-medium">MOQ 2:</label><input type="number" min={0} value={(form as any).moq2Qty??0} onChange={e=>set('moq2Qty',Math.max(0,parseInt(e.target.value)||0))} className="w-14 text-xs border border-indigo-300 rounded px-1 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"/></div>
              </div>
            </div>
          </div>

          <div><label className="block text-xs text-gray-500 mb-0.5">Item Description</label><input type="text" value={form.description} onChange={e=>set('description',e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="Description"/></div>
          <div><label className="block text-xs text-gray-500 mb-0.5">Notes</label><textarea value={form.notes??''} onChange={e=>set('notes',e.target.value)} rows={2} className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none" placeholder="Extra info for the pre-order poster…"/></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="block text-xs text-gray-500 mb-0.5">Item / Brand</label><TagInputDropdown value={form.brand} onChange={v=>set('brand',v)} options={options.brands} onAddOption={v=>onAddOption('brand',v)} placeholder="Brand name"/></div>
            <div><label className="block text-xs text-gray-500 mb-0.5">Item / Unit</label><TagInputDropdown value={form.unit} onChange={v=>set('unit',v)} options={options.units} onAddOption={v=>onAddOption('unit',v)} placeholder="e.g. Each, Box"/></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="block text-xs text-gray-500 mb-0.5">ETA</label><TagInputDropdown value={form.eta} onChange={v=>set('eta',v)} options={options.etas} onAddOption={v=>onAddOption('eta',v)} placeholder="e.g. June 2026"/></div>
            <div ref={supplierRef} className="relative">
              <label className="block text-xs text-gray-500 mb-0.5">Supplier</label>
              <input type="text" value={form.supplier} onChange={e=>{set('supplier',e.target.value);setSupplierOpen(true)}} onFocus={()=>setSupplierOpen(true)} className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="Supplier name"/>
              {supplierOpen&&suppliers.length>0&&(
                <ul className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto mt-0.5">
                  {suppliers.filter(s=>!form.supplier||(s.name||'').toLowerCase().includes(form.supplier.toLowerCase())).map(s=>(
                    <li key={s.id} onMouseDown={()=>{set('supplier',s.name);setSupplierOpen(false)}} className="px-3 py-2 cursor-pointer hover:bg-indigo-50 text-sm flex items-center justify-between">
                      <span>{s.name}</span>{s.preferredCurrency&&<span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{s.preferredCurrency}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Order Cut-off Date</label>
            <input type="date" value={form.cutoffDate||''} onChange={e=>set('cutoffDate',e.target.value)} className={`w-full text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${alert.active?alert.days<=0?'border-red-400 bg-red-50 text-red-700 font-semibold':alert.days===1?'border-orange-400 bg-orange-50 text-orange-700 font-semibold':'border-yellow-400 bg-yellow-50 text-yellow-700 font-semibold':'border-gray-300'}`}/>
            {alert.active&&<p className={`text-xs font-semibold mt-0.5 ${alert.days<=0?'text-red-600':alert.days===1?'text-orange-600':'text-yellow-600'}`}>⚠ Cut-off {alert.days===0?'is TODAY':`in ${alert.days} day${alert.days!==1?'s':''}`}</p>}
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button type="button" onClick={()=>setShowSeo(s=>!s)} className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-600 transition-colors">
              <span>🔍 SEO / Social Sharing</span><span className={`transition-transform text-gray-400 ${showSeo?'rotate-180':''}`}>▼</span>
            </button>
            {showSeo&&(
              <div className="p-3 space-y-2 bg-white">
                {!isNew&&<div><label className="block text-xs text-gray-500 mb-0.5">Pre-Order Page Link</label><div className="flex gap-1"><input type="text" readOnly value={`${typeof window!=='undefined'?window.location.origin:''}/preorder/${item.id}`} className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 bg-gray-50 text-gray-600 select-all"/><button type="button" onClick={()=>{const url=`${window.location.origin}/preorder/${item.id}`;navigator.clipboard.writeText(url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000)})}} className={`shrink-0 text-xs px-2 py-1 rounded font-semibold transition-colors ${copied?'bg-green-100 text-green-700':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{copied?'✓ Copied':'Copy'}</button></div></div>}
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">OG Image</label>
                  <input ref={seoImageInputRef} type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f) uploadImageFile(f,f.name).then(u=>set('seoImageUrl',u)).catch(err=>window.alert(`SEO image not saved — ${err?.message||'upload failed'}`))}}/>
                  {form.seoImageUrl?(
                    <div className="relative group h-20 border border-gray-200 rounded-lg overflow-hidden bg-gray-50"><img src={form.seoImageUrl} alt="OG" className="h-full w-full object-contain"/><div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100 gap-2"><button type="button" onClick={()=>seoImageInputRef.current?.click()} className="bg-white rounded px-2 py-0.5 text-xs font-medium shadow hover:bg-gray-100">Replace</button><button type="button" onClick={()=>set('seoImageUrl',undefined)} className="bg-white rounded px-2 py-0.5 text-xs font-medium text-red-600 shadow hover:bg-red-50">Remove</button></div></div>
                  ):(
                    <div className="h-20 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center gap-2 cursor-pointer hover:border-indigo-300 text-xs text-gray-400 select-none" onClick={()=>seoImageInputRef.current?.click()}>
                      <span className="text-lg">🖼</span><span>Click to add OG image</span>
                    </div>
                  )}
                </div>
                <div><label className="block text-xs text-gray-500 mb-0.5">SEO Title</label><input type="text" value={form.seoTitle||''} onChange={e=>set('seoTitle',e.target.value)} placeholder={form.description||'Auto-fills from description'} className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"/></div>
                <div><label className="block text-xs text-gray-500 mb-0.5">SEO Description</label><textarea value={form.seoDescription||''} onChange={e=>set('seoDescription',e.target.value)} rows={2} className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"/></div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 p-4 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customers ({form.customers.length})</span>
              {!isNew&&<button onClick={refreshCustomers} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 font-medium">⟳ Refresh</button>}
              {!isNew&&form.customers.some((c:any)=>c.isNew)&&(
                <button onClick={()=>{const cleared=form.customers.map((c:any)=>({...c,isNew:false}));setForm(f=>({...f,customers:cleared}));customersDirty.current=true}} className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200 font-bold animate-pulse">✓ Mark Seen</button>
              )}
            </div>
            {unitPrice>0&&<span className="text-xs text-gray-400">50% deposit = R{(unitPrice*0.5).toFixed(2)}</span>}
          </div>
          <div className="space-y-2 mb-3">
            {form.customers.length===0&&<p className="text-xs text-gray-400 italic">No customers added yet.</p>}
            {form.customers.map(c=>{
              const deposit=unitPrice>0?unitPrice*0.5*c.qty:0
              return (
                <div key={c.id} className={`rounded-lg px-2 py-2 space-y-1.5 ${(c as any).isNew?'bg-green-50 border border-green-300':'bg-indigo-50'}`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-gray-800 truncate">{c.name}</span>
                        <span className="shrink-0 text-[10px] font-bold bg-indigo-600 text-white rounded-full px-1.5 py-0.5 leading-none">×{c.qty}</span>
                        {(c as any).isNew&&<span className="text-[10px] font-bold bg-green-600 text-white rounded-full px-1.5 py-0.5 leading-none animate-pulse">NEW</span>}
                      </div>
                      {c.email&&<span className="text-xs text-gray-500 truncate block">{c.email}</span>}
                    </div>
                    <button onClick={()=>removeCustomer(c.id)} className="text-xs leading-none shrink-0 mt-0.5 text-gray-400 hover:text-red-500">✕</button>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-gray-500">Qty</label>
                      <input type="number" min={1} value={c.qty} onChange={e=>updateCustomer(c.id,{qty:Math.max(1,parseInt(e.target.value)||1)})} className="w-12 text-xs border rounded px-1 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white border-gray-300"/>
                    </div>
                    {deposit>0&&<span className="text-xs text-indigo-700 font-medium">Deposit: R{deposit.toFixed(2)}</span>}
                    <label className="flex items-center gap-1 cursor-pointer ml-auto">
                      <input type="checkbox" checked={!!c.depositPaid} onChange={e=>updateCustomer(c.id,{depositPaid:e.target.checked,depositPaidDate:e.target.checked?(c.depositPaidDate||new Date().toISOString().slice(0,10)):undefined})} className="w-3.5 h-3.5 accent-indigo-600"/>
                      <span className="text-xs text-gray-600">Paid</span>
                    </label>
                    {c.depositPaid&&<input type="date" value={c.depositPaidDate||''} onChange={e=>updateCustomer(c.id,{depositPaidDate:e.target.value})} className="text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"/>}
                    <SendToDropdown customer={c} form={form} unitPrice={unitPrice} onLinked={(docNumber,docId)=>updateCustomer(c.id,{linkedDocNumber:docNumber,linkedDocId:docId})}/>
                  </div>
                </div>
              )
            })}
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-xs text-gray-500">Add+ Customer</label>
              {isPastCutoff&&<span className={`text-xs font-semibold ${canAddNew?'text-emerald-700':'text-red-600'}`}>{canAddNew?`In stock: ${inStock} remaining`:'🔒 Cut-off passed'}</span>}
            </div>
            {canAddNew?(
              <ContactSearch contacts={contacts} onSelect={addCustomer} onAddManual={addManualCustomer}/>
            ):(
              <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">Cut-off date has passed. Add extra stock units to accept new orders.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function SupplierPreOrderPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const supplierName = decodeURIComponent(params.supplier as string)

  const [items, setItems] = useState<DashboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [suppliers, setSuppliers] = useState<SupplierContact[]>([])
  const [options, setOptions] = useState<DashboardOptions>({ brands: [], units: [], etas: [] })
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({})
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [sortAsc, setSortAsc] = useState(false)
  // ?q= arrives from the Pre-Order Dashboard search so a result row lands pre-filtered
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [showArrived, setShowArrived] = useState(false)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [sendingToSO, setSendingToSO] = useState(false)
  const [soResult, setSoResult] = useState<{ docNumber: string } | null>(null)
  const [newItem, setNewItem] = useState<(DashboardItem & { _draft?: boolean }) | null>(null)
  const [showViewAll, setShowViewAll] = useState(false)
  const [viewAllSearch, setViewAllSearch] = useState('')

  const loadItems = async () => {
    const res = await fetch(`/api/admin/preorder-dashboard?supplier=${encodeURIComponent(supplierName)}`)
    if (res.ok) {
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    }
  }

  // Rule 60 — a relink lands in the blob for every entry the Quote covers, but this page
  // holds all of its items in memory and only renders ten of them at a time. The cards on
  // screen update themselves; everything on the other pages has to be patched here, or
  // paging forward shows the Quote number the browser loaded hours ago until the whole page
  // is reloaded. The storage event carries relinks made in another tab.
  useEffect(() => {
    const apply = (d: any) => {
      if (!d?.toDocNumber) return
      setItems((prev) => prev.map((it) => {
        const customers = (it.customers || []) as any[]
        let changed = false
        const next = customers.map((c: any) => {
          const mine = (!!d.fromDocId && c.linkedDocId === d.fromDocId) || (!!d.fromDocNumber && c.linkedDocNumber === d.fromDocNumber)
          if (!mine) return c
          changed = true
          return { ...c, linkedDocId: d.toDocId, linkedDocNumber: d.toDocNumber }
        })
        return changed ? { ...it, customers: next } : it
      }))
    }
    const h = (e: Event) => apply((e as CustomEvent).detail)
    const s = (e: StorageEvent) => { if (e.key === 'preorder-doc-relinked' && e.newValue) { try { apply(JSON.parse(e.newValue)) } catch {} } }
    window.addEventListener('preorder-doc-relinked', h)
    window.addEventListener('storage', s)
    return () => { window.removeEventListener('preorder-doc-relinked', h); window.removeEventListener('storage', s) }
  }, [])

  useEffect(() => {
    Promise.all([
      loadItems(),
      fetch('/api/admin/contacts').then(r => r.json()).then(d => setContacts(Array.isArray(d) ? d : [])).catch(() => {}),
      fetch('/api/admin/supplier-contacts').then(r => r.json()).then(d => setSuppliers(Array.isArray(d) ? d : [])).catch(() => {}),
      fetch('/api/admin/preorder-dashboard/options').then(r => r.json()).then(d => { if (d && !d.error) setOptions(d) }).catch(() => {}),
      fetch('/api/admin/exchange-rate').then(r => r.json()).then(d => { if (d?.rates) setExchangeRates(d.rates) }).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [supplierName])

  useEffect(() => {
    if (!loading && searchParams.get('new') === '1') startNew()
  }, [loading])

  // Most recent reservation timestamp among an item's not-yet-seen customers (0 if none)
  const latestNewReservedAt = (i: DashboardItem) => {
    const newCustomers = i.customers.filter(c => (c as any).isNew)
    if (!newCustomers.length) return 0
    return Math.max(...newCustomers.map(c => new Date((c as any).reservedAt || 0).getTime()))
  }

  const sorted = [...items].sort((a, b) => {
    let v = 0
    if (sortBy === 'az') v = a.description.localeCompare(b.description)
    else if (sortBy === 'sku') v = a.sku.localeCompare(b.sku)
    else if (sortBy === 'brand') v = a.brand.localeCompare(b.brand)
    else if (sortBy === 'price') v = parsePrice(a.estimatedRetailPrice) - parsePrice(b.estimatedRetailPrice)
    else if (sortBy === 'date') v = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    else if (sortBy === 'new') v = latestNewReservedAt(a) - latestNewReservedAt(b)
    else if (sortBy === 'cutoff') {
      const da = a.cutoffDate ? new Date(a.cutoffDate).getTime() : Infinity
      const db2 = b.cutoffDate ? new Date(b.cutoffDate).getTime() : Infinity
      v = da - db2
    }
    return sortAsc ? v : -v
  })

  // An item sent to Latest Arrivals has landed — it is no longer a pre-order, so it leaves the
  // dashboard. Hidden, not deleted: its customers and document links stay, "Show arrived"
  // brings it back, and a search still finds it.
  const arrivedCount = items.filter(i => i.sentToLatestArrivals).length
  const current = showArrived || search.trim() ? sorted : sorted.filter(i => !i.sentToLatestArrivals)

  // "New Orders" filters the list down to items with at least one not-yet-seen reservation
  const newFiltered = sortBy === 'new' ? current.filter(i => i.customers.some(c => (c as any).isNew)) : current

  const filtered = search.trim()
    ? newFiltered.filter(i =>
        i.description.toLowerCase().includes(search.toLowerCase()) ||
        i.sku.toLowerCase().includes(search.toLowerCase()) ||
        (i.brand || '').toLowerCase().includes(search.toLowerCase()) ||
        i.customers.some(c =>
          c.linkedDocNumber?.toLowerCase().includes(search.toLowerCase()) ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.email || '').toLowerCase().includes(search.toLowerCase())
        )
      )
    : newFiltered

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const newOrders = items.reduce((s, i) => s + i.customers.filter(c => (c as any).isNew).length, 0)

  // Fall back to Date Added if the New Orders filter is active but everything's since been marked seen
  useEffect(() => {
    if (sortBy === 'new' && newOrders === 0) setSortBy('date')
  }, [sortBy, newOrders])

  const startNew = () => {
    const draft: DashboardItem & { _draft: boolean } = {
      id: `_new_${Date.now()}`, sku: '', description: '', retailPrice: '', estimatedRetailPrice: '',
      eta: '', supplier: supplierName === '— No Supplier' ? '' : supplierName, brand: '', unit: '',
      customers: [], createdAt: new Date().toISOString(), _draft: true,
    }
    setNewItem(draft)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSave = async (id: string, data: Partial<FormState>) => {
    if (id.startsWith('_new_')) {
      const res = await fetch('/api/admin/preorder-dashboard', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Save failed (${res.status})`) }
      await loadItems(); setNewItem(null)
      return
    }
    const res = await fetch(`/api/admin/preorder-dashboard/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    })
    // A rejected save used to be dropped here while the card said "Saved" — throw, so it can't.
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Save failed (${res.status})`) }
    const updated = await res.json()
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i))
  }

  const handleDelete = async (id: string) => {
    if (id.startsWith('_new_')) { setNewItem(null); return }
    const res = await fetch(`/api/admin/preorder-dashboard/${id}`, { method: 'DELETE' })
    if (res.ok) setItems(prev => prev.filter(i => i.id !== id))
  }

  const handleDuplicate = async (id: string) => {
    const res = await fetch(`/api/admin/preorder-dashboard/${id}/duplicate`, { method: 'POST' })
    if (res.ok) { const dup = await res.json(); setItems(prev => [dup, ...prev]) }
  }

  const handleAddOption = async (type: 'brand' | 'unit' | 'eta', value: string) => {
    await fetch('/api/admin/preorder-dashboard/options', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, value }),
    })
    setOptions(prev => ({ ...prev, [`${type}s`]: [...prev[`${type}s` as keyof DashboardOptions], value] }))
  }

  const handleSendToWorksheet = async (id: string, form: FormState) => {
    const customerQty = form.customers.reduce((sum, c) => sum + c.qty, 0)
    const moq = form.minOrderQty ?? 0
    const totalQty = moq > 0 ? moq : customerQty
    const res = await fetch('/api/admin/worksheets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: `ws_${Date.now()}`, name: `${form.supplier} — ${new Date().toLocaleDateString('en-ZA')}`,
        date: new Date().toISOString().slice(0, 10), supplier: form.supplier, status: 'draft', archived: false,
        items: [{ id: `ws_${Date.now()}_item`, sku: form.sku, skuSearch: form.sku, description: form.description, unit: form.unit || '', category: form.brand || '', inStock: 0, retailPrice: parsePrice(form.retailPrice || form.estimatedRetailPrice), preOrderPrice: 0, qty: totalQty || 1, wholesalePrice: parsePrice(form.wholesalePrice || '0'), retailOverride: '', sentToInventory: false }],
        preOrderItemId: id,
      }),
    })
    if (res.ok) {
      const ws = await res.json()
      await fetch(`/api/admin/preorder-dashboard/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shipmentStatus: 'shipping_soon', linkedWsId: ws.id }) })
      setItems(prev => prev.map(i => i.id === id ? { ...i, shipmentStatus: 'shipping_soon', linkedWsId: ws.id } : i))
      window.open(`/admin/worksheet?id=${ws.id}`, '_blank')
    }
  }

  const toggleSelect = (id: string) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const handleBulkDelete = async () => {
    setBulkDeleting(true)
    try {
      await Promise.all(Array.from(selected).map(id => fetch(`/api/admin/preorder-dashboard/${id}`, { method: 'DELETE' })))
      setItems(prev => prev.filter(i => !selected.has(i.id)))
      setSelected(new Set()); setConfirmBulkDelete(false)
    } finally { setBulkDeleting(false) }
  }

  const handleSendToSO = async () => {
    const targetItems = selected.size > 0 ? items.filter(i => selected.has(i.id)) : filtered
    if (!targetItems.length) return
    setSendingToSO(true)
    setSoResult(null)
    try {
      // Every send raises its own discrete supplier order, so it groups separately on
      // /admin/suppliers and can be deleted on its own.
      const soRef = `so_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const soName = `${supplierName} – ${new Date().toLocaleDateString('en-ZA')}`
      const results = await Promise.all(targetItems.map(item => {
        const customerQty = item.customers.reduce((sum, c) => sum + c.qty, 0) + (item.extraQty || 0)
        const moq = item.minOrderQty ?? 0
        const totalQty = moq > 0 ? moq : customerQty
        const rawPrice = parsePrice(item.wholesalePrice)
        const currency = item.wholesaleCurrency || 'ZAR'
        const customerLabel = item.customers.length === 1
          ? item.customers[0].name || '1 customer'
          : `${item.customers.length} customers`
        return fetch('/api/admin/backorders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientName: customerLabel,
            sku: item.sku,
            description: item.description,
            brand: item.brand || '',
            qty: totalQty || 1,
            price: rawPrice,
            supplierName,
            supplierOrderRef: soRef,
            supplierOrderName: soName,
            notes: `${currency} ${rawPrice.toFixed(2)} – Pre-Order Dashboard`,
            source: 'preorder-dashboard',
          }),
        })
      }))
      const allOk = results.every(r => r.ok)
      if (allOk) {
        setSoResult({ docNumber: `${targetItems.length} item${targetItems.length !== 1 ? 's' : ''}` })
        window.location.href = '/admin/suppliers'
      }
    } finally { setSendingToSO(false) }
  }

  const SORT_OPTIONS: { value: SortBy; label: string }[] = [
    ...(newOrders > 0 ? [{ value: 'new' as SortBy, label: `🆕 New Orders (${newOrders})` }] : []),
    { value: 'date', label: 'Date Added' }, { value: 'az', label: 'A–Z' }, { value: 'sku', label: 'SKU' },
    { value: 'brand', label: 'Brand' }, { value: 'price', label: 'Price' }, { value: 'cutoff', label: 'Cut-off Date' },
  ]

  const fxPairs = Object.entries(exchangeRates).filter(([cur]) => cur !== 'ZAR' && items.some(i => i.wholesaleCurrency === cur))
  const viewAllFiltered = showViewAll
    ? sorted.filter(i => !viewAllSearch ||
        i.description.toLowerCase().includes(viewAllSearch.toLowerCase()) ||
        i.sku.toLowerCase().includes(viewAllSearch.toLowerCase()) ||
        i.customers.some(c =>
          c.linkedDocNumber?.toLowerCase().includes(viewAllSearch.toLowerCase()) ||
          c.name.toLowerCase().includes(viewAllSearch.toLowerCase()) ||
          (c.email || '').toLowerCase().includes(viewAllSearch.toLowerCase())
        ))
    : []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/preorder-dashboard" className="hover:text-indigo-600 font-medium transition-colors">← Pre-Order Dashboard</Link>
        <span>/</span>
        <span className="text-gray-900 font-semibold">{supplierName}</span>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{supplierName}</h1>
          <p className="text-sm text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}{newOrders > 0 && <span className="ml-2 text-green-600 font-semibold animate-pulse">● {newOrders} new order{newOrders !== 1 ? 's' : ''}</span>}</p>
        </div>
        <button onClick={startNew} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
          <span className="text-base leading-none">+</span> New Item
        </button>
      </div>

      {fxPairs.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
          <span className="font-semibold text-blue-600">Live Rates:</span>
          {fxPairs.map(([cur, rate]) => <span key={cur} className="font-medium">1 {cur} = R{rate.toFixed(4)}</span>)}
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          <span className="text-sm font-semibold text-red-700">{selected.size} item{selected.size !== 1 ? 's' : ''} selected</span>
          <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100">Clear</button>
          {confirmBulkDelete ? (
            <><span className="text-sm font-bold text-red-700 ml-2">Delete {selected.size} items?</span>
            <button onClick={() => setConfirmBulkDelete(false)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100">Cancel</button>
            <button onClick={handleBulkDelete} disabled={bulkDeleting} className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-60">{bulkDeleting ? 'Deleting…' : 'Confirm Delete'}</button></>
          ) : (
            <button onClick={() => setConfirmBulkDelete(true)} className="ml-auto text-sm font-bold bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-700">Delete Selected</button>
          )}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sort:</label>
          <select value={sortBy} onChange={e => { setSortBy(e.target.value as SortBy); setPage(1) }} className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white font-medium text-gray-700">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={() => setSortAsc(a => !a)} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 font-medium transition-colors">
            {sortAsc ? '↑ Asc' : '↓ Desc'}
          </button>
          <div className="h-4 w-px bg-gray-200"/>
          <div className="relative flex-1 min-w-[180px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search SKU, description, brand, client…"
              className="w-full pl-7 pr-7 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
            )}
          </div>
          {arrivedCount > 0 && (
            <button onClick={() => { setShowArrived(v => !v); setPage(1) }}
              className={`text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors whitespace-nowrap ${showArrived ? 'bg-purple-700 text-white border-purple-700' : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'}`}
              title="Items sent to Latest Arrivals have landed and are hidden from the pre-order list">
              🆕 {showArrived ? 'Hide' : 'Show'} arrived ({arrivedCount})
            </button>
          )}
          <div className="h-4 w-px bg-gray-200"/>
          <button onClick={() => { setViewAllSearch(''); setShowViewAll(true) }} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 font-medium transition-colors">
            👁 View All ({items.length})
          </button>
          <div className="h-4 w-px bg-gray-200"/>
          <button onClick={handleSendToSO} disabled={sendingToSO} className="text-sm px-3 py-1.5 rounded-lg font-semibold bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-60 whitespace-nowrap transition-colors">
            {sendingToSO ? 'Creating…' : `📋 Send to SO${selected.size > 0 ? ` (${selected.size})` : ''}`}
          </button>
          {soResult && <span className="text-xs text-green-600 font-semibold whitespace-nowrap">✓ {soResult.docNumber}</span>}
          <button onClick={() => { setSoResult(null); loadItems() }} className="text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 font-medium transition-colors" title="Refresh items">↻</button>
          <span className="ml-auto text-xs text-gray-400">
            {search.trim() ? `${filtered.length} of ${sorted.length}` : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </span>
        </div>
      )}

      {loading && <div className="py-20 text-center text-gray-400 text-sm">Loading…</div>}

      {newItem && (
        <ItemCard key={newItem.id} item={newItem} contacts={contacts} suppliers={suppliers} options={options}
          exchangeRates={exchangeRates}
          onSave={handleSave} onDelete={handleDelete} onDuplicate={handleDuplicate}
          onAddOption={handleAddOption} onSendToWorksheet={handleSendToWorksheet}
          isNew onCancelNew={() => setNewItem(null)}
          isSelected={false} onToggleSelect={toggleSelect}/>
      )}

      {!loading && (
        <div className="grid grid-cols-2 gap-4">
          {pagedItems.length === 0 && !newItem ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-4xl mb-3">📦</div>
              <p className="font-medium">No items for {supplierName}</p>
              <p className="text-sm mt-1">Click &quot;+ New Item&quot; to add the first one.</p>
            </div>
          ) : pagedItems.map(item => (
            <ItemCard key={item.id} item={item} contacts={contacts} suppliers={suppliers} options={options}
              exchangeRates={exchangeRates}
              onSave={handleSave} onDelete={handleDelete} onDuplicate={handleDuplicate}
              onAddOption={handleAddOption} onSendToWorksheet={handleSendToWorksheet}
              isSelected={selected.has(item.id)} onToggleSelect={toggleSelect}/>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Prev</button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${p === safePage ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{p}</button>
            ))}
          </div>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next →</button>
        </div>
      )}

      {showViewAll && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowViewAll(false)}>
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-2xl max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{supplierName} — All Items ({sorted.length})</h3>
              <button onClick={() => setShowViewAll(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="px-4 pt-3 pb-2">
              <input type="text" value={viewAllSearch} onChange={e => setViewAllSearch(e.target.value)} placeholder="Search SKU, description or client…" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" autoFocus/>
            </div>
            <div className="overflow-y-auto flex-1 px-4 pb-4">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white border-b border-gray-100">
                  <tr className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wide">
                    <th className="py-2 pr-3">SKU</th><th className="py-2 pr-3">Description</th><th className="py-2 pr-3">Retail</th><th className="py-2 pr-3">Qty</th><th className="py-2">ETA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {viewAllFiltered.map(i => {
                    const qty = i.customers.reduce((s, c) => s + c.qty, 0)
                    return (
                      <tr key={i.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setShowViewAll(false); const idx = sorted.findIndex(s => s.id === i.id); if (idx >= 0) setPage(Math.ceil((idx + 1) / PAGE_SIZE)) }}>
                        <td className="py-2 pr-3 font-mono text-xs text-gray-500">{i.sku || '—'}</td>
                        <td className="py-2 pr-3 font-medium text-gray-800 max-w-xs truncate">{i.description}</td>
                        <td className="py-2 pr-3 text-gray-600 tabular-nums">R{parsePrice(i.estimatedRetailPrice || i.retailPrice).toFixed(2)}</td>
                        <td className="py-2 pr-3 font-semibold text-indigo-600">{qty > 0 ? qty : '—'}</td>
                        <td className="py-2 text-gray-400 text-xs">{i.eta || '—'}</td>
                      </tr>
                    )
                  })}
                  {viewAllFiltered.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-gray-400 text-sm">No items match &ldquo;{viewAllSearch}&rdquo;</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


