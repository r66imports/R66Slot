import { blobRead, blobWrite } from '@/lib/blob-storage'
import { expiredBinItems, BIN_RETENTION_DAYS } from '@/types/supplier-preorder'
import type { SupplierPreOrder } from '@/types/supplier-preorder'

const KEY = 'data/supplier-preorders.json'

/**
 * The Bin for deleted Supplier Pre Orders.
 *
 * Deleting sets deletedAt rather than dropping the row, so a mistake can be
 * undone. A binned request is hidden from the client the moment it is binned —
 * from their side it is simply gone — and is purged for good after
 * BIN_RETENTION_DAYS.
 *
 * The sweep runs lazily off admin reads rather than a cron, because this app has
 * no scheduler: any admin opening the page keeps the Bin honest. That means the
 * purge happens on the first read AFTER the window passes, not on the stroke of
 * day 30, which is the right trade for not standing up infrastructure to delete
 * a handful of rows.
 */

export { BIN_RETENTION_DAYS }

/**
 * Drop binned pre-orders past the retention window.
 * Returns the refs purged so a caller can report what went, not just how many.
 */
export async function sweepBin(): Promise<{ purged: string[]; remaining: number }> {
  const all = await blobRead<SupplierPreOrder[]>(KEY, [])
  const expired = expiredBinItems(all)
  if (expired.length === 0) {
    return { purged: [], remaining: all.length }
  }
  const expiredIds = new Set(expired.map((o) => o.id))
  const kept = all.filter((o) => !expiredIds.has(o.id))
  await blobWrite(KEY, kept)
  return { purged: expired.map((o) => o.ref), remaining: kept.length }
}
