'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  clubName: string
  clubMemberId: string
  companyName: string
  companyVAT: string
  companyAddress: string
  notes: string
  createdAt: string
  updatedAt: string
}

interface Backorder {
  id: string
  clientId?: string
  clientName: string
  clientEmail: string
  clientPhone: string
  clubName: string
  clubMemberId: string
  companyName: string
  companyVAT: string
  companyAddress: string
  sku: string
  description: string
  brand: string
  supplierLink: string
  qty: number
  price: number
  phaseQuote: boolean
  phaseQuoteDate?: string
  phaseSalesOrder: boolean
  phaseSalesOrderDate?: string
  phaseInvoice: boolean
  phaseInvoiceDate?: string
  phaseDepositPaid: boolean
  phaseDepositPaidDate?: string
  notes?: string
  status: 'active' | 'complete' | 'cancelled'
  createdAt: string
  updatedAt: string
}

const EMPTY_CLIENT_FIELDS = {
  clientId: '',
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  clubName: '',
  clubMemberId: '',
  companyName: '',
  companyVAT: '',
  companyAddress: '',
}

const EMPTY_PRODUCT_FIELDS = {
  sku: '',
  description: '',
  brand: '',
  supplierLink: '',
  qty: 1,
  price: 0,
  notes: '',
}

type FormData = typeof EMPTY_CLIENT_FIELDS & typeof EMPTY_PRODUCT_FIELDS
type FilterStatus = 'all' | 'active' | 'complete' | 'cancelled'

// ─── Client Search Dropdown ───────────────────────────────────────────────────

