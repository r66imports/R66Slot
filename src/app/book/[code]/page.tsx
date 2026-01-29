'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type PosterData = {
  id: string
  shortCode: string
  orderType: 'new-order' | 'pre-order'
  sku: string
  itemDescription: string
  estimatedDeliveryDate: string
  brand: string
  description: string
  preOrderPrice: string
  availableQty: number
  imageUrl: string
}

export default function BookHerePage() {
  const params = useParams()
  const code = params.code as string

  const [poster, setPoster] = useState<PosterData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Form fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedQty, setSelectedQty] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)

  useEffect(() => {
    fetchPoster()
  }, [code])

  const fetchPoster = async () => {
    try {
      // Find poster by short code via API
      const response = await fetch(`/api/book/${code}`)
      if (response.ok) {
        const data = await response.json()
        setPoster(data)
      } else {
        setError('This booking link is no longer available.')
      }
    } catch {
      setError('Failed to load booking page.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlaceOrder = async () => {
    if (!poster) return
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      alert('Please fill in all fields')
      return
    }

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
        customerId: `guest_${Date.now()}`,
        customerName: `${firstName.trim()} ${lastName.trim()}`,
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        orderType: poster.orderType,
        estimatedDeliveryDate: poster.estimatedDeliveryDate,
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
        alert(data.error || 'Failed to place order')
      }
    } catch {
      alert('Failed to place order. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-play">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-play">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !poster) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-play">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold mb-2 font-play">Booking Not Found</h1>
          <p className="text-gray-600 mb-6 font-play">{error || 'This booking link is invalid.'}</p>
          <Link
            href="/"
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-play hover:bg-red-700 inline-block"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    )
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gray-50 font-play">
        <header className="bg-gray-900 text-white py-4">
          <div className="max-w-4xl mx-auto px-4">
            <Link href="/" className="text-2xl font-bold font-play">
              <span className="text-white">R66</span>
              <span className="text-red-500">SLOT</span>
            </Link>
          </div>
        </header>
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center mx-4">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold mb-2 font-play">Order Placed!</h1>
            <p className="text-gray-600 mb-4 font-play">
              Thank you for your {poster.orderType === 'pre-order' ? 'pre-order' : 'order'}. We will contact you shortly to confirm.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-600 font-play"><strong>Item:</strong> {poster.itemDescription}</p>
              <p className="text-sm text-gray-600 font-play"><strong>Quantity:</strong> {selectedQty}</p>
              <p className="text-sm text-gray-600 font-play"><strong>Total:</strong> R{(parseFloat(poster.preOrderPrice) * selectedQty).toFixed(2)}</p>
            </div>
            <Link
              href="/"
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-play hover:bg-red-700 inline-block"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-play">
      {/* Header */}
      <header className="bg-gray-900 text-white py-4">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold font-play">
            <span className="text-white">R66</span>
            <span className="text-red-500">SLOT</span>
          </Link>
          <span className="text-sm text-gray-400 font-play">Book Your Order</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Order Type Badge */}
          <div className={`py-3 px-4 text-center font-bold text-white font-play text-lg ${
            poster.orderType === 'pre-order' ? 'bg-orange-500' : 'bg-green-500'
          }`}>
            {poster.orderType === 'pre-order' ? '🎯 PRE-ORDER' : '✨ NEW ORDER'}
          </div>

          <div className="grid md:grid-cols-2 gap-0">
            {/* Product Image */}
            <div className="aspect-square bg-gray-100 flex items-center justify-center">
              {poster.imageUrl ? (
                <img
                  src={poster.imageUrl}
                  alt={poster.itemDescription}
                  className="w-full h-full object-contain"
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

            {/* Product Details & Booking Form */}
            <div className="p-6 flex flex-col">
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm text-gray-500 font-play">SKU: {poster.sku}</p>
                  {poster.brand && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded font-play">
                      {poster.brand}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl font-bold mb-3 font-play">{poster.itemDescription}</h1>

                {poster.description && (
                  <p className="text-gray-600 mb-4 font-play">{poster.description}</p>
                )}

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500 font-play">Est. Delivery</p>
                      <p className="font-semibold font-play">
                        {poster.estimatedDeliveryDate
                          ? new Date(poster.estimatedDeliveryDate).toLocaleDateString('en-ZA', {
                              year: 'numeric', month: 'long', day: 'numeric',
                            })
                          : 'TBA'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 font-play">Available</p>
                      <p className="font-semibold font-play">{poster.availableQty} units</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-500 font-play">Price</p>
                  <p className="text-3xl font-bold text-red-600 font-play">R{poster.preOrderPrice}</p>
                </div>
              </div>

              {/* Booking Form */}
              <div className="border-t pt-4 space-y-3">
                <h3 className="font-bold font-play">Your Details</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1 font-play">First Name *</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-play focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1 font-play">Last Name *</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-play focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1 font-play">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-play focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1 font-play">Phone Number *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+27 61 234 5678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-play focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1 font-play">Quantity</label>
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
                        setSelectedQty(Math.min(Math.max(1, val), poster.availableQty))
                      }}
                      min="1"
                      max={poster.availableQty}
                      className="w-20 h-10 text-center border border-gray-300 rounded-lg font-play text-lg"
                    />
                    <button
                      onClick={() => setSelectedQty(Math.min(poster.availableQty, selectedQty + 1))}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-xl hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Total */}
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-play font-semibold">Total:</span>
                    <span className="text-2xl font-bold text-red-600 font-play">
                      R{(parseFloat(poster.preOrderPrice) * selectedQty).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Place Order */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting || !firstName || !lastName || !email || !phone}
                  className="w-full py-4 bg-red-600 text-white font-bold rounded-lg font-play text-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Placing Order...' : 'Place Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-6 mt-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="font-play text-sm text-gray-400">
            &copy; {new Date().getFullYear()} R66SLOT - Premium Slot Cars &amp; Collectibles
          </p>
        </div>
      </footer>
    </div>
  )
}
