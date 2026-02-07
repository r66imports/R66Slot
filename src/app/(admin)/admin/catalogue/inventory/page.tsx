'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Supplier {
  id: string
  name: string
  code: string
}

interface Brand {
  id: string
  name: string
  code: string
}

interface Category {
  id: string
  name: string
}

interface InventoryItem {
  id: string
  title: string
  sku: string
  quantity: number
  lowStockThreshold: number
  reorderPoint: number
  lastUpdated: string
  imageUrl: string
  supplierId: string
  supplierName: string
  brandId: string
  brandName: string
  categoryId: string
  categoryName: string
}

// Default suppliers - synced with suppliers page
const defaultSuppliers: Supplier[] = [
  { id: '1', name: 'Revo Slot', code: 'REVO' },
  { id: '2', name: 'NSR', code: 'NSR' },
  { id: '3', name: 'Pioneer', code: 'PIONEER' },
  { id: '4', name: 'Sideways', code: 'SIDEWAYS' },
  { id: '5', name: 'BRM', code: 'BRM' },
]

// Default brands
const defaultBrands: Brand[] = [
  { id: '1', name: 'Revo Slot', code: 'REVO' },
  { id: '2', name: 'NSR', code: 'NSR' },
  { id: '3', name: 'Pioneer', code: 'PIONEER' },
  { id: '4', name: 'Sideways', code: 'SIDEWAYS' },
  { id: '5', name: 'BRM', code: 'BRM' },
  { id: '6', name: 'Scalextric', code: 'SCAL' },
  { id: '7', name: 'Slot.it', code: 'SLOT' },
  { id: '8', name: 'Carrera', code: 'CARR' },
]

// Default categories
const defaultCategories: Category[] = [
  { id: '1', name: 'Slot Cars' },
  { id: '2', name: 'Parts' },
  { id: '3', name: 'Accessories' },
  { id: '4', name: 'Tracks' },
  { id: '5', name: 'Controllers' },
  { id: '6', name: 'Power Supplies' },
]

