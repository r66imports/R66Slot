import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/inventory-pricelists.json'

export interface PricelistEntry {
  supplierId: string
  sku: string
  wholesalePrice: number
  shopQty: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplierId')
    const all = await blobRead<PricelistEntry[]>(KEY, [])
    if (supplierId) {
      return NextResponse.json(all.filter((e) => e.supplierId === supplierId))
    }
    return NextResponse.json(all)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const incoming: PricelistEntry[] = body.entries || []
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return NextResponse.json({ error: 'entries array required' }, { status: 400 })
    }
    const all = await blobRead<PricelistEntry[]>(KEY, [])
    for (const entry of incoming) {
      const idx = all.findIndex(
        (e) => e.supplierId === entry.supplierId && e.sku === entry.sku
      )
      if (idx >= 0) {
        all[idx] = { ...all[idx], ...entry }
      } else {
        all.push(entry)
      }
    }
    await blobWrite(KEY, all)
    const supplierId = incoming[0]?.supplierId
    return NextResponse.json(supplierId ? all.filter((e) => e.supplierId === supplierId) : all)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
