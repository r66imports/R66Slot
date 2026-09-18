import { cookies } from 'next/headers'
import { verifyAdminSession } from '@/lib/admin-session'

/**
 * GET /api/admin/products is on the middleware allowlist because the storefront needs
 * it — catalogue grid, product pages, cart stock refresh, header search. It returned the
 * raw record, so landed cost per SKU was readable by anyone with the URL and no session.
 *
 * These fields are internal and no storefront component reads them, so they are dropped
 * for anonymous callers and returned in full for a signed-in admin.
 */
const PRIVATE_FIELDS = [
  'costPerItem',
  'purchaseAccount',
  'salesAccount',
  // On R66Slot compareAtPrice is the internal Average Cost, NOT a "was" price —
  // it is labelled "Average Cost (internal)" on Product Edit. It was being
  // returned to anonymous callers, so 261 SKUs had their cost readable by anyone
  // with the URL, and the storefront rendered it as a struck-through was-price
  // wherever cost happened to exceed retail. The public "was" price on this site
  // comes from discountPct, never from this field.
  'compareAtPrice',
] as const

/** Snake-case equivalents, for the handlers that return raw DB rows. */
const PRIVATE_COLUMNS = [
  'cost_per_item',
  'purchase_account',
  'sales_account',
  'compare_at_price',
] as const

export async function hasAdminSession(): Promise<boolean> {
  try {
    const store = await cookies()
    return !!verifyAdminSession(store.get('admin-session')?.value)
  } catch {
    return false
  }
}

export function stripPrivateFields<T extends Record<string, any>>(product: T): T {
  const out: Record<string, any> = { ...product }
  for (const field of PRIVATE_FIELDS) delete out[field]
  return out as T
}

export function stripPrivateColumns<T extends Record<string, any>>(row: T): T {
  const out: Record<string, any> = { ...row }
  for (const col of PRIVATE_COLUMNS) delete out[col]
  return out as T
}
