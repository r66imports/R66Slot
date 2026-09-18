/**
 * Parsers for bringing a supplier's price list into the Supplier Catalogue.
 *
 * Only three things are ever extracted — SKU, description and wholesale price.
 * Currency is not read from the file: it comes from the supplier contact, with a
 * custom override on the import panel, because a sheet that states its currency
 * at all usually states it once in a header nobody parses reliably.
 *
 * Every parser is a best guess offered for review. Nothing imports without the
 * preview being confirmed, which is what makes the heuristics acceptable.
 */

export interface PdfCell {
  str: string
  x: number
}
export interface PdfRow {
  y: number
  cells: PdfCell[]
}

export interface ParsedRow {
  sku: string
  description: string
  wholesalePrice: number
  /** Why a row was flagged, so the preview can point at what needs a human. */
  warning?: string
}

/**
 * Text cells from a PDF, clustered into visual rows by Y coordinate.
 * Shared with the Import Invoice page — the two must not drift apart.
 */
export async function extractPdfRows(file: File): Promise<PdfRow[]> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()

  const buf = await file.arrayBuffer()
  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise

  // Absolute (x, y) for every text cell, y = 0 at the top of page 1.
  const allCells: { str: string; x: number; y: number }[] = []
  let yOffset = 0
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum)
    const vp = page.getViewport({ scale: 1 })
    const tc = await page.getTextContent()
    for (const item of tc.items as any[]) {
      if (!item.str?.trim()) continue
      allCells.push({
        str: item.str.trim(),
        x: Math.round(item.transform[4]),
        y: Math.round(yOffset + vp.height - item.transform[5]),
      })
    }
    yOffset += Math.round(vp.height) + 30
  }

  // Cluster into rows by Y (6pt tolerance).
  allCells.sort((a, b) => a.y - b.y || a.x - b.x)
  const rows: PdfRow[] = []
  for (const cell of allCells) {
    const last = rows[rows.length - 1]
    if (last && Math.abs(cell.y - last.y) <= 6) {
      last.cells.push({ str: cell.str, x: cell.x })
    } else {
      rows.push({ y: cell.y, cells: [{ str: cell.str, x: cell.x }] })
    }
  }
  rows.forEach((r) => r.cells.sort((a, b) => a.x - b.x))
  return rows
}

/**
 * Money from a supplier sheet, in whichever convention it uses:
 * "1,234.56" · "1.234,56" · "1 234,56" · "€ 12,50" · "12.50 EUR".
 * Returns NaN when the token is not a number at all.
 */
export function parseMoney(raw: string): number {
  if (raw === null || raw === undefined) return NaN
  let s = String(raw).trim()
  if (!s) return NaN
  // Strip currency symbols, codes and spaces, keep digits and separators.
  s = s.replace(/[^\d.,\-]/g, '')
  if (!s || !/\d/.test(s)) return NaN

  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')

  if (lastComma > -1 && lastDot > -1) {
    // Whichever separator comes last is the decimal one.
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
  } else if (lastComma > -1) {
    // A lone comma is decimal ("12,50") unless it groups thousands ("1,234").
    const after = s.length - lastComma - 1
    s = after === 3 && /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.')
  }

  const n = parseFloat(s)
  return Number.isFinite(n) ? n : NaN
}

/** Looks like a product code: has a digit, no spaces, not pure money. */
export function looksLikeSku(token: string): boolean {
  const t = (token || '').trim()
  if (t.length < 3 || t.length > 40) return false
  if (/\s/.test(t)) return false
  if (!/\d/.test(t)) return false
  if (/^[\d.,]+$/.test(t)) return false // a bare number is a price or a qty
  return /^[A-Za-z0-9][A-Za-z0-9\-_./]*$/.test(t)
}

const SKU_HEADERS = ['sku', 'code', 'ref', 'reference', 'article', 'art', 'part', 'item', 'model', 'codigo', 'référence', 'referencia']
const DESC_HEADERS = ['description', 'desc', 'name', 'title', 'product', 'designation', 'désignation', 'descripcion', 'descrizione', 'artikel']
const PRICE_HEADERS = ['wholesale', 'price', 'cost', 'net', 'trade', 'dealer', 'pvp', 'prix', 'precio', 'prezzo', 'tarif', 'unit price', 'list']

const matches = (header: string, candidates: string[]) => {
  const h = header.trim().toLowerCase()
  if (!h) return false
  return candidates.some((c) => h === c || h.includes(c))
}

export interface ColumnMap {
  sku: number
  description: number
  wholesalePrice: number
  /** Row index the headers were found on; data starts after it. */
  headerRow: number
}

/**
 * Guess which columns hold SKU, description and price.
 *
 * Header names first. Failing that — plenty of supplier sheets have no headers —
 * fall back to shape: the column whose cells most look like SKUs, the widest
 * text column, and the most consistently numeric column.
 */
