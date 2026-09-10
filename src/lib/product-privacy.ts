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
const PRIVATE_FIELDS = ['costPerItem', 'purchaseAccount', 'salesAccount'] as const

/** Snake-case equivalents, for the handlers that return raw DB rows. */
const PRIVATE_COLUMNS = ['cost_per_item', 'purchase_account', 'sales_account'] as const

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
