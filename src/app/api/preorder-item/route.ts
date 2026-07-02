import { NextRequest, NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'

const KEY = 'data/preorder-dashboard.json'

interface DashboardCustomer { qty: number }

interface DashboardItem {
  id: string
  sku: string
  description: string
  retailPrice: string
  estimatedRetailPrice: string
  eta: string
  cutoffDate?: string
  orderPlaced?: boolean
  published?: boolean
  supplier: string
  brand: string
  unit: string
  imageUrl?: string
  createdAt: string
  minOrderQty?: number
  resellerMoq?: number
  resellerOnly?: boolean
  customers?: DashboardCustomer[]
  shipmentStatus?: string
  moq2Enabled?: boolean
  moq2ResellerOnly?: boolean
  moq2Qty?: number
  estimatedRetailPrice2?: string
}

function buildPublicItem(item: DashboardItem, includeResellerOnly: boolean) {
  const totalReserved = (item.customers ?? []).reduce((s, c) => s + (c.qty || 0), 0)
  const moq = item.minOrderQty ?? 0
  const moqGap = moq > 0 ? moq - totalReserved : 0

  // Tier 2: only expose when enabled + reseller-only flag set + viewing as reseller
  const tier2Visible = includeResellerOnly && item.moq2Enabled && item.moq2ResellerOnly && !!item.estimatedRetailPrice2

  // Only expose availableQty when extraQty is a positive number.
  // extraQty=0 (default/unset) must NOT show "Sold Out" — it just means no qty limit was entered.
  const extraQtyPositive: number | null = ((item as any).extraQty > 0) ? (item as any).extraQty : null
  const availableQty: number | null = moq > 0
    ? Math.max(0, moq - totalReserved)
    : extraQtyPositive !== null ? Math.max(0, extraQtyPositive - totalReserved) : null

  return {
    id: item.id,
    sku: item.sku,
    description: item.description,
    retailPrice: item.retailPrice,
    estimatedRetailPrice: item.estimatedRetailPrice,
    eta: item.eta,
    cutoffDate: item.cutoffDate,
    brand: item.brand,
    unit: item.unit,
    imageUrl: item.imageUrl,
    createdAt: item.createdAt,
    minOrderQty: moq > 0 ? moq : undefined,
    totalReserved: moq > 0 ? totalReserved : undefined,
    moqMet: moq > 0 ? moqGap <= 0 : undefined,
    moqGap: moq > 0 ? moqGap : undefined,
    availableQty,
    shipmentStatus: (item as any).shipmentStatus || undefined,
    resellerMoq: includeResellerOnly ? (item.resellerMoq ?? 1) : undefined,
    resellerOnly: item.resellerOnly || false,
    // Tier 2
    tier2Price: tier2Visible ? item.estimatedRetailPrice2 : undefined,
    tier2Moq: tier2Visible ? (item.moq2Qty ?? 0) : undefined,
    tier2Reached: tier2Visible ? totalReserved >= (item.moq2Qty ?? 0) : undefined,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isReseller = searchParams.get('reseller') === '1'

    const items = await blobRead<DashboardItem[]>(KEY, [])
    let published = items.filter((i: any) => i.published === true)

    // Regular page: hide reseller-only items
    // Reseller page: show everything
    if (!isReseller) {
      published = published.filter((i: any) => !i.resellerOnly)
    }

    // Hide sold-out items from the public page
    published = published.filter((item: any) => {
      const totalReserved = (item.customers ?? []).reduce((s: number, c: any) => s + (c.qty || 0), 0)
      const moq = item.minOrderQty ?? 0
      const extraQty = item.extraQty ?? 0
      if (moq > 0) return totalReserved < moq
      if (extraQty > 0) return totalReserved < extraQty
      return true // no qty limit set — always show
    })

    published.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json(published.map(item => buildPublicItem(item, isReseller)))
  } catch (error) {
    console.error('[preorder-item] list error:', error)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}
