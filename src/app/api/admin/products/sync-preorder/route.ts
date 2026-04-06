import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/admin/products/sync-preorder
// Bulk-applies Rule 30: sets is_pre_order=true for all qty=0 active products,
// clears is_pre_order=false for all qty>0 products currently marked as pre-order.
export async function POST() {
  try {
    const now = new Date().toISOString()

    // Set pre-order for all active products at zero stock
    const setRes = await db.query(
      `UPDATE products
       SET is_pre_order = true, updated_at = $1
       WHERE quantity = 0
         AND status = 'active'
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
