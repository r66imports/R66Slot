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
    pageUrl: row.page_url,
    seo: row.seo || { metaTitle: '', metaDescription: '', metaKeywords: '' },
    sageItemCode: row.sage_item_code,
    sageLastSynced: row.sage_last_synced,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

    const result = await db.query(`
      UPDATE products SET
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        price = COALESCE($4, price),
        sku = COALESCE($5, sku),
        brand = COALESCE($6, brand),
        product_type = COALESCE($7, product_type),
        car_class = COALESCE($8, car_class),
        car_type = COALESCE($9, car_type),
        part_type = COALESCE($10, part_type),
        scale = COALESCE($11, scale),
        supplier = COALESCE($12, supplier),
        collections = COALESCE($13, collections),
        tags = COALESCE($14, tags),
        quantity = COALESCE($15, quantity),
        eta = COALESCE($16, eta),
        status = COALESCE($17, status),
        image_url = COALESCE($18, image_url),
        page_id = COALESCE($19, page_id),
        page_url = COALESCE($20, page_url),
        seo = COALESCE($21, seo),
        updated_at = $22
      WHERE id = $1
      RETURNING *
    `, [
      id,
      body.title ?? null,
      body.description ?? null,
      body.price != null ? body.price : null,
      body.sku ?? null,
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
      body.eta ?? null,
      body.status ?? null,
      body.imageUrl ?? null,
      body.pageId ?? null,
      body.pageUrl ?? null,
      body.seo != null ? JSON.stringify(body.seo) : null,
      now,
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
