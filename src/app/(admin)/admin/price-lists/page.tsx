'use client'

import { useState, useEffect } from 'react'

interface Product {
  id: string
  sku: string
  title: string
  price: number
  quantity: number
  brand: string
  status: string
}

interface Supplier {
  id: string
  name: string
  code: string
}

interface PricelistEntry {
  supplierId: string
  sku: string
  wholesalePrice: number
  shopQty: number
}

function formatPrice(p: number) {
  return `R ${p.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export default function PriceListsPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [pricelistEntries, setPricelistEntries] = useState<PricelistEntry[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [supRes, prodRes, plRes] = await Promise.all([
          fetch('/api/admin/supplier-contacts'),
          fetch('/api/admin/products'),
          fetch('/api/admin/inventory-pricelists'),
        ])
        const supData = await supRes.json()
        const prodData = await prodRes.json()
        const plData = await plRes.json()
        const supList: Supplier[] = Array.isArray(supData) ? supData.filter((s: Supplier) => s.name) : []
        setSuppliers(supList)
        setProducts(Array.isArray(prodData) ? prodData : [])
        setPricelistEntries(Array.isArray(plData) ? plData : [])
        if (supList.length > 0) setSelectedSupplier(supList[0])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Use pricelist entries (set by worksheets) to determine which SKUs belong to the selected supplier
  const filteredProducts = (() => {
    if (!selectedSupplier) return []
    const supplierSkus = new Set(
      pricelistEntries
        .filter((e) => e.supplierId === selectedSupplier.id)
        .map((e) => e.sku)
    )
    return products
      .filter((p) => {
        if (!supplierSkus.has(p.sku)) return false
        if (search) {
          const q = search.toLowerCase()
          return p.sku?.toLowerCase().includes(q) || p.title?.toLowerCase().includes(q)
        }
        return true
      })
      .sort((a, b) => (a.sku || '').localeCompare(b.sku || '', undefined, { numeric: true }))
  })()

  async function handleDownloadPDF() {
    if (!selectedSupplier || filteredProducts.length === 0) return
    setDownloading(true)
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const today = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })

      // ── Header ──
      doc.setFillColor(17, 24, 39) // gray-900
      doc.rect(0, 0, pageW, 28, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('R66SLOT', 14, 12)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Premium Slot Cars & Collectibles', 14, 18)
      doc.text('r66slot.co.za', 14, 23)

      // Date + title right-aligned
      doc.setFontSize(8)
      doc.text(today, pageW - 14, 14, { align: 'right' })
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('PRICE LIST', pageW - 14, 21, { align: 'right' })

      // ── Supplier Banner ──
      doc.setFillColor(243, 244, 246) // gray-100
      doc.rect(0, 28, pageW, 12, 'F')
      doc.setTextColor(17, 24, 39)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text(selectedSupplier.name.toUpperCase(), 14, 37)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(107, 114, 128)
      doc.text(`${filteredProducts.length} item${filteredProducts.length !== 1 ? 's' : ''}`, pageW - 14, 37, { align: 'right' })

      // ── Table ──
      autoTable(doc, {
        startY: 44,
        head: [['SKU', 'Description', 'Retail Price', 'QTY on Hand']],
        body: filteredProducts.map((p) => [
          p.sku || '—',
          p.title || '—',
          formatPrice(p.price || 0),
          p.quantity != null ? String(p.quantity) : '—',
        ]),
        styles: {
          fontSize: 8,
          cellPadding: 3,
          textColor: [17, 24, 39],
        },
        headStyles: {
          fillColor: [17, 24, 39],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        columnStyles: {
          0: { cellWidth: 32, fontStyle: 'bold' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 30, halign: 'right' },
          3: { cellWidth: 24, halign: 'center' },
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data: any) => {
          // Footer on every page
          const pageCount = (doc as any).internal.getNumberOfPages()
          doc.setFontSize(7)
          doc.setTextColor(156, 163, 175)
          doc.text(
            `Page ${data.pageNumber} of ${pageCount} · R66SLOT Price List · ${today}`,
            pageW / 2,
            doc.internal.pageSize.getHeight() - 6,
            { align: 'center' }
          )
        },
      })


      doc.save(`R66SLOT-PriceList-${selectedSupplier.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('PDF error:', err)
    } finally {
      setDownloading(false)
    }
  }

  const totalValue = filteredProducts.reduce((sum, p) => sum + (p.price || 0) * (p.quantity || 0), 0)
  const inStock = filteredProducts.filter((p) => (p.quantity || 0) > 0).length

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Price Lists</h1>
          <p className="text-sm text-gray-500 mt-0.5">Generate and share supplier price lists with clients</p>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={downloading || !selectedSupplier || filteredProducts.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
        >
          {downloading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Generating…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Download PDF
            </>
          )}
        </button>
      </div>

      {/* ── Supplier Tabs ── */}
      {loading ? (
        <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {suppliers.map((s) => (
              <button
                key={s.id}
                onClick={() => { setSelectedSupplier(s); setSearch('') }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedSupplier?.id === s.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* ── Stats ── */}
          {selectedSupplier && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total SKUs</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{filteredProducts.length}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">In Stock</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{inStock}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Stock Value</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatPrice(totalValue)}</p>
              </div>
            </div>
          )}

          {/* ── Search ── */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SKU or description…"
              className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-xs text-gray-500 hover:text-gray-800">Clear</button>
            )}
          </div>

          {/* ── Table ── */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {!selectedSupplier ? (
              <div className="py-12 text-center text-gray-400 text-sm">Select a supplier above</div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                {search ? 'No products match your search.' : `No products found for ${selectedSupplier.name}.`}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">SKU</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Retail Price</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">QTY on Hand</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p, i) => (
                    <tr key={p.id} className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-gray-800">{p.sku || '—'}</td>
                      <td className="py-3 px-4 text-gray-700">{p.title || '—'}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">{formatPrice(p.price || 0)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          (p.quantity || 0) > 5 ? 'bg-green-100 text-green-700' :
                          (p.quantity || 0) > 0 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {p.quantity != null ? p.quantity : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-gray-50">
                    <td colSpan={2} className="py-3 px-4 text-xs text-gray-500 font-medium">{filteredProducts.length} items</td>
                    <td className="py-3 px-4 text-right text-xs font-bold text-gray-900">
                      {formatPrice(filteredProducts.reduce((s, p) => s + (p.price || 0), 0))}
                    </td>
                    <td className="py-3 px-4 text-center text-xs font-bold text-gray-900">
                      {filteredProducts.reduce((s, p) => s + (p.quantity || 0), 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
