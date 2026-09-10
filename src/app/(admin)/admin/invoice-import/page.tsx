'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SupplierContact { id: string; name: string; preferredCurrency?: string }
interface ProductRef { id: string; sku: string; title: string; brand: string }
interface CostingSettings { shippingMarkup: number; markup: number; includeVAT: boolean }

interface ParsedItem {
  id: string; sku: string; description: string
  qty: number; wholesalePrice: number; estRetailZAR: number
  /** Supplier PDF cut the SKU short — the ellipsis is stripped, the full code must be typed in. */
  skuTruncated?: boolean
}

interface SavedImport {
  id: string; supplierName: string; currency: string; wsId: string
  shippingAmount: number; itemCount: number; totalQty?: number; fileName: string
  invoiceNumber?: string
  createdAt: string; updatedAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripCJK(text: string): string {
  return text.replace(/[⺀-鿿豈-﫿︰-﹏＀-￯]/g, '').replace(/\s+/g, ' ').trim()
}

function parseNum(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val
  return parseFloat(String(val ?? '').replace(/[^0-9.]/g, '')) || 0
}

function calcEstRetail(wp: number, rate: number, ship: number, markup: number, vat: boolean): number {
  if (!wp || !rate) return 0
  const withShip = wp * rate * (1 + ship / 100)
  const withMarkup = withShip * (1 + markup / 100)
  return vat ? withMarkup * 1.15 : withMarkup
}

function fmt(n: number) {
  return 'R ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const SKU_KEYS   = ['ITEM', 'SKU', 'ITEM NO', 'ITEM NO.', 'PART NO', 'PART NO.', 'CODE', 'PRODUCT CODE', 'REFER NO', 'REFER NO.', 'REF NO', 'REF NO.', 'REFERENCE NO', 'REFERENCE']
const QTY_KEYS   = ['QTY', 'QUANTITY', 'PCS', 'UNITS']
const DESC_KEYS  = ['MODEL', 'DESCRIPTION', 'PRODUCT NAME', 'ITEM NAME', 'PRODUCT', 'NAME', 'DETAIL', 'DETAILS']
const PRICE_KEYS = ['WHOLESALE PRICE', 'UNIT PRICE', 'WHOLESALE', 'UNIT COST', 'COST', 'PRICE', 'WHOLE SALE PRICE', 'WHOLE SALE']
const SHIP_KEYS  = ['SHIPPING', 'FREIGHT', 'DELIVERY', 'SHIPPING COST', 'FREIGHT COST', 'POSTAGE', 'HANDLING']

// ─── PDF Parser ───────────────────────────────────────────────────────────────

const PDF_SKU_RE   = /\b(REFER|REF|SKU|ITEM(\s+NO)?|PART(\s+NO)?|CODE|REFERENCE)\b/i
const PDF_DESC_RE  = /\b(DESCRIPTION|MODEL|PRODUCT(\s+NAME)?|DETAIL)\b/i
const PDF_QTY_RE   = /\b(QTY|QUANTITY|PCS|UNITS)\b/i
const PDF_PRICE_RE = /\b(WHOLE[\s\-]?SALE|WHOLESALE|UNIT[\s\-]?PRICE|UNIT[\s\-]?COST)\b/i
const PDF_STOP_RE  = /\b(SUBTOTAL|SUB[\s\-]?TOTAL|FREIGHT BY|BANK\s+CHARGE|GRAND\s+TOTAL|^TOTAL$|MEMO)\b/i

function detectHeader(rows: any[][]): { idx: number; sku: number; desc: number; qty: number; price: number } | null {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const cells = rows[i].map((c: any) => String(c ?? '').toUpperCase().replace(/\s+/g, ' ').trim())
    const skuIdx = cells.findIndex((c: string) => SKU_KEYS.includes(c))
    const qtyIdx = cells.findIndex((c: string) => QTY_KEYS.includes(c))
    if (skuIdx === -1 || qtyIdx === -1) continue
    const taken = new Set([skuIdx, qtyIdx])
    const descIdx  = cells.findIndex((c, idx) => !taken.has(idx) && DESC_KEYS.includes(c))
    taken.add(descIdx)
    const priceIdx = cells.findIndex((c, idx) => !taken.has(idx) && PRICE_KEYS.some(k => c === k || c.includes(k)))
    return { idx: i, sku: skuIdx, desc: descIdx, qty: qtyIdx, price: priceIdx }
  }
  return null
}

function detectShipping(rows: any[][], headerIdx: number, priceCol: number): number {
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const cells = rows[i].map((c: any) => String(c ?? '').toUpperCase().trim())
    if (cells.some(c => SHIP_KEYS.some(k => c.includes(k)))) {
      if (priceCol !== -1) {
        const p = parseNum(rows[i][priceCol])
        if (p > 0) return p
      }
      // fallback: first positive number in the row
      const nums = rows[i].map((c: any) => parseNum(c)).filter(n => n > 0)
      return nums[0] ?? 0
    }
  }
  return 0
}

// ─── Shared PDF text extraction ─────────────────────────────────────────────

interface PdfCell { str: string; x: number }
interface PdfRow  { y: number; cells: PdfCell[] }

