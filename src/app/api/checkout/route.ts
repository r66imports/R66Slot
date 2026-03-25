import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/checkout-orders.json'

export interface CheckoutOrder {
  id: string
  orderNumber: string
  status: 'pending' | 'confirmed' | 'cancelled'
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
    return NextResponse.json({ success: true, orderNumber, id: newOrder.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
