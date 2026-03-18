'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { MediaLibraryPicker } from '@/components/page-editor/media-library-picker'

interface Category {
  id: string
  name: string
  imageUrl: string
  productIds: string[]
  productCount: number
  slug: string
  description: string
  isActive: boolean
}

interface Product {
  id: string
  title: string
  sku: string
  imageUrl: string
  price: number
  status: string
}

export default function CategoryEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [category, setCategory] = useState<Category | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [productIds, setProductIds] = useState<string[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [showAddProducts, setShowAddProducts] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/categories').then(r => r.json()),
      fetch('/api/admin/products').then(r => r.json()),
    ]).then(([cats, prods]) => {
      const cat = Array.isArray(cats) ? cats.find((c: Category) => c.id === id) : null
      if (cat) {
        setCategory(cat)
        setName(cat.name)
        setImageUrl(cat.imageUrl || '')
        setProductIds(cat.productIds || [])
      }
      setAllProducts(Array.isArray(prods) ? prods : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) setImageUrl(data.url)
    } catch { /* ignore */ }
    setUploadingImage(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/admin/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...category, name, imageUrl, productIds, productCount: productIds.length }),
      })
      router.push('/admin/categories')
    } catch {
      setSaving(false)
    }
  }

  const handleCancel = () => router.push('/admin/categories')

  const toggleProduct = (productId: string) => {
    setProductIds(prev =>
      prev.includes(productId) ? prev.filter(p => p !== productId) : [...prev, productId]
    )
  }

  const removeProduct = (productId: string) => {
    setProductIds(prev => prev.filter(p => p !== productId))
  }

  const assignedProducts = allProducts.filter(p => productIds.includes(p.id))
  const filteredForAdd = allProducts.filter(p =>
    !productSearch ||
    p.title?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  )

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 font-play">Loading...</div>
  )
  if (!category) return (
    <div className="flex items-center justify-center h-64 text-gray-400 font-play">Category not found.</div>
  )

  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 font-play">
        <Link href="/admin/categories" className="hover:text-gray-900">Categories</Link>
        <span>›</span>
        <span className="text-gray-900">{name}</span>
      </div>

      {/* Editable Title + Actions */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <input
          ref={nameRef}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="text-3xl font-bold text-gray-900 font-play bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-full max-w-lg"
        />
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-play"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 font-play"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left — Products in Category */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 font-play">
              Products in category{' '}
              <span className="text-gray-400 font-normal text-base">{productIds.length}</span>
            </h2>
            <button
              onClick={() => setShowAddProducts(!showAddProducts)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 font-play"
            >
              <span>+</span> Add Products
            </button>
          </div>

          {/* Add products panel */}
          {showAddProducts && (
            <div className="mb-4 border border-blue-200 rounded-lg p-3 bg-blue-50">
              <input
                type="text"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                placeholder="Search products by name or SKU..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-play mb-2"
                autoFocus
              />
              <div className="max-h-56 overflow-y-auto space-y-1">
                {filteredForAdd.slice(0, 50).map(p => (
                  <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productIds.includes(p.id)}
                      onChange={() => toggleProduct(p.id)}
                      className="rounded accent-blue-500"
                    />
                    {p.imageUrl && <img src={p.imageUrl} alt="" className="w-8 h-8 object-contain rounded" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 font-play truncate">{p.title}</p>
                      <p className="text-xs text-gray-400 font-play">{p.sku}</p>
                    </div>
                  </label>
                ))}
                {filteredForAdd.length === 0 && (
                  <p className="text-sm text-gray-400 font-play text-center py-4">No products found</p>
                )}
              </div>
              <button
                onClick={() => setShowAddProducts(false)}
                className="mt-2 text-xs text-gray-500 hover:text-gray-900 font-play"
              >
                Done
              </button>
            </div>
          )}

          {/* Assigned products list */}
          {assignedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="font-semibold font-play mb-1">Start adding products to your category</p>
              <p className="text-sm font-play">Create a new category to display on your site.</p>
              <button
                onClick={() => setShowAddProducts(true)}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 font-play"
              >
                + Add Products
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {assignedProducts.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                  {p.imageUrl
                    ? <img src={p.imageUrl} alt="" className="w-10 h-10 object-contain rounded border border-gray-100" />
                    : <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-300 text-xs">IMG</div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 font-play truncate">{p.title}</p>
                    <p className="text-xs text-gray-400 font-play">{p.sku}</p>
                  </div>
                  <button
                    onClick={() => removeProduct(p.id)}
                    className="p-1 text-gray-300 hover:text-red-500"
                    title="Remove from category"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar — Category Info */}
        <div className="w-72 flex-shrink-0 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-base font-semibold text-gray-900 font-play mb-4">Category info</h3>

            <div className="mb-4">
              <label className="block text-sm text-gray-600 font-play mb-1">Category name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-play"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-600 font-play mb-1">Category image</label>
              {imageUrl ? (
                <div className="relative">
                  <img src={imageUrl} alt="" className="w-full h-32 object-cover rounded-lg border border-gray-200" />
                  <button
                    onClick={() => setImageUrl('')}
                    className="absolute top-1 right-1 p-1 bg-white rounded-full shadow text-gray-400 hover:text-red-500"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <label className="w-full h-32 border-2 border-dashed border-blue-200 rounded-lg flex flex-col items-center justify-center text-blue-400 hover:bg-blue-50 cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                  {uploadingImage ? (
                    <span className="text-xs font-play text-gray-400">Uploading...</span>
                  ) : (
                    <>
                      <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-xs font-play">Upload image</span>
                    </>
                  )}
                </label>
              )}
              <button
                type="button"
                onClick={() => setMediaLibraryOpen(true)}
                className="mt-2 w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 font-play flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Choose from Media Library
              </button>
              <MediaLibraryPicker
                open={mediaLibraryOpen}
                onClose={() => setMediaLibraryOpen(false)}
                onSelect={(url) => { setImageUrl(url); setMediaLibraryOpen(false) }}
              />
              <input
                type="text"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="Or paste image URL..."
                className="mt-2 w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 font-play text-gray-500"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 font-play"
            >
              {saving ? 'Saving...' : 'Save Category'}
            </button>
          </div>

          {/* Quick stats */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-base font-semibold text-gray-900 font-play mb-3">Quick info</h3>
            <div className="space-y-2 text-sm font-play text-gray-600">
              <div className="flex justify-between">
                <span>Products</span>
                <span className="font-semibold text-gray-900">{productIds.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Status</span>
                <span className="text-green-600 font-semibold">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