async function extractPdfRows(file: File): Promise<PdfRow[]> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const buf = await file.arrayBuffer()
  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise

  // Collect all text cells with absolute (x, y) coordinates — y=0 at top
  const allCells: { str: string; x: number; y: number }[] = []
  let yOffset = 0
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum)
    const vp   = page.getViewport({ scale: 1 })
    const tc   = await page.getTextContent()
    for (const item of (tc.items as any[])) {
      if (!item.str?.trim()) continue
      allCells.push({
        str: item.str.trim(),
        x:   Math.round(item.transform[4]),
        y:   Math.round(yOffset + vp.height - item.transform[5]),
      })
    }
    yOffset += Math.round(vp.height) + 30
  }

  // Cluster into rows by Y (6pt tolerance)
  allCells.sort((a, b) => a.y - b.y || a.x - b.x)
  const rows: { y: number; cells: { str: string; x: number }[] }[] = []
  for (const cell of allCells) {
    const last = rows[rows.length - 1]
    if (last && Math.abs(cell.y - last.y) <= 6) {
      last.cells.push({ str: cell.str, x: cell.x })
    } else {
      rows.push({ y: cell.y, cells: [{ str: cell.str, x: cell.x }] })
    }
  }
  rows.forEach(r => r.cells.sort((a, b) => a.x - b.x))
  return rows
}

// ─── Generic invoice parser ──────────────────────────────────────────────────

function parsePdfInvoice(
  rows: PdfRow[],
  exchangeRate: number,
  costing: CostingSettings,
): { invoiceNumber: string; items: ParsedItem[]; shippingAmount: number } {

  // ── Extract invoice number ──
  let invoiceNumber = ''
  for (const row of rows.slice(0, 50)) {
    const text = row.cells.map(c => c.str).join(' ')
    const m = text.match(/Invoice\s+No\.?\s*:?\s*([A-Z0-9][A-Z0-9\-_.]{2,})/i)
    if (m?.[1]) { invoiceNumber = m[1]; break }
  }

  // ── Find table header row ──
  let headerRowIdx = -1
  const headerCols: { name: 'sku' | 'desc' | 'qty' | 'price'; x: number }[] = []

  for (let i = 0; i < Math.min(rows.length, 80); i++) {
    const rowText = rows[i].cells.map(c => c.str).join(' ')
    if (!PDF_SKU_RE.test(rowText)) continue
    if (!PDF_QTY_RE.test(rowText) && !PDF_DESC_RE.test(rowText)) continue

    headerRowIdx = i
    for (const cell of rows[i].cells) {
      const u = cell.str.toUpperCase().trim()
      if (PDF_SKU_RE.test(u))   headerCols.push({ name: 'sku',   x: cell.x })
      else if (PDF_DESC_RE.test(u))  headerCols.push({ name: 'desc',  x: cell.x })
      else if (PDF_QTY_RE.test(u))   headerCols.push({ name: 'qty',   x: cell.x })
      else if (PDF_PRICE_RE.test(u)) headerCols.push({ name: 'price', x: cell.x })
    }

    // Check next 2 rows for multi-line header continuations (e.g. "Whole Sale" / "Price")
    for (let j = i + 1; j <= i + 2 && j < rows.length; j++) {
      for (const cell of rows[j].cells) {
        const u = cell.str.toUpperCase().trim()
        if (!headerCols.some(c => c.name === 'price') && PDF_PRICE_RE.test(u)) {
          headerCols.push({ name: 'price', x: cell.x })
        }
        if (!headerCols.some(c => c.name === 'qty') && PDF_QTY_RE.test(u)) {
          headerCols.push({ name: 'qty', x: cell.x })
        }
      }
    }
    break
  }

  if (headerRowIdx === -1 || headerCols.length < 2) {
    throw new Error(
      'Could not detect table columns in PDF. Expected: Refer NO / SKU, Description, Quantity, Wholesale Price.',
    )
  }
  headerCols.sort((a, b) => a.x - b.x)

  const assignCol = (x: number) => {
    let best = headerCols[0]
    let bestDist = Math.abs(x - best.x)
    for (const col of headerCols) {
      const d = Math.abs(x - col.x)
      if (d < bestDist) { best = col; bestDist = d }
    }
    return bestDist < 80 ? best.name : null
  }

  // ── Extract data rows ──
  const parsed: ParsedItem[] = []
  let shippingAmount = 0

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row  = rows[i]
    const text = row.cells.map(c => c.str).join(' ')
    if (PDF_STOP_RE.test(text.toUpperCase())) break

    // Detect shipping row
    if (SHIP_KEYS.some(k => text.toUpperCase().includes(k))) {
      const nums = row.cells.map(c => parseNum(c.str)).filter(n => n > 0)
      if (nums.length) shippingAmount = nums[nums.length - 1]
      continue
    }

    const vals: Record<string, string> = {}
    for (const cell of row.cells) {
      const col = assignCol(cell.x)
      if (col) vals[col] = ((vals[col] ?? '') + ' ' + cell.str).trim()
    }

    const sku = stripCJK((vals.sku ?? '').trim())
    const qty = parseNum(vals.qty)
    if (!sku || !qty) continue

    const desc = stripCJK((vals.desc ?? '').trim())
    const wp   = parseNum(vals.price)
    parsed.push({
      id: `pdf_${Date.now()}_${i}`,
      sku,
      description: desc,
      qty,
      wholesalePrice: wp,
      estRetailZAR: calcEstRetail(wp, exchangeRate, costing.shippingMarkup, costing.markup, costing.includeVAT),
    })
  }

  return { invoiceNumber, items: parsed, shippingAmount }
}

// ─── Sideways (French) invoice parser ──────────────────────────────────
//
// Sideways invoices are French-language PDFs. Only four things are read:
//   Quantite    → qty          Référence  → sku
//   P.U. HT     → wholesale     Facture N° → invoice number (value sits BELOW the label)
// Every other column (Désignation, Remise, TVA, Montant HT …) is still mapped so its
// cells are absorbed by their own column instead of bleeding into the ones we import.

