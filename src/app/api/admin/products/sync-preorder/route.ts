import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/admin/products/sync-preorder
// Rule 30 reversal cleanup. The old rule derived is_pre_order from the stock level,
// setting it on every 0-qty product — which made sold-out items read "Book Now"
// instead of "Sold Out". The flag is now owned by the product record and is never
// set from stock.
//
// This endpoint no longer sets the flag. It only clears it where the product has
// stock, since an item with stock on hand is purchasable and cannot be a pre-order.
// Zero-qty products are left untouched: without a stock audit log there is no way
// to tell an auto-flagged product from a deliberate pre-order, and clearing both
// would wipe genuine pre-orders.
export async function POST() {
  try {
    const now = new Date().toISOString()

    const clearRes = await db.query(
      `UPDATE products
       SET is_pre_order = false, updated_at = $1
       WHERE quantity > 0
         AND COALESCE(is_pre_order, false)
       RETURNING id`,
      [now]
    )

    return NextResponse.json({
      set: 0,
      cleared: clearRes.rowCount ?? 0,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
