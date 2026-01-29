import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_FILE = path.join(process.cwd(), 'data', 'preorder-list.json')

function getOrders() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return []
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

function saveOrders(orders: any[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2), 'utf-8')
}

// GET single order
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const orders = getOrders()
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

    const orders = getOrders()
    const orderIndex = orders.findIndex((o: any) => o.id === id)

    if (orderIndex === -1) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Allow updating any of these fields
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

    saveOrders(orders)

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
    const orders = getOrders()
    const filteredOrders = orders.filter((o: any) => o.id !== id)

    if (filteredOrders.length === orders.length) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    saveOrders(filteredOrders)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 })
  }
}
