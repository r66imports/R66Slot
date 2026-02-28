'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Product = {
  id: string
  shortCode: string
  orderType: 'new-order' | 'pre-order'
  sku: string
  itemDescription: string
  brand: string
  description: string
  preOrderPrice: string
  availableQty: number
  estimatedDeliveryDate: string
  imageUrl: string
}

type LoggedInUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
}

export default function BookNowClient() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterBrand, setFilterBrand] = useState('all')
  const [filterType, setFilterType] = useState<'all' | 'new-order' | 'pre-order'>('all')

  // Logged-in user for auto-fill
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(null)

  // Booking modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedQty, setSelectedQty] = useState(1)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)

  useEffect(() => {
    fetchProducts()
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setLoggedInUser({
          id: data.id || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
        })
      }
    } catch {
      // not logged in — that's fine
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/book/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const brands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort()

  const filteredProducts = products.filter(p => {
    if (filterBrand !== 'all' && p.brand !== filterBrand) return false
    if (filterType !== 'all' && p.orderType !== filterType) return false
    return true
  })

  const openBookingModal = (product: Product) => {
    setSelectedProduct(product)
    setSelectedQty(1)
    // Auto-fill from logged-in user if available
    setFirstName(loggedInUser?.firstName || '')
    setLastName(loggedInUser?.lastName || '')
    setEmail(loggedInUser?.email || '')
    setPhone(loggedInUser?.phone || '')
    setOrderSuccess(false)
  }

  const closeModal = () => {
    setSelectedProduct(null)
    setOrderSuccess(false)
  }

  const handlePlaceOrder = async () => {
    if (!selectedProduct) return
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      alert('Please fill in all fields')
      return
    }

    setIsSubmitting(true)
    try {
      const orderData = {
        posterId: selectedProduct.id,
        sku: selectedProduct.sku,
        itemDescription: selectedProduct.itemDescription,
        brand: selectedProduct.brand,
        price: selectedProduct.preOrderPrice,
        quantity: selectedQty,
        totalAmount: (parseFloat(selectedProduct.preOrderPrice) * selectedQty).toFixed(2),
        customerId: loggedInUser?.id || `guest_${Date.now()}`,
        customerName: `${firstName.trim()} ${lastName.trim()}`,
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        orderType: selectedProduct.orderType,
        estimatedDeliveryDate: selectedProduct.estimatedDeliveryDate,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }

      const response = await fetch('/api/preorder/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })

      if (response.ok) {
        setOrderSuccess(true)
        fetchProducts()
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

  return (
    <div className="min-h-screen bg-gray-50 font-play">
      {/* Header */}
      <header className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold font-play">
            <span className="text-white">R66</span>
            <span className="text-red-500">SLOT</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-sm text-gray-300 hover:text-white font-play">
              Home
            </Link>
            <Link href="/products" className="text-sm text-gray-300 hover:text-white font-play">
              Products
            </Link>
            <span className="text-sm text-white font-bold font-play border-b-2 border-red-500 pb-1">
              Book Now
            </span>
            {loggedInUser ? (
              <Link href="/account" className="text-sm text-green-400 hover:text-green-300 font-play flex items-center gap-1">
                <span>●</span> {loggedInUser.firstName}
              </Link>
            ) : (
              <Link href="/account/login" className="text-sm text-gray-300 hover:text-white font-play">
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gray-900 text-white pb-12 pt-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold font-play mb-4">
            Book Now
          </h1>
          <p className="text-gray-400 text-lg font-play max-w-2xl mx-auto">
            Browse our latest slot cars and collectibles. Select your items, choose your quantity, and place your order.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 -mt-6">
        <div className="bg-white rounded-xl shadow-md p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-600 font-play">Brand:</label>
            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-play focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Brands</option>
              {brands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-600 font-play">Type:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-play focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Types</option>
              <option value="new-order">New Orders</option>
              <option value="pre-order">Pre-Orders</option>
            </select>
          </div>
          <div className="ml-auto text-sm text-gray-500 font-play">
            {filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''} available
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <p className="text-lg text-gray-500 font-play">Loading available items...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏎️</div>
            <h2 className="text-2xl font-bold font-play mb-2">No Items Available</h2>
            <p className="text-gray-500 font-play">
              {products.length === 0
                ? 'Check back soon for new arrivals and pre-orders.'
                : 'No items match your selected filters. Try adjusting your filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow group"
              >
                {/* Order Type Badge */}
                <div className={`py-1.5 px-3 text-center text-xs font-bold text-white font-play ${
                  product.orderType === 'pre-order' ? 'bg-orange-500' : 'bg-green-500'
                }`}>
                  {product.orderType === 'pre-order' ? 'PRE-ORDER' : 'NEW ORDER'}
                </div>

                {/* Product Image */}
                <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.itemDescription}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-gray-300 text-center p-4">
                      <svg className="mx-auto h-16 w-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="font-play text-sm">No Image</p>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                  {product.brand && (
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-play mb-1">
                      {product.brand}
                    </p>
                  )}
                  <h3 className="font-bold text-sm font-play mb-1 line-clamp-2 min-h-[2.5rem]">
                    {product.itemDescription}
                  </h3>
                  <p className="text-xs text-gray-500 font-play mb-3">
                    SKU: {product.sku}
                  </p>

                  {/* Price & Stock */}
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <p className="text-2xl font-bold text-red-600 font-play">
                        R{product.preOrderPrice}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 font-play">
                        {product.availableQty} available
                      </p>
                      {product.estimatedDeliveryDate && (
                        <p className="text-xs text-gray-400 font-play">
                          ETA: {new Date(product.estimatedDeliveryDate).toLocaleDateString('en-ZA', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Book Now Button */}
                  <button
                    onClick={() => openBookingModal(product)}
                    className="w-full py-3 bg-red-600 text-white font-bold rounded-lg font-play text-sm hover:bg-red-700 transition-colors"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {orderSuccess ? (
              /* Success State */
              <div className="p-8 text-center">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-2xl font-bold font-play mb-2">Order Placed!</h2>
                <p className="text-gray-600 font-play mb-4">
                  Thank you for your {selectedProduct.orderType === 'pre-order' ? 'pre-order' : 'order'}.
                  We will contact you shortly to confirm.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm text-gray-600 font-play">
                    <strong>Item:</strong> {selectedProduct.itemDescription}
                  </p>
                  <p className="text-sm text-gray-600 font-play">
                    <strong>Quantity:</strong> {selectedQty}
                  </p>
                  <p className="text-sm text-gray-600 font-play">
                    <strong>Total:</strong> R{(parseFloat(selectedProduct.preOrderPrice) * selectedQty).toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="px-8 py-3 bg-red-600 text-white font-bold rounded-lg font-play hover:bg-red-700 transition-colors"
                >
                  Continue Browsing
                </button>
              </div>
            ) : (
              /* Booking Form */
              <>
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div>
                    <h2 className="text-lg font-bold font-play">Book Your Order</h2>
                    {loggedInUser && (
                      <p className="text-xs text-green-600 font-play mt-0.5 flex items-center gap-1">
                        <span>●</span> Logged in — details auto-filled
                      </p>
                    )}
                  </div>
                  <button
                    onClick={closeModal}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
                  >
                    ✕
                  </button>
                </div>

                {/* Product Summary */}
                <div className="p-4 bg-gray-50 border-b flex items-center gap-4">
                  {selectedProduct.imageUrl && (
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.itemDescription}
                      className="w-20 h-20 object-contain rounded-lg bg-white"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 font-play uppercase">{selectedProduct.brand}</p>
                    <p className="font-bold text-sm font-play">{selectedProduct.itemDescription}</p>
                    <p className="text-red-600 font-bold text-lg font-play">R{selectedProduct.preOrderPrice}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-bold rounded font-play text-white ${
                    selectedProduct.orderType === 'pre-order' ? 'bg-orange-500' : 'bg-green-500'
                  }`}>
                    {selectedProduct.orderType === 'pre-order' ? 'Pre-Order' : 'New'}
                  </span>
                </div>

                {/* Quantity Selection */}
                <div className="p-4 border-b">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 font-play">
                    Quantity
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedQty(Math.max(1, selectedQty - 1))}
                      className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center text-xl font-bold hover:bg-gray-50 transition-colors"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={selectedQty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1
                        setSelectedQty(Math.min(Math.max(1, val), selectedProduct.availableQty))
                      }}
                      min="1"
                      max={selectedProduct.availableQty}
                      className="w-20 h-10 text-center border-2 border-gray-300 rounded-lg font-play text-lg font-bold"
                    />
                    <button
                      onClick={() => setSelectedQty(Math.min(selectedProduct.availableQty, selectedQty + 1))}
                      className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center text-xl font-bold hover:bg-gray-50 transition-colors"
                    >
                      +
                    </button>
                    <span className="text-sm text-gray-500 font-play ml-2">
                      ({selectedProduct.availableQty} available)
                    </span>
                  </div>
                  <div className="mt-3 bg-red-50 rounded-lg p-3 flex justify-between items-center">
                    <span className="font-semibold font-play text-sm">Total:</span>
                    <span className="text-xl font-bold text-red-600 font-play">
                      R{(parseFloat(selectedProduct.preOrderPrice) * selectedQty).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold font-play text-sm text-gray-700">Your Details</h3>
                    {loggedInUser && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-play">
                        Auto-filled from account
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1 font-play">First Name *</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-play focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1 font-play">Last Name *</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-play focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-play focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1 font-play">Phone Number *</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+27 61 234 5678"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-play focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  {!loggedInUser && (
                    <p className="text-xs text-gray-400 font-play text-center pt-1">
                      <Link href="/account/login" className="text-red-600 hover:underline">Login</Link> to auto-fill your details
                    </p>
                  )}
                </div>

                {/* Place Order Button */}
                <div className="p-4 border-t">
                  <button
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting || !firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()}
                    className="w-full py-4 bg-red-600 text-white font-bold rounded-lg font-play text-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? 'Placing Order...' : `Place Order - R${(parseFloat(selectedProduct.preOrderPrice) * selectedQty).toFixed(2)}`}
                  </button>
                  <p className="text-xs text-gray-400 text-center mt-2 font-play">
                    We will contact you to confirm your order and arrange payment.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
