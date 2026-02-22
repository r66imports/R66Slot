'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type PreOrderItem = {
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

interface BookingFormWidgetProps {
  title?: string
  subtitle?: string
  accentColor?: string
  backgroundColor?: string
  textColor?: string
  layout?: 'grid' | 'list'
  showBrandFilter?: boolean
}

export default function BookingFormWidget({
  title = 'Pre-Order Now',
  subtitle = 'Browse available items and place your pre-order',
  accentColor = '#DC2626',
  backgroundColor = '#ffffff',
  textColor = '#1F2937',
  layout = 'grid',
  showBrandFilter = true,
}: BookingFormWidgetProps) {
  const [items, setItems] = useState<PreOrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<PreOrderItem | null>(null)
  const [brandFilter, setBrandFilter] = useState<string>('all')

  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedQty, setSelectedQty] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)

  useEffect(() => {
    fetchItems()
  }, [])

  async function fetchItems() {
    try {
      const res = await fetch('/api/preorder/available')
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
      }
    } catch {
      // Failed to load
    } finally {
      setLoading(false)
    }
  }

  const brands = Array.from(new Set(items.map((i) => i.brand).filter(Boolean)))
  const filteredItems =
    brandFilter === 'all' ? items : items.filter((i) => i.brand === brandFilter)

  async function handlePlaceOrder() {
    if (!selectedItem) return
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      alert('Please fill in all fields')
      return
    }

    setIsSubmitting(true)
    try {
      const orderData = {
        posterId: selectedItem.id,
        sku: selectedItem.sku,
        itemDescription: selectedItem.itemDescription,
        brand: selectedItem.brand,
        price: selectedItem.preOrderPrice,
        quantity: selectedQty,
        totalAmount: (parseFloat(selectedItem.preOrderPrice) * selectedQty).toFixed(2),
        customerId: `guest_${Date.now()}`,
        customerName: `${firstName.trim()} ${lastName.trim()}`,
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        orderType: selectedItem.orderType,
        estimatedDeliveryDate: selectedItem.estimatedDeliveryDate,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }

      const res = await fetch('/api/preorder/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })

      if (res.ok) {
        setOrderPlaced(true)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to place order')
      }
    } catch {
      alert('Failed to place order. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Order success view
  if (orderPlaced && selectedItem) {
    return (
      <div style={{ backgroundColor, color: textColor }} className="rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">&#10004;</div>
        <h2 className="text-2xl font-bold mb-2">Order Placed!</h2>
        <p className="mb-4 opacity-80">
          Thank you for your {selectedItem.orderType === 'pre-order' ? 'pre-order' : 'order'}.
          We will contact you shortly to confirm.
        </p>
        <div className="bg-gray-50 rounded-lg p-4 mb-6 inline-block text-left" style={{ minWidth: '280px' }}>
          <p className="text-sm mb-1"><strong>Item:</strong> {selectedItem.itemDescription}</p>
          <p className="text-sm mb-1"><strong>Quantity:</strong> {selectedQty}</p>
          <p className="text-sm"><strong>Total:</strong> R{(parseFloat(selectedItem.preOrderPrice) * selectedQty).toFixed(2)}</p>
        </div>
        <div>
          <button
            onClick={() => {
              setOrderPlaced(false)
              setSelectedItem(null)
              setFirstName('')
              setLastName('')
              setEmail('')
              setPhone('')
              setSelectedQty(1)
              fetchItems()
            }}
            style={{ backgroundColor: accentColor }}
            className="px-6 py-3 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Place Another Order
          </button>
        </div>
      </div>
    )
  }

  // Booking form for selected item
  if (selectedItem) {
    return (
      <div style={{ backgroundColor, color: textColor }}>
        <button
          onClick={() => { setSelectedItem(null); setSelectedQty(1) }}
          className="mb-4 text-sm flex items-center gap-1 opacity-70 hover:opacity-100"
        >
          &larr; Back to items
        </button>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ color: '#1F2937' }}>
          <div
            className="py-3 px-4 text-center font-bold text-white text-lg"
            style={{ backgroundColor: selectedItem.orderType === 'pre-order' ? '#F97316' : '#22C55E' }}
          >
            {selectedItem.orderType === 'pre-order' ? 'PRE-ORDER' : 'NEW ORDER'}
          </div>

          <div className="grid md:grid-cols-2 gap-0">
            {/* Product Image */}
            <div className="aspect-square bg-gray-100 flex items-center justify-center">
              {selectedItem.imageUrl ? (
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.itemDescription}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-gray-400 text-center p-8">
                  <span className="text-6xl block mb-2">&#128662;</span>
                  <p>Product Image</p>
                </div>
              )}
            </div>

            {/* Details & Form */}
            <div className="p-6 flex flex-col">
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm text-gray-500">SKU: {selectedItem.sku}</p>
                  {selectedItem.brand && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                      {selectedItem.brand}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-bold mb-3">{selectedItem.itemDescription}</h2>

                {selectedItem.description && (
                  <p className="text-gray-600 mb-4">{selectedItem.description}</p>
                )}

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500">Est. Delivery</p>
                      <p className="font-semibold">
                        {selectedItem.estimatedDeliveryDate
                          ? new Date(selectedItem.estimatedDeliveryDate).toLocaleDateString('en-ZA', {
                              year: 'numeric', month: 'long', day: 'numeric',
                            })
                          : 'TBA'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Available</p>
                      <p className="font-semibold">{selectedItem.availableQty} units</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-500">Price</p>
                  <p className="text-3xl font-bold" style={{ color: accentColor }}>
                    R{selectedItem.preOrderPrice}
                  </p>
                </div>
              </div>

              {/* Form */}
              <div className="border-t pt-4 space-y-3">
                <h3 className="font-bold">Your Details</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">First Name *</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      style={{ '--tw-ring-color': accentColor } as any}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+27 61 234 5678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Quantity</label>
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
                        setSelectedQty(Math.min(Math.max(1, val), selectedItem.availableQty))
                      }}
                      min="1"
                      max={selectedItem.availableQty}
                      className="w-20 h-10 text-center border border-gray-300 rounded-lg text-lg"
                    />
                    <button
                      onClick={() => setSelectedQty(Math.min(selectedItem.availableQty, selectedQty + 1))}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-xl hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Total */}
                <div className="rounded-lg p-4" style={{ backgroundColor: `${accentColor}10` }}>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total:</span>
                    <span className="text-2xl font-bold" style={{ color: accentColor }}>
                      R{(parseFloat(selectedItem.preOrderPrice) * selectedQty).toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting || !firstName || !lastName || !email || !phone}
                  style={{ backgroundColor: accentColor }}
                  className="w-full py-4 text-white font-bold rounded-lg text-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? 'Placing Order...' : 'Place Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Items listing view
  return (
    <div style={{ backgroundColor, color: textColor }}>
      {/* Title */}
      {title && <h2 className="text-3xl font-bold mb-2 text-center">{title}</h2>}
      {subtitle && <p className="text-center opacity-70 mb-6">{subtitle}</p>}

      {/* Brand filter */}
      {showBrandFilter && brands.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <button
            onClick={() => setBrandFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              brandFilter === 'all' ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            style={brandFilter === 'all' ? { backgroundColor: accentColor } : {}}
          >
            All Brands
          </button>
          {brands.map((brand) => (
            <button
              key={brand}
              onClick={() => setBrandFilter(brand)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                brandFilter === brand ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={brandFilter === brand ? { backgroundColor: accentColor } : {}}
            >
              {brand}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: accentColor }} />
          <p className="mt-3 opacity-70">Loading available items...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredItems.length === 0 && (
        <div className="text-center py-12">
          <span className="text-5xl block mb-3">&#128230;</span>
          <p className="text-lg font-semibold mb-1">No items available</p>
          <p className="opacity-70">Check back soon for new pre-order items!</p>
        </div>
      )}

      {/* Items grid/list */}
      {!loading && filteredItems.length > 0 && (
        <div className={
          layout === 'list'
            ? 'space-y-4'
            : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
        }>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${
                layout === 'list' ? 'flex' : ''
              }`}
              style={{ color: '#1F2937' }}
              onClick={() => setSelectedItem(item)}
            >
              {/* Image */}
              <div className={`bg-gray-100 flex items-center justify-center ${
                layout === 'list' ? 'w-48 flex-shrink-0' : 'aspect-square'
              }`}>
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.itemDescription}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-gray-400 text-4xl">&#128662;</span>
                )}
              </div>

              {/* Info */}
              <div className="p-4 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: item.orderType === 'pre-order' ? '#F97316' : '#22C55E' }}
                  >
                    {item.orderType === 'pre-order' ? 'PRE-ORDER' : 'NEW'}
                  </span>
                  {item.brand && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      {item.brand}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-lg mb-1 line-clamp-2">{item.itemDescription}</h3>

                {item.description && (
                  <p className="text-sm text-gray-500 mb-2 line-clamp-2">{item.description}</p>
                )}

                <div className="flex justify-between items-end mt-3">
                  <div>
                    <p className="text-2xl font-bold" style={{ color: accentColor }}>
                      R{item.preOrderPrice}
                    </p>
                    <p className="text-xs text-gray-500">{item.availableQty} available</p>
                  </div>
                  <button
                    style={{ backgroundColor: accentColor }}
                    className="px-4 py-2 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
