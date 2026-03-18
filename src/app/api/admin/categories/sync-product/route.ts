import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/product-categories.json'

export async function POST(req: Request) {
  try {
    const { productId, categoryIds } = await req.json()
    const categories = await blobRead<any[]>(KEY, [])
    const updated = categories.map((cat: any) => {
      const ids: string[] = Array.isArray(cat.productIds) ? cat.productIds : []
      if (categoryIds.includes(cat.id)) {
        if (!ids.includes(productId)) return { ...cat, productIds: [...ids, productId] }
      } else {
        if (ids.includes(productId)) return { ...cat, productIds: ids.filter((id: string) => id !== productId) }
      }
      return cat
    })
    await blobWrite(KEY, updated)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'sync failed' }, { status: 500 })
  }
}
