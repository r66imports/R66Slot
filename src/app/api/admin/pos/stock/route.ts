import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logStockChange } from '@/lib/stock-log'

// PATCH /api/admin/pos/stock
// Body: { id: string, mode: 'add' | 'subtract' | 'set', qty: number }
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, mode, qty } = body

    if (!id) return NextResponse.json({ error: 'Missing product id' }, { status: 400 })
    if (typeof qty !== 'number' || qty < 0) return NextResponse.json({ error: 'Invalid qty' }, { status: 400 })
    if (!['add', 'subtract', 'set'].includes(mode)) return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })

    let sql: string
    let params: any[]

    if (mode === 'set') {
      sql = `UPDATE products SET quantity = $2, updated_at = $3
      FROM (SELECT sku, COALESCE(quantity, 0) AS q FROM products WHERE id = $1) AS prev
      WHERE products.id = $1 RETURNING products.id, products.quantity, prev.sku, prev.q AS prev_quantity`
      params = [id, qty, new Date().toISOString()]
    } else if (mode === 'add') {
      sql = `UPDATE products SET quantity = COALESCE(quantity, 0) + $2, updated_at = $3
      FROM (SELECT sku, COALESCE(quantity, 0) AS q FROM products WHERE id = $1) AS prev
      WHERE products.id = $1 RETURNING products.id, products.quantity, prev.sku, prev.q AS prev_quantity`
      params = [id, qty, new Date().toISOString()]
    } else {
      // subtract — floor at 0
      sql = `UPDATE products SET quantity = GREATEST(COALESCE(quantity, 0) - $2, 0), updated_at = $3
      FROM (SELECT sku, COALESCE(quantity, 0) AS q FROM products WHERE id = $1) AS prev
      WHERE products.id = $1 RETURNING products.id, products.quantity, prev.sku, prev.q AS prev_quantity`
      params = [id, qty, new Date().toISOString()]
    }

    const result = await db.query(sql, params)
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const newQty: number = result.rows[0].quantity
    // prev.q is read WITHOUT "FOR UPDATE" on purpose — a locking read of the row this
    // statement is updating returns the value AFTER the write. See the products PUT.
    const prevQty = result.rows[0].prev_quantity
    const posSku = result.rows[0].sku
    if (posSku && prevQty != null && Number(prevQty) !== newQty) {
      await logStockChange({
        sku: String(posSku).trim(),
        changeQty: newQty - Number(prevQty),
        qtyBefore: Number(prevQty), qtyAfter: newQty,
        source: 'pos', reference: `POS ${mode}`,
      })
    }
    // Rule 30: a POS sale that empties stock no longer flips the product to Pre-Order —
    // it reads Sold Out on the storefront instead.

    return NextResponse.json({ id: result.rows[0].id, quantity: newQty })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
