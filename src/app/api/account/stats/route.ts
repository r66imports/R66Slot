import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { blobRead } from '@/lib/blob-storage'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('customer_token')?.value
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const decoded = jwt.verify(token, JWT_SECRET) as any
    const customerEmail = decoded.email?.toLowerCase()

    const matchesCustomer = (o: any) =>
      o.customerId === decoded.id ||
      o.email?.toLowerCase() === customerEmail ||
      o.customerEmail?.toLowerCase() === customerEmail

    const [preorders, checkoutOrders, addresses] = await Promise.all([
      blobRead<any[]>('data/preorder-list.json', []),
      blobRead<any[]>('data/checkout-orders.json', []),
      blobRead<any[]>('data/addresses.json', []),
    ])

    const allOrders = [
      ...preorders.filter(matchesCustomer),
      ...checkoutOrders.filter((o: any) =>
        o.customer?.email?.toLowerCase() === customerEmail
      ),
    ]

    return NextResponse.json({
      totalOrders: allOrders.length,
      pendingOrders: allOrders.filter((o: any) =>
        o.status === 'pending' || o.status === 'processing' || o.status === 'confirmed'
      ).length,
      savedAddresses: addresses.filter((a: any) => a.customerId === decoded.id).length,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
