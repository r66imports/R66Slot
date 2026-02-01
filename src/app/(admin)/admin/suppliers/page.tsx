'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface SupplierImport {
  id: string
  filename: string
  csvData: string
  productCount: number
  importedAt: string
  source: string
}

export default function SuppliersPage() {
  const [imports, setImports] = useState<SupplierImport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchImports()
  }, [])

  const fetchImports = async () => {
    try {
      const res = await fetch('/api/admin/suppliers')
      if (res.ok) {
        const data = await res.json()
        setImports(data)
      }
    } catch (error) {
      console.error('Error fetching supplier imports:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this import record?')) return
    try {
      const res = await fetch(`/api/admin/suppliers?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setImports(imports.filter((i) => i.id !== id))
      }
    } catch (error) {
      console.error('Error deleting import:', error)
    }
  }

  const handleDownload = (imp: SupplierImport) => {
    const blob = new Blob([imp.csvData], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = imp.filename
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Suppliers</h1>
        <p className="text-gray-600 mt-1">
          Imported CSV files from product imports ({imports.length} imports)
        </p>
      </div>

      {imports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-5xl mb-4">📥</div>
            <h3 className="text-xl font-semibold mb-2">No Imports Yet</h3>
            <p className="text-gray-600 mb-4">
              When you import CSV files from the Products page, they will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {imports.map((imp) => (
            <Card key={imp.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">📄</span>
                      <h3 className="text-lg font-semibold">{imp.filename}</h3>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                        {imp.source}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{imp.productCount} products</span>
                      <span>Imported {new Date(imp.importedAt).toLocaleString()}</span>
                    </div>

                    {expandedId === imp.id && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 overflow-x-auto">
                        <pre className="text-xs font-mono text-gray-700 whitespace-pre max-h-[300px] overflow-y-auto">
                          {imp.csvData}
                        </pre>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedId(expandedId === imp.id ? null : imp.id)}
                    >
                      {expandedId === imp.id ? 'Hide' : 'View'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(imp)}
                    >
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(imp.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
