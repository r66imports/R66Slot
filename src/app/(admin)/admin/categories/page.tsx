'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Category {
  id: string
  name: string
  imageUrl: string
  productIds: string[]
  productCount: number
  isActive: boolean
}

// Pastel gradient backgrounds for cards (like Wix)
const CARD_GRADIENTS = [
  'from-blue-200 to-cyan-100',
  'from-rose-200 to-pink-100',
  'from-amber-200 to-yellow-100',
  'from-emerald-200 to-teal-100',
  'from-violet-200 to-purple-100',
  'from-orange-200 to-amber-100',
  'from-sky-200 to-blue-100',
  'from-lime-200 to-green-100',
  'from-fuchsia-200 to-pink-100',
]

export default function CategoriesPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetch('/api/admin/categories')
      .then(r => r.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false))
  }, [])

  const handleNewCategory = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Category' }),
      })
      const cat = await res.json()
      router.push(`/admin/categories/${cat.id}`)
    } catch {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this category?')) return
    await fetch(`/api/admin/categories?id=${id}`, { method: 'DELETE' })
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  const filtered = categories.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )

  const getProductCount = (cat: Category) =>
    cat.productIds?.length ?? cat.productCount ?? 0

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900 font-play">
            Categories{' '}
            <span className="text-blue-500">{categories.length}</span>
          </h1>
          {showSearch && (
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search categories..."
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-400 font-play"
            />
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowSearch(!showSearch); setSearch('') }}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            title="Search"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button
            onClick={handleNewCategory}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 font-play"
          >
            <span className="text-lg leading-none">+</span>
            New Category
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-6 font-play">
        Group related products into categories and assign them to your pages.
      </p>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 font-play">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <p className="text-lg font-semibold font-play mb-2">No categories yet</p>
          <p className="text-sm font-play">Click "+ New Category" to create your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((cat, i) => (
            <Link
              key={cat.id}
              href={`/admin/categories/${cat.id}`}
              className="group relative rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Card background */}
              <div className={`h-48 bg-gradient-to-br ${CARD_GRADIENTS[i % CARD_GRADIENTS.length]} relative`}>
                {cat.imageUrl && (
                  <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover absolute inset-0" />
                )}
                {/* Options menu */}
                <button
                  onClick={(e) => handleDelete(cat.id, e)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white/80 rounded-lg hover:bg-white text-gray-500 hover:text-red-500"
                  title="Delete category"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              {/* Card label */}
              <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between">
                <span className="font-semibold text-gray-900 text-sm font-play truncate">{cat.name}</span>
                <span className="text-gray-500 text-sm font-play ml-2 flex-shrink-0">{getProductCount(cat)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
