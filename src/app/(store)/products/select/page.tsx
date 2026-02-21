'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'

interface Product {
  id: string
  title: string
  description: string
  price: number
  compareAtPrice: number | null
  brand: string
  productType: string
  scale: string
  collections: string[]
  tags: string[]
  quantity: number
  status: 'draft' | 'active'
  imageUrl: string
  eta: string
  carType: string
}

const BOOK_NOW_URL = 'https://r66slot.co.za/book'

export default function ProductSelectPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [enquirySent, setEnquirySent] = useState(false)

  useEffect(() => {
    fetch('/api/admin/products')
      .then((r) => r.json())
      .then((data) => {
        const active = Array.isArray(data)
          ? data.filter((p: Product) => p.status === 'active')
          : []
        setProducts(active)
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  const productTypes = useMemo(() => {
    const types = new Set(products.map((p) => p.productType).filter(Boolean))
    return ['all', ...Array.from(types)]
  }, [products])

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      const matchType =
        filterType === 'all' || p.productType === filterType
      return matchSearch && matchType
    })
  }, [products, search, filterType])

  const selectedProducts = products.filter((p) => selected.has(p.id))

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    setSelected(new Set(filtered.map((p) => p.id)))
  }

  const clearAll = () => setSelected(new Set())

  const totalPrice = selectedProducts.reduce((sum, p) => sum + (p.price || 0), 0)

  const buildWhatsAppMessage = () => {
    const lines = selectedProducts.map(
      (p) =>
        `• ${p.title}${p.brand ? ` (${p.brand})` : ''}${p.price ? ` – R${p.price.toFixed(2)}` : ''}${p.eta ? ` | ETA: ${p.eta}` : ''}`
    )
    const msg = [
      'Hi R66SLOT! I am interested in the following products:',
      '',
      ...lines,
      '',
      totalPrice > 0 ? `Total: R${totalPrice.toFixed(2)}` : '',
      '',
      `Book Now: ${BOOK_NOW_URL}`,
    ]
      .filter((l) => l !== undefined)
      .join('\n')
    return encodeURIComponent(msg)
  }

  const handleBookNow = () => {
    if (selected.size === 0) return
    const names = selectedProducts.map((p) => p.title).join(', ')
    const url = `${BOOK_NOW_URL}?items=${encodeURIComponent(names)}`
    window.open(url, '_blank')
  }

  const handleWhatsApp = () => {
    if (selected.size === 0) return
    window.open(`https://wa.me/?text=${buildWhatsAppMessage()}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-black text-white py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Link href="/products" className="text-gray-400 hover:text-white text-sm transition-colors">
                  ← All Products
                </Link>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Select Products</h1>
              <p className="text-gray-400 mt-1">
                Choose multiple products to enquire or book at once
              </p>
            </div>

            {selected.size > 0 && (
              <div className="flex flex-col items-end gap-2">
                <span className="text-sm text-gray-400">
                  {selected.size} item{selected.size !== 1 ? 's' : ''} selected
                  {totalPrice > 0 && ` · R${totalPrice.toFixed(2)}`}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleWhatsApp}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-1"
                  >
                    <span>📱</span> WhatsApp
                  </button>
                  <button
                    onClick={handleBookNow}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Book Now →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search + filter */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input
                type="text"
                placeholder="Search products, brands, tags…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-red-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-red-500"
            >
              {productTypes.map((t) => (
                <option key={t} value={t}>
                  {t === 'all' ? 'All Types' : t}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-3 rounded-lg transition-colors whitespace-nowrap"
              >
                Select All
              </button>
              {selected.size > 0 && (
                <button
                  onClick={clearAll}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-3 rounded-lg transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky selection bar */}
      {selected.size > 0 && (
        <div className="sticky top-0 z-20 bg-red-600 text-white py-3 shadow-lg">
          <div className="container mx-auto px-4 flex items-center justify-between">
            <span className="font-bold">
              {selected.size} product{selected.size !== 1 ? 's' : ''} selected
              {totalPrice > 0 && (
                <span className="ml-3 font-normal">Total: R{totalPrice.toFixed(2)}</span>
              )}
            </span>
            <div className="flex gap-3">
              <button
                onClick={handleWhatsApp}
                className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-1.5 rounded-lg text-sm transition-colors"
              >
                📱 WhatsApp
              </button>
              <button
                onClick={handleBookNow}
                className="bg-white text-red-600 hover:bg-gray-100 font-bold px-4 py-1.5 rounded-lg text-sm transition-colors"
              >
                Book Now →
              </button>
              <button onClick={clearAll} className="text-white/70 hover:text-white text-sm">
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">🏎️</p>
            <p className="text-xl font-semibold text-gray-700">No products found</p>
            <p className="text-gray-500 mt-2">
              {search ? `No results for "${search}"` : 'No products available yet.'}
            </p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="mt-4 text-red-600 hover:underline text-sm"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((p) => {
              const isSelected = selected.has(p.id)
              const isPreOrder = p.collections.includes('pre-orders')
              return (
                <div
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className={`relative bg-white rounded-xl border-2 overflow-hidden flex flex-col cursor-pointer transition-all ${
                    isSelected
                      ? 'border-red-500 shadow-lg shadow-red-100'
                      : 'border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
                  }`}
                >
                  {/* Checkbox overlay */}
                  <div
                    className={`absolute top-3 right-3 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-red-600 border-red-600 text-white'
                        : 'bg-white border-gray-400'
                    }`}
                  >
                    {isSelected && <span className="text-xs font-bold">✓</span>}
                  </div>

                  {/* Image */}
                  <div className="relative bg-gray-100 h-44 flex items-center justify-center overflow-hidden">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-5xl">🏎️</span>
                    )}
                    {isPreOrder && (
                      <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                        PRE-ORDER
                      </span>
                    )}
                    {p.eta && (
                      <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        ETA {p.eta}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1">
                    {p.brand && (
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
                        {p.brand}
                      </p>
                    )}
                    <h3 className="font-bold text-gray-900 leading-snug line-clamp-2 mb-2 flex-1">
                      {p.title}
                    </h3>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {p.carType && (
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                          {p.carType}
                        </span>
                      )}
                      {p.scale && (
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                          {p.scale}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        {p.price > 0 ? (
                          <span className="text-lg font-bold text-gray-900">
                            R{p.price.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500 italic">POA</span>
                        )}
                      </div>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                          isSelected
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {isSelected ? '✓ Selected' : 'Select'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Bottom CTA when items selected */}
        {selected.size > 0 && (
          <div className="mt-12 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Your Selection ({selected.size} items)</h2>
            <div className="space-y-2 mb-6">
              {selectedProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggle(p.id)}
                      className="text-red-500 hover:text-red-700 text-lg leading-none"
                    >
                      ×
                    </button>
                    <span className="font-medium text-gray-800">{p.title}</span>
                    {p.brand && (
                      <span className="text-gray-500 text-sm">({p.brand})</span>
                    )}
                  </div>
                  <span className="font-bold text-gray-800">
                    {p.price > 0 ? `R${p.price.toFixed(2)}` : 'POA'}
                  </span>
                </div>
              ))}
              {totalPrice > 0 && (
                <div className="flex items-center justify-between pt-2 font-bold text-lg">
                  <span>Total</span>
                  <span>R{totalPrice.toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleWhatsApp}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-center transition-colors flex items-center justify-center gap-2"
              >
                <span>📱</span> Enquire via WhatsApp
              </button>
              <button
                onClick={handleBookNow}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-center transition-colors"
              >
                Book Now →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