function deaccent(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function frKey(text: string): string {
  return deaccent(text).toUpperCase().replace(/\s+/g, ' ').trim()
}

/** French numbers use a comma decimal and space/NBSP thousands: "1 234,56" → 1234.56 */
function parseFrNum(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val
  let t = String(val ?? '')
    .replace(/[\s\u00A0\u202F\u2009]/g, '')
    .replace(/[\u20AC$\u00A3]/g, '')
    .replace(/,/g, '.')
    .replace(/[^0-9.\-]/g, '')
  const parts = t.split('.')
  if (parts.length > 2) t = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1]
  const n = parseFloat(t)
  return isNaN(n) ? 0 : n
}

type FrCol = 'sku' | 'desc' | 'qty' | 'price' | 'other'

const FR_COL_RES: { name: FrCol; re: RegExp }[] = [
  { name: 'sku',   re: /^(REFERENCE|REFERENCES|REF\.?|CODE(\s*ARTICLE)?)$/ },
  { name: 'qty',   re: /^(QUANTITE|QUANTITES|QTE\.?|QTY|QT\.?)$/ },
  { name: 'price', re: /^(P\.?\s*U\.?(\s*H\.?\s*T\.?)?|PU\s*HT|PRIX\s*(U\.?|UNITAIRE)(\s*H\.?\s*T\.?)?)$/ },
  { name: 'desc',  re: /^(DESIGNATION|LIBELLE|DESCRIPTION|ARTICLE|PRODUIT)$/ },
  // Columns we do not import, mapped so their values never land in ours:
  { name: 'other', re: /^(%?\s*REM(ISE)?(\s*H\.?\s*T\.?)?|MONTANT(\s*(H\.?\s*T\.?|T\.?T\.?C\.?|TVA))?|TOTAL(\s*H\.?\s*T\.?)?|TVA|T\.V\.A\.?|TAUX(\s*TVA)?|TX|UNITE|UN\.?|COND\.?|POIDS|ECO[\s-]?PART|DEEE)$/ },
]

/**
 * The real end of the table. Deliberately narrow: Sage prints "HS CODE ... Sous- total"
 * rows in the MIDDLE of the table (and again on the last page), so a bare \bTOTAL\b
 * would stop the parse on page 1 and silently drop every later page.
 */
const FR_STOP_RE = /\b(TOTAL\s*(H\.?\s*T\.?|T\.?T\.?C\.?|TVA|GENERAL)|NET\s*(H\.?\s*T\.?|A\s*PAYER)|BASE\s*H\.?\s*T\.?|ARRETE\s*LA\s*PRESENTE|MODE\s*DE\s*REGLEMENT|ESCOMPTE|IBAN|BIC)\b/

/** Sub-total / customs rows inside the table — skipped, never a stop and never a line. */
const FR_SKIP_RE = /\b(SOUS\s*-?\s*TOTAL|HS\s*CODE|REPORT)\b/

const FR_DATE_RE = /^\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}$/

/** True when the PDF reads like a French invoice, so we can auto-pick this parser. */
function looksFrench(rows: PdfRow[]): boolean {
  const head = frKey(rows.slice(0, 90).map(r => r.cells.map(c => c.str).join(' ')).join(' '))
  if (!/\bFACTURE\b/.test(head)) return false
  return /\bREFERENCE\b/.test(head) || /\bQUANTITE\b/.test(head) || /\bP\.?\s*U\.?\s*H\.?T\.?\b/.test(head)
}

/**
 * "Facture N°" is a label; the number itself sits on a row below it, in the same
 * column. Falls back to an inline "Facture N° 12345" if the PDF puts it on one line.
 */
function findFrInvoiceNumber(rows: PdfRow[]): string {
  for (let i = 0; i < Math.min(rows.length, 70); i++) {
    for (const cell of rows[i].cells) {
      if (!/^FACTURE\s*(N|NO|NUM)/.test(frKey(cell.str))) continue

      const inline = cell.str.match(/FACTURE\s*N[^A-Za-z0-9]*([A-Z0-9][A-Z0-9\-_\/.]{1,})/i)
      if (inline?.[1] && /\d/.test(inline[1])) return inline[1].replace(/[.,;]$/, '')

      for (let j = i + 1; j <= i + 5 && j < rows.length; j++) {
        for (const c of rows[j].cells) {
          if (Math.abs(c.x - cell.x) > 90) continue
          const v = c.str.trim().replace(/[.,;]$/, '')
          if (FR_DATE_RE.test(v)) continue
          if (!/\d/.test(v)) continue
          if (/^[A-Z0-9][A-Z0-9\-_\/.]{2,}$/i.test(v)) return v
        }
      }

      // Fallback: same row, immediately to the right of the label.
      for (const c of rows[i].cells) {
        if (c.x <= cell.x || c.x - cell.x > 140) continue
        const v = c.str.trim().replace(/[.,;]$/, '')
        if (FR_DATE_RE.test(v)) continue
        if (!/\d/.test(v)) continue
        if (/^[A-Z0-9][A-Z0-9\-_\/.]{2,}$/i.test(v)) return v
      }
    }
  }
  return ''
}

