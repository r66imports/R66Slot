'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function BookProductPage() {
  const params = useParams()
  const id = params.id as string

  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [qty, setQty] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Load product
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false))

    // Auto-fill if logged in
    fetch('/api/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then((user) => {
        if (user) {
          setName(`${user.firstName || ''} ${user.lastName || ''}`.trim())
          setEmail(user.email || '')
          setPhone(user.phone || '')
        }
      })
      .catch(() => {})
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('Please fill in all fields.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/backorders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: name.trim(),
          clientEmail: email.trim(),
          clientPhone: phone.trim(),
          sku: product.sku || '',
          description: product.title || '',
          brand: product.brand || '',
          qty,
          price: product.price || 0,
          source: 'book-now',
          notes: '',
        }),
      })
      if (res.ok) {
        setDone(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to place booking. Please try again.')
      }
    } catch {
      setError('Failed to place booking. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 text-lg">Product not found.</p>
        <Link href="/" className="mt-4 inline-block text-red-600 hover:underline">← Back to Home</Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-500 mb-6">
            Thank you, {name.split(' ')[0]}! We've received your booking for{' '}
            <span className="font-semibold text-gray-800">{product.title}</span>.
            We'll contact you shortly to confirm and arrange payment.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-1">
            <p className="text-sm text-gray-600"><span className="font-medium">SKU:</span> {product.sku}</p>
            <p className="text-sm text-gray-600"><span className="font-medium">Qty:</span> {qty}</p>
            <p className="text-sm text-gray-600"><span className="font-medium">Price:</span> R{((product.price || 0) * qty).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
          </div>
          <Link
            href="/"
            className="block w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors text-center"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  const price = product.price || 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Back link */}
        <button onClick={() => window.history.back()} className="text-sm text-gray-500 hover:text-red-600 mb-6 flex items-center gap-1">
          ← Back
        </button>

        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          {/* Orange header */}
          <div className="bg-orange-500 px-6 py-4">
            <p className="text-white font-bold text-lg">Book for Next Shipment</p>
            <p className="text-orange-100 text-sm">Secure your item before it arrives in stock</p>
          </div>

          <div className="grid md:grid-cols-2 gap-0">
            {/* Product info */}
            <div className="p-6 border-b md:border-b-0 md:border-r border-gray-100">
              {product.imageUrl && (
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="w-full aspect-square object-contain rounded-xl bg-gray-50 mb-4"
                />
              )}
              {product.brand && (
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{product.brand}</p>
              )}
              <h2 className="text-lg font-bold text-gray-900 mb-1">{product.title}</h2>
              {product.sku && (
                <p className="text-xs text-gray-400 mb-4">SKU: {product.sku}</p>
              )}
              <p className="text-3xl font-bold text-red-600">
                R{(price * qty).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </p>
              {qty > 1 && (
                <p className="text-xs text-gray-400 mt-0.5">R{Number(price).toLocaleString('en-ZA', { minimumFractionDigits: 2 })} each</p>
              )}
            </div>

            {/* Booking form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-lg font-bold hover:bg-gray-50"
                  >−</button>
                  <span className="w-8 text-center font-bold text-lg">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(qty + 1)}
                    className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-lg font-bold hover:bg-gray-50"
                  >+</button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Your phone number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {submitting ? 'Confirming…' : 'Confirm Booking'}
              </button>

              <p className="text-xs text-gray-400 text-center">
                We'll contact you to confirm and arrange payment.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
