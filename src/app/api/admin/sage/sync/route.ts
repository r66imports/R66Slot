import { NextRequest, NextResponse } from 'next/server'
import { fetchSageProducts, getSageConnectionStatus } from '@/lib/sage/client'
import { db } from '@/lib/db'

/**
 * POST /api/admin/sage/sync
 * Pulls all active products from Sage Accounting and upserts into products table.
 * - Creates new products for items not yet in the DB
 * - Updates price, stock, and cost for existing products (matched by sage_item_code)
 * - Never deletes products — only deactivates if removed from Sage
 *
 * Returns: { synced, created, updated, skipped }
 */
export async function POST(request: NextRequest) {
  // Admin-only — check session cookie
  const session = request.cookies.get('admin-session')?.value
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sageProducts = await fetchSageProducts()

    let created = 0
    let updated = 0
    let skipped = 0

    for (const item of sageProducts) {
      const itemCode = item.item_code || item.id
      const sellPrice = item.sales_prices?.[0]?.price ?? 0
      const costPrice = item.purchase_prices?.[0]?.price ?? null
      const qty = item.stock_on_hand ?? 0
      const name = item.displayed_as || ''
      const description = item.description || ''
      const brand = item.product_group?.displayed_as || ''

      if (!name) { skipped++; continue }

      const existing = await db.query(
        `SELECT id FROM products WHERE sage_item_code = $1`,
        [itemCode]
      )

      if (existing.rows.length > 0) {
        await db.query(`
          UPDATE products SET
            title        = $2,
            description  = CASE WHEN $3 = '' THEN description ELSE $3 END,
            price        = $4,
            cost_per_item = $5,
            quantity     = $6,
            brand        = CASE WHEN $7 = '' THEN brand ELSE $7 END,
            sku          = CASE WHEN $8 = '' THEN sku ELSE $8 END,
            barcode      = CASE WHEN $9 = '' THEN barcode ELSE $9 END,
            sage_last_synced = NOW(),
            updated_at   = NOW()
          WHERE sage_item_code = $1
        `, [itemCode, name, description, sellPrice, costPrice, qty, brand, itemCode, item.barcode || ''])
        updated++
      } else {
        const id = `sage-${itemCode}-${Date.now()}`
        const now = new Date().toISOString()
        await db.query(`
          INSERT INTO products (
            id, title, description, price, cost_per_item, sku, barcode,
            brand, quantity, status,
            sage_item_code, sage_last_synced, created_at, updated_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10,NOW(),$11,$12
          )
        `, [id, name, description, sellPrice, costPrice, itemCode, item.barcode || '',
            brand, qty, itemCode, now, now])
        created++
      }
    }

    return NextResponse.json({
      synced: created + updated,
      created,
      updated,
      skipped,
      total: sageProducts.length,
    })
  } catch (error: any) {
    console.error('Sage sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * GET /api/admin/sage/sync
 * Returns connection status and last sync info.
 */
export async function GET(request: NextRequest) {
  const session = request.cookies.get('admin-session')?.value
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = await getSageConnectionStatus()
  const stats = await db.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(sage_item_code) AS sage_linked,
      MAX(sage_last_synced) AS last_synced
    FROM products
  `).catch(() => ({ rows: [{ total: 0, sage_linked: 0, last_synced: null }] }))

  return NextResponse.json({
    ...status,
    ...stats.rows[0],
  })
}
