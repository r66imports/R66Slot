import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_FILE = path.join(process.cwd(), 'data', 'slotcar-orders.json')

function getPosters() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return []
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// GET single poster (public API)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const posters = getPosters()
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
