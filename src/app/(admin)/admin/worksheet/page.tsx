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
  address?: string; phone?: string; email?: string
}

interface WsItem {
  id: string
  sku: string
  skuSearch: string
  description: string
  unit: string
  category: string
  costingEntity?: 'R66' | 'JDM' | ''
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
  finalDiscountPct?: number
  slsMode?: boolean
  slsDiscountPct?: number
  finalSlsDiscountPct?: number
  jssMode?: boolean
  jssShippingCost?: number
  jssVatPct?: number
  jssDiscountPct?: number
  jssMarkupPct?: number
  cutMode?: boolean
  cutDiscountPct?: number
  trackingNumber?: string
  supplierInvNumber?: string
  supplierInvDate?: string
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
    unit: '', category: '', costingEntity: '' as const,
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

  // ── Supplier invoice number + date ──
  const [supplierInvNumber, setSupplierInvNumber] = useState('')
  const [supplierInvDate, setSupplierInvDate] = useState('')

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
  const [finalDiscountPct, setFinalDiscountPct] = useState(0)
  const [slsMode, setSlsMode] = useState(false)
  const [slsDiscountPct, setSlsDiscountPct] = useState(30)
  const [finalSlsDiscountPct, setFinalSlsDiscountPct] = useState(30)

  // ── JSS Calculator (Jeffrey Stein Supplier) ──
  const [jssMode, setJssMode] = useState(false)
  // ── CUT Calculator ──
  const [cutMode, setCutMode] = useState(false)
  const [cutDiscountPct, setCutDiscountPct] = useState(10)
  const [jssShippingCost, setJssShippingCost] = useState(0)
  const [jssVatPct, setJssVatPct] = useState(15)
  const [jssDiscountPct, setJssDiscountPct] = useState(2.5)
  const [jssMarkupPct, setJssMarkupPct] = useState(30)

  // ── Items ──
  const [items, setItems] = useState<WsItem[]>([newWsItem()])

  // ── FX rates ──
  const [fxRates, setFxRates] = useState<Record<string, number>>(CURRENCY_DEFAULTS)
  const [fxBase, setFxBase] = useState('ZAR')
  const [fxUpdated, setFxUpdated] = useState('')
  const [fxLoading, setFxLoading] = useState(false)

  // ── SKU entity map (persisted auto-allocation) ──
  const [skuEntityMap, setSkuEntityMap] = useState<Record<string, string>>({})

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
  // inStock always reflects live DB quantity so manual inventory fixes are visible
  useEffect(() => {
    if (products.length === 0) return
    setItems((prev) => prev.map((it) => {
      const prod = products.find((p) => p.sku === it.sku)
      if (!prod) return it
      return {
        ...it,
        retailPrice: it.retailPrice || prod.price,
        preOrderPrice: it.preOrderPrice || prod.preOrderPrice || 0,
        inStock: prod.quantity,
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

  // ── Column visibility ──
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set())
  const [showColMenu, setShowColMenu] = useState(false)
  const colMenuRef = useRef<HTMLDivElement>(null)

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
    const toProcess = items.filter((it) => it.sku)
    if (!toProcess.length) return
    setUpdatingCosts(true)
    const errors: string[] = []
    let updated = 0
    let created = 0
    try {
      for (const it of toProcess) {
        const skuLower = it.sku.trim().toLowerCase()
        const prod = products.find((p) => p.sku.trim().toLowerCase() === skuLower)
        const finalLanded = it.wholesalePrice > 0 ? Math.round(calcEntityFinalLanded(it.wholesalePrice, it.costingEntity) * 100) / 100 : 0
        const landedRetail = it.wholesalePrice > 0 ? Math.round(calcFinalRetail(it.wholesalePrice) * 100) / 100 : 0
        const retailZAR = Math.round((it.retailPrice || 0) * 100) / 100
        const preOrderZAR = it.wholesalePrice > 0 ? Math.round(calcRetail(it.wholesalePrice) * 100) / 100 : 0
        const acct = it.costingEntity === 'R66' ? ['Route 66 Imports PTY LTD'] : it.costingEntity === 'JDM' ? ['JDM Garage PTY LTD'] : null

        if (!prod) {
          // New SKU — add to products with qty=0 (no stock change)
          const res = await fetch('/api/admin/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sku: it.sku,
              title: it.description || it.sku,
              brand: it.category || '',
              scale: it.unit || '',
              supplier: supplier || '',
              description: '',
              price: retailZAR,
              cost_per_item: finalLanded,
              compareAtPrice: landedRetail || finalLanded,
              preOrderPrice: preOrderZAR,
              quantity: 0,
              status: 'active',
              categoryBrands: it.category ? [it.category] : [],
              itemCategories: it.unit ? [it.unit] : [],
              ...(acct ? { salesAccount: acct, purchaseAccount: acct } : {}),
            }),
          })
          if (!res.ok) {
            const msg = await res.text().catch(() => res.status.toString())
            errors.push(`${it.sku} (new): ${msg}`)
          } else {
            created++
          }
          continue
        }

        // Existing product — update all applicable fields, quantity untouched
        const patch: Record<string, any> = {}
        if (it.description) patch.title = it.description
        if (finalLanded > 0) patch.costPerItem = finalLanded
        if (landedRetail > 0) patch.compareAtPrice = landedRetail
        else if (finalLanded > 0) patch.compareAtPrice = finalLanded
        if (retailZAR > 0) patch.price = retailZAR
        if (preOrderZAR > 0) patch.preOrderPrice = preOrderZAR
        if (it.category) { patch.brand = it.category; patch.categoryBrands = [it.category] }
        if (it.unit) { patch.scale = it.unit; patch.itemCategories = [it.unit] }
        if (supplier) patch.supplier = supplier
        if (acct) { patch.salesAccount = acct; patch.purchaseAccount = acct }
        if (Object.keys(patch).length === 0) { updated++; continue }
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
        alert(`Updated ${updated}, created ${created}.\n\nFailed:\n${errors.join('\n')}`)
      } else {
        setCostsUpdated(true)
        setTimeout(() => setCostsUpdated(false), 3000)
      }
    } finally {
      setUpdatingCosts(false)
    }
  }

  // ── Update Products: runs costing update (no modal) ──
  async function handleUpdateProducts() {
    await updateFinalCosting()
    setShowProductInfo(true)
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
  // ── Send to Supplier Order ──
  const [showSupplierOrderModal, setShowSupplierOrderModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showR66InvoiceModal, setShowR66InvoiceModal] = useState(false)
  const [showJDMInvoiceModal, setShowJDMInvoiceModal] = useState(false)
  // ── Qty confirm dialog ──
  const [showQtyConfirm, setShowQtyConfirm] = useState(false)
  // ── Send to Checklist ──
  const [sendingChecklist, setSendingChecklist] = useState(false)
  const [checklistSent, setChecklistSent] = useState(false)

  function toggleCheck(id: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function sendToChecklist() {
    const toSend = items.filter(it => it.sku || it.description)
    if (!toSend.length) return
    setSendingChecklist(true)
    try {
      const res = await fetch('/api/admin/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: supplier ? `${supplier} – ${worksheetDate}` : `Worksheet ${worksheetDate}`,
          supplier,
          date: worksheetDate,
          worksheetId,
          items: toSend.map(it => ({
            sku: it.sku,
            description: it.description,
            qty: it.qty || 1,
          })),
        }),
      })
      if (res.ok) {
        setChecklistSent(true)
        setTimeout(() => setChecklistSent(false), 3000)
      }
    } finally {
      setSendingChecklist(false)
    }
  }

