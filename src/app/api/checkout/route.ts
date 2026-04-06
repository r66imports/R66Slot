import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import { db } from '@/lib/db'

const KEY = 'data/checkout-orders.json'

export interface CheckoutOrder {
  id: string
  orderNumber: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'invoiced'
  invoiceRef?: string
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
    const orders = await blobRead<CheckoutOrder[]>(KEY, [])

    const orderNumber = `R66-${Date.now().toString().slice(-6)}`
    const newOrder: CheckoutOrder = {
      id: crypto.randomUUID(),
      orderNumber,
      status: 'pending',
      createdAt: new Date().toISOString(),
      customer: body.customer,
      shipping: body.shipping,
      items: body.items,
      subtotal: body.subtotal,
      total: body.total,
    }

    await blobWrite(KEY, [newOrder, ...orders])

    // Deduct stock for each item immediately — floor at 0
    for (const item of (body.items as CheckoutOrder['items'])) {
      if (!item.id || !item.quantity) continue
      await db.query(
        `UPDATE products SET quantity = GREATEST(COALESCE(quantity, 0) - $2, 0), updated_at = $3 WHERE id = $1`,
        [item.id, item.quantity, new Date().toISOString()]
      ).catch(() => {})
    }

    return NextResponse.json({ success: true, orderNumber, id: newOrder.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, status, invoiceRef } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const orders = await blobRead<CheckoutOrder[]>(KEY, [])
    const idx = orders.findIndex((o) => o.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const prev = orders[idx]

    // Restore stock when cancelling — only if order was not already cancelled
    if (status === 'cancelled' && prev.status !== 'cancelled') {
      const now = new Date().toISOString()
      for (const item of prev.items) {
        if (!item.id || !item.quantity) continue
        await db.query(
          `UPDATE products SET quantity = COALESCE(quantity, 0) + $2, updated_at = $3 WHERE id = $1`,
          [item.id, item.quantity, now]
        ).catch(() => {})
      }
    }

    if (status) orders[idx].status = status
    if (invoiceRef) orders[idx].invoiceRef = invoiceRef
    await blobWrite(KEY, orders)
    return NextResponse.json(orders[idx])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
