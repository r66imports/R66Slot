import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'
import { db } from '@/lib/db'

const POSTERS_KEY = 'data/slotcar-orders.json'

// GET /api/book/products - Public endpoint for available booking products
export async function GET() {
  try {
    // 1. Slotcar-orders (poster system)
    const posters = await blobRead<any[]>(POSTERS_KEY, [])
    const posterItems = posters
      .filter((p: any) => p.shortCode && p.availableQty > 0)
      .map((p: any) => ({
        id: p.id,
        shortCode: p.shortCode,
        orderType: p.orderType || 'new-order',
        sku: p.sku || '',
        itemDescription: p.itemDescription || '',
        brand: p.brand || '',
        description: p.description || '',
        preOrderPrice: p.preOrderPrice || '0',
        availableQty: p.availableQty || 0,
        estimatedDeliveryDate: p.estimatedDeliveryDate || '',
        imageUrl: p.imageUrl || '',
      }))

    // 2. Products table — those marked as pre-order
    let productItems: any[] = []
    try {
      const result = await db.query(
        `SELECT * FROM products WHERE is_pre_order = true AND status = 'active'`
      )
      productItems = result.rows.map((p: any) => ({
        id: p.id,
        shortCode: p.id, // use product id as booking ref
        orderType: 'pre-order' as const,
        sku: p.sku || '',
        itemDescription: p.title || '',
        brand: p.brand || '',
        description: p.description || '',
        preOrderPrice: p.price ? String(p.price) : '0',
        availableQty: p.quantity || 0,
        estimatedDeliveryDate: p.eta || '',
        imageUrl: p.image_url || '',
      }))
    } catch {
      // column may not exist yet — ignore
    }

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
