// Profit & Loss for Accounting → Profit.
//
// Sold goods are costed at LANDED cost: the line's `_costPrice` (the product's costPerItem captured
// when the line was added — the cost at the time of sale), falling back to the product's current
// costPerItem. The Worksheet writes costPerItem as Final Landed, so shipping and customs are
// already inside it and are never deducted again.
//
// A cost below SUSPECT_COST_RATIO of the selling price is treated as unreliable — on R66Slot that
// is almost always a supplier's EUR/USD price saved as Rand (e.g. Sideways at R3.22 on a R125
// part). Unreliable or missing costs are never guessed: the sale is reported as Uncosted and kept
// out of the margin, and the product is listed so its cost can be fixed.

export const SUSPECT_COST_RATIO = 0.15

export interface ProfitProduct {
  id: string
  sku?: string | null
  title?: string | null
  price?: number | null
  costPerItem?: number | null
  quantity?: number | null
  status?: string | null
}

export interface ProfitLineItem {
  qty: number
  unitPrice: number
  description: string
  _service?: boolean
  _costPrice?: number
}

export interface ProfitDoc {
  docNumber: string
  discountPct?: number
  lineItems: ProfitLineItem[]
}

export type CostIssue = 'missing' | 'suspect'

export interface CostGap {
  sku: string
  title: string
  issue: CostIssue
  cost: number
  price: number
  stockQty: number
  stockRetail: number
  soldQty: number
  soldRevenue: number
}

export interface ProfitSummary {
  /** Goods sold with a reliable landed cost. */
  sales: number
  cogs: number
  grossProfit: number
  margin: number
  units: number
  /** Goods sold whose landed cost is missing or suspect — revenue only, no profit claimed. */
  uncostedSales: number
  uncostedUnits: number
  /** Service lines (setup, tyre truing …) — labour, not stock. */
  serviceSales: number
  /** Stock on hand at landed cost (reliable costs only). */
  stockValue: number
  stockRetail: number
  stockUnits: number
  stockSkus: number
  /** Stock on hand whose cost is missing or suspect — retail value shown, landed unknown. */
  uncostedStockUnits: number
  uncostedStockRetail: number
  gaps: CostGap[]
}

const num = (v: unknown) => Number(v) || 0
const skuKey = (s: unknown) => String(s ?? '').trim().toLowerCase()

export function skuFromDescription(desc: unknown): string {
  return String(desc ?? '').split(' – ')[0].trim()
}

function isService(li: ProfitLineItem): boolean {
  return !!li._service || /^services\s*-/i.test(String(li.description || '').trim())
}

/** A landed cost is usable when it is positive and not implausibly far below the selling price. */
export function costIssue(cost: number, price: number): CostIssue | null {
  if (!(cost > 0)) return 'missing'
  if (price > 0 && cost / price < SUSPECT_COST_RATIO) return 'suspect'
  return null
}

export function computeProfit(docs: ProfitDoc[], products: ProfitProduct[]): ProfitSummary {
  const bySku = new Map<string, ProfitProduct>()
  for (const p of products) if (p.sku) bySku.set(skuKey(p.sku), p)

  const gaps = new Map<string, CostGap>()
  const gapFor = (sku: string, p: ProfitProduct | undefined, issue: CostIssue, cost: number, price: number) => {
    const key = skuKey(sku) || '(no sku)'
    let g = gaps.get(key)
    if (!g) {
      g = { sku: sku || '(no SKU)', title: p?.title || '', issue, cost, price, stockQty: 0, stockRetail: 0, soldQty: 0, soldRevenue: 0 }
      gaps.set(key, g)
    }
    return g
  }

  let sales = 0, cogs = 0, units = 0, uncostedSales = 0, uncostedUnits = 0, serviceSales = 0

  for (const doc of docs) {
    const disc = 1 - num(doc.discountPct) / 100
    for (const li of doc.lineItems || []) {
      const qty = num(li.qty)
      const revenue = qty * num(li.unitPrice) * disc
      if (isService(li)) { serviceSales += revenue; continue }
      if (qty === 0 && revenue === 0) continue

      const sku = skuFromDescription(li.description)
      const product = bySku.get(skuKey(sku))
      const snapshot = num(li._costPrice)
      const cost = snapshot > 0 ? snapshot : num(product?.costPerItem)
      const issue = costIssue(cost, num(li.unitPrice))

      if (issue) {
        uncostedSales += revenue
        uncostedUnits += qty
        const g = gapFor(sku, product, issue, cost, num(product?.price) || num(li.unitPrice))
        g.soldQty += qty
        g.soldRevenue += revenue
        continue
      }
      sales += revenue
      cogs += qty * cost
      units += qty
    }
  }

  let stockValue = 0, stockRetail = 0, stockUnits = 0, stockSkus = 0, uncostedStockUnits = 0, uncostedStockRetail = 0
  for (const p of products) {
    const qty = num(p.quantity)
    if (qty <= 0) continue
    const price = num(p.price)
    const cost = num(p.costPerItem)
    const issue = costIssue(cost, price)
    if (issue) {
      uncostedStockUnits += qty
      uncostedStockRetail += qty * price
      const g = gapFor(p.sku || '', p, issue, cost, price)
      g.stockQty += qty
      g.stockRetail += qty * price
      continue
    }
    stockValue += qty * cost
    stockRetail += qty * price
    stockUnits += qty
    stockSkus++
  }

  const grossProfit = sales - cogs
  return {
    sales, cogs, grossProfit, margin: sales > 0 ? grossProfit / sales : 0, units,
    uncostedSales, uncostedUnits, serviceSales,
    stockValue, stockRetail, stockUnits, stockSkus, uncostedStockUnits, uncostedStockRetail,
    gaps: Array.from(gaps.values()).sort((a, b) => (b.soldRevenue + b.stockRetail) - (a.soldRevenue + a.stockRetail)),
  }
}
