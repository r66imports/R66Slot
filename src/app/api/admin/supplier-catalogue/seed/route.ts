import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import { db } from '@/lib/db'
import type { SupplierCatalogueItem } from '@/types/supplier-preorder'
import type { SupplierContact } from '../../supplier-contacts/route'
import type { PricelistEntry } from '../../inventory-pricelists/route'

const KEY = 'data/supplier-catalogue.json'

/**
 * Build the orderable sheet from what we already know, so nobody has to retype a
 * catalogue that exists in two places already:
 *
 *   inventory-pricelists  → supplierId + SKU + wholesale price
 *   products              → brand + title for that SKU
 *
 * Existing catalogue rows win: a price edited or imported here is more current
 * than a pricelist entry, so seeding never overwrites one. Nothing is written
 * back to products and no stock moves — this only fills the request sheet.
 *
 * POST ?dryRun=true to see what it would add without writing.
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dryRun = searchParams.get('dryRun') === 'true'
    const onlySupplier = searchParams.get('supplierId')

    const [existing, pricelists, suppliers, productRows] = await Promise.all([
      blobRead<SupplierCatalogueItem[]>(KEY, []),
      blobRead<PricelistEntry[]>('data/inventory-pricelists.json', []),
      blobRead<SupplierContact[]>('data/supplier-contacts.json', []),
      db.query(`SELECT sku, title, brand FROM products WHERE status != 'archived'`),
    ])

    const supplierById = new Map(suppliers.map((s) => [s.id, s]))
    const productBySku = new Map<string, { sku: string; title: string; brand: string }>()
    for (const p of productRows.rows as any[]) {
      const sku = (p?.sku || '').trim().toUpperCase()
      if (sku && !productBySku.has(sku)) productBySku.set(sku, p)
    }

    const have = new Set(existing.map((e) => `${e.supplierId}::${e.sku.toUpperCase()}`))
    const now = new Date().toISOString()
    const added: SupplierCatalogueItem[] = []
    const skippedNoBrand: string[] = []

    for (const entry of pricelists) {
      const supplierId = (entry.supplierId || '').trim()
      const sku = (entry.sku || '').trim().toUpperCase()
      if (!supplierId || !sku) continue
      if (onlySupplier && supplierId !== onlySupplier) continue
      if (have.has(`${supplierId}::${sku}`)) continue

      const supplier = supplierById.get(supplierId)
      const product = productBySku.get(sku)
      // Without a brand the item can never be found on the client sheet, which
      // is brand-first. Flag those rather than burying them in the catalogue.
      const brand = (product?.brand || '').trim()
      if (!brand) {
        skippedNoBrand.push(sku)
        continue
      }

      have.add(`${supplierId}::${sku}`)
      added.push({
        id: `sc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        supplierId,
        supplierName: supplier?.name || '',
        brand,
        sku,
        description: (product?.title || '').trim(),
        wholesalePrice: Number(entry.wholesalePrice) || 0,
        // The price list entry's own currency wins — re-deriving it from the
        // supplier is what let a EUR price be read as ZAR in the first place.
        currency: (entry.currency || supplier?.preferredCurrency || '').toUpperCase(),
        source: 'inventory',
        active: true,
        createdAt: now,
        updatedAt: now,
      })
    }

    if (!dryRun && added.length > 0) {
      await blobWrite(KEY, [...existing, ...added])
    }

    return NextResponse.json({
      dryRun,
      added: added.length,
      alreadyPresent: existing.length,
      skippedNoBrand: skippedNoBrand.length,
      skippedNoBrandSkus: skippedNoBrand.slice(0, 50),
      brands: [...new Set(added.map((a) => a.brand))].sort(),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Seed failed' }, { status: 500 })
  }
}
