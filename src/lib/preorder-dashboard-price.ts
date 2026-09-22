import { db } from '@/lib/db'
import { getRates } from '@/lib/exchange-rates'

/**
 * Pre-Order Dashboard costing.
 *
 * One formula, with the percentages living on the item rather than in code:
 *
 *   wholesale x rate                        = cost   (ZAR)
 *   cost x (1 + (ship% + customs%)/100)     = landed (ZAR)
 *   landed x (1 + markup%) x (1 + vat%)     = Est. Retail
 *
 * Defaults are 25 shipping / 20 customs / 30 markup / 15 VAT — the normal
 * calculation. A supplier with genuinely different freight is handled by typing
 * different percentages on that item, never by adding a per-supplier branch.
 *
 * This replaces a hard-coded 20% "shippingMarkup" that came from a useState
 * default on the dashboard page. It was meant to be fed by
 * /api/admin/costing-settings, a route that was never built, so the fetch 404'd
 * and the placeholder stood: every pre-order was quoted with no customs in it.
 *
 * Site Rule 63: an estimate is never a stored number. It is derived on every
 * read from the wholesale price times the live rate, and it moves as the rate
 * moves — until the Worksheet lands the shipment, at which point the product
 * card's own pre-order price is the settled figure and stops moving.
 */

export const DEFAULT_SHIP_PCT = 25
export const DEFAULT_CUSTOMS_PCT = 20
export const DEFAULT_MARKUP_PCT = 30
export const DEFAULT_VAT_PCT = 15

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

// ── Server-side pricing of stored cards ──────────────────────────────────────

export type PriceSource =
  /** wholesale x today's rate — floats */
  | 'live'
  /** the Worksheet has landed it; the product card's pre-order price is final */
  | 'landed'
  /** the admin switched the card to Manual and typed a figure */
  | 'manual'
  /** nothing to derive from; the stored string is all we have */
  | 'stored'

export interface PricedCard {
  estimatedRetailPrice: string
  priceSource: PriceSource
  priceFloating: boolean
  /**
   * Tier 2, where the card has one. The buy price differs, the cost structure
   * does not, so it floats on the same percentages as tier 1.
   */
  estimatedRetailPrice2?: string
}

export interface PriceableCard extends CostingPcts {
  sku?: string | null
  wholesalePrice?: string | null
  wholesaleCurrency?: string | null
  estimatedRetailPrice?: string | null
  priceManual?: boolean | null
  wholesalePrice2?: string | null
  wholesaleCurrency2?: string | null
  estimatedRetailPrice2?: string | null
}

const skuKey = (s: string | null | undefined) => (s || '').trim().toUpperCase()

/**
 * A SKU the Worksheet has landed: cost_per_item is the real Rand cost and is
 * only ever written when goods actually arrive, so its presence means settled.
 * The figure to show from then on is the product card's own pre-order price,
 * which is what the Worksheet import wrote there.
 */
async function loadLanded(skus: string[]): Promise<Map<string, number>> {
  const landed = new Map<string, number>()
  const wanted = Array.from(new Set(skus.filter(Boolean)))
  if (wanted.length === 0) return landed
  try {
    const res = await db.query(
      `SELECT UPPER(TRIM(sku)) AS sku, cost_per_item, pre_order_price
         FROM products
        WHERE UPPER(TRIM(sku)) = ANY($1::text[])
          AND cost_per_item IS NOT NULL
          AND cost_per_item > 0`,
      [wanted]
    )
    for (const row of res.rows) {
      const settled = parseFloat(row.pre_order_price) || 0
      if (settled > 0) landed.set(row.sku, settled)
    }
  } catch (err: any) {
    // A products lookup that fails must not blank the dashboard — every card
    // simply keeps floating, which is the pre-landing behaviour anyway.
    console.error('[preorder-price] landed lookup failed:', err?.message)
  }
  return landed
}

/**
 * Price a batch of dashboard cards in one pass: one rate read (hour-cached) and
 * one products query for the whole list, rather than per card.
 *
 * Never throws. If rates are unavailable every card falls back to its stored
 * string, so a dead FX API can stall prices but can never blank them.
 */
export async function priceCards<T extends PriceableCard>(
  cards: T[]
): Promise<Map<T, PricedCard>> {
  const out = new Map<T, PricedCard>()
  if (cards.length === 0) return out

  let rates: Record<string, number> = {}
  try {
    rates = (await getRates()).rates
  } catch (err: any) {
    console.error('[preorder-price] rates unavailable, serving stored prices:', err?.message)
  }

  const landed = await loadLanded(cards.map((c) => skuKey(c.sku)))

  for (const card of cards) {
    const stored = (card.estimatedRetailPrice || '').trim()
    const stored2 = (card.estimatedRetailPrice2 || '').trim()

    // Tier 2 rides on the same percentages; only a frozen tier 1 freezes it.
    const live2 = calcRetailPrice(card.wholesalePrice2, card.wholesaleCurrency2, rates, card)
    const tier2 = (frozen: boolean) => (frozen || !live2 ? stored2 : live2)

    const settled = landed.get(skuKey(card.sku))
    if (settled && settled > 0) {
      out.set(card, {
        estimatedRetailPrice: settled.toFixed(2),
        priceSource: 'landed',
        priceFloating: false,
        estimatedRetailPrice2: tier2(true),
      })
      continue
    }

    if (card.priceManual) {
      out.set(card, {
        estimatedRetailPrice: stored,
        priceSource: 'manual',
        priceFloating: false,
        estimatedRetailPrice2: tier2(true),
      })
      continue
    }

    const live = calcRetailPrice(card.wholesalePrice, card.wholesaleCurrency, rates, card)
    if (live) {
      out.set(card, {
        estimatedRetailPrice: live,
        priceSource: 'live',
        priceFloating: true,
        estimatedRetailPrice2: tier2(false),
      })
      continue
    }

    out.set(card, {
      estimatedRetailPrice: stored,
      priceSource: 'stored',
      priceFloating: false,
      estimatedRetailPrice2: tier2(false),
    })
  }

  return out
}

/** priceCards for a single card. */
export async function priceCard<T extends PriceableCard>(card: T): Promise<PricedCard> {
  const m = await priceCards([card])
  return (
    m.get(card) || {
      estimatedRetailPrice: (card.estimatedRetailPrice || '').trim(),
      priceSource: 'stored',
      priceFloating: false,
    }
  )
}
