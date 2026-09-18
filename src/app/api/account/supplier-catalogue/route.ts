import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { blobRead } from '@/lib/blob-storage'
import { getRates, rateFor } from '@/lib/exchange-rates'
import { accountById, calcEstRetailZAR, compareSku, DEFAULT_COSTING_ACCOUNTS } from '@/lib/preorder-pricing'
import type {
  ClientCatalogueItem,
  CostingAccount,
  SupplierCatalogueItem,
} from '@/types/supplier-preorder'
import { PRICE_DISCLAIMER } from '@/types/supplier-preorder'
import type { SupplierContact } from '@/app/api/admin/supplier-contacts/route'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

/**
 * Customer-facing read of the supplier sheet.
 *
 * This route exists instead of letting the storefront call /api/admin/* (which
 * middleware closes) and, more importantly, so wholesale prices and the costing
 * percentages never leave the server. The client receives an estimated ZAR
 * retail per SKU and nothing else.
 */
export async function GET(request: NextRequest) {
  try {
    const token = (await cookies()).get('customer_token')?.value
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    jwt.verify(token, JWT_SECRET)

    const { searchParams } = new URL(request.url)
    const brandParam = (searchParams.get('brands') || '').trim()
    const wanted = brandParam ? brandParam.split(',').map((b) => b.trim().toLowerCase()).filter(Boolean) : []
    const q = (searchParams.get('q') || '').trim().toLowerCase()

    const [catalogue, suppliers, savedAccounts, rateData] = await Promise.all([
      blobRead<SupplierCatalogueItem[]>('data/supplier-catalogue.json', []),
      blobRead<SupplierContact[]>('data/supplier-contacts.json', []),
      blobRead<CostingAccount[]>('data/costing-accounts.json', []),
      getRates(),
    ])

    const accounts = savedAccounts.length > 0 ? savedAccounts : DEFAULT_COSTING_ACCOUNTS
    const supplierById = new Map(suppliers.map((s) => [s.id, s]))

    const live = catalogue.filter((i) => i.active !== false && i.sku)

    // Brand index — built from what is actually orderable, so a brand with an
    // empty sheet never shows up as a choice.
    const brandMap = new Map<string, { brand: string; supplierId: string; supplierName: string; count: number }>()
    for (const item of live) {
      const key = item.brand.toLowerCase()
      if (!key) continue
      const existing = brandMap.get(key)
      if (existing) {
        existing.count++
      } else {
        brandMap.set(key, {
          brand: item.brand,
          supplierId: item.supplierId,
          supplierName: item.supplierName || supplierById.get(item.supplierId)?.name || '',
          count: 1,
        })
      }
    }
    const brands = [...brandMap.values()].sort((a, b) => a.brand.localeCompare(b.brand))

    // No brand selected yet — send the index only, not the whole catalogue.
    if (wanted.length === 0) {
      return NextResponse.json({
        brands,
        items: [],
        rateFetchedAt: rateData.fetchedAt,
        disclaimer: PRICE_DISCLAIMER,
      })
    }

    let selected = live.filter((i) => wanted.includes(i.brand.toLowerCase()))
    if (q) {
      selected = selected.filter(
        (i) => i.sku.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
      )
    }

    const items: ClientCatalogueItem[] = selected.map((i) => {
      const supplier = supplierById.get(i.supplierId)
      const currency = (i.currency || supplier?.preferredCurrency || 'EUR').toUpperCase()
      const account = accountById(accounts, supplier?.defaultAccount)
      const rate = rateFor(rateData.rates, currency)
      return {
        id: i.id,
        supplierId: i.supplierId,
        supplierName: i.supplierName || supplier?.name || '',
        brand: i.brand,
        sku: i.sku,
        description: i.description,
        estRetailZAR: Math.round(calcEstRetailZAR(i.wholesalePrice, rate, account) * 100) / 100,
      }
    })

    items.sort((a, b) => a.brand.localeCompare(b.brand) || compareSku(a.sku, b.sku))

    return NextResponse.json({
      brands,
      items,
      rateFetchedAt: rateData.fetchedAt,
      disclaimer: PRICE_DISCLAIMER,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
