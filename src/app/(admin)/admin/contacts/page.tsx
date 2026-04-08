'use client'

import { useState, useEffect, useCallback } from 'react'
import { useColumnResize } from '@/hooks/use-column-resize'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  mobile: string
  addressStreet: string
  addressCity: string
  addressProvince: string
  addressPostalCode: string
  addressCountry: string
  clubName: string
  clubMemberId: string
  companyName: string
  companyVAT: string
  companyAddress: string
  deliveryDoorToDoor: boolean
  deliveryKioskToKiosk: boolean
  deliveryPudoLocker: boolean
  deliveryPostnetAramex: boolean
  source: 'book-now' | 'manual' | 'import' | 'website'
  notes: string
  totalOrders: number
  totalSpent: number
  createdAt: string
  updatedAt: string
}

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  mobile: '',
  addressStreet: '',
  addressCity: '',
  addressProvince: '',
  addressPostalCode: '',
  addressCountry: 'South Africa',
  clubName: '',
  clubMemberId: '',
  companyName: '',
  companyVAT: '',
  companyAddress: '',
  deliveryDoorToDoor: false,
  deliveryKioskToKiosk: false,
  deliveryPudoLocker: false,
  deliveryPostnetAramex: false,
  notes: '',
}

type FormData = typeof EMPTY_FORM

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fullName(c: Contact) {
  return `${c.firstName} ${c.lastName}`.trim()
}

