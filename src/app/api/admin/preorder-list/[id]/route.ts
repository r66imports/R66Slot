import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const ORDERS_KEY = 'data/preorder-list.json'

async function getOrders() {
  return await blobRead<any[]>(ORDERS_KEY, [])
}

async function saveOrders(orders: any[]) {
  await blobWrite(ORDERS_KEY, orders)
}

// GET single order
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const orders = await getOrders()
    const order = orders.find((o: any) => o.id === id)

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}

// PATCH update order fields
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const orders = await getOrders()
    const orderIndex = orders.findIndex((o: any) => o.id === id)

    if (orderIndex === -1) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const allowedFields = [
      'status', 'quoteSent', 'salesOrderSent', 'invoiceSent',
      'shipped', 'archivedAt'
    ]

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() }
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    orders[orderIndex] = {
      ...orders[orderIndex],
      ...updates,
    }

    await saveOrders(orders)

    return NextResponse.json(orders[orderIndex])
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}

// DELETE order
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const orders = await getOrders()
    const filteredOrders = orders.filter((o: any) => o.id !== id)

    if (filteredOrders.length === orders.length) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    await saveOrders(filteredOrders)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 })
  }
}
