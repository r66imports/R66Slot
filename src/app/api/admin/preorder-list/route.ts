import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'

const ORDERS_KEY = 'data/preorder-list.json'

async function getOrders() {
  return await blobRead<any[]>(ORDERS_KEY, [])
}

// GET all orders
export async function GET() {
  try {
    const orders = await getOrders()
    orders.sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
