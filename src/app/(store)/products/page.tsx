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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')

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

  const preOrders = filtered.filter((p) =>
    p.collections.includes('pre-orders')
  )
  const regular = filtered.filter(
    (p) => !p.collections.includes('pre-orders')
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-black text-white py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Products</h1>
              <p className="text-gray-400 mt-1">
                {loading
                  ? 'Loading…'
                  : `${filtered.length} product${filtered.length !== 1 ? 's' : ''} available`}
              </p>
            </div>
            <Link
              href="/products/select"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-3 rounded-lg transition-colors text-sm whitespace-nowrap"
            >
              <span>✓</span> Multiple Choice Selection
            </Link>
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
          </div>
        </div>
      </div>

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
              {search ? `No results for "${search}"` : 'Check back soon for new arrivals.'}
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
          <>
            {/* Pre-Orders section */}
            {preOrders.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-2xl font-bold">Pre-Orders</h2>
                  <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {preOrders.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {preOrders.map((p) => (
                    <ProductCard key={p.id} product={p} isPreOrder />
                  ))}
                </div>
              </section>
            )}

            {/* Regular products */}
            {regular.length > 0 && (
              <section>
                {preOrders.length > 0 && (
                  <h2 className="text-2xl font-bold mb-6">All Products</h2>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {regular.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ProductCard({
  product: p,
  isPreOrder = false,
}: {
  product: Product
  isPreOrder?: boolean
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative bg-gray-100 h-48 flex items-center justify-center overflow-hidden">
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
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            ETA {p.eta}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex-1">
          {p.brand && (
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
              {p.brand}
            </p>
          )}
          <h3 className="font-bold text-gray-900 leading-snug line-clamp-2 mb-2">
            {p.title}
          </h3>
          {p.carType && (
            <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded mb-2">
              {p.carType}
            </span>
          )}
          {p.scale && (
            <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded mb-2 ml-1">
              {p.scale}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div>
            {p.price > 0 ? (
              <div>
                <span className="text-lg font-bold text-gray-900">
                  R{p.price.toFixed(2)}
                </span>
                {p.compareAtPrice && p.compareAtPrice > p.price && (
                  <span className="text-sm text-gray-400 line-through ml-2">
                    R{p.compareAtPrice.toFixed(2)}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm text-gray-500 italic">POA</span>
            )}
          </div>
        </div>

        <a
          href={BOOK_NOW_URL}
          className="mt-3 block text-center bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
        >
          Book Now
        </a>
      </div>
    </div>
  )
}
