'use client'

import { useState, useEffect, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Courier {
  id: string
  name: string
  code: string
  contactName: string
  email: string
  phone: string
  trackingUrl: string
  notes: string
  isActive: boolean
}

const EMPTY_FORM: Omit<Courier, 'id'> = {
  name: '',
  code: '',
  contactName: '',
  email: '',
  phone: '',
  trackingUrl: '',
  notes: '',
  isActive: true,
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ShippingNetworkPage() {
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Courier, 'id'>>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const actionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setOpenActionId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/shipping-network')
      const data = await res.json()
      setCouriers(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(c: Courier) {
    setEditingId(c.id)
    setForm({
      name: c.name,
      code: c.code,
      contactName: c.contactName,
      email: c.email,
      phone: c.phone,
      trackingUrl: c.trackingUrl,
      notes: c.notes,
      isActive: c.isActive !== false,
    })
    setShowModal(true)
    setOpenActionId(null)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editingId) {
        await fetch(`/api/admin/shipping-network/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      } else {
        await fetch('/api/admin/shipping-network', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      setShowModal(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this courier? This cannot be undone.')) return
    setOpenActionId(null)
    await fetch(`/api/admin/shipping-network/${id}`, { method: 'DELETE' })
    await load()
  }

  const filtered = couriers.filter((c) => {
    const q = search.toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
  })

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipping Network</h1>
          <p className="text-sm text-gray-500 mt-0.5">{couriers.length} courier{couriers.length !== 1 ? 's' : ''} saved</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          + Add Courier
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, code or email…"
          className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            {search ? 'No couriers match your search.' : 'No couriers yet. Click "+ Add Courier" to get started.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tracking</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide sticky right-0 bg-gray-50 shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.07)]">Actions</th>
              </tr>
            </thead>
            <tbody ref={actionsRef}>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{c.name}</td>
                  <td className="py-3 px-4 font-mono text-xs text-gray-600">{c.code || '—'}</td>
                  <td className="py-3 px-4 text-gray-700">{c.contactName || '—'}</td>
                  <td className="py-3 px-4 text-gray-700">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="text-blue-600 hover:underline">{c.email}</a>
                    ) : '—'}
                  </td>
                  <td className="py-3 px-4 text-gray-700">{c.phone || '—'}</td>
                  <td className="py-3 px-4">
                    {c.trackingUrl ? (
                      <a href={c.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                        {c.trackingUrl.replace(/^https?:\/\//, '').split('/')[0]}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-xs break-words max-w-[160px]">{c.notes || '—'}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center sticky right-0 bg-white shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.07)]" style={{ zIndex: openActionId === c.id ? 9999 : undefined }}>
                    <div className="relative inline-block">
                      <button
                        onClick={() => setOpenActionId(openActionId === c.id ? null : c.id)}
                        className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1"
                      >
                        Actions
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openActionId === c.id && (
                        <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] py-1">
                          <button
                            onClick={() => openEdit(c)}
                            className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 w-full text-left"
                          >
                            ✏️ Edit
                          </button>
                          <div className="border-t border-gray-100 my-1" />
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 w-full text-left"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-base font-semibold text-gray-900">
                {editingId ? 'Edit Courier' : 'Add Courier'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. The Courier Guy"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="e.g. TCG"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                    placeholder="Account manager"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+27 11 123 4567"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="support@courier.co.za"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tracking URL</label>
                <input
                  type="url"
                  value={form.trackingUrl}
                  onChange={(e) => setForm((f) => ({ ...f, trackingUrl: e.target.value }))}
                  placeholder="https://tracking.courier.co.za"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Account number, rates, special instructions…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive !== false}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="h-4 w-4 accent-gray-900 cursor-pointer"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700 cursor-pointer">Active courier</label>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Courier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
