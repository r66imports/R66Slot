import { blobRead, blobWrite } from '@/lib/blob-storage'
import type { SupplierPreOrder } from '@/types/supplier-preorder'

const KEY = 'data/supplier-preorders.json'

/**
 * A deleted document takes its Supplier Pre Order link with it. Left behind,
 * the request keeps badging a quote number that no longer exists — on the admin
 * page and in the client's account — and re-sync has nothing to write to.
 *
 * A request that was only `quoted` goes back to `reviewed`, so it can be quoted
 * again. Later statuses (ordered, paid…) describe the supplier side and stay.
 * Returns the refs that were unlinked.
 */
export async function unlinkSupplierPreOrdersFromDoc(docId: string): Promise<string[]> {
  const all = await blobRead<SupplierPreOrder[]>(KEY, [])
  const hit = all.filter((o) => o.quoteId === docId)
  if (hit.length === 0) return []
  const now = new Date().toISOString()
  const updated = all.map((o) => {
    if (o.quoteId !== docId) return o
    const { quoteId, quoteNumber, ...rest } = o
    return { ...rest, status: o.status === 'quoted' ? 'reviewed' : o.status, updatedAt: now }
  })
  await blobWrite(KEY, updated)
  return hit.map((o) => o.ref)
}
