import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import { r2Upload } from '@/lib/r2-storage'
import { db } from '@/lib/db'

// If imageUrl is a base64 data URL, upload it to R2 and return the R2 URL instead.
// This keeps the JSON blob small — base64 images can be 1-5MB each.
export async function uploadBase64Image(imageUrl: string | undefined): Promise<string | undefined> {
  if (!imageUrl?.startsWith('data:')) return imageUrl
  try {
    const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return imageUrl
    const [, contentType, base64] = match
    const buffer = Buffer.from(base64, 'base64')
    const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
    const key = `uploads/preorder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    return await r2Upload(key, buffer, contentType)
  } catch (e: any) {
    console.error('[preorder] base64 image upload failed:', e?.message)
    return imageUrl
  }
}

const KEY = 'data/preorder-dashboard.json'

// ── Sync pre-order image → product media ──────────────────────────────────────
export async function syncImageToProduct(sku: string, imageUrl: string): Promise<void> {
  if (!sku || !imageUrl) return
  try {
    const prodResult = await db.query(
      `SELECT id, image_url, images FROM products WHERE LOWER(sku) = LOWER($1) LIMIT 1`,
      [sku]
    )
    if (!prodResult.rows.length) return
    const prod = prodResult.rows[0]
    const existingImages: string[] = Array.isArray(prod.images) ? prod.images : []
    const newImages = existingImages.includes(imageUrl)
      ? existingImages
      : [imageUrl, ...existingImages]
    // Always set as primary so the product card shows the latest pre-order image
    await db.query(
      `UPDATE products SET image_url = $1, images = $2, updated_at = NOW() WHERE id = $3`,
      [imageUrl, JSON.stringify(newImages), prod.id]
    )
  } catch (err: any) {
    console.error('[preorder→product image sync]', err?.message)
  }
}

// 30-second in-memory cache — keeps the page snappy for repeat loads without DB round-trips
let _cache: { items: PreOrderDashboardItem[]; ts: number } | null = null
const CACHE_TTL = 30_000

function getCached(): PreOrderDashboardItem[] | null {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) return _cache.items
  return null
}
function setCache(items: PreOrderDashboardItem[]) {
  _cache = { items, ts: Date.now() }
}
export function invalidateCache() {
  _cache = null
}

export interface PreOrderDashboardItem {
  id: string
  sku: string
  description: string
  retailPrice: string
  estimatedRetailPrice: string
  wholesalePrice?: string
  wholesaleCurrency?: string
  supplierSRP?: string
  supplierDiscount?: string
  eta: string
  cutoffDate?: string
  orderPlaced?: boolean
  published?: boolean
  supplier: string
  brand: string
  unit: string
  imageUrl?: string
  seoTitle?: string
  seoDescription?: string
  seoImageUrl?: string
  shipmentStatus?: 'preorder' | 'shipping_soon' | 'shipping'
  linkedWsId?: string
  customers: { id: string; name: string; email?: string; phone?: string; qty: number; depositPaid?: boolean; depositPaidDate?: string }[]
  // Pricing Tier 2
  wholesalePrice2?: string
  wholesaleCurrency2?: string
  supplierSRP2?: string
  supplierDiscount2?: string
  estimatedRetailPrice2?: string
  moq2Qty?: number
  moq2Enabled?: boolean
  moq2ResellerOnly?: boolean
  showRetail?: boolean
  // Resellers Sales Page
  onSalesPage?: boolean
  salesTier1Discount?: number
  salesTier2Discount?: number
  createdAt: string
  updatedAt?: string
}

async function getItems(): Promise<PreOrderDashboardItem[]> {
  const cached = getCached()
  if (cached) return cached
  const items = await blobRead<PreOrderDashboardItem[]>(KEY, [])
  setCache(items)
  return items
}

async function saveItems(items: PreOrderDashboardItem[]): Promise<void> {
  await blobWrite(KEY, items)
  setCache(items)
}

export async function GET() {
  try {
    const items = await getItems()
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return NextResponse.json(items)
  } catch (error) {
    console.error('Error fetching preorder dashboard items:', error)
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const items = await getItems()

    const now = new Date().toISOString()
    const newItem: PreOrderDashboardItem = {
      id: `pod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sku: body.sku?.trim() || '',
      description: body.description?.trim() || '',
      retailPrice: body.retailPrice?.trim() || '',
      estimatedRetailPrice: body.estimatedRetailPrice?.trim() || '',
      wholesalePrice: body.wholesalePrice?.trim() || undefined,
      wholesaleCurrency: body.wholesaleCurrency?.trim() || undefined,
      supplierSRP: body.supplierSRP?.trim() || undefined,
      supplierDiscount: body.supplierDiscount?.trim() || undefined,
      eta: body.eta?.trim() || '',
      cutoffDate: body.cutoffDate || undefined,
      supplier: body.supplier?.trim() || '',
      brand: body.brand?.trim() || '',
      unit: body.unit?.trim() || '',
      imageUrl: await uploadBase64Image(body.imageUrl) || undefined,
      seoTitle: body.seoTitle?.trim() || undefined,
      seoDescription: body.seoDescription?.trim() || undefined,
      seoImageUrl: await uploadBase64Image(body.seoImageUrl) || undefined,
      customers: body.customers || [],
      // Pricing Tier 2
      wholesalePrice2: body.wholesalePrice2?.trim() || undefined,
      wholesaleCurrency2: body.wholesaleCurrency2?.trim() || undefined,
      supplierSRP2: body.supplierSRP2?.trim() || undefined,
      supplierDiscount2: body.supplierDiscount2?.trim() || undefined,
      estimatedRetailPrice2: body.estimatedRetailPrice2?.trim() || undefined,
      moq2Qty: body.moq2Qty ? Number(body.moq2Qty) : undefined,
      moq2Enabled: body.moq2Enabled ?? false,
      moq2ResellerOnly: body.moq2ResellerOnly ?? false,
      createdAt: now,
    }

    items.unshift(newItem)
    await saveItems(items)

    // Sync image to product media on creation
    if (newItem.imageUrl && newItem.sku) {
      await syncImageToProduct(newItem.sku, newItem.imageUrl)
    }

    return NextResponse.json(newItem, { status: 201 })
  } catch (error) {
    console.error('Error creating preorder dashboard item:', error)
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
  }
}