function parseSidewaysPdf(
  rows: PdfRow[],
  exchangeRate: number,
  costing: CostingSettings,
): { invoiceNumber: string; items: ParsedItem[] } {

  // ── Locate the table header ──
  let headerRowIdx = -1
  const cols: { name: FrCol; x: number }[] = []

  for (let i = 0; i < Math.min(rows.length, 90); i++) {
    const found: { name: FrCol; x: number }[] = []
    for (const cell of rows[i].cells) {
      const key = frKey(cell.str)
      const hit = FR_COL_RES.find(c => c.re.test(key))
      if (hit) found.push({ name: hit.name, x: cell.x })
    }
    const hasSku = found.some(c => c.name === 'sku')
    const hasQty = found.some(c => c.name === 'qty')
    if (!hasSku || !(hasQty || found.some(c => c.name === 'price'))) continue

    headerRowIdx = i
    cols.push(...found)

    // Headers wrap: "P.U." on one line, "HT" on the next — pick up what is still missing.
    for (let j = i + 1; j <= i + 2 && j < rows.length; j++) {
      for (const cell of rows[j].cells) {
        const key = frKey(cell.str)
        const hit = FR_COL_RES.find(c => c.re.test(key))
        if (hit && hit.name !== 'other' && !cols.some(c => c.name === hit.name)) {
          cols.push({ name: hit.name, x: cell.x })
        }
      }
    }
    break
  }

  if (headerRowIdx === -1) {
    throw new Error('Could not find the Sideways table header. Expected Référence, Quantité and P.U. HT columns.')
  }
  cols.sort((a, b) => a.x - b.x)

  // Assign by column boundaries (midpoints between header positions) rather than by
  // nearest header. Headers are centred while values are left- or right-aligned, so a
  // wide column like Désignation can sit far from its own header text.
  const bounds = cols.map((col, i) => ({
    name: col.name,
    lo: i === 0 ? -Infinity : (cols[i - 1].x + col.x) / 2,
    hi: i === cols.length - 1 ? Infinity : (col.x + cols[i + 1].x) / 2,
  }))

  const assignCol = (x: number): FrCol | null =>
    bounds.find(b => x >= b.lo && x < b.hi)?.name ?? null

  // ── Read the line items ──
  const items: ParsedItem[] = []
  let lastItemY = -Infinity

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row  = rows[i]
    const text = frKey(row.cells.map(c => c.str).join(' '))
    if (FR_STOP_RE.test(text)) break
    if (FR_SKIP_RE.test(text)) continue

    const vals: Partial<Record<FrCol, string>> = {}
    for (const cell of row.cells) {
      const col = assignCol(cell.x)
      if (col && col !== 'other') vals[col] = ((vals[col] ?? '') + ' ' + cell.str).trim()
    }

    // Sage prints a narrow Référence column and cuts long codes off with an ellipsis
    // ("SWCR/GA162..."). Keep the characters it did print and drop the dots — two codes
    // can truncate to the same string (SWW/17.3X1 is both the Al and the Mg wheel), so
    // the flag is what matters, not uniqueness.
    const rawSku = stripCJK((vals.sku ?? '').trim())
    const truncated = /\.{2,}$/.test(rawSku)
    const sku = truncated ? rawSku.replace(/\.+$/, '') : rawSku
    const qty = parseFrNum(vals.qty)

    if (!sku || !qty) {
      // Sage wraps a long Désignation onto its own row: description only, no other
      // column, directly under the line it belongs to. Fold it back in.
      const cont = (vals.desc ?? '').trim()
      if (items.length && cont && !sku && !vals.qty && !vals.price && row.y - lastItemY <= 40) {
        const prev = items[items.length - 1]
        prev.description = stripCJK(`${prev.description} ${cont}`.trim())
        lastItemY = row.y
      }
      continue
    }

    if (FR_COL_RES.some(c => c.re.test(frKey(sku)))) continue   // repeated header on page 2+

    const wp = parseFrNum(vals.price)
    items.push({
      id: `sw_${Date.now()}_${i}`,
      sku,
      description: stripCJK((vals.desc ?? '').trim()),
      qty,
      wholesalePrice: wp,
      estRetailZAR: calcEstRetail(wp, exchangeRate, costing.shippingMarkup, costing.markup, costing.includeVAT),
      skuTruncated: truncated,
    })
    lastItemY = row.y
  }

  return { invoiceNumber: findFrInvoiceNumber(rows), items }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InvoiceImportPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [suppliers, setSuppliers] = useState<SupplierContact[]>([])
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({})
  const [costing, setCosting] = useState<CostingSettings>({ shippingMarkup: 45, markup: 30, includeVAT: true })
  const [savedImports, setSavedImports] = useState<SavedImport[]>([])
  const [products, setProducts] = useState<ProductRef[]>([])
  /** Which SKU cell has the picker open, and where to draw it (fixed, so the table can't clip it). */
  const [skuPicker, setSkuPicker] = useState<{ id: string; top: number; left: number; width: number } | null>(null)
  const [loadingMeta, setLoadingMeta] = useState(true)

  const [supplier, setSupplier] = useState('')
  const [currency, setCurrency] = useState('CNY')

  const [fileName, setFileName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [items, setItems] = useState<ParsedItem[]>([])
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [detectedShipping, setDetectedShipping] = useState(0)  // in supplier currency
  const [parseError, setParseError] = useState('')
  const [parserUsed, setParserUsed] = useState<'generic' | 'sideways' | ''>('')
  const [parsing, setParsing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const exchangeRate = currency === 'ZAR' ? 1 : (exchangeRates[currency] || 0)
  const shippingZAR = detectedShipping * exchangeRate

  // Saved import for currently selected supplier
  const currentSaved = savedImports.find(s => s.supplierName === supplier) ?? null

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/supplier-contacts').then(r => r.json()).catch(() => []),
      fetch('/api/admin/exchange-rate').then(r => r.json()).catch(() => ({})),
      fetch('/api/admin/invoice-imports').then(r => r.json()).catch(() => []),
    ]).then(([sups, rates, imports]) => {
      setSuppliers(Array.isArray(sups) ? sups : [])
      if (rates?.rates) setExchangeRates(rates.rates)
      setSavedImports(Array.isArray(imports) ? imports : [])
    }).finally(() => setLoadingMeta(false))
  }, [])

  // The catalogue is several MB and is only needed once there are rows to match, so it
  // loads on its own rather than holding up the supplier list.
  useEffect(() => {
    fetch('/api/admin/products')
      .then(r => r.json())
      .then((prods: any[]) => setProducts(
        (Array.isArray(prods) ? prods : [])
          .map(p => ({ id: p.id, sku: p.sku || '', title: p.title || '', brand: p.brand || '' }))
          .filter((p: ProductRef) => p.sku),
      ))
      .catch(() => setProducts([]))
  }, [])

  // Recalc est. retail when rate/costing changes
  useEffect(() => {
    if (!items.length) return
    setItems(prev => prev.map(it => ({ ...it, estRetailZAR: calcEstRetail(it.wholesalePrice, exchangeRate, costing.shippingMarkup, costing.markup, costing.includeVAT) })))
  }, [exchangeRate, exchangeRates, currency, costing, supplier])

  const handleSupplierChange = (name: string) => {
    setSupplier(name)
    const sup = suppliers.find(s => s.name === name)
    if (sup?.preferredCurrency) setCurrency(sup.preferredCurrency)
  }

  const parseFile = useCallback(async (file: File) => {
    setParseError(''); setItems([]); setDetectedShipping(0); setInvoiceNumber(''); setParserUsed(''); setFileName(file.name)
    setParsing(true)
    try {
      // ── PDF branch ──
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const rows = await extractPdfRows(file)

        // Sideways ships French-language invoices with their own layout.
        if (/sideways/i.test(supplier) || looksFrench(rows)) {
          const result = parseSidewaysPdf(rows, currency === 'EUR' ? exchangeRate : (exchangeRates.EUR || 0), costing)
          if (!result.items.length) { setParseError('No line items found. Check the invoice has Référence, Quantité and P.U. HT columns.'); return }
          setParserUsed('sideways')
          if (currency !== 'EUR') setCurrency('EUR')   // Sideways invoices are priced in EUR
          setInvoiceNumber(result.invoiceNumber)
          setDetectedShipping(0)
          setItems(result.items)
          return
        }

        const result = parsePdfInvoice(rows, exchangeRate, costing)
        if (!result.items.length) { setParseError('No line items found in PDF. Ensure the invoice has Refer NO / SKU, Quantity, and Wholesale Price columns.'); return }
        setParserUsed('generic')
        setInvoiceNumber(result.invoiceNumber)
        setDetectedShipping(result.shippingAmount)
        setItems(result.items)
        return
      }

      // ── Excel / CSV branch ──
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(new Uint8Array(buf), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

      const header = detectHeader(rows)
      if (!header) { setParseError('Could not detect columns. File needs ITEM/SKU, QTY, MODEL/DESCRIPTION, and WHOLESALE PRICE headers.'); return }

      const shipping = detectShipping(rows, header.idx, header.price)
      setDetectedShipping(shipping)

      const parsed: ParsedItem[] = []
      for (let i = header.idx + 1; i < rows.length; i++) {
        const row = rows[i]
        const sku = stripCJK(String(row[header.sku] ?? '').trim())
        const qty = parseNum(row[header.qty])
        if (!sku || !qty) continue
        const cells = row.map((c: any) => String(c ?? '').toUpperCase().trim())
        if (cells.some((c: string) => SHIP_KEYS.some(k => c.includes(k)))) continue
        const wp   = header.price !== -1 ? parseNum(row[header.price]) : 0
        const desc = header.desc  !== -1 ? stripCJK(String(row[header.desc] ?? '').trim()) : ''
        parsed.push({ id: `imp_${Date.now()}_${i}`, sku, description: desc, qty, wholesalePrice: wp, estRetailZAR: calcEstRetail(wp, exchangeRate, costing.shippingMarkup, costing.markup, costing.includeVAT) })
      }

      if (!parsed.length) { setParseError('No line items found. Check SKU/ITEM and QTY columns have data.'); return }
      setParserUsed('generic')
      setItems(parsed)
    } catch (err: any) { setParseError(`Parse failed: ${err.message}`) }
    finally { setParsing(false) }
  }, [exchangeRate, costing])

  const buildSheet = (wsId: string, existingSheet?: any) => {
    const supplierName = supplier || 'Imported'
    const sheetName = invoiceNumber
      ? `${supplierName} — ${invoiceNumber}`
      : existingSheet?.name ?? `${supplierName} — ${new Date().toLocaleDateString('en-GB')}`
    return {
      ...(existingSheet ?? {}),
      id: wsId,
      name: sheetName,
      supplier: supplierName,
      date: existingSheet?.date ?? new Date().toISOString().slice(0, 10),
      archived: false,
      currency,
      exchangeRate,
      markupPct: costing.markup,
      shippingPct: costing.shippingMarkup,
      vatPct: costing.includeVAT ? 15 : 0,
      finalCurrency: 'ZAR',
      finalExRate: 1,
      finalShippingCost: shippingZAR,
      finalCustomsCost: existingSheet?.finalCustomsCost ?? 0,
      finalMarkupPct: costing.markup,
      finalVatPct: costing.includeVAT ? 15 : 0,
      invoiceNumber: invoiceNumber || existingSheet?.invoiceNumber || '',
      items: items.map(it => ({
        id: it.id, sku: it.sku, skuSearch: it.sku, description: it.description,
        unit: '', category: '', inStock: 0, retailPrice: 0, preOrderPrice: 0,
        qty: it.qty, wholesalePrice: it.wholesalePrice, retailOverride: '', sentToInventory: false,
      })),
    }
  }

  const saveImportRecord = async (wsId: string) => {
    const record: SavedImport = {
      id: `imp_${Date.now()}`,
      supplierName: supplier || 'Imported',
      currency, wsId,
      shippingAmount: detectedShipping,
      itemCount: items.length,
      totalQty: items.reduce((sum, i) => sum + i.qty, 0),
      fileName,
      invoiceNumber: invoiceNumber || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const res = await fetch('/api/admin/invoice-imports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) })
    // Every import is kept: prepend rather than replacing the supplier's previous row.
    if (res.ok) setSavedImports(prev => [record, ...prev])
  }

  const [deletingId, setDeletingId] = useState('')

  const handleDeleteImport = async (rec: SavedImport) => {
    const when = new Date(rec.createdAt).toLocaleDateString('en-ZA')
    if (!confirm(`Delete this import record?

${rec.supplierName}${rec.invoiceNumber ? ` · Invoice ${rec.invoiceNumber}` : ''} · ${when}

The worksheet it created is not affected.`)) return
    setDeletingId(rec.id)
    try {
      const res = await fetch(`/api/admin/invoice-imports?id=${encodeURIComponent(rec.id)}`, { method: 'DELETE' })
      if (res.ok) setSavedImports(prev => prev.filter(s => s.id !== rec.id))
    } finally {
      setDeletingId('')
    }
  }

  const handleCreate = async () => {
    if (!items.length) return
    setCreating(true); setCreateError('')
    try {
      const wsId = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const sheet = buildSheet(wsId)
      const res = await fetch('/api/admin/worksheets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sheet) })
      if (res.ok) {
        await saveImportRecord(wsId)
        router.push(`/admin/worksheet?id=${wsId}`)
      } else { setCreateError('Failed to create worksheet.') }
    } catch { setCreateError('Something went wrong.') }
    finally { setCreating(false) }
  }

  const handleUpdate = async () => {
    if (!items.length || !currentSaved) return
    setCreating(true); setCreateError('')
    try {
      // Fetch existing worksheet to preserve name, dates, customs etc.
      const allSheets = await fetch('/api/admin/worksheets').then(r => r.json()).catch(() => [])
      const existing = Array.isArray(allSheets) ? allSheets.find((s: any) => s.id === currentSaved.wsId) : null
      const sheet = buildSheet(currentSaved.wsId, existing)
      const res = await fetch('/api/admin/worksheets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sheet) })
      if (res.ok) {
        await saveImportRecord(currentSaved.wsId)
        router.push(`/admin/worksheet?id=${currentSaved.wsId}`)
      } else { setCreateError('Failed to update worksheet.') }
    } catch { setCreateError('Something went wrong.') }
    finally { setCreating(false) }
  }

  /**
   * Candidates for a (usually partial) reference. Prefix matches rank first — a truncated
   * Sideways ref like "SWW/17.3X1" is the front of the real code, so those are the closest.
   */
  const skuMatches = (value: string): ProductRef[] => {
    const q = value.trim().toLowerCase()
    if (!q) return []
    // Sideways writes the same code two ways: the invoice prints SWW/AS173x where the
    // catalogue has SWW/AS17.3X10MG. Compare punctuation-stripped as a second pass.
    const bare = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '')
    const qBare = bare(q)

    const starts: ProductRef[] = []
    const loose: ProductRef[] = []
    const rest: ProductRef[] = []
    for (const prod of products) {
      const sku = prod.sku.toLowerCase()
      if (sku.startsWith(q)) starts.push(prod)
      else if (qBare && bare(prod.sku).startsWith(qBare)) loose.push(prod)
      else if (sku.includes(q) || prod.title.toLowerCase().includes(q)) rest.push(prod)
    }
    return [...starts, ...loose, ...rest].slice(0, 12)
  }

  const openSkuPicker = (id: string, el: HTMLInputElement) => {
    const r = el.getBoundingClientRect()
    setSkuPicker({ id, top: r.bottom + 4, left: r.left, width: Math.max(r.width, 300) })
  }

  // The picker is fixed-positioned, so it has to close when the page moves under it.
  useEffect(() => {
    if (!skuPicker) return
    const close = () => setSkuPicker(null)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [skuPicker])

  // Sage prints a narrow Référence column and truncates long codes with an ellipsis
  // ("SWCR/GA162..."). The full code is not in the PDF at all — it has to be typed in.
  const truncatedSkus = items.filter(i => i.skuTruncated)

  const totalItems = items.reduce((s, i) => s + i.qty, 0)
  const totalWholesale = items.reduce((s, i) => s + i.wholesalePrice * i.qty, 0)
  const totalEstRetail = items.reduce((s, i) => s + i.estRetailZAR * i.qty, 0)

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin/worksheet" className="text-sm text-gray-400 hover:text-gray-600">← Worksheets</Link>
        <h1 className="text-2xl font-bold text-gray-900 font-play">Import Supplier Invoice</h1>
      </div>

      {/* Saved import banner */}
      {currentSaved && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="text-sm font-semibold text-blue-800">📋 Existing import — {currentSaved.supplierName}</span>
            <span className="text-xs text-blue-600 ml-3">{currentSaved.itemCount} items · {currentSaved.fileName}{currentSaved.invoiceNumber ? ` · Invoice #${currentSaved.invoiceNumber}` : ''} · Updated {new Date(currentSaved.updatedAt).toLocaleDateString('en-ZA')}</span>
          </div>
          <Link href={`/admin/worksheet?id=${currentSaved.wsId}`} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">
            Open Worksheet →
          </Link>
        </div>
      )}

      {/* Supplier + Costing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">1. Select Supplier</h2>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Supplier</label>
            {loadingMeta ? <div className="h-9 bg-gray-100 rounded-lg animate-pulse" /> : (
              <select value={supplier} onChange={e => handleSupplierChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                <option value="">— Select supplier —</option>
                {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Invoice Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                {['ZAR','CNY','USD','EUR','GBP','HKD','SGD','JPY','AUD','CAD'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Exchange Rate</label>
              <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
                {currency === 'ZAR' ? '1.00' : exchangeRate ? `1 ${currency} = R${exchangeRate.toFixed(2)}` : 'Rate unavailable'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Costing Settings</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Shipping %</label>
              <input type="number" min={0} value={costing.shippingMarkup}
                onChange={e => setCosting(c => ({ ...c, shippingMarkup: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Markup %</label>
              <input type="number" min={0} value={costing.markup}
                onChange={e => setCosting(c => ({ ...c, markup: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">VAT</label>
              <button onClick={() => setCosting(c => ({ ...c, includeVAT: !c.includeVAT }))}
                className={`w-full py-2 rounded-lg text-sm font-semibold border transition-colors ${costing.includeVAT ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                {costing.includeVAT ? '+15% VAT' : 'No VAT'}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400">Est. Retail = Wholesale × rate × (1+ship%) × (1+markup%){costing.includeVAT ? ' × 1.15' : ''}</p>
        </div>
      </div>

      {/* File Upload */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          2. {currentSaved ? 'Upload New Invoice to Update' : 'Upload Invoice File'}
        </h2>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.pdf" className="hidden"
          onChange={e => { if (e.target.files?.[0]) parseFile(e.target.files[0]) }} />
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) parseFile(f) }}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragging ? 'border-primary bg-red-50 scale-[1.01]' : 'border-gray-200 hover:border-primary hover:bg-gray-50'}`}
        >
          {parsing ? (
            <div><div className="text-3xl mb-2 animate-spin">⚙️</div><p className="font-semibold text-gray-600">Reading invoice…</p></div>
          ) : fileName ? (
            <div><div className="text-3xl mb-2">{fileName.endsWith('.pdf') ? '📋' : '📄'}</div><p className="font-semibold text-gray-800">{fileName}</p><p className="text-xs text-gray-400 mt-1">Click or drag to replace</p></div>
          ) : (
            <div><div className="text-3xl mb-2">📂</div><p className="font-semibold text-gray-600">Click or drag &amp; drop invoice file</p><p className="text-xs text-gray-400 mt-1">.pdf · .xlsx · .xls · .csv</p></div>
          )}
        </div>

        {/* Which parser ran */}
        {parserUsed === 'sideways' && (
          <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5 text-xs text-indigo-700 flex items-center gap-2 flex-wrap">
            <span className="font-semibold">🇫🇷 Sideways format</span>
            <span className="text-indigo-500">
              Read Référence → SKU, Quantité → Qty, P.U. HT → Wholesale (EUR), Facture N° → Invoice No.
            </span>
          </div>
        )}

        {/* Invoice number extracted from PDF */}
        {invoiceNumber && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-bold text-sm">🧾 Invoice No:</span>
              <input
                type="text"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                className="font-mono font-bold text-green-800 bg-transparent border-b border-green-300 focus:outline-none focus:border-green-500 text-sm"
              />
            </div>
            <span className="text-xs text-green-600">Auto-extracted · editable</span>
          </div>
        )}

        {parseError && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">⚠ {parseError}</div>}

        {/* Detected shipping */}
        {detectedShipping > 0 && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-sm font-semibold text-amber-800">🚢 Shipping detected: {currency} {detectedShipping.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</span>
              {exchangeRate > 0 && <span className="text-xs text-amber-600 ml-2">= {fmt(shippingZAR)} — will be set as Final Shipping Cost</span>}
            </div>
            <button onClick={() => setDetectedShipping(0)} className="text-xs text-amber-600 hover:underline">Remove</button>
          </div>
        )}
      </div>

      {/* Preview Table */}
      {items.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">3. Review — {items.length} Line Items · {totalItems} Units</h2>
              <p className="text-xs text-gray-400 mt-0.5">Edit inline. Remove rows with ✕.</p>
            </div>
            <div className="flex gap-4 text-xs text-gray-500">
              <span>Wholesale: <span className="font-semibold text-gray-800">{currency} {totalWholesale.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</span></span>
              <span>Est. Retail: <span className="font-semibold text-primary">{fmt(totalEstRetail)}</span></span>
            </div>
          </div>

          {truncatedSkus.length > 0 && (
            <div className="mx-5 mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
              <div className="font-semibold mb-1.5">
                ⚠ {truncatedSkus.length} SKU{truncatedSkus.length === 1 ? ' was' : 's were'} cut short by the supplier's PDF — partial reference only
              </div>
              <div className="text-amber-700 mb-2">
                Sage prints a narrow Référence column, so the rest of the code isn't in the file. Complete
                them here or in the worksheet. Two products can share the same partial reference, so use
                the description to tell them apart.
              </div>
              <ul className="space-y-0.5">
                {truncatedSkus.map(i => (
                  <li key={i.id} className="flex gap-2">
                    <span className="font-mono font-semibold shrink-0">{i.sku}</span>
                    <span className="text-amber-600 truncate">{i.description || '—'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-2 font-semibold">#</th>
                  <th className="text-left px-4 py-2 font-semibold">SKU</th>
                  <th className="text-left px-4 py-2 font-semibold">Description</th>
                  <th className="text-center px-4 py-2 font-semibold">Qty</th>
                  <th className="text-right px-4 py-2 font-semibold">Wholesale ({currency})</th>
                  <th className="text-right px-4 py-2 font-semibold">Est. Retail (ZAR)</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-2">
                      <input type="text" value={item.sku}
                        onChange={e => {
                          setItems(p => p.map(i => i.id === item.id ? { ...i, sku: e.target.value, skuTruncated: false } : i))
                          openSkuPicker(item.id, e.target)
                        }}
                        onFocus={e => openSkuPicker(item.id, e.target)}
                        onBlur={() => setSkuPicker(cur => cur?.id === item.id ? null : cur)}
                        title={item.skuTruncated ? 'Cut short by the supplier PDF — pick the matching product' : undefined}
                        className={`w-36 text-xs border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono ${item.skuTruncated ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="text" value={item.description}
                        onChange={e => setItems(p => p.map(i => i.id === item.id ? { ...i, description: e.target.value } : i))}
                        className="w-full min-w-[200px] text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input type="number" min={1} value={item.qty}
                        onChange={e => setItems(p => p.map(i => i.id === item.id ? { ...i, qty: Math.max(1, parseInt(e.target.value) || 1) } : i))}
                        className="w-14 text-xs border border-gray-200 rounded px-1 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input type="number" min={0} step={0.01} value={item.wholesalePrice}
                        onChange={e => {
                          const wp = parseFloat(e.target.value) || 0
                          setItems(p => p.map(i => i.id === item.id ? { ...i, wholesalePrice: wp, estRetailZAR: calcEstRetail(wp, exchangeRate, costing.shippingMarkup, costing.markup, costing.includeVAT) } : i))
                        }}
                        className="w-24 text-xs border border-gray-200 rounded px-1.5 py-0.5 text-right focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    </td>
                    <td className="px-4 py-2 text-right text-xs font-semibold text-primary">
                      {item.estRetailZAR > 0 ? fmt(item.estRetailZAR) : '—'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => setItems(p => p.filter(i => i.id !== item.id))} className="text-gray-300 hover:text-red-500 text-xs leading-none">✕</button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                  <td colSpan={3} className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wide">Total</td>
                  <td className="px-4 py-3 text-center text-sm text-gray-800">{totalItems} units</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-800">{currency} {totalWholesale.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</td>
                  <td className="px-4 py-3 text-right text-sm text-primary">{fmt(totalEstRetail)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Action bar */}
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-gray-400">
              {supplier ? `${supplier} · ${currency} @ R${exchangeRate.toFixed(2)}` : `${currency} @ R${exchangeRate.toFixed(2)}`}
              {detectedShipping > 0 && ` · Shipping: ${currency} ${detectedShipping} = ${fmt(shippingZAR)}`}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              {createError && <span className="text-xs text-red-600">{createError}</span>}
              {currentSaved ? (
                <>
                  <button onClick={handleCreate} disabled={creating}
                    className="px-4 py-2 border border-gray-300 text-gray-600 font-semibold rounded-xl text-sm hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    {creating ? '⏳ Saving…' : '+ New Worksheet'}
                  </button>
                  <button onClick={handleUpdate} disabled={creating}
                    className="px-6 py-2.5 bg-primary text-white font-semibold rounded-xl text-sm hover:bg-primary-dark disabled:opacity-40 transition-colors flex items-center gap-2">
                    {creating ? '⏳ Updating…' : `🔄 Update Worksheet (${items.length} items)`}
                  </button>
                </>
              ) : (
                <button onClick={handleCreate} disabled={creating}
                  className="px-6 py-2.5 bg-primary text-white font-semibold rounded-xl text-sm hover:bg-primary-dark disabled:opacity-40 transition-colors flex items-center gap-2">
                  {creating ? '⏳ Creating…' : `🧮 Import to Worksheet (${items.length} items)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import history */}
      {savedImports.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Import History ({savedImports.length})
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Saved automatically on every import. Deleting a record leaves its worksheet untouched.
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {savedImports.map(rec => (
              <div key={rec.id} className="px-5 py-3 flex items-center gap-4 flex-wrap hover:bg-gray-50 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-800 truncate">
                    {rec.supplierName}
                    {rec.invoiceNumber && <span className="ml-2 font-mono text-xs text-gray-500">#{rec.invoiceNumber}</span>}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {new Date(rec.createdAt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}
                    {' · '}{rec.itemCount} line{rec.itemCount === 1 ? '' : 's'}
                    {typeof rec.totalQty === 'number' && ` · ${rec.totalQty} units`}
                    {rec.fileName && ` · ${rec.fileName}`}
                  </div>
                </div>
                <Link href={`/admin/worksheet?id=${rec.wsId}`}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 font-semibold hover:bg-gray-100 whitespace-nowrap">
                  Worksheet →
                </Link>
                <button onClick={() => handleDeleteImport(rec)} disabled={deletingId === rec.id}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 font-semibold hover:bg-red-50 disabled:opacity-40 whitespace-nowrap">
                  {deletingId === rec.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SKU picker ──
          Fixed-positioned on purpose: the review table scrolls inside overflow-x-auto,
          which would clip a dropdown on the lower rows — exactly where the truncated
          Sideways refs land. */}
      {skuPicker && (() => {
        const row = items.find(i => i.id === skuPicker.id)
        if (!row) return null
        const matches = skuMatches(row.sku)
        return (
          <div
            style={{ top: skuPicker.top, left: skuPicker.left, width: skuPicker.width }}
            className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto py-1"
            onMouseDown={e => e.preventDefault()}
          >
            <div className="px-3 py-1.5 text-[11px] text-gray-400 border-b border-gray-100 truncate">
              {row.description || 'Pick the matching product'}
            </div>
            {matches.length === 0 ? (
              <div className="px-3 py-2.5 text-xs text-gray-400">
                No product matches <span className="font-mono">{row.sku}</span>
              </div>
            ) : matches.map(prod => (
              <button
                key={prod.id}
                type="button"
                onClick={() => {
                  // Take the catalogue's description with the SKU — the supplier's
                  // Désignation is their wording, not ours. Same as the worksheet picker.
                  setItems(p => p.map(i => i.id === row.id
                    ? { ...i, sku: prod.sku, description: prod.title || i.description, skuTruncated: false }
                    : i))
                  setSkuPicker(null)
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
              >
                <span className="font-mono font-semibold text-blue-700">{prod.sku}</span>
                <span className="ml-2 text-gray-600">{prod.title}</span>
                {prod.brand && <span className="ml-1 text-gray-400">· {prod.brand}</span>}
              </button>
            ))}
          </div>
        )
      })()}
    </div>
  )
}
