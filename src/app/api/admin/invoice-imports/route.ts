import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/invoice-imports.json'

export interface SavedImport {
  id: string
  supplierName: string
  currency: string
  wsId: string
  shippingAmount: number  // in supplier currency
  itemCount: number
  /** Total units across the lines (itemCount is the line count). */
  totalQty?: number
  fileName: string
  createdAt: string
  updatedAt: string
}

export async function GET() {
  const data = await blobRead<SavedImport[]>(KEY, [])
  return NextResponse.json(data)
}

/**
 * Every import is kept, newest first — this is the history. Matching is by `id`, so
 * re-importing for a supplier adds a row rather than overwriting the previous one.
 */
export async function POST(request: Request) {
  const body: SavedImport = await request.json()
  const all = await blobRead<SavedImport[]>(KEY, [])
  const idx = all.findIndex(i => i.id === body.id)
  if (idx >= 0) all[idx] = body
  else all.unshift(body)
  await blobWrite(KEY, all)
  return NextResponse.json(body)
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const all = await blobRead<SavedImport[]>(KEY, [])
  const next = all.filter(i => i.id !== id)
  if (next.length === all.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await blobWrite(KEY, next)
  return NextResponse.json({ ok: true, deleted: id })
}
