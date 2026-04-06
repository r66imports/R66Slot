import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/admin/products/sync-preorder
// Bulk-applies Rule 30 to ALL products regardless of status:
// sets is_pre_order=true for qty=0 products, clears for qty>0 products.
export async function POST() {
  try {
    const now = new Date().toISOString()

    // Set pre-order for ALL products at zero stock (active AND draft)
    const setRes = await db.query(
      `UPDATE products
       SET is_pre_order = true, updated_at = $1
       WHERE quantity = 0
         AND NOT COALESCE(is_pre_order, false)
       RETURNING id`,
      [now]
    )

    // Clear pre-order for all products that now have stock
    const clearRes = await db.query(
      `UPDATE products
       SET is_pre_order = false, updated_at = $1
       WHERE quantity > 0
         AND COALESCE(is_pre_order, false)
       RETURNING id`,
      [now]
    )

    return NextResponse.json({
      set: setRes.rowCount ?? 0,
      cleared: clearRes.rowCount ?? 0,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
