import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import { uploadBase64Image, invalidateCache, syncImageToProduct } from '../route'
import type { PreOrderDashboardItem } from '../route'

const KEY = 'data/preorder-dashboard.json'

// ── Targeted helpers — operate on a single item without touching the full array ──

async function getItemById(id: string): Promise<PreOrderDashboardItem | null> {
  const result = await db.query(
    `SELECT elem
     FROM json_store, jsonb_array_elements(value::jsonb) elem
     WHERE key = $1 AND elem->>'id' = $2`,
    [KEY, id]
  )
  return result.rows.length ? result.rows[0].elem : null
}

async function patchItemById(id: string, updated: PreOrderDashboardItem): Promise<void> {
  await db.query(
    `UPDATE json_store
     SET value = (
       SELECT jsonb_agg(
         CASE WHEN elem->>'id' = $2::text THEN $3::jsonb ELSE elem END
       )
       FROM jsonb_array_elements(value::jsonb) elem
     ), updated_at = NOW()
     WHERE key = $1`,
    [KEY, id, JSON.stringify(updated)]
  )
  invalidateCache()
}

async function deleteItemById(id: string): Promise<boolean> {
  const result = await db.query(
    `UPDATE json_store
     SET value = (
       SELECT jsonb_agg(elem)
       FROM jsonb_array_elements(value::jsonb) elem
       WHERE elem->>'id' != $2::text
     ), updated_at = NOW()
     WHERE key = $1`,
    [KEY, id]
  )
  invalidateCache()
  return (result.rowCount ?? 0) > 0
}

// ── Fallback helpers (for GET list and POST) ──────────────────────────────────

async function getItems(): Promise<PreOrderDashboardItem[]> {
  return await blobRead<PreOrderDashboardItem[]>(KEY, [])
}

async function saveItems(items: PreOrderDashboardItem[]): Promise<void> {
  invalidateCache()
  await blobWrite(KEY, items)
}

// ── Routes ────────────────────────────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const item = await getItemById(id)
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(item)
  } catch (error) {
    console.error('Error fetching preorder dashboard item:', error)
    return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Only upload base64 — skip if already a URL (biggest latency killer)
    if ('imageUrl' in body && body.imageUrl?.startsWith('data:')) {
      body.imageUrl = await uploadBase64Image(body.imageUrl)
    }
    if ('seoImageUrl' in body && body.seoImageUrl?.startsWith('data:')) {
      body.seoImageUrl = await uploadBase64Image(body.seoImageUrl)
    }

    // Read ONLY this item — not the full array
    const current = await getItemById(id)
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const allowedFields = [
      'sku', 'description', 'retailPrice', 'estimatedRetailPrice',
      'wholesalePrice', 'wholesaleCurrency', 'supplierSRP', 'supplierDiscount',
      'eta', 'cutoffDate', 'orderPlaced', 'published',
      'supplier', 'brand', 'unit', 'imageUrl', 'customers',
      'minOrderQty', 'extraQty', 'resellerMoq', 'resellerOnly',
      'seoTitle', 'seoDescription', 'seoImageUrl', 'shipmentStatus', 'linkedWsId',
      // Pricing Tier 2
      'wholesalePrice2', 'wholesaleCurrency2', 'supplierSRP2', 'supplierDiscount2',
      'estimatedRetailPrice2', 'moq2Qty', 'moq2Enabled', 'moq2ResellerOnly',
      'showRetail',
      'onSalesPage', 'salesTier1Discount', 'salesTier2Discount',
      'notes',
    ]
    const updated: PreOrderDashboardItem = { ...current, updatedAt: new Date().toISOString() }
    for (const field of allowedFields) {
      if (field in body) (updated as any)[field] = body[field]
    }

    // Auto-unpublish only when Supplier Order is set and fully booked
    if (!('published' in body) && updated.published) {
      const supplierOrder = (updated as any).minOrderQty ?? 0
      if (supplierOrder > 0) {
        const customers = (updated as any).customers ?? []
        const totalReserved = customers.reduce((s: number, c: any) => s + (c.qty || 0), 0)
        if (totalReserved >= supplierOrder) {
          (updated as any).published = false
          ;(updated as any).soldOutAt = new Date().toISOString()
        }
      }
    }

    // Write ONLY this item back — single SQL statement, no full array rewrite
    await patchItemById(id, updated)

    // Sync imageUrl → matching product's media when image was changed
    const newImageUrl = (updated as any).imageUrl as string | undefined
    const sku = (updated as any).sku as string | undefined
    if ('imageUrl' in body && newImageUrl && sku) {
      await syncImageToProduct(sku, newImageUrl)
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating preorder dashboard item:', error)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ok = await deleteItemById(id)
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting preorder dashboard item:', error)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}
