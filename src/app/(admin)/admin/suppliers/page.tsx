'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Supplier {
  id: string
  name: string
  code: string
  email: string
  phone: string
  country: string
  website: string
  googleSheetUrl: string
  logoUrl: string
  isActive: boolean
  productCount: number
  lastImport: string | null
  notes: string
}

interface SupplierImport {
  id: string
  supplierId: string
  filename: string
  csvData: string
  productCount: number
  importedAt: string
}

// Default suppliers
const defaultSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'Revo Slot',
    code: 'REVO',
    email: 'info@revoslot.com',
    phone: '+34 123 456 789',
    country: 'Spain',
    website: 'https://www.revoslot.com',
    googleSheetUrl: 'https://docs.google.com/spreadsheets/d/revo-slot-products',
    logoUrl: '/suppliers/revo-logo.png',
    isActive: true,
    productCount: 45,
    lastImport: '2024-01-15T10:30:00Z',
    notes: 'Premium 1:32 scale slot cars'
  },
  {
    id: '2',
    name: 'NSR',
    code: 'NSR',
    email: 'sales@nsracing.com',
    phone: '+39 02 123 4567',
    country: 'Italy',
    website: 'https://www.nsracing.com',
    googleSheetUrl: 'https://docs.google.com/spreadsheets/d/nsr-products',
    logoUrl: '/suppliers/nsr-logo.png',
    isActive: true,
    productCount: 89,
    lastImport: '2024-01-10T14:20:00Z',
    notes: 'Racing and tuning parts specialist'
  },
  {
    id: '3',
    name: 'Pioneer',
    code: 'PIONEER',
    email: 'contact@pioneerslotcars.com',
    phone: '+1 555 123 4567',
    country: 'USA',
    website: 'https://www.pioneerslotcars.com',
    googleSheetUrl: 'https://docs.google.com/spreadsheets/d/pioneer-products',
    logoUrl: '/suppliers/pioneer-logo.png',
    isActive: true,
    productCount: 62,
    lastImport: '2024-01-12T09:15:00Z',
    notes: 'Classic American muscle cars'
  },
  {
    id: '4',
    name: 'Sideways',
    code: 'SIDEWAYS',
    email: 'info@sideways.it',
    phone: '+39 06 789 0123',
    country: 'Italy',
    website: 'https://www.sideways.it',
    googleSheetUrl: 'https://docs.google.com/spreadsheets/d/sideways-products',
    logoUrl: '/suppliers/sideways-logo.png',
    isActive: true,
    productCount: 38,
    lastImport: '2024-01-08T16:45:00Z',
    notes: 'Group 5 and endurance racing cars'
  },
  {
    id: '5',
    name: 'BRM',
    code: 'BRM',
    email: 'sales@brm-slot.com',
    phone: '+39 041 234 5678',
    country: 'Italy',
    website: 'https://www.brm-slot.com',
    googleSheetUrl: 'https://docs.google.com/spreadsheets/d/brm-products',
    logoUrl: '/suppliers/brm-logo.png',
    isActive: true,
    productCount: 28,
    lastImport: '2024-01-05T11:00:00Z',
    notes: 'Mini and classic car specialist'
  }
]

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(defaultSuppliers)
  const [imports, setImports] = useState<SupplierImport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'network' | 'list' | 'imports'>('network')
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showWorksheetModal, setShowWorksheetModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    country: '',
    website: '',
    googleSheetUrl: '',
    notes: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (activeTab === 'network' && canvasRef.current) {
      drawNetwork()
    }
  }, [activeTab, suppliers])

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/suppliers')
      if (res.ok) {
        const data = await res.json()
        if (data.suppliers?.length > 0) {
          setSuppliers(data.suppliers)
        }
        if (data.imports?.length > 0) {
          setImports(data.imports)
        }
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const drawNetwork = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) * 0.35

    // Clear canvas
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, width, height)

    // Draw center hub (R66 Slot)
    ctx.beginPath()
    ctx.arc(centerX, centerY, 50, 0, Math.PI * 2)
    ctx.fillStyle = '#3b82f6'
    ctx.fill()
    ctx.strokeStyle = '#1d4ed8'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('R66', centerX, centerY - 8)
    ctx.fillText('SLOT', centerX, centerY + 8)

    // Draw supplier nodes
    const activeSuppliers = suppliers.filter(s => s.isActive)
    activeSuppliers.forEach((supplier, index) => {
      const angle = (index / activeSuppliers.length) * Math.PI * 2 - Math.PI / 2
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      // Draw connection line
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(x, y)
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.stroke()
      ctx.setLineDash([])

      // Draw supplier node
      ctx.beginPath()
      ctx.arc(x, y, 40, 0, Math.PI * 2)
      ctx.fillStyle = '#10b981'
      ctx.fill()
      ctx.strokeStyle = '#059669'
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw supplier name
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 11px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const shortName = supplier.name.length > 10 ? supplier.code : supplier.name
      ctx.fillText(shortName, x, y)

      // Draw product count badge
      ctx.beginPath()
      ctx.arc(x + 30, y - 30, 15, 0, Math.PI * 2)
      ctx.fillStyle = '#f59e0b'
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 10px Arial'
      ctx.fillText(supplier.productCount.toString(), x + 30, y - 30)
    })

    // Draw FedEx connection
    const fedexX = centerX
    const fedexY = height - 60
    ctx.beginPath()
    ctx.moveTo(centerX, centerY + 50)
    ctx.lineTo(fedexX, fedexY - 25)
    ctx.strokeStyle = '#4b2d83'
    ctx.lineWidth = 3
    ctx.setLineDash([8, 4])
    ctx.stroke()
    ctx.setLineDash([])

    // Draw FedEx node
    ctx.beginPath()
    ctx.roundRect(fedexX - 50, fedexY - 25, 100, 50, 8)
    ctx.fillStyle = '#4b2d83'
    ctx.fill()
    ctx.fillStyle = '#ff6600'
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('FedEx', fedexX, fedexY)
  }

  const handleAddSupplier = () => {
    const supplier: Supplier = {
      id: Date.now().toString(),
      name: newSupplier.name,
      code: newSupplier.code || newSupplier.name.substring(0, 4).toUpperCase(),
      email: newSupplier.email,
      phone: newSupplier.phone,
      country: newSupplier.country,
      website: newSupplier.website,
      googleSheetUrl: newSupplier.googleSheetUrl,
      logoUrl: '',
      isActive: true,
      productCount: 0,
      lastImport: null,
      notes: newSupplier.notes
    }
    setSuppliers([...suppliers, supplier])
    setShowAddModal(false)
    setNewSupplier({ name: '', code: '', email: '', phone: '', country: '', website: '', googleSheetUrl: '', notes: '' })
  }

  const handleExportCSV = (supplier: Supplier) => {
    const headers = ['SKU', 'Title', 'Price', 'Quantity', 'Category', 'Brand']
    const sampleData = [
      [supplier.code + '-001', 'Sample Product 1', '299.99', '10', 'Slot Cars', supplier.name],
      [supplier.code + '-002', 'Sample Product 2', '199.99', '15', 'Parts', supplier.name],
    ]
    const csvContent = [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${supplier.code.toLowerCase()}-products-template.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>, supplier: Supplier) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const csvData = event.target?.result as string
      const lines = csvData.split('\n').filter(line => line.trim())
      const productCount = Math.max(0, lines.length - 1) // Exclude header

      const newImport: SupplierImport = {
        id: Date.now().toString(),
        supplierId: supplier.id,
        filename: file.name,
        csvData: csvData,
        productCount: productCount,
        importedAt: new Date().toISOString()
      }

      setImports([newImport, ...imports])
      setSuppliers(suppliers.map(s =>
        s.id === supplier.id
          ? { ...s, productCount: s.productCount + productCount, lastImport: new Date().toISOString() }
          : s
      ))
      alert(`Successfully imported ${productCount} products from ${file.name}`)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleExportAllSuppliers = () => {
    const headers = ['ID', 'Name', 'Code', 'Email', 'Phone', 'Country', 'Website', 'Google Sheet', 'Products', 'Status']
    const rows = suppliers.map(s => [
      s.id, s.name, s.code, s.email, s.phone, s.country, s.website, s.googleSheetUrl, s.productCount, s.isActive ? 'Active' : 'Inactive'
    ])
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'r66-suppliers-export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDeleteSupplier = (id: string) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      setSuppliers(suppliers.filter(s => s.id !== id))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="font-play">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Suppliers Network</h1>
          <p className="text-gray-500 mt-1">Manage your supplier relationships and imports</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExportAllSuppliers}>
            Export All CSV
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            + Add Supplier
          </Button>
        </div>
      </div>

      {/* FedEx Banner */}
      <a
        href="https://www.fedex.com/en-za/home.html"
        target="_blank"
        rel="noopener noreferrer"
        className="block mb-6"
      >
        <Card className="bg-gradient-to-r from-[#4b2d83] to-[#ff6600] hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-lg p-2">
                <svg width="80" height="30" viewBox="0 0 960 430" className="text-[#4b2d83]">
                  <path fill="#4b2d83" d="M0 430V0h251.3c65.7 0 115 8.3 148 24.9 33 16.6 49.5 42.5 49.5 77.7 0 23.3-8.3 42.5-24.9 57.5-16.6 15-39.4 24.9-68.4 29.6v1.3c35 4.7 62.4 16.6 82.3 35.7 19.9 19.1 29.6 43.5 29.6 73.1 0 42.5-16.6 75.6-49.5 99.3-32.9 24.9-79.7 31-140.3 31H0zm115.9-173.5h120.4c33 0 58.6-5.7 76.7-17.3 18.1-11.6 27.1-29.6 27.1-54.1 0-24.5-9-41.5-27.1-51-18.1-9.5-45.5-14.3-82.3-14.3H115.9v136.7zm0 89.2v124.4h135.7c35 0 61.3-6.2 79-18.6 17.6-12.4 26.5-31.5 26.5-57.5 0-25.4-9.5-44-28.4-55.7-18.9-11.7-46.6-17.6-83.2-17.6H115.9z"/>
                  <path fill="#ff6600" d="M580 430V0h115.9v192.1L854.8 0H1000L804.8 172.1 1000 430H854.8L695.9 220.5l-115.9 95.6V430H580z"/>
                </svg>
              </div>
              <div className="text-white">
                <p className="font-bold text-lg">FedEx Shipping Partner</p>
                <p className="text-sm opacity-90">Track shipments and manage deliveries</p>
              </div>
            </div>
            <div className="text-white flex items-center gap-2">
              <span className="text-sm">Access Account</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
          </CardContent>
        </Card>
      </a>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Suppliers</p>
            <p className="text-2xl font-bold text-gray-900">{suppliers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Active Suppliers</p>
            <p className="text-2xl font-bold text-green-600">{suppliers.filter(s => s.isActive).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Products</p>
            <p className="text-2xl font-bold text-blue-600">{suppliers.reduce((sum, s) => sum + s.productCount, 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">CSV Imports</p>
            <p className="text-2xl font-bold text-purple-600">{imports.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {(['network', 'list', 'imports'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'network' ? 'Network View' : tab === 'list' ? 'Supplier List' : 'Import History'}
          </button>
        ))}
      </div>

      {/* Network View */}
      {activeTab === 'network' && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Supplier Network Visualization</h3>
              <p className="text-sm text-gray-500">Interactive view of your supplier connections</p>
            </div>
            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                width={700}
                height={500}
                className="border border-gray-200 rounded-lg"
              />
            </div>
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <span>R66 Slot Hub</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span>Active Suppliers</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                <span>Product Count</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#4b2d83]"></div>
                <span>FedEx Shipping</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supplier List */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {suppliers.map((supplier) => (
            <Card key={supplier.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold ${
                      supplier.isActive ? 'bg-green-500' : 'bg-gray-400'
                    }`}>
                      {supplier.code.substring(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                      <p className="text-sm text-gray-500">{supplier.country} • {supplier.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      {supplier.productCount} products
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      supplier.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {supplier.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-500">Email</p>
                      <p className="font-medium">{supplier.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Phone</p>
                      <p className="font-medium">{supplier.phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Website</p>
                      <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                        Visit Site
                      </a>
                    </div>
                    <div>
                      <p className="text-gray-500">Last Import</p>
                      <p className="font-medium">
                        {supplier.lastImport ? new Date(supplier.lastImport).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedSupplier(supplier); setShowWorksheetModal(true) }}
                    >
                      📊 Worksheet
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExportCSV(supplier)}>
                      📥 Export Template
                    </Button>
                    <label className="inline-flex">
                      <Button variant="outline" size="sm" className="cursor-pointer">
                        📤 Import CSV
                      </Button>
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => handleImportCSV(e, supplier)}
                      />
                    </label>
                    {supplier.googleSheetUrl && (
                      <a href={supplier.googleSheetUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          📋 Google Sheet
                        </Button>
                      </a>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteSupplier(supplier.id)}
                    >
                      Delete
                    </Button>
                  </div>
                  {supplier.notes && (
                    <p className="mt-3 text-sm text-gray-500 italic">{supplier.notes}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Import History */}
      {activeTab === 'imports' && (
        <Card>
          <CardContent className="p-0">
            {imports.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">📥</div>
                <h3 className="text-xl font-semibold mb-2">No Imports Yet</h3>
                <p className="text-gray-600">Import CSV files from the Supplier List tab to see them here.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">File</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Products</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {imports.map((imp) => {
                    const supplier = suppliers.find(s => s.id === imp.supplierId)
                    return (
                      <tr key={imp.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">📄</span>
                            <span className="font-medium">{imp.filename}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{supplier?.name || 'Unknown'}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                            {imp.productCount} items
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {new Date(imp.importedAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const blob = new Blob([imp.csvData], { type: 'text/csv' })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = imp.filename
                              a.click()
                              URL.revokeObjectURL(url)
                            }}
                          >
                            Download
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Add New Supplier</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
                    <input
                      type="text"
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Scalextric"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                    <input
                      type="text"
                      value={newSupplier.code}
                      onChange={(e) => setNewSupplier({ ...newSupplier, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., SCAL"
                      maxLength={10}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={newSupplier.email}
                      onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="contact@supplier.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={newSupplier.phone}
                      onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={newSupplier.country}
                    onChange={(e) => setNewSupplier({ ...newSupplier, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., United Kingdom"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={newSupplier.website}
                    onChange={(e) => setNewSupplier({ ...newSupplier, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="https://www.supplier.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Google Sheet URL</label>
                  <input
                    type="url"
                    value={newSupplier.googleSheetUrl}
                    onChange={(e) => setNewSupplier({ ...newSupplier, googleSheetUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Link to the supplier's product worksheet</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={newSupplier.notes}
                    onChange={(e) => setNewSupplier({ ...newSupplier, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={2}
                    placeholder="Additional notes about this supplier..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button
                  onClick={handleAddSupplier}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!newSupplier.name}
                >
                  Add Supplier
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Worksheet Modal */}
      {showWorksheetModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">{selectedSupplier.name} Worksheet</h2>
                  <p className="text-gray-500">Product import and management worksheet</p>
                </div>
                <Button variant="outline" onClick={() => setShowWorksheetModal(false)}>Close</Button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card className="bg-blue-50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{selectedSupplier.productCount}</p>
                    <p className="text-sm text-gray-600">Total Products</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {imports.filter(i => i.supplierId === selectedSupplier.id).length}
                    </p>
                    <p className="text-sm text-gray-600">CSV Imports</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {selectedSupplier.lastImport ? new Date(selectedSupplier.lastImport).toLocaleDateString() : 'Never'}
                    </p>
                    <p className="text-sm text-gray-600">Last Import</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Quick Actions</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleExportCSV(selectedSupplier)}>
                      Download CSV Template
                    </Button>
                    {selectedSupplier.googleSheetUrl && (
                      <a href={selectedSupplier.googleSheetUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">Open Google Sheet</Button>
                      </a>
                    )}
                    <label className="inline-flex">
                      <Button variant="outline" size="sm" className="bg-blue-600 text-white hover:bg-blue-700 cursor-pointer">
                        Import Products from CSV
                      </Button>
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => {
                          handleImportCSV(e, selectedSupplier)
                          setShowWorksheetModal(false)
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-3">Supplier Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500">Code:</span> <span className="font-medium">{selectedSupplier.code}</span></div>
                    <div><span className="text-gray-500">Country:</span> <span className="font-medium">{selectedSupplier.country}</span></div>
                    <div><span className="text-gray-500">Email:</span> <span className="font-medium">{selectedSupplier.email}</span></div>
                    <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{selectedSupplier.phone}</span></div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Website:</span>{' '}
                      <a href={selectedSupplier.website} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                        {selectedSupplier.website}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-3">Recent Imports</h3>
                  {imports.filter(i => i.supplierId === selectedSupplier.id).length === 0 ? (
                    <p className="text-gray-500 text-sm">No imports yet for this supplier.</p>
                  ) : (
                    <div className="space-y-2">
                      {imports.filter(i => i.supplierId === selectedSupplier.id).slice(0, 5).map(imp => (
                        <div key={imp.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <span>📄</span>
                            <span className="font-medium">{imp.filename}</span>
                            <span className="text-gray-500 text-sm">({imp.productCount} products)</span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(imp.importedAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
