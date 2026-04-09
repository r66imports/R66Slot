'use client'

import { useState, useEffect, useRef } from 'react'
import { useColumnResize } from '@/hooks/use-column-resize'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string
  sku: string
  title: string
  brand: string
  price: number
  quantity: number
  status: 'draft' | 'active'
  imageUrl: string
}

interface SupplierContact {
  id: string
  name: string
  code: string
  preferredCurrency?: string
}

interface PricelistEntry {
  supplierId: string
  sku: string
  wholesalePrice: number
  shopQty: number
}

interface CompanyInfo {
  name?: string
  address?: string
  email?: string
  phone?: string
  vatNumber?: string
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  // Base product state
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [saveAllLoading, setSaveAllLoading] = useState(false)
  const [saveAllDone, setSaveAllDone] = useState(false)

  // Supplier + pricelist state
  const [suppliers, setSuppliers] = useState<SupplierContact[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [pricelist, setPricelist] = useState<PricelistEntry[]>([])
  const [localPrices, setLocalPrices] = useState<Record<string, string>>({})
  const [localShopQtys, setLocalShopQtys] = useState<Record<string, string>>({})

  // CSV import modal
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importingCSV, setImportingCSV] = useState(false)

  // Supplier order modal
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [sendingOrders, setSendingOrders] = useState(false)
  const [orderSentDone, setOrderSentDone] = useState(false)
  const [createdWsId, setCreatedWsId] = useState<string | null>(null)

  // Inventory Count — cross-reference only, never updates Shop Inventory
  const [lastStockTakeDate, setLastStockTakeDate] = useState<string | null>(null)
  const [savedCounts, setSavedCounts] = useState<Record<string, string>>({})
  const [autoSaving, setAutoSaving] = useState(false)

