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

interface Shipment {
  id: string
  supplierId: string
  trackingNumber: string
  trackingUrl: string
  shipper: 'fedex' | 'dhl'
  status: 'pending' | 'in_transit' | 'delivered'
  createdAt: string
  estimatedDelivery?: string
  notes: string
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
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'network' | 'list' | 'imports' | 'shipments'>('network')
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showWorksheetModal, setShowWorksheetModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showShipmentModal, setShowShipmentModal] = useState(false)
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
  const [newShipment, setNewShipment] = useState({
    supplierId: '',
    trackingNumber: '',
    trackingUrl: '',
    shipper: 'fedex' as 'fedex' | 'dhl',
    estimatedDelivery: '',
    notes: ''
  })
  const [showTrackingModal, setShowTrackingModal] = useState(false)
  const [showEditShipmentModal, setShowEditShipmentModal] = useState(false)
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [editingShipment, setEditingShipment] = useState({
    supplierId: '',
    trackingNumber: '',
    trackingUrl: '',
    shipper: 'fedex' as 'fedex' | 'dhl',
    status: 'pending' as 'pending' | 'in_transit' | 'delivered',
    estimatedDelivery: '',
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
    const fedexX = centerX - 80
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
    ctx.roundRect(fedexX - 45, fedexY - 25, 90, 50, 8)
    ctx.fillStyle = '#4b2d83'
    ctx.fill()
    ctx.fillStyle = '#ff6600'
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('FedEx', fedexX, fedexY)

    // Draw DHL connection
    const dhlX = centerX + 80
    const dhlY = height - 60
    ctx.beginPath()
    ctx.moveTo(centerX, centerY + 50)
    ctx.lineTo(dhlX, dhlY - 25)
    ctx.strokeStyle = '#D40511'
    ctx.lineWidth = 3
    ctx.setLineDash([8, 4])
    ctx.stroke()
    ctx.setLineDash([])

    // Draw DHL node
    ctx.beginPath()
    ctx.roundRect(dhlX - 45, dhlY - 25, 90, 50, 8)
    ctx.fillStyle = '#D40511'
    ctx.fill()
    ctx.fillStyle = '#FFCC00'
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('DHL', dhlX, dhlY)
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
          <Button
            onClick={() => setShowShipmentModal(true)}
            className="bg-gradient-to-r from-[#4b2d83] to-[#ff6600] hover:opacity-90 text-white"
          >
            📦 Import Shipment
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            + Add Supplier
          </Button>
        </div>
      </div>

      {/* Shipping Partners Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* FedEx Banner */}
        <a
          href="https://www.fedex.com/en-za/home.html"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Card className="bg-gradient-to-r from-[#4b2d83] to-[#ff6600] hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white rounded-lg p-2">
                  <div className="flex items-center">
                    <span className="text-[#4b2d83] font-bold text-2xl">Fed</span>
                    <span className="text-[#ff6600] font-bold text-2xl">Ex</span>
                  </div>
                </div>
                <div className="text-white">
                  <p className="font-bold text-lg">FedEx Shipping</p>
                  <p className="text-sm opacity-90">International Express</p>
                </div>
              </div>
              <div className="text-white flex items-center gap-2">
                <span className="text-sm">Track</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </CardContent>
          </Card>
        </a>

        {/* DHL Banner */}
        <a
          href="https://www.dhl.com/za-en/home.html"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Card className="bg-gradient-to-r from-[#D40511] to-[#FFCC00] hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white rounded-lg p-2">
                  <div className="bg-[#D40511] text-[#FFCC00] font-bold text-2xl px-3 py-1 rounded">
                    DHL
                  </div>
                </div>
                <div className="text-white">
                  <p className="font-bold text-lg">DHL Express</p>
                  <p className="text-sm opacity-90">Worldwide Shipping</p>
                </div>
              </div>
              <div className="text-white flex items-center gap-2">
                <span className="text-sm">Track</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </CardContent>
          </Card>
        </a>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
        <Card className="bg-gradient-to-r from-[#4b2d83]/10 to-[#ff6600]/10">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Active Shipments</p>
            <p className="text-2xl font-bold text-[#4b2d83]">{shipments.filter(s => s.status !== 'delivered').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {(['network', 'list', 'imports', 'shipments'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'network' ? 'Network View' : tab === 'list' ? 'Supplier List' : tab === 'imports' ? 'Import History' : 'Shipments'}
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
            <div className="flex justify-center gap-6 mt-4 text-sm flex-wrap">
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
                <span>FedEx</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#D40511]"></div>
                <span>DHL</span>
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

      {/* Shipments Tab */}
      {activeTab === 'shipments' && (
        <Card>
          <CardContent className="p-0">
            {shipments.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">📦</div>
                <h3 className="text-xl font-semibold mb-2">No Shipments Yet</h3>
                <p className="text-gray-600 mb-4">Track incoming shipments from your suppliers.</p>
                <Button
                  onClick={() => setShowShipmentModal(true)}
                  className="bg-gradient-to-r from-[#4b2d83] to-[#ff6600] text-white"
                >
                  Import First Shipment
                </Button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Shipper</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tracking #</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Est. Delivery</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {shipments.map((shipment) => {
                    const supplier = suppliers.find(s => s.id === shipment.supplierId)
                    return (
                      <tr key={shipment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {shipment.shipper === 'fedex' ? (
                              <div className="px-2 py-1 bg-[#4b2d83] text-white rounded text-xs font-bold">FedEx</div>
                            ) : (
                              <div className="px-2 py-1 bg-[#D40511] text-white rounded text-xs font-bold">DHL</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              setSelectedShipment(shipment)
                              setShowTrackingModal(true)
                            }}
                            className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                          >
                            {shipment.trackingNumber}
                            <span className="text-xs">🔗</span>
                          </button>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{supplier?.name || 'Unknown'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            shipment.status === 'delivered'
                              ? 'bg-green-100 text-green-700'
                              : shipment.status === 'in_transit'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {shipment.status === 'in_transit' ? 'In Transit' : shipment.status.charAt(0).toUpperCase() + shipment.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {shipment.estimatedDelivery
                            ? new Date(shipment.estimatedDelivery).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedShipment(shipment)
                                setShowTrackingModal(true)
                              }}
                            >
                              🔗 Track
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedShipment(shipment)
                                setEditingShipment({
                                  supplierId: shipment.supplierId,
                                  trackingNumber: shipment.trackingNumber,
                                  trackingUrl: shipment.trackingUrl,
                                  shipper: shipment.shipper,
                                  status: shipment.status,
                                  estimatedDelivery: shipment.estimatedDelivery || '',
                                  notes: shipment.notes
                                })
                                setShowEditShipmentModal(true)
                              }}
                            >
                              ✏️ Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600"
                              onClick={() => setShipments(shipments.filter(s => s.id !== shipment.id))}
                            >
                              Delete
                            </Button>
                          </div>
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

      {/* Import Shipment Modal */}
      {showShipmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-[#4b2d83] to-[#ff6600] rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">📦</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Import Shipment</h2>
                  <p className="text-sm text-gray-500">Track incoming deliveries from suppliers</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Supplier Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                  <select
                    value={newShipment.supplierId}
                    onChange={(e) => setNewShipment({ ...newShipment, supplierId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>

                {/* Shipper Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shipper *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewShipment({ ...newShipment, shipper: 'fedex' })}
                      className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                        newShipment.shipper === 'fedex'
                          ? 'border-[#4b2d83] bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-[#4b2d83] font-bold text-xl">Fed</span>
                        <span className="text-[#ff6600] font-bold text-xl">Ex</span>
                      </div>
                      <span className="text-xs text-gray-500">International Express</span>
                      {newShipment.shipper === 'fedex' && (
                        <span className="text-xs text-[#4b2d83] font-medium">Selected</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewShipment({ ...newShipment, shipper: 'dhl' })}
                      className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                        newShipment.shipper === 'dhl'
                          ? 'border-[#D40511] bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="bg-[#D40511] text-white font-bold text-xl px-3 py-1 rounded">
                        DHL
                      </div>
                      <span className="text-xs text-gray-500">Express Worldwide</span>
                      {newShipment.shipper === 'dhl' && (
                        <span className="text-xs text-[#D40511] font-medium">Selected</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Tracking Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number *</label>
                  <input
                    type="text"
                    value={newShipment.trackingNumber}
                    onChange={(e) => setNewShipment({ ...newShipment, trackingNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 794644790138"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tracking URL will be auto-generated based on shipper
                  </p>
                </div>

                {/* Custom Tracking URL (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Tracking URL <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    value={newShipment.trackingUrl}
                    onChange={(e) => setNewShipment({ ...newShipment, trackingUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Leave empty for auto-generated URL"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter a custom URL or leave empty to use the default carrier tracking URL
                  </p>
                </div>

                {/* Preview Tracking URL */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Tracking URL {newShipment.trackingUrl ? '(Custom)' : '(Auto-generated)'}:</p>
                  <code className="text-xs text-blue-600 break-all">
                    {newShipment.trackingUrl || (newShipment.trackingNumber ? (
                      newShipment.shipper === 'fedex'
                        ? `https://www.fedex.com/fedextrack/?trknbr=${newShipment.trackingNumber}`
                        : `https://www.dhl.com/en/express/tracking.html?AWB=${newShipment.trackingNumber}`
                    ) : 'Enter tracking number to preview URL')}
                  </code>
                </div>

                {/* Estimated Delivery */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Delivery</label>
                  <input
                    type="date"
                    value={newShipment.estimatedDelivery}
                    onChange={(e) => setNewShipment({ ...newShipment, estimatedDelivery: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={newShipment.notes}
                    onChange={(e) => setNewShipment({ ...newShipment, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="Additional notes about this shipment..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowShipmentModal(false)
                    setNewShipment({ supplierId: '', trackingNumber: '', trackingUrl: '', shipper: 'fedex', estimatedDelivery: '', notes: '' })
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const defaultUrl = newShipment.shipper === 'fedex'
                      ? `https://www.fedex.com/fedextrack/?trknbr=${newShipment.trackingNumber}`
                      : `https://www.dhl.com/en/express/tracking.html?AWB=${newShipment.trackingNumber}`

                    const shipment: Shipment = {
                      id: Date.now().toString(),
                      supplierId: newShipment.supplierId,
                      trackingNumber: newShipment.trackingNumber,
                      trackingUrl: newShipment.trackingUrl || defaultUrl,
                      shipper: newShipment.shipper,
                      status: 'pending',
                      createdAt: new Date().toISOString(),
                      estimatedDelivery: newShipment.estimatedDelivery || undefined,
                      notes: newShipment.notes
                    }
                    setShipments([shipment, ...shipments])
                    setShowShipmentModal(false)
                    setNewShipment({ supplierId: '', trackingNumber: '', trackingUrl: '', shipper: 'fedex', estimatedDelivery: '', notes: '' })
                    setActiveTab('shipments')
                  }}
                  className="bg-gradient-to-r from-[#4b2d83] to-[#ff6600] text-white hover:opacity-90"
                  disabled={!newShipment.supplierId || !newShipment.trackingNumber}
                >
                  Import Shipment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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

      {/* Tracking Popup Modal */}
      {showTrackingModal && selectedShipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  selectedShipment.shipper === 'fedex' ? 'bg-[#4b2d83]' : 'bg-[#D40511]'
                }`}>
                  <span className="text-white text-xl">🔗</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Tracking Details</h2>
                  <p className="text-sm text-gray-500">View and access shipment tracking</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Shipper Badge */}
                <div className="flex items-center gap-3">
                  {selectedShipment.shipper === 'fedex' ? (
                    <div className="px-4 py-2 bg-gradient-to-r from-[#4b2d83] to-[#ff6600] text-white rounded-lg font-bold">
                      FedEx
                    </div>
                  ) : (
                    <div className="px-4 py-2 bg-[#D40511] text-white rounded-lg font-bold">
                      DHL
                    </div>
                  )}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    selectedShipment.status === 'delivered'
                      ? 'bg-green-100 text-green-700'
                      : selectedShipment.status === 'in_transit'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {selectedShipment.status === 'in_transit' ? 'In Transit' : selectedShipment.status.charAt(0).toUpperCase() + selectedShipment.status.slice(1)}
                  </span>
                </div>

                {/* Tracking Number */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Tracking Number</p>
                  <p className="text-2xl font-bold text-gray-900 font-mono">{selectedShipment.trackingNumber}</p>
                </div>

                {/* Tracking URL */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600 mb-1">Tracking URL</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded border text-xs break-all">
                      {selectedShipment.trackingUrl}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(selectedShipment.trackingUrl)}
                      className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      title="Copy URL"
                    >
                      📋
                    </button>
                  </div>
                </div>

                {/* Supplier */}
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Supplier</p>
                  <p className="font-medium">{suppliers.find(s => s.id === selectedShipment.supplierId)?.name || 'Unknown'}</p>
                </div>

                {/* Open Tracking Button */}
                <a
                  href={selectedShipment.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block w-full text-center px-4 py-3 text-white rounded-lg font-medium ${
                    selectedShipment.shipper === 'fedex'
                      ? 'bg-gradient-to-r from-[#4b2d83] to-[#ff6600] hover:opacity-90'
                      : 'bg-[#D40511] hover:bg-[#b8040f]'
                  }`}
                >
                  Open Tracking Page →
                </a>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedShipment(selectedShipment)
                    setEditingShipment({
                      supplierId: selectedShipment.supplierId,
                      trackingNumber: selectedShipment.trackingNumber,
                      trackingUrl: selectedShipment.trackingUrl,
                      shipper: selectedShipment.shipper,
                      status: selectedShipment.status,
                      estimatedDelivery: selectedShipment.estimatedDelivery || '',
                      notes: selectedShipment.notes
                    })
                    setShowTrackingModal(false)
                    setShowEditShipmentModal(true)
                  }}
                >
                  ✏️ Edit Shipment
                </Button>
                <Button variant="outline" onClick={() => { setShowTrackingModal(false); setSelectedShipment(null) }}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Shipment Modal */}
      {showEditShipmentModal && selectedShipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">✏️</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Edit Shipment</h2>
                  <p className="text-sm text-gray-500">Update shipment details and tracking</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Supplier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <select
                    value={editingShipment.supplierId}
                    onChange={(e) => setEditingShipment({ ...editingShipment, supplierId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>

                {/* Shipper */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shipper</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingShipment({ ...editingShipment, shipper: 'fedex' })}
                      className={`p-3 border-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                        editingShipment.shipper === 'fedex'
                          ? 'border-[#4b2d83] bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-[#4b2d83] font-bold">Fed</span>
                      <span className="text-[#ff6600] font-bold">Ex</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingShipment({ ...editingShipment, shipper: 'dhl' })}
                      className={`p-3 border-2 rounded-lg flex items-center justify-center transition-all ${
                        editingShipment.shipper === 'dhl'
                          ? 'border-[#D40511] bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="bg-[#D40511] text-white font-bold px-2 py-0.5 rounded">DHL</span>
                    </button>
                  </div>
                </div>

                {/* Tracking Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
                  <input
                    type="text"
                    value={editingShipment.trackingNumber}
                    onChange={(e) => setEditingShipment({ ...editingShipment, trackingNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                    placeholder="e.g., 794644790138"
                  />
                </div>

                {/* Custom Tracking URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tracking URL</label>
                  <input
                    type="url"
                    value={editingShipment.trackingUrl}
                    onChange={(e) => setEditingShipment({ ...editingShipment, trackingUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="https://..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Custom tracking URL - modify to point to specific tracking page
                  </p>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editingShipment.status}
                    onChange={(e) => setEditingShipment({ ...editingShipment, status: e.target.value as 'pending' | 'in_transit' | 'delivered' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>

                {/* Estimated Delivery */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Delivery</label>
                  <input
                    type="date"
                    value={editingShipment.estimatedDelivery}
                    onChange={(e) => setEditingShipment({ ...editingShipment, estimatedDelivery: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={editingShipment.notes}
                    onChange={(e) => setEditingShipment({ ...editingShipment, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={2}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditShipmentModal(false)
                    setSelectedShipment(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setShipments(shipments.map(s =>
                      s.id === selectedShipment.id
                        ? {
                            ...s,
                            supplierId: editingShipment.supplierId,
                            trackingNumber: editingShipment.trackingNumber,
                            trackingUrl: editingShipment.trackingUrl,
                            shipper: editingShipment.shipper,
                            status: editingShipment.status,
                            estimatedDelivery: editingShipment.estimatedDelivery || undefined,
                            notes: editingShipment.notes
                          }
                        : s
                    ))
                    setShowEditShipmentModal(false)
                    setSelectedShipment(null)
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
