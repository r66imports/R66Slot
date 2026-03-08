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

    const preorders = await blobRead<any[]>('data/preorder-list.json', [])

    // Match by customerId OR email (orders store field as customerEmail)
    const matchesCustomer = (o: any) =>
      o.customerId === decoded.id ||
      o.email?.toLowerCase() === customerEmail ||
      o.customerEmail?.toLowerCase() === customerEmail

    const orders = [
      ...preorders.filter(matchesCustomer).map(o => ({
        id: o.id,
        orderNumber: o.orderNumber || o.id?.slice(-8).toUpperCase() || 'N/A',
        date: o.createdAt || o.date || new Date().toISOString(),
        status: o.status || 'pending',
        total: o.total || o.totalAmount || 0,
        itemCount: o.items?.length || o.quantity || 1,
        type: 'preorder',
        notes: o.notes || '',
      })),
    ]

    // Sort newest first
    orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json(orders)
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
