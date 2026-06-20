import { NextResponse } from 'next/server'
import { blobRead, blobAppendArrayItem, blobRemoveArrayItem } from '@/lib/blob-storage'

const KEY = 'data/order-documents.json'
const BIN_KEY = 'data/invoices-bin.json'

// Restore a binned invoice back to the active documents list
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const bin = await blobRead<any[]>(BIN_KEY, [])
    const doc = bin.find((d) => d.id === id)
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { deletedAt, ...restored } = doc
    await blobAppendArrayItem(KEY, restored)
    await blobRemoveArrayItem(BIN_KEY, id)
    return NextResponse.json(restored)
  } catch (error) {
    console.error('Error restoring invoice from bin:', error)
    return NextResponse.json({ error: 'Failed to restore invoice' }, { status: 500 })
  }
}

// Permanently delete a single invoice from the bin
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await blobRemoveArrayItem(BIN_KEY, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error permanently deleting invoice from bin:', error)
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 })
  }
}
