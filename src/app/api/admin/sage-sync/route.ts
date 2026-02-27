import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/admin/sage-sync
 * Receives product data from Sage and upserts into the products table.
 *
 * Requires Authorization: Bearer <SAGE_SYNC_SECRET>
 *
 * Expected body:
 * {
 *   products: [
 *     {
 *       itemCode: "NSR001",       // Sage item code (unique key)
 *       description: "NSR Shark", // Product name
 *       sellPrice: 450.00,        // Selling price (incl VAT or excl — your choice)
 *       costPrice: 280.00,        // Cost price
 *       qtyOnHand: 12,            // Stock quantity
 *       brand: "NSR",
 *       category: "1:32 Slot Cars",
 *       barcode: "1234567890",
 *       sku: "NSR001",
 *     }
 *   ]
 * }
 *
 * Returns: { synced: number, skipped: number }
 */
export async function POST(request: NextRequest) {
  // Auth check
  const secret = process.env.SAGE_SYNC_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'SAGE_SYNC_SECRET not configured' }, { status: 503 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!Array.isArray(body.products)) {
    return NextResponse.json({ error: 'Expected { products: [] }' }, { status: 400 })
  }

  let synced = 0
  let skipped = 0

  for (const item of body.products) {
    if (!item.itemCode || !item.description) { skipped++; continue }

    // Check if product with this sage_item_code already exists
    const existing = await db.query(
      `SELECT id FROM products WHERE sage_item_code = $1`,
      [item.itemCode]
    )

    if (existing.rows.length > 0) {
      // Update existing product's price, stock, and sync timestamp
      await db.query(`
        UPDATE products SET
          title = COALESCE(NULLIF($2, ''), title),
          price = $3,
          cost_per_item = $4,
          quantity = $5,
          brand = COALESCE(NULLIF($6, ''), brand),
          sku = COALESCE(NULLIF($7, ''), sku),
          barcode = COALESCE(NULLIF($8, ''), barcode),
          sage_last_synced = NOW(),
          updated_at = NOW()
        WHERE sage_item_code = $1
      `, [
        item.itemCode,
        item.description || '',
        parseFloat(item.sellPrice) || 0,
        item.costPrice ? parseFloat(item.costPrice) : null,
        parseInt(item.qtyOnHand) || 0,
        item.brand || '',
        item.sku || item.itemCode,
        item.barcode || '',
      ])
    } else {
      // Create new product from Sage
      const id = `sage-${item.itemCode}-${Date.now()}`
      const now = new Date().toISOString()
      await db.query(`
        INSERT INTO products (
          id, title, price, cost_per_item, sku, barcode, brand,
          product_type, quantity, status,
          sage_item_code, sage_last_synced,
          created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10,NOW(),$11,$12
        ) ON CONFLICT (id) DO NOTHING
      `, [
        id,
        item.description,
        parseFloat(item.sellPrice) || 0,
        item.costPrice ? parseFloat(item.costPrice) : null,
        item.sku || item.itemCode,
        item.barcode || '',
        item.brand || '',
        item.category || '',
        parseInt(item.qtyOnHand) || 0,
        item.itemCode,
        now, now,
      ])
    }
    synced++
  }

  return NextResponse.json({ synced, skipped })
}

/**
 * GET /api/admin/sage-sync
 * Returns sync status — last sync time and product count per Sage item.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.SAGE_SYNC_SECRET
  if (!secret) return NextResponse.json({ error: 'SAGE_SYNC_SECRET not configured' }, { status: 503 })
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await db.query(`
    SELECT
      COUNT(*) AS total_products,
      COUNT(sage_item_code) AS sage_linked,
      MAX(sage_last_synced) AS last_synced
    FROM products
  `)

  return NextResponse.json(result.rows[0])
}
