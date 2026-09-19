'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { compareSku, formatZAR } from '@/lib/preorder-pricing'
import { SkuPreviewModal, SkuThumb, type SkuPreviewItem } from '@/components/supplier/SkuPreview'

interface BrandRow {
  brand: string
  supplierId: string
  supplierName: string
  count: number
}

interface CatalogueItem {
  id: string
  supplierId: string
  supplierName: string
  brand: string
  sku: string
  description: string
  /** What it sells for on the site today; 0 when we have never carried it. */
  retailZAR: number
  estRetailZAR: number
  imageUrl: string
  qtyAvailable: number
  /** This client's own qty already placed with the supplier. */
  qtyOnOrder: number
}

interface CustomLine {
  key: string
  brand: string
  sku: string
  description: string
  qty: number
}

interface SubmittedLine {
  id: string
  brand: string
  sku: string
  description: string
  qty: number
  status: string
  isNewSku: boolean
  priceLocked: boolean
  estRetailZAR: number
  /** Shelf price at download time; 0 for a SKU we have never carried. */
  retailZAR: number
}

interface SubmittedOrder {
  id: string
  ref: string
  supplierName: string
  status: string
  notes: string
  quoteNumber?: string
  createdAt: string
  lines: SubmittedLine[]
  totalZAR: number
}

/** Quantity plus enough of the item to render it once its brand is deselected. */
type CartEntry = { item: CatalogueItem; qty: number }

type SortKey = 'brand' | 'sku' | 'description' | 'stock' | 'onorder' | 'retail' | 'price'

const STATUS_STYLES: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800',
  reviewed: 'bg-indigo-100 text-indigo-800',
  quoted: 'bg-purple-100 text-purple-800',
  ordered: 'bg-amber-100 text-amber-800',
  'deposit-paid': 'bg-teal-100 text-teal-800',
  paid: 'bg-green-100 text-green-800',
  archived: 'bg-gray-200 text-gray-700',
}

