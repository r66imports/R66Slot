'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

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
}: {
  item: DashboardItem & { _draft?: boolean }
  contacts: Contact[]
  suppliers: SupplierContact[]
  onSave: (id: string, data: Partial<DashboardItem>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  isNew?: boolean
  onCancelNew?: () => void
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
  const supplierRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

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

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'))
    if (item) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file) handleImageFile(file)
    }
  }, [])

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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
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
          {/* Image paste zone */}
          <div
            onPaste={handlePaste}
            onClick={() => imageInputRef.current?.click()}
            className="relative w-full h-36 border-2 border-dashed border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-indigo-300 transition-colors flex items-center justify-center bg-gray-50"
          >
            {form.imageUrl ? (
              <>
                <img src={form.imageUrl} alt="product" className="object-contain h-full w-full" />
                <button
                  onClick={(e) => { e.stopPropagation(); set('imageUrl', undefined) }}
                  className="absolute top-1 right-1 bg-white rounded-full p-0.5 text-gray-500 hover:text-red-500 shadow text-xs leading-none"
                  title="Remove image"
                >✕</button>
              </>
            ) : (
              <div className="text-center text-gray-400 text-xs select-none">
                <div className="text-2xl mb-1">📷</div>
                <div>Paste or click to add image</div>
              </div>
            )}
          </div>
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
            {form.customers.map((c) => (
              <div key={c.id} className="flex items-center gap-2 bg-indigo-50 rounded px-2 py-1.5">
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
            ))}
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

  const load = async () => {
    setLoading(true)
    try {
      const [itemsRes, contactsRes, suppliersRes] = await Promise.all([
        fetch('/api/admin/preorder-dashboard'),
        fetch('/api/admin/contacts'),
        fetch('/api/admin/supplier-contacts'),
      ])
      const [itemsData, contactsData, suppliersData] = await Promise.all([
        itemsRes.json(),
        contactsRes.json(),
        suppliersRes.json(),
      ])
      setItems(Array.isArray(itemsData) ? itemsData : [])
      setContacts(Array.isArray(contactsData) ? contactsData : [])
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : [])
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
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
