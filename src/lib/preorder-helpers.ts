// Shared pre-order dashboard helpers.
// These live here rather than in the route file because a Next.js route module may only
// export its HTTP verbs and config keys — exporting helpers from route.ts breaks the
// generated route type contract (`not assignable to type 'never'`).
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

export const KEY = 'data/preorder-dashboard.json'

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

export async function getItems(): Promise<PreOrderDashboardItem[]> {
  const cached = getCached()
  if (cached) return cached
  const items = await blobRead<PreOrderDashboardItem[]>(KEY, [])
  setCache(items)
  return items
}

export async function saveItems(items: PreOrderDashboardItem[]): Promise<void> {
  await blobWrite(KEY, items)
  setCache(items)
}

