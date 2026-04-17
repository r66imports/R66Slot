import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/preorder-dashboard.json'

export interface PreOrderDashboardItem {
  id: string
  sku: string
  description: string
  estimatedRetailPrice: string
  eta: string
  supplier: string
  brand: string
  imageUrl?: string
  customers: { id: string; name: string; email?: string; phone?: string; qty: number }[]
  createdAt: string
  updatedAt?: string
}

async function getItems(): Promise<PreOrderDashboardItem[]> {
  return await blobRead<PreOrderDashboardItem[]>(KEY, [])
}

async function saveItems(items: PreOrderDashboardItem[]): Promise<void> {
  await blobWrite(KEY, items)
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
      estimatedRetailPrice: body.estimatedRetailPrice?.trim() || '',
      eta: body.eta?.trim() || '',
      supplier: body.supplier?.trim() || '',
      brand: body.brand?.trim() || '',
      imageUrl: body.imageUrl || undefined,
      customers: body.customers || [],
      createdAt: now,
    }

    items.unshift(newItem)
    await saveItems(items)
    return NextResponse.json(newItem, { status: 201 })
  } catch (error) {
    console.error('Error creating preorder dashboard item:', error)
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
  }
}
