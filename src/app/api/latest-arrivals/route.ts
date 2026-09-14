import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const KEY = 'data/latest-arrivals.json'

export async function GET() {
  try {
    const items = await blobRead<any[]>(KEY, [])
    const arr = Array.isArray(items) ? items : []
    if (arr.length === 0) return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } })

    // Fetch live quantities from products DB so the card always shows current stock
    const skus = arr.map((i: any) => String(i.sku).toLowerCase())
    const result = await db.query(
      `SELECT sku, COALESCE(quantity, 0) AS quantity FROM products WHERE LOWER(sku) = ANY($1)`,
      [skus]
    )
    const liveQty: Record<string, number> = {}
    for (const row of result.rows) {
      liveQty[row.sku.toLowerCase()] = Number(row.quantity)
    }

    const merged = arr.map((item: any) => {
      const key = String(item.sku).toLowerCase()
      // compareAtPrice is R66Slot's internal Average Cost — never serve it publicly.
      const { compareAtPrice: _cost, ...rest } = item
      return key in liveQty ? { ...rest, quantity: liveQty[key] } : rest
    })

    return NextResponse.json(merged, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json([])
  }
}
