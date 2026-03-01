import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export interface Product {
  id: string
  title: string
  description: string
  price: number
  compareAtPrice: number | null
  costPerItem: number | null
  sku: string
  barcode: string
  brand: string
  productType: string
  carClass: string
  carType: string
  partType: string
  scale: string
  supplier: string
  collections: string[]
  tags: string[]
  quantity: number
  trackQuantity: boolean
  weight: number | null
  weightUnit: string
  boxSize: string
  dimensions: { length: number | null; width: number | null; height: number | null }
  eta: string
  status: 'draft' | 'active'
  imageUrl: string
  images: string[]
  pageId: string
  pageIds: string[]
  pageUrl: string
  carBrands: string[]
  revoParts: string[]
  isPreOrder: boolean
  seo: { metaTitle: string; metaDescription: string; metaKeywords: string }
  sageItemCode: string | null
  sageLastSynced: string | null
  createdAt: string
  updatedAt: string
}

function rowToProduct(row: any): Product {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: parseFloat(row.price),
    compareAtPrice: row.compare_at_price ? parseFloat(row.compare_at_price) : null,
    costPerItem: row.cost_per_item ? parseFloat(row.cost_per_item) : null,
    sku: row.sku,
    barcode: row.barcode,
    brand: row.brand,
    productType: row.product_type,
    carClass: row.car_class,
    carType: row.car_type,
    partType: row.part_type,
    scale: row.scale,
    supplier: row.supplier,
    collections: row.collections || [],
    tags: row.tags || [],
    quantity: row.quantity,
    trackQuantity: row.track_quantity,
    weight: row.weight ? parseFloat(row.weight) : null,
    weightUnit: row.weight_unit,
    boxSize: row.box_size,
    dimensions: row.dimensions || { length: null, width: null, height: null },
    eta: row.eta,
    status: row.status,
    imageUrl: row.image_url,
    images: row.images || [],
    pageId: row.page_id,
    pageIds: Array.isArray(row.page_ids) ? row.page_ids : (row.page_id ? [row.page_id] : []),
    pageUrl: row.page_url,
    carBrands: Array.isArray(row.car_brands) ? row.car_brands : [],
    revoParts: Array.isArray(row.revo_parts) ? row.revo_parts : [],
    isPreOrder: row.is_pre_order || false,
    seo: row.seo || { metaTitle: '', metaDescription: '', metaKeywords: '' },
    sageItemCode: row.sage_item_code,
    sageLastSynced: row.sage_last_synced,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

let _productColumnsMigrated = false
async function ensureProductColumns() {
  if (_productColumnsMigrated) return
  try {
    await db.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS page_ids JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS car_brands JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS is_pre_order BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS revo_parts JSONB DEFAULT '[]'::jsonb
    `)
  } catch { /* ignore */ }
  _productColumnsMigrated = true
}

// GET /api/admin/products
export async function GET(request: Request) {
  try {
    await ensureProductColumns()
    const { searchParams } = new URL(request.url)
    const brand = searchParams.get('brand')
    const result = brand
      ? await db.query(`SELECT * FROM products WHERE LOWER(brand) = LOWER($1) ORDER BY sku ASC`, [brand])
      : await db.query(`SELECT * FROM products ORDER BY sku ASC`)
    return NextResponse.json(result.rows.map(rowToProduct))
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json([], { status: 200 })
  }
}

// POST /api/admin/products — create single product
export async function POST(request: Request) {
  try {
    let body: any
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Product title is required' }, { status: 400 })
    }

    const id = `prod-${Date.now()}`
    const now = new Date().toISOString()
    await ensureProductColumns()
    const pageIds: string[] = Array.isArray(body.pageIds) ? body.pageIds : (body.pageId ? [body.pageId] : [])
    const primaryPageId = pageIds[0] || ''
    const carBrands: string[] = Array.isArray(body.carBrands) ? body.carBrands : []
    const revoParts: string[] = Array.isArray(body.revoParts) ? body.revoParts : []

    await db.query(`
      INSERT INTO products (
        id, title, description, price, compare_at_price, cost_per_item,
        sku, barcode, brand, product_type, car_class, car_type, part_type,
        scale, supplier, collections, tags, quantity, track_quantity,
        weight, weight_unit, box_size, dimensions, eta, status,
        image_url, images, page_id, page_ids, page_url, car_brands, revo_parts, is_pre_order,
        seo, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
        $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,
        $34,$35,$36
      )
    `, [
      id, body.title, body.description || '',
      body.price || 0, body.compareAtPrice || null, body.costPerItem || null,
      body.sku || '', body.barcode || '', body.brand || '', body.productType || '',
      body.carClass || '', body.carType || '', body.partType || '', body.scale || '',
      body.supplier || '',
      JSON.stringify(body.collections || []), JSON.stringify(body.tags || []),
      body.quantity || 0, body.trackQuantity !== false,
      body.weight || null, body.weightUnit || 'kg', body.boxSize || '',
      JSON.stringify(body.dimensions || {}), body.eta || '', body.status || 'draft',
      body.imageUrl || body.mediaFiles?.[0] || '', JSON.stringify(body.mediaFiles || []),
      primaryPageId, JSON.stringify(pageIds), body.pageUrl || '',
      JSON.stringify(carBrands), JSON.stringify(revoParts), body.isPreOrder || false,
      JSON.stringify(body.seo || {}), now, now,
    ])

    const result = await db.query(`SELECT * FROM products WHERE id = $1`, [id])
    return NextResponse.json(rowToProduct(result.rows[0]), { status: 201 })
  } catch (error: any) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: `Failed to create product: ${error.message}` }, { status: 500 })
  }
}

// PUT /api/admin/products — bulk CSV import
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    if (!Array.isArray(body.products)) {
      return NextResponse.json({ error: 'Expected { products: [] }' }, { status: 400 })
    }

    let imported = 0
    let updated = 0
    for (const p of body.products) {
      const now = new Date().toISOString()
      const sku = (p.sku || '').trim()

      // If SKU provided, check for an existing product — update instead of inserting duplicate
      if (sku) {
        const existing = await db.query('SELECT id FROM products WHERE sku = $1 LIMIT 1', [sku])
        if (existing.rows.length > 0) {
          const existingId = existing.rows[0].id
          await db.query(`
            UPDATE products SET
              title       = CASE WHEN $1 <> '' THEN $1 ELSE title END,
              description = CASE WHEN $2 <> '' THEN $2 ELSE description END,
              price       = CASE WHEN $3::numeric > 0 THEN $3::numeric ELSE price END,
              brand       = CASE WHEN $4 <> '' THEN $4 ELSE brand END,
              product_type = CASE WHEN $5 <> '' THEN $5 ELSE product_type END,
              car_class   = CASE WHEN $6 <> '' THEN $6 ELSE car_class END,
              car_type    = CASE WHEN $7 <> '' THEN $7 ELSE car_type END,
              part_type   = CASE WHEN $8 <> '' THEN $8 ELSE part_type END,
              scale       = CASE WHEN $9 <> '' THEN $9 ELSE scale END,
              supplier    = CASE WHEN $10 <> '' THEN $10 ELSE supplier END,
              quantity    = $11::integer,
              eta         = CASE WHEN $12 <> '' THEN $12 ELSE eta END,
              status      = CASE WHEN $13 <> '' THEN $13 ELSE status END,
              updated_at  = $14
            WHERE id = $15
          `, [
            p.title || p.name || '',
            p.description || '',
            parseFloat(p.price) || 0,
            p.brand || '',
            p.productType || '',
            p.carClass || '',
            p.carType || '',
            p.partType || '',
            p.scale || '',
            p.supplier || '',
            parseInt(p.quantity) ?? 0,
            p.eta || '',
            p.status || '',
            now,
            existingId,
          ])
          updated++
          continue
        }
      }

      // No matching SKU found — insert as new product
      const id = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      await db.query(`
        INSERT INTO products (
          id, title, description, price, compare_at_price, cost_per_item,
          sku, barcode, brand, product_type, car_class, car_type, part_type,
          scale, supplier, collections, tags, quantity, track_quantity,
          weight, weight_unit, box_size, dimensions, eta, status,
          image_url, images, page_id, page_ids, page_url, seo, created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
          $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33
        )
      `, [
        id, p.title || p.name || '', p.description || '',
        parseFloat(p.price) || 0,
        p.compareAtPrice ? parseFloat(p.compareAtPrice) : null,
        p.costPerItem ? parseFloat(p.costPerItem) : null,
        sku, p.barcode || '', p.brand || '', p.productType || '',
        p.carClass || '', p.carType || '', p.partType || '', p.scale || '',
        p.supplier || '',
        JSON.stringify(Array.isArray(p.collections) ? p.collections : []),
        JSON.stringify(Array.isArray(p.tags) ? p.tags : []),
        parseInt(p.quantity) || 0, p.trackQuantity !== false,
        p.weight ? parseFloat(p.weight) : null, p.weightUnit || 'kg',
        p.boxSize || '', JSON.stringify(p.dimensions || {}),
        p.eta || '', p.status || 'active',
        p.imageUrl || '', JSON.stringify(Array.isArray(p.images) ? p.images : []),
        p.pageId || '', JSON.stringify(Array.isArray(p.pageIds) ? p.pageIds : (p.pageId ? [p.pageId] : [])), p.pageUrl || '',
        JSON.stringify(p.seo || {}), now, now,
      ])
      imported++
    }

    return NextResponse.json({ imported, updated })
  } catch (error) {
    console.error('Error importing products:', error)
    return NextResponse.json({ error: 'Failed to import' }, { status: 500 })
  }
}
