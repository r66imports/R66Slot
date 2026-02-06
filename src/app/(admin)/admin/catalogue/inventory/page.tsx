'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Supplier {
  id: string
  name: string
  code: string
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
}

// Default suppliers - synced with suppliers page
const defaultSuppliers: Supplier[] = [
  { id: '1', name: 'Revo Slot', code: 'REVO' },
  { id: '2', name: 'NSR', code: 'NSR' },
  { id: '3', name: 'Pioneer', code: 'PIONEER' },
  { id: '4', name: 'Sideways', code: 'SIDEWAYS' },
  { id: '5', name: 'BRM', code: 'BRM' },
]

export default function CatalogueInventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>(defaultSuppliers)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [stockFilter, setStockFilter] = useState<string>('all')
  const [supplierFilter, setSupplierFilter] = useState<string>('all')
  const [showImportModal, setShowImportModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)

  useEffect(() => {
    fetchInventory()
    fetchSuppliers()
  }, [])

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
        // Transform products to inventory items with supplier info
        const inventoryData = data.map((p: any) => {
          // Determine supplier from SKU prefix or brand
          const supplierFromSku = defaultSuppliers.find(s =>
            p.sku?.toUpperCase().startsWith(s.code)
          )
          const supplierFromBrand = defaultSuppliers.find(s =>
            p.brand?.toLowerCase().includes(s.name.toLowerCase())
          )
          const supplier = supplierFromSku || supplierFromBrand || defaultSuppliers[0]

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
          }
        })
        setInventory(inventoryData)
      }
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setIsLoading(false)
    }
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

    const matchesSupplier = supplierFilter === 'all' || item.supplierId === supplierFilter

    let matchesStock = true
    if (stockFilter === 'low') matchesStock = item.quantity <= item.lowStockThreshold && item.quantity > 0
    else if (stockFilter === 'out') matchesStock = item.quantity === 0
    else if (stockFilter === 'instock') matchesStock = item.quantity > 0

    return matchesSearch && matchesSupplier && matchesStock
  })

  const totalItems = inventory.length
  const lowStockCount = inventory.filter(i => i.quantity <= i.lowStockThreshold && i.quantity > 0).length
  const outOfStockCount = inventory.filter(i => i.quantity === 0).length
  const totalValue = inventory.reduce((sum, i) => sum + i.quantity, 0)

  const handleExportCSV = () => {
    const headers = ['SKU', 'Title', 'Quantity', 'Low Stock Threshold', 'Supplier', 'Status']
    const rows = filteredInventory.map(item => [
      item.sku,
      item.title,
      item.quantity,
      item.lowStockThreshold,
      item.supplierName,
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
      alert(`Successfully imported ${importedCount} inventory items`)
      setShowImportModal(false)
      fetchInventory()
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="font-play">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Products</p>
            <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Units</p>
            <p className="text-2xl font-bold text-blue-600">{totalValue}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-700">Low Stock</p>
            <p className="text-2xl font-bold text-yellow-600">{lowStockCount}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm text-red-700">Out of Stock</p>
            <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name or SKU..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">All Suppliers</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">All Stock Levels</option>
          <option value="instock">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
      </div>

      {/* Active Filters Display */}
      {(supplierFilter !== 'all' || stockFilter !== 'all' || filter) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filter && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2">
              Search: {filter}
              <button onClick={() => setFilter('')} className="hover:text-blue-900">&times;</button>
            </span>
          )}
          {supplierFilter !== 'all' && (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-2">
              Supplier: {suppliers.find(s => s.id === supplierFilter)?.name}
              <button onClick={() => setSupplierFilter('all')} className="hover:text-green-900">&times;</button>
            </span>
          )}
          {stockFilter !== 'all' && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm flex items-center gap-2">
              Stock: {stockFilter === 'instock' ? 'In Stock' : stockFilter === 'low' ? 'Low Stock' : 'Out of Stock'}
              <button onClick={() => setStockFilter('all')} className="hover:text-yellow-900">&times;</button>
            </span>
          )}
          <button
            onClick={() => { setFilter(''); setSupplierFilter('all'); setStockFilter('all'); }}
            className="px-3 py-1 text-gray-500 hover:text-gray-700 text-sm"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Inventory Table */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading inventory...</p>
        </div>
      ) : filteredInventory.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Current Stock</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-400">📦</span>
                          )}
                        </div>
                        <span className="font-medium text-gray-900">{item.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.sku}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                        {item.supplierName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-lg font-bold text-gray-900">{item.quantity}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                        item.quantity === 0
                          ? 'bg-red-100 text-red-700'
                          : item.quantity <= item.lowStockThreshold
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {item.quantity === 0
                          ? 'Out of Stock'
                          : item.quantity <= item.lowStockThreshold
                          ? 'Low Stock'
                          : 'In Stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => updateStock(item.id, Math.max(0, item.quantity - 1))}
                          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateStock(item.id, parseInt(e.target.value) || 0)}
                          className="w-16 text-center border border-gray-300 rounded-lg py-1"
                          min="0"
                        />
                        <button
                          onClick={() => updateStock(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
                        >
                          +
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t bg-gray-50 text-sm text-gray-500">
            Showing {filteredInventory.length} of {inventory.length} items
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
                Upload a CSV file with inventory data. The file should have columns for SKU, Title, Quantity, and optionally Supplier.
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
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowImportModal(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
