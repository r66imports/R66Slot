import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const KEY = 'data/specials.json'

// discount_pct is otherwise only created by a product save; without it the SELECT below
// fails and the slider renders empty. Once per process — not on every storefront hit.
let discountColumnReady: Promise<unknown> | null = null

export async function GET() {
  try {
    const items = await blobRead<any[]>(KEY, [])
    const arr = Array.isArray(items) ? items : []
    if (arr.length === 0) return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } })

    discountColumnReady ??= db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_pct NUMERIC`).catch(() => { discountColumnReady = null })
    await discountColumnReady

    // Pull live stock, price and discount from the products DB so the card reflects the
    // current product — editing the Discount % afterwards does not need a re-toggle.
    const skus = arr.map((i: any) => String(i.sku).trim().toLowerCase())
    const result = await db.query(
      `SELECT sku, title, COALESCE(quantity, 0) AS quantity, price, discount_pct, image_url, images
         FROM products WHERE LOWER(sku) = ANY($1)`,
      [skus]
    )
    // The product's first usable image. The toggle snapshots an image URL, but at that
    // moment the product's uploads may still be local data: URLs (or absent), leaving the
    // blob entry with no image — so always resolve from the product as a fallback.
    const firstImage = (row: any): string => {
      const candidates: unknown[] = [row.image_url, ...(Array.isArray(row.images) ? row.images : [])]
      for (const c of candidates) {
        const url = typeof c === 'string' ? c.trim() : ''
        if (url && !url.startsWith('data:')) return url
      }
      return ''
    }
    const live: Record<string, { title: string; quantity: number; price: number | null; discountPct: number; imageUrl: string }> = {}
    for (const row of result.rows) {
      live[String(row.sku).trim().toLowerCase()] = {
        title: String(row.title || '').trim(),
        quantity: Number(row.quantity),
        price: row.price != null ? Number(row.price) : null,
        discountPct: row.discount_pct != null ? Number(row.discount_pct) : 0,
        imageUrl: firstImage(row),
      }
    }

    // Entries whose product has since been deleted are dropped rather than rendered as an
    // empty placeholder card. The blob is left alone — DELETE owns removal — so a product
    // restored under the same SKU brings its special back.
    const merged = arr.flatMap((item: any) => {
      const hit = live[String(item.sku).trim().toLowerCase()]
      if (!hit) return []
      const stored = typeof item.imageUrl === 'string' ? item.imageUrl.trim() : ''
      // compareAtPrice is R66Slot's internal Average Cost — never serve it publicly.
      const { compareAtPrice: _cost, ...rest } = item
      return [{
        ...rest,
        // The toggle snapshots the title too; a product renamed afterwards (870103 was
        // saved with its SKU as the title) kept showing the old one.
        title: hit.title || item.title,
        quantity: hit.quantity,
        price: hit.price ?? item.price,
        discountPct: hit.discountPct,
        imageUrl: stored && !stored.startsWith('data:') ? stored : hit.imageUrl,
      }]
    })

    return NextResponse.json(merged, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json([])
  }
}
