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
  isReseller?: boolean
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
  isReseller: false,
  fullAccess: false,
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

          {/* ── Reseller ──────────────────────────────────────── */}
          <div className="flex items-center gap-2 py-2 px-3 bg-purple-50 border border-purple-200 rounded-lg">
            <input
              type="checkbox"
              id="isReseller"
              checked={(form as any).isReseller || false}
              onChange={e => { const v = e.target.checked; setForm(f => ({ ...f, isReseller: v })) }}
              className="w-4 h-4 accent-purple-600"
            />
            <label htmlFor="isReseller" className="text-sm font-semibold text-purple-700 cursor-pointer">
              Reseller
            </label>
            <span className="text-xs text-purple-500">— wholesale / trade customer</span>
          </div>

          {/* ── Full Access ───────────────────────────────────── */}
          <div className="flex items-center gap-2 py-2 px-3 bg-amber-50 border border-amber-300 rounded-lg">
            <input
              type="checkbox"
              id="fullAccess"
              checked={(form as any).fullAccess || false}
              onChange={e => { const v = e.target.checked; setForm(f => ({ ...f, fullAccess: v })) }}
              className="w-4 h-4 accent-amber-600"
            />
            <label htmlFor="fullAccess" className="text-sm font-semibold text-amber-700 cursor-pointer">
              Full Access
            </label>
            <span className="text-xs text-amber-600">— full customer account access</span>
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

// ─── Client Profile Drawer ────────────────────────────────────────────────────