function ClientSearchDropdown({
  clients,
  onSelect,
  onAddNew,
}: {
  clients: Client[]
  onSelect: (client: Client) => void
  onAddNew: () => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? clients.filter((c) => {
        const q = query.toLowerCase()
        return (
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.clubName.toLowerCase().includes(q) ||
          c.companyName.toLowerCase().includes(q)
        )
      })
    : clients

  // Includes the "Add New Client" sentinel at the end
  const totalItems = filtered.length + 1

  useEffect(() => {
    setHighlighted(0)
  }, [query])

  // Close when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, totalItems - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlighted === filtered.length) {
        setOpen(false)
        setQuery('')
        onAddNew()
      } else if (filtered[highlighted]) {
        handleSelect(filtered[highlighted])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const handleSelect = (client: Client) => {
    setQuery(`${client.firstName} ${client.lastName}`)
    setOpen(false)
    onSelect(client)
  }

  const handleAddNewClick = () => {
    setOpen(false)
    setQuery('')
    onAddNew()
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          🔍
        </span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Type client name, email, club or company…"
          className="w-full border-2 border-blue-300 focus:border-blue-500 rounded-xl pl-9 pr-10 py-3 text-sm font-medium focus:outline-none transition-colors bg-blue-50 focus:bg-white"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
        >
          <svg
            className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {open && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-xl max-h-60 overflow-y-auto"
        >
          {filtered.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-400 italic">No clients found</li>
          )}

          {filtered.map((client, idx) => (
            <li
              key={client.id}
              onMouseDown={() => handleSelect(client)}
              onMouseEnter={() => setHighlighted(idx)}
              className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                highlighted === idx ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                {client.firstName.charAt(0)}{client.lastName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">
                  {client.firstName} {client.lastName}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                  {client.email && (
                    <span className="text-xs text-gray-500">{client.email}</span>
                  )}
                  {client.phone && (
                    <span className="text-xs text-gray-500">{client.phone}</span>
                  )}
                  {client.clubName && (
                    <span className="text-xs text-indigo-600 font-medium">🏁 {client.clubName}</span>
                  )}
                  {client.companyName && (
                    <span className="text-xs text-emerald-600 font-medium">🏢 {client.companyName}</span>
                  )}
                </div>
              </div>
            </li>
          ))}

          {/* Divider + Add New Client */}
          {filtered.length > 0 && <li className="border-t border-gray-100" />}
          <li
            onMouseDown={handleAddNewClick}
            onMouseEnter={() => setHighlighted(filtered.length)}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors font-semibold text-sm ${
              highlighted === filtered.length
                ? 'bg-green-50 text-green-700'
                : 'text-green-600 hover:bg-green-50'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
              +
            </div>
            Add New Client
          </li>
        </ul>
      )}
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
      <span className="text-base">{icon}</span>
      <div>
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
    </div>
  )
}

// ─── Backorder Modal ──────────────────────────────────────────────────────────

function BackorderModal({
  initial,
  clients,
  onSave,
  onClose,
}: {
  initial?: Partial<FormData> & { id?: string }
  clients: Client[]
  onSave: (data: FormData & { id?: string }) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<FormData>({
    ...EMPTY_CLIENT_FIELDS,
    ...EMPTY_PRODUCT_FIELDS,
    ...initial,
  })
  const [isNewClient, setIsNewClient] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selectedClientName, setSelectedClientName] = useState(
    initial?.clientName ? `${initial.clientName}` : ''
  )

  const set = <K extends keyof FormData>(field: K, value: FormData[K]) =>
    setForm((p) => ({ ...p, [field]: value }))

  const str = (field: keyof FormData, val: string) =>
    setForm((p) => ({ ...p, [field]: val }))

  // Autofill from client record
  const handleClientSelect = (client: Client) => {
    setIsNewClient(false)
    setSelectedClientName(`${client.firstName} ${client.lastName}`)
    setForm((p) => ({
      ...p,
      clientId: client.id,
      clientName: `${client.firstName} ${client.lastName}`,
      clientEmail: client.email,
      clientPhone: client.phone,
      clubName: client.clubName,
      clubMemberId: client.clubMemberId,
      companyName: client.companyName,
      companyVAT: client.companyVAT,
      companyAddress: client.companyAddress,
    }))
  }

  const handleAddNew = () => {
    setIsNewClient(true)
    setSelectedClientName('')
    setForm((p) => ({
      ...p,
      clientId: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      clubName: '',
      clubMemberId: '',
      companyName: '',
      companyVAT: '',
      companyAddress: '',
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.clientName.trim()) return setError('Client name is required')
    if (!form.sku.trim()) return setError('SKU is required')
    if (!form.description.trim()) return setError('Description is required')
    setSaving(true)
    setError('')
    try {
      await onSave({ ...form, id: initial?.id })
      onClose()
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const isEditing = !!initial?.id
  const clientIsSelected = !!form.clientId || !!form.clientName

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[92vh] overflow-y-auto">

        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b z-10 flex items-center justify-between px-6 py-4 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900 font-play">
              {isEditing ? '✏️ Edit Backorder' : '➕ Create Backorder'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {isEditing ? 'Update backorder details' : 'Search for a client or add a new one'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* ── Client Search ─────────────────────────────────────── */}
          {!isEditing && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <SectionHeader
                icon="🔍"
                title="Search Client"
                subtitle="Select existing client to autofill details, or add a new one"
              />
              <ClientSearchDropdown
                clients={clients}
                onSelect={handleClientSelect}
                onAddNew={handleAddNew}
              />

              {/* Status pill after selection */}
              {clientIsSelected && !isNewClient && (
                <div className="mt-2 flex items-center gap-2 text-xs text-blue-700 bg-blue-100 rounded-lg px-3 py-1.5 w-fit">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Client autofilled: <strong>{selectedClientName}</strong></span>
                </div>
              )}
              {isNewClient && (
                <div className="mt-2 flex items-center gap-2 text-xs text-green-700 bg-green-100 rounded-lg px-3 py-1.5 w-fit">
                  <span>✚</span>
                  <span>New client — fill in details below to save to database</span>
                </div>
              )}
            </div>
          )}

          {/* ── Client Details ────────────────────────────────────── */}
          <div>
            <SectionHeader icon="👤" title="Client Details" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.clientName}
                  onChange={(e) => str('clientName', e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={form.clientEmail}
                  onChange={(e) => str('clientEmail', e.target.value)}
                  placeholder="john@email.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                <input
                  value={form.clientPhone}
                  onChange={(e) => str('clientPhone', e.target.value)}
                  placeholder="082 000 0000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* ── Club Info ─────────────────────────────────────────── */}
          <div>
            <SectionHeader
              icon="🏁"
              title="Club Info"
              subtitle="Racing club membership details"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Club Name</label>
                <input
                  value={form.clubName}
                  onChange={(e) => str('clubName', e.target.value)}
                  placeholder="e.g. NSR Racing Club Johannesburg"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Member ID</label>
                <input
                  value={form.clubMemberId}
                  onChange={(e) => str('clubMemberId', e.target.value)}
                  placeholder="e.g. NSRJHB-042"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* ── Company Info ──────────────────────────────────────── */}
          <div>
            <SectionHeader
              icon="🏢"
              title="Company Info"
              subtitle="Business / billing details"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Company Name</label>
                <input
                  value={form.companyName}
                  onChange={(e) => str('companyName', e.target.value)}
                  placeholder="e.g. Acme Motorsport (Pty) Ltd"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">VAT Number</label>
                <input
                  value={form.companyVAT}
                  onChange={(e) => str('companyVAT', e.target.value)}
                  placeholder="e.g. 4123456789"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Company Address</label>
                <input
                  value={form.companyAddress}
                  onChange={(e) => str('companyAddress', e.target.value)}
                  placeholder="e.g. 12 Industrial Road, Johannesburg, 2000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* ── Product Details ───────────────────────────────────── */}
          <div>
            <SectionHeader icon="📦" title="Product Details" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  SKU <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.sku}
                  onChange={(e) => str('sku', e.target.value)}
                  placeholder="NSR-0170-AW"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Brand</label>
                <input
                  value={form.brand}
                  onChange={(e) => str('brand', e.target.value)}
                  placeholder="NSR, Slot.it, Scalextric…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.description}
                  onChange={(e) => str('description', e.target.value)}
                  placeholder="NSR Formula 86/89 Red Bull Livery Kit"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">QTY</label>
                <input
                  type="number"
                  min={1}
                  value={form.qty}
                  onChange={(e) => set('qty', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Price (R)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => set('price', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Supplier Link</label>
                <input
                  type="url"
                  value={form.supplierLink}
                  onChange={(e) => str('supplierLink', e.target.value)}
                  placeholder="https://supplier.com/product/nsr-0170"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => str('notes', e.target.value)}
                  rows={2}
                  placeholder="Any additional notes…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              ⚠️ {error}
            </p>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gray-900 text-white rounded-xl py-3 text-sm font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving
                ? 'Saving…'
                : isEditing
                ? 'Save Changes'
                : isNewClient
                ? 'Create Backorder + Save Client'
                : 'Create Backorder'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 border border-gray-300 text-gray-700 rounded-xl py-3 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Phase Checkbox ───────────────────────────────────────────────────────────

function PhaseCheckbox({
  label,
  checked,
  date,
  onChange,
  loading,
}: {
  label: string
  checked: boolean
  date?: string
  onChange: () => void
  loading: boolean
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={loading}
      title={date ? `${label}: ${new Date(date).toLocaleDateString('en-ZA')}` : label}
      className={`flex flex-col items-center gap-0.5 min-w-[60px] group transition-opacity ${
        loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <div
        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
          checked
            ? 'bg-green-500 border-green-500 text-white shadow-sm'
            : 'border-gray-300 bg-white group-hover:border-green-400'
        }`}
      >
        {checked && (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={`text-[10px] font-semibold leading-tight text-center ${checked ? 'text-green-600' : 'text-gray-400'}`}>
        {label}
      </span>
      {date && (
        <span className="text-[9px] text-gray-400 leading-none">
          {new Date(date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })}
        </span>
      )}
    </button>
  )
}

function PhaseProgress({ bo }: { bo: Backorder }) {
  const done = [bo.phaseQuote, bo.phaseSalesOrder, bo.phaseInvoice, bo.phaseDepositPaid].filter(Boolean).length
  const pct = (done / 4) * 100
  return (
    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-blue-400'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function StatusBadge({ status }: { status: Backorder['status'] }) {
  const map: Record<string, string> = {
    active: 'bg-blue-100 text-blue-700',
    complete: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${map[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BackordersPage() {
  const [backorders, setBackorders] = useState<Backorder[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [patchingId, setPatchingId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Backorder | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [boRes, clRes] = await Promise.all([
        fetch('/api/admin/backorders'),
        fetch('/api/admin/clients'),
      ])
      if (boRes.ok) setBackorders(await boRes.json())
      if (clRes.ok) setClients(await clRes.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Toggle Phase ────────────────────────────────────────────────────────────
  const togglePhase = async (id: string, field: string, current: boolean) => {
    setPatchingId(id)
    try {
      const res = await fetch(`/api/admin/backorders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !current }),
      })
      if (res.ok) {
        const updated = await res.json()
        setBackorders((prev) => prev.map((b) => (b.id === id ? updated : b)))
      }
    } finally {
      setPatchingId(null)
    }
  }

  // ── Create ──────────────────────────────────────────────────────────────────
  const handleCreate = async (data: FormData & { id?: string }) => {
    // If it's a new client (no clientId), save to clients DB first
    if (!data.clientId && data.clientName.trim()) {
      const nameParts = data.clientName.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      try {
        const clientRes = await fetch('/api/admin/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName,
            lastName,
            email: data.clientEmail,
            phone: data.clientPhone,
            clubName: data.clubName,
            clubMemberId: data.clubMemberId,
            companyName: data.companyName,
            companyVAT: data.companyVAT,
            companyAddress: data.companyAddress,
          }),
        })
        if (clientRes.ok) {
          const newClient = await clientRes.json()
          data.clientId = newClient.id
          setClients((prev) => [...prev, newClient].sort((a, b) =>
            `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
          ))
        } else if (clientRes.status === 409) {
          // Duplicate — use the existing client's ID
          const body = await clientRes.json()
          if (body.existing?.id) data.clientId = body.existing.id
        }
      } catch {
        // Non-fatal — backorder can still be saved without a clientId
      }
    }

    const res = await fetch('/api/admin/backorders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to create backorder')
    const created = await res.json()
    setBackorders((prev) => [created, ...prev])
  }

  // ── Edit Save ───────────────────────────────────────────────────────────────
  const handleEdit = async (data: FormData & { id?: string }) => {
    const res = await fetch(`/api/admin/backorders/${data.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to update backorder')
    const updated = await res.json()
    setBackorders((prev) => prev.map((b) => (b.id === data.id ? updated : b)))
    setEditItem(null)
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/backorders/${id}`, { method: 'DELETE' })
    if (res.ok) setBackorders((prev) => prev.filter((b) => b.id !== id))
    setDeleteConfirm(null)
  }

  // ── Duplicate ────────────────────────────────────────────────────────────────
  const handleDuplicate = async (bo: Backorder) => {
    setDuplicatingId(bo.id)
    try {
      const res = await fetch('/api/admin/backorders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: bo.clientId || '',
          clientName: bo.clientName,
          clientEmail: bo.clientEmail,
          clientPhone: bo.clientPhone,
          clubName: bo.clubName || '',
          clubMemberId: bo.clubMemberId || '',
          companyName: bo.companyName || '',
          companyVAT: bo.companyVAT || '',
          companyAddress: bo.companyAddress || '',
          sku: bo.sku,
          description: bo.description,
          brand: bo.brand,
          supplierLink: bo.supplierLink,
          qty: bo.qty,
          price: bo.price,
          notes: bo.notes || '',
          // Reset all phases — duplicate starts fresh
          phaseQuote: false,
          phaseSalesOrder: false,
          phaseInvoice: false,
          phaseDepositPaid: false,
          status: 'active',
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setBackorders((prev) => [created, ...prev])
      }
    } finally {
      setDuplicatingId(null)
    }
  }

  // ── Filtered List ───────────────────────────────────────────────────────────
  const filtered = backorders.filter((b) => {
    const matchStatus = filterStatus === 'all' || b.status === filterStatus
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      b.clientName.toLowerCase().includes(q) ||
      b.sku.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q) ||
      b.brand.toLowerCase().includes(q) ||
      (b.clubName || '').toLowerCase().includes(q) ||
      (b.companyName || '').toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const stats = {
    total: backorders.length,
    active: backorders.filter((b) => b.status === 'active').length,
    complete: backorders.filter((b) => b.status === 'complete').length,
    depositPaid: backorders.filter((b) => b.phaseDepositPaid).length,
  }

  // ── Build edit initial form data ────────────────────────────────────────────
  const editFormData = editItem
    ? {
        id: editItem.id,
        clientId: editItem.clientId || '',
        clientName: editItem.clientName,
        clientEmail: editItem.clientEmail,
        clientPhone: editItem.clientPhone,
        clubName: editItem.clubName || '',
        clubMemberId: editItem.clubMemberId || '',
        companyName: editItem.companyName || '',
        companyVAT: editItem.companyVAT || '',
        companyAddress: editItem.companyAddress || '',
        sku: editItem.sku,
        description: editItem.description,
        brand: editItem.brand,
        supplierLink: editItem.supplierLink,
        qty: editItem.qty,
        price: editItem.price,
        notes: editItem.notes || '',
      }
    : undefined

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-play">Back Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track client backorders — Quote → Sales Order → Invoice → Deposit
          </p>
        </div>
        <button
          onClick={() => { setEditItem(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors shadow-sm"
        >
          <span className="text-base font-bold">+</span>
          Add Backorder
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'bg-gray-900', icon: '📋' },
          { label: 'Active', value: stats.active, color: 'bg-blue-600', icon: '🔄' },
          { label: 'Complete', value: stats.complete, color: 'bg-green-600', icon: '✅' },
          { label: 'Deposit Paid', value: stats.depositPaid, color: 'bg-yellow-500', icon: '💰' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={`${s.color} text-white w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0`}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search client, SKU, description, brand, club, company…"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2 flex-wrap">
          {(['all', 'active', 'complete', 'cancelled'] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterStatus === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <svg className="animate-spin h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading backorders…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">📦</p>
            <p className="font-semibold text-gray-600">No backorders found</p>
            <p className="text-sm mt-1">
              {search || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Click "Add Backorder" to create your first one'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU / Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Brand</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[300px]">Phases</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((bo) => {
                  const isPatching = patchingId === bo.id
                  return (
                    <tr key={bo.id} className="hover:bg-gray-50 transition-colors">
                      {/* Client */}
                      <td className="px-4 py-4 max-w-[200px]">
                        <p className="font-semibold text-gray-900 truncate">{bo.clientName}</p>
                        {bo.clientEmail && (
                          <p className="text-xs text-gray-400 truncate">{bo.clientEmail}</p>
                        )}
                        {bo.clientPhone && (
                          <p className="text-xs text-gray-400">{bo.clientPhone}</p>
                        )}
                        {bo.clubName && (
                          <p className="text-xs text-indigo-600 font-medium mt-0.5">🏁 {bo.clubName}</p>
                        )}
                        {bo.companyName && (
                          <p className="text-xs text-emerald-600 font-medium">🏢 {bo.companyName}</p>
                        )}
                      </td>

                      {/* SKU / Product */}
                      <td className="px-4 py-4">
                        <p className="font-mono text-xs font-bold text-gray-700 bg-gray-100 inline-block px-1.5 py-0.5 rounded mb-1">
                          {bo.sku}
                        </p>
                        <p className="text-gray-900 font-medium leading-tight">{bo.description}</p>
                        {bo.supplierLink && (
                          <a
                            href={bo.supplierLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline mt-0.5 inline-flex items-center gap-1"
                          >
                            🔗 Supplier
                          </a>
                        )}
                      </td>

                      {/* Brand */}
                      <td className="px-4 py-4">
                        <span className="text-gray-700 font-medium">{bo.brand || '—'}</span>
                      </td>

                      {/* QTY */}
                      <td className="px-4 py-4 text-right font-semibold text-gray-900">{bo.qty}</td>

                      {/* Price */}
                      <td className="px-4 py-4 text-right font-semibold text-gray-900">
                        {bo.price > 0
                          ? `R${bo.price.toFixed(2)}`
                          : <span className="text-gray-400 text-xs">POA</span>}
                      </td>

                      {/* Phases */}
                      <td className="px-4 py-4">
                        <div className="flex items-end justify-center gap-2 mb-2">
                          <PhaseCheckbox
                            label="Quote"
                            checked={bo.phaseQuote}
                            date={bo.phaseQuoteDate}
                            onChange={() => togglePhase(bo.id, 'phaseQuote', bo.phaseQuote)}
                            loading={isPatching}
                          />
                          <div className="flex-1 flex items-center mb-3.5">
                            <div className={`flex-1 h-px ${bo.phaseSalesOrder ? 'bg-green-400' : 'bg-gray-200'}`} />
                          </div>
                          <PhaseCheckbox
                            label="Sales Order"
                            checked={bo.phaseSalesOrder}
                            date={bo.phaseSalesOrderDate}
                            onChange={() => togglePhase(bo.id, 'phaseSalesOrder', bo.phaseSalesOrder)}
                            loading={isPatching}
                          />
                          <div className="flex-1 flex items-center mb-3.5">
                            <div className={`flex-1 h-px ${bo.phaseInvoice ? 'bg-green-400' : 'bg-gray-200'}`} />
                          </div>
                          <PhaseCheckbox
                            label="Invoice"
                            checked={bo.phaseInvoice}
                            date={bo.phaseInvoiceDate}
                            onChange={() => togglePhase(bo.id, 'phaseInvoice', bo.phaseInvoice)}
                            loading={isPatching}
                          />
                          <div className="flex-1 flex items-center mb-3.5">
                            <div className={`flex-1 h-px ${bo.phaseDepositPaid ? 'bg-green-400' : 'bg-gray-200'}`} />
                          </div>
                          <PhaseCheckbox
                            label="Deposit Paid"
                            checked={bo.phaseDepositPaid}
                            date={bo.phaseDepositPaidDate}
                            onChange={() => togglePhase(bo.id, 'phaseDepositPaid', bo.phaseDepositPaid)}
                            loading={isPatching}
                          />
                        </div>
                        <PhaseProgress bo={bo} />
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 text-center">
                        <StatusBadge status={bo.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditItem(bo); setShowModal(true) }}
                            title="Edit"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDuplicate(bo)}
                            title="Duplicate Order"
                            disabled={duplicatingId === bo.id}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {duplicatingId === bo.id ? (
                              <span className="inline-block w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              '📋'
                            )}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(bo.id)}
                            title="Delete"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            🗑️
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

        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 bg-gray-50">
            Showing {filtered.length} of {backorders.length} backorder{backorders.length !== 1 ? 's' : ''}
            {clients.length > 0 && (
              <span className="ml-3 text-gray-300">·</span>
            )}
            {clients.length > 0 && (
              <span className="ml-3">{clients.length} client{clients.length !== 1 ? 's' : ''} in database</span>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <BackorderModal
          initial={editFormData}
          clients={clients}
          onSave={editItem ? handleEdit : handleCreate}
          onClose={() => { setShowModal(false); setEditItem(null) }}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Backorder?</h3>
            <p className="text-sm text-gray-600 mb-6">
              This cannot be undone. All phase data will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
