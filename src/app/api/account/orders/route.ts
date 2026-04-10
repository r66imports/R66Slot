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

    const [preorders, checkoutOrders, backorders, documents] = await Promise.all([
      blobRead<any[]>('data/preorder-list.json', []),
      blobRead<any[]>('data/checkout-orders.json', []),
      blobRead<any[]>('data/backorders.json', []),
      blobRead<any[]>('data/order-documents.json', []),
    ])

    const matchesCustomer = (o: any) =>
      o.customerId === decoded.id ||
      o.email?.toLowerCase() === customerEmail ||
      o.customerEmail?.toLowerCase() === customerEmail ||
      o.clientEmail?.toLowerCase() === customerEmail ||
      o.customer?.email?.toLowerCase() === customerEmail

    const entries: any[] = [
      // Checkout orders
      ...checkoutOrders.filter(matchesCustomer).map((o: any) => ({
        id: o.id,
        ref: o.orderNumber || o.id?.slice(-8).toUpperCase(),
        type: 'order',
        date: o.createdAt || new Date().toISOString(),
        status: o.status || 'pending',
        total: Number(o.total || o.subtotal || 0),
        items: (o.items || []).map((i: any) => ({
          sku: i.sku || '',
          description: i.title || i.description || '',
          qty: i.quantity || 1,
          price: Number(i.price || 0),
        })),
      })),

      // Old preorder-list
      ...preorders.filter(matchesCustomer).map((o: any) => ({
        id: o.id,
        ref: o.orderNumber || o.id?.slice(-8).toUpperCase(),
        type: 'preorder',
        date: o.createdAt || new Date().toISOString(),
        status: o.status || 'pending',
        total: Number(o.totalAmount || o.total || (parseFloat(o.price || '0') * (o.quantity || 1))),
        items: [{
          sku: o.sku || '',
          description: o.itemDescription || o.description || '',
          qty: o.quantity || 1,
          price: Number(o.price || 0),
        }],
      })),

      // Book-now backorders
      ...backorders.filter((b: any) => b.source === 'book-now' && matchesCustomer(b)).map((b: any) => ({
        id: b.id,
        ref: b.id?.slice(-8).toUpperCase(),
        type: 'booking',
        date: b.createdAt || new Date().toISOString(),
        status: b.status || 'pending',
        total: Number(b.price || 0) * Number(b.qty || 1),
        items: [{
          sku: b.sku || '',
          description: b.description || '',
          qty: b.qty || 1,
          price: Number(b.price || 0),
        }],
      })),

      // Admin documents (quotes, sales orders, invoices)
      ...documents.filter(matchesCustomer).map((d: any) => ({
        id: d.id,
        ref: d.docNumber || d.id?.slice(-8).toUpperCase(),
        type: d.type, // 'quote' | 'salesorder' | 'invoice'
        date: d.createdAt || new Date().toISOString(),
        status: d.status || 'draft',
        total: (() => {
          const sub = (d.lineItems || []).reduce((s: number, i: any) => s + (Number(i.price || 0) * Number(i.qty || 1)), 0)
          const disc = d.discountPct ? sub * (d.discountPct / 100) : 0
          const ship = Number(d.shippingCost || 0)
          return (sub - disc + ship) * 1.15
        })(),
        items: (d.lineItems || []).map((i: any) => ({
          sku: i.sku || '',
          description: i.description || '',
          qty: Number(i.qty || 1),
          price: Number(i.price || 0),
        })),
      })),
    ]

    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return NextResponse.json(entries)
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
