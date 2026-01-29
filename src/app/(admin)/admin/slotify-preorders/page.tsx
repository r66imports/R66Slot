'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type PreOrder = {
  id: string
  sku: string
  description: string
  estimatedDeliveryDate: string
  brand: string
  fullDescription: string
  preOrderPrice: string
  qty: number
  createdAt: string
}

export default function SlotifyPreordersPage() {
  const [preOrders, setPreOrders] = useState<PreOrder[]>([])

  // Load pre-orders from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('slotify-preorders')
    if (stored) {
      setPreOrders(JSON.parse(stored))
    }
  }, [])

  const handleExport = () => {
    // Export as CSV with editable qty
    const csvContent = [
      ['SKU', 'Description', 'Estimated Delivery', 'Brand', 'Full Description', 'Pre-Order Price (R)', 'Qty'],
      ...preOrders.map(order => [
        order.sku,
        order.description,
        order.estimatedDeliveryDate,
        order.brand,
        order.fullDescription,
        order.preOrderPrice,
        order.qty.toString()
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `slotify-preorders-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Slotify Pre-orders</h1>
          <p className="text-gray-600 mt-1">
            Manage pre-order items for customer bookings
          </p>
        </div>
        <div className="flex gap-3">
          {preOrders.length > 0 && (
            <Button variant="outline" onClick={handleExport}>
              📤 Export Pre-orders
            </Button>
          )}
          <Button size="lg" asChild>
            <Link href="/admin/slotify-preorders/new">
              Add Pre-order Item
            </Link>
          </Button>
        </div>
      </div>

      {preOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="space-y-4">
              <div className="text-6xl">📦</div>
              <h3 className="text-xl font-semibold">No Pre-orders Yet</h3>
              <p className="text-gray-600">
                Create your first pre-order item to start taking customer bookings
              </p>
              <Button asChild className="mt-4">
                <Link href="/admin/slotify-preorders/new">
                  Add Pre-order Item →
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pre-order Items ({preOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">SKU</th>
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-left py-3 px-4">Delivery Date</th>
                    <th className="text-left py-3 px-4">Brand</th>
                    <th className="text-left py-3 px-4">Price (R)</th>
                    <th className="text-left py-3 px-4">Available Qty</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {preOrders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm">{order.sku}</td>
                      <td className="py-3 px-4">{order.description}</td>
                      <td className="py-3 px-4">{order.estimatedDeliveryDate}</td>
                      <td className="py-3 px-4">{order.brand}</td>
                      <td className="py-3 px-4">R{order.preOrderPrice}</td>
                      <td className="py-3 px-4">{order.qty}</td>
                      <td className="py-3 px-4">
                        <Button variant="outline" size="sm">
                          Edit
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
