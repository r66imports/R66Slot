import { NextResponse } from 'next/server'
import { getItems, saveItems, invalidateCache } from '@/lib/preorder-helpers'

// Links a named set of Pre-Order Dashboard customer entries to one document in a single sweep.
//
// "Send all reserved items" gathers everything a customer has reserved across every supplier
// and puts it on one document. Those entries cannot be addressed by a single from-document
// the way /relink does — they may sit on different quotes, or on nothing at all — so each one
// is named explicitly by { itemId, customerId }.
//
// POST { entries: [{ itemId, customerId }], toDocId, toDocNumber }

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { entries, toDocId, toDocNumber } = body || {}
    if (!toDocId || !toDocNumber) {
      return NextResponse.json({ error: 'toDocId and toDocNumber are required' }, { status: 400 })
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'entries is required' }, { status: 400 })
    }

    const wanted = new Set(entries.map((e: any) => `${e.itemId}::${e.customerId}`))
    const items = await getItems()
    let linked = 0

    const updated = items.map((item) => {
      const customers = (item.customers || []) as any[]
      if (!customers.some((c) => wanted.has(`${item.id}::${c.id}`))) return item
      return {
        ...item,
        customers: customers.map((c) => {
          if (!wanted.has(`${item.id}::${c.id}`)) return c
          linked++
          return { ...c, linkedDocId: toDocId, linkedDocNumber: toDocNumber }
        }),
        updatedAt: new Date().toISOString(),
      }
    })

    if (linked > 0) {
      await saveItems(updated)
      invalidateCache()
    }

    return NextResponse.json({ linked, toDocNumber })
  } catch (error: any) {
    console.error('Error linking preorder dashboard entries:', error?.message)
    return NextResponse.json({ error: error?.message || 'Failed to link' }, { status: 500 })
  }
}
