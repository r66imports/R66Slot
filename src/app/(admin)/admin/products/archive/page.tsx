'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ArchivedProduct {
  id: string
  sku: string
  title: string
  brand: string
  price: number
  quantity: number
  status: string
  imageUrl: string
  updatedAt: string
}

export default function ProductArchivePage() {
  const [products, setProducts] = useState<ArchivedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [unarchiving, setUnarchiving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/products?includeArchived=true')
      .then((r) => r.json())
      .then((data) => {
        const list = (data.products || data || []) as ArchivedProduct[]
        setProducts(list)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleUnarchive(product: ArchivedProduct) {
    setUnarchiving(product.id)
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      })
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== product.id))
      }
    } finally {
      setUnarchiving(null)
    }
  }

  const filtered = products.filter((p) => {
    const q = search.toLowerCase()
    return !q || p.sku?.toLowerCase().includes(q) || p.title?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q)
  })

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Archive</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Discontinued products — no longer available from supplier. Hidden from website and inventory.
          </p>
        </div>
        <Link
          href="/admin/products"
          className="text-sm text-gray-600 hover:text-gray-900 underline"
        >
          ← Back to Products
        </Link>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by SKU, title or brand…"
          className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading archive…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🗄️</div>
          <h3 className="text-lg font-semibold text-gray-700">
            {search ? 'No matches found' : 'Archive is empty'}
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            {search ? 'Try a different search.' : 'Archived products will appear here.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {filtered.length} archived product{filtered.length !== 1 ? 's' : ''}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Brand</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Last Updated</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.title} className="w-10 h-10 object-contain rounded border border-gray-100 flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded border border-gray-100 flex-shrink-0 flex items-center justify-center text-gray-300 text-lg">📦</div>
                      )}
                      <span className="font-medium text-gray-800 line-clamp-2">{p.title || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.brand || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-indigo-600">{p.sku || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">R{Number(p.price || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('en-ZA') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="text-xs text-gray-500 hover:text-gray-800 underline"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleUnarchive(p)}
                        disabled={unarchiving === p.id}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-colors"
                      >
                        {unarchiving === p.id ? 'Restoring…' : 'Unarchive'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
