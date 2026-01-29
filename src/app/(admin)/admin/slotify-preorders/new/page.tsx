'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewPreorderPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Pre-order state
  const [sku, setSku] = useState('')
  const [description, setDescription] = useState('')
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('')
  const [brand, setBrand] = useState('')
  const [fullDescription, setFullDescription] = useState('')
  const [preOrderPrice, setPreOrderPrice] = useState('')
  const [qty, setQty] = useState('1')

  // Brand options
  const brands = ['NSR', 'Revo', 'Pioneer', 'Sideways', 'Carrera', 'Scalextric', 'Slot.it', 'Ninco']

  const handleBook = async () => {
    setSaving(true)

    const preOrderData = {
      id: `PRE-${Date.now()}`,
      sku,
      description,
      estimatedDeliveryDate,
      brand,
      fullDescription,
      preOrderPrice,
      qty: parseInt(qty),
      availableQty: parseInt(qty),
      createdAt: new Date().toISOString()
    }

    console.log('Creating pre-order:', preOrderData)

    // Save to localStorage
    const existing = JSON.parse(localStorage.getItem('slotify-preorders') || '[]')
    existing.push(preOrderData)
    localStorage.setItem('slotify-preorders', JSON.stringify(existing))

    setTimeout(() => {
      setSaving(false)
      alert('Pre-order item created successfully!')
      router.push('/admin/slotify-preorders')
    }, 500)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/slotify-preorders"
                className="text-gray-600 hover:text-gray-900"
              >
                ← Pre-orders
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Add Pre-order Item</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/slotify-preorders')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleBook}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={saving}
              >
                {saving ? 'Booking...' : 'Book'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-6">
            {/* Item SKU */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item SKU *
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g., NSR-1234"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                required
              />
            </div>

            {/* Item Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Description *
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Ferrari F40 - Red"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                required
              />
            </div>

            {/* Estimated Delivery Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Delivery Date *
              </label>
              <input
                type="date"
                value={estimatedDeliveryDate}
                onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                required
              />
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand *
              </label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                required
              >
                <option value="">Select brand...</option>
                {brands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Full Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={fullDescription}
                onChange={(e) => setFullDescription(e.target.value)}
                rows={4}
                placeholder="Additional details about this pre-order item..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>

            {/* Pre-order Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pre Order Price (Rand) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">R</span>
                <input
                  type="number"
                  step="0.01"
                  value={preOrderPrice}
                  onChange={(e) => setPreOrderPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Select Qty */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Qty *
              </label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
