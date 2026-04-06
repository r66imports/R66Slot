'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface OrderDetail {
  id: string
  orderNumber: string
  date: string
  status: string
  total: number
  itemCount: number
  type: string
  notes: string
  items?: Array<{ sku: string; title: string; brand: string; price: number; quantity: number; imageUrl: string }>
  customer?: { firstName: string; lastName: string; email: string; phone: string }
  shipping?: { address: string; suburb: string; city: string; postalCode: string; method: string; notes: string }
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing:'bg-blue-100 text-blue-800',
  shipped:   'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  invoiced:  'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/account/orders')
      .then((res) => {
        if (res.status === 401) { router.push('/account/login'); return null }
        return res.json()
      })
      .then((data) => {
        if (!Array.isArray(data)) return
        const found = data.find((o: any) => o.id === id)
        setOrder(found ?? null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-gray-400">Loading order…</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="text-5xl mb-4">📦</div>
        <h2 className="text-xl font-bold mb-2">Order not found</h2>
        <Link href="/account/orders" className="text-red-600 text-sm hover:underline">← Back to Orders</Link>
      </div>
    )
  }

  const statusColor = STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-700'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <Link href="/account/orders" className="text-sm text-gray-500 hover:text-gray-700 block mb-3">← Back to Orders</Link>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold">Order #{order.orderNumber}</h2>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Placed on {new Date(order.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Items */}
      {order.items && order.items.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Items Ordered</h3>
          <div className="divide-y divide-gray-100">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.title} className="w-12 h-12 object-cover rounded-lg border border-gray-200 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  {item.brand && <p className="text-xs text-gray-400 uppercase font-semibold">{item.brand}</p>}
                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  {item.sku && <p className="text-xs text-gray-400">SKU: {item.sku}</p>}
                </div>
                <div className="text-sm text-gray-500">×{item.quantity}</div>
                <div className="text-sm font-semibold text-gray-900 w-20 text-right">
                  R{Number(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between font-semibold">
            <span>Total</span>
            <span>R{Number(order.total).toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Shipping */}
      {order.shipping && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Shipping Details</h3>
          <div className="text-sm text-gray-600 space-y-1.5">
            {order.shipping.method && (
              <div><span className="font-medium text-gray-700">Method: </span>{order.shipping.method}</div>
            )}
            {(order.shipping.address || order.shipping.city) && (
              <div>
                <span className="font-medium text-gray-700">Address: </span>
                {[order.shipping.address, order.shipping.suburb, order.shipping.city, order.shipping.postalCode].filter(Boolean).join(', ')}
              </div>
            )}
            {order.shipping.notes && (
              <div><span className="font-medium text-gray-700">Notes: </span>{order.shipping.notes}</div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {!order.shipping && order.notes && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
          <p className="text-sm text-gray-600">{order.notes}</p>
        </div>
      )}
    </div>
  )
}
