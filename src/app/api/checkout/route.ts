import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import { db } from '@/lib/db'

const KEY = 'data/checkout-orders.json'

export interface CheckoutOrder {
  id: string
  orderNumber: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'invoiced' | 'archived'
  invoiceRef?: string
  stockRestored?: boolean
  createdAt: string
  customer: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  shipping: {
    address: string
    suburb: string
    city: string
    postalCode: string
    method: string
    notes: string
  }
  items: Array<{
    id: string
    sku: string
    title: string
    brand: string
    price: number
    quantity: number
    imageUrl: string
  }>
  subtotal: number
  total: number
}

export async function GET() {
  try {
    const orders = await blobRead<CheckoutOrder[]>(KEY, [])
    return NextResponse.json(orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const items = (body.items || []) as CheckoutOrder['items']

    // Server-side stock guard. The cart caps quantity client-side, but that is a
    // convenience only — a stale cart, a second tab, or a direct POST can all ask
    // for more than exists. Reject before anything is written.
    const shortfalls: Array<{ id: string; title: string; requested: number; available: number }> = []
    for (const item of items) {
      if (!item.id || !item.quantity) continue
      const res = await db.query(
        `SELECT title, COALESCE(quantity, 0) AS quantity FROM products WHERE id = $1`,
        [item.id]
      )
      const available = Number(res.rows[0]?.quantity ?? 0)
      if (!res.rows.length || item.quantity > available) {
        shortfalls.push({
          id: item.id,
          title: res.rows[0]?.title || item.title || item.id,
          requested: item.quantity,
          available: res.rows.length ? available : 0,
        })
      }
    }
    if (shortfalls.length) {
      return NextResponse.json(
        {
          error: 'Some items are no longer available in the quantity requested.',
          shortfalls,
        },
        { status: 409 }
      )
    }

    const orders = await blobRead<CheckoutOrder[]>(KEY, [])

    const orderNumber = `R66-${Date.now().toString().slice(-6)}`
    const newOrder: CheckoutOrder = {
      id: crypto.randomUUID(),
      orderNumber,
      status: 'pending',
      createdAt: new Date().toISOString(),
      customer: body.customer,
      shipping: body.shipping,
      items,
      subtotal: body.subtotal,
      total: body.total,
    }

    await blobWrite(KEY, [newOrder, ...orders])

    // Deduct stock for each item immediately — floor at 0.
    // Failures are logged rather than swallowed; a deduction that matches no product
    // used to fail silently and leave the item purchasable forever.
    const now = new Date().toISOString()
    for (const item of items) {
      if (!item.id || !item.quantity) continue
      try {
        const res = await db.query(
          `UPDATE products SET quantity = GREATEST(COALESCE(quantity, 0) - $2, 0), updated_at = $3
           WHERE id = $1 RETURNING id`,
          [item.id, item.quantity, now]
        )
        if (!res.rows.length) {
          console.error('[checkout] stock deduction matched no product', { id: item.id, orderNumber })
        }
      } catch (err: any) {
        console.error('[checkout] stock deduction failed', { id: item.id, orderNumber, err: err?.message })
      }
    }

    return NextResponse.json({ success: true, orderNumber, id: newOrder.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, status, invoiceRef, restoreStock, deductStock } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const orders = await blobRead<CheckoutOrder[]>(KEY, [])
    const idx = orders.findIndex((o) => o.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const order = orders[idx]

    // Restore stock — either explicit restoreStock flag, or cancelling a non-cancelled order
    const shouldRestore = restoreStock === true ||
      (status === 'cancelled' && order.status !== 'cancelled' && !order.stockRestored)

    if (shouldRestore) {
      const now = new Date().toISOString()
      let allOk = true
      for (const item of order.items) {
        if (!item.id || !item.quantity) continue
        try {
          const res = await db.query(
            `UPDATE products SET quantity = COALESCE(quantity, 0) + $2, updated_at = $3 WHERE id = $1 RETURNING id, quantity`,
            [item.id, item.quantity, now]
          )
          if (!res.rowCount) allOk = false
        } catch {
          allOk = false
        }
      }
      orders[idx].stockRestored = allOk
    }

    // Re-take stock for an order that handed it back (cancelled → stock restored) and is
    // now being invoiced again. Refuse outright if the shelf can no longer cover it — the
    // items may well have been sold in the meantime.
    if (deductStock === true && order.stockRestored) {
      const shortfalls: Array<{ id: string; title: string; requested: number; available: number }> = []
      for (const item of order.items) {
        if (!item.id || !item.quantity) continue
        const res = await db.query(
          `SELECT title, COALESCE(quantity, 0) AS quantity FROM products WHERE id = $1`,
          [item.id]
        )
        const available = Number(res.rows[0]?.quantity ?? 0)
        if (!res.rows.length || item.quantity > available) {
          shortfalls.push({
            id: item.id,
            title: res.rows[0]?.title || item.title || item.id,
            requested: item.quantity,
            available: res.rows.length ? available : 0,
          })
        }
      }
      if (shortfalls.length) {
        return NextResponse.json(
          {
            error: `Not enough stock to invoice this order again: ${shortfalls
              .map((s) => `${s.title} (${s.requested} requested, ${s.available} available)`)
              .join(', ')}`,
            shortfalls,
          },
          { status: 409 }
        )
      }
      const deductedAt = new Date().toISOString()
      for (const item of order.items) {
        if (!item.id || !item.quantity) continue
        try {
          await db.query(
            `UPDATE products SET quantity = GREATEST(COALESCE(quantity, 0) - $2, 0), updated_at = $3
             WHERE id = $1 RETURNING id`,
            [item.id, item.quantity, deductedAt]
          )
        } catch (err: any) {
          console.error('[checkout] re-deduction failed', { id: item.id, orderNumber: order.orderNumber, err: err?.message })
        }
      }
      orders[idx].stockRestored = false
    }

    if (status) orders[idx].status = status
    if (invoiceRef) orders[idx].invoiceRef = invoiceRef
    await blobWrite(KEY, orders)
    return NextResponse.json(orders[idx])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
