/**
 * Pre-Order Dashboard costing.
 *
 * One formula, with the percentages living on the item rather than in code:
 *
 *   wholesale x rate                        = cost   (ZAR)
 *   cost x (1 + (ship% + customs%)/100)     = landed (ZAR)
 *   landed x (1 + markup%) x (1 + vat%)     = Est. Retail
 *
 * Defaults are 25 shipping / 20 customs / 30 markup / 0 VAT — the normal
 * calculation. Pre-order estimates are quoted without VAT. A supplier with genuinely different freight is handled by typing
 * different percentages on that item, never by adding a per-supplier branch.
 *
 * This replaces a hard-coded 20% "shippingMarkup" that came from a useState
 * default on the dashboard page. It was meant to be fed by
 * /api/admin/costing-settings, a route that was never built, so the fetch 404'd
 * and the placeholder stood: every pre-order was quoted with no customs in it.
 *
 * This half is PURE ARITHMETIC and no more: it is imported by the dashboard
 * page, which is a client component, so it must never reach for the database,
 * the blob store or the rate cache. Anything needing those lives in
 * preorder-dashboard-price.server.ts — pulling pg into this module put `net`
 * and `tls` in the browser bundle and failed the build with a green tsc.
 *
 * Site Rule 63: an estimate is never a stored number. It is derived on every
 * read from the wholesale price times the live rate, and it keeps moving as the
 * rate moves — landed or not, because it answers "what would the next shipment
 * cost". The settled historical figure lives separately on the product, as
 * worksheet_est_retail, written by the Worksheet and frozen at that sheet's rate.
 */

export const DEFAULT_SHIP_PCT = 25
export const DEFAULT_CUSTOMS_PCT = 20
export const DEFAULT_MARKUP_PCT = 30
/**
 * Zero, deliberately. A pre-order estimate on R66Slot is quoted WITHOUT VAT
 * (user, 22 Sept 2026) — the same as R66Emporium, whose pre-order costing has
 * no VAT step at all. The field is kept editable rather than removed so a one
 * off item can carry VAT without a deploy, but the standard is 0 and an item
 * with VAT on it renders amber like any other off-standard figure.
 */
export const DEFAULT_VAT_PCT = 0

/** Per-item percentages. Absent means "use the default", so nothing needed migrating. */
export interface CostingPcts {
  shipPct?: number | null
  customsPct?: number | null
  markupPct?: number | null
  vatPct?: number | null
}

export interface ResolvedPcts {
  ship: number
  customs: number
  markup: number
  vat: number
}

const pct = (v: number | null | undefined, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback

export function resolvePcts(item: CostingPcts): ResolvedPcts {
  return {
    ship: pct(item.shipPct, DEFAULT_SHIP_PCT),
    customs: pct(item.customsPct, DEFAULT_CUSTOMS_PCT),
    markup: pct(item.markupPct, DEFAULT_MARKUP_PCT),
    vat: pct(item.vatPct, DEFAULT_VAT_PCT),
  }
}

export function isDefaultPcts(p: ResolvedPcts): boolean {
  return (
    p.ship === DEFAULT_SHIP_PCT &&
    p.customs === DEFAULT_CUSTOMS_PCT &&
    p.markup === DEFAULT_MARKUP_PCT &&
    p.vat === DEFAULT_VAT_PCT
  )
}

export function parsePrice(s: string | number | null | undefined): number {
  if (typeof s === 'number') return Number.isFinite(s) ? s : 0
  const n = parseFloat((s || '').toString().replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

export interface Costing {
  /** wholesale x rate */
  cost: number
  /** cost + shipping + customs */
  landed: number
  /** landed + markup + VAT — the number shown */
  retail: number
  rate: number
  pcts: ResolvedPcts
}

/**
 * The full working for one item. Returns null when there is nothing to price
 * from — no wholesale figure, or no rate for its currency — so the caller can
 * fall back rather than publish a zero.
 */
export function calcCosting(
  wholesalePrice: string | number | null | undefined,
  currency: string | null | undefined,
  rates: Record<string, number>,
  item: CostingPcts = {}
): Costing | null {
  const price = parsePrice(wholesalePrice)
  const ccy = (currency || '').trim().toUpperCase()
  if (!price || !ccy) return null
  const rate = ccy === 'ZAR' ? 1 : rates[ccy] || 0
  if (!rate) return null

  const pcts = resolvePcts(item)
  const cost = price * rate
  const landed = cost * (1 + (pcts.ship + pcts.customs) / 100)
  const retail = landed * (1 + pcts.markup / 100) * (1 + pcts.vat / 100)
  return { cost, landed, retail, rate, pcts }
}

/** Est. Retail as the dashboard shows it, or '' when it cannot be worked out. */
export function calcRetailPrice(
  wholesalePrice: string | number | null | undefined,
  currency: string | null | undefined,
  rates: Record<string, number>,
  item: CostingPcts = {}
): string {
  const c = calcCosting(wholesalePrice, currency, rates, item)
  return c ? c.retail.toFixed(2) : ''
}
