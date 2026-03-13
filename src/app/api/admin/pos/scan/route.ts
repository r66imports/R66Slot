import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/admin/pos/scan?q=BARCODE_OR_SKU
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    if (!q) return NextResponse.json({ error: 'No query' }, { status: 400 })

    // Match barcode first (exact), then SKU (exact), then case-insensitive fallback
    const result = await db.query(
      `SELECT * FROM products
       WHERE barcode = $1 OR sku = $1
          OR LOWER(barcode) = LOWER($1) OR LOWER(sku) = LOWER($1)
       LIMIT 1`,
      [q]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const row = result.rows[0]
    return NextResponse.json({
      id: row.id,
      title: row.title,
      sku: row.sku,
      barcode: row.barcode,
      brand: row.brand,
      price: parseFloat(row.price),
      quantity: row.quantity,
      trackQuantity: row.track_quantity,
      status: row.status,
      imageUrl: row.image_url,
      images: row.images || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