  async function sendToInventory() {
    // Exclude items already sent — prevents double-update on re-click
    const toSend = items.filter((it) => checkedItems.has(it.id) && it.sku && it.qty > 0 && !it.sentToInventory)
    if (!toSend.length) return

    // Always re-fetch products fresh so SKU matching uses the latest DB state
    let freshProducts = products
    try {
      const res = await fetch('/api/admin/products')
      if (res.ok) {
        const raw: any[] = await res.json()
        const mapped: ProductRef[] = raw.map((p: any) => ({
          id: p.id, sku: p.sku || '', title: p.title || '',
          brand: p.brand || '', price: Number(p.price) || 0,
          quantity: Number(p.quantity) || 0,
          preOrderPrice: p.preOrderPrice ? Number(p.preOrderPrice) : null,
          unit: Array.isArray(p.itemCategories) ? p.itemCategories.join(' / ') : (p.itemCategories || ''),
          category: Array.isArray(p.categoryBrands) ? p.categoryBrands.join(' / ') : (p.categoryBrands || ''),
          categoryBrands: Array.isArray(p.categoryBrands) ? p.categoryBrands : [],
          itemCategories: Array.isArray(p.itemCategories) ? p.itemCategories : [],
          salesAccount: Array.isArray(p.salesAccount) ? p.salesAccount : [],
          purchaseAccount: Array.isArray(p.purchaseAccount) ? p.purchaseAccount : [],
        })).filter((p) => p.sku || p.title)
        freshProducts = mapped
      }
    } catch {}

    const newSkus: NewSkuRow[] = []
    const existingItems: WsItem[] = []

    for (const it of toSend) {
      const matches = freshProducts.filter((p) => p.sku.trim().toLowerCase() === it.sku.trim().toLowerCase())
      if (matches.length === 0) {
        // New SKU — show modal to create product with qty
        const finalLanded = Math.round(calcEntityFinalLanded(it.wholesalePrice, it.costingEntity) * 100) / 100
        const retailZAR = it.retailPrice > 0
          ? it.retailPrice
          : Math.round(calcFinalRetail(it.wholesalePrice) * 100) / 100
        newSkus.push({
          wsId: it.id, sku: it.sku, description: it.description, brand: '',
          category: it.category || '', unit: it.unit || '',
          retailPrice: retailZAR, costPrice: finalLanded, qty: it.qty,
        })
      } else {
        existingItems.push(it)
      }
    }

    if (newSkus.length > 0) {
      setNewSkuModalItems(newSkus)
      setShowNewSkuModal(true)
    }

    // Existing products — qty only, no costing update, no dialog
    if (existingItems.length > 0) {
      setSendingInventory(true)
      const errors: string[] = []
      const sentIds: string[] = []
      try {
        for (const it of existingItems) {
          const matches = freshProducts.filter((p) => p.sku.trim().toLowerCase() === it.sku.trim().toLowerCase())
          const patchBody: Record<string, any> = { quantity: it.qty }
          if (it.retailPrice > 0) patchBody.price = Math.round(it.retailPrice * 100) / 100
          let allOk = true
          for (const prod of matches) {
            const res = await fetch(`/api/admin/products/${prod.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(patchBody),
            })
            if (!res.ok) {
              const msg = await res.text().catch(() => res.status.toString())
              errors.push(`${it.sku}: ${msg}`)
              allOk = false
            }
          }
          if (allOk) sentIds.push(it.id)
        }
        if (sentIds.length > 0) {
          const updatedItems = items.map((it) => sentIds.includes(it.id) ? { ...it, sentToInventory: true } : it)
          setItems(updatedItems)
          setCheckedItems((prev) => { const next = new Set(prev); sentIds.forEach((id) => next.delete(id)); return next })
          // Auto-save so sentToInventory flag persists across reloads (prevents double-update)
          await fetch('/api/admin/worksheets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...currentSheetData(), items: updatedItems.map((it) => ({ ...it, skuSearch: '' })) }),
          }).catch(() => {})
          setInventorySent(true)
          setTimeout(() => setInventorySent(false), 3000)
        }
        if (errors.length > 0) alert(`Failed:\n${errors.join('\n')}`)
      } finally {
        setSendingInventory(false)
      }
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

  // Load entity map once on mount
  useEffect(() => {
    fetch('/api/admin/sku-entity-map')
      .then(r => r.ok ? r.json() : {})
      .then(setSkuEntityMap)
      .catch(() => {})
  }, [])

  // When entity map loads, auto-fill items that have no entity assigned yet
  useEffect(() => {
    if (Object.keys(skuEntityMap).length === 0) return
    setItems(prev => prev.map(it => {
      if (it.costingEntity || !it.sku) return it
      const mapped = skuEntityMap[it.sku.trim().toUpperCase()]
      if (!mapped) return it
      return { ...it, costingEntity: mapped as 'R66' | 'JDM' }
    }))
  }, [skuEntityMap])

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

  // ── Close column menu on outside click ──
  useEffect(() => {
    function handleColClick(e: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setShowColMenu(false)
      }
    }
    document.addEventListener('mousedown', handleColClick)
    return () => document.removeEventListener('mousedown', handleColClick)
  }, [])

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
  // CUT formula: W - (CUT% × W) = W × (1 - CUT%/100)
  // When SCS is also active, CUT operates on the SCS-computed wholesale (not raw RRP input)
  function effectiveW(w: number) {
    const afterScs = slsMode ? w * (1 - slsDiscountPct / 100) : w
    return cutMode ? afterScs * (1 - cutDiscountPct / 100) : afterScs
  }
  // Final Costing uses its own SCS % (finalSlsDiscountPct)
  function effectiveFinalW(w: number) {
    const afterScs = slsMode
      ? w * (1 - finalSlsDiscountPct / 100)
      : (finalDiscountPct > 0 ? w * (1 + finalDiscountPct / 100) : w)
    return cutMode ? afterScs * (1 - cutDiscountPct / 100) : afterScs
  }
  function calcLanded(w: number) {
    return effectiveW(w) * exchangeRate * (1 + shippingPct / 100)
  }
  function calcRetail(w: number) { return calcLanded(w) * (1 + markupPct / 100) * (1 + vatPct / 100) }

  // Final costing — derived percentages from total costs
  const totalWholesaleZAR = items
    .filter((it) => it.wholesalePrice > 0)
    .reduce((sum, it) => sum + it.qty * effectiveFinalW(it.wholesalePrice) * finalExRate, 0)
  const shippingPctCalc = totalWholesaleZAR > 0 ? (finalShippingCost / totalWholesaleZAR) * 100 : 0
  const customsPctCalc = totalWholesaleZAR > 0 ? (finalCustomsCost / totalWholesaleZAR) * 100 : 0

  function calcFinalLanded(w: number) {
    return effectiveFinalW(w) * finalExRate * (1 + (shippingPctCalc + customsPctCalc) / 100)
  }
  function calcEntityFinalLanded(w: number, entity?: 'R66' | 'JDM' | '') {
    const base = calcFinalLanded(w)
    return entity === 'R66' ? base * 1.15 : base
  }
  // Markup applied on top of Final Landed: (wholesale + shipping + customs) × (1 + markup%)
  function calcFinalRetail(w: number) { return calcFinalLanded(w) * (1 + finalMarkupPct / 100) * (1 + finalVatPct / 100) }
  function fmtFC(n: number) { return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') }

  // JSS Calculator — wholesale in ZAR, shipping allocated proportionally
  const jssTotalWholesale = items.filter((it) => it.wholesalePrice > 0)
    .reduce((s, it) => s + it.qty * it.wholesalePrice, 0)
  const jssShippingPct = jssTotalWholesale > 0 ? (jssShippingCost / jssTotalWholesale) * 100 : 0
  function calcJssRetail(w: number): number {
    if (w <= 0) return 0
    const shipping = w * (jssShippingPct / 100)
    const landed = w + shipping
    const vat = landed * (1 + jssVatPct / 100)
    const discounted = vat * (1 - jssDiscountPct / 100)
    return discounted * (1 + jssMarkupPct / 100)
  }
  const isJssSupplier = supplier.toLowerCase().includes('jeffrey') || supplier.toLowerCase().includes('stein')

  function toggleScsMode() {
    const activating = !slsMode
    setSlsMode(activating)
    if (activating) {
      const match = suppliers.find((s) =>
        s.name.toLowerCase().includes('slotcar') || s.name.toLowerCase().includes('slotcars supply')
      )
      if (match) setSupplier(match.name)
      setCurrency('USD')
      setExchangeRate(fxRates['USD'] ?? CURRENCY_DEFAULTS['USD'])
      setFinalCurrency('USD')
      setFinalExRate(fxRates['USD'] ?? CURRENCY_DEFAULTS['USD'])
    }
  }

  function toggleJssMode() {
    const activating = !jssMode
    setJssMode(activating)
    if (activating) {
      const match = suppliers.find((s) =>
        s.name.toLowerCase().includes('jeffrey') || s.name.toLowerCase().includes('stein')
      )
      if (match) setSupplier(match.name)
      setCurrency('ZAR')
      setExchangeRate(1)
    }
  }

  function toggleCutMode() {
    const activating = !cutMode
    setCutMode(activating)
    if (activating) { setCurrency('ZAR'); setExchangeRate(1) }
  }

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
      finalCurrency, finalExRate, finalShippingCost, finalCustomsCost, finalMarkupPct, finalVatPct, finalDiscountPct,
      slsMode, slsDiscountPct, finalSlsDiscountPct,
      jssMode, jssShippingCost, jssVatPct, jssDiscountPct, jssMarkupPct,
      cutMode, cutDiscountPct,
      trackingNumber,
      supplierInvNumber,
      supplierInvDate,
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
      // Persist entity allocations for auto-fill on future worksheets
      const entityEntries: Record<string, string> = {}
      for (const it of items) {
        if (it.sku && it.costingEntity) {
          entityEntries[it.sku.trim().toUpperCase()] = it.costingEntity
        }
      }
      if (Object.keys(entityEntries).length > 0) {
        fetch('/api/admin/sku-entity-map', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entityEntries),
        }).then(r => r.ok ? r.json() : {}).then(setSkuEntityMap).catch(() => {})
      }
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
    setFinalDiscountPct((sheet as any).finalDiscountPct ?? 0)
    setSlsMode((sheet as any).slsMode ?? false)
    setSlsDiscountPct((sheet as any).slsDiscountPct ?? 30)
    setFinalSlsDiscountPct((sheet as any).finalSlsDiscountPct ?? 30)
    setJssMode((sheet as any).jssMode ?? false)
    setJssShippingCost((sheet as any).jssShippingCost ?? 0)
    setJssVatPct((sheet as any).jssVatPct ?? 15)
    setJssDiscountPct((sheet as any).jssDiscountPct ?? 2.5)
    setJssMarkupPct((sheet as any).jssMarkupPct ?? 30)
    setCutMode((sheet as any).cutMode ?? false)
    setCutDiscountPct((sheet as any).cutDiscountPct ?? 10)
    setTrackingNumber(sheet.trackingNumber ?? '')
    setTrackingEditMode(false)
    setSupplierInvNumber(sheet.supplierInvNumber ?? '')
    setSupplierInvDate(sheet.supplierInvDate ?? '')
    setItems(sheet.items.length > 0 ? sheet.items.map((it) => {
      const prod = products.find((p) => p.sku === it.sku)
      const mappedEntity = !it.costingEntity && it.sku
        ? (skuEntityMap[it.sku.trim().toUpperCase()] as 'R66' | 'JDM' | undefined)
        : undefined
      return {
        ...it,
        skuSearch: '',
        unit: it.unit ?? prod?.unit ?? '',
        category: it.category ?? prod?.category ?? '',
        inStock: it.inStock ?? prod?.quantity ?? 0,
        retailPrice: it.retailPrice || prod?.price || 0,
        preOrderPrice: it.preOrderPrice || prod?.preOrderPrice || 0,
        ...(mappedEntity ? { costingEntity: mappedEntity } : {}),
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
    setFinalDiscountPct(0)
    setTrackingNumber('')
    setTrackingEditMode(false)
    setSupplierInvNumber('')
    setSupplierInvDate('')
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
      const fLanded = calcEntityFinalLanded(it.wholesalePrice, it.costingEntity)
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
      const fLanded = it.wholesalePrice > 0 ? fmtFC(calcEntityFinalLanded(it.wholesalePrice, it.costingEntity)) : '—'
      const fRetail = it.wholesalePrice > 0 ? fmtFC(calcFinalRetail(it.wholesalePrice)) : '—'
      const totalCur = it.wholesalePrice > 0 ? fmtFC(it.qty * it.wholesalePrice) : '—'
      return `<tr>
        <td>${i + 1}</td><td style="font-family:monospace">${it.sku || '—'}</td>
        <td>${it.description || '—'}</td>
        <td style="text-align:right">${it.retailPrice > 0 ? 'R ' + it.retailPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '—'}</td>
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
      <th class="r">${slsMode ? `RRP (${currency})` : `Wholesale (${currency})`}</th>
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
      <div className={`border rounded-xl px-5 py-4 ${slsMode ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-100'}`}>
        <div className="flex items-center gap-3 mb-3">
          <p className={`text-xs font-semibold uppercase tracking-wider ${slsMode ? 'text-orange-700' : jssMode ? 'text-violet-700' : cutMode ? 'text-rose-700' : 'text-blue-700'}`}>
            Costing Calculator{slsMode ? ' — SCS Mode' : jssMode ? ' — JSS Mode' : cutMode ? ' — CUT Mode' : ''}
          </p>
          <button
            type="button"
            onClick={toggleCutMode}
            title="CUT: Wholesale × Discount % = Cut Amount"
            className={`text-xs font-bold px-2.5 py-0.5 rounded-lg transition-colors ${cutMode ? 'bg-rose-600 text-white shadow-sm' : 'bg-gray-200 text-gray-600 hover:bg-rose-100 hover:text-rose-700'}`}
          >
            CUT
          </button>
          <button
            type="button"
            onClick={toggleScsMode}
            title="Slotcar Supply: Retail Price − Discount % = Wholesale Cost"
            className={`text-xs font-bold px-2.5 py-0.5 rounded-lg transition-colors ${slsMode ? 'bg-orange-600 text-white shadow-sm' : 'bg-gray-200 text-gray-600 hover:bg-orange-100 hover:text-orange-700'}`}
          >
            SCS
          </button>
          <button
            type="button"
            onClick={toggleJssMode}
            title="Jeffrey Stein Supplier: Wholesale + Shipping + VAT − Discount × Markup = Retail"
            className={`text-xs font-bold px-2.5 py-0.5 rounded-lg transition-colors ${jssMode ? 'bg-violet-600 text-white shadow-sm' : 'bg-gray-200 text-gray-600 hover:bg-violet-100 hover:text-violet-700'}`}
          >
            JSS
          </button>
        </div>
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
          {slsMode && (
            <>
              <div className="w-px h-8 bg-orange-200 self-end mb-1.5" />
              <div className="flex flex-col gap-1">
                <label className="text-xs text-orange-600 font-semibold">SCS Discount %</label>
                <input
                  type="number" min={0} max={100} step={0.5}
                  value={slsDiscountPct}
                  onChange={(e) => setSlsDiscountPct(Number(e.target.value))}
                  className="border-2 border-orange-300 rounded-lg px-2.5 py-1.5 text-sm w-20 bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-400 font-semibold text-orange-900"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-orange-600 font-semibold">Formula</label>
                <div className="px-2.5 py-1.5 text-xs text-orange-700 bg-orange-100 border border-orange-200 rounded-lg whitespace-nowrap">
                  RRP × {(1 - slsDiscountPct / 100).toFixed(2)} = Cost
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Final Costing Calculator ── */}
      <div className={`border rounded-xl px-5 py-4 ${slsMode ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200'}`}>
        <div className="flex items-center gap-3 mb-1">
          <p className={`text-xs font-semibold uppercase tracking-wider ${slsMode ? 'text-orange-700' : jssMode ? 'text-violet-700' : cutMode ? 'text-rose-700' : 'text-emerald-700'}`}>
            Final Costing Calculator{slsMode ? ' — SCS Mode' : jssMode ? ' — JSS Mode' : cutMode ? ' — CUT Mode' : ''}
          </p>
          <button
            type="button"
            onClick={toggleCutMode}
            title="CUT: Wholesale × Discount % = Cut Amount"
            className={`text-xs font-bold px-2.5 py-0.5 rounded-lg transition-colors ${cutMode ? 'bg-rose-600 text-white shadow-sm' : 'bg-gray-200 text-gray-600 hover:bg-rose-100 hover:text-rose-700'}`}
          >
            CUT
          </button>
          <button
            type="button"
            onClick={toggleScsMode}
            title="Slotcar Supply: Retail Price − Discount % = Wholesale Cost"
            className={`text-xs font-bold px-2.5 py-0.5 rounded-lg transition-colors ${slsMode ? 'bg-orange-600 text-white shadow-sm' : 'bg-gray-200 text-gray-600 hover:bg-orange-100 hover:text-orange-700'}`}
          >
            SCS
          </button>
          <button
            type="button"
            onClick={toggleJssMode}
            title="Jeffrey Stein Supplier: Wholesale + Shipping + VAT − Discount × Markup = Retail"
            className={`text-xs font-bold px-2.5 py-0.5 rounded-lg transition-colors ${jssMode ? 'bg-violet-600 text-white shadow-sm' : 'bg-gray-200 text-gray-600 hover:bg-violet-100 hover:text-violet-700'}`}
          >
            JSS
          </button>
        </div>
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

          {/* ── SLS Discount OR regular Discount + VAT display ── */}
          <div className={`w-px h-8 self-end mb-1.5 ${slsMode ? 'bg-orange-200' : 'bg-emerald-200'}`} />
          {slsMode ? (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-orange-600 font-semibold">SCS Discount %</label>
                <input
                  type="number" min={0} max={100} step={0.5}
                  value={finalSlsDiscountPct}
                  onChange={(e) => setFinalSlsDiscountPct(Number(e.target.value))}
                  className="border-2 border-orange-300 rounded-lg px-2.5 py-1.5 text-sm w-20 bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-400 font-semibold text-orange-900"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-orange-600 font-semibold">Formula</label>
                <div className="px-2.5 py-1.5 text-xs text-orange-700 bg-orange-100 border border-orange-200 rounded-lg whitespace-nowrap">
                  RRP × {(1 - finalSlsDiscountPct / 100).toFixed(2)} = Cost
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-amber-600 font-semibold">Discount %</label>
                <input
                  type="number" min={0} step={0.1}
                  value={finalDiscountPct || ''}
                  placeholder="0"
                  onChange={(e) => setFinalDiscountPct(Number(e.target.value))}
                  className="border-2 border-amber-300 rounded-lg px-2.5 py-1.5 text-sm w-20 bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400 font-semibold text-amber-900"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-amber-600 font-semibold">Wholesale + Disc + VAT15%</label>
                <div className="px-2.5 py-1.5 text-sm w-36 bg-amber-100 border-2 border-amber-300 rounded-lg text-amber-900 font-bold text-center">
                  {finalDiscountPct > 0
                    ? `R ${fmtFC(totalWholesaleZAR * (1 + finalDiscountPct / 100) * 1.15)}`
                    : `R ${fmtFC(totalWholesaleZAR * 1.15)}`}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── JSS Calculator (Jeffrey Stein Supplier) ── */}
      {(isJssSupplier || jssMode) && (
        <div className={`border rounded-xl px-5 py-4 ${jssMode ? 'bg-violet-50 border-violet-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">
              JSS Calculator — Jeffrey Stein Supplier
            </p>
            {jssMode && jssTotalWholesale > 0 && (
              <span className="text-xs text-violet-600">Total wholesale: R {fmtFC(jssTotalWholesale)}</span>
            )}
          </div>
          {jssMode && (
            <div className="flex flex-wrap items-end gap-3">
              {/* Shipping cost input */}
              <div className="flex items-end gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Total Shipping (ZAR) <span className="text-violet-500 font-mono">G19</span></label>
                  <input
                    type="number" min={0} step={0.01}
                    value={jssShippingCost || ''}
                    placeholder="0.00"
                    onChange={(e) => setJssShippingCost(Number(e.target.value))}
                    className="border-2 border-violet-300 rounded-lg px-2.5 py-1.5 text-sm w-36 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400">Shipping % <span className="text-violet-500 font-mono">G3</span></label>
                  <div className="px-2.5 py-1.5 text-sm w-24 bg-violet-100 border border-violet-200 rounded-lg text-violet-800 font-semibold text-center">
                    {jssShippingPct.toFixed(4)}%
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">VAT %</label>
                <input type="number" min={0} step={0.5} value={jssVatPct}
                  onChange={(e) => setJssVatPct(Number(e.target.value))}
                  className="border border-violet-200 rounded-lg px-2.5 py-1.5 text-sm w-20 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Discount %</label>
                <input type="number" min={0} step={0.5} value={jssDiscountPct}
                  onChange={(e) => setJssDiscountPct(Number(e.target.value))}
                  className="border border-violet-200 rounded-lg px-2.5 py-1.5 text-sm w-20 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Markup %</label>
                <input type="number" min={0} step={1} value={jssMarkupPct}
                  onChange={(e) => setJssMarkupPct(Number(e.target.value))}
                  className="border border-violet-200 rounded-lg px-2.5 py-1.5 text-sm w-20 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-violet-600 font-semibold">Formula</label>
                <div className="px-2.5 py-1.5 text-xs text-violet-700 bg-violet-100 border border-violet-200 rounded-lg whitespace-nowrap">
                  W + Shipping → Landed × {(1 + jssVatPct / 100).toFixed(2)} → × {(1 - jssDiscountPct / 100).toFixed(3)} → × {(1 + jssMarkupPct / 100).toFixed(2)} = Retail
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CUT Calculator ── */}
      {cutMode && (
        <div className="border border-rose-200 rounded-xl px-5 py-4 bg-rose-50">
          <div className="flex items-center gap-3 mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">CUT Calculator</p>
            {items.filter(it => it.wholesalePrice > 0).length > 0 && (
              <span className="text-xs text-rose-600">
                Total wholesale: R {fmtFC(items.filter(it => it.wholesalePrice > 0).reduce((s, it) => s + it.qty * it.wholesalePrice * exchangeRate, 0))}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-rose-700">Discount %</label>
              <input
                type="number" min={0} max={100} step={0.5}
                value={cutDiscountPct}
                onChange={(e) => setCutDiscountPct(Number(e.target.value))}
                className="border-2 border-rose-300 rounded-lg px-2.5 py-1.5 text-sm w-24 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 font-semibold text-rose-900"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-rose-600 font-semibold">Formula</label>
              <div className="px-2.5 py-1.5 text-xs text-rose-700 bg-rose-100 border border-rose-200 rounded-lg whitespace-nowrap">
                W - ({cutDiscountPct}% × W) = W × {(1 - cutDiscountPct / 100).toFixed(4)} = CUT
              </div>
            </div>
            {items.filter(it => it.wholesalePrice > 0).length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-rose-600 font-semibold">Total CUT</label>
                <div className="px-3 py-1.5 text-sm font-bold text-rose-800 bg-rose-200 border border-rose-300 rounded-lg">
                  R {fmtFC(items.filter(it => it.wholesalePrice > 0).reduce((s, it) => s + it.qty * effectiveW(it.wholesalePrice) * exchangeRate, 0))}
                  {slsMode && cutMode && <span className="block text-[10px] text-rose-500 mt-0.5">SCS → CUT applied</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
              onClick={() => setShowQtyConfirm(true)}
              disabled={checkedItems.size === 0 || sendingInventory}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                inventorySent ? 'bg-green-600 text-white' :
                checkedItems.size > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' :
                'bg-indigo-100 text-indigo-400 cursor-not-allowed'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
              {inventorySent ? '✓ Qty Updated!' : sendingInventory ? 'Updating…' : `Update Qty's${checkedItems.size > 0 ? ` (${checkedItems.size})` : ''}`}
            </button>
            <button
              onClick={sendToChecklist}
              disabled={sendingChecklist || !hasItems}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                checklistSent ? 'bg-green-600 text-white' : 'bg-cyan-600 text-white hover:bg-cyan-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              {checklistSent ? '✓ Checklist!' : sendingChecklist ? 'Sending…' : 'Send to Checklist'}
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
              onClick={handleUpdateProducts}
              disabled={updatingCosts || !items.some((it) => it.sku)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                costsUpdated ? 'bg-green-600 text-white' :
                updatingCosts ? 'bg-gray-400 text-white' :
                'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              {costsUpdated ? '✓ Costing Updated!' : updatingCosts ? 'Updating…' : 'Update Products'}
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
              onClick={() => setShowInvoiceModal(true)}
              disabled={!hasItems}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-40"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
              Create Invoice
            </button>
            <button
              onClick={() => setShowR66InvoiceModal(true)}
              disabled={!items.some(it => it.costingEntity === 'R66' && it.sku)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
              title="R66 items only — Final Landed + 15% VAT"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
              R66 Invoice
            </button>
            <button
              onClick={() => setShowJDMInvoiceModal(true)}
              disabled={!items.some(it => it.costingEntity === 'JDM' && it.sku)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40"
              title="JDM items only — Final Landed, no VAT"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
              JDM Invoice
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

        {/* Tracking number + Supplier Invoice Number + INV Date */}
        <div className="px-5 pt-3 pb-1 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Invoice #</label>
            <input
              type="text"
              value={supplierInvNumber}
              onChange={e => setSupplierInvNumber(e.target.value)}
              placeholder="e.g. SW-2026-001"
              className="border border-gray-200 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">INV Date</label>
            <input
              type="date"
              value={supplierInvDate}
              onChange={e => setSupplierInvDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* Date display */}
        {displayDate && (
          <div className="px-5 pt-1 pb-1">
            <p className="text-sm font-semibold text-gray-700">{displayDate}</p>
          </div>
        )}

        {/* Column visibility button */}
        <div className="px-5 pb-1 flex items-center justify-end">
          <div className="relative" ref={colMenuRef}>
            <button
              onClick={() => setShowColMenu(v => !v)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${hiddenCols.size > 0 ? 'border-blue-400 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              Columns{hiddenCols.size > 0 ? ` (${hiddenCols.size} hidden)` : ''}
            </button>
            {showColMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-40 py-2 w-52">
                {([
                  { key: 'retail_zar', label: 'Retail (ZAR)' },
                  { key: 'in_stock', label: 'In Stock' },
                  { key: 'landed_zar', label: 'Landed (ZAR)' },
                  { key: 'pre_order', label: 'Pre Order Price' },
                  { key: 'final_landed', label: 'Final Landed' },
                  { key: 'landed_retail', label: 'Landed Retail' },
                ] as { key: string; label: string }[]).map(col => (
                  <label key={col.key} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!hiddenCols.has(col.key)}
                      onChange={() => setHiddenCols(prev => {
                        const next = new Set(prev)
                        if (next.has(col.key)) next.delete(col.key); else next.add(col.key)
                        return next
                      })}
                      className="rounded accent-blue-600 w-3.5 h-3.5"
                    />
                    <span className="text-xs text-gray-700">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto p-5 pt-2">
          <table className="w-full text-sm" style={{ minWidth: '1100px' }}>
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-400">
                <th className="text-left pb-2 w-6">#</th>
                <th className="text-center pb-2 px-1 w-14" title="Costing account: R66 = Route 66 Imports (15% VAT) · JDM = JDM Garage (no VAT)">Acct</th>
                <th className="text-left pb-2 px-2" style={{ minWidth: '110px' }}>SKU</th>
                <th className="text-left pb-2 px-2" style={{ minWidth: '150px' }}>Description</th>
                {!hiddenCols.has('retail_zar') && <th className="text-right pb-2 px-2 w-24">Retail (ZAR)</th>}
                {!hiddenCols.has('in_stock') && <th className="text-center pb-2 px-2 w-20">In Stock</th>}
                <th className="text-center pb-2 px-1 w-8" title="Check to confirm stock received">✓</th>
                <th className="text-center pb-2 px-2 w-14">Qty</th>
                <th className="text-right pb-2 px-2" style={{ minWidth: '120px' }}>
                  {slsMode ? <span className="text-orange-700">RRP / Retail ({currency})</span> : `Wholesale (${currency})`}
                </th>
                {slsMode && <th className="text-right pb-2 px-2 text-orange-600" style={{ minWidth: '110px' }}>Wholesale ({currency})</th>}
                {!hiddenCols.has('landed_zar') && <th className="text-right pb-2 px-2" style={{ minWidth: '110px' }}>Landed (ZAR)</th>}
                {!hiddenCols.has('pre_order') && <th className="text-right pb-2 px-2" style={{ minWidth: '110px' }}>Pre Order Price</th>}
                {!hiddenCols.has('final_landed') && <th className="text-right pb-2 px-2 text-emerald-500" style={{ minWidth: '110px' }}>Final Landed</th>}
                {!hiddenCols.has('landed_retail') && <th className="text-right pb-2 px-2 text-emerald-500" style={{ minWidth: '110px' }}>Landed Retail</th>}
                {jssMode && <th className="text-right pb-2 px-2 text-violet-600" style={{ minWidth: '110px' }}>JSS Retail</th>}
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

                    {/* Costing Entity */}
                    <td className="py-2 px-1 text-center">
                      <select
                        value={it.costingEntity || ''}
                        onChange={(e) => updateItem(it.id, { costingEntity: e.target.value as 'R66' | 'JDM' | '' })}
                        className={`text-[10px] font-bold rounded-md px-1 py-1 border-0 outline-none cursor-pointer ${
                          it.costingEntity === 'R66' ? 'bg-blue-100 text-blue-700' :
                          it.costingEntity === 'JDM' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-400'
                        }`}
                      >
                        <option value="">—</option>
                        <option value="R66">R66</option>
                        <option value="JDM">JDM</option>
                      </select>
                    </td>

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
                                const mappedEntity = skuEntityMap[p.sku.trim().toUpperCase()] as 'R66' | 'JDM' | undefined
                                updateItem(it.id, {
                                  sku: p.sku, skuSearch: '', description: p.title,
                                  unit: p.unit, category: p.category,
                                  inStock: p.quantity, retailPrice: p.price,
                                  preOrderPrice: p.preOrderPrice || 0,
                                  ...(plEntry ? { wholesalePrice: plEntry.wholesalePrice } : {}),
                                  ...(mappedEntity ? { costingEntity: mappedEntity } : {}),
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
                    {!hiddenCols.has('retail_zar') && <td className="py-2 px-2">
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
                    </td>}

                    {/* In Stock */}
                    {!hiddenCols.has('in_stock') && <td className="py-2 px-2 text-center">
                      <span className={`inline-block px-2 py-1 rounded-lg text-xs font-semibold ${it.inStock > 0 ? 'bg-green-50 text-green-700 border border-green-100' : 'text-gray-300'}`}>
                        {it.inStock > 0 ? it.inStock : '—'}
                      </span>
                    </td>}

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

                    {/* Wholesale / CUT Wholesale */}
                    <td className="py-2 px-2">
                      {cutMode ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-[10px] text-gray-400">Base</span>
                            <input type="number" min={0} step={0.01} value={it.wholesalePrice || ''} placeholder="0.00"
                              onChange={(e) => updateItem(it.id, { wholesalePrice: Number(e.target.value) })}
                              onFocus={() => setActiveSkuRow(null)}
                              className="w-20 border border-gray-200 rounded px-2 py-0.5 text-[10px] text-right focus:outline-none focus:ring-1 focus:ring-rose-400 text-gray-500"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-xs text-rose-400">{currency}</span>
                            <span className={`w-24 px-2.5 py-1.5 text-xs text-right rounded-lg font-bold ${it.wholesalePrice > 0 ? 'text-rose-700 bg-rose-50 border border-rose-300' : 'text-gray-300'}`}>
                              {it.wholesalePrice > 0 ? fmtFC(effectiveW(it.wholesalePrice)) : '—'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end">
                          <span className="text-xs text-gray-400 mr-1">{currency}</span>
                          <input type="number" min={0} step={0.01} value={it.wholesalePrice || ''} placeholder="0.00"
                            onChange={(e) => updateItem(it.id, { wholesalePrice: Number(e.target.value) })}
                            onFocus={() => setActiveSkuRow(null)}
                            className="w-24 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </div>
                      )}
                    </td>

                    {/* SCS Wholesale Price (SCS mode only) */}
                    {slsMode && (
                      <td className="py-2 px-2">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-xs text-gray-400">{currency}</span>
                          <span className={`w-24 px-2.5 py-1.5 text-xs text-right rounded-lg ${it.wholesalePrice > 0 ? 'text-orange-700 bg-orange-50 border border-orange-100' : 'text-gray-300'}`}>
                            {it.wholesalePrice > 0 ? fmtFC(it.wholesalePrice * (1 - slsDiscountPct / 100)) : '—'}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Landed Cost */}
                    {!hiddenCols.has('landed_zar') && <td className="py-2 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-gray-400">R</span>
                        <span className={`w-24 px-2.5 py-1.5 text-xs text-right rounded-lg ${it.wholesalePrice > 0 ? 'text-gray-700 bg-gray-50 border border-gray-100' : 'text-gray-300'}`}>
                          {it.wholesalePrice > 0 ? fmtFC(landedCost) : '—'}
                        </span>
                      </div>
                    </td>}

                    {/* Pre Order Price */}
                    {!hiddenCols.has('pre_order') && <td className="py-2 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-gray-400">R</span>
                        <span className="w-24 text-xs text-right text-gray-700 px-2.5 py-1.5">
                          {it.wholesalePrice > 0 ? calcRetail(it.wholesalePrice).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '—'}
                        </span>
                      </div>
                    </td>}

                    {/* Final Landed */}
                    {!hiddenCols.has('final_landed') && <td className="py-2 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-gray-400">R</span>
                        <span className={`w-24 px-2.5 py-1.5 text-xs text-right rounded-lg ${
                          hasFinal
                            ? it.costingEntity === 'R66'
                              ? 'text-blue-700 bg-blue-50 border border-blue-100'
                              : it.costingEntity === 'JDM'
                              ? 'text-purple-700 bg-purple-50 border border-purple-100'
                              : 'text-emerald-700 bg-emerald-50 border border-emerald-100'
                            : 'text-gray-300'
                        }`}>
                          {hasFinal ? fmtFC(calcEntityFinalLanded(it.wholesalePrice, it.costingEntity)) : '—'}
                        </span>
                      </div>
                    </td>}

                    {/* Landed Retail */}
                    {!hiddenCols.has('landed_retail') && <td className="py-2 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-gray-400">R</span>
                        <span className={`w-24 px-2.5 py-1.5 text-xs text-right rounded-lg font-semibold ${hasFinal ? 'text-emerald-800 bg-emerald-100 border border-emerald-200' : 'text-gray-300'}`}>
                          {hasFinal ? fmtFC(calcFinalRetail(it.wholesalePrice)) : '—'}
                        </span>
                      </div>
                    </td>}

                    {/* JSS Retail */}
                    {jssMode && (
                      <td className="py-2 px-2">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-xs text-gray-400">R</span>
                          <span className={`w-24 px-2.5 py-1.5 text-xs text-right rounded-lg font-semibold ${it.wholesalePrice > 0 ? 'text-violet-800 bg-violet-100 border border-violet-200' : 'text-gray-300'}`}>
                            {it.wholesalePrice > 0 ? fmtFC(calcJssRetail(it.wholesalePrice)) : '—'}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Total Cost in currency */}
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <span className={`text-xs ${cutMode ? 'text-rose-400' : 'text-gray-400'}`}>{currency}</span>
                        <span className={`w-24 px-2.5 py-1.5 text-xs text-right rounded-lg font-semibold ${it.wholesalePrice > 0 ? (cutMode ? 'text-rose-700 bg-rose-50 border border-rose-200' : 'text-blue-700 bg-blue-50 border border-blue-100') : 'text-gray-300'}`}>
                          {it.wholesalePrice > 0 ? fmtFC(it.qty * effectiveW(it.wholesalePrice)) : '—'}
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
              const totalCur = filledItems.reduce((s, it) => s + it.qty * effectiveW(it.wholesalePrice), 0)
              const totalZAR = filledItems.reduce((s, it) => s + it.qty * effectiveW(it.wholesalePrice) * exchangeRate, 0)
              return (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td colSpan={
                      7 // #, Acct, SKU, Description, ✓, Qty, Wholesale/RRP
                      + (!hiddenCols.has('retail_zar') ? 1 : 0)
                      + (!hiddenCols.has('in_stock') ? 1 : 0)
                      + (slsMode ? 1 : 0)
                      + (!hiddenCols.has('landed_zar') ? 1 : 0)
                      + (!hiddenCols.has('pre_order') ? 1 : 0)
                      + (!hiddenCols.has('final_landed') ? 1 : 0)
                      + (!hiddenCols.has('landed_retail') ? 1 : 0)
                      + (jssMode ? 1 : 0)
                    } className="py-3 px-2 text-xs font-semibold text-gray-500 text-right uppercase tracking-wider pr-4">
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
          currency={currency}
          supplierInvNumber={supplierInvNumber}
          supplierInvDate={supplierInvDate}
          items={items.filter((it) => it.sku).map((it) => ({
            sku: it.sku,
            description: it.description,
            qty: it.qty,
            wholesalePrice: it.wholesalePrice,
            landedCost: Math.round(calcFinalLanded(it.wholesalePrice) * 100) / 100,
            costingEntity: it.costingEntity || '',
          }))}
          onClose={() => setShowSupplierOrderModal(false)}
        />
      )}

      {/* ── Create Invoice Modal (all items, no VAT) ── */}
      {showInvoiceModal && (
        <WorksheetInvoiceModal
          supplierName={supplier}
          companyInfo={companyInfo}
          invoiceDate={worksheetDate}
          items={items.filter((it) => it.sku && it.wholesalePrice > 0).map((it) => ({
            sku: it.sku, description: it.description, qty: it.qty,
            unitCost: Math.round(calcFinalLanded(it.wholesalePrice) * 100) / 100,
          }))}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}

      {/* ── R66 Invoice Modal (R66 items, +15% VAT) ── */}
      {showR66InvoiceModal && (
        <WorksheetInvoiceModal
          supplierName={supplier}
          companyInfo={companyInfo}
          invoiceDate={worksheetDate}
          title="R66 Imports Invoice"
          vatPct={15}
          items={items.filter((it) => it.costingEntity === 'R66' && it.sku && it.wholesalePrice > 0).map((it) => ({
            sku: it.sku, description: it.description, qty: it.qty,
            unitCost: Math.round(calcFinalLanded(it.wholesalePrice) * 100) / 100,
          }))}
          onClose={() => setShowR66InvoiceModal(false)}
        />
      )}

      {/* ── JDM Invoice Modal (JDM items, no VAT, company name override) ── */}
      {showJDMInvoiceModal && (
        <WorksheetInvoiceModal
          supplierName={supplier}
          companyInfo={{ ...companyInfo, name: 'JDM Garage PTY LTD' }}
          invoiceDate={worksheetDate}
          title="JDM Garage Invoice"
          vatPct={0}
          items={items.filter((it) => it.costingEntity === 'JDM' && it.sku && it.wholesalePrice > 0).map((it) => ({
            sku: it.sku, description: it.description, qty: it.qty,
            unitCost: Math.round(calcFinalLanded(it.wholesalePrice) * 100) / 100,
          }))}
          onClose={() => setShowJDMInvoiceModal(false)}
        />
      )}

      {showQtyConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-1">Update Quantities</h3>
            <p className="text-sm text-gray-500 mb-4">The following items will have their stock quantities updated:</p>
            <div className="space-y-1 max-h-60 overflow-y-auto mb-4">
              {items.filter(it => checkedItems.has(it.id) && it.sku && it.qty > 0 && !it.sentToInventory).map(it => (
                <div key={it.id} className="flex items-center justify-between text-sm px-3 py-1.5 bg-gray-50 rounded-lg">
                  <span className="font-mono text-xs text-gray-500 w-20 shrink-0">{it.sku}</span>
                  <span className="flex-1 truncate text-gray-700 mx-2">{it.description}</span>
                  <span className="font-semibold text-indigo-700 shrink-0">+{it.qty}</span>
                </div>
              ))}
              {items.filter(it => checkedItems.has(it.id) && it.sku && it.qty > 0 && !it.sentToInventory).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No valid items selected.</p>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowQtyConfirm(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
              <button
                onClick={async () => { setShowQtyConfirm(false); await sendToInventory() }}
                disabled={items.filter(it => checkedItems.has(it.id) && it.sku && it.qty > 0 && !it.sentToInventory).length === 0}
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold disabled:opacity-40"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Update Dialog (existing SKU — pricing only, no qty change) ── */}

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
  scale: string
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
      const fromProd = Array.isArray(prod?.categoryBrands) && prod.categoryBrands.length > 0 ? prod.categoryBrands : []
      const categoryBrands = fromProd.length > 0 ? fromProd : (it.category ? [it.category] : [])
      const fromProdCats = Array.isArray(prod?.itemCategories) && prod.itemCategories.length > 0 ? prod.itemCategories : []
      const itemCategories = fromProdCats.length > 0 ? fromProdCats : (it.unit ? [it.unit] : [])
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
        itemCategories,
        salesAccount,
        purchaseAccount,
        scale: prod?.scale || it.unit || '',
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
        brand: row.categoryBrands[0] || null,
        categoryBrands: row.categoryBrands.length > 0 ? row.categoryBrands : null,
        itemCategories: row.itemCategories.length > 0 ? row.itemCategories : null,
        salesAccount: row.salesAccount.length > 0 ? row.salesAccount : null,
        purchaseAccount: row.purchaseAccount.length > 0 ? row.purchaseAccount : null,
        scale: row.scale || null,
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

// ─── Worksheet Invoice Modal ──────────────────────────────────────────────────

function WorksheetInvoiceModal({
  supplierName, companyInfo, invoiceDate, items, onClose, title, vatPct,
}: {
  supplierName: string
  companyInfo: CompanyInfo
  invoiceDate: string
  items: { sku: string; description: string; qty: number; unitCost: number }[]
  onClose: () => void
  title?: string
  vatPct?: number  // 15 for R66, 0 or undefined for no VAT
}) {
  const [poRef, setPoRef] = useState('')
  const [date, setDate] = useState(invoiceDate || new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState(items.map(it => ({ ...it })))

  const subtotal = rows.reduce((s, r) => s + r.qty * r.unitCost, 0)
  const vatAmt = vatPct ? subtotal * vatPct / 100 : 0
  const grandTotal = subtotal + vatAmt

  function updateRow(idx: number, field: string, value: string | number) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  function generatePDF() {
    const displayDate = new Date(date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })
    const rowsHtml = rows.filter(r => r.sku || r.description).map((r, i) => {
      const lineTotal = r.qty * r.unitCost
      return `<tr>
        <td style="padding:8px 12px;color:#6b7280;font-size:13px;">${i + 1}</td>
        <td style="padding:8px 12px;font-family:monospace;font-size:12px;font-weight:600;">${r.sku}</td>
        <td style="padding:8px 12px;font-size:13px;">${r.description}</td>
        <td style="padding:8px 12px;text-align:center;font-size:13px;">${r.qty}</td>
        <td style="padding:8px 12px;text-align:right;font-size:13px;">R ${r.unitCost.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</td>
        <td style="padding:8px 12px;text-align:right;font-weight:700;font-size:13px;">R ${lineTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</td>
      </tr>`
    }).join('')
    const billedToBlock = `
      <p style="font-size:13px;font-weight:700;">${companyInfo.name || ''}</p>
      ${companyInfo.address ? `<p style="font-size:12px;color:#374151;">${companyInfo.address}</p>` : ''}
      ${(companyInfo.city || companyInfo.postalCode) ? `<p style="font-size:12px;color:#374151;">${[companyInfo.city, companyInfo.postalCode].filter(Boolean).join(', ')}</p>` : ''}
      ${companyInfo.phone ? `<p style="font-size:12px;color:#374151;">${companyInfo.phone}</p>` : ''}
      ${companyInfo.email ? `<p style="font-size:12px;color:#374151;">${companyInfo.email}</p>` : ''}
      ${companyInfo.vatNumber ? `<p style="font-size:11px;color:#9ca3af;margin-top:4px;">VAT: ${companyInfo.vatNumber}</p>` : ''}`
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice – ${supplierName || 'Supplier'}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;padding:20mm;background:white}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}
    .title{font-size:28px;font-weight:800;color:#111827;margin-bottom:4px}
    .meta{font-size:13px;color:#6b7280;margin-top:2px}
    .info-row{display:flex;gap:32px;margin-bottom:28px}
    .info-box{flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px}
    .info-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-bottom:6px}
    table{width:100%;border-collapse:collapse}
    thead tr{border-bottom:2px solid #111827}
    th{padding:9px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280}
    th.right{text-align:right}th.center{text-align:center}
    tbody tr{border-bottom:1px solid #f3f4f6}tbody tr:nth-child(even){background:#f9fafb}
    tfoot tr{border-top:2px solid #111827}
    tfoot td{padding:10px 12px;font-weight:700;font-size:14px}
    @page{size:A4;margin:0}</style>
    </head><body>
    <div class="header">
      <div><p class="title">INVOICE</p>
      ${poRef ? `<p class="meta">Ref: <strong>${poRef}</strong></p>` : ''}
      <p class="meta">Date: ${displayDate}</p></div>
      ${supplierName ? `<div style="text-align:right"><p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:4px">From</p><p style="font-weight:700;font-size:15px;">${supplierName}</p></div>` : ''}
    </div>
    <div class="info-row">
      <div class="info-box"><p class="info-label">Billed To</p>${billedToBlock}</div>
      <div class="info-box" style="flex:0;min-width:200px;">
        <p class="info-label">Invoice Total</p>
        ${vatPct ? `<p style="font-size:13px;color:#6b7280;margin-top:4px;">Excl. VAT: R ${subtotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</p>
        <p style="font-size:13px;color:#6b7280;">VAT (${vatPct}%): R ${vatAmt.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</p>` : ''}
        <p style="font-size:22px;font-weight:800;color:#111827;margin-top:4px;">R ${grandTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</p>
        <p style="font-size:11px;color:#9ca3af;margin-top:4px;">${rows.filter(r => r.sku).reduce((s, r) => s + r.qty, 0)} items${vatPct ? ` · incl. ${vatPct}% VAT` : ' · landed cost'}</p>
      </div>
    </div>
    <table>
      <thead><tr>
        <th style="width:36px">#</th><th>SKU</th><th>Description</th>
        <th class="center" style="width:60px">Qty</th>
        <th class="right" style="width:120px">Unit Cost (ZAR)</th>
        <th class="right" style="width:120px">Total (ZAR)</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        ${vatPct ? `<tr><td colspan="5" style="text-align:right;padding-right:12px;color:#6b7280;font-size:13px;">Subtotal (excl. VAT)</td><td style="text-align:right;font-size:13px;font-weight:500;">R ${subtotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</td></tr>
        <tr><td colspan="5" style="text-align:right;padding-right:12px;color:#6b7280;font-size:13px;">VAT (${vatPct}%)</td><td style="text-align:right;font-size:13px;font-weight:500;">R ${vatAmt.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</td></tr>` : ''}
        <tr><td colspan="5" style="text-align:right;padding-right:12px;color:#6b7280;font-size:13px;">${vatPct ? 'Total (incl. VAT)' : 'Total'}</td><td style="text-align:right;">R ${grandTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</td></tr>
      </tfoot>
    </table></body></html>`
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 350) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title ?? 'Create Invoice'}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {supplierName && <span className="font-medium">{supplierName}</span>}
              {supplierName && ' · '}{vatPct ? `Landed + ${vatPct}% VAT` : 'Landed cost'} · R {grandTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} total
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Billed to summary */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Billed To</p>
            <p className="text-sm font-semibold text-gray-900">{companyInfo.name || '—'}</p>
            {companyInfo.address && <p className="text-xs text-gray-500">{companyInfo.address}</p>}
            {(companyInfo.city || companyInfo.postalCode) && <p className="text-xs text-gray-500">{[companyInfo.city, companyInfo.postalCode].filter(Boolean).join(', ')}</p>}
            {companyInfo.vatNumber && <p className="text-xs text-gray-400 mt-1">VAT: {companyInfo.vatNumber}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reference / Invoice #</label>
              <input value={poRef} onChange={e => setPoRef(e.target.value)} placeholder="INV-001"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          {/* Line items */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-24">SKU</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Description</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 w-16">Qty</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 w-28">Unit Cost (ZAR)</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="px-3 py-1.5">
                      <span className="font-mono text-xs font-semibold text-blue-700">{row.sku}</span>
                    </td>
                    <td className="px-3 py-1.5 text-xs text-gray-600 truncate max-w-[200px]">{row.description}</td>
                    <td className="px-3 py-1.5 text-center">
                      <input type="number" min={1} value={row.qty} onChange={e => updateRow(idx, 'qty', parseInt(e.target.value) || 1)}
                        className="w-14 border-0 bg-transparent text-xs text-center font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-1" />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <input type="number" min={0} step={0.01} value={row.unitCost} onChange={e => updateRow(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                        className="w-24 border-0 bg-transparent text-xs text-right text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-1" />
                    </td>
                    <td className="px-3 py-1.5 text-right text-xs font-semibold text-gray-900">
                      R {(row.qty * row.unitCost).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                {vatPct ? (
                  <>
                    <tr>
                      <td colSpan={4} className="px-3 py-1.5 text-right text-xs text-gray-500">Subtotal (excl. VAT)</td>
                      <td className="px-3 py-1.5 text-right text-xs text-gray-700">R {subtotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-3 py-1.5 text-right text-xs text-gray-500">VAT ({vatPct}%)</td>
                      <td className="px-3 py-1.5 text-right text-xs text-gray-700">R {vatAmt.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Total (incl. VAT)</td>
                      <td className="px-3 py-2.5 text-right text-sm font-bold text-gray-900">R {grandTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Total</td>
                    <td className="px-3 py-2.5 text-right text-sm font-bold text-gray-900">R {grandTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={generatePDF} disabled={rows.length === 0}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Download Invoice PDF
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Worksheet Supplier Order Modal ───────────────────────────────────────────

function WorksheetSupplierOrderModal({
  supplierName, suppliers, companyInfo, orderDate, items, currency,
  supplierInvNumber, supplierInvDate, onClose,
}: {
  supplierName: string
  suppliers: SupplierContact[]
  companyInfo: CompanyInfo
  orderDate: string
  currency?: string
  supplierInvNumber?: string
  supplierInvDate?: string
  items: { sku: string; description: string; qty: number; wholesalePrice?: number; landedCost?: number; costingEntity?: string }[]
  onClose: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [rows, setRows] = useState(items.length > 0 ? items.map(it => ({ sku: it.sku, description: it.description, qty: it.qty })) : [{ sku: '', description: '', qty: 1 }])
  const [poNumber, setPoNumber] = useState('')
  const [date, setDate] = useState(orderDate || today)

  const curr = currency || 'ZAR'
  const currSym = ({ EUR: '€', GBP: '£', CNY: '¥', HKD: 'HK$', SGD: 'S$', ZAR: 'R', USD: '$' } as Record<string, string>)[curr] ?? (curr + ' ')
  const fmtR = (n: number) => 'R ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const fmtC = (n: number) => currSym + ' ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const jdmItems = items.filter(it => it.costingEntity === 'JDM' && (it.landedCost || 0) > 0)

  const INV_CSS = `*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;padding:20mm;background:white}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}
    .title{font-size:28px;font-weight:800;color:#111827;margin-bottom:4px}.meta{font-size:13px;color:#111827;margin-top:2px}
    .info-row{display:flex;gap:32px;margin-bottom:28px}.info-box{flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px}
    .lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-bottom:6px}
    table{width:100%;border-collapse:collapse}thead tr{border-bottom:2px solid #111827}
    th{padding:9px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280}
    th.r{text-align:right}th.c{text-align:center}
    tbody tr{border-bottom:1px solid #f3f4f6}tbody tr:nth-child(even){background:#f9fafb}
    tfoot tr{border-top:2px solid #111827}tfoot td{padding:10px 12px;font-weight:700;font-size:14px}@page{size:A4;margin:0}`

  function invoiceHTML(opts: {
    fromBlock: string; billedToBlock: string; unitLabel: string; totalLabel: string;
    invItems: { sku: string; description: string; qty: number; unitPrice: number }[]
    vatPct?: number; totalNote: string; sym?: string
  }) {
    const { fromBlock, billedToBlock, unitLabel, totalLabel, invItems, vatPct, totalNote, sym = 'R ' } = opts
    const invNum = supplierInvNumber || ''
    const invDateDisplay = supplierInvDate
      ? new Date(supplierInvDate + 'T00:00:00').toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date(date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })
    const subtotal = invItems.reduce((s, it) => s + it.qty * it.unitPrice, 0)
    const vatAmt = vatPct ? subtotal * vatPct / 100 : 0
    const grand = subtotal + vatAmt
    const fmtAmt = (n: number) => sym + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    const rowsHtml = invItems.map((it, i) => {
      const lt = it.qty * it.unitPrice
      return `<tr>
        <td style="padding:8px 12px;color:#6b7280;font-size:13px;">${i + 1}</td>
        <td style="padding:8px 12px;font-family:monospace;font-size:12px;font-weight:600;">${it.sku}</td>
        <td style="padding:8px 12px;font-size:13px;">${it.description}</td>
        <td style="padding:8px 12px;text-align:center;font-size:13px;">${it.qty}</td>
        <td style="padding:8px 12px;text-align:right;font-size:13px;">${fmtAmt(it.unitPrice)}</td>
        <td style="padding:8px 12px;text-align:right;font-weight:700;font-size:13px;">${fmtAmt(lt)}</td>
      </tr>`
    }).join('')
    const footerHtml = vatPct
      ? `<tr><td colspan="5" style="text-align:right;padding-right:12px;color:#6b7280;font-size:13px;">Subtotal (excl. VAT)</td><td style="text-align:right;font-size:13px;">${fmtAmt(subtotal)}</td></tr>
         <tr><td colspan="5" style="text-align:right;padding-right:12px;color:#6b7280;font-size:13px;">VAT (${vatPct}%)</td><td style="text-align:right;font-size:13px;">${fmtAmt(vatAmt)}</td></tr>
         <tr><td colspan="5" style="text-align:right;padding-right:12px;color:#6b7280;font-size:13px;">Total (incl. VAT)</td><td style="text-align:right;">${fmtAmt(grand)}</td></tr>`
      : `<tr><td colspan="5" style="text-align:right;padding-right:12px;color:#6b7280;font-size:13px;">Total</td><td style="text-align:right;">${fmtAmt(grand)}</td></tr>`
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice</title><style>${INV_CSS}</style></head><body>
    <div class="hdr">
      <div>
        <p class="title">INVOICE</p>
        ${invNum ? `<p style="font-size:14px;font-weight:700;color:#111827;margin-top:2px;">Invoice #: ${invNum}</p>` : ''}
        <p style="font-size:13px;color:#111827;margin-top:2px;">Date: ${invDateDisplay}</p>
        ${poNumber ? `<p style="font-size:13px;color:#111827;margin-top:2px;">Ref: ${poNumber}</p>` : ''}
      </div>
      <div style="text-align:right">${fromBlock}</div>
    </div>
    <div class="info-row">
      <div class="info-box"><p class="lbl">Billed To</p>${billedToBlock}</div>
      <div class="info-box" style="flex:0;min-width:200px;">
        <p class="lbl">Invoice Total</p>
        ${vatPct ? `<p style="font-size:11px;color:#9ca3af;">Excl. VAT: ${fmtAmt(subtotal)}</p>
        <p style="font-size:11px;color:#9ca3af;">VAT (${vatPct}%): ${fmtAmt(vatAmt)}</p>` : ''}
        <p style="font-size:22px;font-weight:800;color:#111827;margin-top:4px;">${fmtAmt(grand)}</p>
        <p style="font-size:11px;color:#9ca3af;margin-top:4px;">${invItems.reduce((s, it) => s + it.qty, 0)} items · ${totalNote}</p>
      </div>
    </div>
    <table><thead><tr>
      <th style="width:36px">#</th><th>SKU</th><th>Description</th>
      <th class="c" style="width:60px">Qty</th>
      <th class="r" style="width:140px">${unitLabel}</th>
      <th class="r" style="width:140px">${totalLabel}</th>
    </tr></thead><tbody>${rowsHtml}</tbody><tfoot>${footerHtml}</tfoot></table>
    </body></html>`
  }

  function openInvoice(html: string) {
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 350) }
  }

  function generateSupplierInvoice() {
    const invItems = items.filter(it => (it.wholesalePrice || 0) > 0).map(it => ({
      sku: it.sku, description: it.description, qty: it.qty, unitPrice: it.wholesalePrice || 0,
    }))
    if (!invItems.length) return
    const billedTo = `
      <p style="font-size:13px;font-weight:700;">${companyInfo.name}</p>
      ${companyInfo.address ? `<p style="font-size:12px;color:#374151;">${companyInfo.address}</p>` : ''}
      ${(companyInfo.city || companyInfo.postalCode) ? `<p style="font-size:12px;color:#374151;">${[companyInfo.city, companyInfo.postalCode].filter(Boolean).join(', ')}</p>` : ''}
      ${companyInfo.phone ? `<p style="font-size:12px;color:#374151;">${companyInfo.phone}</p>` : ''}
      ${companyInfo.email ? `<p style="font-size:12px;color:#374151;">${companyInfo.email}</p>` : ''}
      ${companyInfo.vatNumber ? `<p style="font-size:11px;color:#9ca3af;margin-top:4px;">VAT: ${companyInfo.vatNumber}</p>` : ''}
      <p style="font-size:11px;color:#9ca3af;">Customs Import Code: 25174181</p>
      <p style="font-size:11px;color:#9ca3af;">HSE Code: 9503.00.90</p>`
    const supplierContact = suppliers.find(s => s.name.toLowerCase() === supplierName.toLowerCase())
    const fromBlock = `
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:4px">FROM</p>
      <p style="font-weight:700;font-size:15px;">${supplierName}</p>
      ${supplierContact?.address ? `<p style="font-size:12px;color:#374151;margin-top:2px;">${supplierContact.address}</p>` : ''}
      ${supplierContact?.phone ? `<p style="font-size:12px;color:#374151;">${supplierContact.phone}</p>` : ''}
      ${supplierContact?.email ? `<p style="font-size:12px;color:#374151;">${supplierContact.email}</p>` : ''}`
    openInvoice(invoiceHTML({ fromBlock, billedToBlock: billedTo, unitLabel: `Unit Cost (${curr})`, totalLabel: `Total (${curr})`, invItems, totalNote: 'wholesale cost', sym: currSym }))
  }

  function generateJDMSupplierInvoice() {
    const invItems = jdmItems.map(it => ({ sku: it.sku, description: it.description, qty: it.qty, unitPrice: it.landedCost || 0 }))
    if (!invItems.length) return
    const billedTo = `
      <p style="font-size:13px;font-weight:700;">R66Slot (PTY) LTD</p>
      ${companyInfo.address ? `<p style="font-size:12px;color:#374151;">${companyInfo.address}</p>` : ''}
      ${(companyInfo.city || companyInfo.postalCode) ? `<p style="font-size:12px;color:#374151;">${[companyInfo.city, companyInfo.postalCode].filter(Boolean).join(', ')}</p>` : ''}
      ${companyInfo.phone ? `<p style="font-size:12px;color:#374151;">${companyInfo.phone}</p>` : ''}
      ${companyInfo.email ? `<p style="font-size:12px;color:#374151;">${companyInfo.email}</p>` : ''}
      <p style="font-size:11px;color:#9ca3af;margin-top:4px;">Customs Import Code: 25174181</p>
      <p style="font-size:11px;color:#9ca3af;">HSE Code: 9503.00.90</p>`
    const fromBlock = `<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:4px">FROM</p><p style="font-weight:700;font-size:15px;">JDM Garage</p>`
    openInvoice(invoiceHTML({ fromBlock, billedToBlock: billedTo, unitLabel: 'Unit Cost (ZAR)', totalLabel: 'Total (ZAR)', invItems, totalNote: 'landed cost' }))
  }

  function generateR66SupplierInvoice() {
    const invItems = jdmItems.map(it => ({ sku: it.sku, description: it.description, qty: it.qty, unitPrice: it.landedCost || 0 }))
    if (!invItems.length) return
    const fromBlock = `
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:4px">FROM</p>
      <p style="font-weight:700;font-size:14px;">Route 66 Imports (PTY) LTD</p>
      <p style="font-size:12px;color:#374151;">217 Clarkson Road, Estoire</p>
      <p style="font-size:12px;color:#374151;">Bloemfontein, 9301</p>
      <p style="font-size:12px;color:#374151;">+27615898921</p>
      <p style="font-size:11px;color:#9ca3af;margin-top:2px;">VAT: 4310297884</p>
      <p style="font-size:11px;color:#9ca3af;">Customs Import Code: 25174181</p>
      <p style="font-size:11px;color:#9ca3af;">HSE Code: 9503.00.90</p>`
    const billedTo = `<p style="font-size:13px;font-weight:700;">JDM Garage PTY LTD</p>`
    openInvoice(invoiceHTML({ fromBlock, billedToBlock: billedTo, unitLabel: 'Unit Cost (ZAR)', totalLabel: 'Total (ZAR)', invItems, vatPct: 15, totalNote: 'incl. 15% VAT' }))
  }

  function updateRow(idx: number, field: string, value: string | number) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  function generatePDF() {
    const totalQty = rows.reduce((s, r) => s + Number(r.qty), 0)
    const rowsHtml = rows.filter(r => r.sku || r.description).map((r, i) => `<tr>
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
         ${companyInfo.vatNumber ? `<p style="font-size:11px;color:#9ca3af;">VAT: ${companyInfo.vatNumber}</p>` : ''}` : ''
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

  // suppress unused warning
  void fmtR; void fmtC

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

          {/* ── Supplier Invoice Buttons ── */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Generate Supplier Invoices</p>
            <div className="space-y-2">
              <button
                onClick={generateSupplierInvoice}
                disabled={!items.some(it => (it.wholesalePrice || 0) > 0)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-40"
              >
                Create Supplier Invoice ({curr})
              </button>
              <button
                onClick={generateJDMSupplierInvoice}
                disabled={jdmItems.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 disabled:opacity-40"
                title={jdmItems.length === 0 ? 'No JDM-tagged items on this worksheet' : ''}
              >
                Create JDM Supplier Invoice (ZAR)
              </button>
              <button
                onClick={generateR66SupplierInvoice}
                disabled={jdmItems.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-40"
                title={jdmItems.length === 0 ? 'No JDM-tagged items on this worksheet' : ''}
              >
                Create R66 Supplier Invoice (+15% VAT)
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={generatePDF} disabled={!rows.some(r => r.sku || r.description)}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Generate Supplier Order
          </button>
        </div>
      </div>
    </div>
  )
}
