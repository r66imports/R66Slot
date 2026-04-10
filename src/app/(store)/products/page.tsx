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
  carClass?: string
  sku?: string
  isPreOrder?: boolean
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) =>
      p.sku?.toLowerCase().includes(q) ||
      p.title?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.tags?.some((t) => t.toLowerCase().includes(q))
    )
  }, [products, search])

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header + Search */}
      <div className="bg-black text-white py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">All Products</h1>
              <p className="text-gray-400 mt-1">
                {loading ? 'Loading…' : `${filtered.length} product${filtered.length !== 1 ? 's' : ''} available`}
              </p>
            </div>
            <Link
              href="/products/select"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-3 rounded-lg transition-colors text-sm whitespace-nowrap"
            >
              ✓ Multiple Choice Selection
            </Link>
          </div>

          <div className="relative max-w-xl">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
            <input
              type="text"
              placeholder="Search by SKU, name, brand…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-lg pl-10 pr-10 py-3 focus:outline-none focus:border-red-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product Grid */}
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
              {search ? 'Try a different search term.' : 'Check back soon for new arrivals.'}
            </p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-4 text-red-600 hover:underline text-sm">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((p) => (
              <Link key={p.id} href={`/product/${p.id}`} className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                {/* Image */}
                <div className="relative bg-gray-100 h-48 flex items-center justify-center overflow-hidden">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <span className="text-5xl">🏎️</span>
                  )}
                  {p.isPreOrder && (
                    <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
                      Book for Next Shipment
                    </span>
                  )}
                  {p.carClass && (
                    <span className="absolute top-2 right-2 bg-black/80 text-white text-xs font-bold px-2 py-1 rounded">
                      {p.carClass}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                  {p.brand && (
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">{p.brand}</p>
                  )}
                  {p.sku && (
                    <p className="text-xs font-mono text-indigo-500 mb-1">{p.sku}</p>
                  )}
                  <h3 className="font-bold text-gray-900 leading-snug line-clamp-2 mb-2 flex-1">{p.title}</h3>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.scale && <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{p.scale}</span>}
                    {p.carType && <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{p.carType}</span>}
                  </div>
                  {p.price > 0 ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-gray-900">R{p.price.toFixed(2)}</span>
                      {p.compareAtPrice && p.compareAtPrice > p.price && (
                        <span className="text-sm text-gray-400 line-through">R{p.compareAtPrice.toFixed(2)}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500 italic">POA</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
