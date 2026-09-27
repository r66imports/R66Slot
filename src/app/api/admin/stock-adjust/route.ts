import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auction/auth'
import { db } from '@/lib/db'
import { logStockChange } from '@/lib/stock-log'

// POST /api/admin/stock-adjust
// Body: { sku: string, qty: number, mode: 'set' | 'add' | 'subtract' }
// Directly corrects a product's quantity. Use when stock is stuck at 0 due to SO/invoice desync.
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { sku, qty, mode = 'set' } = await request.json()
    if (!sku || qty == null) return NextResponse.json({ error: 'sku and qty required' }, { status: 400 })
    if (!['set', 'add', 'subtract'].includes(mode)) return NextResponse.json({ error: 'mode must be set|add|subtract' }, { status: 400 })

    const now = new Date().toISOString()
    let sql: string
    if (mode === 'set') {
      sql = `UPDATE products SET quantity = $1, is_pre_order = CASE WHEN $1 > 0 THEN false ELSE is_pre_order END, updated_at = $2 WHERE LOWER(sku) = LOWER($3) RETURNING sku, quantity, is_pre_order`
    } else if (mode === 'add') {
      sql = `UPDATE products SET quantity = COALESCE(quantity,0) + $1, is_pre_order = CASE WHEN COALESCE(quantity,0) + $1 > 0 THEN false ELSE is_pre_order END, updated_at = $2 WHERE LOWER(sku) = LOWER($3) RETURNING sku, quantity, is_pre_order`
    } else {
      sql = `UPDATE products SET quantity = GREATEST(COALESCE(quantity,0) - $1, 0), updated_at = $2 WHERE LOWER(sku) = LOWER($3) RETURNING sku, quantity, is_pre_order`
    }

    // Snapshot before the write. This route matches on LOWER(sku) with no LIMIT, so a
    // duplicated SKU already has every record adjusted; one before-value is logged for
    // the family rather than pretending to know which record moved.
    const pre = await db.query(
      `SELECT COALESCE(quantity, 0) AS q FROM products WHERE LOWER(sku) = LOWER($1) ORDER BY id LIMIT 1`,
      [sku]
    )
    const beforeQty = pre.rows[0] ? Number(pre.rows[0].q) : null

    const result = await db.query(sql, [qty, now, sku])
    if (result.rowCount === 0) return NextResponse.json({ error: `SKU "${sku}" not found` }, { status: 404 })

    // 'manual' IS an intake source in the audit's allowlist, which is right: this tool
    // exists to put stock back that a desync lost. It is not a shelf count — a count goes
    // through the product PUT with X-Stock-Origin: Stocktake so it never reads as intake.
    const after = Number(result.rows[0].quantity)
    if (beforeQty != null && after !== beforeQty) {
      await logStockChange({
        sku: String(result.rows[0].sku ?? sku).trim(),
        changeQty: after - beforeQty, qtyBefore: beforeQty, qtyAfter: after,
        source: 'manual', reference: `Stock adjust (${mode})`,
      })
    }

    return NextResponse.json({ ok: true, ...result.rows[0] })
  } catch (err: any) {
    console.error('[stock-adjust]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
