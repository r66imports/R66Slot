import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'
import { db } from '@/lib/db'

const BACKORDERS_KEY = 'data/backorders.json'

// POST /api/admin/backorders/sync-products
// Reads all backorders, finds unique SKUs not yet in products, creates draft products.
export async function POST() {
  try {
    // 1. Load all backorders
    const backorders = await blobRead<any[]>(BACKORDERS_KEY, [])

    // 2. Deduplicate backorder SKUs (pick the richest entry per SKU)
    const skuMap: Record<string, { sku: string; title: string; brand: string; price: number; supplier: string }> = {}
    for (const bo of backorders) {
      const sku = (bo.sku || '').trim()
      if (!sku) continue
      const key = sku.toLowerCase()
      if (!skuMap[key]) {
        skuMap[key] = {
          sku,
          title: bo.description || sku,
          brand: bo.brand || '',
          price: bo.price || 0,
          supplier: bo.supplierName || '',
        }
      } else {
        // Enrich with any non-empty fields from other rows
        if (!skuMap[key].title && bo.description) skuMap[key].title = bo.description
        if (!skuMap[key].brand && bo.brand) skuMap[key].brand = bo.brand
        if (!skuMap[key].price && bo.price) skuMap[key].price = bo.price
        if (!skuMap[key].supplier && bo.supplierName) skuMap[key].supplier = bo.supplierName
      }
    }

    const uniqueSkus = Object.values(skuMap)
    if (uniqueSkus.length === 0) {
      return NextResponse.json({ created: 0, skipped: 0, message: 'No SKUs found in backorders' })
    }

    // 3. Get all existing product SKUs from PostgreSQL
    const existing = await db.query(`SELECT LOWER(sku) AS sku FROM products WHERE sku IS NOT NULL AND sku <> ''`)
    const existingSet = new Set<string>(existing.rows.map((r: any) => r.sku))

    // 4. Create missing products
    const toCreate = uniqueSkus.filter((p) => !existingSet.has(p.sku.toLowerCase()))
    let created = 0
    const now = new Date().toISOString()

    for (const p of toCreate) {
      try {
        const id = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        await db.query(`
          INSERT INTO products (
            id, title, description, price, sku, brand, supplier,
            status, quantity, track_quantity, weight_unit,
            collections, tags, images, page_ids, car_brands, revo_parts,
            seo, created_at, updated_at,
            sales_account, purchase_account, category_brands, item_categories,
            sideways_brands, sideways_parts
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,
            'draft',0,true,'kg',
            '[]','[]','[]','[]','[]','[]',
            '{}', $8,$9,
            '[]','[]','[]','[]',
            '[]','[]'
          )
        `, [
          id,
          p.title || p.sku,
          '',
          p.price || 0,
          p.sku,
          p.brand || '',
          p.supplier || '',
          now, now,
        ])
        created++
      } catch {
        // Skip duplicates or constraint violations silently
      }
    }

    return NextResponse.json({
      created,
      skipped: uniqueSkus.length - created,
      total: uniqueSkus.length,
      message: `Synced ${created} new product${created !== 1 ? 's' : ''} from backorders (${uniqueSkus.length - created} already existed).`,
    })
  } catch (error: any) {
    console.error('Sync backorders → products error:', error)
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 })
  }
}
