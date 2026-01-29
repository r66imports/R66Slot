import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const ORDERS_FILE = path.join(process.cwd(), 'data', 'preorder-list.json')
const POSTERS_FILE = path.join(process.cwd(), 'data', 'slotcar-orders.json')

function getOrders() {
  try {
    if (!fs.existsSync(ORDERS_FILE)) {
      fs.writeFileSync(ORDERS_FILE, '[]', 'utf-8')
      return []
    }
    const data = fs.readFileSync(ORDERS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

function saveOrders(orders: any[]) {
  const dir = path.dirname(ORDERS_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8')
}

function getPosters() {
  try {
    if (!fs.existsSync(POSTERS_FILE)) {
      return []
    }
    const data = fs.readFileSync(POSTERS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

function savePosters(posters: any[]) {
  fs.writeFileSync(POSTERS_FILE, JSON.stringify(posters, null, 2), 'utf-8')
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
    const posters = getPosters()
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
    const orders = getOrders()
    const newOrder = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...orderData,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    orders.push(newOrder)
    saveOrders(orders)

    // Update poster available quantity
    posters[posterIndex].availableQty -= orderData.quantity
    savePosters(posters)

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
