import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const BIN_KEY = 'data/invoices-bin.json'

export async function GET() {
  try {
    const docs = await blobRead<any[]>(BIN_KEY, [])
    docs.sort((a, b) => new Date(b.deletedAt || b.createdAt).getTime() - new Date(a.deletedAt || a.createdAt).getTime())
    return NextResponse.json(docs)
  } catch (error) {
    console.error('Error fetching invoice bin:', error)
    return NextResponse.json([], { status: 200 })
  }
}

// Empty the bin — permanently deletes all binned invoices
export async function DELETE() {
  try {
    await blobWrite(BIN_KEY, [])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error emptying invoice bin:', error)
    return NextResponse.json({ error: 'Failed to empty bin' }, { status: 500 })
  }
}
