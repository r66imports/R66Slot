import { NextResponse } from 'next/server'
import { getItems, saveItems, invalidateCache } from '@/lib/preorder-helpers'

// Re-points Pre-Order Dashboard customer entries from one document to another.
//
// A Quote covers every line the customer reserved, which on the dashboard is one customer
// entry per SKU card. Sending that Quote to an Invoice converts the whole document, so
// every entry it covers now belongs to the Invoice — not only the card whose Send-to
// dropdown was used. Without this the other cards keep showing the Quote number for a
// Quote that has already been archived into an Invoice.
//
// Entries are matched on linkedDocId (exact) and fall back to linkedDocNumber for older
// entries saved before the id was stored. The sweep covers the whole blob, not just the
// supplier page in front of the user, because one Quote can span suppliers.
//
// POST { fromDocId?, fromDocNumber?, toDocId, toDocNumber }

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fromDocId, fromDocNumber, toDocId, toDocNumber } = body || {}
    if (!toDocId || !toDocNumber) {
      return NextResponse.json({ error: 'toDocId and toDocNumber are required' }, { status: 400 })
    }
    if (!fromDocId && !fromDocNumber) {
      return NextResponse.json({ error: 'fromDocId or fromDocNumber is required' }, { status: 400 })
    }

    const matches = (c: any) => (
      (fromDocId && c.linkedDocId === fromDocId) ||
      (!c.linkedDocId && fromDocNumber && c.linkedDocNumber === fromDocNumber)
    )

    const items = await getItems()
    const relinked: { itemId: string; sku: string; customerId: string; name: string }[] = []

    const updated = items.map((item) => {
      const customers = (item.customers || []) as any[]
      if (!customers.some(matches)) return item
      return {
        ...item,
        customers: customers.map((c) => {
          if (!matches(c)) return c
          relinked.push({ itemId: item.id, sku: item.sku, customerId: c.id, name: c.name })
          return { ...c, linkedDocId: toDocId, linkedDocNumber: toDocNumber }
        }),
        updatedAt: new Date().toISOString(),
      }
    })

    if (relinked.length > 0) {
      await saveItems(updated)
      invalidateCache()
    }

    return NextResponse.json({ relinked: relinked.length, entries: relinked, toDocNumber })
  } catch (error: any) {
    console.error('Error relinking preorder dashboard entries:', error?.message)
    return NextResponse.json({ error: error?.message || 'Failed to relink' }, { status: 500 })
  }
}
