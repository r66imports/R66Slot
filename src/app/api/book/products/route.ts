import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'
import { db } from '@/lib/db'
import { estimateFor, loadEstimateContext } from '@/lib/preorder-estimate'

const POSTERS_KEY = 'data/slotcar-orders.json'

// GET /api/book/products - Public endpoint for available booking products
export async function GET() {
  try {
    const posters = await blobRead<any[]>(POSTERS_KEY, [])

    let productRows: any[] = []
    try {
      const result = await db.query(
        `SELECT * FROM products WHERE is_pre_order = true AND status = 'active'`
      )
      productRows = result.rows
    } catch {
      // column may not exist yet — ignore
    }

    /**
     * Rule 63 — a Book Now price is an estimate, so it is derived from the
     * supplier's wholesale price times the live rate on every request rather
     * than served from a stored figure that stopped moving when it was saved.
     * A SKU whose shipment has landed keeps its settled price.
     *
     * Priced through @/lib/preorder-estimate so this endpoint, the admin
     * Inventory page, the Pre-Order Dashboard and the client Supplier Pre Order
     * sheet cannot quote different numbers for the same item.
     *
     * Never fatal: if the estimate context cannot load, the stored figures are
     * served as before rather than the storefront showing no prices at all.
     */
    let ctx: Awaited<ReturnType<typeof loadEstimateContext>> | null = null
    try {
      ctx = await loadEstimateContext()
    } catch (err) {
      console.error('Book Now estimates unavailable, serving stored prices:', err)
    }

    const bySku = new Map(
      productRows.map((p: any) => [String(p.sku || '').trim().toUpperCase(), p])
    )

    const priceFor = (sku: string, stored: number, product?: any): string => {
      if (!ctx) return String(stored || 0)
      const est = estimateFor(ctx, {
        sku,
        // A poster carries no landed cost of its own; use the product's when the
        // SKU is one we stock, so a landed item stops floating here too.
        preOrderPrice: stored,
        costPerItem: product?.cost_per_item,
        supplier: product?.supplier,
      })
      return String(est.estimateZAR || stored || 0)
    }

    const posterItems = posters
      .filter((p: any) => p.shortCode && p.availableQty > 0)
      .map((p: any) => {
        const sku = String(p.sku || '').trim().toUpperCase()
        return {
          id: p.id,
          shortCode: p.shortCode,
          orderType: p.orderType || 'new-order',
          sku: p.sku || '',
          itemDescription: p.itemDescription || '',
          brand: p.brand || '',
          description: p.description || '',
          preOrderPrice: priceFor(sku, Number(p.preOrderPrice) || 0, bySku.get(sku)),
          availableQty: p.availableQty || 0,
          estimatedDeliveryDate: p.estimatedDeliveryDate || '',
          imageUrl: p.imageUrl || '',
        }
      })

    const productItems = productRows.map((p: any) => {
      const sku = String(p.sku || '').trim().toUpperCase()
      // pre_order_price is the Book Now figure; price is the shelf price and is
      // only a last resort for a pre-order product that never had one set.
      const stored = Number(p.pre_order_price) || Number(p.price) || 0
      return {
        id: p.id,
        shortCode: p.id, // use product id as booking ref
        orderType: 'pre-order' as const,
        sku: p.sku || '',
        itemDescription: p.title || '',
        brand: p.brand || '',
        description: p.description || '',
        preOrderPrice: priceFor(sku, stored, p),
        availableQty: p.quantity || 0,
        estimatedDeliveryDate: p.eta || '',
        imageUrl: p.image_url || '',
      }
    })

    const combined = [...posterItems, ...productItems].sort((a, b) => {
      if (a.orderType !== b.orderType) return a.orderType === 'new-order' ? -1 : 1
      return a.brand.localeCompare(b.brand)
    })

    return NextResponse.json(combined)
  } catch (error) {
    console.error('Error fetching available products:', error)
    return NextResponse.json([], { status: 200 })
  }
}
