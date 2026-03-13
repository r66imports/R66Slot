import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Product } from '../route'

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
    sidewaysBrands: Array.isArray(row.sideways_brands) ? row.sideways_brands : [],
    sidewaysParts: Array.isArray(row.sideways_parts) ? row.sideways_parts : [],
    sidewaysCarTypes: Array.isArray(row.sideways_car_type) ? row.sideways_car_type : [],
    sidewaysCarClasses: Array.isArray(row.sideways_car_classes) ? row.sideways_car_classes : [],
    customOrgs: (typeof row.custom_orgs === 'object' && row.custom_orgs !== null) ? row.custom_orgs : {},
    revoParts: Array.isArray(row.revo_parts) ? row.revo_parts : [],
    isPreOrder: row.is_pre_order || false,
    seo: row.seo || { metaTitle: '', metaDescription: '', metaKeywords: '' },
    sageItemCode: row.sage_item_code,
    sageLastSynced: row.sage_last_synced,
    units: Array.isArray(row.units) ? row.units : [],
    unit: row.unit || 'Each',
    categoryBrands: Array.isArray(row.category_brands) ? row.category_brands : [],
    itemCategories: Array.isArray(row.item_categories) ? row.item_categories : [],
    salesAccount: (() => { try { const v = JSON.parse(row.sales_account || '[]'); return Array.isArray(v) ? v : [] } catch { return row.sales_account ? [row.sales_account] : [] } })(),
    purchaseAccount: (() => { try { const v = JSON.parse(row.purchase_account || '[]'); return Array.isArray(v) ? v : [] } catch { return row.purchase_account ? [row.purchase_account] : [] } })(),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// GET /api/admin/products/[id]
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await db.query(`SELECT * FROM products WHERE id = $1`, [id])
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(rowToProduct(result.rows[0]))
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PUT /api/admin/products/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const now = new Date().toISOString()

    const pageIds: string[] = Array.isArray(body.pageIds) ? body.pageIds : (body.pageId ? [body.pageId] : [])

    const result = await db.query(`
      UPDATE products SET
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        price = COALESCE($4, price),
        compare_at_price = $5,
        cost_per_item = $6,
        sku = COALESCE($7, sku),
        barcode = COALESCE($8, barcode),
        brand = COALESCE($9, brand),
        product_type = COALESCE($10, product_type),
        car_class = COALESCE($11, car_class),
        car_type = COALESCE($12, car_type),
        part_type = COALESCE($13, part_type),
        scale = COALESCE($14, scale),
        supplier = COALESCE($15, supplier),
        collections = COALESCE($16, collections),
        tags = COALESCE($17, tags),
        quantity = COALESCE($18, quantity),
        track_quantity = COALESCE($19, track_quantity),
        weight = $20,
        weight_unit = COALESCE($21, weight_unit),
        box_size = COALESCE($22, box_size),
        dimensions = COALESCE($23, dimensions),
        eta = COALESCE($24, eta),
        status = COALESCE($25, status),
        image_url = COALESCE($26, image_url),
        images = COALESCE($27, images),
        page_id = COALESCE($28, page_id),
        page_ids = COALESCE($29, page_ids),
        page_url = COALESCE($30, page_url),
        car_brands = COALESCE($31, car_brands),
        revo_parts = COALESCE($32, revo_parts),
        is_pre_order = COALESCE($33, is_pre_order),
        seo = COALESCE($34, seo),
        units = COALESCE($35, units),
        category_brands = COALESCE($37, category_brands),
        item_categories = COALESCE($38, item_categories),
        sales_account = COALESCE($39, sales_account),
        purchase_account = COALESCE($40, purchase_account),
        sideways_brands = COALESCE($41, sideways_brands),
        sideways_parts = COALESCE($42, sideways_parts),
        sideways_car_type = COALESCE($43, sideways_car_type),
        sideways_car_classes = COALESCE($44, sideways_car_classes),
        custom_orgs = COALESCE($45, custom_orgs),
        updated_at = $36
      WHERE id = $1
      RETURNING *
    `, [
      id,
      body.title ?? null,
      body.description ?? null,
      body.price != null ? body.price : null,
      body.compareAtPrice != null ? body.compareAtPrice : null,
      body.costPerItem != null ? body.costPerItem : null,
      body.sku ?? null,
      body.barcode ?? null,
      body.brand ?? null,
      body.productType ?? null,
      body.carClass ?? null,
      body.carType ?? null,
      body.partType ?? null,
      body.scale ?? null,
      body.supplier ?? null,
      body.collections != null ? JSON.stringify(body.collections) : null,
      body.tags != null ? JSON.stringify(body.tags) : null,
      body.quantity != null ? body.quantity : null,
      body.trackQuantity != null ? body.trackQuantity : null,
      body.weight != null ? body.weight : null,
      body.weightUnit ?? null,
      body.boxSize ?? null,
      body.dimensions != null ? JSON.stringify(body.dimensions) : null,
      body.eta ?? null,
      body.status ?? null,
      body.imageUrl ?? null,
      Array.isArray(body.images) ? JSON.stringify(body.images) : null,
      pageIds[0] ?? null,
      pageIds.length ? JSON.stringify(pageIds) : null,
      body.pageUrl ?? null,
      Array.isArray(body.carBrands) ? JSON.stringify(body.carBrands) : null,
      Array.isArray(body.revoParts) ? JSON.stringify(body.revoParts) : null,
      body.isPreOrder != null ? body.isPreOrder : null,
      body.seo != null ? JSON.stringify(body.seo) : null,
      Array.isArray(body.units) ? JSON.stringify(body.units) : null,
      now,
      Array.isArray(body.categoryBrands) ? JSON.stringify(body.categoryBrands) : null,
      Array.isArray(body.itemCategories) ? JSON.stringify(body.itemCategories) : null,
      body.salesAccount != null ? JSON.stringify(Array.isArray(body.salesAccount) ? body.salesAccount : []) : null,
      body.purchaseAccount != null ? JSON.stringify(Array.isArray(body.purchaseAccount) ? body.purchaseAccount : []) : null,
      Array.isArray(body.sidewaysBrands) ? JSON.stringify(body.sidewaysBrands) : null,
      Array.isArray(body.sidewaysParts) ? JSON.stringify(body.sidewaysParts) : null,
      Array.isArray(body.sidewaysCarTypes) ? JSON.stringify(body.sidewaysCarTypes) : null,
      Array.isArray(body.sidewaysCarClasses) ? JSON.stringify(body.sidewaysCarClasses) : null,
      (typeof body.customOrgs === 'object' && body.customOrgs !== null) ? JSON.stringify(body.customOrgs) : null,
    ])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json(rowToProduct(result.rows[0]))
  } catch (error: any) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: `Failed to update: ${error.message}` }, { status: 500 })
  }
}

// DELETE /api/admin/products/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await db.query(`DELETE FROM products WHERE id = $1`, [id])
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: `Failed to delete: ${error.message}` }, { status: 500 })
  }
}
