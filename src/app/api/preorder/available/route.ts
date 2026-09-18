import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'
import { db } from '@/lib/db'
import { estimateFor, loadEstimateContext } from '@/lib/preorder-estimate'

const POSTERS_KEY = 'data/slotcar-orders.json'

// GET /api/preorder/available
// Public endpoint – returns all active pre-order items that still have stock
export async function GET() {
  try {
    const posters = await blobRead<any[]>(POSTERS_KEY, [])

    /**
     * Rule 63 — the advertised pre-order price is an estimate and is derived
     * from the supplier's wholesale price times the live rate on every request,
     * not served from a figure that stopped moving when it was saved. A SKU
     * whose shipment has landed keeps its settled price.
     *
     * Shares @/lib/preorder-estimate with the Book Now endpoint and the admin
     * pages, so the same item cannot be advertised at two different prices.
     *
     * Estimates failing must never blank the storefront, so any problem here
     * falls back to the stored figures.
     */
    let ctx: Awaited<ReturnType<typeof loadEstimateContext>> | null = null
    let landedBySku = new Map<string, any>()
    try {
      ctx = await loadEstimateContext()
      const rows = await db.query(
        `SELECT sku, cost_per_item, supplier FROM products WHERE status != 'archived'`
      )
      landedBySku = new Map(
        (rows.rows as any[]).map((r) => [String(r.sku || '').trim().toUpperCase(), r])
      )
    } catch (err) {
      console.error('Pre-order estimates unavailable, serving stored prices:', err)
      ctx = null
    }

    const available = posters
      .filter((p: any) => p.availableQty > 0)
      .map((p: any) => {
        const sku = String(p.sku || '').trim().toUpperCase()
        const stored = Number(p.preOrderPrice) || 0
        let price = p.preOrderPrice
        if (ctx) {
          const prod = landedBySku.get(sku)
          const est = estimateFor(ctx, {
            sku,
            preOrderPrice: stored,
            costPerItem: prod?.cost_per_item,
            supplier: prod?.supplier,
          })
          if (est.estimateZAR > 0) price = String(est.estimateZAR)
        }
        return {
          id: p.id,
          shortCode: p.shortCode,
          orderType: p.orderType,
          sku: p.sku,
          itemDescription: p.itemDescription,
          estimatedDeliveryDate: p.estimatedDeliveryDate,
          brand: p.brand,
          description: p.description,
          preOrderPrice: price,
          availableQty: p.availableQty,
          imageUrl: p.imageUrl,
        }
      })
      .sort((a: any, b: any) => {
        // Pre-orders first, then sort by available qty descending
        if (a.orderType === 'pre-order' && b.orderType !== 'pre-order') return -1
        if (a.orderType !== 'pre-order' && b.orderType === 'pre-order') return 1
        return b.availableQty - a.availableQty
      })

    return NextResponse.json({ items: available })
  } catch (error) {
    console.error('Error fetching available pre-orders:', error)
    return NextResponse.json({ items: [] })
  }
}
