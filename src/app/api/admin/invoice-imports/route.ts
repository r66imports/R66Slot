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
  fileName: string
  createdAt: string
  updatedAt: string
}

export async function GET() {
  const data = await blobRead<SavedImport[]>(KEY, [])
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body: SavedImport = await request.json()
  const all = await blobRead<SavedImport[]>(KEY, [])
  const idx = all.findIndex(i => i.supplierName === body.supplierName)
  if (idx >= 0) all[idx] = body
  else all.unshift(body)
  await blobWrite(KEY, all)
  return NextResponse.json(body)
}
