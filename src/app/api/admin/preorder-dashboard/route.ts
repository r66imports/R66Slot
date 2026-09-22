import { NextResponse } from 'next/server'
import {
  type PreOrderDashboardItem,
  uploadBase64Image,
  syncImageToProduct,
  getItems,
  saveItems,
} from '@/lib/preorder-helpers'
import { priceCards } from '@/lib/preorder-dashboard-price'

/**
 * Rule 63 — Est. Retail is derived on read, never served from the blob. Without
 * this the grid showed whatever the rate was the last time somebody happened to
 * open the card. Failures inside priceCards fall back to the stored string, so
 * a rate problem can slow the figures down but never blank them.
 */
async function withLivePrices(items: PreOrderDashboardItem[]): Promise<PreOrderDashboardItem[]> {
  const priced = await priceCards(items)
  return items.map((i) => {
    const p = priced.get(i)
    if (!p) return i
    return {
      ...i,
      estimatedRetailPrice: p.estimatedRetailPrice,
      priceSource: p.priceSource,
      priceFloating: p.priceFloating,
    } as PreOrderDashboardItem
  })
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const supplierFilter = searchParams.get('supplier')
    const items = await getItems()
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    if (supplierFilter !== null) {
      const filtered = items.filter(i => (i.supplier?.trim() || '— No Supplier') === supplierFilter)
      return NextResponse.json(await withLivePrices(filtered))
    }
    return NextResponse.json(await withLivePrices(items))
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
      // Costing calculator. Left undefined when not sent so the card falls back
      // to the 25/20/30/15 defaults rather than freezing a copy of them.
      shipPct: body.shipPct != null ? Number(body.shipPct) : undefined,
      customsPct: body.customsPct != null ? Number(body.customsPct) : undefined,
      markupPct: body.markupPct != null ? Number(body.markupPct) : undefined,
      vatPct: body.vatPct != null ? Number(body.vatPct) : undefined,
      priceManual: body.priceManual ?? undefined,
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
