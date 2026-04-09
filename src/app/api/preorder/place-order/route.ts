import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const ORDERS_KEY = 'data/preorder-list.json'
const POSTERS_KEY = 'data/slotcar-orders.json'
const CONTACTS_KEY = 'data/contacts.json'

async function getOrders() {
  return await blobRead<any[]>(ORDERS_KEY, [])
}

async function saveOrders(orders: any[]) {
  await blobWrite(ORDERS_KEY, orders)
}

async function getPosters() {
  return await blobRead<any[]>(POSTERS_KEY, [])
}

async function savePosters(posters: any[]) {
  await blobWrite(POSTERS_KEY, posters)
}

// POST place order
export async function POST(request: Request) {
  try {
    const orderData = await request.json()

    // Validate required fields
    if (!orderData.posterId || !orderData.quantity || !orderData.customerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if poster exists and has availability
    const posters = await getPosters()
    const posterIndex = posters.findIndex((p: any) => p.id === orderData.posterId)

    if (posterIndex === -1) {
      return NextResponse.json(
        { error: 'Pre-order item not found' },
        { status: 404 }
      )
    }

    const poster = posters[posterIndex]

    if (poster.availableQty < orderData.quantity) {
      return NextResponse.json(
        { error: 'Not enough stock available' },
        { status: 400 }
      )
    }

    // Create order
    const orders = await getOrders()
    const newOrder = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...orderData,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    orders.push(newOrder)
    await saveOrders(orders)

    // Update poster available quantity
    posters[posterIndex].availableQty -= orderData.quantity
    await savePosters(posters)

    // Auto-add customer to contacts if not already there
    try {
      const contacts = await blobRead<any[]>(CONTACTS_KEY, [])
      const exists = contacts.find(
        (c: any) =>
          (orderData.customerEmail && c.email === orderData.customerEmail) ||
          (orderData.customerPhone && c.phone === orderData.customerPhone)
      )
      if (!exists) {
        const nameParts = (orderData.customerName || '').split(' ')
        contacts.push({
          id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          email: orderData.customerEmail || '',
          phone: orderData.customerPhone || '',
          source: 'book-now',
          notes: '',
          totalOrders: 0,
          totalSpent: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        await blobWrite(CONTACTS_KEY, contacts)
      }
    } catch {
      // Don't fail the order if contact save fails
    }

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      message: 'Order placed successfully',
    })
  } catch (error) {
    console.error('Error placing order:', error)
    return NextResponse.json(
      { error: 'Failed to place order' },
      { status: 500 }
    )
  }
}
