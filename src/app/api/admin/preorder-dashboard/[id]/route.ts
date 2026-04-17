import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import type { PreOrderDashboardItem } from '../route'

const KEY = 'data/preorder-dashboard.json'

async function getItems(): Promise<PreOrderDashboardItem[]> {
  return await blobRead<PreOrderDashboardItem[]>(KEY, [])
}

async function saveItems(items: PreOrderDashboardItem[]): Promise<void> {
  await blobWrite(KEY, items)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const items = await getItems()
    const idx = items.findIndex((i) => i.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const allowedFields = ['sku', 'description', 'estimatedRetailPrice', 'eta', 'supplier', 'brand', 'imageUrl', 'customers']
    const updated = { ...items[idx], updatedAt: new Date().toISOString() }
    for (const field of allowedFields) {
      if (field in body) (updated as any)[field] = body[field]
    }

    items[idx] = updated
    await saveItems(items)
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating preorder dashboard item:', error)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const items = await getItems()
    const filtered = items.filter((i) => i.id !== id)
    if (filtered.length === items.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await saveItems(filtered)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting preorder dashboard item:', error)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}
