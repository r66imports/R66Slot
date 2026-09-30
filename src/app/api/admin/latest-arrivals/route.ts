import { NextRequest, NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

export const dynamic = 'force-dynamic'

const KEY = 'data/latest-arrivals.json'
const LANDING_KEY = 'data/landing-soon.json'

interface ArrivalItem {
  id: string
  sku: string
  title: string
  imageUrl: string
  price: number
  compareAtPrice?: number
  quantity: number
  addedAt: string
  productId?: string
}

export async function GET() {
  try {
    const items = await blobRead<ArrivalItem[]>(KEY, [])
    return NextResponse.json(Array.isArray(items) ? items : [])
  } catch {
    return NextResponse.json([])
  }
}

/**
 * Drop SKUs from the Landing Soon blob. Landing Soon has no expiry of its own (Days
 * Visible defaults to 0 = never), so without this an item that has landed would sit on
 * the pre-arrival slider until somebody took it off by hand.
 */
async function dropFromLandingSoon(skus: string[]) {
  if (!skus.length) return
  try {
    const wanted = new Set(skus.map((s) => String(s).trim().toLowerCase()))
    const existing = await blobRead<{ sku?: string }[]>(LANDING_KEY, [])
    const arr = Array.isArray(existing) ? existing : []
    const kept = arr.filter((i) => !wanted.has(String(i?.sku ?? '').trim().toLowerCase()))
    if (kept.length !== arr.length) await blobWrite(LANDING_KEY, kept)
  } catch {
    // Tidy-up only - never fail the arrivals write because this could not be done.
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const isArray = Array.isArray(body)
    const incoming: any[] = isArray ? body : [body]

    // An array REPLACES the entire blob so stale/excluded items (e.g. previously-added
    // Chasecar entries) are always removed - unless ?mode=merge, which upserts each row
    // and leaves the rest of the list alone, so a Worksheet send cannot wipe cards added
    // one at a time from the Pre-Order Dashboard or a Product Edit toggle.
    // A single item always upserts into the existing list.
    const merge = new URL(req.url).searchParams.get('mode') === 'merge'
    let arr: ArrivalItem[] = []
    if (!isArray || merge) {
      const existing = await blobRead<ArrivalItem[]>(KEY, [])
      arr = Array.isArray(existing) ? existing : []
    }

    const upserted: ArrivalItem[] = []
    for (const entry of incoming) {
      const { sku, title, imageUrl, price, compareAtPrice, quantity, productId } = entry
      if (!sku) continue

      const existing = arr.findIndex(i => i.sku?.trim().toLowerCase() === String(sku).trim().toLowerCase())
      const newItem: ArrivalItem = {
        id: existing >= 0 ? arr[existing].id : `la-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sku: String(sku),
        title: String(title || sku),
        imageUrl: String(imageUrl || ''),
        price: Number(price) || 0,
        ...(compareAtPrice != null ? { compareAtPrice: Number(compareAtPrice) } : {}),
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
    // Arrived stock is no longer on its way, so it can never still be landing soon. Every
    // route in - Worksheet, Pre-Order Dashboard, Product Edit toggle - clears the SKU from
    // the pre-arrival slider. This is the housekeeping the blob-replace used to do by
    // accident, and merge mode would otherwise leave undone.
    await dropFromLandingSoon(upserted.map((i) => i.sku))
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

    const items = await blobRead<ArrivalItem[]>(KEY, [])
    const arr = Array.isArray(items) ? items : []
    const filtered = arr.filter(i => i.id !== id)
    await blobWrite(KEY, filtered)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message) }, { status: 500 })
  }
}
