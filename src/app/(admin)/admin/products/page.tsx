'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useColumnResize } from '@/hooks/use-column-resize'

// ─── CSV parser (handles quoted fields with commas) ───────────────────────────
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

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
  categoryBrands?: string[]
  itemCategories?: string[]
  quantity: number
  eta: string
  status: 'draft' | 'active'
  imageUrl: string
  pageId?: string
  pageUrl?: string
  unit?: string
  salesAccount?: string[]
  purchaseAccount?: string[]
  createdAt: string
  updatedAt: string
}

interface Category {
  id: string
  name: string
  slug: string
  class?: string
  pageUrl?: string
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
    hint: 'Columns: Code, Description, Category, Unit, SRP – Inclusive, Cost – Inclusive, Average Cost, Qty, Sales Account, Purchases Account',
    template: 'Code,Description,Category,Unit,SRP – Inclusive,Cost – Inclusive,Average Cost,Qty,Sales Account,Purchases Account',
    placeholder: 'NSR-0001,NSR Slot Car,NSR,Slot Car,517.50,322.00,322.00,5,Retail Sales,Retail Purchases',
    mapRow: (obj) => ({
      sku: obj['code'] || obj['sku'] || '',
      title: obj['description'] || obj['title'] || obj['name'] || '',
      brand: obj['category'] || obj['brand'] || '',
      categoryBrands: obj['category'] || obj['brand'] || '',
      productType: obj['unit'] || obj['category'] || obj['type'] || '',
      itemCategories: obj['unit'] || obj['type'] || '',
      // SRP: inclusive takes priority, fall back to exclusive / generic price columns
      price: obj['srp – inclusive'] || obj['srp inclusive'] || obj['srp – exclusive'] || obj['srp exclusive'] || obj['retail price'] || obj['price'] || '0',
      // Cost: inclusive takes priority, fall back to exclusive / generic cost columns
      costPerItem: obj['cost – inclusive'] || obj['cost inclusive'] || obj['cost – exclusive'] || obj['cost exclusive'] || obj['cost price'] || obj['cost'] || '',
      // Average Cost → stored in compare_at_price (internal use, not shown to customers)
      compareAtPrice: obj['average cost'] || obj['avg cost'] || '',
      quantity: obj['qty'] || obj['quantity'] || '0',
      salesAccount: obj['sales account'] || '',
      purchaseAccount: obj['purchases account'] || obj['purchase account'] || '',
      eta: obj['eta'] || obj['delivery'] || '',
      status: obj['status'] || 'active',
    }),
    brandKey: '',
    exportHeaders: ['Code', 'Description', 'Category', 'Unit', 'SRP – Inclusive', 'Cost – Inclusive', 'Average Cost', 'Qty', 'Sales Account', 'Purchases Account'],
    exportRow: (p) => [
      p.sku,
      p.title,
      (p.categoryBrands && p.categoryBrands.length > 0) ? p.categoryBrands.join('; ') : (p.brand || ''),
      (p.itemCategories && p.itemCategories.length > 0) ? p.itemCategories.join('; ') : (p.productType || ''),
      p.price,
      p.costPerItem ?? '',
      p.compareAtPrice ?? '',
      p.quantity,
      Array.isArray(p.salesAccount) ? p.salesAccount.join('; ') : (p.salesAccount || ''),
      Array.isArray(p.purchaseAccount) ? p.purchaseAccount.join('; ') : (p.purchaseAccount || ''),
    ],
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
      price: obj['retail price'] || obj['price'] || obj['retail'] || '0',
      costPerItem: obj['cost price'] || obj['cost'] || '',
      quantity: obj['quantity'] || obj['qty'] || obj['stock'] || '0',
      eta: obj['eta'] || obj['delivery'] || obj['lead time'] || '',
      description: obj['description'] || obj['desc'] || '',
      status: 'active',
    }),
    brandKey: 'NSR',
    exportHeaders: ['Code', 'Description', 'Category', 'Unit', 'SRP – Exclusive', 'Cost – Exclusive', 'Sales Account', 'Purchases Account'],
    exportRow: (p) => [
      p.sku, p.title,
      (p.categoryBrands && p.categoryBrands.length > 0) ? p.categoryBrands.join('; ') : (p.brand || ''),
      (p.itemCategories && p.itemCategories.length > 0) ? p.itemCategories.join('; ') : (p.productType || ''),
      p.price, p.costPerItem ?? '',
      Array.isArray(p.salesAccount) ? p.salesAccount.join('; ') : (p.salesAccount || ''),
      Array.isArray(p.purchaseAccount) ? p.purchaseAccount.join('; ') : (p.purchaseAccount || ''),
    ],
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
      price: obj['retail price'] || obj['price'] || obj['retail'] || '0',
      costPerItem: obj['cost price'] || obj['cost'] || '',
      quantity: obj['quantity'] || obj['qty'] || obj['stock'] || '0',
      eta: obj['eta'] || obj['delivery'] || obj['lead time'] || '',
      description: obj['description'] || obj['desc'] || '',
      status: 'active',
    }),
    brandKey: 'Revo',
    exportHeaders: ['Code', 'Description', 'Category', 'Unit', 'SRP – Exclusive', 'Cost – Exclusive', 'Sales Account', 'Purchases Account'],
    exportRow: (p) => [
      p.sku, p.title,
      (p.categoryBrands && p.categoryBrands.length > 0) ? p.categoryBrands.join('; ') : (p.brand || ''),
      (p.itemCategories && p.itemCategories.length > 0) ? p.itemCategories.join('; ') : (p.productType || ''),
      p.price, p.costPerItem ?? '',
      Array.isArray(p.salesAccount) ? p.salesAccount.join('; ') : (p.salesAccount || ''),
      Array.isArray(p.purchaseAccount) ? p.purchaseAccount.join('; ') : (p.purchaseAccount || ''),
    ],
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
      price: obj['retail price'] || obj['price'] || obj['retail'] || '0',
      costPerItem: obj['cost price'] || obj['cost'] || '',
      quantity: obj['quantity'] || obj['qty'] || obj['stock'] || '0',
      eta: obj['eta'] || obj['delivery'] || '',
      description: obj['description'] || obj['desc'] || '',
      status: 'active',
    }),
    brandKey: 'BRM',
    exportHeaders: ['Code', 'Description', 'Category', 'Unit', 'SRP – Exclusive', 'Cost – Exclusive', 'Sales Account', 'Purchases Account'],
    exportRow: (p) => [
      p.sku, p.title,
      (p.categoryBrands && p.categoryBrands.length > 0) ? p.categoryBrands.join('; ') : (p.brand || ''),
      (p.itemCategories && p.itemCategories.length > 0) ? p.itemCategories.join('; ') : (p.productType || ''),
      p.price, p.costPerItem ?? '',
      Array.isArray(p.salesAccount) ? p.salesAccount.join('; ') : (p.salesAccount || ''),
      Array.isArray(p.purchaseAccount) ? p.purchaseAccount.join('; ') : (p.purchaseAccount || ''),
    ],
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
      price: obj['retail price'] || obj['price'] || obj['retail'] || '0',
      costPerItem: obj['cost price'] || obj['cost'] || '',
      quantity: obj['quantity'] || obj['qty'] || obj['stock'] || '0',
      eta: obj['eta'] || obj['delivery'] || '',
      description: obj['description'] || obj['desc'] || '',
      status: 'active',
    }),
    brandKey: 'Pioneer',
    exportHeaders: ['Code', 'Description', 'Category', 'Unit', 'SRP – Exclusive', 'Cost – Exclusive', 'Sales Account', 'Purchases Account'],
    exportRow: (p) => [
      p.sku, p.title,
      (p.categoryBrands && p.categoryBrands.length > 0) ? p.categoryBrands.join('; ') : (p.brand || ''),
      (p.itemCategories && p.itemCategories.length > 0) ? p.itemCategories.join('; ') : (p.productType || ''),
      p.price, p.costPerItem ?? '',
      Array.isArray(p.salesAccount) ? p.salesAccount.join('; ') : (p.salesAccount || ''),
      Array.isArray(p.purchaseAccount) ? p.purchaseAccount.join('; ') : (p.purchaseAccount || ''),
    ],
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
      price: obj['retail price'] || obj['price'] || obj['retail'] || '0',
      costPerItem: obj['cost price'] || obj['cost'] || '',
      quantity: obj['quantity'] || obj['qty'] || obj['stock'] || '0',
      eta: obj['eta'] || obj['delivery'] || '',
      description: obj['description'] || obj['desc'] || '',
      status: 'active',
    }),
    brandKey: 'Sideways',
    exportHeaders: ['Code', 'Description', 'Category', 'Unit', 'SRP – Exclusive', 'Cost – Exclusive', 'Sales Account', 'Purchases Account'],
    exportRow: (p) => [
      p.sku, p.title,
      (p.categoryBrands && p.categoryBrands.length > 0) ? p.categoryBrands.join('; ') : (p.brand || ''),
      (p.itemCategories && p.itemCategories.length > 0) ? p.itemCategories.join('; ') : (p.productType || ''),
      p.price, p.costPerItem ?? '',
      Array.isArray(p.salesAccount) ? p.salesAccount.join('; ') : (p.salesAccount || ''),
      Array.isArray(p.purchaseAccount) ? p.purchaseAccount.join('; ') : (p.purchaseAccount || ''),
    ],
  },
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [urlBrand, setUrlBrand] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [brandFilter, setBrandFilter] = useState('')
  const [categoryFilters, setCategoryFilters] = useState<string[]>([])
  const [showBrandDropdown, setShowBrandDropdown] = useState(false)
  const [showCatDropdown, setShowCatDropdown] = useState(false)
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
  const [sortBy, setSortBy] = useState<string>('sku')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [fixingDupes, setFixingDupes] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const colPickerRef = useRef<HTMLDivElement>(null)
  const brandDropdownRef = useRef<HTMLDivElement>(null)
  const catDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showColPicker) return
    const handler = (e: MouseEvent) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) {
        setShowColPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColPicker])

  useEffect(() => {
    if (!showBrandDropdown) return
    const handler = (e: MouseEvent) => {
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(e.target as Node)) {
        setShowBrandDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showBrandDropdown])

  useEffect(() => {
    if (!showCatDropdown) return
    const handler = (e: MouseEvent) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target as Node)) {
        setShowCatDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showCatDropdown])

  // Task 2: categories
  const [categories, setCategories] = useState<Category[]>([])
  // Task 3/4: pages
  const [pages, setPages] = useState<PageItem[]>([])
  // Task 3/4: inline page URL edit
  const [editingPageId, setEditingPageId] = useState<string | null>(null)
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  useEffect(() => {
    if (!openActionId) return
    const close = () => setOpenActionId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openActionId])
  const { widths: colW, setWidth } = useColumnResize('products', {
    sku: 90, title: 170, brand: 110, categories: 120,
    price: 80, eta: 70, qty: 65, pageUrl: 140, status: 80,
  })
  const [editingPageUrl, setEditingPageUrl] = useState('')

  useEffect(() => {
    const brand = new URLSearchParams(window.location.search).get('brand') || ''
    setUrlBrand(brand)
    setBrandFilter(brand)
    fetchProducts(brand)
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCategories(data) })
      .catch(() => {})
    fetch('/api/admin/pages')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPages(data.map((p: any) => ({ id: p.id, title: p.title }))) })
      .catch(() => {})
  }, [])

  const fetchProducts = async (brand = '') => {
    setIsLoading(true)
    try {
      const url = brand ? `/api/admin/products?brand=${encodeURIComponent(brand)}` : '/api/admin/products'
      const response = await fetch(url)
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

  const handleDuplicate = async (product: Product) => {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...product,
          title: `Copy of ${product.title}`,
          sku: product.sku ? `${product.sku}-copy` : '',
          status: 'draft',
          mediaFiles: product.imageUrl ? [product.imageUrl] : [],
          imageUrl: product.imageUrl,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setProducts(prev => [...prev, created])
      }
    } catch (err) { console.error('Duplicate error:', err) }
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

  const fixDuplicates = async () => {
    if (!confirm('This will merge duplicate SKUs and delete the extras. Continue?')) return
    setFixingDupes(true)
    try {
      const res = await fetch('/api/admin/products', { method: 'PATCH' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      alert(data.message)
      fetchProducts(urlBrand)
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setFixingDupes(false)
    }
  }

  const handleImportCSV = async () => {
    if (!importText.trim()) return
    setImporting(true)
    const profile = IMPORT_PROFILES[importProfile]
    try {
      const lines = importText.trim().split('\n').map((l) => l.replace(/\r$/, ''))
      const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase())
      const rows = lines.slice(1).filter((l) => l.trim()).map((line) => {
        const values = parseCSVLine(line)
        const obj: Record<string, string> = {}
        headers.forEach((h, i) => { obj[h] = values[i] || '' })
        return profile.mapRow(obj)
      })
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: rows }),
      })
      const data = await res.json()
      if (res.ok) {
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
        fetchProducts(urlBrand)
      } else {
        alert(`Import failed: ${data.error || 'Unknown error'}`)
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
  const allRevoParts = Array.from(new Set(products.flatMap((p) => p.itemCategories || []))).sort()

  const COL_LABELS: Record<string, string> = {
    sku: 'SKU', brand: 'Brand', categories: 'Categories', price: 'Price',
    eta: 'ETA', qty: 'Qty', pageUrl: 'Page URL', status: 'Status',
  }

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const visibleColCount = 4 + Object.values(visibleCols).filter(Boolean).length // checkbox + expand + product + actions

  const filtered = products
    .filter((p) => {
      const matchBrand = !brandFilter || p.brand?.toLowerCase() === brandFilter.toLowerCase()
      const matchCat = categoryFilters.length === 0 || categoryFilters.some((f) => (p.collections || []).includes(f) || (p.categories || []).includes(f))
      const matchRevo = !revoFilter || (p.itemCategories || []).includes(revoFilter)
      const matchSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()) || (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase())
      return matchBrand && matchCat && matchRevo && matchSearch
    })
    .sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''
      if (sortBy === 'title')      { av = a.title || ''; bv = b.title || '' }
      else if (sortBy === 'sku')   { av = a.sku || ''; bv = b.sku || '' }
      else if (sortBy === 'brand') { av = a.brand || ''; bv = b.brand || '' }
      else if (sortBy === 'categories') { av = (a.itemCategories?.[0] || a.categoryBrands?.[0] || ''); bv = (b.itemCategories?.[0] || b.categoryBrands?.[0] || '') }
      else if (sortBy === 'price') { av = a.price ?? 0; bv = b.price ?? 0 }
      else if (sortBy === 'eta')   { av = a.eta || ''; bv = b.eta || '' }
      else if (sortBy === 'qty')   { av = a.quantity ?? 0; bv = b.quantity ?? 0 }
      else if (sortBy === 'status'){ av = a.status || ''; bv = b.status || '' }
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })

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
          <h1 className="text-3xl font-bold">{urlBrand ? `${urlBrand} Products` : 'Products'}</h1>
          <p className="text-gray-600 mt-1">{urlBrand ? `${urlBrand} product inventory` : 'All products'} — {products.length} items</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={fixDuplicates} disabled={fixingDupes}>
            {fixingDupes ? 'Fixing…' : 'Fix Duplicates'}
          </Button>
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
        {/* ── All Products dropdown ── */}
        <div className="relative" ref={brandDropdownRef}>
          <button
            onClick={() => setShowBrandDropdown((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 ${brandFilter ? 'border-gray-900 font-semibold text-gray-900' : 'border-gray-300 text-gray-700'}`}
          >
            {brandFilter || 'All Products'}
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showBrandDropdown && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 min-w-[180px] py-1">
              <button
                onClick={() => { setBrandFilter(''); setShowBrandDropdown(false) }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${!brandFilter ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
              >
                <span>All Products</span>
                <span className="text-xs text-gray-400 ml-4">{products.length}</span>
              </button>
              <div className="border-t border-gray-100 my-1" />
              {brands.map((b) => (
                <button
                  key={b}
                  onClick={() => { setBrandFilter(b); setShowBrandDropdown(false) }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${brandFilter === b ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
                >
                  <span>{b}</span>
                  <span className="text-xs text-gray-400 ml-4">{products.filter((p) => p.brand === b).length}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Category multi-select ── */}
        <div className="relative" ref={catDropdownRef}>
          <button
            onClick={() => setShowCatDropdown((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 ${categoryFilters.length > 0 ? 'border-gray-900 font-semibold text-gray-900 bg-gray-50' : 'border-gray-300 text-gray-700'}`}
          >
            {categoryFilters.length === 0 ? 'Race Classes' : `${categoryFilters.length} selected`}
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showCatDropdown && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 min-w-[240px] py-2 max-h-72 overflow-y-auto">
              <div className="flex items-center justify-between px-3 pb-1.5 border-b border-gray-100 mb-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Filter by Race Class</p>
                {categoryFilters.length > 0 && (
                  <button onClick={() => setCategoryFilters([])} className="text-[10px] text-red-500 hover:text-red-700 font-medium">Clear all</button>
                )}
              </div>
              {categories.map((c) => (
                <label key={c.id} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={categoryFilters.includes(c.slug)}
                    onChange={() =>
                      setCategoryFilters((prev) =>
                        prev.includes(c.slug) ? prev.filter((f) => f !== c.slug) : [...prev, c.slug]
                      )
                    }
                    className="h-3.5 w-3.5 accent-gray-900 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700 flex-1 leading-tight">
                    {c.name}{c.class ? <span className="text-gray-400 text-[11px]"> ({c.class})</span> : ''}
                  </span>
                  {c.pageUrl && (
                    <a
                      href={c.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[11px] text-blue-500 hover:text-blue-700 flex-shrink-0"
                      title={`Open ${c.name} page`}
                    >↗</a>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Item Categories (Unit) filter */}
        {allRevoParts.length > 0 && (
          <select
            value={revoFilter}
            onChange={(e) => setRevoFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900"
          >
            <option value="">Item Categories (Unit)</option>
            {allRevoParts.map((part) => (
              <option key={part} value={part}>{part}</option>
            ))}
          </select>
        )}

        {(searchQuery || brandFilter || categoryFilters.length > 0 || revoFilter) && (
          <button
            onClick={() => { setSearchQuery(''); setBrandFilter(''); setCategoryFilters([]); setRevoFilter('') }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg"
          >
            Clear ✕
          </button>
        )}

        {/* Column picker */}
        <div className="relative ml-auto" ref={colPickerRef}>
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
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col style={{ width: 32 }} />
                  <col style={{ width: 20 }} />
                  {visibleCols.sku && <col style={{ width: colW.sku }} />}
                  <col style={{ width: colW.title }} />
                  {visibleCols.brand && <col style={{ width: colW.brand }} />}
                  {visibleCols.categories && <col style={{ width: colW.categories }} />}
                  {visibleCols.price && <col style={{ width: colW.price }} />}
                  {visibleCols.eta && <col style={{ width: colW.eta }} />}
                  {visibleCols.qty && <col style={{ width: colW.qty }} />}
                  {visibleCols.pageUrl && <col style={{ width: colW.pageUrl }} />}
                  {visibleCols.status && <col style={{ width: colW.status }} />}
                  <col style={{ width: 85 }} />
                </colgroup>
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="py-2 px-2 w-8">
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && selectedIds.size === filtered.length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 accent-gray-900 cursor-pointer"
                      />
                    </th>
                    <th className="w-5"></th>
                    {(() => {
                      const SortTh = ({ col, label, align = 'left' }: { col: string; label: string; align?: 'left' | 'right' | 'center' }) => {
                        const active = sortBy === col
                        const handleClick = () => {
                          if (active) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
                          else { setSortBy(col); setSortDir('asc') }
                        }
                        return (
                          <th
                            style={{ position: 'relative' }}
                            className={`py-2 px-2 text-xs font-semibold uppercase cursor-pointer select-none group whitespace-nowrap text-${align} ${active ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={handleClick}
                          >
                            <span className="inline-flex items-center gap-1">
                              {label}
                              <span className={`transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
                                {active && sortDir === 'desc' ? '↑' : '↓'}
                              </span>
                            </span>
                            <div
                              onMouseDown={(e) => {
                                e.preventDefault(); e.stopPropagation()
                                const startX = e.clientX
                                const startW = (e.currentTarget as HTMLElement).closest('th')?.offsetWidth ?? 100
                                const onMove = (ev: MouseEvent) => setWidth(col, Math.max(40, startW + ev.clientX - startX))
                                const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
                                document.addEventListener('mousemove', onMove)
                                document.addEventListener('mouseup', onUp)
                              }}
                              onClick={e => e.stopPropagation()}
                              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/50 select-none z-10"
                            />
                          </th>
                        )
                      }
                      return (
                        <>
                          {visibleCols.sku && <SortTh col="sku" label="SKU" />}
                          <SortTh col="title" label="Product" />
                          {visibleCols.brand && <SortTh col="brand" label="Category (Brand)" />}
                          {visibleCols.categories && <SortTh col="categories" label="Item Categories (Unit)" />}
                          {visibleCols.price && <SortTh col="price" label="Price" align="right" />}
                          {visibleCols.eta && <SortTh col="eta" label="ETA" align="center" />}
                          {visibleCols.qty && <SortTh col="qty" label="Qty" align="center" />}
                          {visibleCols.pageUrl && (
                            <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase" style={{ position: 'relative' }}>
                              Page URL
                              <div onMouseDown={(e) => { e.preventDefault(); const startX = e.clientX; const startW = (e.currentTarget as HTMLElement).closest('th')?.offsetWidth ?? colW.pageUrl; const onMove = (ev: MouseEvent) => setWidth('pageUrl', Math.max(40, startW + ev.clientX - startX)); const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp) }} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/50 select-none z-10" />
                            </th>
                          )}
                          {visibleCols.status && <SortTh col="status" label="Status" align="center" />}
                          <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500 uppercase sticky right-0 bg-gray-50 shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.07)]">Actions</th>
                        </>
                      )
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => {
                    const pageTitle = getPageTitle(product)
                    const isEditingPage = editingPageId === product.id
                    const allCats = (product.itemCategories && product.itemCategories.length > 0)
                      ? product.itemCategories
                      : Array.from(new Set([...(product.collections || []), ...(product.categories || [])]))
                    return (
                      <React.Fragment key={product.id}>
                      <tr className={`border-b hover:bg-gray-50 ${selectedIds.has(product.id) ? 'bg-blue-50' : ''}`}>

                        {/* Checkbox */}
                        <td className="py-2 px-2">
                          <input type="checkbox" checked={selectedIds.has(product.id)} onChange={() => toggleSelect(product.id)} className="h-4 w-4 accent-gray-900 cursor-pointer" />
                        </td>

                        {/* Expand toggle */}
                        <td className="py-2 px-1">
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

                        {/* SKU */}
                        {visibleCols.sku && (
                          <td className="py-2 px-2">
                            {product.sku ? (
                              <Link
                                href={`/admin/products/${product.id}?focus=sku`}
                                className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {product.sku}
                              </Link>
                            ) : (
                              <span className="font-mono text-xs text-gray-400">—</span>
                            )}
                          </td>
                        )}

                        {/* Product */}
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                              {product.imageUrl
                                ? <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                                : <span className="text-gray-400 text-[9px]">IMG</span>}
                            </div>
                            <div>
                              <span className={`font-medium break-words block ${colW.title < 120 ? 'text-[10px]' : colW.title < 155 ? 'text-[11px]' : 'text-xs'}`}>{product.title}</span>
                              {product.carClass && (
                                <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">{product.carClass}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category (Brand) */}
                        {visibleCols.brand && (
                          <td className="py-2 px-2">
                            <span className="text-xs">{(product.categoryBrands && product.categoryBrands.length > 0) ? product.categoryBrands.join(', ') : (product.brand || '—')}</span>
                          </td>
                        )}

                        {/* Categories */}
                        {visibleCols.categories && (
                          <td className="py-2 px-2">
                            {allCats.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-[130px]">
                                {allCats.slice(0, 3).map((c) => {
                                  const cat = categories.find((cat) => cat.slug === c || cat.name === c)
                                  return cat?.pageUrl ? (
                                    <a
                                      key={c}
                                      href={cat.pageUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full hover:bg-blue-100"
                                      title={cat.pageUrl}
                                    >{c}</a>
                                  ) : (
                                    <span key={c} className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded-full">{c}</span>
                                  )
                                })}
                                {allCats.length > 3 && <span className="text-[10px] text-gray-400">+{allCats.length - 3}</span>}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                        )}

                        {/* Price */}
                        {visibleCols.price && (
                          <td className="py-2 px-2 text-right">
                            <span className="font-semibold text-xs">{product.price > 0 ? `R${product.price.toFixed(2)}` : 'POA'}</span>
                          </td>
                        )}

                        {/* ETA — inline edit */}
                        {visibleCols.eta && (
                          <td className="py-2 px-2 text-center">
                            <input
                              type="text"
                              defaultValue={product.eta || ''}
                              placeholder="TBC"
                              className="w-16 text-center text-xs px-1 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-gray-400"
                              onBlur={(e) => { if (e.target.value !== (product.eta || '')) handleInlineUpdate(product.id, 'eta', e.target.value) }}
                            />
                          </td>
                        )}

                        {/* Qty — inline edit */}
                        {visibleCols.qty && (
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              defaultValue={product.quantity}
                              min={0}
                              className="w-12 text-center text-xs px-1 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-gray-400"
                              onBlur={(e) => { const v = parseInt(e.target.value) || 0; if (v !== product.quantity) handleInlineUpdate(product.id, 'quantity', v) }}
                            />
                          </td>
                        )}

                        {/* Page URL */}
                        {visibleCols.pageUrl && <td className="py-2 px-2 min-w-[140px]">
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
                          <td className="py-2 px-2 text-center">
                            <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {product.status}
                            </span>
                          </td>
                        )}

                        {/* Actions */}
                        <td className={`py-2 px-2 sticky right-0 shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.07)] ${selectedIds.has(product.id) ? 'bg-blue-50' : 'bg-white'}`} style={{ zIndex: openActionId === product.id ? 9999 : undefined }}>
                          <div className="relative flex items-center justify-center">
                            <button
                              onClick={() => setOpenActionId(openActionId === product.id ? null : product.id)}
                              className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1"
                            >
                              Actions
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {openActionId === product.id && (
                              <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] py-1">
                                <Link
                                  href={`/admin/products/${product.id}`}
                                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                                  onClick={() => setOpenActionId(null)}
                                >
                                  ✏️ Edit
                                </Link>
                                <button
                                  onClick={() => { handleDuplicate(product); setOpenActionId(null) }}
                                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 w-full text-left"
                                >
                                  📋 Duplicate
                                </button>
                                <button
                                  onClick={() => { handlePreOrder(product); setOpenActionId(null) }}
                                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 w-full text-left"
                                >
                                  📲 Pre-Order
                                </button>
                                <button
                                  onClick={() => { handleOrder(product); setOpenActionId(null) }}
                                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 w-full text-left"
                                >
                                  💬 WhatsApp Order
                                </button>
                                <div className="border-t border-gray-100 my-1" />
                                <button
                                  onClick={() => { handleDelete(product.id); setOpenActionId(null) }}
                                  className="flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 w-full text-left"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            )}
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
