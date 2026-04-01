'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface DropdownOption { value: string; label: string; color: string }
interface ShipmentOptions {
  statuses: DropdownOption[]
  instructions: DropdownOption[]
  couriers: DropdownOption[]
  boxSizes: DropdownOption[]
}
interface ShipmentRow {
  id: string
  account: string
  name: string
  invoiceNumber: string
  wixRef: string
  status: string
  instruction: string
  boxSize: string
  trackingNumber: string
  sendVia: string
  notes: string
  createdAt: string
  updatedAt: string
}

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  companyName?: string
  companyAddress?: string
  address?: string
  suburb?: string
  city?: string
  postalCode?: string
}

/* ─── Client Info Popup ──────────────────────────────────────────────────── */
function ClientInfoPopup({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ')
  const addressLines = [contact.address, contact.suburb, contact.city, contact.postalCode].filter(Boolean).join(', ')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div ref={ref} className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-80 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold">
              {(contact.firstName?.[0] ?? contact.lastName?.[0] ?? '?').toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm">{fullName || '—'}</p>
              {contact.companyName && <p className="text-xs text-gray-400">{contact.companyName}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {contact.email && (
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              <span className="text-sm text-gray-700 break-all">{contact.email}</span>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              <span className="text-sm text-gray-700">{contact.phone}</span>
            </div>
          )}
          {addressLines && (
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span className="text-sm text-gray-700">{addressLines}</span>
            </div>
          )}
          {contact.companyAddress && (
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              <span className="text-sm text-gray-700">{contact.companyAddress}</span>
            </div>
          )}
          {!contact.email && !contact.phone && !addressLines && !contact.companyAddress && (
            <p className="text-sm text-gray-400 italic">No contact details on file.</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Color maps ─────────────────────────────────────────────────────────── */
const COLOR_PILL: Record<string, string> = {
  yellow: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  green:  'bg-green-100 text-green-800 border border-green-200',
  red:    'bg-red-100 text-red-800 border border-red-200',
  blue:   'bg-blue-100 text-blue-800 border border-blue-200',
  orange: 'bg-orange-100 text-orange-800 border border-orange-200',
  indigo: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
  teal:   'bg-teal-100 text-teal-800 border border-teal-200',
  pink:   'bg-pink-100 text-pink-800 border border-pink-200',
  dark:   'bg-gray-800 text-white border border-gray-700',
  gray:   'bg-gray-100 text-gray-600 border border-gray-200',
}
const COLOR_DOT: Record<string, string> = {
  yellow: 'bg-yellow-400', green: 'bg-green-500', red: 'bg-red-500',
  blue: 'bg-blue-500', orange: 'bg-orange-400', indigo: 'bg-indigo-500',
  teal: 'bg-teal-500', pink: 'bg-pink-400', dark: 'bg-gray-800', gray: 'bg-gray-400',
}
const COLORS = ['yellow','green','red','blue','orange','indigo','teal','pink','dark','gray']

function pill(color: string) { return COLOR_PILL[color] ?? COLOR_PILL.gray }
function dot(color: string) { return COLOR_DOT[color] ?? COLOR_DOT.gray }

/* ─── Configurable Dropdown ──────────────────────────────────────────────── */
function ConfigurableDropdown({
  value,
  options,
  onSelect,
  onOptionsChange,
  placeholder = '—',
}: {
  value: string
  options: DropdownOption[]
  onSelect: (v: string) => void
  onOptionsChange: (opts: DropdownOption[]) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 })
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState('gray')
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const s = () => setOpen(false)
    document.addEventListener('mousedown', h)
    window.addEventListener('scroll', s, true)
    window.addEventListener('resize', s)
    return () => {
      document.removeEventListener('mousedown', h)
      window.removeEventListener('scroll', s, true)
      window.removeEventListener('resize', s)
    }
  }, [])

  const selected = options.find((o) => o.value === value)

  const addOption = () => {
    const label = newLabel.trim()
    if (!label) return
    const v = label.toLowerCase().replace(/\s+/g, '_')
    if (options.find((o) => o.value === v)) return
    onOptionsChange([...options, { value: v, label, color: newColor }])
    setNewLabel('')
    setNewColor('gray')
  }

  const deleteOption = (val: string) => {
    onOptionsChange(options.filter((o) => o.value !== val))
    if (value === val) onSelect('')
  }

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setDropPos({ top: r.bottom + 4, left: r.left })
    }
    setOpen((o) => !o)
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={`min-w-[90px] text-xs font-semibold px-2 py-1 rounded-lg text-left whitespace-nowrap ${
          selected ? pill(selected.color) : 'text-gray-400 bg-transparent'
        }`}
      >
        {selected ? selected.label : placeholder}
      </button>

      {open && (
        <div style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999 }} className="bg-white rounded-xl border border-gray-200 shadow-xl w-52 py-1">
          {/* Options list */}
          {options.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">No options yet</p>
          )}
          {options.map((opt) => (
            <div key={opt.value} className="flex items-center gap-1 px-2 py-1 hover:bg-gray-50 group">
              <button
                className="flex-1 text-left"
                onClick={() => { onSelect(opt.value); setOpen(false) }}
              >
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${pill(opt.color)}`}>
                  {opt.label}
                </span>
              </button>
              {value === opt.value && <span className="text-indigo-500 text-xs">&#10003;</span>}
              <button
                onClick={() => deleteOption(opt.value)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-0.5 rounded"
                title="Delete option"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}

          {/* Divider + Add new */}
          <div className="border-t border-gray-100 mt-1 pt-2 px-2 pb-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Add Option</p>
            <input
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1 mb-1.5 focus:outline-none focus:border-indigo-400"
              placeholder="Label…"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addOption()}
            />
            {/* Color picker */}
            <div className="flex flex-wrap gap-1 mb-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-4 h-4 rounded-full ${dot(c)} ${newColor === c ? 'ring-2 ring-offset-1 ring-indigo-500' : ''}`}
                  title={c}
                />
              ))}
            </div>
            <button
              onClick={addOption}
              disabled={!newLabel.trim()}
              className="w-full flex items-center justify-center gap-1 bg-indigo-600 text-white text-xs font-semibold px-2 py-1 rounded-lg hover:bg-indigo-700 disabled:opacity-40"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Inline text cell ───────────────────────────────────────────────────── */
function InlineCell({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(value)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => setLocal(value), [value])
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  const commit = () => { setEditing(false); if (local !== value) onChange(local) }

  if (editing) {
    return (
      <input
        ref={ref}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setLocal(value); setEditing(false) } }}
        className="w-full text-xs border border-indigo-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
        placeholder={placeholder}
      />
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`w-full text-left text-xs px-1.5 py-1 rounded hover:bg-gray-50 transition-colors ${value ? 'text-gray-800' : 'text-gray-300'}`}
    >
      {value || placeholder || '—'}
    </button>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function ShipmentLogPage() {
  const [rows, setRows] = useState<ShipmentRow[]>([])
  const [options, setOptions] = useState<ShipmentOptions>({
    statuses: [], instructions: [], couriers: [], boxSizes: [],
  })
  const [contacts, setContacts] = useState<Contact[]>([])
  const [clientPopup, setClientPopup] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const optSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* Load contacts once */
  useEffect(() => {
    fetch('/api/admin/contacts').then((r) => r.ok ? r.json() : []).then((data) => {
      setContacts(Array.isArray(data) ? data : [])
    }).catch(() => {})
  }, [])

  /* Load data */
  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/admin/shipment-log?month=${month}`).then((r) => r.json()),
      fetch('/api/admin/shipments/options').then((r) => r.json()),
    ]).then(([rowData, optData]) => {
      setRows(Array.isArray(rowData) ? rowData : [])
      if (optData && !optData.error) setOptions(optData)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [month])

  const openClientPopup = (name: string) => {
    if (!name.trim()) return
    const lower = name.trim().toLowerCase()
    const match = contacts.find((c) => {
      const full = `${c.firstName} ${c.lastName}`.toLowerCase()
      return full === lower || c.firstName.toLowerCase() === lower || c.lastName.toLowerCase() === lower
    })
    setClientPopup(match ?? { id: '', firstName: name, lastName: '', email: '', phone: '' })
  }

  /* Auto-save a row after 400ms */
  const saveRow = useCallback((row: ShipmentRow) => {
    if (saveTimers.current[row.id]) clearTimeout(saveTimers.current[row.id])
    saveTimers.current[row.id] = setTimeout(async () => {
      await fetch(`/api/admin/shipment-log/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
      })
    }, 400)
  }, [])

  /* Auto-save options after 500ms */
  const saveOptions = useCallback((opts: ShipmentOptions) => {
    if (optSaveTimer.current) clearTimeout(optSaveTimer.current)
    optSaveTimer.current = setTimeout(() => {
      fetch('/api/admin/shipments/options', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      })
    }, 500)
  }, [])

  const updateRow = (id: string, field: keyof ShipmentRow, value: string) => {
    setRows((prev) => {
      const next = prev.map((r) => r.id === id ? { ...r, [field]: value } : r)
      const updated = next.find((r) => r.id === id)!
      saveRow(updated)
      return next
    })
  }

  const updateOptions = (key: keyof ShipmentOptions, opts: DropdownOption[]) => {
    setOptions((prev) => {
      const next = { ...prev, [key]: opts }
      saveOptions(next)
      return next
    })
  }

  const addRow = async () => {
    const res = await fetch('/api/admin/shipment-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (res.ok) {
      const row = await res.json()
      setRows((prev) => [row, ...prev])
    }
  }

  const deleteRow = async (id: string) => {
    if (!confirm('Delete this shipment row?')) return
    setRows((prev) => prev.filter((r) => r.id !== id))
    await fetch(`/api/admin/shipment-log/${id}`, { method: 'DELETE' })
  }

  /* Month navigation */
  const changeMonth = (delta: number) => {
    const d = new Date(month + '-01')
    d.setMonth(d.getMonth() + delta)
    setMonth(d.toISOString().slice(0, 7))
  }
  const monthLabel = new Date(month + '-02').toLocaleString('en-ZA', { month: 'long', year: 'numeric' })

  /* Summary counts */
  const counts = {
    total: rows.length,
    sent: rows.filter((r) => r.status === 'sent' || r.instruction === 'shipped').length,
    hold: rows.filter((r) => r.instruction === 'hold').length,
    ready: rows.filter((r) => r.instruction === 'ready').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Shipment Log</h1>
            <p className="text-xs text-gray-500 mt-0.5">Local shipping — track packing, dispatch, and couriers</p>
          </div>

          {/* Month nav */}
          <div className="flex items-center gap-2">
            <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-semibold text-gray-700 min-w-[130px] text-center">{monthLabel}</span>
            <button onClick={() => changeMonth(1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          <button
            onClick={addRow}
            className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add Shipment
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-3">
          {[
            { label: 'Total', value: counts.total, cls: 'text-gray-700' },
            { label: 'Ready to Ship', value: counts.ready, cls: 'text-green-600' },
            { label: 'On Hold', value: counts.hold, cls: 'text-red-600' },
            { label: 'Sent', value: counts.sent, cls: 'text-blue-600' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className={`text-lg font-bold ${s.cls}`}>{s.value}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="p-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-white text-xs uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-10">#</th>
                  <th className="py-3 px-3 text-left min-w-[100px]">Name</th>
                  <th className="py-3 px-3 text-left min-w-[110px]">Invoice</th>
                  <th className="py-3 px-3 text-left min-w-[110px]">Status</th>
                  <th className="py-3 px-3 text-left min-w-[130px]">Instructions</th>
                  <th className="py-3 px-3 text-left w-24">Box Size</th>
                  <th className="py-3 px-3 text-left min-w-[130px]">Tracking Number</th>
                  <th className="py-3 px-3 text-left min-w-[120px]">Send Via</th>
                  <th className="py-3 px-3 text-left min-w-[140px]">Notes</th>
                  <th className="py-3 px-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="py-16 text-center text-gray-400 text-sm">Loading&hellip;</td></tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center">
                      <p className="text-gray-400 text-sm mb-3">No shipments for {monthLabel}</p>
                      <button onClick={addRow} className="text-indigo-600 text-sm font-semibold hover:underline">+ Add first shipment</button>
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={row.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                      <td className="py-2 px-3 text-center text-xs text-gray-400 font-mono">{rows.length - idx}</td>

                      <td className="py-2 px-2">
                        <button
                          onClick={() => openClientPopup(row.name)}
                          className={`w-full text-left text-xs px-1.5 py-1 rounded hover:bg-indigo-50 transition-colors ${row.name ? 'text-indigo-700 font-medium hover:underline' : 'text-gray-300'}`}
                        >
                          {row.name || 'Name'}
                        </button>
                      </td>
                      <td className="py-2 px-2">
                        <InlineCell value={row.invoiceNumber} onChange={(v) => updateRow(row.id, 'invoiceNumber', v)} placeholder="INV000…" />
                      </td>

                      <td className="py-2 px-2">
                        <ConfigurableDropdown
                          value={row.status}
                          options={options.statuses}
                          onSelect={(v) => updateRow(row.id, 'status', v)}
                          onOptionsChange={(opts) => updateOptions('statuses', opts)}
                          placeholder="Status"
                        />
                      </td>

                      <td className="py-2 px-2">
                        <ConfigurableDropdown
                          value={row.instruction}
                          options={options.instructions}
                          onSelect={(v) => updateRow(row.id, 'instruction', v)}
                          onOptionsChange={(opts) => updateOptions('instructions', opts)}
                          placeholder="Instructions"
                        />
                      </td>

                      <td className="py-2 px-2">
                        <ConfigurableDropdown
                          value={row.boxSize}
                          options={options.boxSizes}
                          onSelect={(v) => updateRow(row.id, 'boxSize', v)}
                          onOptionsChange={(opts) => updateOptions('boxSizes', opts)}
                          placeholder="Size"
                        />
                      </td>

                      <td className="py-2 px-2">
                        <InlineCell value={row.trackingNumber} onChange={(v) => updateRow(row.id, 'trackingNumber', v)} placeholder="Tracking #" />
                      </td>

                      <td className="py-2 px-2">
                        <ConfigurableDropdown
                          value={row.sendVia}
                          options={options.couriers}
                          onSelect={(v) => updateRow(row.id, 'sendVia', v)}
                          onOptionsChange={(opts) => updateOptions('couriers', opts)}
                          placeholder="Courier"
                        />
                      </td>

                      <td className="py-2 px-2">
                        <InlineCell value={row.notes} onChange={(v) => updateRow(row.id, 'notes', v)} placeholder="Notes" />
                      </td>

                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded"
                          title="Delete row"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Add row footer */}
          {rows.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-3">
              <button
                onClick={addRow}
                className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Add Row
              </button>
            </div>
          )}
        </div>

        <p className="text-[11px] text-gray-400 mt-3 text-center">
          Click any cell to edit &mdash; changes auto-save &mdash; click dropdown arrow to manage options
        </p>
      </div>

      {clientPopup && (
        <ClientInfoPopup contact={clientPopup} onClose={() => setClientPopup(null)} />
      )}
    </div>
  )
}
