import { blobRead } from '@/lib/blob-storage'
import { getRates, rateFor } from '@/lib/exchange-rates'
import { accountById, calcEstRetailZAR, DEFAULT_COSTING_ACCOUNTS } from '@/lib/preorder-pricing'
import type { CostingAccount } from '@/types/supplier-preorder'
import type { SupplierContact } from '@/app/api/admin/supplier-contacts/route'
import type { PricelistEntry } from '@/app/api/admin/inventory-pricelists/route'

/**
 * The one place a Book Now / pre-order estimate is worked out.
 *
 * Site Rule 63: an estimate is never a stored number. It is derived on every
 * read from the supplier's wholesale price in the supplier's own currency times
 * the live exchange rate, and it moves as the rate moves. Inventory, the
 * Pre-Order Dashboard, the booking widget and the client Supplier Pre Order
 * sheet all price through here so they cannot disagree with each other.
 *
 * Two deliberate rules, both the user's call:
 *
 *  - The rate always wins. A hand-typed Book Now price is ignored wherever a
 *    wholesale price exists, because a typed figure stops floating the moment it
 *    is saved and is stale by the next rate change.
 *
 *  - It floats until the shipment lands, then locks. `costPerItem` is the real
 *    landed Rand cost and is only ever written by the Worksheet when goods
 *    actually arrive, so a SKU carrying one has landed: its price is a
 *    historical fact and must stop moving. Everything still on order keeps
 *    floating, including bookings already taken.
 */

export type EstimateSource =
  /** wholesale x live rate x costing account — floats */
  | 'live'
  /** landed cost exists, so the price is settled and no longer moves */
  | 'landed'
  /** no wholesale price known; the stored figure is all we have */
  | 'stored'

export interface PreOrderEstimate {
  sku: string
  /** ZAR. The number to show. */
  estimateZAR: number
  source: EstimateSource
  /** True while the figure still moves with the rate. */
  floating: boolean
  /** Supplier-currency inputs, for showing the working. Admin-only. */
  wholesalePrice: number
  currency: string
  exRate: number
  accountId: string
}

export interface EstimateContext {
  byKey: Map<string, { wholesalePrice: number; currency: string; supplierId: string }>
  suppliers: SupplierContact[]
  supplierById: Map<string, SupplierContact>
  accounts: CostingAccount[]
  rates: Record<string, number>
  rateFetchedAt: string
}

const upper = (s: string) => (s || '').trim().toUpperCase()

/**
 * Load everything the estimates need once, so a list of 4 000 products costs
 * one set of reads rather than one per row.
 */
export async function loadEstimateContext(): Promise<EstimateContext> {
  const [pricelists, suppliers, savedAccounts, rateData] = await Promise.all([
    blobRead<PricelistEntry[]>('data/inventory-pricelists.json', []),
    blobRead<SupplierContact[]>('data/supplier-contacts.json', []),
    blobRead<CostingAccount[]>('data/costing-accounts.json', []),
    getRates(),
  ])

  const supplierById = new Map(suppliers.map((s) => [s.id, s]))

  // Keyed by SKU. Where a SKU appears under several suppliers, prefer the entry
  // that actually carries a price and a currency — an empty duplicate must not
  // shadow a usable one.
  const byKey = new Map<string, { wholesalePrice: number; currency: string; supplierId: string }>()
  for (const e of pricelists) {
    const sku = upper(e.sku)
    if (!sku) continue
    const price = Number(e.wholesalePrice) || 0
    const currency = (
      e.currency || supplierById.get(e.supplierId)?.preferredCurrency || ''
    ).toUpperCase()
    const existing = byKey.get(sku)
    const better = !existing || (existing.wholesalePrice <= 0 && price > 0) || (!existing.currency && !!currency)
    if (better) byKey.set(sku, { wholesalePrice: price, currency, supplierId: e.supplierId })
  }

  return {
    byKey,
    suppliers,
    supplierById,
    accounts: savedAccounts.length > 0 ? savedAccounts : DEFAULT_COSTING_ACCOUNTS,
    rates: rateData.rates,
    rateFetchedAt: rateData.fetchedAt,
  }
}

/**
 * The estimate for one product.
 *
 * `storedPreOrderPrice` is only reached when there is no wholesale price to
 * work from — it is a fallback, never an override.
 */
export function estimateFor(
  ctx: EstimateContext,
  product: {
    sku?: string | null
    preOrderPrice?: number | string | null
    costPerItem?: number | string | null
    supplier?: string | null
  }
): PreOrderEstimate {
  const sku = upper(product.sku || '')
  const stored = Number(product.preOrderPrice) || 0
  const landedCost = Number(product.costPerItem) || 0
  const entry = ctx.byKey.get(sku)

  const supplier =
    (entry ? ctx.supplierById.get(entry.supplierId) : undefined) ||
    ctx.suppliers.find((s) => s.name?.toLowerCase() === (product.supplier || '').toLowerCase())
  const account = accountById(ctx.accounts, supplier?.defaultAccount)
  const currency = entry?.currency || (supplier?.preferredCurrency || '').toUpperCase()
  const rate = rateFor(ctx.rates, currency)
  const wholesale = entry?.wholesalePrice || 0

  const base = {
    sku,
    wholesalePrice: wholesale,
    currency,
    exRate: rate,
    accountId: account.id,
  }

  // Landed: the Worksheet has written a real Rand cost, so the goods are here
  // and the price is settled. Stop moving it.
  if (landedCost > 0) {
    return { ...base, estimateZAR: stored, source: 'landed', floating: false }
  }

  const live = calcEstRetailZAR(wholesale, rate, account)
  if (live > 0) {
    return {
      ...base,
      estimateZAR: Math.round(live * 100) / 100,
      source: 'live',
      floating: true,
    }
  }

  // No wholesale price, or no rate for its currency. Fall back rather than
  // showing nothing, but say so — a 'stored' figure does not float, and that is
  // a gap in the data, not the intended behaviour.
  return { ...base, estimateZAR: stored, source: 'stored', floating: false }
}

/** Estimates for many products in one pass. */
export async function estimateMany<
  T extends { sku?: string | null; preOrderPrice?: number | string | null; costPerItem?: number | string | null; supplier?: string | null },
>(products: T[]): Promise<{ estimates: Map<string, PreOrderEstimate>; ctx: EstimateContext }> {
  const ctx = await loadEstimateContext()
  const estimates = new Map<string, PreOrderEstimate>()
  for (const p of products) {
    const sku = upper(p.sku || '')
    if (!sku || estimates.has(sku)) continue
    estimates.set(sku, estimateFor(ctx, p))
  }
  return { estimates, ctx }
}
