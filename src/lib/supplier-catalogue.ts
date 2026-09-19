import { blobRead } from '@/lib/blob-storage'
import { db } from '@/lib/db'
import {
  accountById,
  calcEstRetailZAR,
  compareSku,
  DEFAULT_COSTING_ACCOUNTS,
  isLocalSupplierCurrency,
} from '@/lib/preorder-pricing'
import { getRates, rateFor } from '@/lib/exchange-rates'
import type { CostingAccount, SupplierCatalogueItem } from '@/types/supplier-preorder'
import type { SupplierContact } from '@/app/api/admin/supplier-contacts/route'

/**
 * What a client can put on a Supplier Pre Order.
 *
 * Two sources, merged on SKU:
 *
 *   products            — everything in Inventory with a brand. This is what
 *                         makes "pick a brand, get its SKUs" work without
 *                         anyone maintaining a second list by hand.
 *   supplier-catalogue  — the wholesale sheet. Adds SKUs we have never stocked
 *                         and, where present, the supplier's wholesale price.
 *
 * The catalogue wins on overlap: a wholesale price entered or imported there is
 * more current than anything Inventory can tell us.
 *
 * Listing a product here does NOT make the request inventory. Nothing in this
 * file writes; a pre-order never reserves or deducts (Rule 59).
 */

export interface MergedItem {
  id: string
  supplierId: string
  supplierName: string
  brand: string
  sku: string
  description: string
  estRetailZAR: number
  /**
   * catalogue — priced through the costing calculator from a wholesale price
   * product   — no wholesale known, falling back to what we already sell it for
   * unpriced  — neither; the client sees "On request" and admin prices it
   */
  priceSource: 'catalogue' | 'product' | 'unpriced'
  /** Admin-only; never sent to a client. */
  wholesalePrice: number
  currency: string
  inInventory: boolean
  /** Product photo when we carry the SKU; '' for a catalogue-only line. */
  imageUrl: string
  /** Inventory on hand. A request never touches it (Rule 59) — it is shown so
   *  both sides can see the item is already on the shelf before ordering it. */
  qtyAvailable: number
}

export interface BrandRow {
  brand: string
  supplierId: string
  supplierName: string
  count: number
}

interface ProductRow {
  sku: string
  title: string
  brand: string
  supplier: string | null
  price: string | number | null
  pre_order_price: string | number | null
  image_url: string | null
  images: string[] | null
  quantity: number | null
}

/** First usable photo: the primary image, else the first of the gallery. */
const firstImage = (p: { image_url: string | null; images: string[] | null }) => {
  const primary = (p.image_url || '').trim()
  if (primary) return primary
  const gallery = Array.isArray(p.images) ? p.images : []
  return (gallery.find((i) => typeof i === 'string' && i.trim()) || '').trim()
}

const upper = (s: string) => (s || '').trim().toUpperCase()

async function loadContext() {
  const [catalogue, suppliers, savedAccounts, rateData] = await Promise.all([
    blobRead<SupplierCatalogueItem[]>('data/supplier-catalogue.json', []),
    blobRead<SupplierContact[]>('data/supplier-contacts.json', []),
    blobRead<CostingAccount[]>('data/costing-accounts.json', []),
    getRates(),
  ])
  const accounts = savedAccounts.length > 0 ? savedAccounts : DEFAULT_COSTING_ACCOUNTS

  const supplierById = new Map(suppliers.map((s) => [s.id, s]))
  // Brand → supplier, so a product carrying only a brand still reaches a
  // currency and a costing account (Rule 61).
  const supplierByBrand = new Map<string, SupplierContact>()
  for (const s of suppliers) {
    for (const b of s.brands || []) supplierByBrand.set(b.toLowerCase(), s)
  }
  const supplierByName = new Map(suppliers.map((s) => [s.name.toLowerCase(), s]))

  return { catalogue, suppliers, accounts, rateData, supplierById, supplierByBrand, supplierByName }
}

type Ctx = Awaited<ReturnType<typeof loadContext>>

