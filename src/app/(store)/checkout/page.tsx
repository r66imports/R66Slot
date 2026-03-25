'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocalCart } from '@/context/local-cart-context'
import { DynamicHeader } from '@/components/layout/header/dynamic-header'

const SHIPPING_METHODS = [
  { value: 'pudo_locker', label: 'Pudo Locker-to-Locker' },
  { value: 'pudo_door', label: 'Pudo Door-to-Door' },
  { value: 'aramex', label: 'Aramex' },
  { value: 'fastway', label: 'Fastway' },
  { value: 'tcg', label: 'The Courier Guy' },
  { value: 'postnet', label: 'PostNet' },
  { value: 'collection', label: 'Collection (Roodepoort)' },
]

export default function CheckoutPage() {
  const router = useRouter()
  const { items, subtotal, removeItem } = useLocalCart()

  // Only in-stock (non-pre-order) items go through checkout
  const checkoutItems = items.filter((i) => !i.isPreOrder)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [suburb, setSuburb] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [shippingMethod, setShippingMethod] = useState('')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Auto-fill from logged-in account
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then((u) => {
        if (!u) return
        setFirstName(u.firstName || '')
        setLastName(u.lastName || '')
        setEmail(u.email || '')
        setPhone(u.phone || '')
      })
      .catch(() => {})
  }, [])

  // Redirect if nothing to checkout
  useEffect(() => {
    if (checkoutItems.length === 0 && !success) {
      router.replace('/cart')
    }
  }, [checkoutItems.length, success, router])

  const checkoutSubtotal = checkoutItems.reduce((s, i) => s + i.price * i.quantity, 0)

  const isCollection = shippingMethod === 'collection'
  const canSubmit =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    phone.trim() &&
    shippingMethod &&
    (isCollection || (address.trim() && suburb.trim() && city.trim() && postalCode.trim()))

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone.trim() },
          shipping: {
            address: address.trim(),
            suburb: suburb.trim(),
            city: city.trim(),
            postalCode: postalCode.trim(),
            method: shippingMethod,
            notes: notes.trim(),
          },
          items: checkoutItems.map((i) => ({
            id: i.id,
            sku: '',
            title: i.title,
            brand: i.brand,
            price: i.price,
            quantity: i.quantity,
            imageUrl: i.imageUrl,
          })),
          subtotal: checkoutSubtotal,
          total: checkoutSubtotal,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to place order')

      // Remove checked-out items from cart
      checkoutItems.forEach((i) => removeItem(i.id))
      setSuccess(data.orderNumber)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <>
        <DynamicHeader />
        <div className="container mx-auto px-4 py-16 max-w-lg text-center">
          <div className="bg-white border rounded-2xl p-10 shadow-sm">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold mb-2">Order Received!</h1>
            <p className="text-gray-600 mb-1">Your order number is</p>
            <p className="text-2xl font-bold text-red-600 mb-6">{success}</p>
            <p className="text-sm text-gray-500 mb-8">
              We will contact you to confirm your order and arrange payment.
              Check your inbox at <strong>{email}</strong>.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/products"
                className="w-full py-3 bg-red-600 text-white font-bold rounded-lg text-center hover:bg-red-700 transition-colors"
              >
                Continue Shopping
              </Link>
              <Link
                href="/"
                className="w-full py-3 border font-medium rounded-lg text-center hover:bg-gray-50 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <DynamicHeader />
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-500 flex items-center gap-1.5">
          <Link href="/cart" className="hover:text-red-600">Cart</Link>
          <span>/</span>
          <span className="text-gray-800 font-medium">Checkout</span>
        </nav>

        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Left: Form ── */}
          <div className="lg:col-span-3 space-y-6">
            {/* Contact */}
            <div className="bg-white border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Contact Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="+27 61 234 5678"
                />
              </div>
            </div>

            {/* Shipping Method */}
            <div className="bg-white border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Shipping Method *</h2>
              <div className="space-y-2">
                {SHIPPING_METHODS.map((m) => (
                  <label
                    key={m.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      shippingMethod === m.value
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="shipping"
                      value={m.value}
                      checked={shippingMethod === m.value}
                      onChange={() => setShippingMethod(m.value)}
                      className="accent-red-600"
                    />
                    <span className="text-sm font-medium">{m.label}</span>
                    {m.value === 'collection' && (
                      <span className="ml-auto text-xs text-green-600 font-semibold">Free</span>
                    )}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Shipping cost will be confirmed by R66SLOT before payment.
              </p>
            </div>

            {/* Delivery Address (hidden for collection) */}
            {!isCollection && (
              <div className="bg-white border rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Delivery Address *</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="12 Main Street"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Suburb *</label>
                      <input
                        type="text"
                        value={suburb}
                        onChange={(e) => setSuburb(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Honeydew"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Johannesburg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="2040"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="bg-white border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Order Notes <span className="text-sm font-normal text-gray-400">(optional)</span></h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                placeholder="Any special instructions or requests..."
              />
            </div>
          </div>

          {/* ── Right: Order Summary ── */}
          <div className="lg:col-span-2">
            <div className="bg-gray-50 border rounded-xl p-6 sticky top-24">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

              {/* Items */}
              <div className="space-y-3 mb-4">
                {checkoutItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="relative w-14 h-14 bg-white border rounded-lg overflow-hidden flex-shrink-0">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🏎️</div>
                      )}
                      <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                      {item.brand && <p className="text-xs text-gray-400">{item.brand}</p>}
                    </div>
                    <p className="text-sm font-semibold flex-shrink-0">
                      {item.price > 0 ? `R${(item.price * item.quantity).toFixed(2)}` : 'POA'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">R{checkoutSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-gray-400 text-xs">TBC by R66SLOT</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-red-600">R{checkoutSubtotal.toFixed(2)}</span>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="mt-6 w-full py-4 bg-red-600 text-white font-bold rounded-lg text-base hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Placing Order...' : 'Place Order'}
              </button>

              <p className="text-xs text-gray-400 text-center mt-3">
                We will contact you to confirm and arrange payment before dispatch.
              </p>

              <div className="mt-4 pt-4 border-t flex items-center gap-2 text-xs text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Secure order powered by R66SLOT
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
