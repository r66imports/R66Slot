import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { blobRead } from '@/lib/blob-storage'

const KEY = 'data/preorder-dashboard.json'
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const items = await blobRead<any[]>(KEY, [])
    const item = items.find((i) => i.id === id)
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { sku, description, retailPrice, estimatedRetailPrice, eta, cutoffDate, brand, unit, imageUrl, createdAt, seoTitle, seoDescription, seoImageUrl, resellerMoq } = item

    // Calculate lock state
    let isLocked = !!item.orderPlaced
    if (!isLocked && cutoffDate) {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const cutoff = new Date(cutoffDate); cutoff.setHours(0, 0, 0, 0)
      if (cutoff.getTime() <= today.getTime()) isLocked = true
    }

    // Available qty — only meaningful when locked (null = no cap before cutoff)
    const totalReserved = ((item.customers ?? []) as any[]).reduce((s: number, c: any) => s + (c.qty || 0), 0)
    const moq = item.minOrderQty || 0
    const availableQty = isLocked
      ? (moq > 0 ? Math.max(0, moq - totalReserved) : (item.extraQty || 0))
      : null

    // How much has this signed-in customer already reserved? Once a reseller
    // has met the MOQ on a prior reservation, they shouldn't be forced into
    // another full-MOQ purchase for additional units.
    let myReservedQty = 0
    const cookieStore = await cookies()
    const token = cookieStore.get('customer_token')?.value
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any
        const mine = ((item.customers ?? []) as any[]).find((c: any) => c.email === decoded.email || c.id === decoded.id)
        myReservedQty = mine?.qty || 0
      } catch { /* not signed in / invalid token */ }
    }

    return NextResponse.json({ id, sku, description, retailPrice, estimatedRetailPrice, eta, cutoffDate, brand, unit, imageUrl, createdAt, isLocked, availableQty, seoTitle, seoDescription, seoImageUrl, resellerMoq: resellerMoq ?? 1, myReservedQty })
  } catch (error) {
    console.error('[preorder-item] GET error:', error)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}