export default function CatalogueInventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>(defaultSuppliers)
  const [brands, setBrands] = useState<Brand[]>(defaultBrands)
  const [categories, setCategories] = useState<Category[]>(defaultCategories)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [stockFilter, setStockFilter] = useState<string>('')
  const [supplierFilter, setSupplierFilter] = useState<string>('')
  const [brandFilter, setBrandFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [showAddBrandModal, setShowAddBrandModal] = useState(false)
  const [newBrand, setNewBrand] = useState({ name: '', code: '' })
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    fetchInventory()
    fetchSuppliers()
  }, [])

  useEffect(() => {
    drawNetworkVisualization()
  }, [inventory, suppliers, brands])

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/admin/suppliers')
      if (response.ok) {
        const data = await response.json()
        if (data.suppliers?.length > 0) {
          setSuppliers(data.suppliers.map((s: any) => ({
            id: s.id,
            name: s.name,
            code: s.code
          })))
        }
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    }
  }

  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/admin/products')
      if (response.ok) {
        const data = await response.json()
        // Transform products to inventory items with supplier, brand info
        const inventoryData = data.map((p: any) => {
          // Determine supplier from SKU prefix or brand
          const supplierFromSku = defaultSuppliers.find(s =>
            p.sku?.toUpperCase().startsWith(s.code)
          )
          const supplierFromBrand = defaultSuppliers.find(s =>
            p.brand?.toLowerCase().includes(s.name.toLowerCase())
          )
          const supplier = supplierFromSku || supplierFromBrand || defaultSuppliers[0]

          // Determine brand
          const brand = defaultBrands.find(b =>
            p.brand?.toLowerCase().includes(b.name.toLowerCase())
          ) || defaultBrands[0]

          // Determine category
          const category = defaultCategories.find(c =>
            p.productType?.toLowerCase().includes(c.name.toLowerCase())
          ) || defaultCategories[0]

          return {
            id: p.id,
            title: p.title,
            sku: p.sku,
            quantity: p.quantity || 0,
            lowStockThreshold: p.lowStockThreshold || 5,
            reorderPoint: p.reorderPoint || 10,
            lastUpdated: p.updatedAt || p.createdAt,
            imageUrl: p.imageUrl,
            supplierId: p.supplierId || supplier.id,
            supplierName: p.supplierName || supplier.name,
            brandId: p.brandId || brand.id,
            brandName: p.brand || brand.name,
            categoryId: p.categoryId || category.id,
            categoryName: p.productType || category.name,
          }
        })
        setInventory(inventoryData)

        // Extract unique brands from imported data
        const uniqueBrands = new Set(inventoryData.map((i: InventoryItem) => i.brandName))
        uniqueBrands.forEach(brandName => {
          if (!brands.find(b => b.name.toLowerCase() === (brandName as string).toLowerCase())) {
            setBrands(prev => [...prev, {
              id: Date.now().toString() + Math.random(),
              name: brandName as string,
              code: (brandName as string).substring(0, 4).toUpperCase()
            }])
          }
        })
      }
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const drawNetworkVisualization = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2

    // Clear canvas
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, width, height)

    // Draw center hub (Inventory)
    ctx.beginPath()
    ctx.arc(centerX, centerY, 40, 0, Math.PI * 2)
    ctx.fillStyle = '#3b82f6'
    ctx.fill()
    ctx.strokeStyle = '#1d4ed8'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 10px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('INVENTORY', centerX, centerY - 5)
    ctx.fillText(inventory.length.toString(), centerX, centerY + 8)

    // Draw brand nodes around center
    const activeFilters = brands.slice(0, 6)
    activeFilters.forEach((brand, index) => {
      const angle = (index / activeFilters.length) * Math.PI * 2 - Math.PI / 2
      const radius = 100
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      // Count items for this brand
      const count = inventory.filter(i => i.brandName.toLowerCase() === brand.name.toLowerCase()).length

      // Draw connection line
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(x, y)
      ctx.strokeStyle = count > 0 ? '#10b981' : '#d1d5db'
      ctx.lineWidth = Math.max(1, Math.min(count / 5, 4))
      ctx.stroke()

      // Draw brand node
      ctx.beginPath()
      ctx.arc(x, y, 25, 0, Math.PI * 2)
      ctx.fillStyle = count > 0 ? '#10b981' : '#9ca3af'
      ctx.fill()

      // Draw brand name
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 8px Arial'
      ctx.fillText(brand.code, x, y - 3)
      ctx.font = '8px Arial'
      ctx.fillText(count.toString(), x, y + 8)
    })

    // Draw stats
    ctx.fillStyle = '#374151'
    ctx.font = '10px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(`Total: ${inventory.length}`, 10, 20)
    ctx.fillText(`Brands: ${brands.length}`, 10, 35)
    ctx.fillText(`Suppliers: ${suppliers.length}`, 10, 50)
  }

  const updateStock = async (id: string, newQuantity: number) => {
    try {
      await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity }),
      })
      setInventory(prev =>
        prev.map(item =>
          item.id === id ? { ...item, quantity: newQuantity } : item
        )
      )
    } catch (error) {
      console.error('Error updating stock:', error)
    }
  }

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.title?.toLowerCase().includes(filter.toLowerCase()) ||
      item.sku?.toLowerCase().includes(filter.toLowerCase())

    const matchesSupplier = !supplierFilter || item.supplierId === supplierFilter
    const matchesBrand = !brandFilter || item.brandId === brandFilter
    const matchesCategory = !categoryFilter || item.categoryId === categoryFilter

    let matchesStock = true
    if (stockFilter === 'low') matchesStock = item.quantity <= item.lowStockThreshold && item.quantity > 0
    else if (stockFilter === 'out') matchesStock = item.quantity === 0
    else if (stockFilter === 'instock') matchesStock = item.quantity > 0

    return matchesSearch && matchesSupplier && matchesBrand && matchesCategory && matchesStock
  })

  const totalItems = inventory.length
  const lowStockCount = inventory.filter(i => i.quantity <= i.lowStockThreshold && i.quantity > 0).length
  const outOfStockCount = inventory.filter(i => i.quantity === 0).length
  const totalValue = inventory.reduce((sum, i) => sum + i.quantity, 0)

  const handleExportCSV = () => {
    const headers = ['SKU', 'Title', 'Quantity', 'Low Stock Threshold', 'Supplier', 'Brand', 'Category', 'Status']
    const rows = filteredInventory.map(item => [
      item.sku,
      `"${item.title}"`,
      item.quantity,
      item.lowStockThreshold,
      item.supplierName,
      item.brandName,
      item.categoryName,
      item.quantity === 0 ? 'Out of Stock' : item.quantity <= item.lowStockThreshold ? 'Low Stock' : 'In Stock'
    ])
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const csvData = event.target?.result as string
      const lines = csvData.split('\n').filter(line => line.trim())
      const importedCount = Math.max(0, lines.length - 1)

      // Extract brands from import
      if (lines.length > 1) {
        const headers = lines[0].split(',')
        const brandIndex = headers.findIndex(h => h.toLowerCase().includes('brand'))
        if (brandIndex >= 0) {
          lines.slice(1).forEach(line => {
            const values = line.split(',')
            const brandName = values[brandIndex]?.trim()
            if (brandName && !brands.find(b => b.name.toLowerCase() === brandName.toLowerCase())) {
              setBrands(prev => [...prev, {
                id: Date.now().toString() + Math.random(),
                name: brandName,
                code: brandName.substring(0, 4).toUpperCase()
              }])
            }
          })
        }
      }

      alert(`Successfully imported ${importedCount} inventory items`)
      setShowImportModal(false)
      fetchInventory()
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleAddBrand = () => {
    if (!newBrand.name) return
    const brand: Brand = {
      id: Date.now().toString(),
      name: newBrand.name,
      code: newBrand.code || newBrand.name.substring(0, 4).toUpperCase()
    }
    setBrands([...brands, brand])
    setShowAddBrandModal(false)
    setNewBrand({ name: '', code: '' })
  }

  const deleteItem = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) return
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setInventory(prev => prev.filter(item => item.id !== id))
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete item')
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Failed to delete item')
    }
  }

  const hasActiveFilters = supplierFilter || brandFilter || categoryFilter || stockFilter || filter

  return (
    <div className="font-play">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/admin/catalogue" className="hover:text-blue-600">Catalogue</Link>
            <span>/</span>
            <span className="text-gray-900">Inventory</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500 mt-1">Track and manage your stock levels</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowAddBrandModal(true)}>
            + Add Brand
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            Export CSV
          </Button>
          <Button
            onClick={() => setShowImportModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Import CSV
          </Button>
        </div>
      </div>

      {/* Network Visualization */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-start gap-6">
            <canvas
              ref={canvasRef}
              width={300}
              height={200}
              className="border border-gray-200 rounded-lg bg-gray-50"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Inventory Network</h3>
              <p className="text-sm text-gray-500 mb-4">Visual overview of inventory distribution across brands</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
                  <p className="text-xs text-gray-500">Total Products</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{totalValue}</p>
                  <p className="text-xs text-gray-500">Total Units</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{lowStockCount}</p>
                  <p className="text-xs text-gray-500">Low Stock</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
                  <p className="text-xs text-gray-500">Out of Stock</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white min-w-[150px]"
            >
              <option value="">Select Supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white min-w-[150px]"
            >
              <option value="">Select Brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white min-w-[150px]"
            >
              <option value="">Select Category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white min-w-[150px]"
            >
              <option value="">Select Stock Level</option>
              <option value="instock">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
              {filter && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2">
                  Search: {filter}
                  <button onClick={() => setFilter('')} className="hover:text-blue-900 font-bold">&times;</button>
                </span>
              )}
              {supplierFilter && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-2">
                  Supplier: {suppliers.find(s => s.id === supplierFilter)?.name}
                  <button onClick={() => setSupplierFilter('')} className="hover:text-purple-900 font-bold">&times;</button>
                </span>
              )}
              {brandFilter && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-2">
                  Brand: {brands.find(b => b.id === brandFilter)?.name}
                  <button onClick={() => setBrandFilter('')} className="hover:text-green-900 font-bold">&times;</button>
                </span>
              )}
              {categoryFilter && (
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm flex items-center gap-2">
                  Category: {categories.find(c => c.id === categoryFilter)?.name}
                  <button onClick={() => setCategoryFilter('')} className="hover:text-orange-900 font-bold">&times;</button>
                </span>
              )}
              {stockFilter && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm flex items-center gap-2">
                  Stock: {stockFilter === 'instock' ? 'In Stock' : stockFilter === 'low' ? 'Low Stock' : 'Out of Stock'}
                  <button onClick={() => setStockFilter('')} className="hover:text-yellow-900 font-bold">&times;</button>
                </span>
              )}
              <button
                onClick={() => { setFilter(''); setSupplierFilter(''); setBrandFilter(''); setCategoryFilter(''); setStockFilter(''); }}
                className="px-3 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-full text-sm"
              >
                Clear All
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventory Table */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading inventory...</p>
        </div>
      ) : filteredInventory.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-gray-500 text-lg">No inventory items found.</p>
            <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or import products from a CSV file.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Brand</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Stock</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Adjust</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-400">📦</span>
                          )}
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{item.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-mono">{item.sku}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                        {item.brandName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                        {item.supplierName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {item.categoryName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-lg font-bold text-gray-900">{item.quantity}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        item.quantity === 0
                          ? 'bg-red-100 text-red-700'
                          : item.quantity <= item.lowStockThreshold
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {item.quantity === 0
                          ? 'Out'
                          : item.quantity <= item.lowStockThreshold
                          ? 'Low'
                          : 'OK'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => updateStock(item.id, Math.max(0, item.quantity - 1))}
                          className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-sm"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateStock(item.id, parseInt(e.target.value) || 0)}
                          className="w-14 text-center border border-gray-300 rounded py-1 text-sm"
                          min="0"
                        />
                        <button
                          onClick={() => updateStock(item.id, item.quantity + 1)}
                          className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-sm"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => deleteItem(item.id, item.title)}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-white hover:bg-red-600 border border-red-300 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t bg-gray-50 text-sm text-gray-500 flex justify-between items-center">
            <span>Showing {filteredInventory.length} of {inventory.length} items</span>
            <span>{brands.length} brands • {suppliers.length} suppliers • {categories.length} categories</span>
          </div>
        </Card>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Import Inventory CSV</h2>
              <p className="text-gray-600 mb-4">
                Upload a CSV file with inventory data. Include columns for SKU, Title, Quantity, Brand, Supplier, and Category.
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <div className="text-4xl mb-2">📄</div>
                  <p className="text-gray-600">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-400">CSV files only</p>
                </label>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-700">
                  <strong>Note:</strong> New brands found in the CSV will be automatically added to the Brand dropdown.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowImportModal(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Brand Modal */}
      {showAddBrandModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Add New Brand</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name *</label>
                  <input
                    type="text"
                    value={newBrand.name}
                    onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., Scalextric"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand Code</label>
                  <input
                    type="text"
                    value={newBrand.code}
                    onChange={(e) => setNewBrand({ ...newBrand, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., SCAL (auto-generated if empty)"
                    maxLength={6}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowAddBrandModal(false)}>Cancel</Button>
                <Button
                  onClick={handleAddBrand}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!newBrand.name}
                >
                  Add Brand
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
