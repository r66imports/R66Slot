import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import { compareSku } from '@/lib/preorder-pricing'
import type { SupplierCatalogueItem } from '@/types/supplier-preorder'

const KEY = 'data/supplier-catalogue.json'

/**
 * The orderable sheet clients browse. Deliberately separate from Inventory: a
 * catalogue row is something a supplier can sell us, not something we own. No
 * row here creates a product or moves stock.
 */
async function getCatalogue(): Promise<SupplierCatalogueItem[]> {
  return await blobRead<SupplierCatalogueItem[]>(KEY, [])
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplierId')
    const brand = searchParams.get('brand')
    const q = (searchParams.get('q') || '').trim().toLowerCase()
    const includeInactive = searchParams.get('all') === 'true'

    let items = await getCatalogue()
    if (!includeInactive) items = items.filter((i) => i.active !== false)
    if (supplierId) items = items.filter((i) => i.supplierId === supplierId)
    if (brand) items = items.filter((i) => i.brand.toLowerCase() === brand.toLowerCase())
    if (q) {
      items = items.filter(
        (i) => i.sku.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
      )
    }

    items.sort((a, b) => a.brand.localeCompare(b.brand) || compareSku(a.sku, b.sku))
    return NextResponse.json(items)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

function normalize(body: any, existing?: SupplierCatalogueItem): SupplierCatalogueItem {
  const now = new Date().toISOString()
  return {
    id: existing?.id || `sc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    supplierId: (body.supplierId ?? existing?.supplierId ?? '').trim(),
    supplierName: (body.supplierName ?? existing?.supplierName ?? '').trim(),
    brand: (body.brand ?? existing?.brand ?? '').trim(),
    sku: (body.sku ?? existing?.sku ?? '').trim().toUpperCase(),
    description: (body.description ?? existing?.description ?? '').trim(),
    wholesalePrice: Number(body.wholesalePrice ?? existing?.wholesalePrice ?? 0) || 0,
    currency: (body.currency ?? existing?.currency ?? 'EUR').trim().toUpperCase(),
    source: body.source ?? existing?.source ?? 'manual',
    active: body.active === undefined ? existing?.active ?? true : !!body.active,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }
}

/**
 * POST — upsert one item or many. Keyed on supplierId + SKU so re-importing a
 * price list refreshes prices instead of duplicating every row.
 * Body: { items: [...] } or a single item.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const incoming: any[] = Array.isArray(body.items) ? body.items : [body]
    const usable = incoming.filter((i) => (i?.sku || '').trim())
    if (usable.length === 0) {
      return NextResponse.json({ error: 'No items with a SKU to save' }, { status: 400 })
    }

    const all = await getCatalogue()
    let added = 0
    let updated = 0

    for (const raw of usable) {
      const supplierId = (raw.supplierId || '').trim()
      const sku = (raw.sku || '').trim().toUpperCase()
      const idx = all.findIndex((e) => e.supplierId === supplierId && e.sku === sku)
      if (idx >= 0) {
        all[idx] = normalize(raw, all[idx])
        updated++
      } else {
        all.push(normalize(raw))
        added++
      }
    }

    await blobWrite(KEY, all)
    return NextResponse.json({ success: true, added, updated, total: all.length }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save' }, { status: 500 })
  }
}

// DELETE — ?id= one row, or ?supplierId= to clear a supplier's whole sheet.
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const supplierId = searchParams.get('supplierId')
    if (!id && !supplierId) {
      return NextResponse.json({ error: 'id or supplierId required' }, { status: 400 })
    }

    const all = await getCatalogue()
    const kept = id ? all.filter((e) => e.id !== id) : all.filter((e) => e.supplierId !== supplierId)
    await blobWrite(KEY, kept)
    return NextResponse.json({ success: true, removed: all.length - kept.length })
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
