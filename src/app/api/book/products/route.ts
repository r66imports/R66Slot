import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'

const POSTERS_KEY = 'data/slotcar-orders.json'

// GET /api/book/products - Public endpoint for available booking products
export async function GET() {
  try {
    const posters = await blobRead<any[]>(POSTERS_KEY, [])

    // Only return products that have available quantity and a short code
    const available = posters
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
      .sort((a: any, b: any) => {
        // Sort new orders first, then by brand
        if (a.orderType !== b.orderType) {
          return a.orderType === 'new-order' ? -1 : 1
        }
        return a.brand.localeCompare(b.brand)
      })

    return NextResponse.json(available)
  } catch (error) {
    console.error('Error fetching available products:', error)
    return NextResponse.json([], { status: 200 })
  }
}