function sourceBadge(source: string) {
  const map: Record<string, string> = {
    'book-now': 'bg-blue-100 text-blue-700',
    manual:     'bg-green-100 text-green-700',
    import:     'bg-purple-100 text-purple-700',
    website:    'bg-orange-100 text-orange-700',
  }
  const labels: Record<string, string> = {
    'book-now': 'Book Now',
    manual:     'Manual',
    import:     'Import',
    website:    'Website',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${map[source] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[source] ?? source}
    </span>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
      <span className="text-base">{icon}</span>
      <div>
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

// ─── Delivery Checkbox Tile ───────────────────────────────────────────────────

function DeliveryTile({
  icon,
  label,
  sub,
  checked,
  onChange,
}: {
  icon: string
  label: string
  sub: string
  checked: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all cursor-pointer w-full text-center ${
        checked
          ? 'border-green-500 bg-green-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {/* Tick badge */}
      <div
        className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          checked
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 bg-white'
        }`}
      >
        {checked && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      <span className="text-2xl leading-none">{icon}</span>
      <span className={`text-xs font-bold leading-tight ${checked ? 'text-green-700' : 'text-gray-700'}`}>
        {label}
      </span>
      <span className="text-[10px] text-gray-400 leading-tight">{sub}</span>
    </button>
  )
}

// ─── Contact Modal ────────────────────────────────────────────────────────────

function ContactModal({
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

  const str = (field: keyof FormData, val: string) =>
    setForm(p => ({ ...p, [field]: val }))
  const bool = (field: keyof FormData, val: boolean) =>
    setForm(p => ({ ...p, [field]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.firstName.trim()) return setError('First name is required')
    setSaving(true)
    setError('')
    try {
      await onSave({ ...form, id: initial?.id })
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const isEditing = !!initial?.id

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b z-10 flex items-center justify-between px-6 py-4 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900 font-play">
              {isEditing ? '✏️ Edit Customer' : '➕ Add New Customer'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Fill in personal, address, club, business and delivery details
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors text-xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* ── Personal Details ───────────────────────────────── */}
          <div>
            <SectionHeader icon="👤" title="Personal Details" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.firstName}
                  onChange={e => str('firstName', e.target.value)}
                  placeholder="John"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name</label>
                <input
                  value={form.lastName}
                  onChange={e => str('lastName', e.target.value)}
                  placeholder="Smith"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => str('email', e.target.value)}
                  placeholder="john@email.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                <input
                  value={form.phone}
                  onChange={e => str('phone', e.target.value)}
                  placeholder="082 000 0000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mobile</label>
                <input
                  value={form.mobile}
                  onChange={e => str('mobile', e.target.value)}
                  placeholder="083 000 0000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* ── Address ───────────────────────────────────────── */}
          <div>
            <SectionHeader icon="📍" title="Address" subtitle="Home or delivery address" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Street Address</label>
                <input
                  value={form.addressStreet}
                  onChange={e => str('addressStreet', e.target.value)}
                  placeholder="12 Main Road, Sandton"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">City</label>
                <input
                  value={form.addressCity}
                  onChange={e => str('addressCity', e.target.value)}
                  placeholder="Johannesburg"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Province</label>
                <select
                  value={form.addressProvince}
                  onChange={e => str('addressProvince', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select province…</option>
                  {[
                    'Gauteng','Western Cape','KwaZulu-Natal','Eastern Cape',
                    'Limpopo','Mpumalanga','North West','Free State','Northern Cape',
                  ].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Postal Code</label>
                <input
                  value={form.addressPostalCode}
                  onChange={e => str('addressPostalCode', e.target.value)}
                  placeholder="2196"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Country</label>
                <input
                  value={form.addressCountry}
                  onChange={e => str('addressCountry', e.target.value)}
                  placeholder="South Africa"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* ── Club ──────────────────────────────────────────── */}
          <div>
            <SectionHeader icon="🏁" title="Club" subtitle="Racing club membership" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Club Name</label>
                <input
                  value={form.clubName}
                  onChange={e => str('clubName', e.target.value)}
                  placeholder="NSR Racing Club Johannesburg"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Member ID</label>
                <input
                  value={form.clubMemberId}
                  onChange={e => str('clubMemberId', e.target.value)}
                  placeholder="NSRJHB-042"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* ── Business ──────────────────────────────────────── */}
          <div>
            <SectionHeader icon="🏢" title="Business" subtitle="Company / billing details" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Company Name</label>
                <input
                  value={form.companyName}
                  onChange={e => str('companyName', e.target.value)}
                  placeholder="Acme Motorsport (Pty) Ltd"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">VAT Number</label>
                <input
                  value={form.companyVAT}
                  onChange={e => str('companyVAT', e.target.value)}
                  placeholder="4123456789"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Company Address</label>
                <input
                  value={form.companyAddress}
                  onChange={e => str('companyAddress', e.target.value)}
                  placeholder="12 Industrial Road, Johannesburg, 2000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* ── Delivery Options ──────────────────────────────── */}
          <div>
            <SectionHeader
              icon="🚚"
              title="Delivery Options"
              subtitle="Select preferred delivery methods — tick all that apply"
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <DeliveryTile
                icon="🚪"
                label="Door to Door"
                sub="Courier delivery"
                checked={form.deliveryDoorToDoor}
                onChange={v => bool('deliveryDoorToDoor', v)}
              />
              <DeliveryTile
                icon="📦"
                label="Kiosk to Kiosk"
                sub="Collect at kiosk"
                checked={form.deliveryKioskToKiosk}
                onChange={v => bool('deliveryKioskToKiosk', v)}
              />
              <DeliveryTile
                icon="🔒"
                label="Pudo Locker"
                sub="Smart locker"
                checked={form.deliveryPudoLocker}
                onChange={v => bool('deliveryPudoLocker', v)}
              />
              <DeliveryTile
                icon="📮"
                label="Postnet"
                sub="Aramex network"
                checked={form.deliveryPostnetAramex}
                onChange={v => bool('deliveryPostnetAramex', v)}
              />
            </div>

            {/* Summary row */}
            {(form.deliveryDoorToDoor || form.deliveryKioskToKiosk || form.deliveryPudoLocker || form.deliveryPostnetAramex) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {form.deliveryDoorToDoor    && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Door to Door</span>}
                {form.deliveryKioskToKiosk  && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Kiosk to Kiosk</span>}
                {form.deliveryPudoLocker    && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Pudo Locker</span>}
                {form.deliveryPostnetAramex && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Postnet (Aramex)</span>}
              </div>
            )}
          </div>

          {/* ── Notes ─────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => str('notes', e.target.value)}
              rows={2}
              placeholder="Any additional notes about this contact…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
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
              {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Customer'}
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

// ─── Delivery Badges (for table row) ─────────────────────────────────────────

function DeliveryBadges({ c }: { c: Contact }) {
  const opts = [
    { key: 'deliveryDoorToDoor',    icon: '🚪', label: 'D2D' },
    { key: 'deliveryKioskToKiosk',  icon: '📦', label: 'K2K' },
    { key: 'deliveryPudoLocker',    icon: '🔒', label: 'Pudo' },
    { key: 'deliveryPostnetAramex', icon: '📮', label: 'Postnet' },
  ] as const

  const active = opts.filter(o => c[o.key])
  if (active.length === 0) return <span className="text-gray-300 text-xs">—</span>

  return (
    <div className="flex flex-wrap gap-1">
      {active.map(o => (
        <span key={o.key} className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">
          {o.icon} {o.label}
        </span>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const [contacts, setContacts]       = useState<Contact[]>([])
  const [loading, setLoading]         = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal]     = useState(false)
  const [editItem, setEditItem]       = useState<Contact | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [syncing, setSyncing]         = useState(false)
  const [syncMsg, setSyncMsg]         = useState('')
  const [sortBy, setSortBy]           = useState<string>('name')
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('asc')
  const { widths: colW, setWidth } = useColumnResize('contacts', {
    name: 160, email: 150, address: 140, club: 100,
    company: 130, delivery: 140, orders: 70, spent: 90, source: 90,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/contacts')
      if (res.ok) setContacts(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Sync from orders ──────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await fetch('/api/admin/contacts', { method: 'PUT' })
      if (res.ok) {
        const d = await res.json()
        setSyncMsg(`Synced ${d.synced} new contact${d.synced !== 1 ? 's' : ''}. Total: ${d.total}`)
        load()
      }
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(''), 4000)
    }
  }

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async (data: FormData & { id?: string }) => {
    const res = await fetch('/api/admin/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const body = await res.json()
      throw new Error(body.error || 'Failed to create contact')
    }
    const created = await res.json()
    setContacts(prev => [created, ...prev])
  }

  // ── Edit save ─────────────────────────────────────────────────────────────
  const handleEdit = async (data: FormData & { id?: string }) => {
    const res = await fetch(`/api/admin/contacts/${data.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to update contact')
    const updated = await res.json()
    setContacts(prev => prev.map(c => (c.id === data.id ? updated : c)))
    setEditItem(null)
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/contacts/${id}`, { method: 'DELETE' })
    if (res.ok) setContacts(prev => prev.filter(c => c.id !== id))
    setDeleteConfirm(null)
  }

  // ── CSV export ────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const rows = [
      ['Name','Email','Phone','City','Province','Club','Company','Delivery','Source','Orders','Spent','Notes'],
      ...contacts.map(c => [
        fullName(c), c.email, c.phone,
        c.addressCity, c.addressProvince,
        c.clubName, c.companyName,
        [
          c.deliveryDoorToDoor    && 'Door to Door',
          c.deliveryKioskToKiosk  && 'Kiosk to Kiosk',
          c.deliveryPudoLocker    && 'Pudo Locker',
          c.deliveryPostnetAramex && 'Postnet Aramex',
        ].filter(Boolean).join(' | '),
        c.source,
        String(c.totalOrders),
        `R${(c.totalSpent||0).toFixed(2)}`,
        c.notes,
      ]),
    ]
    const csv = rows.map(r =>
      r.map(cell => `"${String(cell||'').replace(/"/g,'""')}"`).join(',')
    ).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Filtered + Sorted ─────────────────────────────────────────────────────
  const filtered = contacts
    .filter(c => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        fullName(c).toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.addressCity.toLowerCase().includes(q) ||
        c.clubName.toLowerCase().includes(q) ||
        c.companyName.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''
      if      (sortBy === 'name')    { av = fullName(a); bv = fullName(b) }
      else if (sortBy === 'email')   { av = a.email || ''; bv = b.email || '' }
      else if (sortBy === 'club')    { av = a.clubName || ''; bv = b.clubName || '' }
      else if (sortBy === 'company') { av = a.companyName || ''; bv = b.companyName || '' }
      else if (sortBy === 'orders')  { av = a.totalOrders ?? 0; bv = b.totalOrders ?? 0 }
      else if (sortBy === 'spent')   { av = a.totalSpent ?? 0; bv = b.totalSpent ?? 0 }
      else if (sortBy === 'source')  { av = a.source || ''; bv = b.source || '' }
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total:    contacts.length,
    bookNow:  contacts.filter(c => c.source === 'book-now').length,
    website:  contacts.filter(c => c.source === 'website').length,
    manual:   contacts.filter(c => c.source === 'manual').length,
    revenue:  contacts.reduce((s, c) => s + (c.totalSpent || 0), 0),
  }

  // ── Edit form data ────────────────────────────────────────────────────────
  const editFormData = editItem
    ? {
        id:                   editItem.id,
        firstName:            editItem.firstName,
        lastName:             editItem.lastName,
        email:                editItem.email,
        phone:                editItem.phone,
        mobile:               editItem.mobile            || '',
        addressStreet:        editItem.addressStreet   || '',
        addressCity:          editItem.addressCity     || '',
        addressProvince:      editItem.addressProvince || '',
        addressPostalCode:    editItem.addressPostalCode || '',
        addressCountry:       editItem.addressCountry  || 'South Africa',
        clubName:             editItem.clubName        || '',
        clubMemberId:         editItem.clubMemberId    || '',
        companyName:          editItem.companyName     || '',
        companyVAT:           editItem.companyVAT      || '',
        companyAddress:       editItem.companyAddress  || '',
        deliveryDoorToDoor:    editItem.deliveryDoorToDoor    || false,
        deliveryKioskToKiosk:  editItem.deliveryKioskToKiosk  || false,
        deliveryPudoLocker:    editItem.deliveryPudoLocker    || false,
        deliveryPostnetAramex: editItem.deliveryPostnetAramex || false,
        notes:                editItem.notes           || '',
      }
    : undefined

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 font-play">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Customer details — personal, address, club, business &amp; delivery
          </p>
        </div>
        <div className="flex items-center gap-2">
          {syncMsg && (
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${
              syncMsg.includes('Failed') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
            }`}>
              {syncMsg}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {syncing ? 'Syncing…' : '🔄 Sync Orders'}
          </button>
          <button
            onClick={handleExportCSV}
            disabled={contacts.length === 0}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            📥 Export CSV
          </button>
          <button
            onClick={() => { setEditItem(null); setShowModal(true) }}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors shadow-sm"
          >
            <span className="text-base font-bold">+</span>
            Add Customer
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Customers',    value: stats.total,    color: 'bg-gray-900',   icon: '👥' },
          { label: 'Website Signups',  value: stats.website,  color: 'bg-orange-500', icon: '🌐' },
          { label: 'From Book Now',    value: stats.bookNow,  color: 'bg-blue-600',   icon: '📋' },
          { label: 'Total Revenue',    value: `R${stats.revenue.toFixed(0)}`, color: 'bg-yellow-500', icon: '💰' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={`${s.color} text-white w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0`}>
              {s.icon}
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, phone, city, club or company…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <svg className="animate-spin h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading contacts…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">👥</p>
            <p className="font-semibold text-gray-700">
              {searchQuery ? 'No customers found' : 'No customers yet'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery
                ? 'Try a different search term'
                : 'Customers will appear here when they sign up, or click "Add Customer"'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col style={{ width: colW.name }} />
                <col style={{ width: colW.email }} />
                <col style={{ width: colW.address }} />
                <col style={{ width: colW.club }} />
                <col style={{ width: colW.company }} />
                <col style={{ width: colW.delivery }} />
                <col style={{ width: colW.orders }} />
                <col style={{ width: colW.spent }} />
                <col style={{ width: colW.source }} />
                <col style={{ width: 80 }} />
              </colgroup>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {(() => {
                    const SortTh = ({ col, label, align = 'left', className = '' }: { col: string; label: string; align?: 'left'|'right'|'center'; className?: string }) => {
                      const active = sortBy === col
                      return (
                        <th
                          style={{ position: 'relative' }}
                          className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none group whitespace-nowrap text-${align} ${active ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'} ${className}`}
                          onClick={() => { if (active) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(col); setSortDir('asc') } }}
                        >
                          <span className="inline-flex items-center gap-1">{label}
                            <span className={`transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>{active && sortDir === 'desc' ? '↑' : '↓'}</span>
                          </span>
                          <div onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); const startX = e.clientX; const startW = (e.currentTarget as HTMLElement).closest('th')?.offsetWidth ?? 100; const onMove = (ev: MouseEvent) => setWidth(col, Math.max(40, startW + ev.clientX - startX)); const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp) }} onClick={e => e.stopPropagation()} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/50 select-none z-10" />
                        </th>
                      )
                    }
                    return (
                      <>
                        <SortTh col="name" label="Name" />
                        <SortTh col="email" label="Contact" />
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{ position: 'relative' }}>Address<div onMouseDown={(e) => { e.preventDefault(); const startX = e.clientX; const startW = (e.currentTarget as HTMLElement).closest('th')?.offsetWidth ?? colW.address; const onMove = (ev: MouseEvent) => setWidth('address', Math.max(40, startW + ev.clientX - startX)); const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp) }} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/50 select-none z-10" /></th>
                        <SortTh col="club" label="Club" />
                        <SortTh col="company" label="Business" />
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{ position: 'relative' }}>Delivery<div onMouseDown={(e) => { e.preventDefault(); const startX = e.clientX; const startW = (e.currentTarget as HTMLElement).closest('th')?.offsetWidth ?? colW.delivery; const onMove = (ev: MouseEvent) => setWidth('delivery', Math.max(40, startW + ev.clientX - startX)); const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp) }} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/50 select-none z-10" /></th>
                        <SortTh col="orders" label="Orders" align="center" />
                        <SortTh col="spent" label="Spent" align="right" />
                        <SortTh col="source" label="Source" align="center" />
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                      </>
                    )
                  })()}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">

                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {c.firstName.charAt(0)}{c.lastName.charAt(0) || c.firstName.charAt(1) || ''}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{fullName(c)}</p>
                          {c.notes && (
                            <p className="text-xs text-gray-400 break-words">{c.notes}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="text-xs text-blue-600 hover:underline block">{c.email}</a>
                      )}
                      {c.phone && (
                        <a href={`tel:${c.phone}`} className="text-xs text-gray-600 hover:underline block">{c.phone}</a>
                      )}
                    </td>

                    {/* Address */}
                    <td className="px-4 py-3">
                      {c.addressCity || c.addressProvince ? (
                        <div>
                          {c.addressStreet && <p className="text-xs text-gray-500 break-words">{c.addressStreet}</p>}
                          <p className="text-xs text-gray-700 font-medium">
                            {[c.addressCity, c.addressProvince].filter(Boolean).join(', ')}
                          </p>
                          {c.addressPostalCode && <p className="text-xs text-gray-400">{c.addressPostalCode}</p>}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Club */}
                    <td className="px-4 py-3">
                      {c.clubName ? (
                        <div>
                          <p className="text-xs font-semibold text-indigo-700">🏁 {c.clubName}</p>
                          {c.clubMemberId && <p className="text-xs text-gray-400">{c.clubMemberId}</p>}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Business */}
                    <td className="px-4 py-3">
                      {c.companyName ? (
                        <div>
                          <p className="text-xs font-semibold text-emerald-700">🏢 {c.companyName}</p>
                          {c.companyVAT && <p className="text-xs text-gray-400">VAT: {c.companyVAT}</p>}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Delivery */}
                    <td className="px-4 py-3">
                      <DeliveryBadges c={c} />
                    </td>

                    {/* Orders */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-gray-700">{c.totalOrders}</span>
                    </td>

                    {/* Spent */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-bold text-gray-900">
                        R{(c.totalSpent||0).toFixed(2)}
                      </span>
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3 text-center">{sourceBadge(c.source)}</td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditItem(c); setShowModal(true) }}
                          title="Edit"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(c.id)}
                          title="Delete"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 bg-gray-50">
            Showing {filtered.length} of {contacts.length} customer{contacts.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <ContactModal
          initial={editFormData}
          onSave={editItem ? handleEdit : handleCreate}
          onClose={() => { setShowModal(false); setEditItem(null) }}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (() => {
        const c = contacts.find(x => x.id === deleteConfirm)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Delete Customer?</h3>
              {c && (
                <p className="text-sm text-gray-500 mb-1">
                  <strong>{fullName(c)}</strong>
                </p>
              )}
              <p className="text-sm text-gray-500 mb-6">
                This cannot be undone. All customer data will be permanently removed.
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
        )
      })()}
    </div>
  )
}
