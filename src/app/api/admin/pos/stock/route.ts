import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
      sql = `UPDATE products SET quantity = $2, updated_at = $3 WHERE id = $1 RETURNING id, quantity`
      params = [id, qty, new Date().toISOString()]
    } else if (mode === 'add') {
      sql = `UPDATE products SET quantity = COALESCE(quantity, 0) + $2, updated_at = $3 WHERE id = $1 RETURNING id, quantity`
      params = [id, qty, new Date().toISOString()]
    } else {
      // subtract — floor at 0
      sql = `UPDATE products SET quantity = GREATEST(COALESCE(quantity, 0) - $2, 0), updated_at = $3 WHERE id = $1 RETURNING id, quantity`
      params = [id, qty, new Date().toISOString()]
    }

    const result = await db.query(sql, params)
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ id: result.rows[0].id, quantity: result.rows[0].quantity })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
