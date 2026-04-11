import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'

const ORDERS_KEY = 'data/preorder-list.json'
const BACKORDERS_KEY = 'data/backorders.json'

async function getOrders() {
  return await blobRead<any[]>(ORDERS_KEY, [])
}

// GET all orders — merges old preorder-list with backorders flagged source='book-now'
export async function GET() {
  try {
    const [orders, backorders] = await Promise.all([
      getOrders(),
      blobRead<any[]>(BACKORDERS_KEY, []),
    ])

    // Map book-now backorder entries into the PreOrderItem shape
    const bookNow = backorders
      .filter((b: any) => b.source === 'book-now')
      .map((b: any) => ({
        id: b.id,
        posterId: b.id,
        sku: b.sku || '',
        itemDescription: b.description || '',
        brand: b.brand || '',
        price: String(b.price || 0),
        quantity: b.qty || 1,
        totalAmount: String((b.price || 0) * (b.qty || 1)),
        customerId: b.clientId || '',
        customerName: b.clientName || '',
        customerEmail: b.clientEmail || '',
        customerPhone: b.clientPhone || '',
        orderType: 'pre-order' as const,
        status: b.status || 'pending',
        quoteSent: b.quoteSent ?? false,
        salesOrderSent: b.salesOrderSent ?? false,
        invoiceSent: b.invoiceSent ?? false,
        shipped: b.shipped ?? false,
        completedAt: b.completedAt ?? null,
        archivedAt: b.archivedAt ?? null,
        createdAt: b.createdAt,
      }))

    const merged = [...orders, ...bookNow]
    merged.sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    return NextResponse.json(merged)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
