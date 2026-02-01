'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Product {
  id: string
  title: string
  description: string
  price: number
  compareAtPrice: number | null
  costPerItem: number | null
  sku: string
  barcode: string
  brand: string
  productType: string
  quantity: number
  eta: string
  status: 'draft' | 'active'
  imageUrl: string
  createdAt: string
  updatedAt: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [brandFilter, setBrandFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
      if (res.ok) setProducts(products.filter((p) => p.id !== id))
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  const handleInlineUpdate = async (id: string, field: string, value: string | number) => {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (res.ok) {
        const updated = await res.json()
        setProducts(products.map((p) => (p.id === id ? updated : p)))
      }
    } catch (error) {
      console.error('Error updating product:', error)
    }
  }

  const handlePreOrder = (product: Product) => {
    const message = `*Pre-Order Request*\n\n*Product:* ${product.title}\n*SKU:* ${product.sku}\n*Price:* R${product.price.toFixed(2)}\n*Brand:* ${product.brand}\n*ETA:* ${product.eta || 'TBC'}\n\nI would like to pre-order this item.`
    const whatsappNumber = '27615898921'
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank')
  }

  const handleOrder = (product: Product) => {
    const message = `*Order Request*\n\n*Product:* ${product.title}\n*SKU:* ${product.sku}\n*Price:* R${product.price.toFixed(2)}\n*Brand:* ${product.brand}\n*Qty Available:* ${product.quantity}\n\nI would like to order this item.`
    const whatsappNumber = '27615898921'
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank')
  }

  const handleImportCSV = async () => {
    if (!importText.trim()) return
    setImporting(true)
    try {
      const lines = importText.trim().split('\n')
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
      const products = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim())
        const obj: Record<string, string> = {}
        headers.forEach((h, i) => {
          obj[h] = values[i] || ''
        })
        return {
          title: obj['title'] || obj['name'] || obj['product'] || '',
          description: obj['description'] || '',
          price: obj['price'] || '0',
          sku: obj['sku'] || '',
          brand: obj['brand'] || '',
          productType: obj['type'] || obj['producttype'] || '',
          quantity: obj['quantity'] || obj['qty'] || '0',
          eta: obj['eta'] || obj['delivery'] || '',
          status: 'active',
        }
      })

      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products }),
      })

      if (res.ok) {
        const data = await res.json()
        // Save CSV to suppliers
        try {
          await fetch('/api/admin/suppliers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: `import-${new Date().toISOString().slice(0, 10)}.csv`,
              csvData: importText,
              productCount: products.length,
              source: 'product-import',
            }),
          })
        } catch (e) {
          console.error('Failed to save to suppliers:', e)
        }
        alert(`Imported ${data.imported} products`)
        setShowImportModal(false)
        setImportText('')
        fetchProducts()
      }
    } catch (error) {
      console.error('Import error:', error)
      alert('Import failed')
    } finally {
      setImporting(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImportText(ev.target?.result as string)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const brands = Array.from(new Set(products.map((p) => p.brand).filter(Boolean)))

  const filtered = products.filter((p) => {
    const matchesBrand = !brandFilter || p.brand.toLowerCase() === brandFilter.toLowerCase()
    const matchesSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesBrand && matchesSearch
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-gray-600 mt-1">
            Manage your product inventory ({products.length} products)
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => {
            const headers = ['title','sku','brand','price','quantity','eta','description','productType','status']
            const csvRows = [headers.join(',')]
            products.forEach(p => {
              csvRows.push([
                `"${(p.title || '').replace(/"/g, '""')}"`,
                `"${p.sku || ''}"`,
                `"${p.brand || ''}"`,
                p.price,
                p.quantity,
                `"${p.eta || ''}"`,
                `"${(p.description || '').replace(/"/g, '""')}"`,
                `"${p.productType || ''}"`,
                p.status,
              ].join(','))
            })
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `products-${new Date().toISOString().slice(0,10)}.csv`
            a.click()
            URL.revokeObjectURL(url)
          }}>
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            Import
          </Button>
          <Button size="lg" asChild>
            <Link href="/admin/products/new">Add Product</Link>
          </Button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Search by name or SKU..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        >
          <option value="">All Brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      {/* Product Table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-5xl mb-4">📦</div>
            <h3 className="text-xl font-semibold mb-2">
              {products.length === 0 ? 'No Products Yet' : 'No matching products'}
            </h3>
            <p className="text-gray-600 mb-4">
              {products.length === 0
                ? 'Add your first product to get started'
                : 'Try adjusting your search or filter'}
            </p>
            {products.length === 0 && (
              <Button asChild>
                <Link href="/admin/products/new">Add Product</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Product</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">SKU</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Brand</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Price</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">ETA</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-gray-50">
                      {/* Product Name + Image */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-gray-400 text-xs">IMG</span>
                            )}
                          </div>
                          <span className="font-medium text-sm truncate max-w-[200px]">{product.title}</span>
                        </div>
                      </td>
                      {/* SKU */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm text-gray-700">{product.sku || '-'}</span>
                      </td>
                      {/* Brand */}
                      <td className="py-3 px-4">
                        <span className="text-sm">{product.brand || '-'}</span>
                      </td>
                      {/* Price */}
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm font-semibold">R{product.price.toFixed(2)}</span>
                      </td>
                      {/* ETA */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="text"
                          defaultValue={product.eta || ''}
                          placeholder="TBC"
                          className="w-24 text-center text-sm px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-gray-400 focus:border-transparent"
                          onBlur={(e) => {
                            if (e.target.value !== (product.eta || '')) {
                              handleInlineUpdate(product.id, 'eta', e.target.value)
                            }
                          }}
                        />
                      </td>
                      {/* Qty */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          defaultValue={product.quantity}
                          min={0}
                          className="w-16 text-center text-sm px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-gray-400 focus:border-transparent"
                          onBlur={(e) => {
                            const val = parseInt(e.target.value) || 0
                            if (val !== product.quantity) {
                              handleInlineUpdate(product.id, 'quantity', val)
                            }
                          }}
                        />
                      </td>
                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-1 text-xs rounded font-medium ${
                            product.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {product.status}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            title="Edit product"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handlePreOrder(product)}
                            className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                            title="Send Pre Order via WhatsApp"
                          >
                            Pre Order
                          </button>
                          <button
                            onClick={() => handleOrder(product)}
                            className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            title="Send Order via WhatsApp"
                          >
                            Order
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200"
                            title="Delete product"
                          >
                            Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Import Products (CSV)</h3>
            <p className="text-sm text-gray-600 mb-3">
              Upload a CSV file or paste CSV data. Expected columns: title, sku, brand, price, quantity, eta, description, type
            </p>
            <div className="mb-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="text-sm"
              />
            </div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={8}
              placeholder="title,sku,brand,price,quantity,eta&#10;NSR Audi R8,NSR-0001,NSR,450,5,Feb 2025"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setImportText('')
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleImportCSV}
                disabled={importing || !importText.trim()}
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
