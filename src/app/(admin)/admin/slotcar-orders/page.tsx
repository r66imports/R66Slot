'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type PreOrderPoster = {
  id: string
  orderType: 'new-order' | 'pre-order'
  sku: string
  itemDescription: string
  estimatedDeliveryDate: string
  brand: string
  description: string
  preOrderPrice: string
  availableQty: number
  imageUrl: string
  createdAt: string
  published: boolean
}

type PreOrderItem = {
  id: string
  posterId: string
  sku: string
  itemDescription: string
  brand: string
  price: string
  quantity: number
  totalAmount: string
  customerName: string
  customerEmail: string
  orderType: 'new-order' | 'pre-order'
  status: string
  createdAt: string
}

export default function SlotCarOrdersPage() {
  const [posters, setPosters] = useState<PreOrderPoster[]>([])
  const [orders, setOrders] = useState<PreOrderItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchPosters()
    fetchOrders()
  }, [])

  const fetchPosters = async () => {
    try {
      const response = await fetch('/api/admin/slotcar-orders')
      if (response.ok) {
        const data = await response.json()
        setPosters(data)
      }
    } catch (error) {
      console.error('Error fetching posters:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/admin/preorder-list')
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this poster?')) return

    try {
      const response = await fetch(`/api/admin/slotcar-orders/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setPosters(posters.filter((p) => p.id !== id))
      }
    } catch (error) {
      console.error('Error deleting poster:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="font-play flex items-center justify-center min-h-[400px]">
        <p className="text-lg">Loading...</p>
      </div>
    )
  }

  return (
    <div className="font-play">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create Poster</h1>
          <p className="text-gray-600 mt-1">
            Create and manage pre-order posters for WhatsApp
          </p>
        </div>
        <Button
          size="lg"
          asChild
          className="bg-blue-600 hover:bg-blue-700 text-white font-play"
        >
          <Link href="/admin/slotcar-orders/poster">
            Create Pre-Order Poster
          </Link>
        </Button>
      </div>

      {posters.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="space-y-4">
              <div className="text-6xl">🎯</div>
              <h3 className="text-xl font-semibold font-play">No Pre-Order Posters Yet</h3>
              <p className="text-gray-600 font-play">
                Create your first pre-order poster to share with customers via WhatsApp
              </p>
              <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-play">
                <Link href="/admin/slotcar-orders/poster">
                  Create Pre-Order Poster →
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posters.map((poster) => (
            <Card key={poster.id} className="overflow-hidden">
              {poster.imageUrl && (
                <div className="aspect-square bg-gray-100 relative">
                  <img
                    src={poster.imageUrl}
                    alt={poster.itemDescription}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      poster.orderType === 'pre-order'
                        ? 'bg-orange-500 text-white'
                        : 'bg-green-500 text-white'
                    }`}>
                      {poster.orderType === 'pre-order' ? 'PRE-ORDER' : 'NEW ORDER'}
                    </span>
                  </div>
                </div>
              )}
              <CardContent className="p-4">
                <h3 className="font-bold text-lg font-play mb-1">{poster.itemDescription}</h3>
                <p className="text-sm text-gray-600 mb-2">SKU: {poster.sku}</p>
                <p className="text-xl font-bold text-primary font-play">R{poster.preOrderPrice}</p>
                <p className="text-sm text-gray-500 mt-2">Brand: {poster.brand}</p>
                <p className="text-sm text-gray-500">Delivery: {poster.estimatedDeliveryDate}</p>
                <p className="text-sm text-gray-500">Available: {poster.availableQty} units</p>

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" asChild className="flex-1 font-play">
                    <Link href={`/admin/slotcar-orders/poster?edit=${poster.id}`}>
                      Edit
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="flex-1 font-play"
                  >
                    <Link href={`/preorder/${poster.id}`} target="_blank">
                      View
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(poster.id)}
                    className="text-red-600 hover:text-red-700 font-play"
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Pre-Orders */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-play">Recent Pre-Orders</CardTitle>
            <Button variant="outline" size="sm" asChild className="font-play">
              <Link href="/admin/preorder-list">View All Pre-Orders →</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-gray-500 text-sm font-play text-center py-6">
              No pre-orders yet. Orders placed by customers through posters will appear here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 px-3 font-semibold text-xs font-play text-gray-500">Date</th>
                    <th className="py-2 px-3 font-semibold text-xs font-play text-gray-500">Customer</th>
                    <th className="py-2 px-3 font-semibold text-xs font-play text-gray-500">Item</th>
                    <th className="py-2 px-3 font-semibold text-xs font-play text-gray-500">Brand</th>
                    <th className="py-2 px-3 font-semibold text-xs font-play text-gray-500">Qty</th>
                    <th className="py-2 px-3 font-semibold text-xs font-play text-gray-500">Total</th>
                    <th className="py-2 px-3 font-semibold text-xs font-play text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 10).map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 text-xs font-play">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="py-2 px-3 text-xs font-play font-medium">{order.customerName}</td>
                      <td className="py-2 px-3 text-xs font-play">{order.itemDescription}</td>
                      <td className="py-2 px-3 text-xs font-play">{order.brand}</td>
                      <td className="py-2 px-3 text-xs font-play">{order.quantity}</td>
                      <td className="py-2 px-3 text-xs font-play font-semibold">R{order.totalAmount}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium font-play ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-8 bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">💡</div>
            <div className="font-play">
              <h3 className="font-semibold mb-2">How Pre-Order Posters Work</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• Create a poster with product image and details</li>
                <li>• Export to WhatsApp Business as an image with booking link</li>
                <li>• Customers click the link to book their order</li>
                <li>• Orders are stored in List of Pre-Orders for processing</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
