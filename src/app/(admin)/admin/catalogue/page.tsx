'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface CatalogueItem {
  id: string
  name: string
  brand: string
  sku: string
  price: string
  category: string
  inStock: boolean
  imageUrl: string
  createdAt: string
}

export default function CataloguePage() {
  const [items, setItems] = useState<CatalogueItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/admin/products')
      if (response.ok) {
        const data = await response.json()
        setItems(data)
      }
    } catch (error) {
      console.error('Error fetching catalogue:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredItems = items.filter(
    (item) =>
      item.name?.toLowerCase().includes(filter.toLowerCase()) ||
      item.brand?.toLowerCase().includes(filter.toLowerCase()) ||
      item.sku?.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="font-play">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-play">Catalogue</h1>
          <p className="text-gray-500 mt-1 font-play">
            Browse and manage your product catalogue
          </p>
        </div>
      </div>

      {/* Search / Filter */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, brand, or SKU..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-play"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-500 font-play">Loading catalogue...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500 text-lg font-play">
              {filter ? 'No products match your search.' : 'No products in the catalogue yet.'}
            </p>
            <p className="text-gray-400 mt-2 font-play">
              Products added via the Products page will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <svg className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 font-play">{item.name}</h3>
                    <p className="text-sm text-gray-500 font-play">{item.brand}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded font-play ${
                    item.inStock
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {item.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1 font-play">SKU: {item.sku}</p>
                <p className="text-xl font-bold text-primary mt-2 font-play">
                  R{item.price}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      {!isLoading && items.length > 0 && (
        <div className="mt-8 text-sm text-gray-400 font-play">
          Showing {filteredItems.length} of {items.length} products
        </div>
      )}
    </div>
  )
}
