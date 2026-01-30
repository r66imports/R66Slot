import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { blobRead } from '@/lib/blob-storage'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const ORDERS_KEY = 'data/orders.json'
const ADDRESSES_KEY = 'data/addresses.json'

async function getOrders() {
  return await blobRead<any[]>(ORDERS_KEY, [])
}

async function getAddresses() {
  return await blobRead<any[]>(ADDRESSES_KEY, [])
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('customer_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any
    const orders = (await getOrders()).filter((o: any) => o.customerId === decoded.id)
    const addresses = (await getAddresses()).filter((a: any) => a.customerId === decoded.id)

    const stats = {
      totalOrders: orders.length,
      pendingOrders: orders.filter((o: any) => o.status === 'pending' || o.status === 'processing').length,
      savedAddresses: addresses.length,
    }

    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
