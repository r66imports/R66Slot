import { blobRead, blobWrite } from '@/lib/blob-storage'
import type {
  SupplierCatalogueItem,
  SupplierPreOrder,
  SupplierPreOrderFulfilledLine,
  SupplierPreOrderLine,
} from '@/types/supplier-preorder'

const KEY = 'data/supplier-preorders.json'
const CATALOGUE_KEY = 'data/supplier-catalogue.json'

/**
 * The request line a fulfilled entry came from. Entries written since 28 Oct
 * 2026 carry the whole line; older ones carry only SKU/description/qty, so the
 * rest (wholesale, brand, catalogue id) is taken back off the supplier's
 * catalogue — the price is re-derived on read anyway.
 */
function lineFromFulfilled(
  f: SupplierPreOrderFulfilledLine,
  order: SupplierPreOrder,
  catalogue: SupplierCatalogueItem[],
  n: number
): SupplierPreOrderLine {
  if (f.line) return { ...f.line, qty: f.qty, status: 'active' }
  const sku = f.sku.trim().toUpperCase()
  const item = catalogue.find(
    (c) => c.supplierId === order.supplierId && c.sku.trim().toUpperCase() === sku
  )
  return {
    id: `spl_returned_${Date.now()}_${n}`,
    catalogueItemId: item?.id,
    brand: item?.brand || '',
    sku: f.sku,
    description: f.description || item?.description || '',
    qty: f.qty,
    wholesalePrice: item?.wholesalePrice || 0,
    currency: item?.currency || order.currency,
    estRetailZAR: 0,
    exRateAtSubmit: 0,
    priceLocked: false,
    status: 'active',
    isNewSku: !item,
  }
}

/**
 * Puts the lines a request sent to `docId` back on the request, and drops
 * them from its fulfilled record. Pure — the caller writes.
 */
export function withLinesReturned(
  order: SupplierPreOrder,
  docId: string,
  catalogue: SupplierCatalogueItem[]
): SupplierPreOrder {
  const back = (order.fulfilled || []).filter((f) => f.docId === docId)
  if (back.length === 0) return order
  return {
    ...order,
    lines: [...order.lines, ...back.map((f, n) => lineFromFulfilled(f, order, catalogue, n))],
    fulfilled: (order.fulfilled || []).filter((f) => f.docId !== docId),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * A deleted document must not strand the requests that point at it.
 *
 * - Linked as the quote: quoteId/quoteNumber are cleared, and a request that
 *   was only `quoted` goes back to `reviewed` so it can be quoted again. Later
 *   statuses (ordered, paid…) describe the supplier side and stay.
 * - Lines supplied from stock onto it (invoice / sales order): they go back on
 *   the request. Deleting the document already returned their stock, so
 *   leaving them parked in `fulfilled` would lose the client's lines entirely —
 *   which is what happened to SPO0014 when SO026 was deleted.
 *
 * Returns the refs that changed.
 */
export async function unlinkSupplierPreOrdersFromDoc(docId: string): Promise<string[]> {
  const all = await blobRead<SupplierPreOrder[]>(KEY, [])
  const hit = all.filter(
    (o) => o.quoteId === docId || (o.fulfilled || []).some((f) => f.docId === docId)
  )
  if (hit.length === 0) return []
  const catalogue = hit.some((o) => (o.fulfilled || []).some((f) => f.docId === docId && !f.line))
    ? await blobRead<SupplierCatalogueItem[]>(CATALOGUE_KEY, [])
    : []
  const now = new Date().toISOString()
  const updated = all.map((o) => {
    if (!hit.includes(o)) return o
    let next = withLinesReturned(o, docId, catalogue)
    if (next.quoteId === docId) {
      const { quoteId, quoteNumber, ...rest } = next
      next = { ...rest, status: next.status === 'quoted' ? 'reviewed' : next.status }
    }
    return { ...next, updatedAt: now }
  })
  await blobWrite(KEY, updated)
  return hit.map((o) => o.ref)
}
