'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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

type CustomerInfo = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
}

export default function PublicPreOrderPage() {
  const params = useParams()
  const router = useRouter()
  const posterId = params.id as string

  const [poster, setPoster] = useState<PreOrderPoster | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedQty, setSelectedQty] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [customer, setCustomer] = useState<CustomerInfo | null>(null)
  const [error, setError] = useState('')

  // Check if customer is logged in
  useEffect(() => {
    checkCustomerAuth()
    fetchPoster()
  }, [posterId])

  const checkCustomerAuth = async () => {
    try {
      const response = await fetch('/api/auth/check')
      if (response.ok) {
        const data = await response.json()
        if (data.authenticated && data.customer) {
          setCustomer(data.customer)
        }
      }
    } catch (error) {
      console.error('Auth check error:', error)
    }
  }

  const fetchPoster = async () => {
    try {
      const response = await fetch(`/api/preorder/${posterId}`)
      if (response.ok) {
        const data = await response.json()
        setPoster(data)
      } else {
        setError('Pre-order not found')
      }
    } catch (error) {
      console.error('Error fetching poster:', error)
      setError('Failed to load pre-order')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlaceOrder = async () => {
    if (!customer) {
      // Redirect to login with return URL
      router.push(`/account/login?returnUrl=/preorder/${posterId}`)
      return
    }

    if (!poster) return

    setIsSubmitting(true)

    try {
      const orderData = {
        posterId: poster.id,
        sku: poster.sku,
        itemDescription: poster.itemDescription,
        brand: poster.brand,
        price: poster.preOrderPrice,
        quantity: selectedQty,
        totalAmount: (parseFloat(poster.preOrderPrice) * selectedQty).toFixed(2),
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        orderType: poster.orderType,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }

      const response = await fetch('/api/preorder/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })

      if (response.ok) {
        setOrderPlaced(true)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to place order')
      }
    } catch (error) {
      console.error('Error placing order:', error)
      setError('Failed to place order. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-play">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error && !poster) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-play">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold mb-2">Pre-Order Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-play hover:bg-blue-700"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    )
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-play">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold mb-2 font-play">Order Placed Successfully!</h1>
          <p className="text-gray-600 mb-4 font-play">
            Thank you for your pre-order. We will contact you shortly to confirm your order.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-600 font-play">
              <strong>Item:</strong> {poster?.itemDescription}
            </p>
            <p className="text-sm text-gray-600 font-play">
              <strong>Quantity:</strong> {selectedQty}
            </p>
            <p className="text-sm text-gray-600 font-play">
              <strong>Total:</strong> R{(parseFloat(poster?.preOrderPrice || '0') * selectedQty).toFixed(2)}
            </p>
          </div>
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-play hover:bg-blue-700 inline-block"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-play">
      {/* Header */}
      <header className="bg-secondary text-white py-4">
        <div className="max-w-4xl mx-auto px-4">
          <Link href="/" className="text-2xl font-bold">
            <span className="text-white">R66</span>
            <span className="text-primary">SLOT</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Order Type Badge */}
          <div className={`py-3 px-4 text-center font-bold text-white font-play text-lg ${
            poster?.orderType === 'pre-order' ? 'bg-orange-500' : 'bg-green-500'
          }`}>
            {poster?.orderType === 'pre-order' ? '🎯 PRE-ORDER' : '✨ NEW ORDER'}
          </div>

          <div className="grid md:grid-cols-2 gap-0">
            {/* Product Image */}
            <div className="aspect-square bg-gray-100 flex items-center justify-center">
              {poster?.imageUrl ? (
                <img
                  src={poster.imageUrl}
                  alt={poster.itemDescription}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-gray-400 text-center p-8">
                  <svg className="mx-auto h-24 w-24 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="font-play">Product Image</p>
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="p-6 flex flex-col">
              <div className="flex-1">
                {/* SKU and Brand */}
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm text-gray-500 font-play">SKU: {poster?.sku}</p>
                  {poster?.brand && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded font-play">
                      {poster.brand}
                    </span>
                  )}
                </div>

                {/* Item Name */}
                <h1 className="text-2xl font-bold mb-3 font-play">{poster?.itemDescription}</h1>

                {/* Description */}
                {poster?.description && (
                  <p className="text-gray-600 mb-4 font-play">{poster.description}</p>
                )}

                {/* Delivery Date */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500 font-play">Estimated Delivery</p>
                      <p className="font-semibold font-play text-lg">
                        {poster?.estimatedDeliveryDate
                          ? new Date(poster.estimatedDeliveryDate).toLocaleDateString('en-ZA', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'TBA'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 font-play">Available</p>
                      <p className="font-semibold font-play">{poster?.availableQty} units</p>
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <p className="text-sm text-gray-500 font-play">Pre-Order Price</p>
                  <p className="text-4xl font-bold text-primary font-play">
                    R{poster?.preOrderPrice}
                  </p>
                </div>
              </div>

              {/* Order Section */}
              <div className="border-t pt-4">
                {/* Quantity Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-play">
                    Select Quantity
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedQty(Math.max(1, selectedQty - 1))}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-xl hover:bg-gray-50"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={selectedQty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1
                        setSelectedQty(Math.min(Math.max(1, val), poster?.availableQty || 10))
                      }}
                      min="1"
                      max={poster?.availableQty || 10}
                      className="w-20 h-10 text-center border border-gray-300 rounded-lg font-play text-lg"
                    />
                    <button
                      onClick={() => setSelectedQty(Math.min((poster?.availableQty || 10), selectedQty + 1))}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-xl hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Total */}
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="font-play">Total:</span>
                    <span className="text-2xl font-bold text-blue-600 font-play">
                      R{(parseFloat(poster?.preOrderPrice || '0') * selectedQty).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 font-play">
                    {error}
                  </div>
                )}

                {/* Place Order Button */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-blue-600 text-white font-bold rounded-lg font-play text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Placing Order...' : customer ? 'Place Order' : 'Sign In to Order'}
                </button>

                {!customer && (
                  <p className="text-center text-sm text-gray-500 mt-3 font-play">
                    You need to <Link href={`/account/login?returnUrl=/preorder/${posterId}`} className="text-blue-600 hover:underline">sign in</Link> or{' '}
                    <Link href={`/account/register?returnUrl=/preorder/${posterId}`} className="text-blue-600 hover:underline">create an account</Link> to place an order.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="font-bold mb-3 font-play">About Pre-Orders</h3>
          <ul className="space-y-2 text-sm text-gray-600 font-play">
            <li>• Pre-orders secure your item before it arrives in stock</li>
            <li>• You will be contacted to confirm your order and payment details</li>
            <li>• Estimated delivery dates are subject to supplier availability</li>
            <li>• Contact us via WhatsApp for any questions</li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-secondary text-white py-6 mt-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="font-play text-sm text-gray-400">
            © {new Date().getFullYear()} R66SLOT - Premium Slot Cars & Collectibles
          </p>
        </div>
      </footer>
    </div>
  )
}
