'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanyInfo {
  name: string; address: string; city: string; postalCode: string
  country: string; phone: string; email: string; vatNumber: string
}

interface ProductRef {
  id: string; sku: string; title: string; brand: string; price: number; quantity: number
  unit: string; category: string; preOrderPrice?: number | null
  categoryBrands: string[]; itemCategories: string[]
  salesAccount: string[]; purchaseAccount: string[]
}

interface PricelistEntry {
  supplierId: string; sku: string; wholesalePrice: number; shopQty: number
}

interface SupplierContact {
  id: string; name: string; code: string
}

interface WsItem {
  id: string
  sku: string
  skuSearch: string
  description: string
  unit: string
  category: string
  inStock: number
  retailPrice: number
  preOrderPrice: number
  qty: number
  wholesalePrice: number
  retailOverride: string
  sentToInventory?: boolean
}

interface NewSkuRow {
  wsId: string        // original WsItem.id
  sku: string
  description: string
  brand: string
  category: string
  unit: string
  retailPrice: number
  costPrice: number
  qty: number
}

interface WsSheet {
  id: string
  name: string
  supplier: string
  date: string        // ISO YYYY-MM-DD
  archived: boolean
  currency: string
  exchangeRate: number
  markupPct: number
  shippingPct: number
  vatPct: number
  finalCurrency: string
  finalExRate: number
  finalShippingCost: number
  finalCustomsCost: number
  finalMarkupPct: number
  finalVatPct: number
  trackingNumber?: string
  items: WsItem[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCY_DEFAULTS: Record<string, number> = {
  USD: 18.5, EUR: 20.0, GBP: 23.5, SGD: 13.5, CNY: 2.55, HKD: 2.4, ZAR: 1.0,
}

const DISPLAY_CURRENCIES = ['USD', 'EUR', 'GBP', 'SGD', 'CNY', 'HKD']

function newWsItem(): WsItem {
  return {
    id: `ws_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sku: '', skuSearch: '', description: '',
    unit: '', category: '',
    inStock: 0, retailPrice: 0, preOrderPrice: 0,
    qty: 1, wholesalePrice: 0, retailOverride: '', sentToInventory: false,
  }
}

function newSheetId() {
  return `ws_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

function formatDisplayDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorksheetPage() {
  const searchParams = useSearchParams()
  const initialSheetId = searchParams.get('id') ?? undefined

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '', address: '', city: '', postalCode: '', country: '', phone: '', email: '', vatNumber: '',
  })
  const [products, setProducts] = useState<ProductRef[]>([])
  const [suppliers, setSuppliers] = useState<SupplierContact[]>([])
  const [trackingUrlTemplate, setTrackingUrlTemplate] = useState('https://www.fedex.com/fedextrack/?trknbr={tracking}')

  const load = useCallback(async () => {
    try {
      const [tmplRes, prodRes, supRes, rulesRes] = await Promise.all([
        fetch('/api/admin/company-info'),
        fetch('/api/admin/products'),
        fetch('/api/admin/supplier-contacts'),
        fetch('/api/admin/site-rules'),
      ])
      if (tmplRes.ok) setCompanyInfo(await tmplRes.json())

      if (prodRes.ok) {
        const raw: any[] = await prodRes.json()
        setProducts(raw.map((p) => ({
          id: p.id, sku: p.sku || '', title: p.title || '',
          brand: p.brand || '', price: Number(p.price) || 0,
          quantity: Number(p.quantity) || 0,
          unit: Array.isArray(p.itemCategories) ? p.itemCategories.join(' / ') : (p.itemCategories || ''),
          category: Array.isArray(p.categoryBrands) ? p.categoryBrands.join(' / ') : (p.categoryBrands || ''),
          categoryBrands: Array.isArray(p.categoryBrands) ? p.categoryBrands : [],
          itemCategories: Array.isArray(p.itemCategories) ? p.itemCategories : [],
          salesAccount: Array.isArray(p.salesAccount) ? p.salesAccount : [],
          purchaseAccount: Array.isArray(p.purchaseAccount) ? p.purchaseAccount : [],
        })).filter((p) => p.sku || p.title))
      }

      if (supRes.ok) setSuppliers(await supRes.json())

      if (rulesRes.ok) {
        const rules: any[] = await rulesRes.json()
        const trackingRule = rules.find((r: any) => r.id === 'worksheet_tracking_url')
        if (trackingRule?.value) setTrackingUrlTemplate(trackingRule.value)
      }
    } catch (e) {
      console.error('Worksheet load error', e)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <WorksheetEditor
        companyInfo={companyInfo}
        products={products}
        suppliers={suppliers}
        onRefresh={load}
        initialSheetId={initialSheetId}
        trackingUrlTemplate={trackingUrlTemplate}
      />
    </div>
  )
}

// ─── Worksheet Editor ─────────────────────────────────────────────────────────

function WorksheetEditor({
  companyInfo, products, suppliers, onRefresh, initialSheetId, trackingUrlTemplate,
}: {
  companyInfo: CompanyInfo
  products: ProductRef[]
  suppliers: SupplierContact[]
  onRefresh: () => void
  initialSheetId?: string
  trackingUrlTemplate: string
}) {
  // ── Worksheet identity ──
  const [worksheetId, setWorksheetId] = useState(newSheetId)
  const [supplier, setSupplier] = useState('')
  const [worksheetDate, setWorksheetDate] = useState(() => new Date().toISOString().slice(0, 10))

  // ── Tracking number ──
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackingEditMode, setTrackingEditMode] = useState(false)

  function getTrackingUrl(tracking: string): string {
    if (!tracking) return ''
    if (tracking.startsWith('http://') || tracking.startsWith('https://')) return tracking
    if (!trackingUrlTemplate) return ''
    return trackingUrlTemplate.replace('{tracking}', encodeURIComponent(tracking))
  }

  // ── Costing Calculator ──
  const [currency, setCurrency] = useState('USD')
  const [exchangeRate, setExchangeRate] = useState(18.5)
  const [markupPct, setMarkupPct] = useState(0)
  const [shippingPct, setShippingPct] = useState(0)
  const [vatPct, setVatPct] = useState(0)

  // ── Final Costing Calculator ──
  const [finalCurrency, setFinalCurrency] = useState('USD')
  const [finalExRate, setFinalExRate] = useState(18.5)
  const [finalShippingCost, setFinalShippingCost] = useState(0)
  const [finalCustomsCost, setFinalCustomsCost] = useState(0)
  const [finalMarkupPct, setFinalMarkupPct] = useState(30)
  const [finalVatPct, setFinalVatPct] = useState(0)

  // ── Items ──
  const [items, setItems] = useState<WsItem[]>([newWsItem()])

  // ── FX rates ──
  const [fxRates, setFxRates] = useState<Record<string, number>>(CURRENCY_DEFAULTS)
  const [fxBase, setFxBase] = useState('ZAR')
  const [fxUpdated, setFxUpdated] = useState('')
  const [fxLoading, setFxLoading] = useState(false)

  // ── Worksheets list ──
  const [allWorksheets, setAllWorksheets] = useState<WsSheet[]>([])
  const [showMySheets, setShowMySheets] = useState(true)
  const [showArchive, setShowArchive] = useState(false)
  const [openArchiveSupplier, setOpenArchiveSupplier] = useState<string | null>(null)
  const [openActiveSupplier, setOpenActiveSupplier] = useState<string | null>(null)

  // ── Save status ──
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // ── Pricelist ──
  const [pricelist, setPricelist] = useState<PricelistEntry[]>([])

  useEffect(() => {
    const sup = suppliers.find((s) => s.name === supplier)
    if (!sup) { setPricelist([]); return }
    fetch(`/api/admin/inventory-pricelists?supplierId=${sup.id}`)
      .then((r) => r.ok ? r.json() : [])
      .then(setPricelist)
      .catch(() => setPricelist([]))
  }, [supplier, suppliers])

  // ── Backfill retailPrice/inStock when products load ──
  useEffect(() => {
    if (products.length === 0) return
    setItems((prev) => prev.map((it) => {
      if (it.retailPrice > 0 && it.inStock > 0) return it
      const prod = products.find((p) => p.sku === it.sku)
      if (!prod) return it
      return {
        ...it,
        retailPrice: it.retailPrice || prod.price,
        preOrderPrice: it.preOrderPrice || prod.preOrderPrice || 0,
        inStock: it.inStock || prod.quantity,
      }
    }))
  }, [products])

  // ── Product Info Modal ──
  const [showProductInfo, setShowProductInfo] = useState(false)

  // ── Dropdown row states ──
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [activeSkuRow, setActiveSkuRow] = useState<string | null>(null)
  const [showNewMenu, setShowNewMenu] = useState(false)
  const newMenuRef = useRef<HTMLDivElement>(null)

  async function syncWholesalePricelist(): Promise<boolean> {
    const sup = suppliers.find((s) => s.name === supplier)
      || suppliers.find((s) => s.name.toLowerCase() === supplier.toLowerCase())
    if (!sup) return false
    const priceEntries = items
      .filter((it) => it.sku && it.wholesalePrice > 0)
      .map((it) => ({
        supplierId: sup.id,
        sku: it.sku.trim(),
        wholesalePrice: it.wholesalePrice,
        shopQty: it.qty,
      }))
    if (priceEntries.length === 0) return true
    const res = await fetch('/api/admin/inventory-pricelists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: priceEntries }),
    })
    return res.ok
  }

  // ── Update Final Costing (also syncs wholesale pricelist) ──
  const [updatingCosts, setUpdatingCosts] = useState(false)
  const [costsUpdated, setCostsUpdated] = useState(false)

  async function updateFinalCosting() {
    const toUpdate = items.filter((it) => it.sku && it.wholesalePrice > 0)
    if (!toUpdate.length) return
    setUpdatingCosts(true)
    const errors: string[] = []
    let updated = 0
    try {
      for (const it of toUpdate) {
        const skuLower = it.sku.trim().toLowerCase()
        const prod = products.find((p) => p.sku.trim().toLowerCase() === skuLower)
        if (!prod) { errors.push(`SKU ${it.sku} not found in products`); continue }
        const finalLanded = Math.round(calcFinalLanded(it.wholesalePrice) * 100) / 100
        const retailZAR = Math.round((it.retailPrice || 0) * 100) / 100
        const preOrderZAR = Math.round(calcRetail(it.wholesalePrice) * 100) / 100
        const patch: Record<string, number> = {}
        if (finalLanded > 0) patch.costPerItem = finalLanded
        if (retailZAR > 0) patch.price = retailZAR
        if (preOrderZAR > 0) patch.preOrderPrice = preOrderZAR
        if (Object.keys(patch).length === 0) continue
        const res = await fetch(`/api/admin/products/${prod.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
        if (!res.ok) {
          const msg = await res.text().catch(() => res.status.toString())
          errors.push(`${it.sku}: ${msg}`)
        } else {
          updated++
        }
      }
      await syncWholesalePricelist()
      await saveWorksheet()
      if (errors.length > 0) {
        alert(`Updated ${updated} products.\n\nFailed:\n${errors.join('\n')}`)
      } else {
        setCostsUpdated(true)
        setTimeout(() => setCostsUpdated(false), 3000)
      }
    } finally {
      setUpdatingCosts(false)
    }
  }

  // ── Stock verification & send to inventory ──
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [sendingInventory, setSendingInventory] = useState(false)
  const [inventorySent, setInventorySent] = useState(false)
  const [inventoryMissed, setInventoryMissed] = useState<string[]>([])
  // ── New SKU modal (first-time inventory upload) ──
  const [showNewSkuModal, setShowNewSkuModal] = useState(false)
  const [newSkuModalItems, setNewSkuModalItems] = useState<NewSkuRow[]>([])
  const [savingNewSkus, setSavingNewSkus] = useState(false)
  // ── Confirm update dialog (existing SKU, 2nd time) ──
  const [showConfirmUpdate, setShowConfirmUpdate] = useState(false)
  const [confirmUpdateItems, setConfirmUpdateItems] = useState<WsItem[]>([])
  const [confirmingUpdate, setConfirmingUpdate] = useState(false)
  // ── Send to Supplier Order ──
  const [showSupplierOrderModal, setShowSupplierOrderModal] = useState(false)
  // ── Add to Database (no stock update) ──
  const [showAddToDbModal, setShowAddToDbModal] = useState(false)
  const [addToDbItems, setAddToDbItems] = useState<NewSkuRow[]>([])
  const [savingAddToDb, setSavingAddToDb] = useState(false)

  function toggleCheck(id: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function sendToInventory() {
    const toSend = items.filter((it) => checkedItems.has(it.id) && it.sku && it.qty > 0)
    if (!toSend.length) return

    const newSkus: NewSkuRow[] = []
    const existingWsItems: WsItem[] = []

    for (const it of toSend) {
      const prod = products.find((p) => p.sku.trim().toLowerCase() === it.sku.trim().toLowerCase())
      if (!prod) {
        // New SKU — pre-fill from worksheet values
        const finalLanded = Math.round(calcFinalLanded(it.wholesalePrice) * 100) / 100
        const retailZAR = it.retailPrice > 0
          ? it.retailPrice
          : Math.round(calcFinalRetail(it.wholesalePrice) * 100) / 100
        newSkus.push({
          wsId: it.id,
          sku: it.sku,
          description: it.description,
          brand: '',
          category: it.category || '',
          unit: it.unit || '',
          retailPrice: retailZAR,
          costPrice: finalLanded,
          qty: it.qty,
        })
      } else {
        existingWsItems.push(it)
      }
    }

    if (newSkus.length > 0) {
      setNewSkuModalItems(newSkus)
      setShowNewSkuModal(true)
    }
    if (existingWsItems.length > 0) {
      setConfirmUpdateItems(existingWsItems)
      setShowConfirmUpdate(true)
    }
  }

  async function handleSaveNewSkus(rows: NewSkuRow[]) {
    setSavingNewSkus(true)
    const sentIds: string[] = []
    const errors: string[] = []
    try {
      for (const row of rows) {
        const body: Record<string, any> = {
          sku: row.sku,
          title: row.description || row.sku,
          brand: row.brand,
          description: '',
          price: row.retailPrice,
          cost_per_item: row.costPrice,
          quantity: row.qty,
          status: 'active',
          categoryBrands: row.category ? [row.category] : [],
          itemCategories: row.unit ? [row.unit] : [],
        }
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) { errors.push(row.sku); continue }
        sentIds.push(row.wsId)
      }

      // Save pricelist entries for new products
      const sup = suppliers.find((s) => s.name === supplier)
      if (sup && sentIds.length > 0) {
        const priceEntries = rows
          .filter((r) => sentIds.includes(r.wsId))
          .map((r) => {
            const wsIt = items.find((it) => it.id === r.wsId)
            return { supplierId: sup.id, sku: r.sku, wholesalePrice: wsIt?.wholesalePrice || 0, shopQty: r.qty }
          })
          .filter((e) => e.wholesalePrice > 0)
        if (priceEntries.length > 0) {
          await fetch('/api/admin/inventory-pricelists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entries: priceEntries }),
          }).catch(() => {})
        }
      }

      if (sentIds.length > 0) {
        setItems((prev) => prev.map((it) => sentIds.includes(it.id) ? { ...it, sentToInventory: true } : it))
        setCheckedItems((prev) => { const next = new Set(prev); sentIds.forEach((id) => next.delete(id)); return next })
      }
      if (errors.length > 0) alert(`Failed to create: ${errors.join(', ')}`)
      setShowNewSkuModal(false)
      setNewSkuModalItems([])
      await onRefresh()
    } finally {
      setSavingNewSkus(false)
    }
  }

  // ── Add to Database (creates product record, no stock update) ──────────────
  function addToDatabase() {
    const newSkus: NewSkuRow[] = []
    for (const it of items) {
      if (!it.sku) continue
      const inDb = products.some((p) => p.sku.trim().toLowerCase() === it.sku.trim().toLowerCase())
      if (inDb) continue
      const finalLanded = Math.round(calcFinalLanded(it.wholesalePrice) * 100) / 100
      const retailZAR = it.retailPrice > 0
        ? it.retailPrice
        : Math.round(calcFinalRetail(it.wholesalePrice) * 100) / 100
      newSkus.push({
        wsId: it.id,
        sku: it.sku,
        description: it.description,
        brand: '',
        category: it.category || '',
        unit: it.unit || '',
        retailPrice: retailZAR,
        costPrice: finalLanded,
        qty: 0,
      })
    }
    if (!newSkus.length) { alert('All items in this worksheet are already in the database.'); return }
    setAddToDbItems(newSkus)
    setShowAddToDbModal(true)
  }

  async function handleSaveAddToDb(rows: NewSkuRow[]) {
    setSavingAddToDb(true)
    const errors: string[] = []
    try {
      for (const row of rows) {
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sku: row.sku,
            title: row.description || row.sku,
            brand: row.brand,
            description: '',
            price: row.retailPrice,
            cost_per_item: row.costPrice,
            quantity: 0,
            status: 'active',
            categoryBrands: row.category ? [row.category] : [],
            itemCategories: row.unit ? [row.unit] : [],
          }),
        })
        if (!res.ok) errors.push(row.sku)
      }
      if (errors.length > 0) alert(`Failed to add: ${errors.join(', ')}`)
      setShowAddToDbModal(false)
      setAddToDbItems([])
      await onRefresh()
    } finally {
      setSavingAddToDb(false)
    }
  }

  async function handleConfirmUpdate(addQty: boolean) {
    setConfirmingUpdate(true)
    const errors: string[] = []
    let updated = 0
    try {
      for (const it of confirmUpdateItems) {
        const prod = products.find((p) => p.sku.trim().toLowerCase() === it.sku.trim().toLowerCase())
        if (!prod) { errors.push(it.sku); continue }
        const finalLanded = Math.round(calcFinalLanded(it.wholesalePrice) * 100) / 100
        const retailZAR = Math.round((it.retailPrice || 0) * 100) / 100
        const preOrderZAR = Math.round(calcFinalRetail(it.wholesalePrice) * 100) / 100
        const patch: Record<string, number> = {}
        if (finalLanded > 0) patch.costPerItem = finalLanded
        if (retailZAR > 0) patch.price = retailZAR
        if (preOrderZAR > 0) patch.preOrderPrice = preOrderZAR
        if (addQty && it.qty > 0) {
          patch.quantity = (prod.quantity ?? 0) + it.qty
        }
        if (Object.keys(patch).length === 0) { updated++; continue }
        const res = await fetch(`/api/admin/products/${prod.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
        if (!res.ok) errors.push(it.sku)
        else updated++
      }
      const sentIds = confirmUpdateItems.map((it) => it.id)
      setItems((prev) => prev.map((it) => sentIds.includes(it.id) ? { ...it, sentToInventory: true } : it))
      setCheckedItems((prev) => { const next = new Set(prev); sentIds.forEach((id) => next.delete(id)); return next })
      if (errors.length > 0) alert(`Updated ${updated}. Failed: ${errors.join(', ')}`)
      setShowConfirmUpdate(false)
      setConfirmUpdateItems([])
    } finally {
      setConfirmingUpdate(false)
    }
  }

  // ── FX fetch ──
  const fetchRates = useCallback(async () => {
    setFxLoading(true)
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/ZAR')
      const data = await res.json()
      const raw = data.rates as Record<string, number>
      const zarRates: Record<string, number> = { ZAR: 1 }
      for (const [cur, r] of Object.entries(raw)) {
        if (r > 0) zarRates[cur] = parseFloat((1 / r).toFixed(4))
      }
      setFxRates(zarRates)
      setFxUpdated(new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }))
    } catch { /* keep defaults */ } finally {
      setFxLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRates()
    const t = setInterval(fetchRates, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [fetchRates])

  // ── Load worksheets ──
  const refreshSheets = useCallback(async () => {
    const res = await fetch('/api/admin/worksheets')
    if (res.ok) setAllWorksheets(await res.json())
  }, [])

  useEffect(() => { refreshSheets() }, [refreshSheets])

  // ── Auto-load sheet from URL ?id= param ──
  const initialLoadDone = useRef(false)
  useEffect(() => {
    if (!initialSheetId || initialLoadDone.current || allWorksheets.length === 0) return
    const target = allWorksheets.find((s) => s.id === initialSheetId)
    if (target) {
      loadWorksheet(target)
      initialLoadDone.current = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allWorksheets, initialSheetId])

  // ── Close new menu on outside click ──
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setShowNewMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ── FX display helper ──
  function getDisplayRate(cur: string): number {
    const curToZar = fxRates[cur] ?? CURRENCY_DEFAULTS[cur] ?? 1
    if (fxBase === 'ZAR') return curToZar
    const baseToZar = fxRates[fxBase] ?? CURRENCY_DEFAULTS[fxBase] ?? 1
    return parseFloat((curToZar / baseToZar).toFixed(4))
  }

  function getDisplaySymbol(): string {
    return fxBase === 'ZAR' ? 'R' : fxBase
  }

  // ── Costing functions ──
  function calcLanded(w: number) { return w * exchangeRate * (1 + shippingPct / 100) }
  function calcRetail(w: number) { return calcLanded(w) * (1 + markupPct / 100) * (1 + vatPct / 100) }

  // Final costing — derived percentages from total costs
  const totalWholesaleZAR = items
    .filter((it) => it.wholesalePrice > 0)
    .reduce((sum, it) => sum + it.qty * it.wholesalePrice * finalExRate, 0)
  const shippingPctCalc = totalWholesaleZAR > 0 ? (finalShippingCost / totalWholesaleZAR) * 100 : 0
  const customsPctCalc = totalWholesaleZAR > 0 ? (finalCustomsCost / totalWholesaleZAR) * 100 : 0

  function calcFinalLanded(w: number) { return w * finalExRate * (1 + (shippingPctCalc + customsPctCalc) / 100) }
  // Markup applied on top of Final Landed: (wholesale + shipping + customs) × (1 + markup%)
  function calcFinalRetail(w: number) { return calcFinalLanded(w) * (1 + finalMarkupPct / 100) * (1 + finalVatPct / 100) }
  function fmtFC(n: number) { return n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

  // ── Items ──
  function updateItem(id: string, patch: Partial<WsItem>) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, ...patch } : it))
  }
  function addItem() { setItems((prev) => [...prev, newWsItem()]) }
  function insertAfter(id: string) {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === id)
      if (idx < 0) return [...prev, newWsItem()]
      const next = [...prev]
      next.splice(idx + 1, 0, newWsItem())
      return next
    })
  }
  function removeItem(id: string) { setItems((prev) => prev.filter((it) => it.id !== id)) }
  const hasItems = items.some((it) => it.sku || it.description)

  // ── Filtered dropdowns ──
  function filteredProducts(search: string) {
    const q = search.toLowerCase()
    return products.filter((p) =>
      p.sku.toLowerCase().includes(q) || p.title.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
    ).slice(0, 12)
  }
  // ── Worksheet persistence ──
  function currentSheetData(): WsSheet {
    return {
      id: worksheetId,
      name: supplier || `Worksheet ${formatDisplayDate(worksheetDate)}`,
      supplier,
      date: worksheetDate,
      archived: false,
      currency, exchangeRate, markupPct, shippingPct, vatPct,
      finalCurrency, finalExRate, finalShippingCost, finalCustomsCost, finalMarkupPct, finalVatPct,
      trackingNumber,
      items: items.map((it) => ({ ...it, skuSearch: '' })),
    }
  }

  async function saveWorksheet() {
    setSaveStatus('saving')
    try {
      await fetch('/api/admin/worksheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentSheetData()),
      })
      // Sync retail prices back to products
      const toSync = items.filter((it) => it.sku && it.retailPrice > 0)
      for (const it of toSync) {
        const prod = products.find((p) => p.sku.trim().toLowerCase() === it.sku.trim().toLowerCase())
        if (!prod) continue
        await fetch(`/api/admin/products/${prod.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ price: Math.round(it.retailPrice * 100) / 100 }),
        })
      }
      // Sync wholesale price (supplier currency) to inventory pricelist
      await syncWholesalePricelist()
      await refreshSheets()
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch { setSaveStatus('idle') }
  }

  function loadWorksheet(sheet: WsSheet) {
    setWorksheetId(sheet.id)
    setSupplier(sheet.supplier || '')
    setWorksheetDate(sheet.date)
    setCurrency(sheet.currency)
    setExchangeRate(sheet.exchangeRate)
    setMarkupPct(sheet.markupPct)
    setShippingPct(sheet.shippingPct)
    setVatPct(sheet.vatPct)
    setFinalCurrency(sheet.finalCurrency)
    setFinalExRate(sheet.finalExRate)
    setFinalShippingCost(sheet.finalShippingCost ?? 0)
    setFinalCustomsCost(sheet.finalCustomsCost ?? 0)
    setFinalMarkupPct(sheet.finalMarkupPct)
    setFinalVatPct(sheet.finalVatPct)
    setTrackingNumber(sheet.trackingNumber ?? '')
    setTrackingEditMode(false)
    setItems(sheet.items.length > 0 ? sheet.items.map((it) => {
      const prod = products.find((p) => p.sku === it.sku)
      return {
        ...it,
        skuSearch: '',
        unit: it.unit ?? prod?.unit ?? '',
        category: it.category ?? prod?.category ?? '',
        inStock: it.inStock ?? prod?.quantity ?? 0,
        retailPrice: it.retailPrice || prod?.price || 0,
        preOrderPrice: it.preOrderPrice || prod?.preOrderPrice || 0,
      }
    }) : [newWsItem()])
    setShowArchive(false)
    setCheckedItems(new Set())
  }

  function startNewWorksheet() {
    setWorksheetId(newSheetId())
    setSupplier('')
    setWorksheetDate(new Date().toISOString().slice(0, 10))
    setCurrency('USD')
    setExchangeRate(fxRates['USD'] ?? CURRENCY_DEFAULTS['USD'])
    setMarkupPct(0)
    setShippingPct(0)
    setVatPct(0)
    setFinalCurrency('USD')
    setFinalExRate(fxRates['USD'] ?? CURRENCY_DEFAULTS['USD'])
    setFinalShippingCost(0)
    setFinalCustomsCost(0)
    setFinalMarkupPct(30)
    setFinalVatPct(0)
    setTrackingNumber('')
    setTrackingEditMode(false)
    setItems([newWsItem()])
  }

  async function archiveAndNew() {
    const sheet = { ...currentSheetData(), archived: true }
    await fetch('/api/admin/worksheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sheet),
    })
    await refreshSheets()
    startNewWorksheet()
    setShowNewMenu(false)
  }

  async function saveAndNew() {
    await saveWorksheet()
    startNewWorksheet()
    setShowNewMenu(false)
  }

  async function deleteWorksheet(id: string) {
    await fetch(`/api/admin/worksheets/${id}`, { method: 'DELETE' })
    await refreshSheets()
  }

  // ── Group worksheets ──
  const activeSheets = allWorksheets.filter((s) => !s.archived)
  const archivedSheets = allWorksheets.filter((s) => s.archived)

  function groupBySupplier(sheets: WsSheet[]): Record<string, WsSheet[]> {
    const g: Record<string, WsSheet[]> = {}
    for (const s of sheets) {
      const k = s.supplier || 'No Supplier'
      if (!g[k]) g[k] = []
      g[k].push(s)
    }
    return g
  }

  const activeBySupplier = groupBySupplier(activeSheets)
  const archivedBySupplier = groupBySupplier(archivedSheets)

  // ── CSV ──
  function downloadCSV() {
    const headers = ['#', 'SKU', 'Description', 'Retail (ZAR)', 'In Stock', 'Unit', 'Category', 'Qty',
      `Wholesale (${currency})`, 'Landed (ZAR)', 'Calc Retail (ZAR)',
      'Final Landed (ZAR)', 'Landed Retail (ZAR)', `Total (${currency})`]
    const rows = items.filter((it) => it.sku || it.description).map((it, i) => {
      const landed = calcLanded(it.wholesalePrice)
      const fLanded = calcFinalLanded(it.wholesalePrice)
      const fRetail = calcFinalRetail(it.wholesalePrice)
      const totalCur = it.qty * it.wholesalePrice
      return [i + 1, it.sku, `"${it.description.replace(/"/g, '""')}"`,
        it.retailPrice > 0 ? it.retailPrice.toFixed(2) : '',
        it.inStock ?? 0,
        `"${(it.unit || '').replace(/"/g, '""')}"`, `"${(it.category || '').replace(/"/g, '""')}"`,
        it.qty, it.wholesalePrice > 0 ? it.wholesalePrice.toFixed(2) : '',
        landed.toFixed(2), it.wholesalePrice > 0 ? calcRetail(it.wholesalePrice).toFixed(2) : '',
        it.wholesalePrice > 0 ? fLanded.toFixed(2) : '',
        it.wholesalePrice > 0 ? fRetail.toFixed(2) : '',
        it.wholesalePrice > 0 ? totalCur.toFixed(2) : '']
    })
    const filledForTotal = items.filter((it) => it.wholesalePrice > 0)
    const grandTotalCur = filledForTotal.reduce((s, it) => s + it.qty * it.wholesalePrice, 0)
    const grandTotalZAR = filledForTotal.reduce((s, it) => s + it.qty * it.wholesalePrice * exchangeRate, 0)
    const totalRow = ['', '', '', '', '', '', '', 'TOTAL', '', '', '', '', '', `${grandTotalCur.toFixed(2)} (R ${grandTotalZAR.toFixed(2)})`]
    const csv = [headers.join(','), ...rows.map((r) => r.join(',')), totalRow.join(',')].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `worksheet-${supplier || 'export'}-${worksheetDate}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  // ── PDF ──
  function downloadPDF() {
    const date = formatDisplayDate(worksheetDate)
    const pdfFilledItems = items.filter((it) => it.sku || it.description)
    const rows = pdfFilledItems.map((it, i) => {
      const landed = calcLanded(it.wholesalePrice)
      const retail = it.retailOverride !== '' ? Number(it.retailOverride) : calcRetail(it.wholesalePrice)
      const fLanded = it.wholesalePrice > 0 ? fmtFC(calcFinalLanded(it.wholesalePrice)) : '—'
      const fRetail = it.wholesalePrice > 0 ? fmtFC(calcFinalRetail(it.wholesalePrice)) : '—'
      const totalCur = it.wholesalePrice > 0 ? fmtFC(it.qty * it.wholesalePrice) : '—'
      return `<tr>
        <td>${i + 1}</td><td style="font-family:monospace">${it.sku || '—'}</td>
        <td>${it.description || '—'}</td>
        <td style="text-align:right">${it.retailPrice > 0 ? 'R ' + it.retailPrice.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</td>
        <td style="text-align:center">${it.inStock ?? 0}</td>
        <td style="text-align:center">${it.qty}</td>
        <td style="text-align:right">${currency} ${fmtFC(it.wholesalePrice)}</td>
        <td style="text-align:right">R ${fmtFC(landed)}</td>
        <td style="text-align:right;font-weight:700">R ${fmtFC(retail)}</td>
        <td style="text-align:right;color:#065f46">R ${fLanded}</td>
        <td style="text-align:right;font-weight:700;color:#065f46">R ${fRetail}</td>
        <td style="text-align:right;font-weight:700;color:#1d4ed8">${currency} ${totalCur}</td>
      </tr>`
    }).join('')
    const pdfFilledPriced = pdfFilledItems.filter((it) => it.wholesalePrice > 0)
    const pdfTotalCur = pdfFilledPriced.reduce((s, it) => s + it.qty * it.wholesalePrice, 0)
    const pdfTotalZAR = pdfFilledPriced.reduce((s, it) => s + it.qty * it.wholesalePrice * exchangeRate, 0)
    const totalsRow = pdfFilledPriced.length > 0 ? `<tr style="border-top:2px solid #111;background:#f9fafb;font-weight:700">
      <td colspan="11" style="text-align:right;padding:6px 10px;font-size:11px;text-transform:uppercase;color:#6b7280">Total</td>
      <td style="text-align:right;padding:6px 6px;color:#1d4ed8">${currency} ${fmtFC(pdfTotalCur)}<br/><span style="color:#374151;font-size:9px">R ${fmtFC(pdfTotalZAR)}</span></td>
    </tr>` : ''

    const companyBlock = companyInfo.name
      ? `<p style="font-weight:700">${companyInfo.name}</p>
         ${companyInfo.address ? `<p style="color:#6b7280;font-size:12px">${companyInfo.address}</p>` : ''}
         ${companyInfo.phone ? `<p style="color:#6b7280;font-size:12px">${companyInfo.phone}</p>` : ''}
         ${companyInfo.email ? `<p style="color:#6b7280;font-size:12px">${companyInfo.email}</p>` : ''}`
      : ''

    const html = `<!DOCTYPE html><html><head>
  <meta charset="utf-8"><title>Work Sheet — ${supplier || date}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,sans-serif;padding:15mm;font-size:11px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}
    .meta{background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:8px 12px;margin-bottom:16px;display:flex;gap:20px;flex-wrap:wrap}
    .meta span{color:#6b7280}.meta strong{color:#111827}
    table{width:100%;border-collapse:collapse;font-size:10px}
    thead tr{border-bottom:2px solid #111}
    th{padding:5px 6px;text-align:left;text-transform:uppercase;font-size:9px;color:#6b7280;font-weight:700}
    th.r{text-align:right}th.c{text-align:center}
    tbody tr{border-bottom:1px solid #f3f4f6}
    tbody tr:nth-child(even){background:#f9fafb}
    td{padding:5px 6px}
    @page{size:A3 landscape;margin:0}
  </style>
</head><body>
  <div class="header">
    <div>${companyBlock}</div>
    <div style="text-align:right">
      <p style="font-size:20px;font-weight:800">WORK SHEET</p>
      ${supplier ? `<p style="font-size:13px;font-weight:600;color:#1d4ed8;margin-top:2px">${supplier}</p>` : ''}
      <p style="color:#6b7280;margin-top:2px">Date: ${date}</p>
    </div>
  </div>
  <div class="meta">
    <div><span>Currency </span><strong>${currency}</strong></div>
    <div><span>Ex Rate </span><strong>1 ${currency} = R${exchangeRate}</strong></div>
    <div><span>Shipping &amp; Customs </span><strong>${shippingPct}%</strong></div>
    <div><span>Markup </span><strong>${markupPct}%</strong></div>
    <div><span>VAT </span><strong>${vatPct}%</strong></div>
  </div>
  <div class="meta" style="background:#ecfdf5;border-color:#a7f3d0">
    <div><span style="color:#065f46">Final Currency </span><strong>${finalCurrency}</strong></div>
    <div><span style="color:#065f46">Final Ex Rate </span><strong>1 ${finalCurrency} = R${finalExRate}</strong></div>
    <div><span style="color:#065f46">Total Shipping </span><strong>R ${fmtFC(finalShippingCost)} (${shippingPctCalc.toFixed(2)}%)</strong></div>
    <div><span style="color:#065f46">Total Customs </span><strong>R ${fmtFC(finalCustomsCost)} (${customsPctCalc.toFixed(2)}%)</strong></div>
    <div><span style="color:#065f46">Final Markup </span><strong>${finalMarkupPct}%</strong></div>
    <div><span style="color:#065f46">Final VAT </span><strong>${finalVatPct}%</strong></div>
  </div>
  <table>
    <thead><tr>
      <th style="width:28px">#</th><th>SKU</th><th>Description</th><th class="r">Retail (ZAR)</th><th class="c" style="width:50px">In Stock</th>
      <th class="c" style="width:36px">Qty</th>
      <th class="r">Wholesale (${currency})</th>
      <th class="r">Landed (ZAR)</th>
      <th class="r">Pre Order Price</th>
      <th class="r" style="color:#065f46">Final Landed</th>
      <th class="r" style="color:#065f46">Landed Retail</th>
      <th class="r" style="color:#1d4ed8">Total (${currency})</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    ${totalsRow ? `<tfoot>${totalsRow}</tfoot>` : ''}
  </table>
</body></html>`
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 350) }
  }

  const worksheetTitle = supplier || 'New Worksheet'
  const displayDate = formatDisplayDate(worksheetDate)

  return (
    <div className="space-y-4">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Sheet</h1>
          <p className="text-sm text-gray-500 mt-0.5">Costing calculator &amp; pricing worksheet</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMySheets((v) => !v)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${showMySheets ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            My Worksheets {activeSheets.length > 0 && <span className="bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 text-xs font-bold">{activeSheets.length}</span>}
          </button>
          <button
            onClick={() => setShowArchive((v) => !v)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${showArchive ? 'bg-amber-50 border-amber-200 text-amber-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
            Archive {archivedSheets.length > 0 && <span className="bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5 text-xs font-bold">{archivedSheets.length}</span>}
          </button>
          <button
            onClick={saveWorksheet}
            disabled={saveStatus === 'saving'}
            className={`flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-lg font-semibold transition-colors ${
              saveStatus === 'saved' ? 'bg-green-600 text-white' :
              saveStatus === 'saving' ? 'bg-gray-400 text-white' :
              'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {saveStatus === 'saving' ? '⏳ Saving…' : saveStatus === 'saved' ? '✓ Saved' : '💾 Save'}
          </button>
          <div className="relative" ref={newMenuRef}>
            <button
              onClick={() => setShowNewMenu((v) => !v)}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              + New
              <svg className="w-3.5 h-3.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showNewMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 w-52 py-1">
                <button onClick={() => { startNewWorksheet(); setShowNewMenu(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50">
                  <p className="font-medium text-gray-900">New Blank Worksheet</p>
                  <p className="text-xs text-gray-400">Start fresh</p>
                </button>
                <button onClick={saveAndNew}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-t border-gray-50">
                  <p className="font-medium text-gray-900">Save &amp; New</p>
                  <p className="text-xs text-gray-400">Save current then start new</p>
                </button>
                <button onClick={archiveAndNew}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-t border-gray-50">
                  <p className="font-medium text-gray-900">Archive &amp; New</p>
                  <p className="text-xs text-gray-400">Archive current then start new</p>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── My Worksheets panel ── */}
      {showMySheets && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">My Worksheets</p>
            <span className="text-xs text-gray-400">{activeSheets.length} saved</span>
          </div>
          {activeSheets.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No saved worksheets yet — save one to see it here</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {Object.entries(activeBySupplier).map(([sup, sheets]) => (
                <div key={sup}>
                  <button
                    onClick={() => setOpenActiveSupplier((v) => v === sup ? null : sup)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-800">{sup}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{sheets.length} worksheet{sheets.length !== 1 ? 's' : ''}</span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${openActiveSupplier === sup ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </button>
                  {openActiveSupplier === sup && (
                    <div className="bg-gray-50 border-t border-gray-100">
                      {sheets.map((s) => (
                        <div key={s.id} className="flex items-center justify-between px-6 py-2 border-b border-gray-100 last:border-0">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{s.name}</p>
                            <p className="text-xs text-gray-400">{formatDisplayDate(s.date)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => loadWorksheet(s)}
                              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${worksheetId === s.id ? 'bg-blue-100 text-blue-700' : 'bg-white border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'}`}
                            >
                              {worksheetId === s.id ? 'Active' : 'Load'}
                            </button>
                            <button onClick={() => deleteWorksheet(s.id)} title="Delete"
                              className="text-gray-300 hover:text-red-500 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Archive panel ── */}
      {showArchive && (
        <div className="bg-white border border-amber-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-100 flex items-center justify-between bg-amber-50">
            <p className="text-sm font-semibold text-amber-800">Archive</p>
            <span className="text-xs text-amber-600">{archivedSheets.length} archived worksheets</span>
          </div>
          {archivedSheets.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No archived worksheets yet</p>
          ) : (
            <div className="divide-y divide-amber-50">
              {Object.entries(archivedBySupplier).map(([sup, sheets]) => (
                <div key={sup}>
                  <button
                    onClick={() => setOpenArchiveSupplier((v) => v === sup ? null : sup)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-amber-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                      <span className="text-sm font-medium text-gray-800">{sup}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{sheets.length} sheet{sheets.length !== 1 ? 's' : ''}</span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${openArchiveSupplier === sup ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </button>
                  {openArchiveSupplier === sup && (
                    <div className="bg-gray-50 border-t border-amber-100">
                      {sheets.sort((a, b) => b.date.localeCompare(a.date)).map((s) => (
                        <div key={s.id} className="flex items-center justify-between px-6 py-2 border-b border-gray-100 last:border-0">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{s.name}</p>
                            <p className="text-xs text-gray-400">{formatDisplayDate(s.date)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => loadWorksheet(s)}
                              className="text-xs px-2.5 py-1 rounded-lg font-medium bg-white border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                            >
                              Load
                            </button>
                            <button onClick={() => deleteWorksheet(s.id)} title="Delete permanently"
                              className="text-gray-300 hover:text-red-500 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Active worksheet header ── */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{worksheetTitle}</h2>
          {displayDate && <p className="text-sm text-gray-500">{displayDate}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={saveWorksheet} disabled={saveStatus === 'saving'}
            className={`text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              saveStatus === 'saved' ? 'bg-green-100 text-green-700' :
              saveStatus === 'saving' ? 'bg-gray-100 text-gray-500' :
              'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? '✓ Saved' : 'Save'}
          </button>
          <button onClick={archiveAndNew}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-colors">
            Archive &amp; New
          </button>
        </div>
      </div>

      {/* ── Live Exchange Rates ── */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Live Exchange Rates →</p>
            <select
              value={fxBase}
              onChange={(e) => setFxBase(e.target.value)}
              className="text-xs font-semibold text-gray-700 border border-gray-200 rounded-md px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 uppercase"
            >
              {Object.keys(CURRENCY_DEFAULTS).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            {fxUpdated && <span className="text-xs text-gray-400">Updated {fxUpdated}</span>}
            <button onClick={fetchRates} disabled={fxLoading}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40 flex items-center gap-1">
              {fxLoading ? '⏳' : '↻'} {fxLoading ? 'Fetching…' : 'Refresh'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {DISPLAY_CURRENCIES.map((cur) => {
            const displayRate = getDisplayRate(cur)
            const symbol = getDisplaySymbol()
            const isActive = currency === cur
            return (
              <button key={cur} onClick={() => { setCurrency(cur); setExchangeRate(fxRates[cur] ?? CURRENCY_DEFAULTS[cur]) }}
                className={`rounded-xl p-3 text-center border transition-all ${isActive ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-300'}`}>
                <p className={`text-[11px] font-bold uppercase ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>{cur}</p>
                <p className={`text-lg font-bold leading-tight ${isActive ? 'text-white' : 'text-gray-900'}`}>{fxBase === 'ZAR' ? 'R' : ''}{displayRate.toFixed(2)}{fxBase !== 'ZAR' ? ` ${symbol}` : ''}</p>
                <p className={`text-[10px] ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>per 1 {cur}</p>
              </button>
            )
          })}
        </div>
        <p className="text-[10px] text-gray-400 mt-2">Click currency tile to apply to Costing Calculator · Rates via exchangerate-api.com · Auto-refresh every 5 min{fxBase !== 'ZAR' ? ` · Showing cross rates to ${fxBase}` : ''}</p>
      </div>

      {/* ── Costing Calculator ── */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3">Costing Calculator</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Currency</label>
            <select value={currency} onChange={(e) => { setCurrency(e.target.value); setExchangeRate(fxRates[e.target.value] ?? CURRENCY_DEFAULTS[e.target.value] ?? 1) }}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              {Object.keys(CURRENCY_DEFAULTS).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">1 {currency} = R</label>
            <input type="number" min={0} step={0.01} value={exchangeRate} onChange={(e) => setExchangeRate(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm w-24 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Shipping &amp; Customs %</label>
            <input type="number" min={0} step={1} value={shippingPct} onChange={(e) => setShippingPct(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm w-24 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Markup %</label>
            <input type="number" min={0} step={1} value={markupPct} onChange={(e) => setMarkupPct(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm w-20 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">VAT %</label>
            <input type="number" min={0} step={1} value={vatPct} onChange={(e) => setVatPct(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm w-20 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
      </div>

      {/* ── Final Costing Calculator ── */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">Final Costing Calculator</p>
        <p className="text-xs text-emerald-600 mb-3">
          Drives the <span className="font-semibold">Final Landed</span> and <span className="font-semibold">Landed Retail</span> columns.
          {totalWholesaleZAR > 0 && <span className="ml-2 text-emerald-700">Total wholesale: R {fmtFC(totalWholesaleZAR)}</span>}
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Currency</label>
            <select value={finalCurrency} onChange={(e) => { setFinalCurrency(e.target.value); setFinalExRate(fxRates[e.target.value] ?? CURRENCY_DEFAULTS[e.target.value] ?? 1) }}
              className="border border-emerald-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400">
              {Object.keys(CURRENCY_DEFAULTS).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">1 {finalCurrency} = R</label>
            <input type="number" min={0} step={0.01} value={finalExRate} onChange={(e) => setFinalExRate(Number(e.target.value))}
              className="border border-emerald-200 rounded-lg px-2.5 py-1.5 text-sm w-24 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>

          {/* Shipping cost input + derived % */}
          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Total Cost of Shipping (ZAR)</label>
              <input type="number" min={0} step={0.01} value={finalShippingCost || ''} placeholder="0.00"
                onChange={(e) => setFinalShippingCost(Number(e.target.value))}
                className="border border-emerald-200 rounded-lg px-2.5 py-1.5 text-sm w-36 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Shipping %</label>
              <div className="px-2.5 py-1.5 text-sm w-20 bg-emerald-100 border border-emerald-200 rounded-lg text-emerald-800 font-semibold text-center">
                {shippingPctCalc.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Customs cost input + derived % */}
          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Total Cost of Customs (ZAR)</label>
              <input type="number" min={0} step={0.01} value={finalCustomsCost || ''} placeholder="0.00"
                onChange={(e) => setFinalCustomsCost(Number(e.target.value))}
                className="border border-emerald-200 rounded-lg px-2.5 py-1.5 text-sm w-36 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Customs %</label>
              <div className="px-2.5 py-1.5 text-sm w-20 bg-emerald-100 border border-emerald-200 rounded-lg text-emerald-800 font-semibold text-center">
                {customsPctCalc.toFixed(2)}%
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Markup %</label>
            <input type="number" min={0} step={1} value={finalMarkupPct} onChange={(e) => setFinalMarkupPct(Number(e.target.value))}
              className="border border-emerald-200 rounded-lg px-2.5 py-1.5 text-sm w-20 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">VAT %</label>
            <input type="number" min={0} step={1} value={finalVatPct} onChange={(e) => setFinalVatPct(Number(e.target.value))}
              className="border border-emerald-200 rounded-lg px-2.5 py-1.5 text-sm w-20 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
        </div>
      </div>

      {/* ── Items table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Table toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5 flex-wrap">
            <p className="text-sm font-semibold text-gray-700">Items</p>
            <button onClick={() => setShowAddProduct(true)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg px-2.5 py-1 hover:bg-blue-50 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Product
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Supplier dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 whitespace-nowrap">Supplier:</span>
              <select
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[130px]"
              >
                <option value="">Select supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={sendToInventory}
              disabled={checkedItems.size === 0 || sendingInventory}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                inventorySent ? 'bg-green-600 text-white' :
                checkedItems.size > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' :
                'bg-indigo-100 text-indigo-400 cursor-not-allowed'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
              {inventorySent ? '✓ Sent!' : sendingInventory ? 'Sending…' : `Send to Inventory${checkedItems.size > 0 ? ` (${checkedItems.size})` : ''}`}
            </button>
            {inventoryMissed.length > 0 && (
              <span className="text-xs text-red-600 font-medium">
                ⚠ Not found in Products: {inventoryMissed.join(', ')}
              </span>
            )}
            <button onClick={downloadCSV} disabled={!hasItems}
              className="flex items-center gap-1.5 border border-gray-300 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M4 6h16" /></svg>
              Export CSV
            </button>
            <button onClick={downloadPDF} disabled={!hasItems}
              className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Download PDF
            </button>
            <button
              onClick={updateFinalCosting}
              disabled={updatingCosts || !items.some((it) => it.sku && it.wholesalePrice > 0)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                costsUpdated ? 'bg-green-600 text-white' :
                updatingCosts ? 'bg-gray-400 text-white' :
                'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              {costsUpdated ? '✓ Updated!' : updatingCosts ? 'Updating…' : 'Update Costing'}
            </button>
            <button
              onClick={() => setShowSupplierOrderModal(true)}
              disabled={!hasItems || !supplier}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-40"
              title={!supplier ? 'Set a supplier on this worksheet first' : ''}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Supplier Order
            </button>
            <button
              onClick={addToDatabase}
              disabled={!items.some((it) => it.sku && !products.some((p) => p.sku.trim().toLowerCase() === it.sku.trim().toLowerCase()))}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>
              Add to Database
            </button>
            <button
              onClick={() => setShowProductInfo(true)}
              disabled={!items.some((it) => it.sku)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              Update Product Info
            </button>
          </div>
        </div>
        {showProductInfo && (
          <ProductInfoModal
            items={items}
            products={products}
            onClose={() => setShowProductInfo(false)}
          />
        )}

        {/* Tracking number */}
        <div className="px-5 pt-3 pb-1 flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Tracking #</label>
          {trackingEditMode || !trackingNumber ? (
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              onBlur={() => setTrackingEditMode(false)}
              onKeyDown={(e) => { if (e.key === 'Enter') setTrackingEditMode(false) }}
              placeholder="Enter tracking number or URL…"
              autoFocus={trackingEditMode}
              className="border border-gray-200 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-72"
            />
          ) : (
            <a
              href={getTrackingUrl(trackingNumber)}
              target="_blank"
              rel="noopener noreferrer"
              onDoubleClick={(e) => { e.preventDefault(); setTrackingEditMode(true) }}
              title="Click to open tracking • Double-click to edit"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium max-w-xs truncate"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {trackingNumber}
            </a>
          )}
        </div>

        {/* Date display */}
        {displayDate && (
          <div className="px-5 pt-1 pb-1">
            <p className="text-sm font-semibold text-gray-700">{displayDate}</p>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto p-5 pt-2">
          <table className="w-full text-sm" style={{ minWidth: '1100px' }}>
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-400">
                <th className="text-left pb-2 w-6">#</th>
                <th className="text-left pb-2 px-2" style={{ minWidth: '110px' }}>SKU</th>
                <th className="text-left pb-2 px-2" style={{ minWidth: '150px' }}>Description</th>
                <th className="text-right pb-2 px-2 w-24">Retail (ZAR)</th>
                <th className="text-center pb-2 px-2 w-20">In Stock</th>
                <th className="text-center pb-2 px-1 w-8" title="Check to confirm stock received">✓</th>
                <th className="text-center pb-2 px-2 w-14">Qty</th>
                <th className="text-right pb-2 px-2" style={{ minWidth: '120px' }}>Wholesale ({currency})</th>
                <th className="text-right pb-2 px-2" style={{ minWidth: '110px' }}>Landed (ZAR)</th>
                <th className="text-right pb-2 px-2" style={{ minWidth: '110px' }}>Pre Order Price</th>
                <th className="text-right pb-2 px-2 text-emerald-500" style={{ minWidth: '110px' }}>Final Landed</th>
                <th className="text-right pb-2 px-2 text-emerald-500" style={{ minWidth: '110px' }}>Landed Retail</th>
                <th className="text-right pb-2 px-2 text-blue-500" style={{ minWidth: '120px' }}>Total ({currency})</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const landedCost = calcLanded(it.wholesalePrice)

                const skuMatches = filteredProducts(it.skuSearch || it.sku)
                const hasFinal = it.wholesalePrice > 0
                return (
                  <tr key={it.id} className="border-b border-gray-50">
                    <td className="py-2 text-xs text-gray-400">{i + 1}</td>

                    {/* SKU */}
                    <td className="py-2 px-2">
                      <div className="relative">
                        <input
                          value={it.sku || it.skuSearch}
                          onFocus={() => setActiveSkuRow(it.id)}
                          onChange={(e) => { updateItem(it.id, { sku: '', skuSearch: e.target.value }); setActiveSkuRow(it.id) }}
                          onBlur={() => { if (!it.sku && it.skuSearch) updateItem(it.id, { sku: it.skuSearch, skuSearch: '' }) }}
                          placeholder="SKU or name"
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        {activeSkuRow === it.id && skuMatches.length > 0 && (
                          <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 w-64 max-h-48 overflow-y-auto py-1">
                            {skuMatches.map((p) => (
                              <button key={p.id} type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                const plEntry = pricelist.find((e) => e.sku === p.sku)
                                updateItem(it.id, {
                                  sku: p.sku, skuSearch: '', description: p.title,
                                  unit: p.unit, category: p.category,
                                  inStock: p.quantity, retailPrice: p.price,
                                  preOrderPrice: p.preOrderPrice || 0,
                                  ...(plEntry ? { wholesalePrice: plEntry.wholesalePrice } : {}),
                                })
                                setActiveSkuRow(null)
                              }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50">
                                <span className="font-mono font-semibold text-blue-700">{p.sku}</span>
                                <span className="ml-2 text-gray-600">{p.title}</span>
                                {p.brand && <span className="ml-1 text-gray-400">· {p.brand}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-2 px-2">
                      <input
                        value={it.description}
                        onChange={(e) => updateItem(it.id, { description: e.target.value })}
                        onFocus={() => setActiveSkuRow(null)}
                        placeholder="Description"
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </td>

                    {/* Retail Price — editable */}
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-gray-400">R</span>
                        <input
                          type="number" min={0} step={0.01}
                          value={it.retailPrice || ''}
                          placeholder="0.00"
                          onChange={(e) => updateItem(it.id, { retailPrice: Number(e.target.value) })}
                          onFocus={() => setActiveSkuRow(null)}
                          className="w-24 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                    </td>

                    {/* In Stock */}
                    <td className="py-2 px-2 text-center">
                      <span className={`inline-block px-2 py-1 rounded-lg text-xs font-semibold ${it.inStock > 0 ? 'bg-green-50 text-green-700 border border-green-100' : 'text-gray-300'}`}>
                        {it.inStock > 0 ? it.inStock : '—'}
                      </span>
                    </td>

                    {/* Stock verified checkbox */}
                    <td className="py-2 px-1 text-center">
                      <input
                        type="checkbox"
                        checked={it.sentToInventory || checkedItems.has(it.id)}
                        onChange={() => !it.sentToInventory && toggleCheck(it.id)}
                        disabled={!it.sku || !!it.sentToInventory}
                        title={it.sentToInventory ? 'Sent to inventory — locked' : 'Check to confirm stock is correct'}
                        className="w-4 h-4 rounded accent-indigo-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </td>

                    {/* Qty */}
                    <td className="py-2 px-2">
                      {it.sentToInventory ? (
                        <span className="w-14 inline-block text-center px-2 py-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg">{it.qty}</span>
                      ) : (
                        <input type="number" min={1} step={1} value={it.qty}
                          onChange={(e) => updateItem(it.id, { qty: Math.max(1, Number(e.target.value)) })}
                          onFocus={() => setActiveSkuRow(null)}
                          className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      )}
                    </td>

                    {/* Wholesale */}
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-end">
                        <span className="text-xs text-gray-400 mr-1">{currency}</span>
                        <input type="number" min={0} step={0.01} value={it.wholesalePrice || ''} placeholder="0.00"
                          onChange={(e) => updateItem(it.id, { wholesalePrice: Number(e.target.value) })}
                          onFocus={() => setActiveSkuRow(null)}
                          className="w-24 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                    </td>

                    {/* Landed Cost */}
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-gray-400">R</span>
                        <span className={`w-24 px-2.5 py-1.5 text-xs text-right rounded-lg ${it.wholesalePrice > 0 ? 'text-gray-700 bg-gray-50 border border-gray-100' : 'text-gray-300'}`}>
                          {it.wholesalePrice > 0 ? fmtFC(landedCost) : '—'}
                        </span>
                      </div>
                    </td>

                    {/* Pre Order Price */}
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-gray-400">R</span>
                        <span className="w-24 text-xs text-right text-gray-700 px-2.5 py-1.5">
                          {it.wholesalePrice > 0 ? calcRetail(it.wholesalePrice).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                        </span>
                      </div>
                    </td>

                    {/* Final Landed */}
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-gray-400">R</span>
                        <span className={`w-24 px-2.5 py-1.5 text-xs text-right rounded-lg ${hasFinal ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' : 'text-gray-300'}`}>
                          {hasFinal ? fmtFC(calcFinalLanded(it.wholesalePrice)) : '—'}
                        </span>
                      </div>
                    </td>

                    {/* Landed Retail */}
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-gray-400">R</span>
                        <span className={`w-24 px-2.5 py-1.5 text-xs text-right rounded-lg font-semibold ${hasFinal ? 'text-emerald-800 bg-emerald-100 border border-emerald-200' : 'text-gray-300'}`}>
                          {hasFinal ? fmtFC(calcFinalRetail(it.wholesalePrice)) : '—'}
                        </span>
                      </div>
                    </td>

                    {/* Total Cost in currency */}
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-gray-400">{currency}</span>
                        <span className={`w-24 px-2.5 py-1.5 text-xs text-right rounded-lg font-semibold ${it.wholesalePrice > 0 ? 'text-blue-700 bg-blue-50 border border-blue-100' : 'text-gray-300'}`}>
                          {it.wholesalePrice > 0 ? fmtFC(it.qty * it.wholesalePrice) : '—'}
                        </span>
                      </div>
                    </td>

                    {/* Row actions */}
                    <td className="py-2 w-10">
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          onClick={() => insertAfter(it.id)}
                          title="Insert row below"
                          className="text-gray-300 hover:text-blue-500 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </button>
                        <button onClick={() => removeItem(it.id)} disabled={items.length === 1}
                          title="Remove row"
                          className="text-gray-300 hover:text-red-400 disabled:opacity-20 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {/* ── Totals footer ── */}
            {(() => {
              const filledItems = items.filter((it) => it.wholesalePrice > 0)
              if (filledItems.length === 0) return null
              const totalCur = filledItems.reduce((s, it) => s + it.qty * it.wholesalePrice, 0)
              const totalZAR = filledItems.reduce((s, it) => s + it.qty * it.wholesalePrice * exchangeRate, 0)
              return (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td colSpan={12} className="py-3 px-2 text-xs font-semibold text-gray-500 text-right uppercase tracking-wider pr-4">
                      Total
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs font-semibold text-gray-500">{currency}</span>
                        <span className="w-24 px-2.5 py-1.5 text-xs text-right rounded-lg font-bold text-blue-800 bg-blue-100 border border-blue-200">
                          {fmtFC(totalCur)}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-xs text-gray-400">R</span>
                        <span className="w-24 px-2.5 py-1.5 text-xs text-right rounded-lg font-semibold text-gray-700 bg-gray-100 border border-gray-200">
                          {fmtFC(totalZAR)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 w-8" />
                  </tr>
                </tfoot>
              )
            })()}
          </table>
          <button onClick={addItem}
            className="mt-3 w-full border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-500 rounded-xl py-2 text-sm transition-colors">
            + Add Row
          </button>
        </div>

        {/* Bottom action: New worksheet */}
        <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between bg-gray-50">
          <p className="text-xs text-gray-400">Changes are not auto-saved — use Save to preserve this worksheet</p>
          <div className="relative" ref={newMenuRef}>
            <button
              onClick={() => setShowNewMenu((v) => !v)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white transition-colors"
            >
              + Worksheet
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Add Product Modal ── */}
      {showAddProduct && (
        <AddProductModal
          onClose={() => setShowAddProduct(false)}
          onSaved={() => { onRefresh(); setShowAddProduct(false) }}
          suppliers={suppliers}
          brandOptions={[...new Set(products.map((p) => p.brand).filter(Boolean))].sort()}
        />
      )}

      {/* ── New SKU Modal (first-time send to inventory) ── */}
      {showNewSkuModal && (
        <NewSkuModal
          rows={newSkuModalItems}
          saving={savingNewSkus}
          onSave={handleSaveNewSkus}
          onClose={() => { setShowNewSkuModal(false); setNewSkuModalItems([]) }}
          brandOptions={[...new Set(products.map((p) => p.brand).filter(Boolean))].sort()}
          categoryOptions={[...new Set(products.map((p) => p.category).filter(Boolean))].sort()}
          unitOptions={[...new Set(products.map((p) => p.unit).filter(Boolean))].sort()}
        />
      )}

      {/* ── Supplier Order Modal ── */}
      {showSupplierOrderModal && (
        <WorksheetSupplierOrderModal
          supplierName={supplier}
          suppliers={suppliers}
          companyInfo={companyInfo}
          orderDate={worksheetDate}
          items={items.filter((it) => it.sku).map((it) => ({ sku: it.sku, description: it.description, qty: it.qty }))}
          onClose={() => setShowSupplierOrderModal(false)}
        />
      )}

      {/* ── Add to Database Modal (no stock update) ── */}
      {showAddToDbModal && (
        <NewSkuModal
          rows={addToDbItems}
          saving={savingAddToDb}
          onSave={handleSaveAddToDb}
          onClose={() => { setShowAddToDbModal(false); setAddToDbItems([]) }}
          brandOptions={[...new Set(products.map((p) => p.brand).filter(Boolean))].sort()}
          categoryOptions={[...new Set(products.map((p) => p.category).filter(Boolean))].sort()}
          unitOptions={[...new Set(products.map((p) => p.unit).filter(Boolean))].sort()}
          title="Add to Database"
          subtitle="Creates product records without updating stock quantities"
          saveLabel="Add to Database"
        />
      )}

      {/* ── Confirm Update Dialog (existing SKU — pricing only, no qty change) ── */}
      {showConfirmUpdate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Update Existing Products?</h2>
            <p className="text-sm text-gray-600 mb-4">
              The following <strong>{confirmUpdateItems.length}</strong> SKU{confirmUpdateItems.length !== 1 ? 's' : ''} already exist in inventory.
              Choose whether to also add the worksheet quantities on top of current stock.
            </p>
            <ul className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 mb-5 max-h-48 overflow-y-auto space-y-1">
              {confirmUpdateItems.map((it) => (
                <li key={it.id} className="font-mono">{it.sku}{it.description ? ` — ${it.description}` : ''}{it.qty > 0 ? ` (+${it.qty})` : ''}</li>
              ))}
            </ul>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowConfirmUpdate(false); setConfirmUpdateItems([]) }}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmUpdate(false)}
                disabled={confirmingUpdate}
                className="px-4 py-2 text-sm rounded-lg bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {confirmingUpdate ? 'Updating…' : "Don't update quantities"}
              </button>
              <button
                onClick={() => handleConfirmUpdate(true)}
                disabled={confirmingUpdate}
                className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {confirmingUpdate ? 'Updating…' : 'Yes, update Qty'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Add Product Modal ────────────────────────────────────────────────────────

function AddProductModal({
  onClose, onSaved, suppliers: initSuppliers, brandOptions,
}: {
  onClose: () => void
  onSaved: () => void
  suppliers: SupplierContact[]
  brandOptions: string[]
}) {
  const [form, setForm] = useState({
    title: '', sku: '', brand: '', description: '', price: '', cost_per_item: '',
    quantity: '', status: 'active', supplier: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Brand state: 'select' shows dropdown, 'custom' shows text input
  const [brandMode, setBrandMode] = useState<'select' | 'custom'>('select')

  // Supplier state
  const [localSuppliers, setLocalSuppliers] = useState<SupplierContact[]>(initSuppliers)
  const [showAddSupplier, setShowAddSupplier] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [addingSupplier, setAddingSupplier] = useState(false)

  function set(field: string, value: string) { setForm((f) => ({ ...f, [field]: value })) }

  async function addSupplier() {
    if (!newSupplierName.trim()) return
    setAddingSupplier(true)
    try {
      const res = await fetch('/api/admin/supplier-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSupplierName.trim(), code: newSupplierName.trim().toUpperCase().slice(0, 6) }),
      })
      if (res.ok) {
        const saved = await res.json()
        // Refresh local supplier list
        const listRes = await fetch('/api/admin/supplier-contacts')
        const updated = listRes.ok ? await listRes.json() : [...localSuppliers, saved]
        setLocalSuppliers(updated)
        set('supplier', saved.name)
        setNewSupplierName('')
        setShowAddSupplier(false)
      }
    } finally { setAddingSupplier(false) }
  }

  async function save() {
    if (!form.title.trim()) { setError('Product name is required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: form.price ? Number(form.price) : 0,
          cost_per_item: form.cost_per_item ? Number(form.cost_per_item) : null,
          quantity: form.quantity ? Number(form.quantity) : 0,
        }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to save'); return }
      onSaved()
    } catch (e: any) {
      setError(e.message)
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Add New Product</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-3">

            {/* Product Name */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Product Name *</label>
              <input autoFocus value={form.title} onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Revo Slot Car 1/32"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* SKU */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">SKU</label>
              <input value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="SKU-001"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Brand — dropdown + toggle to custom */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600">Brand</label>
                <button type="button"
                  onClick={() => { setBrandMode((m) => m === 'select' ? 'custom' : 'select'); set('brand', '') }}
                  className="text-[10px] text-blue-500 hover:text-blue-700">
                  {brandMode === 'select' ? '+ New brand' : '← Pick existing'}
                </button>
              </div>
              {brandMode === 'select' ? (
                <select value={form.brand} onChange={(e) => set('brand', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select brand…</option>
                  {brandOptions.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              ) : (
                <input value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Type new brand name"
                  className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              )}
            </div>

            {/* Retail Price */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Retail Price (ZAR)</label>
              <input type="number" min={0} step={0.01} value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="0.00"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Cost Price */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cost Price (ZAR)</label>
              <input type="number" min={0} step={0.01} value={form.cost_per_item} onChange={(e) => set('cost_per_item', e.target.value)} placeholder="0.00"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Qty */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Qty in Stock</label>
              <input type="number" min={0} value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Short description..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Supplier — dropdown + inline add */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600">Supplier</label>
                <button type="button"
                  onClick={() => setShowAddSupplier((v) => !v)}
                  className="flex items-center gap-0.5 text-[10px] text-blue-500 hover:text-blue-700">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add new supplier
                </button>
              </div>
              <select value={form.supplier} onChange={(e) => set('supplier', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select supplier…</option>
                {localSuppliers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>

              {/* Inline add new supplier */}
              {showAddSupplier && (
                <div className="mt-2 flex gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <input
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSupplier() } }}
                    placeholder="New supplier name"
                    className="flex-1 border border-blue-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="button" onClick={addSupplier} disabled={addingSupplier || !newSupplierName.trim()}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {addingSupplier ? '…' : 'Save'}
                  </button>
                  <button type="button" onClick={() => { setShowAddSupplier(false); setNewSupplierName('') }}
                    className="px-2 py-1.5 text-gray-400 hover:text-gray-600 text-xs">✕</button>
                </div>
              )}
            </div>

          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving || !form.title.trim()}
            className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Product Info Modal ────────────────────────────────────────────────────────

interface ProdInfoRow {
  wsId: string
  sku: string
  description: string
  prodId: string | null
  categoryBrands: string[]
  itemCategories: string[]
  salesAccount: string[]
  purchaseAccount: string[]
}

interface ProdOptions {
  brands: string[]
  categories: string[]
  salesAccounts: string[]
  purchaseAccounts: string[]
  brandAccountMap: Record<string, { salesAccount: string[]; purchaseAccount: string[] }>
}

function ProductInfoModal({
  items,
  products,
  onClose,
}: {
  items: WsItem[]
  products: ProductRef[]
  onClose: () => void
}) {
  const skuItems = items.filter((it) => it.sku.trim())
  const [rows, setRows] = useState<ProdInfoRow[]>([])
  const [opts, setOpts] = useState<ProdOptions>({ brands: [], categories: [], salesAccounts: [], purchaseAccounts: [], brandAccountMap: {} })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [openDrop, setOpenDrop] = useState<string | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  // Brand account setup state
  const [setupMap, setSetupMap] = useState<Record<string, { salesAccount: string[]; purchaseAccount: string[] }>>({})
  const [setupSaving, setSetupSaving] = useState(false)
  const [setupSaved, setSetupSaved] = useState(false)
  const [newBrandInput, setNewBrandInput] = useState('')
  const [localBrands, setLocalBrands] = useState<string[]>([])
  const [newCategoryInput, setNewCategoryInput] = useState('')
  const [newSalesInput, setNewSalesInput] = useState('')
  const [newPurchaseInput, setNewPurchaseInput] = useState('')
  const [showManageBrands, setShowManageBrands] = useState(false)
  const [showManageCategories, setShowManageCategories] = useState(false)

  useEffect(() => {
    fetch('/api/admin/product-options').then(r => r.json()).then((o: any) => {
      const map = o.brandAccountMap || {}
      setOpts({
        brands: o.brands || [],
        categories: o.categories || [],
        salesAccounts: o.salesAccounts || [],
        purchaseAccounts: o.purchaseAccounts || [],
        brandAccountMap: map,
      })
      setLocalBrands(o.brands || [])
      setSetupMap(map)
    }).catch(() => {})

    const built: ProdInfoRow[] = skuItems.map((it) => {
      const prod = products.find((p) => p.sku.trim().toLowerCase() === it.sku.trim().toLowerCase()) as any
      const categoryBrands = Array.isArray(prod?.categoryBrands) ? prod.categoryBrands : []
      const existingSales = Array.isArray(prod?.salesAccount) ? prod.salesAccount : []
      const existingPurchase = Array.isArray(prod?.purchaseAccount) ? prod.purchaseAccount : []
      const brand = categoryBrands[0]
      // If product has a brand but no accounts saved yet, default accounts to brand name
      const salesAccount = existingSales.length > 0 ? existingSales : (brand ? [brand] : [])
      const purchaseAccount = existingPurchase.length > 0 ? existingPurchase : (brand ? [brand] : [])
      return {
        wsId: it.id,
        sku: it.sku.trim(),
        description: it.description,
        prodId: prod?.id ?? null,
        categoryBrands,
        itemCategories: Array.isArray(prod?.itemCategories) ? prod.itemCategories : [],
        salesAccount,
        purchaseAccount,
      }
    })
    setRows(built)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-fill accounts when categoryBrands changes for a row.
  // Uses configured brandAccountMap entry if available; falls back to [brand] for both accounts.
  function applyBrandAccounts(idx: number, brands: string[], map: typeof opts.brandAccountMap) {
    const brand = brands[0]
    if (!brand) return
    const entry = map[brand]
    const salesAccount = entry?.salesAccount?.length > 0 ? entry.salesAccount : [brand]
    const purchaseAccount = entry?.purchaseAccount?.length > 0 ? entry.purchaseAccount : [brand]
    setRows(prev => prev.map((r, i) => i === idx ? {
      ...r,
      categoryBrands: brands,
      salesAccount,
      purchaseAccount,
    } : r))
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-multiselect]')) setOpenDrop(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function updateRow(idx: number, patch: Partial<ProdInfoRow>) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  function toggleBrand(idx: number, brand: string) {
    const current = rows[idx]?.categoryBrands || []
    const next = current.includes(brand) ? current.filter(v => v !== brand) : [...current, brand]
    applyBrandAccounts(idx, next, opts.brandAccountMap)
    if (!next[0] || !opts.brandAccountMap[next[0]]) {
      updateRow(idx, { categoryBrands: next })
    }
  }

  function saveOption(key: string, value: unknown) {
    fetch('/api/admin/product-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    }).catch(() => {})
  }

  function addNewBrand(rawVal: string) {
    const val = rawVal.trim()
    if (!val) return
    if (!localBrands.includes(val)) {
      const next = [...localBrands, val]
      setLocalBrands(next)
      setOpts(prev => ({ ...prev, brands: next }))
      saveOption('brands', next)
    }
    setNewBrandInput('')
  }

  function deleteBrand(brand: string) {
    const next = localBrands.filter(b => b !== brand)
    setLocalBrands(next)
    setOpts(prev => ({ ...prev, brands: next }))
    saveOption('brands', next)
  }

  function addCategory(val: string) {
    const v = val.trim()
    if (!v || opts.categories.includes(v)) { setNewCategoryInput(''); return }
    const next = [...opts.categories, v]
    setOpts(prev => ({ ...prev, categories: next }))
    setNewCategoryInput('')
    saveOption('categories', next)
  }

  function deleteCategory(cat: string) {
    const next = opts.categories.filter(c => c !== cat)
    setOpts(prev => ({ ...prev, categories: next }))
    saveOption('categories', next)
  }

  function addSalesAccount(val: string) {
    const v = val.trim()
    if (!v || opts.salesAccounts.includes(v)) { setNewSalesInput(''); return }
    const next = [...opts.salesAccounts, v]
    setOpts(prev => ({ ...prev, salesAccounts: next }))
    setNewSalesInput('')
    saveOption('salesAccounts', next)
  }

  function deleteSalesAccount(acc: string) {
    const next = opts.salesAccounts.filter(a => a !== acc)
    setOpts(prev => ({ ...prev, salesAccounts: next }))
    saveOption('salesAccounts', next)
  }

  function addPurchaseAccount(val: string) {
    const v = val.trim()
    if (!v || opts.purchaseAccounts.includes(v)) { setNewPurchaseInput(''); return }
    const next = [...opts.purchaseAccounts, v]
    setOpts(prev => ({ ...prev, purchaseAccounts: next }))
    setNewPurchaseInput('')
    saveOption('purchaseAccounts', next)
  }

  function deletePurchaseAccount(acc: string) {
    const next = opts.purchaseAccounts.filter(a => a !== acc)
    setOpts(prev => ({ ...prev, purchaseAccounts: next }))
    saveOption('purchaseAccounts', next)
  }

  async function handleSave() {
    setSaving(true)
    const failed: string[] = []

    // Re-fetch all products to resolve stale prodIds and find newly-created items
    let freshById: Record<string, string> = {}
    try {
      const r = await fetch('/api/admin/products')
      if (r.ok) {
        const data: any[] = await r.json()
        for (const p of data) {
          if (p.sku) freshById[p.sku.trim().toLowerCase()] = p.id
        }
      }
    } catch {}

    // Resolve prodIds using fresh data
    const resolvedRows = rows.map(row => ({
      ...row,
      prodId: row.prodId ?? freshById[row.sku.trim().toLowerCase()] ?? null,
    }))

    for (const row of resolvedRows) {
      const payload = {
        categoryBrands: row.categoryBrands.length > 0 ? row.categoryBrands : null,
        itemCategories: row.itemCategories.length > 0 ? row.itemCategories : null,
        salesAccount: row.salesAccount.length > 0 ? row.salesAccount : null,
        purchaseAccount: row.purchaseAccount.length > 0 ? row.purchaseAccount : null,
      }
      if (row.prodId) {
        const res = await fetch(`/api/admin/products/${row.prodId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) failed.push(row.sku)
      } else {
        // Product not yet in DB — create as draft with category info
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sku: row.sku,
            title: row.description || row.sku,
            status: 'draft',
            ...payload,
          }),
        })
        if (res.ok) {
          const created = await res.json()
          setRows(prev => prev.map(r => r.wsId === row.wsId ? { ...r, prodId: created.id } : r))
        } else {
          failed.push(row.sku)
        }
      }
    }

    setSaving(false)
    if (failed.length) {
      alert(`Save failed for: ${failed.join(', ')}`)
    } else {
      setSaved(true)
      setTimeout(() => { setSaved(false); onClose() }, 1500)
    }
  }

  async function saveSetup() {
    setSetupSaving(true)
    try {
      await fetch('/api/admin/product-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandAccountMap: setupMap }),
      })
      setOpts(prev => ({ ...prev, brandAccountMap: setupMap }))
      setSetupSaved(true)
      setTimeout(() => setSetupSaved(false), 2000)
    } finally {
      setSetupSaving(false)
    }
  }

  // MultiSelect for brand column — with add-new input
  function BrandSelect({ rowIdx }: { rowIdx: number }) {
    const key = `${rowIdx}-categoryBrands`
    const selected = rows[rowIdx]?.categoryBrands || []
    const isOpen = openDrop === key
    return (
      <div className="relative" data-multiselect="true">
        <button type="button" onClick={() => setOpenDrop(isOpen ? null : key)}
          className="w-full min-w-[160px] px-3 py-2 border border-gray-200 rounded-lg text-left text-xs flex items-center justify-between bg-white hover:border-gray-400 focus:outline-none">
          <span className={`truncate max-w-[130px] ${selected.length === 0 ? 'text-gray-400' : 'text-gray-800'}`}>
            {selected.length === 0 ? '— Brand —' : selected.length === 1 ? selected[0] : `${selected.length} selected`}
          </span>
          <svg className="w-3 h-3 text-gray-400 flex-shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
        {isOpen && (
          <div className="absolute z-[9999] top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl min-w-[220px] max-h-72 flex flex-col">
            <div className="overflow-y-auto flex-1">
              <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                <input type="checkbox" checked={selected.length === 0} onChange={() => updateRow(rowIdx, { categoryBrands: [] })} className="rounded" readOnly />
                <span className="text-xs text-gray-400 italic">— None —</span>
              </label>
              {localBrands.map(b => (
                <div key={b} className="flex items-center px-3 py-2 hover:bg-gray-50">
                  <label className="flex items-center gap-2 flex-1 cursor-pointer">
                    <input type="checkbox" checked={selected.includes(b)} onChange={() => toggleBrand(rowIdx, b)} className="rounded" />
                    <span className="text-xs text-gray-800">{b}</span>
                    {opts.brandAccountMap[b] && <span className="text-[10px] text-green-500" title="Auto-fill configured">●</span>}
                  </label>
                  <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); deleteBrand(b) }}
                    className="text-gray-300 hover:text-red-500 text-sm leading-none ml-1 flex-shrink-0" title="Remove brand">✕</button>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
              <input
                type="text"
                value={newBrandInput}
                onChange={e => setNewBrandInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { addNewBrand(newBrandInput) } }}
                placeholder="+ Add brand…"
                className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-400"
              />
              <button type="button" onClick={() => addNewBrand(newBrandInput)} className="px-2 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-600">Add</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Simple MultiSelect without add-new (for Item Category)
  function MultiSelect({ rowIdx, field, options, label }: {
    rowIdx: number; field: keyof ProdInfoRow; options: string[]; label: string
  }) {
    const key = `${rowIdx}-${field}`
    const selected = rows[rowIdx]?.[field] as string[]
    const isOpen = openDrop === key
    return (
      <div className="relative" data-multiselect="true">
        <button type="button" onClick={() => setOpenDrop(isOpen ? null : key)}
          className="w-full min-w-[160px] px-3 py-2 border border-gray-200 rounded-lg text-left text-xs flex items-center justify-between bg-white hover:border-gray-400 focus:outline-none">
          <span className={`truncate max-w-[130px] ${selected.length === 0 ? 'text-gray-400' : 'text-gray-800'}`}>
            {selected.length === 0 ? `— ${label} —` : selected.length === 1 ? selected[0] : `${selected.length} selected`}
          </span>
          <svg className="w-3 h-3 text-gray-400 flex-shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
        {isOpen && (
          <div className="absolute z-[9999] top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl min-w-[200px] max-h-72 flex flex-col">
            <div className="overflow-y-auto flex-1">
              <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                <input type="checkbox" checked={selected.length === 0} onChange={() => updateRow(rowIdx, { [field]: [] } as any)} className="rounded" readOnly />
                <span className="text-xs text-gray-400 italic">— None —</span>
              </label>
              {options.length === 0
                ? <p className="px-3 py-2 text-xs text-gray-400 italic">No options — add one below</p>
                : options.map(opt => (
                  <div key={opt} className="flex items-center px-3 py-2 hover:bg-gray-50">
                    <label className="flex items-center gap-2 flex-1 cursor-pointer">
                      <input type="checkbox" checked={selected.includes(opt)} onChange={() => {
                        const arr = selected
                        updateRow(rowIdx, { [field]: arr.includes(opt) ? arr.filter(v => v !== opt) : [...arr, opt] } as any)
                      }} className="rounded" />
                      <span className="text-xs text-gray-800">{opt}</span>
                    </label>
                    <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); if (field === 'itemCategories') deleteCategory(opt) }}
                      className="text-gray-300 hover:text-red-500 text-sm leading-none ml-1 flex-shrink-0" title="Remove option">✕</button>
                  </div>
                ))
              }
            </div>
            {field === 'itemCategories' && (
              <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
                <input type="text" value={newCategoryInput} onChange={e => setNewCategoryInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addCategory(newCategoryInput) }}
                  placeholder="+ Add category…" className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-400" />
                <button type="button" onClick={() => addCategory(newCategoryInput)} className="px-2 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-600">Add</button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const hasMap = Object.keys(opts.brandAccountMap).length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[92vh] flex flex-col" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Update Product Information</h2>
            <p className="text-xs text-gray-500 mt-0.5">{rows.length} items — Category (Brand) &amp; Item Category (Unit) &middot; Sage Accounts auto-filled from brand</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSetup(!showSetup)}
              title="Configure brand → Sage account mapping"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${showSetup ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              Brand Accounts
              {hasMap && <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Brand Account Setup Panel */}
        {showSetup && (
          <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 space-y-4">
            <div>
              <p className="text-xs font-semibold text-indigo-700 mb-1">Configure Brand → Sage Accounts</p>
              <p className="text-xs text-indigo-500 mb-3">Selecting a brand in the table below will auto-fill its Sales &amp; Purchase accounts. Green dots indicate configured brands.</p>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {localBrands.map(brand => {
                  const entry = setupMap[brand] || { salesAccount: [], purchaseAccount: [] }
                  return (
                    <div key={brand} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-indigo-100">
                      <span className="text-xs font-semibold text-gray-800 w-32 flex-shrink-0">{brand}</span>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <select value={entry.salesAccount[0] || ''} onChange={e => setSetupMap(prev => ({ ...prev, [brand]: { ...entry, salesAccount: e.target.value ? [e.target.value] : [] } }))} className="text-xs px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-indigo-400">
                          <option value="">— Sales Account —</option>
                          {opts.salesAccounts.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <select value={entry.purchaseAccount[0] || ''} onChange={e => setSetupMap(prev => ({ ...prev, [brand]: { ...entry, purchaseAccount: e.target.value ? [e.target.value] : [] } }))} className="text-xs px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-indigo-400">
                          <option value="">— Purchase Account —</option>
                          {opts.purchaseAccounts.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      {(entry.salesAccount.length > 0 || entry.purchaseAccount.length > 0) && <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />}
                      <button type="button" onClick={() => deleteBrand(brand)} title="Remove brand" className="text-gray-300 hover:text-red-500 text-sm leading-none flex-shrink-0">✕</button>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-2 mt-2">
                <input value={newBrandInput} onChange={e => setNewBrandInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNewBrand(newBrandInput)}
                  placeholder="Add new brand…" className="flex-1 text-xs px-2.5 py-1.5 border border-indigo-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                <button type="button" onClick={() => addNewBrand(newBrandInput)} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 font-semibold">+ Add</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-indigo-100 p-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">Sales Accounts</p>
                <div className="space-y-1 mb-2 max-h-28 overflow-y-auto">
                  {opts.salesAccounts.map(a => (
                    <div key={a} className="flex items-center justify-between text-xs text-gray-700 bg-gray-50 rounded px-2 py-1">
                      <span>{a}</span>
                      <button type="button" onClick={() => deleteSalesAccount(a)} className="text-gray-300 hover:text-red-500 leading-none">✕</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1">
                  <input value={newSalesInput} onChange={e => setNewSalesInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSalesAccount(newSalesInput)}
                    placeholder="New sales account…" className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                  <button type="button" onClick={() => addSalesAccount(newSalesInput)} className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 font-bold">+</button>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-indigo-100 p-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">Purchase Accounts</p>
                <div className="space-y-1 mb-2 max-h-28 overflow-y-auto">
                  {opts.purchaseAccounts.map(a => (
                    <div key={a} className="flex items-center justify-between text-xs text-gray-700 bg-gray-50 rounded px-2 py-1">
                      <span>{a}</span>
                      <button type="button" onClick={() => deletePurchaseAccount(a)} className="text-gray-300 hover:text-red-500 leading-none">✕</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1">
                  <input value={newPurchaseInput} onChange={e => setNewPurchaseInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPurchaseAccount(newPurchaseInput)}
                    placeholder="New purchase account…" className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                  <button type="button" onClick={() => addPurchaseAccount(newPurchaseInput)} className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 font-bold">+</button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={saveSetup} disabled={setupSaving || setupSaved}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg ${setupSaved ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'}`}>
                {setupSaved ? '✓ Saved' : setupSaving ? 'Saving…' : 'Save Configuration'}
              </button>
            </div>
          </div>
        )}

        {/* Manage Brands panel (from table header + button) */}
        {showManageBrands && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-2">Manage Brands</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {localBrands.map(b => (
                <span key={b} className="flex items-center gap-1 bg-white border border-blue-200 rounded-full px-2.5 py-0.5 text-xs text-gray-700">
                  {b}<button type="button" onClick={() => deleteBrand(b)} className="text-red-400 hover:text-red-600 leading-none ml-0.5">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newBrandInput} onChange={e => setNewBrandInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNewBrand(newBrandInput)}
                placeholder="New brand name…" className="flex-1 text-xs px-2.5 py-1.5 border border-blue-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400" />
              <button type="button" onClick={() => addNewBrand(newBrandInput)} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 font-semibold">Add</button>
            </div>
          </div>
        )}

        {/* Manage Categories panel */}
        {showManageCategories && (
          <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-100">
            <p className="text-xs font-semibold text-emerald-700 mb-2">Manage Item Categories (Unit)</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {opts.categories.map(c => (
                <span key={c} className="flex items-center gap-1 bg-white border border-emerald-200 rounded-full px-2.5 py-0.5 text-xs text-gray-700">
                  {c}<button type="button" onClick={() => deleteCategory(c)} className="text-red-400 hover:text-red-600 leading-none ml-0.5">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newCategoryInput} onChange={e => setNewCategoryInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory(newCategoryInput)}
                placeholder="New category / unit…" className="flex-1 text-xs px-2.5 py-1.5 border border-emerald-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400" />
              <button type="button" onClick={() => addCategory(newCategoryInput)} className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 font-semibold">Add</button>
            </div>
          </div>
        )}

        <div className="overflow-auto flex-1 px-6 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="pb-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">SKU</th>
                <th className="pb-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                <th className="pb-2 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    Category (Brand)
                    <button type="button" onClick={() => { setShowManageBrands(v => !v); setShowManageCategories(false) }}
                      title="Manage brands" className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold transition-colors ${showManageBrands ? 'bg-blue-600' : 'bg-gray-400 hover:bg-blue-500'}`}>+</button>
                  </div>
                </th>
                <th className="pb-2 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    Item Category (Unit)
                    <button type="button" onClick={() => { setShowManageCategories(v => !v); setShowManageBrands(false) }}
                      title="Manage categories" className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold transition-colors ${showManageCategories ? 'bg-emerald-600' : 'bg-gray-400 hover:bg-emerald-500'}`}>+</button>
                  </div>
                </th>
                <th className="pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Sage Accounts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const brand = row.categoryBrands[0]
                const brandMap = brand ? opts.brandAccountMap[brand] : null
                return (
                  <tr key={row.wsId} className={`border-b border-gray-50 ${!row.prodId ? 'opacity-50' : ''}`}>
                    <td className="py-2 pr-4">
                      <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded whitespace-nowrap">{row.sku}</span>
                      {!row.prodId && <span className="block text-[10px] text-red-400 mt-0.5">Not in DB</span>}
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-600 max-w-[220px]">
                      <span className="truncate block">{row.description || '—'}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <BrandSelect rowIdx={idx} />
                    </td>
                    <td className="py-2 pr-3">
                      <MultiSelect rowIdx={idx} field="itemCategories" options={opts.categories} label="Item Category (Unit)" />
                    </td>
                    <td className="py-2">
                      {brand ? (
                        <div className="flex flex-wrap gap-1">
                          {row.salesAccount.map(a => <span key={a} className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded">{a}</span>)}
                          {row.purchaseAccount.map(a => <span key={a} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">{a}</span>)}
                          {!brandMap && row.salesAccount.length > 0 && (
                            <span className="text-[10px] text-amber-500 italic ml-1">brand default</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">select brand to auto-fill</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">Saves Category (Brand), Item Category (Unit) &amp; auto-filled Sage accounts to each product record</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving || saved}
              className={`px-5 py-2 text-sm font-semibold rounded-xl transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50'}`}>
              {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save All'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── New SKU Modal (first-time Send to Inventory) ─────────────────────────────

function NewSkuModal({
  rows: initRows, saving, onSave, onClose, brandOptions, categoryOptions, unitOptions,
  title, subtitle, saveLabel,
}: {
  rows: NewSkuRow[]
  saving: boolean
  onSave: (rows: NewSkuRow[]) => void
  onClose: () => void
  brandOptions: string[]
  categoryOptions: string[]
  unitOptions: string[]
  title?: string
  subtitle?: string
  saveLabel?: string
}) {
  const [rows, setRows] = useState<NewSkuRow[]>(initRows)

  function updateRow(wsId: string, patch: Partial<NewSkuRow>) {
    setRows((prev) => prev.map((r) => r.wsId === wsId ? { ...r, ...patch } : r))
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title ?? 'Add New Products to Inventory'}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {subtitle ?? `${rows.length} new SKU${rows.length !== 1 ? 's' : ''} not found in inventory — confirm details before saving`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[200px]">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[140px]">Brand</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[140px]">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[120px]">Unit</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Retail (ZAR)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Cost (ZAR)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row, i) => (
                <tr key={row.wsId} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded whitespace-nowrap">{row.sku}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      value={row.description}
                      onChange={(e) => updateRow(row.wsId, { description: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      list={`brand-list-${row.wsId}`}
                      value={row.brand}
                      onChange={(e) => updateRow(row.wsId, { brand: e.target.value })}
                      placeholder="Brand…"
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <datalist id={`brand-list-${row.wsId}`}>
                      {brandOptions.map((b) => <option key={b} value={b} />)}
                    </datalist>
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      list={`cat-list-${row.wsId}`}
                      value={row.category}
                      onChange={(e) => updateRow(row.wsId, { category: e.target.value })}
                      placeholder="Category…"
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <datalist id={`cat-list-${row.wsId}`}>
                      {categoryOptions.map((c) => <option key={c} value={c} />)}
                    </datalist>
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      list={`unit-list-${row.wsId}`}
                      value={row.unit}
                      onChange={(e) => updateRow(row.wsId, { unit: e.target.value })}
                      placeholder="Unit…"
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <datalist id={`unit-list-${row.wsId}`}>
                      {unitOptions.map((u) => <option key={u} value={u} />)}
                    </datalist>
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number" min={0} step={0.01}
                      value={row.retailPrice || ''}
                      onChange={(e) => updateRow(row.wsId, { retailPrice: parseFloat(e.target.value) || 0 })}
                      className="w-24 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number" min={0} step={0.01}
                      value={row.costPrice || ''}
                      onChange={(e) => updateRow(row.wsId, { costPrice: parseFloat(e.target.value) || 0 })}
                      className="w-24 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number" min={0} step={1}
                      value={row.qty || ''}
                      onChange={(e) => updateRow(row.wsId, { qty: parseInt(e.target.value) || 0 })}
                      className="w-16 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-400">
            Products will be created as <strong>Active</strong> with the quantity set above.
            Quantities can only be set on first upload.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} disabled={saving}
              className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => onSave(rows)}
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : saveLabel ? `${saveLabel} (${rows.length})` : `Add ${rows.length} Product${rows.length !== 1 ? 's' : ''} to Inventory`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Worksheet Supplier Order Modal ───────────────────────────────────────────

function WorksheetSupplierOrderModal({
  supplierName, suppliers, companyInfo, orderDate, items, onClose,
}: {
  supplierName: string
  suppliers: SupplierContact[]
  companyInfo: CompanyInfo
  orderDate: string
  items: { sku: string; description: string; qty: number }[]
  onClose: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [rows, setRows] = useState(items.length > 0 ? items.map(it => ({ ...it })) : [{ sku: '', description: '', qty: 1 }])
  const [poNumber, setPoNumber] = useState('')
  const [date, setDate] = useState(orderDate || today)

  function updateRow(idx: number, field: string, value: string | number) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  function generatePDF() {
    const totalQty = rows.reduce((s, r) => s + Number(r.qty), 0)
    const rowsHtml = rows
      .filter(r => r.sku || r.description)
      .map((r, i) => `<tr>
        <td style="padding:8px 12px;color:#6b7280;font-size:13px;">${i + 1}</td>
        <td style="padding:8px 12px;font-family:monospace;font-size:13px;font-weight:600;">${r.sku}</td>
        <td style="padding:8px 12px;font-size:13px;">${r.description}</td>
        <td style="padding:8px 12px;text-align:center;font-weight:700;font-size:13px;">${r.qty}</td>
      </tr>`).join('')
    const companyBlock = companyInfo.name
      ? `<p style="font-size:13px;font-weight:700;">${companyInfo.name}</p>
         ${companyInfo.address ? `<p style="font-size:12px;color:#6b7280;">${companyInfo.address}</p>` : ''}
         ${companyInfo.phone ? `<p style="font-size:12px;color:#6b7280;">${companyInfo.phone}</p>` : ''}
         ${companyInfo.email ? `<p style="font-size:12px;color:#6b7280;">${companyInfo.email}</p>` : ''}
         ${companyInfo.vatNumber ? `<p style="font-size:11px;color:#9ca3af;">VAT: ${companyInfo.vatNumber}</p>` : ''}`
      : ''
    const supplier = suppliers.find(s => s.name.toLowerCase() === supplierName.toLowerCase())
    const displayDate = new Date(date).toLocaleDateString('en-ZA')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Supplier Order – ${supplierName}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;padding:20mm;background:white}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
    .title{font-size:24px;font-weight:800;margin-bottom:2px}.meta{font-size:13px;color:#6b7280;margin-top:4px}
    .supplier-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin-bottom:28px}
    .supplier-box p{font-size:13px;margin-bottom:2px}table{width:100%;border-collapse:collapse}
    thead tr{border-bottom:2px solid #111827}th{padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280}
    th.center{text-align:center}tbody tr{border-bottom:1px solid #f3f4f6}tbody tr:nth-child(even){background:#f9fafb}
    tfoot tr{border-top:2px solid #111827}tfoot td{padding:10px 12px;font-weight:700;font-size:13px}@page{size:A4;margin:0}</style>
    </head><body>
    <div class="header"><div>${companyBlock}</div><div style="text-align:right">
    <p class="title">SUPPLIER ORDER</p>
    ${poNumber ? `<p class="meta">PO: <strong>${poNumber}</strong></p>` : ''}
    <p class="meta">Date: ${displayDate}</p></div></div>
    <div class="supplier-box">
    <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:6px">Supplier</p>
    <p style="font-weight:700;font-size:14px;">${supplierName}</p>
    ${supplier?.code ? `<p style="font-size:12px;color:#6b7280;">Code: ${supplier.code}</p>` : ''}
    </div>
    <table><thead><tr><th style="width:40px">#</th><th>SKU</th><th>Description</th><th class="center" style="width:80px">Qty</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot><tr><td colspan="3" style="text-align:right;padding-right:12px;color:#6b7280">Total</td><td style="text-align:center">${totalQty}</td></tr></tfoot>
    </table></body></html>`
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 350) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Supplier Order</h2>
            <p className="text-xs text-gray-500 mt-0.5">{supplierName} · {rows.filter(r => r.sku).length} item{rows.filter(r => r.sku).length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">PO / Reference</label>
              <input value={poNumber} onChange={e => setPoNumber(e.target.value)} placeholder="PO-001"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Order Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Order Items</p>
              <span className="text-xs text-gray-400">{rows.length} line{rows.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">SKU</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Description</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 w-16">Qty</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-1.5">
                        <input value={row.sku} onChange={e => updateRow(idx, 'sku', e.target.value)}
                          className="w-full border-0 bg-transparent font-mono text-xs text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-1" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input value={row.description} onChange={e => updateRow(idx, 'description', e.target.value)}
                          className="w-full border-0 bg-transparent text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-1" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" min={1} value={row.qty} onChange={e => updateRow(idx, 'qty', parseInt(e.target.value) || 1)}
                          className="w-14 border-0 bg-transparent text-xs text-center text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-1" />
                      </td>
                      <td className="pr-2">
                        <button onClick={() => setRows(prev => prev.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-400 text-sm leading-none">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={() => setRows(prev => [...prev, { sku: '', description: '', qty: 1 }])}
                className="w-full text-xs text-gray-400 hover:text-gray-600 py-2 border-t border-gray-100 hover:bg-gray-50 transition-colors">
                + Add Item
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={generatePDF} disabled={!rows.some(r => r.sku || r.description)}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Generate PDF
          </button>
        </div>
      </div>
    </div>
  )
}
