'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanyInfo {
  name: string; address: string; city: string; postalCode: string
  country: string; phone: string; email: string; vatNumber: string
}

interface ProductRef {
  id: string; sku: string; title: string; brand: string; price: number; quantity: number
  unit: string; category: string; preOrderPrice?: number | null
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
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '', address: '', city: '', postalCode: '', country: '', phone: '', email: '', vatNumber: '',
  })
  const [products, setProducts] = useState<ProductRef[]>([])
  const [suppliers, setSuppliers] = useState<SupplierContact[]>([])

  const load = useCallback(async () => {
    try {
      const [tmplRes, prodRes, supRes] = await Promise.all([
        fetch('/api/admin/company-info'),
        fetch('/api/admin/products'),
        fetch('/api/admin/supplier-contacts'),
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
        })).filter((p) => p.sku || p.title))
      }

      if (supRes.ok) setSuppliers(await supRes.json())
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
      />
    </div>
  )
}

// ─── Worksheet Editor ─────────────────────────────────────────────────────────

function WorksheetEditor({
  companyInfo, products, suppliers, onRefresh,
}: {
  companyInfo: CompanyInfo
  products: ProductRef[]
  suppliers: SupplierContact[]
  onRefresh: () => void
}) {
  // ── Worksheet identity ──
  const [worksheetId, setWorksheetId] = useState(newSheetId)
  const [supplier, setSupplier] = useState('')
  const [worksheetDate, setWorksheetDate] = useState(() => new Date().toISOString().slice(0, 10))

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

  // ── Dropdown row states ──
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [activeSkuRow, setActiveSkuRow] = useState<string | null>(null)
  const [showNewMenu, setShowNewMenu] = useState(false)
  const newMenuRef = useRef<HTMLDivElement>(null)

  // ── Update Final Costing ──
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
    setSendingInventory(true)
    setInventoryMissed([])
    const missed: string[] = []
    const sentIds: string[] = []
    const sentItems: WsItem[] = []
    try {
      for (const it of toSend) {
        const prod = products.find((p) => p.sku.trim().toLowerCase() === it.sku.trim().toLowerCase())
        if (!prod) { missed.push(it.sku); continue }
        const res = await fetch('/api/admin/pos/stock', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: prod.id, mode: 'add', qty: it.qty }),
        })
        if (!res.ok) missed.push(it.sku)
        else { sentIds.push(it.id); sentItems.push(it) }
      }

      // Save wholesale price (supplier currency) to pricelist so Inventory shows correct value
      const sup = suppliers.find((s) => s.name === supplier)
      if (sup && sentItems.length > 0) {
        const pricelistEntries = sentItems
          .filter((it) => it.wholesalePrice > 0)
          .map((it) => ({
            supplierId: sup.id,
            sku: it.sku,
            wholesalePrice: it.wholesalePrice,
            shopQty: it.qty,
          }))
        if (pricelistEntries.length > 0) {
          await fetch('/api/admin/inventory-pricelists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entries: pricelistEntries }),
          }).catch(() => {})
        }
      }

      // Lock successfully sent items permanently
      if (sentIds.length > 0) {
        setItems((prev) => prev.map((it) => sentIds.includes(it.id) ? { ...it, sentToInventory: true } : it))
      }
      setInventorySent(true)
      setCheckedItems(new Set())
      if (missed.length > 0) setInventoryMissed(missed)
      setTimeout(() => { setInventorySent(false); setInventoryMissed([]) }, 8000)
    } finally {
      setSendingInventory(false)
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
    const headers = ['#', 'SKU', 'Description', 'Unit', 'Category', 'Qty',
      'Landed (ZAR)', 'Pre Order Price',
      'Final Landed (ZAR)', 'Landed Retail (ZAR)', `Total (${currency})`]
    const rows = items.filter((it) => it.sku || it.description).map((it, i) => {
      const landed = calcLanded(it.wholesalePrice)
      const fLanded = calcFinalLanded(it.wholesalePrice)
      const fRetail = calcFinalRetail(it.wholesalePrice)
      const totalCur = it.qty * it.wholesalePrice
      return [i + 1, it.sku, `"${it.description.replace(/"/g, '""')}"`,
        `"${(it.unit || '').replace(/"/g, '""')}"`, `"${(it.category || '').replace(/"/g, '""')}"`,
        it.qty, landed.toFixed(2), it.wholesalePrice > 0 ? calcRetail(it.wholesalePrice).toFixed(2) : '',
        it.wholesalePrice > 0 ? fLanded.toFixed(2) : '',
        it.wholesalePrice > 0 ? fRetail.toFixed(2) : '',
        it.wholesalePrice > 0 ? totalCur.toFixed(2) : '']
    })
    const filledForTotal = items.filter((it) => it.wholesalePrice > 0)
    const grandTotalCur = filledForTotal.reduce((s, it) => s + it.qty * it.wholesalePrice, 0)
    const grandTotalZAR = filledForTotal.reduce((s, it) => s + it.qty * it.wholesalePrice * exchangeRate, 0)
    const totalRow = ['', '', '', '', '', 'TOTAL', '', '', '', '', `${grandTotalCur.toFixed(2)} (R ${grandTotalZAR.toFixed(2)})`]
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
          </div>
        </div>

        {/* Date display */}
        {displayDate && (
          <div className="px-5 pt-3 pb-1">
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

