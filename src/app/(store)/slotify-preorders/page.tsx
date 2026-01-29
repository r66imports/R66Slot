'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type PreOrderItem = {
  id: string
  sku: string
  description: string
  estimatedDeliveryDate: string
  brand: string
  fullDescription: string
  preOrderPrice: string
  qty: number
  availableQty: number
}

type CartItem = PreOrderItem & {
  selectedQty: number
}

export default function ClientPreordersPage() {
  const [preOrderItems, setPreOrderItems] = useState<PreOrderItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)

  // Load pre-order items from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('slotify-preorders')
    if (stored) {
      const items = JSON.parse(stored)
      setPreOrderItems(items.filter((item: PreOrderItem) => item.availableQty > 0))
    }
  }, [])

  const addToCart = (item: PreOrderItem) => {
    const existingItem = cart.find(c => c.id === item.id)
    if (existingItem) {
      setCart(cart.map(c =>
        c.id === item.id
          ? { ...c, selectedQty: Math.min(c.selectedQty + 1, c.availableQty) }
          : c
      ))
    } else {
      setCart([...cart, { ...item, selectedQty: 1 }])
    }
    setShowCart(true)
  }

  const updateCartQty = (itemId: string, qty: number) => {
    const item = cart.find(c => c.id === itemId)
    if (!item) return

    if (qty === 0) {
      setCart(cart.filter(c => c.id !== itemId))
    } else {
      setCart(cart.map(c =>
        c.id === itemId
          ? { ...c, selectedQty: Math.min(qty, c.availableQty) }
          : c
      ))
    }
  }

  const handleBookOrders = async () => {
    if (cart.length === 0) return

    // Create orders for admin back office
    const orders = cart.map(item => ({
      id: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sku: item.sku,
      description: item.description,
      estimatedDeliveryDate: item.estimatedDeliveryDate,
      brand: item.brand,
      fullDescription: item.fullDescription,
      preOrderPrice: item.preOrderPrice,
      qty: item.selectedQty,
      bookedAt: new Date().toISOString(),
      status: 'pending',
      customerName: 'Customer', // In real app, get from user session
      customerEmail: 'customer@example.com'
    }))

    // Save orders to admin back office
    const existingOrders = JSON.parse(localStorage.getItem('slotify-orders') || '[]')
    localStorage.setItem('slotify-orders', JSON.stringify([...existingOrders, ...orders]))

    // Update available quantities in pre-orders
    const preOrders = JSON.parse(localStorage.getItem('slotify-preorders') || '[]')
    const updatedPreOrders = preOrders.map((po: PreOrderItem) => {
      const cartItem = cart.find(c => c.id === po.id)
      if (cartItem) {
        return { ...po, availableQty: po.availableQty - cartItem.selectedQty }
      }
      return po
    })
    localStorage.setItem('slotify-preorders', JSON.stringify(updatedPreOrders))

    console.log('Booking orders:', orders)
    alert(`Successfully booked ${cart.length} pre-order item(s)!`)
    setCart([])
    setShowCart(false)

    // Reload items
    setPreOrderItems(updatedPreOrders.filter((item: PreOrderItem) => item.availableQty > 0))
  }

  const totalPrice = cart.reduce((sum, item) =>
    sum + (parseFloat(item.preOrderPrice) * item.selectedQty), 0
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold">
              <span className="text-gray-900">Slotify</span>
              <span className="text-blue-600"> Pre-orders</span>
            </h1>
            <button
              onClick={() => setShowCart(!showCart)}
              className="relative px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              🛒 Cart ({cart.length})
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pre-order Items List */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Available Pre-orders</h2>

            {preOrderItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="text-6xl mb-4">📦</div>
                  <h3 className="text-xl font-semibold mb-2">No Pre-orders Available</h3>
                  <p className="text-gray-600">
                    Check back soon for new pre-order items!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {preOrderItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-start gap-4">
                            <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                              <span className="text-4xl">🏎️</span>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1">{item.description}</h3>
                              <p className="text-sm text-gray-600 mb-2">
                                <span className="font-medium">SKU:</span> {item.sku} |
                                <span className="font-medium ml-2">Brand:</span> {item.brand}
                              </p>
                              <p className="text-sm text-gray-700 mb-2">{item.fullDescription}</p>
                              <p className="text-sm text-blue-600">
                                📅 Estimated Delivery: {new Date(item.estimatedDeliveryDate).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-gray-600 mt-2">
                                Available: {item.availableQty} units
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-2xl font-bold text-blue-600 mb-3">
                            R{parseFloat(item.preOrderPrice).toFixed(2)}
                          </p>
                          <Button onClick={() => addToCart(item)}>
                            Add to Cart
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Shopping Cart */}
          <div className={`lg:block ${showCart ? 'block' : 'hidden lg:block'}`}>
            <div className="sticky top-4">
              <Card>
                <CardHeader>
                  <CardTitle>Your Pre-orders</CardTitle>
                </CardHeader>
                <CardContent>
                  {cart.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Your cart is empty</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cart.map((item) => (
                        <div key={item.id} className="border-b pb-4">
                          <p className="font-medium text-sm mb-2">{item.description}</p>
                          <p className="text-xs text-gray-600 mb-2">
                            SKU: {item.sku}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateCartQty(item.id, item.selectedQty - 1)}
                                className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                max={item.availableQty}
                                value={item.selectedQty}
                                onChange={(e) => updateCartQty(item.id, parseInt(e.target.value) || 1)}
                                className="w-16 text-center border border-gray-300 rounded px-2 py-1"
                              />
                              <button
                                onClick={() => updateCartQty(item.id, item.selectedQty + 1)}
                                disabled={item.selectedQty >= item.availableQty}
                                className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                              >
                                +
                              </button>
                            </div>
                            <p className="font-semibold">
                              R{(parseFloat(item.preOrderPrice) * item.selectedQty).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}

                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-4">
                          <span className="font-semibold">Total:</span>
                          <span className="text-2xl font-bold text-blue-600">
                            R{totalPrice.toFixed(2)}
                          </span>
                        </div>
                        <Button
                          onClick={handleBookOrders}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          Book Pre-orders
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