function resolveSupplier(ctx: Ctx, brand: string, supplierId?: string, supplierName?: string) {
  return (
    (supplierId ? ctx.supplierById.get(supplierId) : undefined) ||
    ctx.supplierByBrand.get((brand || '').toLowerCase()) ||
    (supplierName ? ctx.supplierByName.get(supplierName.toLowerCase()) : undefined)
  )
}

/** Brands a client may choose from — Inventory and the wholesale sheet combined. */
export async function getBrandIndex(): Promise<BrandRow[]> {
  const ctx = await loadContext()

  const rows = await db.query(
    `SELECT brand, COUNT(*)::int AS count
       FROM products
      WHERE status != 'archived' AND brand IS NOT NULL AND TRIM(brand) <> ''
      GROUP BY brand`
  )

  const map = new Map<string, BrandRow>()
  const add = (brand: string, count: number) => {
    const key = brand.toLowerCase()
    const existing = map.get(key)
    if (existing) {
      existing.count += count
      return
    }
    const supplier = resolveSupplier(ctx, brand)
    map.set(key, {
      brand,
      supplierId: supplier?.id || '',
      supplierName: supplier?.name || '',
      count,
    })
  }

  for (const r of rows.rows as { brand: string; count: number }[]) {
    add((r.brand || '').trim(), Number(r.count) || 0)
  }
  // Catalogue-only brands — things we can order but have never stocked.
  for (const item of ctx.catalogue) {
    if (item.active === false || !item.brand) continue
    if (!map.has(item.brand.toLowerCase())) add(item.brand, 0)
  }

  return [...map.values()].filter((b) => b.brand).sort((a, b) => a.brand.localeCompare(b.brand))
}

/**
 * Items for the given brands, or — when `search` is set with no brands — the
 * matches across every brand, so a client who knows the SKU need not guess
 * which brand it belongs to first.
 */
