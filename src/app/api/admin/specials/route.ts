import { NextRequest, NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

export const dynamic = 'force-dynamic'

const KEY = 'data/specials.json'

interface SpecialItem {
  id: string
  sku: string
  title: string
  imageUrl: string
  /** Full retail price — never discounted, so the "was" figure survives. */
  price: number
  compareAtPrice?: number
  /** Retail discount %. The card derives the selling price from price and this. */
  discountPct?: number
  quantity: number
  addedAt: string
  productId?: string
}

export async function GET() {
  try {
    const items = await blobRead<SpecialItem[]>(KEY, [])
    return NextResponse.json(Array.isArray(items) ? items : [])
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const isArray = Array.isArray(body)
    const incoming: any[] = isArray ? body : [body]

    // When an array is sent, REPLACE the entire blob so stale entries are always removed.
    // When a single item is sent (the Specials toggle), upsert into the existing list.
    let arr: SpecialItem[] = []
    if (!isArray) {
      const existing = await blobRead<SpecialItem[]>(KEY, [])
      arr = Array.isArray(existing) ? existing : []
    }

    const upserted: SpecialItem[] = []
    for (const entry of incoming) {
      const { sku, title, imageUrl, price, compareAtPrice, discountPct, quantity, productId } = entry
      if (!sku) continue

      const existing = arr.findIndex(i => i.sku?.trim().toLowerCase() === String(sku).trim().toLowerCase())
      const newItem: SpecialItem = {
        id: existing >= 0 ? arr[existing].id : `sp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sku: String(sku),
        title: String(title || sku),
        imageUrl: String(imageUrl || ''),
        price: Number(price) || 0,
        ...(compareAtPrice != null ? { compareAtPrice: Number(compareAtPrice) } : {}),
        discountPct: Math.max(0, Math.min(100, Number(discountPct) || 0)),
        quantity: Number(quantity) || 0,
        addedAt: new Date().toISOString(),
        ...(productId ? { productId: String(productId) } : {}),
      }

      if (existing >= 0) {
        arr[existing] = newItem
      } else {
        arr.push(newItem)
      }
      upserted.push(newItem)
    }

    await blobWrite(KEY, arr)
    return NextResponse.json(isArray ? upserted : upserted[0] ?? null)
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const items = await blobRead<SpecialItem[]>(KEY, [])
    const arr = Array.isArray(items) ? items : []
    const filtered = arr.filter(i => i.id !== id)
    await blobWrite(KEY, filtered)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message) }, { status: 500 })
  }
}
