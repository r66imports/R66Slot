'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────

interface Supplier {
  id: string
  name: string
  code: string
  email: string
  phone: string
  country: string
  website: string
  notes: string
  isActive: boolean
  createdAt: string
}

interface CompanyInfo {
  name: string
  address: string
  city: string
  postalCode: string
  country: string
  phone: string
  email: string
  website: string
  vatNumber: string
  registrationNumber: string
}

interface Customer {
  id: string
  name: string
  email: string
}

interface Backorder {
  id: string
  clientName: string
  clientEmail: string
  clientPhone: string
  sku: string
  description: string
  brand: string
  qty: number
  price: number
  supplierName?: string
  supplierId?: string
  status: 'active' | 'complete' | 'cancelled'
  orderStatus?: string
  notes?: string
  createdAt: string
}

const EMPTY_SUPPLIER: Omit<Supplier, 'id' | 'isActive' | 'createdAt'> = {
  name: '',
  code: '',
  email: '',
  phone: '',
  country: '',
  website: '',
  notes: '',
}

const EMPTY_COMPANY: CompanyInfo = {
  name: '',
  address: '',
  city: '',
  postalCode: '',
  country: 'South Africa',
  phone: '',
  email: '',
  website: '',
  vatNumber: '',
  registrationNumber: '',
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function SuppliersNetworkPage() {
  // Suppliers
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [suppliersLoading, setSuppliersLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [supplierForm, setSupplierForm] = useState({ ...EMPTY_SUPPLIER })
  const [supplierSaving, setSupplierSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Company Info
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({ ...EMPTY_COMPANY })
  const [editingCompany, setEditingCompany] = useState(false)
  const [companyForm, setCompanyForm] = useState<CompanyInfo>({ ...EMPTY_COMPANY })
  const [companySaving, setCompanySaving] = useState(false)

  // Customers (for worksheet client selector)
  const [customers, setCustomers] = useState<Customer[]>([])

  // Backorders
  const [backorders, setBackorders] = useState<Backorder[]>([])
  const [backordersLoading, setBackordersLoading] = useState(false)
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('all')
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false)
  const supplierDropdownRef = useRef<HTMLDivElement>(null)
  const [closedGroups, setClosedGroups] = useState<Set<string>>(new Set())
  const [showCreateOrder, setShowCreateOrder] = useState(false)

  // ─── Data Loading ──────────────────────────────────────────────────────

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/supplier-network')
      if (res.ok) setSuppliers(await res.json())
    } catch (e) {
      console.error('Failed to load suppliers', e)
    } finally {
      setSuppliersLoading(false)
    }
  }, [])

  const loadCompanyInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/company-info')
      if (res.ok) {
        const data = await res.json()
        setCompanyInfo(data)
        setCompanyForm(data)
      }
    } catch (e) {
      console.error('Failed to load company info', e)
    }
  }, [])

  const loadBackorders = useCallback(async () => {
    setBackordersLoading(true)
    try {
      const res = await fetch('/api/admin/backorders')
      if (res.ok) setBackorders(await res.json())
    } catch (e) {
      console.error('Failed to load backorders', e)
    } finally {
      setBackordersLoading(false)
    }
  }, [])

  const loadCustomers = useCallback(async () => {
    try {
      const [clRes, ctRes] = await Promise.all([
        fetch('/api/admin/clients'),
        fetch('/api/admin/contacts'),
      ])
      const clList: any[] = clRes.ok ? await clRes.json() : []
      const ctList: any[] = ctRes.ok ? await ctRes.json() : []
      const seen = new Set<string>()
      const merged: Customer[] = []
      for (const c of [...clList, ...ctList]) {
        const name = `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.companyName || c.email || ''
        const key = (c.email || c.id || name).toLowerCase()
        if (!key || seen.has(key)) continue
        seen.add(key)
        merged.push({ id: c.id, name, email: c.email || '' })
      }
      merged.sort((a, b) => a.name.localeCompare(b.name))
      setCustomers(merged)
    } catch (e) {
      console.error('Failed to load customers', e)
    }
  }, [])

  useEffect(() => {
    loadSuppliers()
    loadCompanyInfo()
    loadBackorders()
    loadCustomers()
  }, [loadSuppliers, loadCompanyInfo, loadBackorders, loadCustomers])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target as Node)) {
        setSupplierDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ─── Supplier CRUD ─────────────────────────────────────────────────────

  function openAddModal() {
    setEditingSupplier(null)
    setSupplierForm({ ...EMPTY_SUPPLIER })
    setShowAddModal(true)
  }

  function openEditModal(s: Supplier) {
    setEditingSupplier(s)
    setSupplierForm({
      name: s.name,
      code: s.code,
      email: s.email,
      phone: s.phone,
      country: s.country,
      website: s.website,
      notes: s.notes,
    })
    setShowAddModal(true)
  }

  async function saveSupplier() {
    if (!supplierForm.name.trim()) return
    setSupplierSaving(true)
    try {
      const body = editingSupplier
        ? { ...supplierForm, id: editingSupplier.id }
        : supplierForm
      const res = await fetch('/api/admin/supplier-network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        await loadSuppliers()
        setShowAddModal(false)
      }
    } finally {
      setSupplierSaving(false)
    }
  }

  async function deleteSupplier(id: string) {
    await fetch(`/api/admin/supplier-network?id=${id}`, { method: 'DELETE' })
    setDeleteConfirmId(null)
    loadSuppliers()
  }

  // ─── Company Info ──────────────────────────────────────────────────────

  async function saveCompanyInfo() {
    setCompanySaving(true)
    try {
      const res = await fetch('/api/admin/company-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyForm),
      })
      if (res.ok) {
        setCompanyInfo({ ...companyForm })
        setEditingCompany(false)
      }
    } finally {
      setCompanySaving(false)
    }
  }

  // ─── Order Sheet Helpers ───────────────────────────────────────────────

  // All unique supplier names from active backorders
  const backorderSuppliers = Array.from(
    new Set(
      backorders
        .filter((b) => b.status === 'active' && b.supplierName)
        .map((b) => b.supplierName as string)
    )
  ).sort()

  const filteredBackorders = backorders.filter((b) => {
    if (b.status !== 'active') return false
    if (selectedSupplierFilter === 'all') return true
    if (selectedSupplierFilter === 'unassigned') return !b.supplierName
    return b.supplierName === selectedSupplierFilter
  })

  // Group backorders by supplier name for the order sheet
  const groupedBackorders: Record<string, Backorder[]> =
    selectedSupplierFilter === 'all'
      ? filteredBackorders.reduce<Record<string, Backorder[]>>((acc, b) => {
          const key = b.supplierName || 'Unassigned'
          if (!acc[key]) acc[key] = []
          acc[key].push(b)
          return acc
        }, {})
      : { [selectedSupplierFilter === 'unassigned' ? 'Unassigned' : selectedSupplierFilter]: filteredBackorders }

  const totalQty = filteredBackorders.reduce((sum, b) => sum + b.qty, 0)
  const totalValue = filteredBackorders.reduce((sum, b) => sum + b.qty * b.price, 0)

  function handlePrint() {
    window.print()
  }

  function toggleGroup(name: string) {
    setClosedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function downloadSupplierOrder(supplierName: string, items: Backorder[]) {
    // Consolidate duplicate SKUs — sum their qtys
    const consolidated = Object.values(
      items.reduce<Record<string, { sku: string; description: string; qty: number }>>((acc, b) => {
        if (!acc[b.sku]) acc[b.sku] = { sku: b.sku, description: b.description, qty: 0 }
        acc[b.sku].qty += b.qty
        return acc
      }, {})
    )
    const date = new Date().toLocaleDateString('en-ZA')
    const totalQtyVal = consolidated.reduce((s, i) => s + i.qty, 0)
    const rows = consolidated
      .map(
        (item, i) => `
        <tr>
          <td style="padding:8px 12px;color:#6b7280;font-size:13px;">${i + 1}</td>
          <td style="padding:8px 12px;font-family:monospace;font-size:13px;font-weight:600;">${item.sku}</td>
          <td style="padding:8px 12px;font-size:13px;">${item.description}</td>
          <td style="padding:8px 12px;text-align:center;font-weight:700;font-size:13px;">${item.qty}</td>
        </tr>`
      )
      .join('')
    const companyBlock = companyInfo.name
      ? `<p style="font-size:13px;font-weight:700;">${companyInfo.name}</p>
         ${companyInfo.address ? `<p style="font-size:12px;color:#6b7280;">${companyInfo.address}</p>` : ''}
         ${(companyInfo.city || companyInfo.postalCode) ? `<p style="font-size:12px;color:#6b7280;">${[companyInfo.city, companyInfo.postalCode].filter(Boolean).join(', ')}</p>` : ''}
         ${companyInfo.phone ? `<p style="font-size:12px;color:#6b7280;">${companyInfo.phone}</p>` : ''}
         ${companyInfo.email ? `<p style="font-size:12px;color:#6b7280;">${companyInfo.email}</p>` : ''}
         ${companyInfo.vatNumber ? `<p style="font-size:11px;color:#9ca3af;">VAT: ${companyInfo.vatNumber}</p>` : ''}`
      : ''

    const html = `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <title>Order Sheet – ${supplierName}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,sans-serif;padding:20mm;background:white}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
    .title{font-size:24px;font-weight:800;margin-bottom:2px}
    .meta{font-size:13px;color:#6b7280;margin-top:4px}
    .supplier-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin-bottom:28px}
    .supplier-box p{font-size:13px;margin-bottom:2px}
    table{width:100%;border-collapse:collapse}
    thead tr{border-bottom:2px solid #111827}
    th{padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280}
    th.center{text-align:center}
    tbody tr{border-bottom:1px solid #f3f4f6}
    tbody tr:nth-child(even){background:#f9fafb}
    tfoot tr{border-top:2px solid #111827}
    tfoot td{padding:10px 12px;font-weight:700;font-size:13px}
    @page{size:A4;margin:0}
  </style>
</head>
<body>
  <div class="header">
    <div>${companyBlock}</div>
    <div style="text-align:right">
      <p class="title">ORDER SHEET</p>
      <p class="meta">Date: ${date}</p>
    </div>
  </div>
  <div class="supplier-box">
    <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:6px">Supplier</p>
    <p style="font-weight:700;font-size:14px;">${supplierName}</p>
  </div>
  <table>
    <thead><tr>
      <th style="width:40px">#</th>
      <th>SKU</th>
      <th>Description</th>
      <th class="center" style="width:80px">Qty</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <td colspan="3" style="text-align:right;padding-right:12px;color:#6b7280">Total</td>
      <td style="text-align:center">${totalQtyVal}</td>
    </tr></tfoot>
  </table>
</body></html>`
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 350)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #order-sheet-print-area, #order-sheet-print-area * { visibility: visible !important; }
          #order-sheet-print-area {
            position: fixed !important;
            top: 0; left: 0;
            width: 210mm;
            padding: 20mm;
            background: white !important;
          }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Suppliers Orders</h1>
            <p className="text-sm text-gray-500 mt-1">Supplier order sheets and backorder management</p>
          </div>
          <button
            onClick={() => setShowCreateOrder(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Supplier Order
          </button>
        </div>

        <div>
            {/* Controls bar */}
            <div className="flex items-start justify-between mb-6 gap-4">
              {/* Company Info Block */}
              <div className="flex-1">
                {editingCompany ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Company Information</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Company Name</label>
                        <input
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={companyForm.name}
                          onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                          placeholder="Route 66 Slot Cars"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Address</label>
                        <input
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={companyForm.address}
                          onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                          placeholder="Street address"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">City</label>
                        <input
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={companyForm.city}
                          onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Postal Code</label>
                        <input
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={companyForm.postalCode}
                          onChange={(e) => setCompanyForm({ ...companyForm, postalCode: e.target.value })}
                          placeholder="0000"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Phone</label>
                        <input
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={companyForm.phone}
                          onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                          placeholder="+27 ..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Email</label>
                        <input
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={companyForm.email}
                          onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                          placeholder="info@..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">VAT Number</label>
                        <input
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={companyForm.vatNumber}
                          onChange={(e) => setCompanyForm({ ...companyForm, vatNumber: e.target.value })}
                          placeholder="VAT number"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Reg. Number</label>
                        <input
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={companyForm.registrationNumber}
                          onChange={(e) => setCompanyForm({ ...companyForm, registrationNumber: e.target.value })}
                          placeholder="Registration number"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={saveCompanyInfo}
                        disabled={companySaving}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
                      >
                        {companySaving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => { setEditingCompany(false); setCompanyForm({ ...companyInfo }) }}
                        className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    {companyInfo.name ? (
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{companyInfo.name}</p>
                          {companyInfo.address && <p className="text-sm text-gray-500">{companyInfo.address}</p>}
                          {(companyInfo.city || companyInfo.postalCode) && (
                            <p className="text-sm text-gray-500">
                              {[companyInfo.city, companyInfo.postalCode].filter(Boolean).join(', ')}
                            </p>
                          )}
                          {companyInfo.phone && <p className="text-sm text-gray-500">{companyInfo.phone}</p>}
                          {companyInfo.email && <p className="text-sm text-gray-500">{companyInfo.email}</p>}
                          {companyInfo.vatNumber && (
                            <p className="text-xs text-gray-400 mt-1">VAT: {companyInfo.vatNumber}</p>
                          )}
                        </div>
                        <button
                          onClick={() => setEditingCompany(true)}
                          className="text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
                          title="Edit company info"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingCompany(true)}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Company Info
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right side: Supplier filter + PDF button */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Supplier Dropdown */}
                <div className="relative" ref={supplierDropdownRef}>
                  <button
                    onClick={() => setSupplierDropdownOpen(!supplierDropdownOpen)}
                    className="flex items-center gap-2 border border-gray-200 bg-white text-sm text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors min-w-[180px] justify-between"
                  >
                    <span className="truncate">
                      {selectedSupplierFilter === 'all'
                        ? 'All Suppliers'
                        : selectedSupplierFilter === 'unassigned'
                        ? 'Unassigned'
                        : selectedSupplierFilter}
                    </span>
                    <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${supplierDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {supplierDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[220px] py-1">
                      <button
                        onClick={() => { setSelectedSupplierFilter('all'); setSupplierDropdownOpen(false) }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${selectedSupplierFilter === 'all' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                      >
                        All Suppliers
                      </button>
                      <button
                        onClick={() => { setSelectedSupplierFilter('unassigned'); setSupplierDropdownOpen(false) }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${selectedSupplierFilter === 'unassigned' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                      >
                        Unassigned
                      </button>
                      {backorderSuppliers.length > 0 && (
                        <div className="border-t border-gray-100 my-1" />
                      )}
                      {backorderSuppliers.map((name) => (
                        <button
                          key={name}
                          onClick={() => { setSelectedSupplierFilter(name); setSupplierDropdownOpen(false) }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${selectedSupplierFilter === name ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Order Sheet Print Area */}
            <div id="order-sheet-print-area">
              {backordersLoading ? (
                <div className="flex items-center justify-center h-48 text-gray-400">
                  <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Loading backorders...
                </div>
              ) : filteredBackorders.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm font-medium">No active backorders</p>
                  <p className="text-xs mt-1">Active backorders from /admin/backorders will appear here</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Print header (visible in print only) */}
                  <div className="hidden print:flex items-start justify-between mb-6">
                    <div>
                      {companyInfo.name && (
                        <>
                          <p className="text-lg font-bold">{companyInfo.name}</p>
                          {companyInfo.address && <p className="text-sm">{companyInfo.address}</p>}
                          {(companyInfo.city || companyInfo.postalCode) && (
                            <p className="text-sm">{[companyInfo.city, companyInfo.postalCode].filter(Boolean).join(', ')}</p>
                          )}
                          {companyInfo.phone && <p className="text-sm">{companyInfo.phone}</p>}
                          {companyInfo.email && <p className="text-sm">{companyInfo.email}</p>}
                          {companyInfo.vatNumber && <p className="text-xs text-gray-500">VAT: {companyInfo.vatNumber}</p>}
                        </>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">ORDER SHEET</p>
                      <p className="text-sm text-gray-500">Date: {new Date().toLocaleDateString('en-ZA')}</p>
                    </div>
                  </div>

                  {/* Supplier groups — collapsible accordion */}
                  {Object.entries(groupedBackorders).map(([supplierName, items]) => {
                    const isOpen = !closedGroups.has(supplierName)
                    const subtotalQty = items.reduce((s, b) => s + b.qty, 0)
                    return (
                      <div key={supplierName} className="border border-gray-200 rounded-xl overflow-hidden">
                        {/* Accordion header */}
                        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                          <button
                            type="button"
                            onClick={() => toggleGroup(supplierName)}
                            className="flex items-center gap-3 flex-1 text-left"
                          >
                            <svg
                              className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            <span className="font-semibold text-gray-900 text-sm">{supplierName}</span>
                            <span className="text-xs text-gray-400">{items.length} line{items.length !== 1 ? 's' : ''} · {subtotalQty} items</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadSupplierOrder(supplierName, items)}
                            className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors flex-shrink-0"
                            title="Download order sheet as PDF"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download Order
                          </button>
                        </div>
                        {/* Collapsible table */}
                        {isOpen && (
                          <BackorderTable backorders={items} />
                        )}
                      </div>
                    )
                  })}

                  {/* Summary */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{filteredBackorders.length}</span> line{filteredBackorders.length !== 1 ? 's' : ''} &nbsp;·&nbsp;
                      <span className="font-medium">{totalQty}</span> total items
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Total Value</p>
                      <p className="text-lg font-bold text-gray-900">
                        R {totalValue.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
      </div>

      {/* ── Supplier Work Sheet ────────────────────────────────────────── */}
      <div className="mt-8">
        <SupplierWorksheet companyInfo={companyInfo} customers={customers} />
      </div>

      {/* ── Create Supplier Order Modal ────────────────────────────────── */}
      {showCreateOrder && (
        <CreateSupplierOrderModal
          suppliers={suppliers}
          companyInfo={companyInfo}
          onClose={() => setShowCreateOrder(false)}
        />
      )}

      {/* ── Add / Edit Supplier Modal ──────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">
                {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Supplier Name *</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    placeholder="e.g. Revo Slot"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Code</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    value={supplierForm.code}
                    onChange={(e) => setSupplierForm({ ...supplierForm, code: e.target.value.toUpperCase() })}
                    placeholder="REVO"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={supplierForm.country}
                    onChange={(e) => setSupplierForm({ ...supplierForm, country: e.target.value })}
                    placeholder="Spain"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    placeholder="info@supplier.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    placeholder="+34 ..."
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Website</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={supplierForm.website}
                    onChange={(e) => setSupplierForm({ ...supplierForm, website: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <textarea
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                    value={supplierForm.notes}
                    onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                    placeholder="Any notes about this supplier..."
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveSupplier}
                disabled={supplierSaving || !supplierForm.name.trim()}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {supplierSaving ? 'Saving...' : editingSupplier ? 'Save Changes' : 'Add Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Supplier Card ──────────────────────────────────────────────────────────

function SupplierCard({
  supplier,
  onEdit,
  onDelete,
  confirmingDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  supplier: Supplier
  onEdit: () => void
  onDelete: () => void
  confirmingDelete: boolean
  onConfirmDelete: () => void
  onCancelDelete: () => void
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{supplier.name}</h3>
            {supplier.code && (
              <span className="flex-shrink-0 text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                {supplier.code}
              </span>
            )}
          </div>
          {supplier.country && (
            <p className="text-xs text-gray-400 mt-0.5">{supplier.country}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="space-y-1 text-sm text-gray-500">
        {supplier.email && (
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="truncate">{supplier.email}</span>
          </div>
        )}
        {supplier.phone && (
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>{supplier.phone}</span>
          </div>
        )}
        {supplier.website && (
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <a
              href={supplier.website}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate hover:text-blue-600 transition-colors"
            >
              {supplier.website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
      </div>

      {supplier.notes && (
        <p className="text-xs text-gray-400 border-t border-gray-100 pt-3 leading-relaxed">
          {supplier.notes}
        </p>
      )}

      {confirmingDelete && (
        <div className="border-t border-red-100 pt-3 flex items-center justify-between">
          <p className="text-xs text-red-600 font-medium">Delete this supplier?</p>
          <div className="flex gap-2">
            <button
              onClick={onCancelDelete}
              className="text-xs px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirmDelete}
              className="text-xs px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Backorder Table (per supplier group) ───────────────────────────────────

function BackorderTable({
  backorders,
}: {
  backorders: Backorder[]
}) {
  const subtotalQty = backorders.reduce((s, b) => s + b.qty, 0)
  const subtotalValue = backorders.reduce((s, b) => s + b.qty * b.price, 0)

  return (
    <div className="bg-white overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 w-8">#</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">SKU</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Description</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Brand</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Client</th>
              <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500">Qty</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">Unit Price</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">Total</th>
            </tr>
          </thead>
          <tbody>
            {backorders.map((b, i) => (
              <tr key={b.id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                <td className="px-5 py-3 text-xs text-gray-400">{i + 1}</td>
                <td className="px-3 py-3 font-mono text-xs text-gray-700">{b.sku}</td>
                <td className="px-3 py-3 text-gray-800 max-w-xs">
                  <span className="line-clamp-2">{b.description}</span>
                </td>
                <td className="px-3 py-3 text-gray-600 text-xs">{b.brand || '—'}</td>
                <td className="px-3 py-3 text-gray-600 text-xs">{b.clientName}</td>
                <td className="px-3 py-3 text-center font-semibold text-gray-900">{b.qty}</td>
                <td className="px-5 py-3 text-right text-gray-700">
                  {b.price > 0
                    ? `R ${b.price.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '—'}
                </td>
                <td className="px-5 py-3 text-right font-medium text-gray-900">
                  {b.price > 0
                    ? `R ${(b.qty * b.price).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 bg-gray-50/80">
              <td colSpan={5} className="px-5 py-2.5 text-xs text-gray-500 text-right font-medium">Subtotal</td>
              <td className="px-3 py-2.5 text-center text-xs font-bold text-gray-900">{subtotalQty}</td>
              <td className="px-5 py-2.5" />
              <td className="px-5 py-2.5 text-right text-xs font-bold text-gray-900">
                R {subtotalValue.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ─── Create Supplier Order Modal ─────────────────────────────────────────────

const EMPTY_ORDER_ITEM = { sku: '', description: '', qty: 1 }

function CreateSupplierOrderModal({
  suppliers,
  companyInfo,
  onClose,
}: {
  suppliers: Supplier[]
  companyInfo: CompanyInfo
  onClose: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [orderDate, setOrderDate] = useState(today)
  const [items, setItems] = useState([{ ...EMPTY_ORDER_ITEM }])

  function updateItem(idx: number, field: string, value: string | number) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ORDER_ITEM }])
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function generatePDF() {
    const supplier = suppliers.find((s) => s.id === selectedSupplier)
    const supplierName = supplier?.name || selectedSupplier || 'Supplier'
    const date = new Date(orderDate).toLocaleDateString('en-ZA')
    const totalQty = items.reduce((s, i) => s + Number(i.qty), 0)

    const rows = items
      .filter((it) => it.sku || it.description)
      .map(
        (it, i) => `
        <tr>
          <td style="padding:8px 12px;color:#6b7280;font-size:13px;">${i + 1}</td>
          <td style="padding:8px 12px;font-family:monospace;font-size:13px;font-weight:600;">${it.sku}</td>
          <td style="padding:8px 12px;font-size:13px;">${it.description}</td>
          <td style="padding:8px 12px;text-align:center;font-weight:700;font-size:13px;">${it.qty}</td>
        </tr>`
      )
      .join('')

    const companyBlock = companyInfo.name
      ? `<p style="font-size:13px;font-weight:700;">${companyInfo.name}</p>
         ${companyInfo.address ? `<p style="font-size:12px;color:#6b7280;">${companyInfo.address}</p>` : ''}
         ${companyInfo.phone ? `<p style="font-size:12px;color:#6b7280;">${companyInfo.phone}</p>` : ''}
         ${companyInfo.email ? `<p style="font-size:12px;color:#6b7280;">${companyInfo.email}</p>` : ''}
         ${companyInfo.vatNumber ? `<p style="font-size:11px;color:#9ca3af;">VAT: ${companyInfo.vatNumber}</p>` : ''}`
      : ''

    const html = `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <title>Supplier Order – ${supplierName}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,sans-serif;padding:20mm;background:white}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
    .title{font-size:24px;font-weight:800;margin-bottom:2px}
    .meta{font-size:13px;color:#6b7280;margin-top:4px}
    .supplier-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin-bottom:28px}
    .supplier-box p{font-size:13px;margin-bottom:2px}
    table{width:100%;border-collapse:collapse}
    thead tr{border-bottom:2px solid #111827}
    th{padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280}
    th.center{text-align:center}
    tbody tr{border-bottom:1px solid #f3f4f6}
    tbody tr:nth-child(even){background:#f9fafb}
    tfoot tr{border-top:2px solid #111827}
    tfoot td{padding:10px 12px;font-weight:700;font-size:13px}
    @page{size:A4;margin:0}
  </style>
</head>
<body>
  <div class="header">
    <div>${companyBlock}</div>
    <div style="text-align:right">
      <p class="title">SUPPLIER ORDER</p>
      ${poNumber ? `<p class="meta">PO: <strong>${poNumber}</strong></p>` : ''}
      <p class="meta">Date: ${date}</p>
    </div>
  </div>
  <div class="supplier-box">
    <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:6px">Supplier</p>
    <p style="font-weight:700;font-size:14px;">${supplierName}</p>
    ${supplier?.email ? `<p style="font-size:12px;color:#6b7280;">${supplier.email}</p>` : ''}
    ${supplier?.phone ? `<p style="font-size:12px;color:#6b7280;">${supplier.phone}</p>` : ''}
  </div>
  <table>
    <thead><tr>
      <th style="width:40px">#</th>
      <th>SKU</th>
      <th>Description</th>
      <th class="center" style="width:80px">Qty</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <td colspan="3" style="text-align:right;padding-right:12px;color:#6b7280">Total</td>
      <td style="text-align:center">${totalQty}</td>
    </tr></tfoot>
  </table>
</body></html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 350)
    }
  }

  const hasItems = items.some((it) => it.sku || it.description)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Create Supplier Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Order details */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Supplier *</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
              >
                <option value="">— Select supplier —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">PO / Reference</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="PO-001"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Order Date</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Order Items</p>
              <span className="text-xs text-gray-400">{items.length} line{items.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_2fr_60px_32px] gap-2 px-1">
                <p className="text-xs text-gray-400">SKU</p>
                <p className="text-xs text-gray-400">Description</p>
                <p className="text-xs text-gray-400 text-center">Qty</p>
                <span />
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_2fr_60px_32px] gap-2 items-center">
                  <input
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={item.sku}
                    onChange={(e) => updateItem(idx, 'sku', e.target.value)}
                    placeholder="SKU"
                  />
                  <input
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={item.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    placeholder="Item description"
                  />
                  <input
                    type="number"
                    min={1}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={item.qty}
                    onChange={(e) => updateItem(idx, 'qty', Math.max(1, Number(e.target.value)))}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                    className="text-gray-300 hover:text-red-500 disabled:opacity-20 transition-colors flex items-center justify-center"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addItem}
                className="w-full border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-500 rounded-lg py-2 text-sm transition-colors"
              >
                + Add Item
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={generatePDF}
            disabled={!selectedSupplier || !hasItems}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generate PDF
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Supplier Work Sheet ─────────────────────────────────────────────────────

interface WsItem {
  id: string
  sku: string
  description: string
  wholesalePrice: number
  retailOverride: string // empty = auto-calculated
}

const CURRENCY_DEFAULTS: Record<string, number> = {
  USD: 18.5,
  EUR: 20.0,
  GBP: 23.5,
  ZAR: 1.0,
}

function newWsItem(): WsItem {
  return { id: `ws_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, sku: '', description: '', wholesalePrice: 0, retailOverride: '' }
}

function SupplierWorksheet({ companyInfo, customers }: { companyInfo: CompanyInfo; customers: Customer[] }) {
  const [open, setOpen] = useState(true)
  const [currency, setCurrency] = useState('USD')
  const [exchangeRate, setExchangeRate] = useState(18.5)
  const [markupPct, setMarkupPct] = useState(40)
  const [shippingPct, setShippingPct] = useState(0)
  const [vatPct, setVatPct] = useState(15)
  const [clientSearch, setClientSearch] = useState('')
  const [clientName, setClientName] = useState('')
  const [showClientDrop, setShowClientDrop] = useState(false)
  const [items, setItems] = useState<WsItem[]>([newWsItem()])
  const clientRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) setShowClientDrop(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleCurrencyChange(c: string) {
    setCurrency(c)
    setExchangeRate(CURRENCY_DEFAULTS[c] ?? 1)
  }

  function calcRetail(wholesalePrice: number): number {
    return wholesalePrice * exchangeRate * (1 + shippingPct / 100) * (1 + markupPct / 100) * (1 + vatPct / 100)
  }

  function fmtZAR(n: number) {
    return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  function fmtFC(n: number) {
    return n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function updateItem(id: string, field: keyof WsItem, value: string | number) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, [field]: value } : it))
  }

  function addItem() { setItems((prev) => [...prev, newWsItem()]) }
  function removeItem(id: string) { setItems((prev) => prev.filter((it) => it.id !== id)) }

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(clientSearch.toLowerCase())
  )

  // ── PDF export ──
  function downloadPDF() {
    const date = new Date().toLocaleDateString('en-ZA')
    const rows = items
      .filter((it) => it.sku || it.description)
      .map((it, i) => {
        const retail = it.retailOverride !== '' ? Number(it.retailOverride) : calcRetail(it.wholesalePrice)
        return `<tr>
          <td style="padding:7px 10px;color:#6b7280;font-size:12px;">${i + 1}</td>
          <td style="padding:7px 10px;font-family:monospace;font-size:12px;font-weight:600;">${it.sku || '—'}</td>
          <td style="padding:7px 10px;font-size:12px;">${it.description || '—'}</td>
          <td style="padding:7px 10px;text-align:right;font-size:12px;">${currency} ${fmtFC(it.wholesalePrice)}</td>
          <td style="padding:7px 10px;text-align:right;font-weight:700;font-size:12px;">R ${fmtFC(retail)}</td>
        </tr>`
      }).join('')

    const companyBlock = companyInfo.name
      ? `<p style="font-weight:700;font-size:13px;">${companyInfo.name}</p>
         ${companyInfo.address ? `<p style="font-size:12px;color:#6b7280;">${companyInfo.address}</p>` : ''}
         ${companyInfo.phone ? `<p style="font-size:12px;color:#6b7280;">${companyInfo.phone}</p>` : ''}
         ${companyInfo.email ? `<p style="font-size:12px;color:#6b7280;">${companyInfo.email}</p>` : ''}
         ${companyInfo.vatNumber ? `<p style="font-size:11px;color:#9ca3af;">VAT: ${companyInfo.vatNumber}</p>` : ''}`
      : ''

    const html = `<!DOCTYPE html><html><head>
  <meta charset="utf-8">
  <title>Supplier Work Sheet</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,sans-serif;padding:18mm;background:white}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}
    .meta-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;margin-bottom:22px;display:flex;gap:24px;flex-wrap:wrap}
    .meta-box span{font-size:11px;color:#6b7280;}
    .meta-box strong{font-size:12px;color:#111827;}
    table{width:100%;border-collapse:collapse}
    thead tr{border-bottom:2px solid #111827}
    th{padding:7px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280}
    th.right{text-align:right}
    tbody tr{border-bottom:1px solid #f3f4f6}
    tbody tr:nth-child(even){background:#f9fafb}
    @page{size:A4;margin:0}
  </style>
</head><body>
  <div class="header">
    <div>${companyBlock}</div>
    <div style="text-align:right">
      <p style="font-size:22px;font-weight:800;">WORK SHEET</p>
      <p style="font-size:12px;color:#6b7280;margin-top:3px;">Date: ${date}</p>
      ${clientName ? `<p style="font-size:13px;font-weight:600;margin-top:4px;">Client: ${clientName}</p>` : ''}
    </div>
  </div>
  <div class="meta-box">
    <div><span>Currency </span><strong>${currency}</strong></div>
    <div><span>Exchange Rate </span><strong>1 ${currency} = R ${exchangeRate}</strong></div>
    <div><span>Shipping &amp; Customs </span><strong>${shippingPct}%</strong></div>
    <div><span>Markup </span><strong>${markupPct}%</strong></div>
    <div><span>VAT </span><strong>${vatPct}%</strong></div>
  </div>
  <table>
    <thead><tr>
      <th style="width:36px">#</th>
      <th>SKU</th>
      <th>Description</th>
      <th class="right">Wholesale (${currency})</th>
      <th class="right">Est Retail (ZAR incl. VAT)</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 350)
    }
  }

  // ── CSV export ──
  function downloadCSV() {
    const headers = ['#', 'SKU', 'Description', `Wholesale Price (${currency})`, 'Est Retail Price (ZAR incl. VAT)']
    const rows = items
      .filter((it) => it.sku || it.description)
      .map((it, i) => {
        const retail = it.retailOverride !== '' ? Number(it.retailOverride) : calcRetail(it.wholesalePrice)
        return [i + 1, it.sku, `"${it.description.replace(/"/g, '""')}"`, it.wholesalePrice.toFixed(2), retail.toFixed(2)]
      })
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `worksheet-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasItems = items.some((it) => it.sku || it.description)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer select-none hover:bg-gray-100 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          <span className="font-semibold text-gray-900 text-sm">Supplier Work Sheet</span>
          <span className="text-xs text-gray-400">Costing calculator &amp; pricing worksheet</span>
        </div>
        {open && (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={downloadCSV}
              disabled={!hasItems}
              className="flex items-center gap-1.5 border border-gray-300 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M4 6h16" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={downloadPDF}
              disabled={!hasItems}
              className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </button>
          </div>
        )}
      </div>

      {open && (
        <div className="p-5 space-y-5">
          {/* Compact Costing Calculator + Client in one row */}
          <div className="flex flex-wrap items-end gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <p className="w-full text-xs font-semibold text-blue-700 uppercase tracking-wider mb-0.5">Costing Calculator</p>

            {/* Currency */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Currency</label>
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {Object.keys(CURRENCY_DEFAULTS).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Exchange rate */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">1 {currency} = R</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={exchangeRate}
                onChange={(e) => setExchangeRate(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm w-24 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Markup */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Markup %</label>
              <input
                type="number"
                min={0}
                step={1}
                value={markupPct}
                onChange={(e) => setMarkupPct(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm w-20 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* VAT */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">VAT %</label>
              <input
                type="number"
                min={0}
                step={1}
                value={vatPct}
                onChange={(e) => setVatPct(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm w-20 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Shipping & Customs */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Shipping &amp; Customs %</label>
              <input
                type="number"
                min={0}
                step={1}
                value={shippingPct}
                onChange={(e) => setShippingPct(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm w-24 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Client selector */}
            <div className="flex flex-col gap-1 flex-1 min-w-[180px]" ref={clientRef}>
              <label className="text-xs text-gray-500">Client</label>
              <div className="relative">
                <input
                  value={clientName || clientSearch}
                  onFocus={() => { setClientSearch(''); setShowClientDrop(true) }}
                  onChange={(e) => { setClientSearch(e.target.value); setClientName(''); setShowClientDrop(true) }}
                  placeholder="Search client..."
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {clientName && (
                  <button onClick={() => { setClientName(''); setClientSearch('') }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
                {showClientDrop && filteredCustomers.length > 0 && (
                  <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 w-full max-h-48 overflow-y-auto py-1">
                    {filteredCustomers.slice(0, 20).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                        onClick={() => { setClientName(c.name); setClientSearch(''); setShowClientDrop(false) }}
                      >
                        <span className="font-medium text-gray-900">{c.name}</span>
                        {c.email && <span className="ml-2 text-xs text-gray-400">{c.email}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items table */}
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-400">
                  <th className="text-left pb-2 w-8">#</th>
                  <th className="text-left pb-2 px-2">SKU</th>
                  <th className="text-left pb-2 px-2">Description</th>
                  <th className="text-right pb-2 px-2">Wholesale ({currency})</th>
                  <th className="text-right pb-2 px-2">Est Retail (ZAR)</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const autoRetail = calcRetail(it.wholesalePrice)
                  const displayRetail = it.retailOverride !== '' ? Number(it.retailOverride) : autoRetail
                  return (
                    <tr key={it.id} className="border-b border-gray-50 group">
                      <td className="py-2 text-xs text-gray-400 w-8">{i + 1}</td>
                      <td className="py-2 px-2">
                        <input
                          value={it.sku}
                          onChange={(e) => updateItem(it.id, 'sku', e.target.value)}
                          placeholder="SKU"
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          value={it.description}
                          onChange={(e) => updateItem(it.id, 'description', e.target.value)}
                          placeholder="Description"
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center justify-end">
                          <span className="text-xs text-gray-400 mr-1">{currency}</span>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={it.wholesalePrice || ''}
                            onChange={(e) => updateItem(it.id, 'wholesalePrice', Number(e.target.value))}
                            placeholder="0.00"
                            className="w-28 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-xs text-gray-400">R</span>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={it.retailOverride !== '' ? it.retailOverride : (it.wholesalePrice > 0 ? autoRetail.toFixed(2) : '')}
                            onChange={(e) => updateItem(it.id, 'retailOverride', e.target.value)}
                            onBlur={(e) => { if (!e.target.value) updateItem(it.id, 'retailOverride', '') }}
                            placeholder={it.wholesalePrice > 0 ? autoRetail.toFixed(2) : '0.00'}
                            className="w-28 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                          {it.retailOverride !== '' && (
                            <button onClick={() => updateItem(it.id, 'retailOverride', '')} title="Reset to auto" className="text-gray-300 hover:text-blue-500 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2 w-8">
                        <button
                          onClick={() => removeItem(it.id)}
                          disabled={items.length === 1}
                          className="text-gray-300 hover:text-red-400 disabled:opacity-20 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <button
              onClick={addItem}
              className="mt-3 w-full border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-500 rounded-xl py-2 text-sm transition-colors"
            >
              + Add Row
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
