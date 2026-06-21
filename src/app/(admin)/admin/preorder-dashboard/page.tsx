'use client'

import { useState, useEffect, useRef } from 'react'

interface Contact {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
}

interface SupplierContact {
  id: string
  name: string
}

interface DashboardCustomer {
  id: string
  name: string
  email?: string
  phone?: string
  qty: number
  depositPaid?: boolean
  depositPaidDate?: string
}

interface DashboardItem {
  id: string
  sku: string
  description: string
  estimatedRetailPrice: string
  eta: string
  supplier: string
  brand: string
  imageUrl?: string
  customers: DashboardCustomer[]
  createdAt: string
  updatedAt?: string
}

const EMPTY_ITEM = (): Omit<DashboardItem, 'id' | 'createdAt'> => ({
  sku: '',
  description: '',
  estimatedRetailPrice: '',
  eta: '',
  supplier: '',
  brand: '',
  imageUrl: undefined,
  customers: [],
})

// ── Contact autofill dropdown ─────────────────────────────────────────────────
function ContactSearch({
  contacts,
  onSelect,
  placeholder = 'Search customer...',
}: {
  contacts: Contact[]
  onSelect: (c: Contact) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? contacts.filter((c) => {
        const full = `${c.firstName} ${c.lastName}`.toLowerCase()
        return full.includes(query.toLowerCase()) || c.email?.toLowerCase().includes(query.toLowerCase())
      })
    : contacts.slice(0, 8)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto mt-0.5">
          {filtered.map((c) => (
            <li
              key={c.id}
              onMouseDown={() => {
                onSelect(c)
                setQuery('')
                setOpen(false)
              }}
              className="px-3 py-2 cursor-pointer hover:bg-indigo-50 text-sm"
            >
              <span className="font-medium">{c.firstName} {c.lastName}</span>
              {c.email && <span className="ml-2 text-gray-400 text-xs">{c.email}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Single card ───────────────────────────────────────────────────────────────
function ItemCard({
  item,
  contacts,
  suppliers,
  onSave,
  onDelete,
  isNew,
  onCancelNew,
  onWhatsAppDeposit,
}: {
  item: DashboardItem & { _draft?: boolean }
  contacts: Contact[]
  suppliers: SupplierContact[]
  onSave: (id: string, data: Partial<DashboardItem>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  isNew?: boolean
  onCancelNew?: () => void
  onWhatsAppDeposit?: (customer: DashboardCustomer, item: DashboardItem, deposit: number) => void
}) {
  const [form, setForm] = useState<Omit<DashboardItem, 'id' | 'createdAt'>>({
    sku: item.sku,
    description: item.description,
    estimatedRetailPrice: item.estimatedRetailPrice,
    eta: item.eta,
    supplier: item.supplier,
    brand: item.brand,
    imageUrl: item.imageUrl,
    customers: item.customers,
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [supplierOpen, setSupplierOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [imageSize, setImageSize] = useState<'sm' | 'md' | 'lg'>('sm')
  const supplierRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const imageZoneRef = useRef<HTMLDivElement>(null)

  const IMAGE_HEIGHTS: Record<typeof imageSize, string> = {
    sm: 'h-36',
    md: 'h-52',
    lg: 'h-72',
  }

  // Close supplier dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) setSupplierOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const set = (field: keyof typeof form, value: any) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleImageFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => set('imageUrl', e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'))
    if (item) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file) handleImageFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'))
    if (file) { handleImageFile(file); return }
    // Also handle image URL drops (e.g. dragging from browser)
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')
    if (url && (url.startsWith('http') || url.startsWith('data:image'))) {
      set('imageUrl', url)
    }
  }

  const addCustomer = (c: Contact) => {
    const already = form.customers.find((cu) => cu.id === c.id)
    if (already) return
    set('customers', [
      ...form.customers,
      { id: c.id, name: `${c.firstName} ${c.lastName}`, email: c.email, phone: c.phone, qty: 1 },
    ])
  }

  const updateCustomerQty = (id: string, qty: number) => {
    set('customers', form.customers.map((c) => c.id === id ? { ...c, qty } : c))
  }

  const updateCustomer = (id: string, patch: Partial<DashboardCustomer>) => {
    set('customers', form.customers.map((c) => c.id === id ? { ...c, ...patch } : c))
  }

  const removeCustomer = (id: string) => {
    set('customers', form.customers.filter((c) => c.id !== id))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(item.id, form)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(item.id)
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100 rounded-t-2xl">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pre-Order Item</span>
        <div className="flex gap-2">
          {confirmDelete ? (
            <>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Confirm Delete'}
              </button>
            </>
          ) : (
            <>
              {isNew && onCancelNew && (
                <button
                  onClick={onCancelNew}
                  className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-60 font-semibold"
              >
                {saving ? 'Saving…' : isNew ? 'Add' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex flex-col md:flex-row flex-1">
        {/* Left — item details */}
        <div className="flex-1 p-4 space-y-3 border-b md:border-b-0 md:border-r border-gray-100">
          {/* Image zone — click to browse, Ctrl+V to paste, drag & drop */}
          <div className="relative group">
            {/* Size toggle — top-right corner */}
            <div className="absolute top-1.5 right-1.5 z-10 flex gap-0.5 bg-white/80 backdrop-blur-sm rounded-md px-1 py-0.5 shadow-sm border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">
              {(['sm', 'md', 'lg'] as const).map((s) => (
                <button
                  key={s}
                  onClick={(e) => { e.stopPropagation(); setImageSize(s) }}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold transition-colors ${imageSize === s ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          <div
            ref={imageZoneRef}
            tabIndex={0}
            onPaste={handlePaste}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onMouseEnter={() => imageZoneRef.current?.focus()}
            onClick={() => { if (!form.imageUrl) imageInputRef.current?.click() }}
            className={`relative w-full ${IMAGE_HEIGHTS[imageSize]} border-2 border-dashed rounded-lg overflow-hidden cursor-pointer transition-all flex items-center justify-center focus:outline-none
              ${isDragging
                ? 'border-indigo-500 bg-indigo-50 scale-[1.01]'
                : form.imageUrl
                  ? 'border-gray-200 bg-gray-50 hover:border-indigo-300'
                  : 'border-gray-200 bg-gray-50 hover:border-indigo-300'
              }`}
          >
            {form.imageUrl ? (
              <>
                <img src={form.imageUrl} alt="product" className="object-contain h-full w-full" />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100 gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); imageInputRef.current?.click() }}
                    className="bg-white rounded-lg px-2 py-1 text-xs font-medium text-gray-700 shadow hover:bg-gray-100"
                  >Replace</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); set('imageUrl', undefined) }}
                    className="bg-white rounded-lg px-2 py-1 text-xs font-medium text-red-600 shadow hover:bg-red-50"
                  >Remove</button>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400 text-xs select-none pointer-events-none">
                {isDragging ? (
                  <>
                    <div className="text-2xl mb-1">⬇️</div>
                    <div className="font-medium text-indigo-600">Drop image here</div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl mb-1">📷</div>
                    <div className="font-medium">Click to browse</div>
                    <div className="mt-0.5 text-gray-300">or hover &amp; Ctrl+V · drag &amp; drop</div>
                  </>
                )}
              </div>
            )}
          </div>
          </div>{/* end size wrapper */}
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleImageFile(e.target.files[0]) }} />

          {/* Fields grid */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">SKU</label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => set('sku', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="SKU-001"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Est. Retail Price (R)</label>
              <input
                type="text"
                value={form.estimatedRetailPrice}
                onChange={(e) => set('estimatedRetailPrice', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Item Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              placeholder="Description"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Item / Brand</label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => set('brand', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="Brand name"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">ETA</label>
              <input
                type="text"
                value={form.eta}
                onChange={(e) => set('eta', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="e.g. June 2026"
              />
            </div>
          </div>

          {/* Supplier dropdown */}
          <div ref={supplierRef} className="relative">
            <label className="block text-xs text-gray-500 mb-0.5">Supplier</label>
            <input
              type="text"
              value={form.supplier}
              onChange={(e) => { set('supplier', e.target.value); setSupplierOpen(true) }}
              onFocus={() => setSupplierOpen(true)}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              placeholder="Supplier name"
            />
            {supplierOpen && suppliers.length > 0 && (
              <ul className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto mt-0.5">
                {suppliers
                  .filter((s) => !form.supplier || s.name.toLowerCase().includes(form.supplier.toLowerCase()))
                  .map((s) => (
                    <li
                      key={s.id}
                      onMouseDown={() => { set('supplier', s.name); setSupplierOpen(false) }}
                      className="px-3 py-2 cursor-pointer hover:bg-indigo-50 text-sm"
                    >
                      {s.name}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right — customer list */}
        <div className="flex-1 p-4 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Customers ({form.customers.length})
            </span>
          </div>

          {/* Customer rows */}
          <div className="flex-1 overflow-y-auto space-y-1.5 mb-3 max-h-52">
            {form.customers.length === 0 && (
              <p className="text-xs text-gray-400 italic">No customers added yet.</p>
            )}
            {form.customers.map((c) => {
              const unitPrice = parseFloat(form.estimatedRetailPrice || '0')
              const deposit = unitPrice > 0 ? unitPrice * 0.5 * c.qty : 0
              return (
                <div key={c.id} className="bg-indigo-50 rounded px-2 py-1.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-800 truncate block">{c.name}</span>
                      {c.email && <span className="text-xs text-gray-500 truncate block">{c.email}</span>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <label className="text-xs text-gray-500">Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={c.qty}
                        onChange={(e) => updateCustomerQty(c.id, Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 text-xs border border-gray-300 rounded px-1 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                      <button
                        onClick={() => removeCustomer(c.id)}
                        className="text-gray-400 hover:text-red-500 text-xs leading-none ml-1"
                        title="Remove"
                      >✕</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {deposit > 0 && <span className="text-xs text-indigo-700 font-medium">Deposit: R{deposit.toFixed(2)}</span>}
                    <label className="flex items-center gap-1 cursor-pointer ml-auto">
                      <input type="checkbox" checked={!!c.depositPaid}
                        onChange={e => updateCustomer(c.id, { depositPaid: e.target.checked, depositPaidDate: e.target.checked ? (c.depositPaidDate || new Date().toISOString().slice(0, 10)) : undefined })}
                        className="w-3.5 h-3.5 accent-indigo-600" />
                      <span className="text-xs text-gray-600">Paid</span>
                    </label>
                    {c.depositPaid && (
                      <input type="date" value={c.depositPaidDate || ''}
                        onChange={e => updateCustomer(c.id, { depositPaidDate: e.target.value })}
                        className="text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white" />
                    )}
                    {deposit > 0 && (
                      <button
                        title="Send Deposit Quote via WhatsApp"
                        onClick={() => onWhatsAppDeposit?.(c, item, deposit)}
                        className="ml-1 w-6 h-6 flex items-center justify-center rounded-full bg-green-500 hover:bg-green-600 text-white shrink-0"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Add customer */}
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Add+ Customer</label>
            <ContactSearch contacts={contacts} onSelect={addCustomer} placeholder="Search & add customer…" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PreOrderDashboardPage() {
  const [items, setItems] = useState<DashboardItem[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [suppliers, setSuppliers] = useState<SupplierContact[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newDraft, setNewDraft] = useState<DashboardItem | null>(null)
  const [bankAccounts, setBankAccounts] = useState<{ id: string; bankName: string; accountName: string; accountNumber: string; branchCode: string }[]>([])
  const [waModal, setWaModal] = useState<{ customer: DashboardCustomer; item: DashboardItem; deposit: number } | null>(null)
  const [waBankId, setWaBankId] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [itemsRes, contactsRes, suppliersRes, bankRes] = await Promise.all([
        fetch('/api/admin/preorder-dashboard'),
        fetch('/api/admin/contacts'),
        fetch('/api/admin/supplier-contacts'),
        fetch('/api/admin/bank-accounts'),
      ])
      const [itemsData, contactsData, suppliersData, bankData] = await Promise.all([
        itemsRes.json(),
        contactsRes.json(),
        suppliersRes.json(),
        bankRes.ok ? bankRes.json() : [],
      ])
      setItems(Array.isArray(itemsData) ? itemsData : [])
      setContacts(Array.isArray(contactsData) ? contactsData : [])
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : [])
      if (Array.isArray(bankData) && bankData.length > 0) { setBankAccounts(bankData); setWaBankId(bankData[0].id) }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const startNew = () => {
    const draft: DashboardItem = {
      id: `_new_${Date.now()}`,
      ...EMPTY_ITEM(),
      createdAt: new Date().toISOString(),
    }
    setNewDraft(draft)
    setShowNew(true)
  }

  const cancelNew = () => {
    setShowNew(false)
    setNewDraft(null)
  }

  const handleSave = async (id: string, data: Partial<DashboardItem>) => {
    if (id.startsWith('_new_')) {
      // Create
      const res = await fetch('/api/admin/preorder-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const created = await res.json()
        setItems((prev) => [created, ...prev])
        setShowNew(false)
        setNewDraft(null)
      }
    } else {
      // Update
      const res = await fetch(`/api/admin/preorder-dashboard/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const updated = await res.json()
        setItems((prev) => prev.map((i) => (i.id === id ? updated : i)))
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (id.startsWith('_new_')) {
      cancelNew()
      return
    }
    const res = await fetch(`/api/admin/preorder-dashboard/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id))
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-play">Pre-Order Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track upcoming pre-order items and interested customers</p>
        </div>
        <button
          onClick={startNew}
          disabled={showNew}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 transition-colors shadow-sm"
        >
          <span className="text-base leading-none">+</span> New Item
        </button>
      </div>

      {loading && (
        <div className="text-center py-16 text-gray-400 font-play">Loading…</div>
      )}

      {!loading && (
        <>
          {/* New item card */}
          {showNew && newDraft && (
            <div className="mb-4">
              <ItemCard
                item={newDraft}
                contacts={contacts}
                suppliers={suppliers}
                onSave={handleSave}
                onDelete={handleDelete}
                isNew
                onCancelNew={cancelNew}
                onWhatsAppDeposit={(c, it, d) => { setWaModal({ customer: c, item: it, deposit: d }); if (bankAccounts.length > 0 && !waBankId) setWaBankId(bankAccounts[0].id) }}
              />
            </div>
          )}

          {/* Grid — 2 columns */}
          {items.length === 0 && !showNew ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-4xl mb-3">📋</div>
              <p className="font-medium">No pre-order items yet</p>
              <p className="text-sm mt-1">Click "New Item" to add your first pre-order.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  contacts={contacts}
                  suppliers={suppliers}
                  onSave={handleSave}
                  onDelete={handleDelete}
                  onWhatsAppDeposit={(c, it, d) => { setWaModal({ customer: c, item: it, deposit: d }); if (bankAccounts.length > 0 && !waBankId) setWaBankId(bankAccounts[0].id) }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── WhatsApp Deposit Quote Modal ── */}
      {waModal && (() => {
        const { customer, item, deposit } = waModal
        const bank = bankAccounts.find(b => b.id === waBankId)
        const retailPrice = parseFloat(item.estimatedRetailPrice || '0')

        const bankHtml = bank ? `
          <div style="margin-top:20px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;">
            <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin-bottom:10px">PAYMENT DETAILS</p>
            <table style="width:100%;font-size:13px;border-collapse:collapse;">
              <tr><td style="padding:3px 0;color:#6b7280;width:140px">Bank</td><td style="font-weight:600">${bank.bankName}</td></tr>
              <tr><td style="padding:3px 0;color:#6b7280">Account Holder</td><td style="font-weight:600">${bank.accountName}</td></tr>
              <tr><td style="padding:3px 0;color:#6b7280">Account Number</td><td style="font-weight:600">${bank.accountNumber}</td></tr>
              <tr><td style="padding:3px 0;color:#6b7280">Branch Code</td><td style="font-weight:600">${bank.branchCode}</td></tr>
              <tr><td style="padding:3px 0;color:#6b7280">Reference</td><td style="font-weight:600">${customer.name}</td></tr>
            </table>
          </div>` : ''

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Deposit Quote</title>
        <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;padding:20mm;background:white;color:#111827}
        h1{font-size:26px;font-weight:800;margin-bottom:4px}.meta{font-size:13px;color:#374151;margin-bottom:2px}
        table.items{width:100%;border-collapse:collapse;margin-top:20px}
        table.items thead tr{border-bottom:2px solid #111}
        table.items th{padding:8px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280}
        table.items th.r{text-align:right}
        table.items tbody tr{border-bottom:1px solid #f3f4f6}
        table.items td{padding:9px 10px;font-size:13px}
        .total-row{margin-top:16px;text-align:right}
        .deposit-label{font-size:13px;color:#374151;margin-bottom:4px}
        .deposit-amount{font-size:28px;font-weight:800;color:#111827}
        .note{font-size:11px;color:#9ca3af;margin-top:24px;border-top:1px solid #f3f4f6;padding-top:12px}
        @page{size:A4;margin:0}</style>
        </head><body>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px">
          <div><h1>DEPOSIT QUOTE</h1>
          <p class="meta">Date: ${new Date().toLocaleDateString('en-ZA', { day:'2-digit', month:'long', year:'numeric' })}</p></div>
          <div style="text-align:right">
            <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:4px">BILLED TO</p>
            <p style="font-weight:700;font-size:15px;">${customer.name}</p>
            ${customer.email ? `<p style="font-size:12px;color:#374151;">${customer.email}</p>` : ''}
            ${customer.phone ? `<p style="font-size:12px;color:#374151;">${customer.phone}</p>` : ''}
          </div>
        </div>
        <table class="items"><thead><tr>
          <th>SKU</th><th>Description</th><th class="r" style="width:60px">Qty</th>
          <th class="r" style="width:130px">Retail Price</th><th class="r" style="width:130px">Deposit (50%)</th>
        </tr></thead><tbody><tr>
          <td style="font-family:monospace;font-weight:600">${item.sku}</td>
          <td>${item.description}</td>
          <td style="text-align:right">${customer.qty}</td>
          <td style="text-align:right">R ${retailPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</td>
          <td style="text-align:right;font-weight:700">R ${deposit.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</td>
        </tr></tbody></table>
        <div class="total-row"><p class="deposit-label">Deposit Due</p>
        <p class="deposit-amount">R ${deposit.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</p></div>
        ${bankHtml}
        <p class="note">This is a deposit quote. The balance is due on collection or as agreed. Please use your name as the payment reference.</p>
        </body></html>`

        function downloadPDF() {
          const win = window.open('', '_blank')
          if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 350) }
          setWaModal(null)
        }

        async function sendWhatsApp() {
          const phone = (customer.phone || '').replace(/\D/g, '').replace(/^0/, '27')
          const msgText = `Hi ${customer.name.split(' ')[0]}, please find your deposit quote for *${item.description}* (${item.sku}).\n\nDeposit Due: *R ${deposit.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}*\n\n${bank ? `Bank: ${bank.bankName}\nAccount: ${bank.accountName}\nAcc No: ${bank.accountNumber}\nBranch: ${bank.branchCode}\nRef: ${customer.name}` : ''}\n\nPlease use your name as reference. Thank you!`
          const file = new File([html], `Deposit-Quote-${customer.name.replace(/\s+/g, '-')}.html`, { type: 'text/html' })
          // Try Web Share API (works on mobile — opens native share sheet including WhatsApp)
          if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({ files: [file], text: msgText, title: `Deposit Quote — ${customer.name}` })
              setWaModal(null)
              return
            } catch {}
          }
          // Desktop fallback: open print dialog + open WhatsApp text link
          const win = window.open('', '_blank')
          if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 350) }
          if (phone) {
            setTimeout(() => window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msgText)}`, '_blank'), 700)
          }
          setWaModal(null)
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
              <h3 className="font-bold text-base">Send Deposit Quote</h3>
              <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-0.5">
                <p className="font-semibold">{customer.name}</p>
                <p className="text-gray-500 text-xs">{item.description}</p>
                <p className="text-indigo-700 font-bold mt-1">Deposit: R {deposit.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</p>
                {!customer.phone && <p className="text-amber-600 text-xs mt-1">⚠ No phone number — PDF only</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Bank Account</label>
                {bankAccounts.length === 0 ? (
                  <p className="text-xs text-gray-400">No bank accounts saved. Add one in Admin → Orders → Bank Manager.</p>
                ) : (
                  <select value={waBankId} onChange={e => setWaBankId(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} — {b.accountName}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setWaModal(null)}
                  className="py-2 px-3 border rounded-lg text-sm font-semibold hover:bg-gray-50">Cancel</button>
                <button onClick={downloadPDF}
                  className="flex-1 py-2 bg-gray-800 text-white rounded-lg text-sm font-bold hover:bg-gray-900 flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download PDF
                </button>
                <button onClick={sendWhatsApp} disabled={!customer.phone}
                  title={!customer.phone ? 'No phone number saved' : 'Send via WhatsApp'}
                  className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-bold hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
