'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────
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
  carClass?: string
  carType?: string
  scale?: string
  revoParts?: string[]
  collections: string[]
  categories?: string[]
  quantity: number
  eta: string
  status: 'draft' | 'active'
  imageUrl: string
  pageId?: string
  pageUrl?: string
  createdAt: string
  updatedAt: string
}

interface Category {
  id: string
  name: string
  slug: string
  class?: string
}

interface PageItem {
  id: string
  title: string
}

const BOOK_NOW_URL = 'https://r66slot.co.za/book'

// ─── Pre-Order PDF builder ────────────────────────────────────────────────────
function buildPreOrderPDF(product: Product): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>R66SLOT Pre-Order – ${product.title}</title>
<style>
  @page { size: A5; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; width: 148mm; background: #fff; }
  .badge { background: #f97316; color: #fff; text-align: center; padding: 10px 16px; font-size: 17px; font-weight: 900; letter-spacing: 3px; }
  .brand-bar { background: #111; color: #fff; padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; }
  .brand-name { font-size: 22px; font-weight: 900; }
  .brand-slot { color: #ef4444; }
  .img-wrap { background: #f3f4f6; display: flex; align-items: center; justify-content: center; height: 160px; overflow: hidden; }
  .img-wrap img { max-width: 100%; max-height: 160px; object-fit: contain; }
  .img-placeholder { color: #9ca3af; font-size: 13px; padding: 20px; text-align: center; }
  .info { padding: 14px 16px; }
  .sku { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
  .title { font-size: 19px; font-weight: 800; color: #111; margin-bottom: 6px; line-height: 1.25; }
  .chips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
  .chip { background: #f3f4f6; color: #374151; font-size: 10px; padding: 2px 8px; border-radius: 99px; }
  .chip-class { background: #fee2e2; color: #dc2626; font-weight: 700; }
  .desc { font-size: 12px; color: #4b5563; margin-bottom: 10px; line-height: 1.5; }
  .row { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e5e7eb; padding-top: 10px; margin-top: 6px; }
  .eta-block p:first-child { font-size: 10px; color: #6b7280; }
  .eta-block p:last-child { font-size: 13px; font-weight: 600; }
  .price-block { text-align: right; }
  .price-block p:first-child { font-size: 10px; color: #6b7280; }
  .price { font-size: 30px; font-weight: 900; color: #ef4444; }
  .cta { margin: 12px 16px 16px; }
  .cta a { display: block; background: #111; color: #fff; text-align: center; padding: 13px; font-size: 15px; font-weight: 900; letter-spacing: 2px; text-decoration: none; border-radius: 6px; }
  .cta a span { color: #ef4444; }
  .footer { text-align: center; padding: 8px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
</style>
</head>
<body>
  <div class="badge">🎯 PRE-ORDER</div>
  <div class="brand-bar">
    <span class="brand-name">R66<span class="brand-slot">SLOT</span></span>
    ${product.brand ? `<span style="font-size:13px;color:#9ca3af;">${product.brand}</span>` : ''}
  </div>
  <div class="img-wrap">
    ${product.imageUrl
      ? `<img src="${product.imageUrl}" alt="${product.title}" />`
      : `<p class="img-placeholder">Product Image</p>`}
  </div>
  <div class="info">
    <p class="sku">SKU: ${product.sku || '---'}</p>
    <h1 class="title">${product.title}</h1>
    ${(product.carClass || product.scale || product.productType)
      ? `<div class="chips">
          ${product.carClass ? `<span class="chip chip-class">${product.carClass}</span>` : ''}
          ${product.scale ? `<span class="chip">${product.scale}</span>` : ''}
          ${product.productType ? `<span class="chip">${product.productType}</span>` : ''}
        </div>`
      : ''}
    ${product.description ? `<p class="desc">${product.description}</p>` : ''}
    <div class="row">
      <div class="eta-block">
        <p>Est. Delivery</p>
        <p>${product.eta || 'TBC'}</p>
        <p style="margin-top:4px;font-size:10px;color:#6b7280;">Qty Available: ${product.quantity}</p>
      </div>
      <div class="price-block">
        <p>Pre-Order Price</p>
        <p class="price">R${product.price > 0 ? product.price.toFixed(2) : '---'}</p>
      </div>
    </div>
  </div>
  <div class="cta">
    <a href="${BOOK_NOW_URL}"><span>BOOK NOW</span> → r66slot.co.za/book</a>
  </div>
  <div class="footer">R66SLOT • Premium Slot Cars &amp; Collectibles • r66slot.co.za</div>
</body>
</html>`
}

// ─── Brand Import / Export Profiles ──────────────────────────────────────────
type ImportProfile = {
  label: string
  hint: string
  template: string
  placeholder: string
  mapRow: (obj: Record<string, string>) => Record<string, string>
  brandKey: string
  exportHeaders: string[]
  exportRow: (p: Product) => (string | number)[]
}

const IMPORT_PROFILES: Record<string, ImportProfile> = {
  generic: {
    label: 'Generic',
    hint: 'Columns: title, sku, brand, price, quantity, eta, description, type, car_class, scale',
    template: 'title,sku,brand,price,quantity,eta,description,type,car_class,scale',
    placeholder: 'NSR Audi R8,NSR-0001,NSR,450,5,Feb 2025,,Slot Car,GT 3,1/32',
    mapRow: (obj) => ({
      title: obj['title'] || obj['name'] || obj['product'] || '',
      description: obj['description'] || obj['desc'] || '',
      price: obj['price'] || '0',
      sku: obj['sku'] || obj['code'] || '',
      brand: obj['brand'] || '',
      productType: obj['type'] || obj['producttype'] || '',
      carClass: obj['car_class'] || obj['carclass'] || obj['class'] || '',
      scale: obj['scale'] || '',
      quantity: obj['quantity'] || obj['qty'] || '0',
      eta: obj['eta'] || obj['delivery'] || '',
      status: obj['status'] || 'active',
    }),
    brandKey: '',
    exportHeaders: ['title', 'sku', 'brand', 'price', 'quantity', 'eta', 'description', 'type', 'car_class', 'scale', 'status', 'page_url'],
    exportRow: (p) => [p.title, p.sku, p.brand, p.price, p.quantity, p.eta, p.description, p.productType, p.carClass || '', p.scale || '', p.status, p.pageUrl || ''],
  },
  nsr: {
    label: 'NSR',
    hint: 'Columns: sku, title, car_class, scale, price, quantity, eta — brand & type auto-filled',
    template: 'sku,title,car_class,scale,price,quantity,eta',
    placeholder: 'NSR-0001,NSR Audi R8 GT3,GT 3,1/32,450,5,Feb 2025',
    mapRow: (obj) => ({
      sku: obj['sku'] || obj['code'] || obj['item code'] || '',
      title: obj['title'] || obj['name'] || obj['description'] || obj['desc'] || '',
      brand: 'NSR',
      productType: 'Slot Car',
      carClass: obj['car_class'] || obj['carclass'] || obj['class'] || obj['category'] || '',
      scale: obj['scale'] || '1/32',
      price: obj['price'] || obj['retail'] || obj['retail price'] || '0',
      quantity: obj['quantity'] || obj['qty'] || obj['stock'] || '0',
      eta: obj['eta'] || obj['delivery'] || obj['lead time'] || '',
      description: obj['description'] || obj['desc'] || '',
      status: 'active',
    }),
    brandKey: 'NSR',
    exportHeaders: ['sku', 'title', 'car_class', 'scale', 'price', 'quantity', 'eta'],
    exportRow: (p) => [p.sku, p.title, p.carClass || '', p.scale || '', p.price, p.quantity, p.eta],
  },
  revo: {
    label: 'Revo',
    hint: 'Columns: sku, title, part_type, price, quantity, eta — brand & type auto-filled',
    template: 'sku,title,part_type,price,quantity,eta',
    placeholder: 'RV-001,Revo Slick Tyres,Tyres,120,10,Mar 2025',
    mapRow: (obj) => ({
      sku: obj['sku'] || obj['code'] || obj['item'] || obj['item code'] || '',
      title: obj['title'] || obj['name'] || obj['description'] || obj['desc'] || '',
      brand: 'Revo',
      productType: 'Parts',
      partType: obj['part_type'] || obj['parttype'] || obj['type'] || obj['category'] || '',
      price: obj['price'] || obj['retail'] || obj['retail price'] || '0',
      quantity: obj['quantity'] || obj['qty'] || obj['stock'] || '0',
      eta: obj['eta'] || obj['delivery'] || obj['lead time'] || '',
      description: obj['description'] || obj['desc'] || '',
      status: 'active',
    }),
    brandKey: 'Revo',
    exportHeaders: ['sku', 'title', 'part_type', 'price', 'quantity', 'eta'],
    exportRow: (p) => [p.sku, p.title, p.productType || '', p.price, p.quantity, p.eta],
  },
  brm: {
    label: 'BRM',
    hint: 'Columns: sku, title, car_class, scale, price, quantity, eta — brand & type auto-filled',
    template: 'sku,title,car_class,scale,price,quantity,eta',
    placeholder: 'BRM-001,BRM Alfa Romeo GTA,GT,1/24,650,3,Apr 2025',
    mapRow: (obj) => ({
      sku: obj['sku'] || obj['code'] || obj['item code'] || '',
      title: obj['title'] || obj['name'] || obj['description'] || obj['desc'] || '',
      brand: 'BRM',
      productType: 'Slot Car',
      carClass: obj['car_class'] || obj['carclass'] || obj['class'] || obj['category'] || '',
      scale: obj['scale'] || '1/24',
      price: obj['price'] || obj['retail'] || '0',
      quantity: obj['quantity'] || obj['qty'] || obj['stock'] || '0',
      eta: obj['eta'] || obj['delivery'] || '',
      description: obj['description'] || obj['desc'] || '',
      status: 'active',
    }),
    brandKey: 'BRM',
    exportHeaders: ['sku', 'title', 'car_class', 'scale', 'price', 'quantity', 'eta'],
    exportRow: (p) => [p.sku, p.title, p.carClass || '', p.scale || '', p.price, p.quantity, p.eta],
  },
  pioneer: {
    label: 'Pioneer',
    hint: 'Columns: sku, title, car_class, scale, price, quantity, eta — brand & type auto-filled',
    template: 'sku,title,car_class,scale,price,quantity,eta',
    placeholder: 'P-001,Pioneer Camaro Z28,Group 5,1/32,550,4,Mar 2025',
    mapRow: (obj) => ({
      sku: obj['sku'] || obj['code'] || obj['item code'] || '',
      title: obj['title'] || obj['name'] || obj['description'] || obj['desc'] || '',
      brand: 'Pioneer',
      productType: 'Slot Car',
      carClass: obj['car_class'] || obj['carclass'] || obj['class'] || obj['category'] || '',
      scale: obj['scale'] || '1/32',
      price: obj['price'] || obj['retail'] || '0',
      quantity: obj['quantity'] || obj['qty'] || obj['stock'] || '0',
      eta: obj['eta'] || obj['delivery'] || '',
      description: obj['description'] || obj['desc'] || '',
      status: 'active',
    }),
    brandKey: 'Pioneer',
    exportHeaders: ['sku', 'title', 'car_class', 'scale', 'price', 'quantity', 'eta'],
    exportRow: (p) => [p.sku, p.title, p.carClass || '', p.scale || '', p.price, p.quantity, p.eta],
  },
  sideways: {
    label: 'Sideways',
    hint: 'Columns: sku, title, car_class, scale, price, quantity, eta — brand & type auto-filled',
    template: 'sku,title,car_class,scale,price,quantity,eta',
    placeholder: 'SW-001,Sideways Porsche 935,GT,1/32,480,6,May 2025',
    mapRow: (obj) => ({
      sku: obj['sku'] || obj['code'] || obj['item code'] || '',
      title: obj['title'] || obj['name'] || obj['description'] || obj['desc'] || '',
      brand: 'Sideways',
      productType: 'Slot Car',
      carClass: obj['car_class'] || obj['carclass'] || obj['class'] || obj['category'] || '',
      scale: obj['scale'] || '1/32',
      price: obj['price'] || obj['retail'] || '0',
      quantity: obj['quantity'] || obj['qty'] || obj['stock'] || '0',
      eta: obj['eta'] || obj['delivery'] || '',
      description: obj['description'] || obj['desc'] || '',
      status: 'active',
    }),
    brandKey: 'Sideways',
    exportHeaders: ['sku', 'title', 'car_class', 'scale', 'price', 'quantity', 'eta'],
    exportRow: (p) => [p.sku, p.title, p.carClass || '', p.scale || '', p.price, p.quantity, p.eta],
  },
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [brandFilter, setBrandFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')  // Task 2
  const [revoFilter, setRevoFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [importProfile, setImportProfile] = useState('generic')
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportProfile, setExportProfile] = useState('generic')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [showColPicker, setShowColPicker] = useState(false)
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    sku: true, brand: true, categories: true, price: true,
    eta: true, qty: true, pageUrl: true, status: true,
  })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Task 2: categories
  const [categories, setCategories] = useState<Category[]>([])
  // Task 3/4: pages
  const [pages, setPages] = useState<PageItem[]>([])
  // Task 3/4: inline page URL edit
  const [editingPageId, setEditingPageId] = useState<string | null>(null)
  const [editingPageUrl, setEditingPageUrl] = useState('')

  useEffect(() => {
    fetchProducts()
    // Task 2: load categories
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCategories(data) })
      .catch(() => {})
    // Task 3/4: load pages
    fetch('/api/admin/pages')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPages(data.map((p: any) => ({ id: p.id, title: p.title }))) })
      .catch(() => {})
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/products')
      if (response.ok) setProducts(await response.json())
    } catch (err) {
      console.error('Error fetching products:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
      if (res.ok) setProducts(products.filter((p) => p.id !== id))
    } catch (err) { console.error('Delete error:', err) }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map((p) => p.id)))
  }

  const handleBulkDelete = async () => {
    if (!selectedIds.size || !confirm(`Delete ${selectedIds.size} product(s)?`)) return
    setBulkDeleting(true)
    try {
      for (const id of selectedIds) await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
      setProducts(products.filter((p) => !selectedIds.has(p.id)))
      setSelectedIds(new Set())
    } catch (err) { console.error('Bulk delete error:', err) }
    finally { setBulkDeleting(false) }
  }

  const exportCSV = (rows: Product[], profileKey = 'generic') => {
    const profile = IMPORT_PROFILES[profileKey]
    const filtered = profile.brandKey
      ? rows.filter((p) => p.brand.toLowerCase() === profile.brandKey.toLowerCase())
      : rows
    const csv = [
      profile.exportHeaders.join(','),
      ...filtered.map((p) =>
        profile.exportRow(p).map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `${profileKey}-products-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const handleInlineUpdate = async (id: string, field: string, value: string | number | string[]) => {
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
    } catch (err) { console.error('Update error:', err) }
  }

  // ── Task 3/4: Save Page URL for a product ──
  const handleSavePageUrl = async (productId: string) => {
    const trimmed = editingPageUrl.trim()
    await handleInlineUpdate(productId, 'pageUrl', trimmed)
    setEditingPageId(null)
    setEditingPageUrl('')
  }

  // ── Task 1: Pre Order → PDF + WhatsApp ──────────────────────────────────────
  const handlePreOrder = (product: Product) => {
    // Generate and open PDF
    const html = buildPreOrderPDF(product)
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.onload = () => setTimeout(() => win.print(), 600)
    }

    // WhatsApp message with Book Now URL
    const msg = [
      `🎯 *PRE-ORDER – ${product.title}*`,
      ``,
      `*Brand:* ${product.brand || '—'}`,
      product.carClass ? `*Class:* ${product.carClass}` : '',
      product.scale ? `*Scale:* ${product.scale}` : '',
      `*SKU:* ${product.sku || '—'}`,
      `*Price:* R${product.price > 0 ? product.price.toFixed(2) : 'POA'}`,
      `*ETA:* ${product.eta || 'TBC'}`,
      product.description ? `\n${product.description}` : '',
      ``,
      `📋 *BOOK NOW:* ${BOOK_NOW_URL}`,
    ].filter(Boolean).join('\n')

    setTimeout(() => {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
    }, 400)
  }

  // Regular order → WhatsApp only
  const handleOrder = (product: Product) => {
    const msg = `*Order Request*\n\n*Product:* ${product.title}\n*SKU:* ${product.sku}\n*Price:* R${product.price.toFixed(2)}\n*Brand:* ${product.brand}\n*Qty:* ${product.quantity}\n\nI would like to order this item.\n\n📋 ${BOOK_NOW_URL}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const downloadTemplate = () => {
    const profile = IMPORT_PROFILES[importProfile]
    const csv = profile.template + '\n' + profile.placeholder
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${importProfile}-import-template.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportCSV = async () => {
    if (!importText.trim()) return
    setImporting(true)
    const profile = IMPORT_PROFILES[importProfile]
    try {
      const lines = importText.trim().split('\n')
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
      const rows = lines.slice(1).filter((l) => l.trim()).map((line) => {
        const values = line.split(',').map((v) => v.trim())
        const obj: Record<string, string> = {}
        headers.forEach((h, i) => { obj[h] = values[i] || '' })
        return profile.mapRow(obj)
      })
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: rows }),
      })
      if (res.ok) {
        const data = await res.json()
        try {
          await fetch('/api/admin/suppliers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: `import-${new Date().toISOString().slice(0, 10)}.csv`, csvData: importText, productCount: rows.length, source: 'product-import' }),
          })
        } catch {}
        const parts = []
        if (data.imported > 0) parts.push(`${data.imported} new`)
        if (data.updated > 0) parts.push(`${data.updated} updated`)
        alert(`Import complete: ${parts.join(', ')} product${(data.imported + data.updated) !== 1 ? 's' : ''}`)
        setShowImportModal(false)
        setImportText('')
        fetchProducts()
      }
    } catch (err) {
      console.error('Import error:', err)
      alert('Import failed')
    } finally { setImporting(false) }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setImportText(ev.target?.result as string)
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const brands = Array.from(new Set(products.map((p) => p.brand).filter(Boolean)))
  const allRevoParts = Array.from(new Set(products.flatMap((p) => p.revoParts || []))).sort()

  const COL_LABELS: Record<string, string> = {
    sku: 'SKU', brand: 'Brand', categories: 'Categories', price: 'Price',
    eta: 'ETA', qty: 'Qty', pageUrl: 'Page URL', status: 'Status',
  }

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const visibleColCount = 3 + Object.values(visibleCols).filter(Boolean).length // checkbox + product + actions + visible

  const filtered = products
    .filter((p) => {
      const matchBrand = !brandFilter || p.brand?.toLowerCase() === brandFilter.toLowerCase()
      const matchCat = !categoryFilter || (p.collections || []).includes(categoryFilter) || (p.categories || []).includes(categoryFilter)
      const matchRevo = !revoFilter || (p.revoParts || []).includes(revoFilter)
      const matchSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()) || (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase())
      return matchBrand && matchCat && matchRevo && matchSearch
    })
    .sort((a, b) => (a.sku || '').localeCompare(b.sku || ''))

  // Helper: get page name from pageId
  const getPageTitle = (product: Product) => {
    if (product.pageId) {
      const found = pages.find((pg) => pg.id === product.pageId)
      return found?.title || product.pageId
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-gray-600 mt-1">Manage your product inventory ({products.length} products)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowExportModal(true)}>Export CSV</Button>
          <Button variant="outline" onClick={() => setShowImportModal(true)}>Import</Button>
          <Button size="lg" asChild>
            <Link href="/admin/products/new">Add Product</Link>
          </Button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {/* Search */}
        <input
          type="text"
          placeholder="Search name or SKU…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[180px] max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
        {/* Brand filter */}
        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900"
        >
          <option value="">All Brands</option>
          {brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>

        {/* ── Task 2: Category filter ── */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}{c.class ? ` (${c.class})` : ''}
            </option>
          ))}
        </select>

        {/* Revo Parts filter */}
        {allRevoParts.length > 0 && (
          <select
            value={revoFilter}
            onChange={(e) => setRevoFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900"
          >
            <option value="">All Revo Parts</option>
            {allRevoParts.map((part) => (
              <option key={part} value={part}>{part}</option>
            ))}
          </select>
        )}

        {(searchQuery || brandFilter || categoryFilter || revoFilter) && (
          <button
            onClick={() => { setSearchQuery(''); setBrandFilter(''); setCategoryFilter(''); setRevoFilter('') }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg"
          >
            Clear ✕
          </button>
        )}

        {/* Column picker */}
        <div className="relative ml-auto">
          <button
            onClick={() => setShowColPicker((v) => !v)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Columns
          </button>
          {showColPicker && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 p-3 min-w-[160px]">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Show / Hide Columns</p>
              {Object.entries(COL_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 py-1 cursor-pointer hover:text-gray-900 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={visibleCols[key]}
                    onChange={() => setVisibleCols((v) => ({ ...v, [key]: !v[key] }))}
                    className="accent-gray-900"
                  />
                  {label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bulk Actions Bar ── */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-gray-900 text-white rounded-lg px-4 py-3 flex-wrap">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <button onClick={() => exportCSV(products.filter((p) => selectedIds.has(p.id)), exportProfile)} className="px-3 py-1.5 text-xs font-medium bg-white text-gray-900 rounded hover:bg-gray-100">
            Export CSV
          </button>
          <button onClick={handleBulkDelete} disabled={bulkDeleting} className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
            {bulkDeleting ? 'Deleting…' : 'Delete Selected'}
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto px-3 py-1.5 text-xs text-gray-300 hover:text-white">
            Clear
          </button>
        </div>
      )}

      {/* ── Product Table ── */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-5xl mb-4">📦</div>
            <h3 className="text-xl font-semibold mb-2">{products.length === 0 ? 'No Products Yet' : 'No matching products'}</h3>
            <p className="text-gray-600 mb-4">{products.length === 0 ? 'Add your first product to get started' : 'Try adjusting your search or filters'}</p>
            {products.length === 0 && <Button asChild><Link href="/admin/products/new">Add Product</Link></Button>}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="py-3 px-3 w-10">
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && selectedIds.size === filtered.length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 accent-gray-900 cursor-pointer"
                      />
                    </th>
                    <th className="w-6"></th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Product</th>
                    {visibleCols.sku && <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">SKU</th>}
                    {visibleCols.brand && <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Brand</th>}
                    {visibleCols.categories && <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Categories</th>}
                    {visibleCols.price && <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Price</th>}
                    {visibleCols.eta && <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">ETA</th>}
                    {visibleCols.qty && <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Qty</th>}
                    {visibleCols.pageUrl && <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Page URL</th>}
                    {visibleCols.status && <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>}
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => {
                    const pageTitle = getPageTitle(product)
                    const isEditingPage = editingPageId === product.id
                    const allCats = Array.from(new Set([...(product.collections || []), ...(product.categories || [])]))
                    return (
                      <React.Fragment key={product.id}>
                      <tr className={`border-b hover:bg-gray-50 ${selectedIds.has(product.id) ? 'bg-blue-50' : ''}`}>

                        {/* Checkbox */}
                        <td className="py-3 px-3">
                          <input type="checkbox" checked={selectedIds.has(product.id)} onChange={() => toggleSelect(product.id)} className="h-4 w-4 accent-gray-900 cursor-pointer" />
                        </td>

                        {/* Expand toggle */}
                        <td className="py-3 px-1">
                          <button
                            onClick={() => toggleExpand(product.id)}
                            className="text-gray-400 hover:text-gray-700 transition-transform"
                            title="View description"
                          >
                            <svg className={`w-3.5 h-3.5 transition-transform ${expandedIds.has(product.id) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td>

                        {/* Product */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                              {product.imageUrl
                                ? <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                                : <span className="text-gray-400 text-[10px]">IMG</span>}
                            </div>
                            <div>
                              <span className="font-medium truncate max-w-[160px] block">{product.title}</span>
                              {product.carClass && (
                                <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">{product.carClass}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* SKU */}
                        {visibleCols.sku && (
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs text-gray-600">{product.sku || '—'}</span>
                          </td>
                        )}

                        {/* Brand */}
                        {visibleCols.brand && (
                          <td className="py-3 px-4">
                            <span>{product.brand || '—'}</span>
                          </td>
                        )}

                        {/* Categories */}
                        {visibleCols.categories && (
                          <td className="py-3 px-4">
                            {allCats.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-[140px]">
                                {allCats.slice(0, 3).map((c) => (
                                  <span key={c} className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded-full">{c}</span>
                                ))}
                                {allCats.length > 3 && <span className="text-[10px] text-gray-400">+{allCats.length - 3}</span>}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                        )}

                        {/* Price */}
                        {visibleCols.price && (
                          <td className="py-3 px-4 text-right">
                            <span className="font-semibold">{product.price > 0 ? `R${product.price.toFixed(2)}` : 'POA'}</span>
                          </td>
                        )}

                        {/* ETA — inline edit */}
                        {visibleCols.eta && (
                          <td className="py-3 px-4 text-center">
                            <input
                              type="text"
                              defaultValue={product.eta || ''}
                              placeholder="TBC"
                              className="w-24 text-center text-xs px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-gray-400"
                              onBlur={(e) => { if (e.target.value !== (product.eta || '')) handleInlineUpdate(product.id, 'eta', e.target.value) }}
                            />
                          </td>
                        )}

                        {/* Qty — inline edit */}
                        {visibleCols.qty && (
                          <td className="py-3 px-4 text-center">
                            <input
                              type="number"
                              defaultValue={product.quantity}
                              min={0}
                              className="w-16 text-center text-xs px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-gray-400"
                              onBlur={(e) => { const v = parseInt(e.target.value) || 0; if (v !== product.quantity) handleInlineUpdate(product.id, 'quantity', v) }}
                            />
                          </td>
                        )}

                        {/* Page URL */}
                        {visibleCols.pageUrl && <td className="py-3 px-4 min-w-[180px]">
                          {isEditingPage ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="url"
                                value={editingPageUrl}
                                onChange={(e) => setEditingPageUrl(e.target.value)}
                                placeholder="https://r66slot.co.za/..."
                                className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-gray-900 w-36"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSavePageUrl(product.id)
                                  if (e.key === 'Escape') { setEditingPageId(null); setEditingPageUrl('') }
                                }}
                              />
                              <button onClick={() => handleSavePageUrl(product.id)} className="text-[10px] bg-gray-900 text-white px-2 py-1 rounded hover:bg-gray-700">✓</button>
                              <button onClick={() => { setEditingPageId(null); setEditingPageUrl('') }} className="text-[10px] text-gray-400 hover:text-gray-700">✕</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {product.pageUrl ? (
                                <a
                                  href={product.pageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-blue-600 hover:underline truncate max-w-[120px] block"
                                  title={product.pageUrl}
                                >
                                  {product.pageUrl.replace('https://r66slot.co.za', '')}
                                </a>
                              ) : pageTitle ? (
                                <a href={`/admin/pages/editor/${product.pageId}`} target="_blank" className="text-[11px] text-blue-600 hover:underline truncate max-w-[120px] block">{pageTitle}</a>
                              ) : (
                                <span className="text-gray-400 text-xs">No page</span>
                              )}
                              <button
                                onClick={() => { setEditingPageId(product.id); setEditingPageUrl(product.pageUrl || '') }}
                                className="text-[10px] text-gray-400 hover:text-gray-700 shrink-0"
                                title="Insert / edit page URL"
                              >
                                ✏️
                              </button>
                            </div>
                          )}
                        </td>}

                        {/* Status */}
                        {visibleCols.status && (
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-1 text-xs rounded font-medium ${product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {product.status}
                            </span>
                          </td>
                        )}

                        {/* Actions */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <Link
                              href={`/admin/products/${product.id}`}
                              className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => handlePreOrder(product)}
                              className="px-2 py-1 text-xs font-bold bg-orange-500 text-white rounded hover:bg-orange-600 flex items-center gap-1"
                              title="Export Pre-Order PDF + send via WhatsApp"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                              </svg>
                              Pre-Order
                            </button>
                            <button
                              onClick={() => handleOrder(product)}
                              className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            >
                              Order
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              Del
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Expanded description row ── */}
                      {expandedIds.has(product.id) && (
                        <tr className="bg-gray-50 border-b">
                          <td colSpan={visibleColCount} className="px-6 py-3">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-gray-700 max-w-3xl">
                              {product.description && (
                                <div className="col-span-2">
                                  <span className="font-semibold text-gray-500 uppercase text-[10px] tracking-wide">Description</span>
                                  <p className="mt-0.5 text-gray-700 leading-relaxed whitespace-pre-line">{product.description}</p>
                                </div>
                              )}
                              {product.productType && <div><span className="font-semibold text-gray-400">Type: </span>{product.productType}</div>}
                              {product.scale && <div><span className="font-semibold text-gray-400">Scale: </span>{product.scale}</div>}
                              {product.carClass && <div><span className="font-semibold text-gray-400">Class: </span>{product.carClass}</div>}
                              {product.carType && <div><span className="font-semibold text-gray-400">Car Type: </span>{product.carType}</div>}
                              {!product.description && !product.productType && !product.scale && !product.carClass && (
                                <div className="col-span-2 text-gray-400 italic">No description available</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Export Modal ── */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-3">Export Products (CSV)</h3>

            {/* Brand profile selector */}
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Select Brand / Profile</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(IMPORT_PROFILES).map(([key, profile]) => {
                  const count = profile.brandKey
                    ? products.filter((p) => p.brand.toLowerCase() === profile.brandKey.toLowerCase()).length
                    : products.length
                  return (
                    <button
                      key={key}
                      onClick={() => setExportProfile(key)}
                      className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors ${
                        exportProfile === key
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {profile.label} ({count})
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Column preview */}
            <p className="text-xs text-gray-500 mb-4 bg-gray-50 rounded px-3 py-2">
              Columns: {IMPORT_PROFILES[exportProfile].exportHeaders.join(', ')}
            </p>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowExportModal(false)} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">Cancel</button>
              <button
                onClick={() => { exportCSV(products, exportProfile); setShowExportModal(false) }}
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Export ({IMPORT_PROFILES[exportProfile].brandKey
                  ? products.filter((p) => p.brand.toLowerCase() === IMPORT_PROFILES[exportProfile].brandKey.toLowerCase()).length
                  : products.length} products)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Modal ── */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-3">Import Products (CSV)</h3>

            {/* Brand profile selector */}
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Select Brand / Profile</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(IMPORT_PROFILES).map(([key, profile]) => (
                  <button
                    key={key}
                    onClick={() => { setImportProfile(key); setImportText('') }}
                    className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors ${
                      importProfile === key
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {profile.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hint for selected profile */}
            <p className="text-xs text-gray-500 mb-3 bg-gray-50 rounded px-3 py-2">
              {IMPORT_PROFILES[importProfile].hint}
            </p>

            {/* File upload */}
            <div className="mb-3">
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="text-sm" />
            </div>

            {/* CSV textarea */}
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={8}
              placeholder={`${IMPORT_PROFILES[importProfile].template}\n${IMPORT_PROFILES[importProfile].placeholder}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-gray-900"
            />

            <div className="flex items-center justify-between mt-4">
              <button
                onClick={downloadTemplate}
                className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Download Template
              </button>
              <div className="flex gap-3">
                <button onClick={() => { setShowImportModal(false); setImportText(''); setImportProfile('generic') }} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">Cancel</button>
                <button onClick={handleImportCSV} disabled={importing || !importText.trim()} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">
                  {importing ? 'Importing…' : `Import (${IMPORT_PROFILES[importProfile].label})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
