import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const ORDERS_KEY = 'data/preorder-list.json'
const BACKORDERS_KEY = 'data/backorders.json'

async function getOrders() {
  return await blobRead<any[]>(ORDERS_KEY, [])
}

async function saveOrders(orders: any[]) {
  await blobWrite(ORDERS_KEY, orders)
}

// GET single order — tries preorder-list first, then backorders
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const orders = await getOrders()
    const order = orders.find((o: any) => o.id === id)
    if (order) return NextResponse.json(order)

    const backorders = await blobRead<any[]>(BACKORDERS_KEY, [])
    const bo = backorders.find((o: any) => o.id === id)
    if (bo) return NextResponse.json(bo)

    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}

// PATCH update order fields — tries preorder-list first, then backorders (source='book-now')
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const allowedFields = [
      'status', 'quoteSent', 'salesOrderSent', 'invoiceSent',
      'shipped', 'completedAt', 'archivedAt'
    ]

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() }
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    // Try preorder-list store first
    const orders = await getOrders()
    const orderIndex = orders.findIndex((o: any) => o.id === id)

    if (orderIndex !== -1) {
      orders[orderIndex] = { ...orders[orderIndex], ...updates }
      await saveOrders(orders)
      return NextResponse.json(orders[orderIndex])
    }

    // Fall back to backorders store (website bookings with source='book-now')
    const backorders = await blobRead<any[]>(BACKORDERS_KEY, [])
    const boIndex = backorders.findIndex((o: any) => o.id === id)
    if (boIndex !== -1) {
      backorders[boIndex] = { ...backorders[boIndex], ...updates }
      await blobWrite(BACKORDERS_KEY, backorders)
      // Return in PreOrderItem shape so client state updates correctly
      const b = backorders[boIndex]
      return NextResponse.json({
        id: b.id, posterId: b.id,
        sku: b.sku || '', itemDescription: b.description || '',
        brand: b.brand || '', price: String(b.price || 0),
        quantity: b.qty || 1, totalAmount: String((b.price || 0) * (b.qty || 1)),
        customerId: b.clientId || '', customerName: b.clientName || '',
        customerEmail: b.clientEmail || '', customerPhone: b.clientPhone || '',
        orderType: 'pre-order', status: b.status || 'pending',
        quoteSent: b.quoteSent, salesOrderSent: b.salesOrderSent,
        invoiceSent: b.invoiceSent, shipped: b.shipped,
        completedAt: b.completedAt, archivedAt: b.archivedAt,
        createdAt: b.createdAt,
      })
    }

    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}

// DELETE order — tries preorder-list first, then backorders
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const orders = await getOrders()
    const filtered = orders.filter((o: any) => o.id !== id)
    if (filtered.length < orders.length) {
      await saveOrders(filtered)
      return NextResponse.json({ success: true })
    }

    // Try backorders store
    const backorders = await blobRead<any[]>(BACKORDERS_KEY, [])
    const filteredBo = backorders.filter((o: any) => o.id !== id)
    if (filteredBo.length < backorders.length) {
      await blobWrite(BACKORDERS_KEY, filteredBo)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 })
  }
}