export default function SupplierPreOrdersPage() {
  const [brands, setBrands] = useState<BrandRow[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [brandsOpen, setBrandsOpen] = useState(true)
  const [items, setItems] = useState<CatalogueItem[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('brand')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [cart, setCart] = useState<Record<string, CartEntry>>({})
  const [customLines, setCustomLines] = useState<CustomLine[]>([])
  const [notes, setNotes] = useState('')
  const [preview, setPreview] = useState<SkuPreviewItem | null>(null)
  const [disclaimer, setDisclaimer] = useState('')
  const [rateFetchedAt, setRateFetchedAt] = useState('')

  const [loadingBrands, setLoadingBrands] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [showOrder, setShowOrder] = useState(false)

  const [history, setHistory] = useState<SubmittedOrder[]>([])
  const [pdfBusy, setPdfBusy] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/account/supplier-preorders')
      if (res.ok) setHistory(await res.json())
    } catch {
      /* history is non-critical — the sheet still works without it */
    }
  }, [])

  // Brand index on mount.
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/account/supplier-catalogue')
        if (res.ok) {
          const data = await res.json()
          setBrands(data.brands || [])
          setDisclaimer(data.disclaimer || '')
          setRateFetchedAt(data.rateFetchedAt || '')
        }
      } finally {
        setLoadingBrands(false)
      }
    })()
    loadHistory()
  }, [loadHistory])

  // Typing shouldn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  /**
   * Items for the current brand selection and/or search. Search runs server-side
   * and works with no brand selected, so a client who knows the SKU can find it
   * without guessing which brand it belongs to.
   */
  useEffect(() => {
    if (selectedBrands.length === 0 && !debouncedSearch) {
      setItems([])
      return
    }
    let cancelled = false
    setLoadingItems(true)
    ;(async () => {
      try {
        const qs = new URLSearchParams()
        if (selectedBrands.length > 0) qs.set('brands', selectedBrands.join(','))
        if (debouncedSearch) qs.set('q', debouncedSearch)
        const res = await fetch(`/api/account/supplier-catalogue?${qs}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          setItems(data.items || [])
          setRateFetchedAt(data.rateFetchedAt || '')
        }
      } finally {
        if (!cancelled) setLoadingItems(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedBrands, debouncedSearch])

  const toggleBrand = (brand: string) =>
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    )

  const setQty = (item: CatalogueItem, qty: number) =>
    setCart((prev) => {
      const next = { ...prev }
      if (qty <= 0) delete next[item.id]
      else next[item.id] = { item, qty }
      return next
    })

  /**
   * Sorting. Brand → SKU stays the default; a client hunting on price or on
   * what is already on the shelf can re-sort by any column. Ties always fall
   * back to brand → SKU so the order never looks random.
   */
  const visibleItems = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...items].sort((a, b) => {
      let cmp = 0
      if (sortBy === 'brand') cmp = a.brand.localeCompare(b.brand)
      else if (sortBy === 'sku') cmp = compareSku(a.sku, b.sku)
      else if (sortBy === 'description')
        cmp = (a.description || '').localeCompare(b.description || '')
      else if (sortBy === 'stock') cmp = a.qtyAvailable - b.qtyAvailable
    else if (sortBy === 'onorder') cmp = a.qtyOnOrder - b.qtyOnOrder
    else if (sortBy === 'retail') cmp = a.retailZAR - b.retailZAR
      else if (sortBy === 'price') cmp = a.estRetailZAR - b.estRetailZAR
      if (cmp !== 0) return cmp * dir
      return a.brand.localeCompare(b.brand) || compareSku(a.sku, b.sku)
    })
  }, [items, sortBy, sortDir])

  /** Header cell that sorts the sheet; clicking the active column flips it. */
  const sortTh = (col: SortKey, label: string, className: string) => {
    const active = sortBy === col
    return (
      <th className={`${className} font-medium`}>
        <button
          type="button"
          onClick={() => {
            if (active) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
            else {
              setSortBy(col)
              setSortDir('asc')
            }
          }}
          className={`group inline-flex items-center gap-1 uppercase tracking-wide ${
            active ? 'text-gray-900' : 'hover:text-gray-700'
          }`}
        >
          {label}
          <span className={active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}>
            {active && sortDir === 'desc' ? '↑' : '↓'}
          </span>
        </button>
      </th>
    )
  }

  const cartEntries = useMemo(
    () =>
      Object.values(cart).sort(
        (a, b) => a.item.brand.localeCompare(b.item.brand) || compareSku(a.item.sku, b.item.sku)
      ),
    [cart]
  )

  const catalogueTotal = cartEntries.reduce((s, e) => s + e.qty * e.item.estRetailZAR, 0)
  const customCount = customLines.filter((l) => l.sku.trim()).length
  const lineCount = cartEntries.length + customCount
  const unitCount =
    cartEntries.reduce((s, e) => s + e.qty, 0) +
    customLines.filter((l) => l.sku.trim()).reduce((s, l) => s + l.qty, 0)

  const addCustomLine = () =>
    setCustomLines((prev) => [
      ...prev,
      {
        key: `cl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        brand: selectedBrands[0] || '',
        sku: '',
        description: '',
        qty: 1,
      },
    ])

  const updateCustomLine = (key: string, patch: Partial<CustomLine>) =>
    setCustomLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const removeCustomLine = (key: string) =>
    setCustomLines((prev) => prev.filter((l) => l.key !== key))

  /**
   * A client's own copy of one request. Estimates only — the page's disclaimer
   * is printed on it so a saved PDF can never be read back as a quote. Rejected
   * lines stay visible but greyed and struck from the total, exactly as the
   * expanded row shows them.
   */
  const downloadPdf = async (order: SubmittedOrder) => {
    setPdfBusy(order.id)
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const created = new Date(order.createdAt).toLocaleDateString('en-ZA', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

      doc.setFillColor(17, 24, 39)
      doc.rect(0, 0, pageW, 28, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('R66SLOT', 14, 12)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Premium Slot Cars & Collectibles', 14, 18)
      doc.text('r66slot.co.za', 14, 23)
      doc.setFontSize(8)
      doc.text(created, pageW - 14, 14, { align: 'right' })
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('SUPPLIER PRE ORDER', pageW - 14, 21, { align: 'right' })

      doc.setFillColor(243, 244, 246)
      doc.rect(0, 28, pageW, 12, 'F')
      doc.setTextColor(17, 24, 39)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text(`${order.ref} · ${order.supplierName}`, 14, 37)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(107, 114, 128)
      doc.text(
        `${order.status.replace('-', ' ')}${order.quoteNumber ? ` · Quote ${order.quoteNumber}` : ''}`,
        pageW - 14,
        37,
        { align: 'right' }
      )

      const live = order.lines.filter((l) => l.status !== 'rejected')
      autoTable(doc, {
        startY: 44,
        head: [['SKU', 'Description', 'Qty', 'Retail', 'Est. Retail', 'Line Total']],
        body: order.lines.map((l) => [
          l.sku || '—',
          `${l.description || l.brand}${l.status === 'rejected' ? '  (not available)' : ''}`,
          String(l.qty),
          l.retailZAR > 0 ? formatZAR(l.retailZAR) : '—',
          l.estRetailZAR > 0 ? formatZAR(l.estRetailZAR) : 'To be priced',
          l.status === 'rejected'
            ? '—'
            : l.estRetailZAR > 0
              ? formatZAR(l.qty * l.estRetailZAR)
              : 'To be priced',
        ]),
        styles: { fontSize: 8, cellPadding: 3, textColor: [17, 24, 39] },
        headStyles: {
          fillColor: [17, 24, 39],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
        },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: {
          0: { cellWidth: 26, fontStyle: 'bold' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 12, halign: 'center' },
          3: { cellWidth: 26, halign: 'right' },
          4: { cellWidth: 26, halign: 'right' },
          5: { cellWidth: 28, halign: 'right' },
        },
        didParseCell: (data: any) => {
          if (data.section === 'body' && order.lines[data.row.index]?.status === 'rejected') {
            data.cell.styles.textColor = [156, 163, 175]
          }
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data: any) => {
          const pageCount = (doc as any).internal.getNumberOfPages()
          doc.setFontSize(7)
          doc.setTextColor(156, 163, 175)
          doc.text(
            `Page ${data.pageNumber} of ${pageCount} · ${order.ref} · R66SLOT Supplier Pre Order`,
            pageW / 2,
            doc.internal.pageSize.getHeight() - 6,
            { align: 'center' }
          )
        },
      })

      let y = ((doc as any).lastAutoTable?.finalY || 44) + 8
      doc.setTextColor(17, 24, 39)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(`Estimated total (${live.length} item${live.length !== 1 ? 's' : ''})`, pageW - 58, y, {
        align: 'right',
      })
      doc.text(formatZAR(order.totalZAR), pageW - 14, y, { align: 'right' })

      if (order.notes) {
        y += 10
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('Your notes', 14, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(75, 85, 99)
        y += 5
        doc.text(doc.splitTextToSize(order.notes, pageW - 28), 14, y)
      }

      if (disclaimer) {
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(107, 114, 128)
        const note = doc.splitTextToSize(disclaimer, pageW - 28)
        doc.text(note, 14, doc.internal.pageSize.getHeight() - 14 - note.length * 3)
      }

      doc.save(`R66SLOT-${order.ref}.pdf`)
    } catch (err) {
      console.error('PDF error:', err)
      window.alert('Could not build the PDF — please try again.')
    } finally {
      setPdfBusy(null)
    }
  }

  const submit = async () => {
    if (lineCount === 0) {
      setMessage({ kind: 'err', text: 'Add at least one item before sending.' })
      return
    }
    setSubmitting(true)
    setMessage(null)
    try {
      const lines = [
        ...cartEntries.map((e) => ({
          catalogueItemId: e.item.id,
          brand: e.item.brand,
          sku: e.item.sku,
          description: e.item.description,
          qty: e.qty,
        })),
        ...customLines
          .filter((l) => l.sku.trim())
          .map((l) => ({
            brand: l.brand.trim(),
            sku: l.sku.trim(),
            description: l.description.trim(),
            qty: l.qty,
          })),
      ]

      const res = await fetch('/api/account/supplier-preorders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines, notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to send')

      const refs = (data.orders || []).map((o: any) => o.ref).join(', ')
      setMessage({
        kind: 'ok',
        text: `Sent. Reference ${refs}. We'll confirm pricing once the order is placed.`,
      })
      setCart({})
      setCustomLines([])
      setNotes('')
      setShowOrder(false)
      loadHistory()
    } catch (err: any) {
      setMessage({ kind: 'err', text: err?.message || 'Failed to send' })
    } finally {
      setSubmitting(false)
    }
  }

  /** The running selection — same list in the panel and the modal. */
  const OrderLines = ({ compact }: { compact?: boolean }) => (
    <div className="divide-y divide-gray-100">
      {cartEntries.map((e) => (
        <div key={e.item.id} className="py-2 flex items-center justify-between gap-4 text-sm">
          <div className="min-w-0">
            <span className="font-mono text-xs text-gray-500">{e.item.sku}</span>
            <span className="mx-2 text-gray-300">–</span>
            <span className="text-gray-800">{e.item.description || e.item.brand}</span>
            <span className="ml-2 text-xs text-gray-400">{e.item.brand}</span>
          </div>
          <div className="flex items-center gap-3 whitespace-nowrap">
            {compact ? (
              <span className="text-gray-500">× {e.qty}</span>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setQty(e.item, e.qty - 1)}
                  className="w-6 h-6 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                  aria-label={`Decrease ${e.item.sku}`}
                >
                  −
                </button>
                <span className="w-8 text-center text-gray-700">{e.qty}</span>
                <button
                  type="button"
                  onClick={() => setQty(e.item, e.qty + 1)}
                  className="w-6 h-6 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                  aria-label={`Increase ${e.item.sku}`}
                >
                  +
                </button>
              </div>
            )}
            <span className="font-semibold w-28 text-right">
              {e.item.estRetailZAR > 0 ? formatZAR(e.qty * e.item.estRetailZAR) : 'On request'}
            </span>
            {!compact && (
              <button
                type="button"
                onClick={() => setQty(e.item, 0)}
                className="text-gray-400 hover:text-red-600 px-1"
                aria-label={`Remove ${e.item.sku}`}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      ))}
      {customLines
        .filter((l) => l.sku.trim())
        .map((l) => (
          <div key={l.key} className="py-2 flex items-center justify-between gap-4 text-sm">
            <div className="min-w-0">
              <span className="font-mono text-xs text-gray-500">{l.sku}</span>
              <span className="mx-2 text-gray-300">–</span>
              <span className="text-gray-800">{l.description || l.brand || 'New item'}</span>
              <span className="ml-2 text-[10px] uppercase tracking-wide bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                New SKU
              </span>
            </div>
            <div className="flex items-center gap-3 whitespace-nowrap">
              <span className="text-gray-500">× {l.qty}</span>
              <span className="text-gray-400 w-28 text-right">To be priced</span>
            </div>
          </div>
        ))}
    </div>
  )

  return (
    <div className="space-y-6 pb-24">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900">Supplier Pre Orders</h2>
        <p className="text-sm text-gray-600 mt-1">
          Choose a brand or search for a SKU, pick what you want and send us the list. This is a
          request for us to order on your behalf — nothing is reserved or charged until we confirm.
        </p>
        {disclaimer && (
          <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            {disclaimer}
            {rateFetchedAt && (
              <span className="block text-amber-700 mt-0.5">
                Rate last updated {new Date(rateFetchedAt).toLocaleString('en-ZA')}
              </span>
            )}
          </p>
        )}
      </div>

      {/* Search — always available, with or without a brand chosen */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search any SKU or description…"
          className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {debouncedSearch && selectedBrands.length === 0 && (
          <p className="text-xs text-gray-500 mt-2">Searching all brands.</p>
        )}
      </div>

      {/* Brands — collapsible */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Brands
            {selectedBrands.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                {selectedBrands.length} selected
              </span>
            )}
          </h3>
          <button
            type="button"
            onClick={() => setBrandsOpen((v) => !v)}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            {brandsOpen ? 'Hide ▲' : 'Show ▼'}
          </button>
        </div>

        {brandsOpen && (
          <>
            {loadingBrands ? (
              <p className="text-sm text-gray-500 mt-3">Loading brands…</p>
            ) : brands.length === 0 ? (
              <p className="text-sm text-gray-500 mt-3">
                No brands are available yet. Please check back soon.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 mt-3">
                {brands.map((b) => {
                  const on = selectedBrands.includes(b.brand)
                  return (
                    <button
                      key={b.brand}
                      type="button"
                      onClick={() => toggleBrand(b.brand)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        on
                          ? 'bg-primary text-black border-primary'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {b.brand}
                      {b.count > 0 && (
                        <span className={`ml-2 text-xs ${on ? 'text-black/60' : 'text-gray-400'}`}>
                          {b.count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
            {selectedBrands.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedBrands([])}
                className="mt-3 text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Clear selection
              </button>
            )}
          </>
        )}

        {!brandsOpen && selectedBrands.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {selectedBrands.map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-sm text-gray-800"
              >
                {b}
                <button
                  type="button"
                  onClick={() => toggleBrand(b)}
                  className="text-gray-400 hover:text-red-600"
                  aria-label={`Remove ${b}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Items */}
      {(selectedBrands.length > 0 || debouncedSearch) && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Items <span className="text-sm font-normal text-gray-500">({visibleItems.length})</span>
          </h3>

          {loadingItems ? (
            <p className="text-sm text-gray-500 py-6 text-center">Loading items…</p>
          ) : visibleItems.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              Nothing matches. Use “Add an item not listed” below if the SKU is new to us.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                    {sortTh('brand', 'Brand', 'py-2 pr-4')}
                    <th className="py-2 pr-2 font-medium sr-only">Photo</th>
                    {sortTh('sku', 'SKU', 'py-2 pr-4')}
                    {sortTh('description', 'Description', 'py-2 pr-4')}
                    {sortTh('stock', 'In Stock', 'py-2 pr-4 text-center whitespace-nowrap')}
                    {sortTh('onorder', 'Qty Ordered', 'py-2 pr-4 text-center whitespace-nowrap')}
                    {sortTh('retail', 'Retail', 'py-2 pr-4 text-right whitespace-nowrap')}
                    {sortTh('price', 'Est. Retail', 'py-2 pr-4 text-right whitespace-nowrap')}
                    <th className="py-2 font-medium text-center">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleItems.map((item) => {
                    const qty = cart[item.id]?.qty || 0
                    return (
                      <tr key={item.id} className={qty > 0 ? 'bg-primary/5' : undefined}>
                        <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{item.brand}</td>
                        <td className="py-2 pr-2">
                          <SkuThumb item={item} onClick={() => setPreview(item)} />
                        </td>
                        <td className="py-2 pr-4 font-mono text-xs text-gray-900 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setPreview(item)}
                            className="hover:underline text-left"
                          >
                            {item.sku}
                          </button>
                        </td>
                        <td className="py-2 pr-4 text-gray-700">
                          <button
                            type="button"
                            onClick={() => setPreview(item)}
                            className="hover:underline text-left"
                          >
                            {item.description || '—'}
                          </button>
                        </td>
                        <td className="py-2 pr-4 text-center whitespace-nowrap">
                          {item.qtyAvailable > 0 ? (
                            <span className="text-green-700 font-semibold">{item.qtyAvailable}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td
                          className="py-2 pr-4 text-center whitespace-nowrap"
                          title="Your qty already placed with the supplier — requests still being gathered are not counted"
                        >
                          {item.qtyOnOrder > 0 ? (
                            <span className="text-amber-700 font-semibold">{item.qtyOnOrder}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td
                          className="py-2 pr-4 text-right text-gray-600 whitespace-nowrap"
                          title="What this sells for on the site today"
                        >
                          {item.retailZAR > 0 ? formatZAR(item.retailZAR) : '—'}
                        </td>
                        <td className="py-2 pr-4 text-right font-semibold whitespace-nowrap">
                          {item.estRetailZAR > 0 ? formatZAR(item.estRetailZAR) : 'On request'}
                        </td>
                        <td className="py-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setQty(item, qty - 1)}
                              disabled={qty === 0}
                              className="w-7 h-7 rounded border border-gray-300 text-gray-600 disabled:opacity-30 hover:bg-gray-50"
                              aria-label={`Decrease quantity for ${item.sku}`}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={0}
                              value={qty}
                              onChange={(e) => setQty(item, parseInt(e.target.value, 10) || 0)}
                              className="w-14 text-center px-1 py-1 border border-gray-300 rounded text-sm"
                              aria-label={`Quantity for ${item.sku}`}
                            />
                            <button
                              type="button"
                              onClick={() => setQty(item, qty + 1)}
                              className="w-7 h-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                              aria-label={`Increase quantity for ${item.sku}`}
                            >
                              +
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Running selection — sits directly below the list so switching brands
          never looks like it discarded what was already chosen. */}
      {lineCount > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-primary">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">
              Your selection so far{' '}
              <span className="text-sm font-normal text-gray-500">
                ({lineCount} line{lineCount === 1 ? '' : 's'}, {unitCount} item
                {unitCount === 1 ? '' : 's'})
              </span>
            </h3>
            <button
              type="button"
              onClick={() => setShowOrder(true)}
              className="text-sm font-medium text-gray-700 underline"
            >
              View order
            </button>
          </div>
          <OrderLines />
          <div className="flex items-center justify-between border-t border-gray-200 pt-3 mt-3">
            <span className="font-semibold text-gray-900">Estimated total</span>
            <span className="text-lg font-bold">{formatZAR(catalogueTotal)}</span>
          </div>
          {customCount > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Excludes {customCount} item{customCount === 1 ? '' : 's'} we still need to price.
            </p>
          )}
        </div>
      )}

      {/* New SKUs */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">Add an item not listed</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              For SKUs we don’t carry yet. We’ll price these by hand and come back to you.
            </p>
          </div>
          <button
            type="button"
            onClick={addCustomLine}
            className="px-3 py-2 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800"
          >
            + Add row
          </button>
        </div>

        {customLines.length === 0 ? (
          <p className="text-sm text-gray-400">No extra items added.</p>
        ) : (
          <div className="space-y-2">
            {customLines.map((l) => (
              <div key={l.key} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <input
                  list="brand-options"
                  value={l.brand}
                  onChange={(e) => updateCustomLine(l.key, { brand: e.target.value })}
                  placeholder="Brand"
                  className="sm:col-span-3 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <input
                  value={l.sku}
                  onChange={(e) => updateCustomLine(l.key, { sku: e.target.value })}
                  placeholder="SKU"
                  className="sm:col-span-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                />
                <input
                  value={l.description}
                  onChange={(e) => updateCustomLine(l.key, { description: e.target.value })}
                  placeholder="Description"
                  className="sm:col-span-5 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <div className="sm:col-span-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={l.qty}
                    onChange={(e) =>
                      updateCustomLine(l.key, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-center"
                    aria-label="Quantity"
                  />
                  <button
                    type="button"
                    onClick={() => removeCustomLine(l.key)}
                    className="text-red-500 hover:text-red-700 px-1"
                    aria-label="Remove row"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <datalist id="brand-options">
          {brands.map((b) => (
            <option key={b.brand} value={b.brand} />
          ))}
        </datalist>
      </div>

      {/* Notes + submit */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes for us</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Anything we should know about this request…"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-4"
        />

        {message && (
          <div
            className={`mb-4 text-sm rounded-md px-3 py-2 ${
              message.kind === 'ok'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={submitting || lineCount === 0}
          className="w-full sm:w-auto px-6 py-3 rounded-md bg-primary text-black font-semibold disabled:opacity-40 hover:opacity-90"
        >
          {submitting ? 'Sending…' : `Send request${lineCount > 0 ? ` (${lineCount})` : ''}`}
        </button>
        {disclaimer && <p className="text-xs text-gray-500 mt-3">{disclaimer}</p>}
      </div>

      {/* History */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Previous requests</h3>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">You haven’t sent a supplier pre order yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {history.map((o) => (
              <div key={o.id} className="py-3">
                <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                  className="flex-1 min-w-0 flex items-center justify-between gap-4 text-left"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-gray-900">{o.ref}</span>
                    <span className="ml-2 text-sm text-gray-500">{o.supplierName}</span>
                    <span className="ml-2 text-xs text-gray-400">
                      {new Date(o.createdAt).toLocaleDateString('en-ZA')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 whitespace-nowrap">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        STATUS_STYLES[o.status] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {o.status.replace('-', ' ')}
                    </span>
                    <span className="font-semibold">{formatZAR(o.totalZAR)}</span>
                    <span className="text-gray-400 text-xs">{expanded === o.id ? '▲' : '▼'}</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => downloadPdf(o)}
                  disabled={pdfBusy === o.id}
                  title={`Download ${o.ref} as a PDF`}
                  aria-label={`Download ${o.ref} as a PDF`}
                  className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-60 whitespace-nowrap"
                >
                  {pdfBusy === o.id ? '…' : '⬇ PDF'}
                </button>
                </div>

                {expanded === o.id && (
                  <div className="mt-3 pl-1 space-y-1">
                    {o.lines.map((l) => (
                      <div
                        key={l.id}
                        className={`flex items-center justify-between text-sm gap-4 ${
                          l.status === 'rejected' ? 'text-gray-400 line-through' : 'text-gray-700'
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="font-mono text-xs text-gray-500">{l.sku}</span>
                          <span className="mx-2 text-gray-300">–</span>
                          {l.description || l.brand}
                          {l.isNewSku && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                              New SKU
                            </span>
                          )}
                        </span>
                        <span className="whitespace-nowrap">
                          <span className="text-gray-500 mr-3">× {l.qty}</span>
                          {l.estRetailZAR > 0 ? formatZAR(l.qty * l.estRetailZAR) : 'To be priced'}
                          {l.priceLocked && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-green-700">
                              confirmed
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                    {o.notes && (
                      <p className="text-xs text-gray-500 pt-2 italic">Your note: {o.notes}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating View Order bar */}
      {lineCount > 0 && !showOrder && (
        <div className="fixed bottom-4 inset-x-0 px-4 z-40 pointer-events-none">
          <div className="max-w-3xl mx-auto pointer-events-auto">
            <button
              type="button"
              onClick={() => setShowOrder(true)}
              className="w-full flex items-center justify-between gap-4 px-5 py-3 rounded-full bg-gray-900 text-white shadow-lg hover:bg-gray-800"
            >
              <span className="font-medium">
                View order · {lineCount} line{lineCount === 1 ? '' : 's'}
              </span>
              <span className="font-bold">{formatZAR(catalogueTotal)}</span>
            </button>
          </div>
        </div>
      )}

      {/* View Order modal */}
      {showOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowOrder(false)}
        >
          <div
            className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-lg shadow-xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">
                Your order{' '}
                <span className="text-sm font-normal text-gray-500">
                  {lineCount} line{lineCount === 1 ? '' : 's'}, {unitCount} item
                  {unitCount === 1 ? '' : 's'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowOrder(false)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none px-2"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-3 overflow-y-auto flex-1">
              {lineCount === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">Nothing selected yet.</p>
              ) : (
                <OrderLines />
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">Estimated total</span>
                <span className="text-lg font-bold">{formatZAR(catalogueTotal)}</span>
              </div>
              {customCount > 0 && (
                <p className="text-xs text-gray-500">
                  Excludes {customCount} item{customCount === 1 ? '' : 's'} we still need to price.
                </p>
              )}
              {disclaimer && <p className="text-xs text-gray-500">{disclaimer}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowOrder(false)}
                  className="flex-1 px-4 py-3 rounded-md border border-gray-300 text-gray-700 font-medium"
                >
                  Keep shopping
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting || lineCount === 0}
                  className="flex-1 px-4 py-3 rounded-md bg-primary text-black font-semibold disabled:opacity-40"
                >
                  {submitting ? 'Sending…' : 'Send request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SkuPreviewModal item={preview} onClose={() => setPreview(null)} />
    </div>
  )
}
