import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import type { OrderDocument } from '../route'

const KEY = 'data/order-documents.json'

async function getDocs(): Promise<OrderDocument[]> {
  return await blobRead<OrderDocument[]>(KEY, [])
}

async function saveDocs(docs: OrderDocument[]): Promise<void> {
  await blobWrite(KEY, docs)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const docs = await getDocs()
    const idx = docs.findIndex((d) => d.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    docs[idx] = { ...docs[idx], ...body, updatedAt: new Date().toISOString() }
    await saveDocs(docs)
    return NextResponse.json(docs[idx])
  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const docs = await getDocs()
    const filtered = docs.filter((d) => d.id !== id)
    if (filtered.length === docs.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await saveDocs(filtered)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
