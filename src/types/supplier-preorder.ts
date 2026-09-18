/**
 * Supplier Pre Orders — client-requested items gathered against a supplier.
 *
 * These are REQUESTS, not stock. Nothing here creates a product, touches
 * products.quantity or reserves inventory. A line only becomes real stock once
 * it has been merged into a Supplier Order, shipped, and landed through the
 * Worksheet like any other import.
 */

/** Which of the two importing entities prices the line. */
export type CostingAccountId = 'JDM' | 'R66'

/**
 * Costing profile per entity. Mirrors the Worksheet's own inputs so an estimate
 * made here lands on the same number the Worksheet produces later.
 *
 * `landedMultiplier` is the Worksheet's calcEntityFinalLanded rule: Route 66
 * Imports (spare parts) carries 1.15 on landed, JDM Garage carries 1.
 */
export interface CostingAccount {
  id: CostingAccountId
  name: string
  shippingPct: number
  customsPct: number
  handlingPct: number
  markupPct: number
  vatPct: number
  landedMultiplier: number
}

/**
 * One orderable line on a supplier's sheet. Independent of Inventory — a SKU
 * can live here without ever having been a product, which is the whole point:
 * clients request things we have never carried.
 */
export interface SupplierCatalogueItem {
  id: string
  supplierId: string
  supplierName: string
  brand: string
  sku: string
  description: string
  /** In the supplier's own currency, never ZAR. Admin-only — never sent to a client. */
  wholesalePrice: number
  currency: string
  source: 'manual' | 'import' | 'inventory'
  active: boolean
  createdAt: string
  updatedAt: string
}

/** What a client sees. Deliberately has no wholesalePrice or percentages. */
export interface ClientCatalogueItem {
  id: string
  supplierId: string
  supplierName: string
  brand: string
  sku: string
  description: string
  estRetailZAR: number
}

export type SupplierPreOrderStatus =
  | 'submitted'
  | 'reviewed'
  | 'quoted'
  | 'ordered'
  | 'deposit-paid'
  | 'paid'
  | 'archived'

export interface SupplierPreOrderLine {
  id: string
  /** Empty for a SKU the client typed in that is not on the sheet yet. */
  catalogueItemId?: string
  brand: string
  sku: string
  description: string
  qty: number
  /** Admin-only. 0 on a client-entered SKU until someone prices it. */
  wholesalePrice: number
  currency: string
  /** ZAR estimate at the moment of submission. Display history, not a promise. */
  estRetailZAR: number
  exRateAtSubmit: number
  /**
   * Set once the Worksheet Final covers this SKU. From then on estRetailZAR is
   * the real landed price and must not be recalculated against the live rate.
   */
  priceLocked: boolean
  status: 'active' | 'rejected'
  /** True when the client typed the SKU rather than picking it. */
  isNewSku: boolean
}

export interface SupplierPreOrder {
  id: string
  ref: string
  customerId: string
  clientName: string
  clientEmail: string
  clientPhone: string
  supplierId: string
  supplierName: string
  /** Supplier's currency at submit time. Admin may override on review. */
  currency: string
  /** Admin picks this on review; seeded from the supplier's default. */
  account: CostingAccountId
  status: SupplierPreOrderStatus
  lines: SupplierPreOrderLine[]
  notes: string
  /** Set when the pre-order is pushed into a Supplier Order. */
  supplierOrderRef?: string
  /** Set when merged into an existing, non-client supplier order. */
  mergedIntoRef?: string
  quoteId?: string
  quoteNumber?: string
  createdAt: string
  updatedAt: string
  submittedAt?: string
  /**
   * Archive is history: the request was created, dealt with, and is kept as a
   * record of what was sent to the supplier. It is not a deletion and can still
   * be binned.
   */
  archivedAt?: string
  /**
   * In the Bin. Set instead of removing the row, so a delete can be undone. The
   * Bin auto-empties after BIN_RETENTION_DAYS; a binned request is hidden from
   * the client immediately, as though it were gone.
   */
  deletedAt?: string
  /** Where Restore puts it back to. */
  statusBeforeDelete?: SupplierPreOrderStatus
}

/** How long a binned pre-order survives before it is purged for good. */
export const BIN_RETENTION_DAYS = 30

/** Binned pre-orders older than the retention window. */
export function expiredBinItems<T extends { deletedAt?: string }>(
  orders: T[],
  now: number = Date.now()
): T[] {
  const cutoff = now - BIN_RETENTION_DAYS * 24 * 60 * 60 * 1000
  return orders.filter((o) => {
    if (!o.deletedAt) return false
    const t = new Date(o.deletedAt).getTime()
    // An unparseable date would otherwise live in the Bin forever.
    return !Number.isFinite(t) || t <= cutoff
  })
}

/** Whole days left before a binned pre-order is purged; 0 means it is due. */
export function binDaysRemaining(deletedAt: string, now: number = Date.now()): number {
  const t = new Date(deletedAt).getTime()
  if (!Number.isFinite(t)) return 0
  const elapsedDays = (now - t) / (24 * 60 * 60 * 1000)
  return Math.max(0, Math.ceil(BIN_RETENTION_DAYS - elapsedDays))
}

/** Shown to clients wherever an estimate appears. */
export const PRICE_DISCLAIMER =
  'Estimated retail prices fluctuate with the rate of exchange and are confirmed only once the shipment has landed.'