export function detectColumns(rows: string[][]): ColumnMap {
  const scan = Math.min(rows.length, 20)
  for (let r = 0; r < scan; r++) {
    const row = rows[r] || []
    let sku = -1
    let desc = -1
    let price = -1
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] ?? '')
      if (sku < 0 && matches(cell, SKU_HEADERS)) sku = c
      else if (desc < 0 && matches(cell, DESC_HEADERS)) desc = c
      else if (price < 0 && matches(cell, PRICE_HEADERS)) price = c
    }
    if (sku >= 0 && price >= 0) {
      return { sku, description: desc >= 0 ? desc : -1, wholesalePrice: price, headerRow: r }
    }
  }

  // No usable header — infer from the data's shape.
  const width = rows.reduce((m, r) => Math.max(m, r.length), 0)
  const sample = rows.slice(0, 200)
  let skuCol = -1
  let descCol = -1
  let priceCol = -1
  let bestSku = 0
  let bestDesc = 0
  let bestPrice = 0

  for (let c = 0; c < width; c++) {
    let skuHits = 0
    let priceHits = 0
    let textLen = 0
    let seen = 0
    for (const row of sample) {
      const v = String(row[c] ?? '').trim()
      if (!v) continue
      seen++
      if (looksLikeSku(v)) skuHits++
      if (Number.isFinite(parseMoney(v))) priceHits++
      if (/[A-Za-z]/.test(v)) textLen += v.length
    }
    if (seen === 0) continue
    const skuScore = skuHits / seen
    const priceScore = priceHits / seen
    const descScore = textLen / seen
    if (skuScore > bestSku && skuScore > 0.5) {
      bestSku = skuScore
      skuCol = c
    }
    if (priceScore > bestPrice && priceScore > 0.6) {
      bestPrice = priceScore
      priceCol = c
    }
    if (descScore > bestDesc && descScore > 8) {
      bestDesc = descScore
      descCol = c
    }
  }

  // The SKU column often also parses as numeric; don't let it double as price.
  if (priceCol === skuCol) priceCol = -1
  if (descCol === skuCol) descCol = -1

  return { sku: skuCol, description: descCol, wholesalePrice: priceCol, headerRow: -1 }
}

/** Apply a column map to raw grid rows. */
export function rowsToParsed(rows: string[][], map: ColumnMap): ParsedRow[] {
  const out: ParsedRow[] = []
  const start = map.headerRow >= 0 ? map.headerRow + 1 : 0

  for (let r = start; r < rows.length; r++) {
    const row = rows[r] || []
    const sku = map.sku >= 0 ? String(row[map.sku] ?? '').trim() : ''
    if (!sku) continue

    const description = map.description >= 0 ? String(row[map.description] ?? '').trim() : ''
    const priceRaw = map.wholesalePrice >= 0 ? String(row[map.wholesalePrice] ?? '') : ''
    const price = parseMoney(priceRaw)

    // Skip anything that reads as a section heading or a totals line rather
    // than a product — they are common mid-table and import as junk SKUs.
    if (/^(total|subtotal|sous-total|sum|page)\b/i.test(sku)) continue

    out.push({
      sku: sku.toUpperCase(),
      description,
      wholesalePrice: Number.isFinite(price) ? price : 0,
      warning: !Number.isFinite(price)
        ? priceRaw.trim()
          ? `Could not read price "${priceRaw.trim()}"`
          : 'No price'
        : undefined,
    })
  }
  return out
}

/** CSV/TSV text into a grid, honouring quoted fields and embedded newlines. */
export function parseDelimited(text: string, delimiter?: string): string[][] {
  const head = text.slice(0, 5000)
  const d =
    delimiter ||
    (head.split('\t').length > head.split(',').length
      ? '\t'
      : head.split(';').length > head.split(',').length
        ? ';'
        : ',')

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += ch
      continue
    }
    if (ch === '"') inQuotes = true
    else if (ch === d) {
      row.push(field)
      field = ''
    } else if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (ch !== '\r') field += ch
  }
  if (field || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => String(c).trim()))
}

/**
 * PDF rows into SKU / description / price.
 *
 * A product line is taken as: one token that looks like a SKU, one that parses
 * as money (the rightmost, since price columns sit right and a trailing total
 * is more likely to be the price than a leading code), and whatever text sits
 * between them as the description.
 */
export function parsePdfCatalogue(rows: PdfRow[]): ParsedRow[] {
  const out: ParsedRow[] = []

  for (const row of rows) {
    const cells = row.cells
    if (cells.length < 2) continue

    const skuIdx = cells.findIndex((c) => looksLikeSku(c.str))
    if (skuIdx < 0) continue

    let priceIdx = -1
    for (let i = cells.length - 1; i > skuIdx; i--) {
      const v = parseMoney(cells[i].str)
      // Require a decimal-looking figure; bare integers are usually quantities.
      if (Number.isFinite(v) && v > 0 && /[.,]\d{1,2}\s*$/.test(cells[i].str.trim())) {
        priceIdx = i
        break
      }
    }

    const sku = cells[skuIdx].str.toUpperCase()
    if (/^(total|subtotal|sous-total|page)\b/i.test(sku)) continue

    const descCells = cells.slice(skuIdx + 1, priceIdx > -1 ? priceIdx : undefined)
    const description = descCells
      .map((c) => c.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    out.push({
      sku,
      description,
      wholesalePrice: priceIdx > -1 ? parseMoney(cells[priceIdx].str) : 0,
      warning: priceIdx < 0 ? 'No price found on this line' : undefined,
    })
  }

  return out
}

/**
 * A Google Sheets URL turned into its CSV export.
 * Returns null when the URL is not a Sheets link.
 */
export function googleSheetCsvUrl(url: string): string | null {
  const m = /docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9-_]+)/.exec(url || '')
  if (!m) return null
  const id = m[1]
  const gidMatch = /[#&?]gid=(\d+)/.exec(url)
  const gid = gidMatch ? gidMatch[1] : '0'
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`
}
