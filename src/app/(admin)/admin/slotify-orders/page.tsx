'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type SlotifyOrder = {
  id: string
  sku: string
  description: string
  estimatedDeliveryDate: string
  brand: string
  fullDescription: string
  preOrderPrice: string
  qty: number
  customerName?: string
  customerEmail?: string
  bookedAt: string
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered'
}

export default function SlotifyOrdersPage() {
  const [orders, setOrders] = useState<SlotifyOrder[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'shipped' | 'delivered'>('all')

  // Load orders from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('slotify-orders')
    if (stored) {
      setOrders(JSON.parse(stored))
    }
  }, [])

  const handleExport = () => {
    // Export as CSV with editable qty
    const csvContent = [
      ['Order ID', 'SKU', 'Description', 'Estimated Delivery', 'Brand', 'Price (R)', 'Qty', 'Customer', 'Status', 'Booked Date'],
      ...filteredOrders.map(order => [
        order.id,
        order.sku,
        order.description,
        order.estimatedDeliveryDate,
        order.brand,
        order.preOrderPrice,
        order.qty.toString(),
        order.customerName || 'N/A',
        order.status,
        new Date(order.bookedAt).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `slotify-orders-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter(order => order.status === filter)

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Slotify Orders</h1>
          <p className="text-gray-600 mt-1">
            Manage customer pre-order bookings
          </p>
        </div>
        {orders.length > 0 && (
          <Button variant="outline" onClick={handleExport}>
            📤 Export Orders
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2">
        {(['all', 'pending', 'confirmed', 'shipped', 'delivered'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && ` (${orders.filter(o => o.status === status).length})`}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="space-y-4">
              <div className="text-6xl">📋</div>
              <h3 className="text-xl font-semibold">No Orders Yet</h3>
              <p className="text-gray-600">
                Customer bookings will appear here when they book pre-order items
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Orders ({filteredOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Order ID</th>
                    <th className="text-left py-3 px-4">SKU</th>
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-left py-3 px-4">Customer</th>
                    <th className="text-left py-3 px-4">Brand</th>
                    <th className="text-left py-3 px-4">Price (R)</th>
                    <th className="text-left py-3 px-4">Qty</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Booked Date</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm">{order.id}</td>
                      <td className="py-3 px-4 font-mono text-sm">{order.sku}</td>
                      <td className="py-3 px-4">{order.description}</td>
                      <td className="py-3 px-4">{order.customerName || 'N/A'}</td>
                      <td className="py-3 px-4">{order.brand}</td>
                      <td className="py-3 px-4">R{order.preOrderPrice}</td>
                      <td className="py-3 px-4">{order.qty}</td>
                      <td className="py-3 px-4">{getStatusBadge(order.status)}</td>
                      <td className="py-3 px-4">{new Date(order.bookedAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
