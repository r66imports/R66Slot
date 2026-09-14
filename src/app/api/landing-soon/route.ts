import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const KEY = 'data/landing-soon.json'
const DASHBOARD_KEY = 'data/preorder-dashboard.json'

/**
 * Available pre-order slots for a dashboard item — the same figure the Pre-Order
 * Dashboard prints as "(N in stock)". A Supplier Order (minOrderQty) caps the run,
 * so availability is what is left of it after reservations; with no Supplier Order
 * set, the only thing on offer is the extra qty. Must stay in step with `inStock`
 * in admin/preorder-dashboard/[supplier]/page.tsx.
 */
function dashboardAvailableQty(item: any): number {
  const reserved = Array.isArray(item?.customers)
    ? item.customers.reduce((sum: number, c: any) => sum + (Number(c?.qty) || 0), 0)
    : 0
  const minOrderQty = Number(item?.minOrderQty) || 0
  if (minOrderQty > 0) return Math.max(0, minOrderQty - reserved)
  return Math.max(0, Number(item?.extraQty) || 0)
}

export async function GET() {
  try {
    const items = await blobRead<any[]>(KEY, [])
    const arr = Array.isArray(items) ? items : []
    if (arr.length === 0) return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } })

    // Landing Soon is pre-arrival stock, so the quantity on the card is the Pre-Order
    // Dashboard's remaining slots — NOT products.quantity. An item that has not shipped
    // yet has no inventory, which would otherwise read as "Pre Sold Out" while the
    // dashboard still shows slots open.
    const dashItems = await blobRead<any[]>(DASHBOARD_KEY, [])
    const dashBySku: Record<string, number> = {}
    for (const d of Array.isArray(dashItems) ? dashItems : []) {
      const sku = typeof d?.sku === 'string' ? d.sku.trim().toLowerCase() : ''
      if (!sku) continue
      // Duplicate SKUs across suppliers: keep the most available so a stale, fully
      // reserved twin can't blank out a listing that is still open.
      const qty = dashboardAvailableQty(d)
      dashBySku[sku] = sku in dashBySku ? Math.max(dashBySku[sku], qty) : qty
    }

    // Pull live price and image from the products DB so the card reflects the current
    // product without needing the toggle flipped off and on again.
    const skus = arr.map((i: any) => String(i.sku).trim().toLowerCase())
    const result = await db.query(
      `SELECT sku, COALESCE(quantity, 0) AS quantity, price, image_url, images
         FROM products WHERE LOWER(sku) = ANY($1)`,
      [skus]
    )
    // The product's first usable image. The toggle snapshots an image URL, but at that
    // moment the product's uploads may still be local data: URLs (or absent), leaving the
    // blob entry with no image — so always resolve from the product as a fallback.
    const firstImage = (row: any): string => {
      const candidates: unknown[] = [row.image_url, ...(Array.isArray(row.images) ? row.images : [])]
      for (const c of candidates) {
        const url = typeof c === 'string' ? c.trim() : ''
        if (url && !url.startsWith('data:')) return url
      }
      return ''
    }
    const live: Record<string, { quantity: number; price: number | null; imageUrl: string }> = {}
    for (const row of result.rows) {
      live[String(row.sku).trim().toLowerCase()] = {
        quantity: Number(row.quantity),
        price: row.price != null ? Number(row.price) : null,
        imageUrl: firstImage(row),
      }
    }

    const merged = arr.flatMap((item: any) => {
      const key = String(item.sku).trim().toLowerCase()
      const hit = live[key]
      const onDashboard = key in dashBySku
      // Nothing left to render: no product row AND no dashboard entry means the item is
      // gone from both sides. An item that is only on the dashboard is kept — pre-order
      // stock legitimately has no product row until the shipment lands.
      if (!hit && !onDashboard) return []
      const stored = typeof item.imageUrl === 'string' ? item.imageUrl.trim() : ''
      const productImage = stored && !stored.startsWith('data:') ? stored : (hit?.imageUrl || '')
      // compareAtPrice is R66Slot's internal Average Cost — never serve it publicly.
      const { compareAtPrice: _cost, ...rest } = item
      return [{
        ...rest,
        quantity: onDashboard ? dashBySku[key] : (hit?.quantity ?? 0),
        price: hit?.price ?? item.price,
        imageUrl: productImage,
      }]
    })

    return NextResponse.json(merged, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json([])
  }
}
