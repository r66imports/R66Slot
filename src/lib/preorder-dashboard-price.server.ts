import { db } from '@/lib/db'
import { getRates } from '@/lib/exchange-rates'
import { calcRetailPrice, type CostingPcts } from '@/lib/preorder-dashboard-price'

/**
 * Server-only half of the Pre-Order Dashboard costing. Splitting this out keeps
 * the arithmetic importable from the dashboard page, which is a client
 * component: `pg` reached the browser bundle when the two lived together and
 * the build failed on `net` and `tls`, which a `tsc --noEmit` does not catch.
 *
 * Never import this from a component marked 'use client'.
 */

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
}

export interface PriceableCard extends CostingPcts {
  sku?: string | null
  wholesalePrice?: string | null
  wholesaleCurrency?: string | null
  estimatedRetailPrice?: string | null
  priceManual?: boolean | null
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

    if (card.priceManual) {
      out.set(card, {
        estimatedRetailPrice: stored,
        priceSource: 'manual',
        priceFloating: false,
      })
      continue
    }

    const live = calcRetailPrice(card.wholesalePrice, card.wholesaleCurrency, rates, card)
    if (live) {
      out.set(card, {
        estimatedRetailPrice: live,
        priceSource: 'live',
        priceFloating: true,
      })
      continue
    }

    // Only reached when there is no wholesale price to float on. A landed SKU
    // then falls back to the settled figure the Worksheet wrote, because the
    // alternative is showing nothing at all.
    const settled = landed.get(skuKey(card.sku))
    if (settled && settled > 0) {
      out.set(card, {
        estimatedRetailPrice: settled.toFixed(2),
        priceSource: 'landed',
        priceFloating: false,
      })
      continue
    }

    out.set(card, {
      estimatedRetailPrice: stored,
      priceSource: 'stored',
      priceFloating: false,
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
