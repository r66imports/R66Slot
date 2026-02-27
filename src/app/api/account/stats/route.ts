import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { blobRead } from '@/lib/blob-storage'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-replace-in-production'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('customer_token')?.value
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const decoded = jwt.verify(token, JWT_SECRET) as any
    const customerEmail = decoded.email?.toLowerCase()

    const matchesCustomer = (o: any) =>
      o.customerId === decoded.id || o.email?.toLowerCase() === customerEmail

    const [preorders, slotcarOrders, addresses] = await Promise.all([
      blobRead<any[]>('data/preorder-list.json', []),
      blobRead<any[]>('data/slotcar-orders.json', []),
      blobRead<any[]>('data/addresses.json', []),
    ])

    const orders = [
      ...preorders.filter(matchesCustomer),
      ...slotcarOrders.filter(matchesCustomer),
    ]

    return NextResponse.json({
      totalOrders: orders.length,
      pendingOrders: orders.filter((o: any) =>
        o.status === 'pending' || o.status === 'processing'
      ).length,
      savedAddresses: addresses.filter((a: any) => a.customerId === decoded.id).length,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
