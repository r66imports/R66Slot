import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'

const POSTERS_KEY = 'data/slotcar-orders.json'

// GET /api/preorder/available
// Public endpoint – returns all active pre-order items that still have stock
export async function GET() {
  try {
    const posters = await blobRead<any[]>(POSTERS_KEY, [])

    const available = posters
      .filter((p: any) => p.availableQty > 0)
      .map((p: any) => ({
        id: p.id,
        shortCode: p.shortCode,
        orderType: p.orderType,
        sku: p.sku,
        itemDescription: p.itemDescription,
        estimatedDeliveryDate: p.estimatedDeliveryDate,
        brand: p.brand,
        description: p.description,
        preOrderPrice: p.preOrderPrice,
        availableQty: p.availableQty,
        imageUrl: p.imageUrl,
      }))
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