  // Refs so the debounce timer always reads the latest state without stale closures
  const countsRef = useRef<Record<string, string>>({})
  const savedCountsRef = useRef<Record<string, string>>({})
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => { countsRef.current = counts }, [counts])
  useEffect(() => { savedCountsRef.current = savedCounts }, [savedCounts])

  function scheduleAutoSave() {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(async () => {
      const cur = countsRef.current
      const sav = savedCountsRef.current
      const hasDirty = Object.entries(cur).some(([id, v]) => v !== sav[id])
      if (!hasDirty) return
      setAutoSaving(true)
      try {
        const now = new Date().toISOString()
        const allCounts: Record<string, number> = {}
        Object.entries(cur).forEach(([k, v]) => {
          const n = parseInt(v, 10)
          if (!isNaN(n)) allCounts[k] = n
        })
        await fetch('/api/admin/inventory-counts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ counts: allCounts, date: now }),
        })
        setSavedCounts(Object.fromEntries(Object.entries(allCounts).map(([k, v]) => [k, String(v)])))
        setLastStockTakeDate(now)
      } finally {
        setAutoSaving(false)
      }
    }, 1500)
  }


  // SKU stats popup
  const [skuPopup, setSkuPopup] = useState<{ product: Product } | null>(null)
  const [skuStats, setSkuStats] = useState<any>(null)
  const [skuStatsLoading, setSkuStatsLoading] = useState(false)

  async function openSkuPopup(product: Product) {
    setSkuPopup({ product })
    setSkuStats(null)
    setSkuStatsLoading(true)
    try {
      const res = await fetch(`/api/admin/products/sku-stats?sku=${encodeURIComponent(product.sku)}`)
      if (res.ok) setSkuStats(await res.json())
    } finally {
      setSkuStatsLoading(false)
    }
  }

  // Shop Volume lock/unlock
  const [shopVolumeUnlocked, setShopVolumeUnlocked] = useState(false)

  // Shop Inventory lock/unlock + local edits
  const [shopInventoryUnlocked, setShopInventoryUnlocked] = useState(false)
  const [localQuantities, setLocalQuantities] = useState<Record<string, string>>({})

  // Column resize (base mode only)
  const { widths: colW, setWidth } = useColumnResize('inventory', {
    idx: 40, sku: 90, product: 220, retail: 90, brand: 120, dbQty: 80, count: 90, save: 70,
  })
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // ─── Load products + inventory counts (parallel, set state once) ───────────

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/products').then((r) => r.json()),
      fetch('/api/admin/inventory-counts').then((r) => r.ok ? r.json() : { counts: {}, date: '' }).catch(() => ({ counts: {}, date: '' })),
    ]).then(([productsData, countsData]) => {
      const list: Product[] = (productsData.products || productsData || []).map((p: any) => ({
        id: p.id,
        sku: p.sku || '',
        title: p.title || '',
        brand: p.brand || '',
        price: Number(p.price) || 0,
        quantity: p.quantity ?? 0,
        status: p.status || 'draft',
        imageUrl: p.imageUrl || p.image_url || '',
      }))
      list.sort((a, b) => {
        const na = parseFloat(a.sku) || 0
        const nb = parseFloat(b.sku) || 0
        if (na !== nb) return na - nb
        return a.sku.localeCompare(b.sku)
      })
      setProducts(list)

      // Initialise counts: use saved API value if available, otherwise product.quantity
      const apiCounts: Record<string, number> = (countsData.counts && typeof countsData.counts === 'object') ? countsData.counts : {}
      const countsMap: Record<string, string> = {}
      list.forEach((p) => {
        countsMap[p.id] = apiCounts[p.id] !== undefined ? String(apiCounts[p.id]) : String(p.quantity)
      })
      setCounts(countsMap)
      setSavedCounts(countsMap)

      if (countsData.date) setLastStockTakeDate(countsData.date)
    }).finally(() => setLoading(false))
  }, [])

  // ─── Load suppliers ─────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/admin/supplier-contacts')
      .then((r) => r.json())
      .then((data) => setSuppliers(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  // ─── Load pricelist when supplier changes ──────────────────────────────────

  useEffect(() => {
    if (!selectedSupplierId) {
      setPricelist([])
      setLocalPrices({})
      setLocalShopQtys({})
      return
    }
    fetch(`/api/admin/inventory-pricelists?supplierId=${selectedSupplierId}`)
      .then((r) => r.json())
      .then((data: PricelistEntry[]) => {
        const entries = Array.isArray(data) ? data : []
        setPricelist(entries)
        const prices: Record<string, string> = {}
        const qtys: Record<string, string> = {}
        entries.forEach((e) => {
          prices[e.sku] = String(e.wholesalePrice)
          qtys[e.sku] = String(e.shopQty)
        })
        setLocalPrices(prices)
        setLocalShopQtys(qtys)
      })
      .catch(() => {})
  }, [selectedSupplierId])

  // ─── Derived data ──────────────────────────────────────────────────────────

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId) || null
  const currency = selectedSupplier?.preferredCurrency || 'EUR'

  const filtered = products.filter((p) => {
    // When a supplier is selected, only show products whose brand matches that supplier
    if (selectedSupplier) {
      const pb = p.brand.toLowerCase()
      const sn = selectedSupplier.name.toLowerCase()
      const sc = selectedSupplier.code.toLowerCase()
      const matches = pb === sn || pb === sc || sn.includes(pb) || pb.includes(sn) || (sc.length > 2 && pb.includes(sc))
      if (!matches) return false
    }
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      p.sku.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q)
    )
  })

  const changedCount = filtered.filter((p) => counts[p.id] !== savedCounts[p.id]).length

  function getRestockQty(product: Product): number {
    const shopQtyNum = parseInt(localShopQtys[product.sku] ?? '0', 10) || 0
    const currentQty = localQuantities[product.id] !== undefined
      ? (parseInt(localQuantities[product.id], 10) || 0)
      : product.quantity
    return Math.max(0, shopQtyNum - currentQty)
  }

  const restockItems = selectedSupplierId
    ? filtered.filter((p) => getRestockQty(p) > 0)
    : []

  // ─── Save stock quantity ────────────────────────────────────────────────────

  async function saveOne(id: string, skipPricelist = false) {
    const val = parseInt(counts[id] ?? '0', 10)
    if (isNaN(val)) return
    setSaving((s) => ({ ...s, [id]: true }))
    try {
      // Save inventory count to cross-reference store (never updates Shop Inventory)
      const now = new Date().toISOString()
      const allCounts: Record<string, number> = {}
      Object.entries(counts).forEach(([k, v]) => {
        const n = parseInt(v, 10)
        if (!isNaN(n)) allCounts[k] = n
      })
      await fetch('/api/admin/inventory-counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counts: allCounts, date: now }),
      })
      setSavedCounts((prev) => ({ ...prev, [id]: String(val) }))
      setLastStockTakeDate(now)

      // Also save pricelist entry if supplier selected
      if (!skipPricelist && selectedSupplierId) {
        const product = products.find((p) => p.id === id)
        if (product && product.sku) {
          const priceVal = parseFloat(localPrices[product.sku] ?? '0') || 0
          const shopQtyVal = parseInt(localShopQtys[product.sku] ?? '0', 10) || 0
          await fetch('/api/admin/inventory-pricelists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entries: [{
                supplierId: selectedSupplierId,
                sku: product.sku,
                wholesalePrice: priceVal,
                shopQty: shopQtyVal,
              }],
            }),
          })
        }
      }

      setSaved((s) => ({ ...s, [id]: true }))
      setTimeout(() => setSaved((s) => ({ ...s, [id]: false })), 2000)
    } finally {
      setSaving((s) => ({ ...s, [id]: false }))
    }
  }

  async function saveAll() {
    const hasChangedCounts = filtered.some((p) => counts[p.id] !== savedCounts[p.id])

    // Collect all dirty pricelist entries if supplier is selected
    const dirtyPricelist: PricelistEntry[] = []
    if (selectedSupplierId) {
      filtered.forEach((p) => {
        if (!p.sku) return
        const existing = pricelist.find((e) => e.sku === p.sku)
        const currentPrice = parseFloat(localPrices[p.sku] ?? '0') || 0
        const currentShopQty = parseInt(localShopQtys[p.sku] ?? '0', 10) || 0
        const existingPrice = existing?.wholesalePrice ?? 0
        const existingShopQty = existing?.shopQty ?? 0
        if (currentPrice !== existingPrice || currentShopQty !== existingShopQty) {
          dirtyPricelist.push({
            supplierId: selectedSupplierId,
            sku: p.sku,
            wholesalePrice: currentPrice,
            shopQty: currentShopQty,
          })
        }
      })
    }

    const hasDirtyQtys = filtered.some((p) => localQuantities[p.id] !== undefined && parseInt(localQuantities[p.id], 10) !== p.quantity)
    if (!hasChangedCounts && !dirtyPricelist.length && !hasDirtyQtys) return

    setSaveAllLoading(true)
    try {
      if (hasChangedCounts) {
        // Save all inventory counts as cross-reference (never updates Shop Inventory)
        const now = new Date().toISOString()
        const allCounts: Record<string, number> = {}
        Object.entries(counts).forEach(([k, v]) => {
          const n = parseInt(v, 10)
          if (!isNaN(n)) allCounts[k] = n
        })
        await fetch('/api/admin/inventory-counts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ counts: allCounts, date: now }),
        })
        setSavedCounts(Object.fromEntries(Object.entries(allCounts).map(([k, v]) => [k, String(v)])))
        setLastStockTakeDate(now)
      }
      if (dirtyPricelist.length > 0) {
        await fetch('/api/admin/inventory-pricelists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: dirtyPricelist }),
        })
        // Refresh pricelist
        const res = await fetch(`/api/admin/inventory-pricelists?supplierId=${selectedSupplierId}`)
        const updated: PricelistEntry[] = await res.json()
        setPricelist(Array.isArray(updated) ? updated : [])
      }
      // Save any manually-edited Shop Inventory quantities
      const dirtyQtys = filtered.filter((p) => {
        const local = localQuantities[p.id]
        return local !== undefined && parseInt(local, 10) !== p.quantity
      })
      for (const p of dirtyQtys) {
        const newQty = parseInt(localQuantities[p.id], 10)
        if (!isNaN(newQty)) {
          await fetch(`/api/admin/products/${p.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: newQty }),
          })
          setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, quantity: newQty } : x))
        }
      }
      if (dirtyQtys.length > 0) setLocalQuantities({})

      setSaveAllDone(true)
      setTimeout(() => setSaveAllDone(false), 2500)
    } finally {
      setSaveAllLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent, id: string, idx: number) {
    if (e.key === 'Enter') {
      saveOne(id)
      const nextId = filtered[idx + 1]?.id
      if (nextId && inputRefs.current[nextId]) {
        inputRefs.current[nextId]!.focus()
        inputRefs.current[nextId]!.select()
      }
    }
  }

  // ─── CSV Import ─────────────────────────────────────────────────────────────

  function parseCSV(text: string): PricelistEntry[] {
    const lines = text.trim().split('\n').filter((l) => l.trim())
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''))

    function findCol(candidates: string[]): number {
      for (const c of candidates) {
        const idx = headers.findIndex((h) => h.includes(c))
        if (idx >= 0) return idx
      }
      return -1
    }

    const skuCol = findCol(['sku', 'code', 'item'])
    const priceCol = findCol(['wholesale price', 'price', 'cost', 'wholesale'])
    const shopQtyCol = findCol(['shop qty', 'shop', 'qty', 'quantity'])

    if (skuCol < 0) return []

    const entries: PricelistEntry[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/['"]/g, ''))
      const sku = cols[skuCol]?.trim()
      if (!sku) continue
      const wholesalePrice = priceCol >= 0 ? parseFloat(cols[priceCol]) || 0 : 0
      const shopQty = shopQtyCol >= 0 ? parseInt(cols[shopQtyCol], 10) || 0 : 0
      entries.push({ supplierId: selectedSupplierId, sku, wholesalePrice, shopQty })
    }
    return entries
  }

  async function handleImportCSV() {
    if (!importText.trim() || !selectedSupplierId) return
    setImportingCSV(true)
    try {
      const entries = parseCSV(importText)
      if (entries.length === 0) {
        alert('No valid rows found. Make sure the CSV has a "sku" (or "code") column.')
        return
      }
      const res = await fetch('/api/admin/inventory-pricelists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      })
      const updated: PricelistEntry[] = await res.json()
      const arr = Array.isArray(updated) ? updated : []
      setPricelist(arr)
      const prices: Record<string, string> = {}
      const qtys: Record<string, string> = {}
      arr.forEach((e) => {
        prices[e.sku] = String(e.wholesalePrice)
        qtys[e.sku] = String(e.shopQty)
      })
      setLocalPrices(prices)
      setLocalShopQtys(qtys)
      setShowImport(false)
      setImportText('')
    } finally {
      setImportingCSV(false)
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setImportText(ev.target?.result as string || '')
    reader.readAsText(file)
  }

  // ─── Generate PDF ───────────────────────────────────────────────────────────

  async function generateOrderPDF(): Promise<jsPDF> {
    let companyInfo: CompanyInfo = {}
    try {
      const res = await fetch('/api/admin/company-info')
      companyInfo = await res.json()
    } catch {}

    const doc = new jsPDF() as any
    const supplierName = selectedSupplier?.name || 'Supplier'
    const dateStr = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })

    // Header
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(companyInfo.name || 'Route 66 Slot Cars', 14, 20)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    if (companyInfo.address) doc.text(companyInfo.address, 14, 27)
    if (companyInfo.email) doc.text(companyInfo.email, 14, 32)
    if (companyInfo.phone) doc.text(companyInfo.phone, 14, 37)
    doc.setTextColor(0)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Purchase Order`, 14, 50)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text(`Date: ${dateStr}`, 14, 57)
    doc.text(`Order to: ${supplierName}`, 14, 62)
    doc.setTextColor(0)

    // Table rows
    const rows = restockItems.map((p) => {
      const restock = getRestockQty(p)
      const price = parseFloat(localPrices[p.sku] ?? '0') || 0
      const total = restock * price
      return [
        p.sku || '—',
        p.title,
        String(restock),
        `${currency} ${price.toFixed(2)}`,
        `${currency} ${total.toFixed(2)}`,
      ]
    })

    const grandTotal = restockItems.reduce((sum, p) => {
      const restock = getRestockQty(p)
      const price = parseFloat(localPrices[p.sku] ?? '0') || 0
      return sum + restock * price
    }, 0)

    doc.autoTable({
      startY: 70,
      head: [['SKU', 'Description', 'Qty', `Unit Price (${currency})`, `Total (${currency})`]],
      body: rows,
      foot: [['', '', '', 'Grand Total', `${currency} ${grandTotal.toFixed(2)}`]],
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 80 },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 32, halign: 'right' },
        4: { cellWidth: 32, halign: 'right' },
      },
    })

    return doc
  }

  async function handleDownloadPDF() {
    const doc = await generateOrderPDF()
    const supplierName = selectedSupplier?.name || 'Supplier'
    doc.save(`Purchase-Order-${supplierName}-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  // ─── Send to Supplier Orders ────────────────────────────────────────────────

  async function handleSendToOrders() {
    if (!restockItems.length) return
    setSendingOrders(true)
    try {
      const supplierName = selectedSupplier?.name || ''
      const wsId = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      const wsItems = restockItems.map((p) => ({
        id: `ws_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        sku: p.sku,
        skuSearch: p.sku,
        description: p.title,
        unit: '',
        category: '',
        inStock: p.quantity,
        retailPrice: p.price ?? 0,
        preOrderPrice: 0,
        qty: getRestockQty(p),
        wholesalePrice: parseFloat(localPrices[p.sku] ?? '0') || 0,
        retailOverride: '',
        sentToInventory: false,
      }))
      const sheet = {
        id: wsId,
        name: `Restock — ${supplierName} — ${new Date().toISOString().slice(0, 10)}`,
        supplier: selectedSupplierId || '',
        date: new Date().toISOString().slice(0, 10),
        archived: false,
        currency,
        exchangeRate: 1,
        markupPct: 0,
        shippingPct: 0,
        vatPct: 15,
        finalCurrency: 'ZAR',
        finalExRate: 1,
        finalShippingCost: 0,
        finalCustomsCost: 0,
        finalMarkupPct: 0,
        finalVatPct: 15,
        items: wsItems,
      }
      const res = await fetch('/api/admin/worksheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sheet),
      })
      if (!res.ok) throw new Error('Failed to create worksheet')
      setCreatedWsId(wsId)
      setOrderSentDone(true)
    } finally {
      setSendingOrders(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const hasSupplier = !!selectedSupplierId

  // Compute Save All button dirty state
  const hasDirtyPricelist = hasSupplier && filtered.some((p) => {
    if (!p.sku) return false
    const existing = pricelist.find((e) => e.sku === p.sku)
    const currentPrice = parseFloat(localPrices[p.sku] ?? '0') || 0
    const currentShopQty = parseInt(localShopQtys[p.sku] ?? '0', 10) || 0
    return currentPrice !== (existing?.wholesalePrice ?? 0) || currentShopQty !== (existing?.shopQty ?? 0)
  })
  const hasDirtyLocalQtys = filtered.some((p) => localQuantities[p.id] !== undefined && parseInt(localQuantities[p.id], 10) !== p.quantity)
  const saveAllDirty = changedCount > 0 || hasDirtyPricelist || hasDirtyLocalQtys

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">
            {hasSupplier
              ? 'Update stock counts, wholesale prices and shop quantities'
              : 'Update stock quantities — press Enter to save each row'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Supplier dropdown */}
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            <option value="">— Select Supplier —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Create Order */}
          {hasSupplier && restockItems.length > 0 && (
            <button
              onClick={() => setShowOrderModal(true)}
              className="px-3 py-2 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-1"
            >
              Create Order ({restockItems.length})
            </button>
          )}

          {/* Save All */}
          <button
            onClick={saveAll}
            disabled={saveAllLoading || !saveAllDirty}
            className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saveAllLoading ? (
              <><span className="animate-spin inline-block">⏳</span> Saving…</>
            ) : saveAllDone ? (
              '✅ Saved!'
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search SKU, product name or brand…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 mb-4 text-sm text-gray-500">
        <span>{filtered.length} products</span>
        {autoSaving && <span className="text-indigo-500 font-medium animate-pulse">Saving…</span>}
        {!autoSaving && changedCount > 0 && <span className="text-orange-600 font-medium">{changedCount} unsaved changes</span>}
        {hasSupplier && restockItems.length > 0 && (
          <span className="text-red-600 font-medium">{restockItems.length} items need restocking</span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading inventory…</div>
      ) : hasSupplier ? (
        /* ── Supplier mode table ── */
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase w-8">#</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase w-20">SKU</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase w-24">Retail</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase w-24">Brand</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase w-24">
                  <div className="flex items-center justify-center gap-1.5">
                    Shop Volume
                    <button
                      onClick={() => setShopVolumeUnlocked(u => !u)}
                      title={shopVolumeUnlocked ? 'Lock editing' : 'Unlock editing'}
                      className={`p-0.5 rounded transition-colors ${shopVolumeUnlocked ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {shopVolumeUnlocked ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zM16 7V5a4 4 0 00-8 0v2" /></svg>
                      )}
                    </button>
                  </div>
                </th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase w-24">
                  <div className="flex items-center justify-center gap-1.5">
                    Shop Inventory
                    <button
                      onClick={() => setShopInventoryUnlocked(u => !u)}
                      title={shopInventoryUnlocked ? 'Lock editing' : 'Unlock editing'}
                      className={`p-0.5 rounded transition-colors ${shopInventoryUnlocked ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {shopInventoryUnlocked ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zM16 7V5a4 4 0 00-8 0v2" /></svg>
                      )}
                    </button>
                  </div>
                </th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase w-32">
                  Wholesale ({currency})
                </th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase w-24">
                  <div>
                    Inventory Count
                    {lastStockTakeDate && (
                      <div className="text-[10px] text-gray-400 font-normal normal-case mt-0.5">
                        Last: {new Date(lastStockTakeDate).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                </th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase w-20">Restock</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product, idx) => {
                const countVal = counts[product.id] ?? String(product.quantity)
                const isDirty = countVal !== savedCounts[product.id]
                const priceVal = localPrices[product.sku] ?? '0'
                const shopQtyVal = localShopQtys[product.sku] ?? '0'
                const restockQty = getRestockQty(product)
                const displayQty = localQuantities[product.id] ?? String(product.quantity)
                const invCount = counts[product.id] ?? String(product.quantity)
                const qtyMismatch = invCount !== '' && displayQty !== '' && invCount !== displayQty
                return (
                  <tr key={product.id} className={`border-b last:border-0 ${qtyMismatch ? 'bg-red-50' : isDirty ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-3 py-2 text-xs text-gray-400">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => openSkuPopup(product)}
                        className="font-mono text-xs text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                        title="View sales & purchase stats"
                      >{product.sku || '—'}</button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {product.imageUrl && (
                          <img src={product.imageUrl} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                        )}
                        <span className="font-medium text-gray-800 break-words">{product.title}</span>
                        {product.status === 'draft' && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">draft</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {product.price > 0
                        ? <span className="text-xs font-medium text-gray-700">R {product.price.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{product.brand || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      {shopVolumeUnlocked ? (
                        <input
                          type="number"
                          min="0"
                          value={shopQtyVal}
                          onChange={(e) => setLocalShopQtys((q) => ({ ...q, [product.sku]: e.target.value }))}
                          className="w-16 text-center text-sm px-2 py-1 border border-gray-200 rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-gray-700">{shopQtyVal}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {shopInventoryUnlocked ? (
                        <input
                          type="number"
                          min="0"
                          value={displayQty}
                          onChange={(e) => setLocalQuantities((q) => ({ ...q, [product.id]: e.target.value }))}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-16 text-center text-sm px-2 py-1 border border-blue-300 rounded bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white"
                        />
                      ) : (
                        <span className={`text-sm font-semibold ${qtyMismatch ? 'text-red-600' : 'text-gray-700'}`}>{product.quantity}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <span className="text-xs text-gray-400">{currency}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={priceVal}
                          onChange={(e) => setLocalPrices((p) => ({ ...p, [product.sku]: e.target.value }))}
                          className="w-20 text-center text-sm px-2 py-1 border border-gray-200 rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        ref={(el) => { inputRefs.current[product.id] = el }}
                        type="number"
                        min="0"
                        value={countVal}
                        onChange={(e) => { setCounts((c) => ({ ...c, [product.id]: e.target.value })); scheduleAutoSave() }}
                        onKeyDown={(e) => handleKey(e, product.id, idx)}
                        onWheel={(e) => e.currentTarget.blur()}
                        className={`w-16 text-center text-sm font-semibold px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                          isDirty ? 'border-orange-400 bg-white' : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        restockQty > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {restockQty}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">No products found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Base mode table (no supplier) ── */
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col style={{ width: colW.idx }} />
              <col style={{ width: colW.sku }} />
              <col style={{ width: colW.product }} />
              <col style={{ width: colW.retail }} />
              <col style={{ width: colW.brand }} />
              <col style={{ width: colW.dbQty }} />
              <col style={{ width: colW.count }} />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase" style={{ position: 'relative' }}>
                  #
                  <div onMouseDown={(e) => { e.preventDefault(); const startX = e.clientX; const startW = (e.currentTarget as HTMLElement).closest('th')?.offsetWidth ?? colW.idx; const onMove = (ev: MouseEvent) => setWidth('idx', Math.max(40, startW + ev.clientX - startX)); const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp) }} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/50 select-none z-10" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase" style={{ position: 'relative' }}>
                  SKU
                  <div onMouseDown={(e) => { e.preventDefault(); const startX = e.clientX; const startW = (e.currentTarget as HTMLElement).closest('th')?.offsetWidth ?? colW.sku; const onMove = (ev: MouseEvent) => setWidth('sku', Math.max(40, startW + ev.clientX - startX)); const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp) }} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/50 select-none z-10" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase" style={{ position: 'relative' }}>
                  Product
                  <div onMouseDown={(e) => { e.preventDefault(); const startX = e.clientX; const startW = (e.currentTarget as HTMLElement).closest('th')?.offsetWidth ?? colW.product; const onMove = (ev: MouseEvent) => setWidth('product', Math.max(40, startW + ev.clientX - startX)); const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp) }} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/50 select-none z-10" />
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase" style={{ position: 'relative' }}>
                  Retail
                  <div onMouseDown={(e) => { e.preventDefault(); const startX = e.clientX; const startW = (e.currentTarget as HTMLElement).closest('th')?.offsetWidth ?? colW.retail; const onMove = (ev: MouseEvent) => setWidth('retail', Math.max(40, startW + ev.clientX - startX)); const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp) }} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/50 select-none z-10" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase" style={{ position: 'relative' }}>
                  Brand
                  <div onMouseDown={(e) => { e.preventDefault(); const startX = e.clientX; const startW = (e.currentTarget as HTMLElement).closest('th')?.offsetWidth ?? colW.brand; const onMove = (ev: MouseEvent) => setWidth('brand', Math.max(40, startW + ev.clientX - startX)); const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp) }} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/50 select-none z-10" />
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase" style={{ position: 'relative' }}>
                  <div className="flex items-center justify-center gap-1.5">
                    Shop Inventory
                    <button
                      onClick={() => setShopInventoryUnlocked(u => !u)}
                      title={shopInventoryUnlocked ? 'Lock editing' : 'Unlock editing'}
                      className={`p-0.5 rounded transition-colors ${shopInventoryUnlocked ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {shopInventoryUnlocked ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zM16 7V5a4 4 0 00-8 0v2" /></svg>
                      )}
                    </button>
                  </div>
                  <div onMouseDown={(e) => { e.preventDefault(); const startX = e.clientX; const startW = (e.currentTarget as HTMLElement).closest('th')?.offsetWidth ?? colW.dbQty; const onMove = (ev: MouseEvent) => setWidth('dbQty', Math.max(40, startW + ev.clientX - startX)); const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp) }} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/50 select-none z-10" />
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase" style={{ position: 'relative' }}>
                  <div>
                    Inventory Count
                    {lastStockTakeDate && (
                      <div className="text-[10px] text-gray-400 font-normal normal-case mt-0.5">
                        Last: {new Date(lastStockTakeDate).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                  <div onMouseDown={(e) => { e.preventDefault(); const startX = e.clientX; const startW = (e.currentTarget as HTMLElement).closest('th')?.offsetWidth ?? colW.count; const onMove = (ev: MouseEvent) => setWidth('count', Math.max(40, startW + ev.clientX - startX)); const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp) }} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/50 select-none z-10" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product, idx) => {
                const countVal = counts[product.id] ?? String(product.quantity)
                const isDirty = countVal !== savedCounts[product.id]
                const displayQtyBase = localQuantities[product.id] ?? String(product.quantity)
                const qtyMismatchBase = countVal !== '' && displayQtyBase !== '' && countVal !== displayQtyBase
                return (
                  <tr key={product.id} className={`border-b last:border-0 ${qtyMismatchBase ? 'bg-red-50' : isDirty ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-2 text-xs text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => openSkuPopup(product)}
                        className="font-mono text-xs text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                        title="View sales & purchase stats"
                      >{product.sku || '—'}</button>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        {product.imageUrl && (
                          <img src={product.imageUrl} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                        )}
                        <span className="font-medium text-gray-800 break-words">{product.title}</span>
                        {product.status === 'draft' && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">draft</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {product.price > 0
                        ? <span className="text-xs font-medium text-gray-700">R {product.price.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{product.brand || '—'}</td>
                    <td className="px-4 py-2 text-center">
                      {shopInventoryUnlocked ? (
                        <input
                          type="number"
                          min="0"
                          value={displayQtyBase}
                          onChange={(e) => setLocalQuantities((q) => ({ ...q, [product.id]: e.target.value }))}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-16 text-center text-sm px-2 py-1 border border-blue-300 rounded bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white"
                        />
                      ) : (
                        <span className={`text-sm font-semibold ${qtyMismatchBase ? 'text-red-600' : 'text-gray-700'}`}>{product.quantity}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        ref={(el) => { inputRefs.current[product.id] = el }}
                        type="number"
                        min="0"
                        value={countVal}
                        onChange={(e) => { setCounts((c) => ({ ...c, [product.id]: e.target.value })); scheduleAutoSave() }}
                        onKeyDown={(e) => handleKey(e, product.id, idx)}
                        onWheel={(e) => e.currentTarget.blur()}
                        className={`w-20 text-center text-sm font-semibold px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                          isDirty ? 'border-orange-400 bg-white' : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">No products found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── SKU Stats Popup ── */}
      {skuPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSkuPopup(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <div>
                <div className="flex items-center gap-3">
                  {skuPopup.product.imageUrl && (
                    <img src={skuPopup.product.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                  )}
                  <div>
                    <h2 className="text-base font-bold text-gray-900 font-mono">{skuPopup.product.sku}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{skuPopup.product.title}</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setSkuPopup(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
              {skuStatsLoading ? (
                <div className="text-center py-12 text-gray-400">Loading stats…</div>
              ) : !skuStats ? (
                <div className="text-center py-12 text-gray-400">No data</div>
              ) : (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-indigo-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1">Sales</p>
                      <div className="flex items-end gap-3">
                        <div>
                          <p className="text-2xl font-bold text-indigo-700">{skuStats.sales.totalQtySold}</p>
                          <p className="text-xs text-indigo-500">units sold</p>
                        </div>
                        <div className="border-l border-indigo-200 pl-3">
                          <p className="text-lg font-bold text-indigo-700">R{Number(skuStats.sales.totalRevenue).toFixed(2)}</p>
                          <p className="text-xs text-indigo-500">total revenue</p>
                        </div>
                      </div>
                      <p className="text-xs text-indigo-400 mt-2">
                        {skuStats.sales.invoiceCount} invoice{skuStats.sales.invoiceCount !== 1 ? 's' : ''}
                        {skuStats.sales.lastSold && ` · Last: ${new Date(skuStats.sales.lastSold).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                      </p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-1">Purchases</p>
                      <div>
                        <p className="text-2xl font-bold text-orange-700">{skuStats.purchases.totalQtyOrdered}</p>
                        <p className="text-xs text-orange-500">units ordered</p>
                      </div>
                      <p className="text-xs text-orange-400 mt-2">
                        {skuStats.purchases.orderCount} backorder{skuStats.purchases.orderCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Sales breakdown */}
                  {skuStats.sales.rows.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sales History</p>
                      <div className="border border-gray-100 rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="text-left px-3 py-2 text-gray-500 font-semibold">Invoice</th>
                              <th className="text-left px-3 py-2 text-gray-500 font-semibold">Date</th>
                              <th className="text-left px-3 py-2 text-gray-500 font-semibold">Client</th>
                              <th className="text-center px-3 py-2 text-gray-500 font-semibold">Qty</th>
                              <th className="text-right px-3 py-2 text-gray-500 font-semibold">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {skuStats.sales.rows.map((row: any, i: number) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium text-indigo-700">{row.docNumber}</td>
                                <td className="px-3 py-2 text-gray-500">{new Date(row.date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                <td className="px-3 py-2 text-gray-600">{row.clientName || '—'}</td>
                                <td className="px-3 py-2 text-center font-semibold text-gray-700">×{row.qty}</td>
                                <td className="px-3 py-2 text-right font-semibold text-gray-800">R{Number(row.lineTotal).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Purchases breakdown */}
                  {skuStats.purchases.rows.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Purchase History (Backorders)</p>
                      <div className="border border-gray-100 rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="text-left px-3 py-2 text-gray-500 font-semibold">Order #</th>
                              <th className="text-left px-3 py-2 text-gray-500 font-semibold">Date</th>
                              <th className="text-left px-3 py-2 text-gray-500 font-semibold">Client</th>
                              <th className="text-center px-3 py-2 text-gray-500 font-semibold">Qty</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {skuStats.purchases.rows.map((row: any, i: number) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium text-orange-700">{row.orderNumber}</td>
                                <td className="px-3 py-2 text-gray-500">{row.date ? new Date(row.date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                                <td className="px-3 py-2 text-gray-600">{row.clientName || '—'}</td>
                                <td className="px-3 py-2 text-center font-semibold text-gray-700">×{row.qty}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {skuStats.sales.rows.length === 0 && skuStats.purchases.rows.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">No sales or purchase history found for this SKU.</div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CSV Import Modal ── */}
      {showImport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-base font-semibold text-gray-900">
                Import Pricelist CSV — {selectedSupplier?.name}
              </h2>
              <button onClick={() => { setShowImport(false); setImportText('') }} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-xs text-gray-500">
                CSV must have a <strong>sku</strong> (or <strong>code</strong>) column. Optional: <strong>wholesale price</strong> (or <strong>price</strong>/<strong>cost</strong>), <strong>shop qty</strong> (or <strong>qty</strong>/<strong>quantity</strong>).
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Upload CSV file</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-700 file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Or paste CSV text</label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={8}
                  placeholder={'sku,wholesale price,shop qty\nNSR-001,18.50,5\nNSR-002,24.00,3'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => { setShowImport(false); setImportText('') }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImportCSV}
                disabled={importingCSV || !importText.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {importingCSV ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Supplier Order Modal ── */}
      {showOrderModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Purchase Order — {selectedSupplier.name}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{restockItems.length} items to restock</p>
              </div>
              <button onClick={() => { setShowOrderModal(false); setOrderSentDone(false); setCreatedWsId(null) }} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">SKU</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Description</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Restock Qty</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Unit Price ({currency})</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Total ({currency})</th>
                  </tr>
                </thead>
                <tbody>
                  {restockItems.map((p) => {
                    const restock = getRestockQty(p)
                    const price = parseFloat(localPrices[p.sku] ?? '0') || 0
                    const total = restock * price
                    return (
                      <tr key={p.id} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-xs text-gray-600">{p.sku || '—'}</td>
                        <td className="px-3 py-2 text-gray-800">{p.title}</td>
                        <td className="px-3 py-2 text-center font-semibold text-orange-700">{restock}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{price.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-800">{total.toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-300">
                    <td colSpan={4} className="px-3 py-2 text-right font-bold text-gray-800">Grand Total</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900">
                      {currency} {restockItems.reduce((sum, p) => {
                        const restock = getRestockQty(p)
                        const price = parseFloat(localPrices[p.sku] ?? '0') || 0
                        return sum + restock * price
                      }, 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl flex-shrink-0">
              <button
                onClick={() => { setShowOrderModal(false); setOrderSentDone(false); setCreatedWsId(null) }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
              >
                Download PDF
              </button>
              {orderSentDone && createdWsId ? (
                <a
                  href="/admin/worksheet"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-1"
                >
                  Open Worksheet →
                </a>
              ) : (
                <button
                  onClick={handleSendToOrders}
                  disabled={sendingOrders || orderSentDone}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {sendingOrders ? 'Sending…' : 'Send to Worksheet'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
