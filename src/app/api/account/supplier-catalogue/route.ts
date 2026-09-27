import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { getRates } from '@/lib/exchange-rates'
import { hidesClientRetail } from '@/lib/preorder-pricing'
import {
  getBrandIndex,
  getCatalogueVersion,
  getMergedItems,
  getOnOrderQtyBySku,
} from '@/lib/supplier-catalogue'
import { PRICE_DISCLAIMER } from '@/types/supplier-preorder'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

/**
 * Customer-facing read of the orderable sheet.
 *
 * Items come from Inventory merged with the wholesale catalogue, so picking a
 * brand lists every SKU we carry for it without anyone maintaining a second
 * list. Wholesale prices and the costing percentages are stripped here — a
 * client only ever receives an estimated ZAR retail.
 *
 * ?brands=a,b   items for those brands
 * ?q=text       search SKU and description; works with or without a brand, so a
 *               client who knows the SKU need not guess its brand first
 */
export async function GET(request: NextRequest) {
  try {
    const token = (await cookies()).get('customer_token')?.value
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const decoded = jwt.verify(token, JWT_SECRET) as any

    const { searchParams } = new URL(request.url)
    const brandParam = (searchParams.get('brands') || '').trim()
    const brands = brandParam ? brandParam.split(',').map((b) => b.trim()).filter(Boolean) : []
    const q = (searchParams.get('q') || '').trim()

    // Scoped to this client: a client is shown what THEY have on order, never
    // another client's demand.
    const [brandIndex, rateData, onOrder, version] = await Promise.all([
      getBrandIndex(),
      getRates(),
      getOnOrderQtyBySku({ customerId: decoded?.id, email: decoded?.email }),
      getCatalogueVersion(),
    ])

    const items =
      brands.length === 0 && !q
        ? []
        : (await getMergedItems({ brands, search: q, limit: 500 })).map((i) => ({
            id: i.id,
            supplierId: i.supplierId,
            supplierName: i.supplierName,
            brand: i.brand,
            sku: i.sku,
            description: i.description,
            estRetailZAR: i.estRetailZAR,
            // Cleared, not hidden in the UI: a figure the client is not meant
            // to read should not reach the browser at all.
            retailZAR: hidesClientRetail(i.supplierName) ? 0 : i.retailZAR,
            imageUrl: i.imageUrl,
            qtyAvailable: i.qtyAvailable,
            qtyOnOrder: onOrder[i.sku.trim().toUpperCase()] || 0,
          }))

    return NextResponse.json({
      brands: brandIndex,
      items,
      version,
      rateFetchedAt: rateData.fetchedAt,
      disclaimer: PRICE_DISCLAIMER,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