export async function getMergedItems(opts: {
  brands?: string[]
  search?: string
  /** Exact SKUs — used when pricing submitted lines rather than browsing. */
  skus?: string[]
  limit?: number
}): Promise<MergedItem[]> {
  const brands = (opts.brands || []).map((b) => b.trim().toLowerCase()).filter(Boolean)
  const search = (opts.search || '').trim().toLowerCase()
  const skus = (opts.skus || []).map(upper).filter(Boolean)
  const limit = Math.min(opts.limit || 500, 1000)
  if (brands.length === 0 && !search && skus.length === 0) return []

  const ctx = await loadContext()

  const where: string[] = [`status != 'archived'`]
  const params: any[] = []
  // A SKU lookup must not require a brand — an Inventory row with a blank brand
  // still has to price when a client asks for it by SKU.
  if (skus.length > 0) {
    params.push(skus)
    where.push(`UPPER(TRIM(sku)) = ANY($${params.length})`)
  } else {
    where.push(`brand IS NOT NULL`, `TRIM(brand) <> ''`)
  }
  if (brands.length > 0) {
    params.push(brands)
    where.push(`LOWER(TRIM(brand)) = ANY($${params.length})`)
  }
  if (search) {
    params.push(`%${search}%`)
    where.push(`(LOWER(sku) LIKE $${params.length} OR LOWER(title) LIKE $${params.length})`)
  }
  params.push(limit)

  const rows = await db.query(
    `SELECT sku, title, brand, supplier, price, pre_order_price, image_url, images, quantity
       FROM products
      WHERE ${where.join(' AND ')}
      ORDER BY sku ASC
      LIMIT $${params.length}`,
    params
  )

  const bySku = new Map<string, MergedItem>()

  for (const p of rows.rows as ProductRow[]) {
    const sku = upper(p.sku)
    if (!sku || bySku.has(sku)) continue
    const brand = (p.brand || '').trim()
    const supplier = resolveSupplier(ctx, brand, undefined, p.supplier || undefined)
    // pre_order_price is set precisely for items bought ahead, so it beats the
    // shelf price when both exist.
    const fallback = Number(p.pre_order_price) || Number(p.price) || 0
    bySku.set(sku, {
      id: `p:${sku}`,
      supplierId: supplier?.id || '',
      supplierName: supplier?.name || (p.supplier || ''),
      brand,
      sku,
      description: (p.title || '').trim(),
      estRetailZAR: Math.round(fallback * 100) / 100,
      priceSource: fallback > 0 ? 'product' : 'unpriced',
      wholesalePrice: 0,
      currency: (supplier?.preferredCurrency || 'EUR').toUpperCase(),
      inInventory: true,
      imageUrl: firstImage(p),
      qtyAvailable: Number(p.quantity) || 0,
    })
  }

  // Catalogue on top — adds unstocked SKUs and overrides price where we know
  // what the supplier charges.
  for (const item of ctx.catalogue) {
    if (item.active === false || !item.sku) continue
    const sku = upper(item.sku)
    if (skus.length > 0) {
      if (!skus.includes(sku)) continue
    } else {
      const brandMatch = brands.length === 0 || brands.includes((item.brand || '').toLowerCase())
      const searchMatch =
        !search ||
        sku.toLowerCase().includes(search) ||
        (item.description || '').toLowerCase().includes(search)
      if (!brandMatch || !searchMatch) continue
    }

    const supplier = resolveSupplier(ctx, item.brand, item.supplierId, item.supplierName)
    const account = accountById(ctx.accounts, supplier?.defaultAccount)
    const currency = (item.currency || supplier?.preferredCurrency || 'EUR').toUpperCase()
    const rate = rateFor(ctx.rateData.rates, currency)
    // Local suppliers skip the calculator and keep the retail we already sell
    // at; a local SKU we have never stocked reads "On request" (Rule 65).
    const calculated = isLocalSupplierCurrency(currency)
      ? 0
      : calcEstRetailZAR(item.wholesalePrice, rate, account)

    const existing = bySku.get(sku)
    bySku.set(sku, {
      id: item.id,
      supplierId: supplier?.id || item.supplierId || '',
      supplierName: supplier?.name || item.supplierName || '',
      brand: item.brand || existing?.brand || '',
      sku,
      description: (item.description || existing?.description || '').trim(),
      estRetailZAR:
        calculated > 0
          ? Math.round(calculated * 100) / 100
          : existing?.estRetailZAR || 0,
      priceSource:
        calculated > 0 ? 'catalogue' : existing && existing.estRetailZAR > 0 ? 'product' : 'unpriced',
      wholesalePrice: item.wholesalePrice || 0,
      currency,
      inInventory: existing?.inInventory || false,
      // The catalogue is a price sheet — it never carries a photo or stock, so
      // whatever Inventory knew about the SKU stands.
      imageUrl: existing?.imageUrl || '',
      qtyAvailable: existing?.qtyAvailable || 0,
    })
  }

  return [...bySku.values()]
    .sort((a, b) => a.brand.localeCompare(b.brand) || compareSku(a.sku, b.sku))
    .slice(0, limit)
}

/** Items by exact SKU, keyed for pricing submitted lines server-side. */
export async function findBySkus(skus: string[]): Promise<Map<string, MergedItem>> {
  const wanted = [...new Set(skus.map(upper).filter(Boolean))]
  if (wanted.length === 0) return new Map()
  const items = await getMergedItems({ skus: wanted, limit: 1000 })
  return new Map(items.map((i) => [i.sku, i]))
}

/** Photo and on-hand qty per SKU, for rendering lines that were stored without them. */
export interface SkuInfo {
  imageUrl: string
  qtyAvailable: number
  title: string
}

export async function getSkuInfo(skus: string[]): Promise<Record<string, SkuInfo>> {
  const wanted = [...new Set(skus.map(upper).filter(Boolean))]
  if (wanted.length === 0) return {}

  const rows = await db.query(
    `SELECT sku, title, image_url, images, quantity
       FROM products
      WHERE UPPER(TRIM(sku)) = ANY($1)`,
    [wanted]
  )

  const out: Record<string, SkuInfo> = {}
  for (const p of rows.rows as ProductRow[]) {
    const sku = upper(p.sku)
    if (!sku || out[sku]) continue
    out[sku] = {
      imageUrl: firstImage(p),
      qtyAvailable: Number(p.quantity) || 0,
      title: (p.title || '').trim(),
    }
  }
  return out
}
