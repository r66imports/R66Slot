import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'

async function getPosters() {
  return await blobRead<any[]>('data/slotcar-orders.json', [])
}

// GET single poster (public API)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const posters = await getPosters()
    const poster = posters.find((p: any) => p.id === id && p.published)

    if (!poster) {
      return NextResponse.json({ error: 'Pre-order not found' }, { status: 404 })
    }

    // Return only public fields
    return NextResponse.json({
      id: poster.id,
      orderType: poster.orderType,
      sku: poster.sku,
      itemDescription: poster.itemDescription,
      estimatedDeliveryDate: poster.estimatedDeliveryDate,
      brand: poster.brand,
      description: poster.description,
      preOrderPrice: poster.preOrderPrice,
      availableQty: poster.availableQty,
      imageUrl: poster.imageUrl,
    })
  } catch (error) {
    console.error('Error fetching poster:', error)
    return NextResponse.json({ error: 'Failed to fetch pre-order' }, { status: 500 })
  }
}
