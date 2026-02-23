'use client'

import { useState, useEffect, useCallback } from 'react'

interface Backorder {
  id: string
  clientName: string
  clientEmail: string
  clientPhone: string
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

const EMPTY_FORM = {
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  sku: '',
  description: '',
  brand: '',
  supplierLink: '',
  qty: 1,
  price: 0,
  notes: '',
}

type FormData = typeof EMPTY_FORM
type FilterStatus = 'all' | 'active' | 'complete' | 'cancelled'

// ── Phase Checkbox ──────────────────────────────────────────────────────────
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
  onChange: (val: boolean) => void
  loading: boolean
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      disabled={loading}
      title={date ? `${label}: ${new Date(date).toLocaleDateString('en-ZA')}` : label}
      className={`flex flex-col items-center gap-0.5 min-w-[60px] group transition-opacity ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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

// ── Progress Bar ─────────────────────────────────────────────────────────────
function PhaseProgress({ bo }: { bo: Backorder }) {
  const phases = [bo.phaseQuote, bo.phaseSalesOrder, bo.phaseInvoice, bo.phaseDepositPaid]
  const done = phases.filter(Boolean).length
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

// ── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Backorder['status'] }) {
  const map = {
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

// ── Add / Edit Modal ─────────────────────────────────────────────────────────
function BackorderModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<FormData> & { id?: string }
  onSave: (data: FormData & { id?: string }) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM, ...initial })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (field: keyof FormData, value: string | number) =>
    setForm((p) => ({ ...p, [field]: value }))

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900 font-play">
            {initial?.id ? '✏️ Edit Backorder' : '➕ New Backorder'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Client Details */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Client Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Client Name *</label>
                <input
                  value={form.clientName}
                  onChange={(e) => set('clientName', e.target.value)}
                  placeholder="John Smith"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={form.clientEmail}
                  onChange={(e) => set('clientEmail', e.target.value)}
                  placeholder="john@email.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                <input
                  value={form.clientPhone}
                  onChange={(e) => set('clientPhone', e.target.value)}
                  placeholder="082 000 0000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Product Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">SKU *</label>
                <input
                  value={form.sku}
                  onChange={(e) => set('sku', e.target.value)}
                  placeholder="NSR-123"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Brand</label>
                <input
                  value={form.brand}
                  onChange={(e) => set('brand', e.target.value)}
                  placeholder="NSR, Slot.it, Scalextric…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description *</label>
                <input
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="NSR Formula 86/89 Red Bull Kit"
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
                  onChange={(e) => set('supplierLink', e.target.value)}
                  placeholder="https://supplier.com/product/123"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  rows={2}
                  placeholder="Any additional notes…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gray-900 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : initial?.id ? 'Save Changes' : 'Create Backorder'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BackordersPage() {
  const [backorders, setBackorders] = useState<Backorder[]>([])
  const [loading, setLoading] = useState(true)
  const [patchingId, setPatchingId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Backorder | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/backorders')
      if (res.ok) setBackorders(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Patch phase ─────────────────────────────────────────────────────────────
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
    const res = await fetch('/api/admin/backorders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed')
    const created = await res.json()
    setBackorders((prev) => [created, ...prev])
  }

  // ── Edit save ───────────────────────────────────────────────────────────────
  const handleEdit = async (data: FormData & { id?: string }) => {
    const res = await fetch(`/api/admin/backorders/${data.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed')
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

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filtered = backorders.filter((b) => {
    const matchStatus = filterStatus === 'all' || b.status === filterStatus
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      b.clientName.toLowerCase().includes(q) ||
      b.sku.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q) ||
      b.brand.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = {
    total: backorders.length,
    active: backorders.filter((b) => b.status === 'active').length,
    complete: backorders.filter((b) => b.status === 'complete').length,
    depositPaid: backorders.filter((b) => b.phaseDepositPaid).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-play">Back Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track client backorders through Quote → Sales Order → Invoice → Deposit</p>
        </div>
        <button
          onClick={() => { setEditItem(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors shadow-sm"
        >
          <span className="text-base">+</span>
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
          placeholder="Search client, SKU, description, brand…"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2 flex-wrap">
          {(['all', 'active', 'complete', 'cancelled'] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterStatus === s
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[300px]">
                    Phases
                  </th>
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
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-900">{bo.clientName}</p>
                        {bo.clientEmail && (
                          <p className="text-xs text-gray-400 mt-0.5">{bo.clientEmail}</p>
                        )}
                        {bo.clientPhone && (
                          <p className="text-xs text-gray-400">{bo.clientPhone}</p>
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
                        {bo.price > 0 ? `R${bo.price.toFixed(2)}` : <span className="text-gray-400 text-xs">POA</span>}
                      </td>

                      {/* Phases */}
                      <td className="px-4 py-4">
                        <div className="flex items-end justify-center gap-3 mb-2">
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

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 bg-gray-50">
            Showing {filtered.length} of {backorders.length} backorder{backorders.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <BackorderModal
          initial={editItem ? {
            id: editItem.id,
            clientName: editItem.clientName,
            clientEmail: editItem.clientEmail,
            clientPhone: editItem.clientPhone,
            sku: editItem.sku,
            description: editItem.description,
            brand: editItem.brand,
            supplierLink: editItem.supplierLink,
            qty: editItem.qty,
            price: editItem.price,
            notes: editItem.notes || '',
          } : undefined}
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
              This action cannot be undone. The backorder and all phase data will be permanently removed.
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