function ClientProfileDrawer({
  contact,
  onClose,
  onEdit,
}: {
  contact: Contact
  onClose: () => void
  onEdit: () => void
}) {
  const [backorders, setBackorders] = useState<any[]>([])
  const [boLoading, setBoLoading] = useState(true)
  const name = fullName(contact)

  useEffect(() => {
    fetch('/api/admin/backorders')
      .then(r => r.ok ? r.json() : [])
      .then((all: any[]) => {
        setBackorders(all.filter(b => b.clientName?.toLowerCase() === name.toLowerCase()))
      })
      .catch(() => {})
      .finally(() => setBoLoading(false))
  }, [contact.id, name])

  const deliveries = [
    { key: 'deliveryDoorToDoor'    as const, icon: '🚪', label: 'Door to Door' },
    { key: 'deliveryKioskToKiosk'  as const, icon: '📦', label: 'Kiosk to Kiosk' },
    { key: 'deliveryPudoLocker'    as const, icon: '🔒', label: 'Pudo Locker' },
    { key: 'deliveryPostnetAramex' as const, icon: '📮', label: 'Postnet (Aramex)' },
  ]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {contact.firstName.charAt(0)}{contact.lastName.charAt(0) || ''}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{name}</h2>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                {sourceBadge(contact.source)}
                {contact.isReseller && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700">Reseller</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="text-xs px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700 font-semibold">Edit</button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full text-xl">×</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Contact info */}
          <div>
            <SectionHeader icon="📞" title="Contact" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {contact.email && <div><span className="text-xs text-gray-400 block">Email</span><a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">{contact.email}</a></div>}
              {contact.phone && <div><span className="text-xs text-gray-400 block">Phone</span><a href={`tel:${contact.phone}`} className="text-gray-700">{contact.phone}</a></div>}
              {contact.mobile && <div><span className="text-xs text-gray-400 block">Mobile</span><a href={`tel:${contact.mobile}`} className="text-gray-700">{contact.mobile}</a></div>}
            </div>
          </div>

          {/* Address */}
          {(contact.addressStreet || contact.addressCity || contact.addressProvince) && (
            <div>
              <SectionHeader icon="📍" title="Address" />
              <p className="text-sm text-gray-700 leading-relaxed">
                {[contact.addressStreet, contact.addressCity, contact.addressProvince, contact.addressPostalCode, contact.addressCountry].filter(Boolean).join(', ')}
              </p>
            </div>
          )}

          {/* Club */}
          {contact.clubName && (
            <div>
              <SectionHeader icon="🏁" title="Club" />
              <p className="text-sm font-semibold text-indigo-700">{contact.clubName}</p>
              {contact.clubMemberId && <p className="text-xs text-gray-400 mt-0.5">Member ID: {contact.clubMemberId}</p>}
            </div>
          )}

          {/* Business */}
          {contact.companyName && (
            <div>
              <SectionHeader icon="🏢" title="Business" />
              <p className="text-sm font-semibold text-emerald-700">{contact.companyName}</p>
              {contact.companyVAT && <p className="text-xs text-gray-400 mt-0.5">VAT: {contact.companyVAT}</p>}
              {contact.companyAddress && <p className="text-xs text-gray-500 mt-0.5">{contact.companyAddress}</p>}
            </div>
          )}

          {/* Delivery */}
          {deliveries.some(d => contact[d.key]) && (
            <div>
              <SectionHeader icon="🚚" title="Delivery Options" />
              <div className="flex flex-wrap gap-1.5">
                {deliveries.filter(d => contact[d.key]).map(d => (
                  <span key={d.key} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{d.icon} {d.label}</span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <div>
              <SectionHeader icon="📝" title="Notes" />
              <p className="text-sm text-gray-600 whitespace-pre-line">{contact.notes}</p>
            </div>
          )}

          {/* Orders summary */}
          {(contact.totalOrders > 0 || contact.totalSpent > 0) && (
            <div>
              <SectionHeader icon="💰" title="Order History" />
              <div className="flex gap-4 text-sm">
                <div><span className="text-xs text-gray-400 block">Total Orders</span><span className="font-bold text-gray-900">{contact.totalOrders}</span></div>
                <div><span className="text-xs text-gray-400 block">Total Spent</span><span className="font-bold text-gray-900">R{(contact.totalSpent || 0).toFixed(2)}</span></div>
              </div>
            </div>
          )}

          {/* Backorders */}
          <div>
            <SectionHeader icon="📋" title="Backorders" subtitle="Active backorders for this customer" />
            {boLoading ? (
              <p className="text-xs text-gray-400">Loading backorders…</p>
            ) : backorders.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No backorders for this customer.</p>
            ) : (
              <div className="space-y-2">
                {backorders.map(b => (
                  <div key={b.id} className="flex gap-3 bg-indigo-50 rounded-xl p-3 items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">{b.description}</p>
                      {b.sku && <p className="text-[10px] text-gray-500 font-mono">{b.sku}</p>}
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">Qty: {b.qty}</span>
                        {b.price > 0 && <span className="text-[10px] text-gray-500">R{(b.price * b.qty).toFixed(2)}</span>}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${b.status === 'active' ? 'bg-blue-100 text-blue-700' : b.status === 'complete' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{b.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}

// ─── Customer Dashboard Modal ─────────────────────────────────────────────────

const fmt = (n: number) => `R ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`
const fmtD = (iso: string) => new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
const DATE_PRESETS = [
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'This year',    days: -1 },
  { label: 'All time',     days: 0 },
]
function presetDates(days: number) {
  const to = new Date().toISOString().slice(0, 10)
  if (days === 0) return { from: '', to: '' }
  if (days === -1) return { from: `${new Date().getFullYear()}-01-01`, to }
  return { from: new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10), to }
}

function CustomerDashboardModal({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const [fullScreen, setFullScreen] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [data, setData] = useState<any>(null)
  const [backorders, setBackorders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'info' | 'invoices' | 'items' | 'outstanding' | 'credits' | 'backorders'>('info')

  const name = fullName(contact)

  const loadData = useCallback(async (from: string, to: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ client: name })
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const [dashRes, boRes] = await Promise.all([
        fetch(`/api/admin/customer-dashboard?${params}`),
        fetch('/api/admin/backorders'),
      ])
      if (dashRes.ok) setData(await dashRes.json())
      if (boRes.ok) {
        const allBo: any[] = await boRes.json()
        setBackorders(allBo.filter(b => b.clientName?.toLowerCase() === name.toLowerCase()))
      }
    } finally { setLoading(false) }
  }, [name])

  useEffect(() => { loadData('', '') }, [loadData])

  function applyDates(from: string, to: string) {
    setDateFrom(from); setDateTo(to); loadData(from, to)
  }

  const invoices = data ? (data.documents || []).filter((d: any) => d.type === 'invoice') : []
  const allDocs  = data ? (data.documents || []) : []
  const unpaidInv = invoices.filter((d: any) => d.status !== 'paid' && d.status !== 'archived' && d.status !== 'cancelled')
  const totalInvoiced    = invoices.reduce((s: number, d: any) => s + d._total, 0)
  const totalPaid        = invoices.reduce((s: number, d: any) => s + (d.amountPaid || 0), 0)
  const totalOutstanding = unpaidInv.reduce((s: number, d: any) => s + (d._total - (d.amountPaid || 0)), 0)
  const creditBalance    = data?.credit?.balance ?? 0

  const itemsMap: Record<string, any> = {}
  invoices.forEach((d: any) => {
    (d.lineItems || []).forEach((li: any) => {
      const k = li.sku || li.description; if (!k) return
      if (!itemsMap[k]) itemsMap[k] = { sku: li.sku, description: li.description, totalQty: 0, totalSpent: 0 }
      itemsMap[k].totalQty += li.qty || 0
      itemsMap[k].totalSpent += (li.qty || 0) * (li.unitPrice || 0)
    })
  })
  const itemsList = Object.values(itemsMap).sort((a: any, b: any) => b.totalSpent - a.totalSpent)

  function downloadStatement() {
    const dateRange = dateFrom || dateTo ? `${dateFrom || '—'} to ${dateTo || '—'}` : 'All time'
    const invRows = invoices.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((d: any, i: number) => {
        const bal = d._total - (d.amountPaid || 0)
        return `<tr><td>${i+1}</td><td>${fmtD(d.createdAt)}</td><td>${d.docNumber}</td>
          <td style="text-align:right">${fmt(d._total)}</td>
          <td style="text-align:right">${fmt(d.amountPaid||0)}</td>
          <td style="text-align:right;color:${bal>0?'#dc2626':'#16a34a'}">${fmt(Math.max(0,bal))}</td>
          <td>${d.status}</td></tr>`
      }).join('')
    const itRows = itemsList.map((it: any, i: number) =>
      `<tr><td>${i+1}</td><td>${it.sku||'—'}</td><td>${it.description}</td>
       <td style="text-align:center">${it.totalQty}</td><td style="text-align:right">${fmt(it.totalSpent)}</td></tr>`
    ).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Statement – ${name}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;padding:16mm;font-size:13px}
    h1{font-size:22px;font-weight:800}h2{font-size:13px;font-weight:700;margin:18px 0 6px;text-transform:uppercase;letter-spacing:.05em;color:#374151}
    .meta{color:#6b7280;font-size:12px;margin-top:4px}
    .cards{display:flex;gap:12px;margin:14px 0}.card{flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px}
    .cl{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em}.cv{font-size:17px;font-weight:800;margin-top:3px}
    table{width:100%;border-collapse:collapse;margin-top:6px}
    th{background:#f3f4f6;padding:6px 9px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase}
    td{padding:6px 9px;border-bottom:1px solid #f3f4f6;font-size:12px}@page{size:A4;margin:0}</style>
    </head><body>
    <h1>Customer Statement</h1>
    <p class="meta">${name}${contact.email?` · ${contact.email}`:''}${contact.phone?` · ${contact.phone}`:''}</p>
    <p class="meta">Period: ${dateRange} · Generated: ${new Date().toLocaleDateString('en-ZA')}</p>
    <div class="cards">
      <div class="card"><div class="cl">Total Invoiced</div><div class="cv">${fmt(totalInvoiced)}</div></div>
      <div class="card"><div class="cl">Total Paid</div><div class="cv" style="color:#16a34a">${fmt(totalPaid)}</div></div>
      <div class="card"><div class="cl">Outstanding</div><div class="cv" style="color:${totalOutstanding>0?'#dc2626':'#374151'}">${fmt(totalOutstanding)}</div></div>
      <div class="card"><div class="cl">Credits</div><div class="cv" style="color:#2563eb">${fmt(creditBalance)}</div></div>
    </div>
    <h2>Invoice History</h2>
    <table><thead><tr><th>#</th><th>Date</th><th>Invoice #</th><th style="text-align:right">Total</th><th style="text-align:right">Paid</th><th style="text-align:right">Balance</th><th>Status</th></tr></thead>
    <tbody>${invRows||'<tr><td colspan="7" style="color:#9ca3af;text-align:center">No invoices</td></tr>'}</tbody></table>
    <h2>Items Purchased</h2>
    <table><thead><tr><th>#</th><th>SKU</th><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Spent</th></tr></thead>
    <tbody>${itRows||'<tr><td colspan="5" style="color:#9ca3af;text-align:center">No items</td></tr>'}</tbody></table>
    </body></html>`
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 350) }
  }

  function downloadInvoice(doc: any) {
    const rows = (doc.lineItems || []).map((li: any, i: number) =>
      `<tr><td>${i+1}</td><td style="font-family:monospace">${li.sku||'—'}</td><td>${li.description}</td>
       <td style="text-align:center">${li.qty}</td><td style="text-align:right">${fmt(li.unitPrice)}</td>
       <td style="text-align:right;font-weight:700">${fmt(li.qty*li.unitPrice)}</td></tr>`
    ).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${doc.docNumber}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;padding:20mm;font-size:13px}
    .hdr{display:flex;justify-content:space-between;margin-bottom:24px}
    .title{font-size:28px;font-weight:800}.meta{font-size:12px;color:#6b7280;margin-top:3px}
    .boxes{display:flex;gap:24px;margin-bottom:24px}
    .box{flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px}
    .bl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-bottom:5px}
    table{width:100%;border-collapse:collapse}thead tr{border-bottom:2px solid #111}
    th{padding:8px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280}
    th.r{text-align:right}td{padding:8px 10px;border-bottom:1px solid #f3f4f6;font-size:13px}
    tfoot tr{border-top:2px solid #111}@page{size:A4;margin:0}</style>
    </head><body>
    <div class="hdr"><div><p class="title">INVOICE</p><p class="meta">${doc.docNumber}</p><p class="meta">Date: ${fmtD(doc.createdAt)}</p></div></div>
    <div class="boxes">
      <div class="box"><p class="bl">Billed To</p><p style="font-weight:700">${doc.clientName}</p></div>
      <div class="box"><p class="bl">Invoice Total</p><p style="font-size:20px;font-weight:800">${fmt(doc._total)}</p><p style="font-size:11px;color:#9ca3af">Status: ${doc.status}</p></div>
    </div>
    <table><thead><tr><th style="width:32px">#</th><th>SKU</th><th>Description</th><th class="r" style="width:55px">Qty</th><th class="r" style="width:110px">Unit Price</th><th class="r" style="width:110px">Total</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="5" style="text-align:right;color:#6b7280;padding-right:10px">Total</td><td style="text-align:right;font-size:15px;font-weight:800">${fmt(doc._total)}</td></tr></tfoot>
    </table></body></html>`
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 350) }
  }

  const TABS = [
    { key: 'info',        label: 'Customer Info' },
    { key: 'invoices',    label: `Invoices (${invoices.length})` },
    { key: 'items',       label: `Items (${itemsList.length})` },
    { key: 'outstanding', label: `Outstanding (${unpaidInv.length})` },
    { key: 'credits',     label: 'Credits' },
    { key: 'backorders',  label: `Backorders (${backorders.length})` },
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`bg-white flex flex-col ${fullScreen ? 'w-full h-full rounded-none' : 'rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh]'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {contact.firstName.charAt(0)}{contact.lastName.charAt(0) || ''}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{name}</h2>
              <p className="text-xs text-gray-400">{contact.email}{contact.phone ? ` · ${contact.phone}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <button onClick={downloadStatement} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Download Statement
              </button>
            )}
            <button onClick={() => setFullScreen(f => !f)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100" title={fullScreen ? 'Restore' : 'Fullscreen'}>
              {fullScreen
                ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" /></svg>
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
              }
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 text-lg leading-none">✕</button>
          </div>
        </div>

        {/* Date range */}
        <div className="flex items-center gap-3 px-6 py-2.5 border-b border-gray-100 bg-gray-50 flex-shrink-0 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Period:</span>
          <input type="date" value={dateFrom} onChange={e => applyDates(e.target.value, dateTo)} className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={dateTo} onChange={e => applyDates(dateFrom, e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
          {DATE_PRESETS.map(p => (
            <button key={p.label} onClick={() => { const d = presetDates(p.days); applyDates(d.from, d.to) }}
              className="px-2.5 py-1 text-xs border border-gray-200 rounded-lg hover:bg-white text-gray-600 hover:border-gray-300">
              {p.label}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        {data && (
          <div className="grid grid-cols-4 gap-3 px-6 py-3 border-b border-gray-100 flex-shrink-0">
            {[
              { label: 'Total Invoiced', value: fmt(totalInvoiced), color: 'text-gray-900' },
              { label: 'Total Paid',     value: fmt(totalPaid),     color: 'text-green-700' },
              { label: 'Outstanding',    value: fmt(totalOutstanding), color: totalOutstanding > 0 ? 'text-red-600' : 'text-gray-400' },
              { label: 'Store Credits',  value: fmt(creditBalance),  color: 'text-blue-700' },
            ].map(c => (
              <div key={c.label} className="bg-gray-50 rounded-xl px-4 py-2.5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{c.label}</p>
                <p className={`text-base font-bold mt-0.5 ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key as any)}
              className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${activeTab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
              Loading…
            </div>
          )}

          {/* Customer Info */}
          {!loading && activeTab === 'info' && (
            <div className="p-6 grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Contact</p>
                  {contact.email && <p className="text-sm text-blue-600">{contact.email}</p>}
                  {contact.phone && <p className="text-sm text-gray-700">{contact.phone}</p>}
                  {contact.mobile && <p className="text-sm text-gray-500">{contact.mobile}</p>}
                </div>
                <div><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Address</p>
                  {contact.addressStreet && <p className="text-sm text-gray-700">{contact.addressStreet}</p>}
                  <p className="text-sm text-gray-700">{[contact.addressCity, contact.addressProvince, contact.addressPostalCode].filter(Boolean).join(', ')}</p>
                  {contact.addressCountry && <p className="text-sm text-gray-500">{contact.addressCountry}</p>}
                </div>
                {contact.clubName && (
                  <div><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Club</p>
                    <p className="text-sm font-semibold text-indigo-700">🏁 {contact.clubName}</p>
                    {contact.clubMemberId && <p className="text-xs text-gray-400">Member ID: {contact.clubMemberId}</p>}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {contact.companyName && (
                  <div><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Business</p>
                    <p className="text-sm font-semibold text-emerald-700">🏢 {contact.companyName}</p>
                    {contact.companyVAT && <p className="text-xs text-gray-400">VAT: {contact.companyVAT}</p>}
                    {contact.companyAddress && <p className="text-xs text-gray-500 mt-1">{contact.companyAddress}</p>}
                  </div>
                )}
                <div><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Delivery Preferences</p>
                  <DeliveryBadges c={contact} />
                </div>
                {contact.notes && (
                  <div><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Notes</p>
                    <p className="text-sm text-gray-600">{contact.notes}</p>
                  </div>
                )}
                <div><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Stats</p>
                  <p className="text-sm text-gray-700">Total Orders: <strong>{contact.totalOrders}</strong></p>
                  <p className="text-sm text-gray-700">Total Spent: <strong>{fmt(contact.totalSpent || 0)}</strong></p>
                </div>
              </div>
            </div>
          )}

          {/* Invoices */}
          {!loading && activeTab === 'invoices' && (
            invoices.length === 0
              ? <p className="text-center py-12 text-gray-400 text-sm">No invoices found</p>
              : <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Paid</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Balance</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...invoices].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((d: any) => {
                      const bal = d._total - (d.amountPaid || 0)
                      return (
                        <tr key={d.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-600 text-xs">{fmtD(d.createdAt)}</td>
                          <td className="px-4 py-2.5 font-mono text-xs font-semibold text-blue-700">{d.docNumber}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-gray-900 text-xs">{fmt(d._total)}</td>
                          <td className="px-4 py-2.5 text-right text-green-700 text-xs">{fmt(d.amountPaid || 0)}</td>
                          <td className={`px-4 py-2.5 text-right font-semibold text-xs ${bal > 0.005 ? 'text-red-600' : 'text-gray-400'}`}>{fmt(Math.max(0, bal))}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${d.status==='paid'?'bg-green-100 text-green-700':d.status==='archived'?'bg-gray-100 text-gray-500':'bg-yellow-100 text-yellow-700'}`}>{d.status}</span>
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <button onClick={() => downloadInvoice(d)} className="p-1 text-gray-400 hover:text-gray-700" title="Download Invoice">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
          )}

          {/* Items */}
          {!loading && activeTab === 'items' && (
            itemsList.length === 0
              ? <p className="text-center py-12 text-gray-400 text-sm">No items found</p>
              : <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itemsList.map((it: any) => (
                      <tr key={it.sku || it.description} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-mono text-xs font-semibold text-blue-700">{it.sku || '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-700">{it.description}</td>
                        <td className="px-4 py-2.5 text-center font-semibold text-gray-900 text-xs">{it.totalQty}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-900 text-xs">{fmt(it.totalSpent)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={2} className="px-4 py-2.5 text-xs font-semibold text-gray-500 text-right uppercase">Total</td>
                      <td className="px-4 py-2.5 text-center font-bold text-gray-900 text-xs">{itemsList.reduce((s: number, it: any) => s + it.totalQty, 0)}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-900 text-xs">{fmt(itemsList.reduce((s: number, it: any) => s + it.totalSpent, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
          )}

          {/* Outstanding */}
          {!loading && activeTab === 'outstanding' && (
            unpaidInv.length === 0
              ? <p className="text-center py-12 text-gray-400 text-sm">No outstanding invoices</p>
              : <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Paid</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Balance Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...unpaidInv].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((d: any) => (
                      <tr key={d.id} className="hover:bg-red-50/30">
                        <td className="px-4 py-2.5 text-gray-600 text-xs">{fmtD(d.createdAt)}</td>
                        <td className="px-4 py-2.5 font-mono text-xs font-semibold text-blue-700">{d.docNumber}</td>
                        <td className="px-4 py-2.5 text-right text-gray-900 text-xs">{fmt(d._total)}</td>
                        <td className="px-4 py-2.5 text-right text-green-700 text-xs">{fmt(d.amountPaid || 0)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-red-600 text-xs">{fmt(Math.max(0, d._total - (d.amountPaid || 0)))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-red-50 border-t-2 border-red-200">
                    <tr>
                      <td colSpan={4} className="px-4 py-2.5 text-right text-xs font-semibold text-red-500 uppercase">Total Outstanding</td>
                      <td className="px-4 py-2.5 text-right font-bold text-red-600 text-xs">{fmt(totalOutstanding)}</td>
                    </tr>
                  </tfoot>
                </table>
          )}

          {/* Credits */}
          {!loading && activeTab === 'credits' && data && (
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-700">Credit Balance</p>
                <p className="text-2xl font-bold text-blue-700">{fmt(creditBalance)}</p>
              </div>
              {(data.credit?.transactions || []).length === 0
                ? <p className="text-center py-8 text-gray-400 text-sm">No credit transactions</p>
                : <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Invoice</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[...data.credit.transactions].reverse().map((txn: any) => (
                        <tr key={txn.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-600 text-xs">{fmtD(txn.date)}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${txn.type==='overpayment'?'bg-blue-100 text-blue-700':txn.type==='credit_applied'?'bg-green-100 text-green-700':'bg-orange-100 text-orange-700'}`}>{txn.type.replace('_',' ')}</span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-blue-700">{txn.invoiceNumber}</td>
                          <td className={`px-4 py-2.5 text-right font-semibold text-xs ${txn.amount>=0?'text-blue-700':'text-green-700'}`}>{txn.amount>=0?'+':''}{fmt(Math.abs(txn.amount))}</td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">{txn.notes||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              }
            </div>
          )}

          {/* Backorders */}
          {!loading && activeTab === 'backorders' && (
            backorders.length === 0
              ? <p className="text-center py-12 text-gray-400 text-sm">No backorders for this customer</p>
              : <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Price</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {backorders.map((b: any) => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-600 text-xs">{fmtD(b.createdAt)}</td>
                        <td className="px-4 py-2.5 font-mono text-xs font-semibold text-blue-700">{b.sku || '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-700">{b.description}</td>
                        <td className="px-4 py-2.5 text-center font-semibold text-xs">{b.qty}</td>
                        <td className="px-4 py-2.5 text-right text-xs font-semibold">{fmt(b.price * b.qty)}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${b.status==='active'?'bg-blue-100 text-blue-700':b.status==='complete'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{b.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          )}
        </div>
      </div>
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
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [syncing, setSyncing]         = useState(false)
  const [syncMsg, setSyncMsg]         = useState('')
  const [dashboardContact, setDashboardContact] = useState<Contact | null>(null)
  const [resetContact, setResetContact] = useState<Contact | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetLink, setResetLink] = useState('')
  const [resetLinkCopied, setResetLinkCopied] = useState(false)
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

  // ── Reset password ────────────────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (!resetContact || !resetPassword.trim()) return
    setResetting(true)
    setResetMsg('')
    try {
      const res = await fetch('/api/admin/customer-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetContact.email, password: resetPassword, resetIfExists: true }),
      })
      const data = await res.json()
      if (res.ok) {
        setResetMsg(data.action === 'created' ? 'Account created & password set ✓' : 'Password reset successfully ✓')
        setResetPassword('')
      } else {
        setResetMsg(data.error || 'Failed')
      }
    } catch { setResetMsg('Error — try again') }
    finally { setResetting(false) }
  }

  const handleGenerateResetLink = async () => {
    if (!resetContact) return
    setResetLink('')
    setResetLinkCopied(false)
    try {
      const res = await fetch('/api/admin/reset-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetContact.email }),
      })
      const data = await res.json()
      if (data.resetLink) {
        setResetLink(data.resetLink)
        await navigator.clipboard.writeText(data.resetLink)
        setResetLinkCopied(true)
      }
    } catch { setResetMsg('Failed to generate link') }
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
        isReseller:           editItem.isReseller       || false,
        fullAccess:           (editItem as any).fullAccess || false,
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
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedContact(c)} onDoubleClick={() => setDashboardContact(c)}>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {c.firstName.charAt(0)}{c.lastName.charAt(0) || c.firstName.charAt(1) || ''}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">{fullName(c)}</p>
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
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {sourceBadge(c.source)}
                        {c.isReseller && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700">Reseller</span>}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditItem(c); setShowModal(true) }}
                          title="Edit"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => { setResetContact(c); setResetPassword(''); setResetMsg('') }}
                          title="Reset Password"
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          🔑
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

      {/* Client Profile Drawer */}
      {selectedContact && (
        <ClientProfileDrawer
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onEdit={() => { setEditItem(selectedContact); setShowModal(true); setSelectedContact(null) }}
        />
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <ContactModal
          initial={editFormData}
          onSave={editItem ? handleEdit : handleCreate}
          onClose={() => { setShowModal(false); setEditItem(null) }}
        />
      )}

      {/* Customer Dashboard Modal */}
      {dashboardContact && (
        <CustomerDashboardModal
          contact={dashboardContact}
          onClose={() => setDashboardContact(null)}
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

      {/* Reset Password Modal */}
      {resetContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Reset Password</h3>
            <p className="text-sm text-gray-500 mb-4">
              Set a new login password for <strong>{fullName(resetContact)}</strong> ({resetContact.email})
            </p>
            <div className="relative mb-3">
              <input
                type="text"
                value={resetPassword}
                onChange={e => setResetPassword(e.target.value)}
                placeholder="New password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
              />
            </div>
            {resetMsg && (
              <p className={`text-sm mb-3 ${resetMsg.includes('✓') ? 'text-green-600' : 'text-red-500'}`}>{resetMsg}</p>
            )}
            <div className="flex gap-3 mb-4">
              <button
                onClick={handleResetPassword}
                disabled={resetting || !resetPassword.trim()}
                className="flex-1 bg-amber-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {resetting ? 'Saving…' : 'Set Password'}
              </button>
              <button
                onClick={() => { setResetContact(null); setResetMsg(''); setResetLink(''); setResetLinkCopied(false) }}
                className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>

            {/* Generate reset link for WhatsApp */}
            <div className="border-t pt-4">
              <p className="text-xs text-gray-500 mb-2">Or send a self-service reset link via WhatsApp:</p>
              <button
                onClick={handleGenerateResetLink}
                className="w-full bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                🔗 Generate &amp; Copy Reset Link
              </button>
              {resetLink && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                  <p className="text-xs text-green-600 font-semibold mb-1">
                    {resetLinkCopied ? '✓ Copied to clipboard!' : 'Reset link:'}
                  </p>
                  <p className="text-xs text-gray-600 break-all font-mono">{resetLink}</p>
                  <p className="text-xs text-gray-400 mt-1">Valid for 1 hour. Paste into WhatsApp and send to customer.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
