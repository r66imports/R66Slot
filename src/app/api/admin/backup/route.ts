import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET — export full backup as JSON
export async function GET() {
  try {
    const [storeRes, productsRes] = await Promise.all([
      db.query('SELECT key, value, updated_at FROM json_store ORDER BY key'),
      db.query(`SELECT id, sku, title, description, price, compare_at_price, cost_per_item,
                       quantity, track_quantity, status, brand, images, tags, weight,
                       barcode, category_ids, category_brands, item_categories,
                       sales_account, purchase_account, car_brands, sideways_brands,
                       revo_parts, car_class, sideways_parts, sideways_car_type,
                       supplier, created_at, updated_at
                FROM products ORDER BY sku`),
    ])

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      store: storeRes.rows.map((r: any) => ({
        key: r.key,
        value: r.value,
        updatedAt: r.updated_at,
      })),
      products: productsRes.rows,
    }

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="r66slot-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — restore from backup JSON (json_store only — products are not overwritten)
export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.version || !Array.isArray(body.store)) {
      return NextResponse.json({ error: 'Invalid backup file' }, { status: 400 })
    }

    let restored = 0
    for (const entry of body.store) {
      if (!entry.key) continue
      await db.query(
        `INSERT INTO json_store (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [entry.key, JSON.stringify(entry.value)]
      )
      restored++
    }

    return NextResponse.json({ success: true, restored })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
