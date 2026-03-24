'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ShipmentEntry } from '@/app/api/admin/shipments-register/route'

// ─── Contact / Invoice types ───────────────────────────────────────────────

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
}

interface InvoiceDoc {
  id: string
  docNumber: string
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function monthLabel(): string {
  return new Date().toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function rowBorderClass(row: ShipmentEntry): string {
  if (row.instructions === 'Ready to Ship') return 'border-l-4 border-l-green-500'
  if (row.instructions === 'Hold' || row.status === 'Hold') return 'border-l-4 border-l-red-500'
  return 'border-l-4 border-l-transparent'
}

function rowBgClass(row: ShipmentEntry): string {
  if (row.status === 'Packed') return 'bg-green-50'
  return 'bg-white'
}

function statusBadge(status: string): React.ReactNode {
  if (status === 'Packed') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Packed</span>
  if (status === 'Hold') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Hold</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">—</span>
}

function instructionsBg(instructions: string): string {
  if (instructions === 'Ready to Ship') return 'bg-green-500 text-white'
  if (instructions === 'Hold') return 'bg-red-500 text-white'
  return 'bg-gray-100 text-gray-700'
}

// ─── Autofill dropdown ─────────────────────────────────────────────────────

interface DropdownItem {
  label: string
  sublabel?: string
  onSelect: () => void
}

function AutofillDropdown({ items, anchorRef }: { items: DropdownItem[]; anchorRef: React.RefObject<HTMLDivElement | null> }) {
  if (items.length === 0) return null
  return (
    <div
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto min-w-[200px]"
      style={{ top: '100%', left: 0 }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onMouseDown={(e) => { e.preventDefault(); item.onSelect() }}
          className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm border-b border-gray-100 last:border-0"
        >
          <div className="font-medium text-gray-800">{item.label}</div>
          {item.sublabel && <div className="text-xs text-gray-500">{item.sublabel}</div>}
        </button>
      ))}
    </div>
  )
}

// ─── Cell components ───────────────────────────────────────────────────────

interface CellInputProps {
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  placeholder?: string
  className?: string
  style?: React.CSSProperties
}

function CellInput({ value, onChange, onBlur, placeholder, className = '', style }: CellInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className={`w-full px-1.5 py-1 text-xs border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded ${className}`}
      style={style}
    />
  )
}

interface CellSelectProps {
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  options: string[]
  className?: string
}

function CellSelect({ value, onChange, onBlur, options, className = '' }: CellSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      className={`w-full px-1 py-1 text-xs border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded cursor-pointer ${className}`}
    >
      {options.map((o) => (
        <option key={o} value={o}>{o === '' ? '—' : o}</option>
      ))}
    </select>
  )
}

// ─── Row component ─────────────────────────────────────────────────────────

interface RowProps {
  row: ShipmentEntry
  contacts: Contact[]
  invoices: InvoiceDoc[]
  onChange: (id: string, field: keyof ShipmentEntry, value: string) => void
  onBlur: (id: string) => void
  onDelete: (id: string) => void
}

function ShipmentRow({ row, contacts, invoices, onChange, onBlur, onDelete }: RowProps) {
  const [nameQuery, setNameQuery] = useState(row.clientName)
  const [invoiceQuery, setInvoiceQuery] = useState(row.invoiceRef)
  const [showNameDD, setShowNameDD] = useState(false)
  const [showInvoiceDD, setShowInvoiceDD] = useState(false)
  const nameDivRef = useRef<HTMLTableDataCellElement>(null)
  const invoiceDivRef = useRef<HTMLTableDataCellElement>(null)

  // Keep local state in sync when row changes from parent
  useEffect(() => { setNameQuery(row.clientName) }, [row.clientName])
  useEffect(() => { setInvoiceQuery(row.invoiceRef) }, [row.invoiceRef])

  const filteredContacts: DropdownItem[] = nameQuery.length >= 1
    ? contacts
        .filter((c) => {
          const full = `${c.firstName} ${c.lastName}`.toLowerCase()
          return full.includes(nameQuery.toLowerCase()) || c.phone?.includes(nameQuery)
        })
        .slice(0, 8)
        .map((c) => ({
          label: `${c.firstName} ${c.lastName}`,
          sublabel: c.phone || c.email,
          onSelect: () => {
            const fullName = `${c.firstName} ${c.lastName}`
            setNameQuery(fullName)
            setShowNameDD(false)
            onChange(row.id, 'clientName', fullName)
            onChange(row.id, 'clientEmail', c.email || '')
            onChange(row.id, 'clientPhone', c.phone || '')
            onBlur(row.id)
          },
        }))
    : []

  const filteredInvoices: DropdownItem[] = invoiceQuery.length >= 2
    ? invoices
        .filter((inv) => inv.docNumber?.toLowerCase().includes(invoiceQuery.toLowerCase()))
        .slice(0, 8)
        .map((inv) => ({
          label: inv.docNumber,
          sublabel: inv.clientName || inv.customerName || '',
          onSelect: () => {
            setInvoiceQuery(inv.docNumber)
            setShowInvoiceDD(false)
            onChange(row.id, 'invoiceRef', inv.docNumber)
            const name = inv.clientName || inv.customerName || ''
            const email = inv.clientEmail || inv.customerEmail || ''
            const phone = inv.clientPhone || inv.customerPhone || ''
            if (name) onChange(row.id, 'clientName', name)
            if (email) onChange(row.id, 'clientEmail', email)
            if (phone) onChange(row.id, 'clientPhone', phone)
            if (name) setNameQuery(name)
            onBlur(row.id)
          },
        }))
    : []

  return (
    <tr className={`${rowBgClass(row)} ${rowBorderClass(row)} hover:bg-opacity-80 transition-colors`}>
      {/* # */}
      <td className="px-1 py-1 text-center text-xs text-gray-500 font-mono w-10">{row.rowNum}</td>

      {/* Account */}
      <td className="px-0 py-0 w-20">
        <CellSelect
          value={row.account}
          onChange={(v) => onChange(row.id, 'account', v)}
          onBlur={() => onBlur(row.id)}
          options={['', 'Sage', 'Walk-in', 'Online', 'Other']}
        />
      </td>

      {/* Name — with contact autofill */}
      <td className="px-0 py-0 w-40 relative" ref={nameDivRef}>
        <div className="relative">
          <input
            type="text"
            value={nameQuery}
            onChange={(e) => {
              setNameQuery(e.target.value)
              onChange(row.id, 'clientName', e.target.value)
              setShowNameDD(true)
            }}
            onFocus={() => setShowNameDD(true)}
            onBlur={() => {
              setTimeout(() => setShowNameDD(false), 150)
              onBlur(row.id)
            }}
            placeholder="Client name"
            className="w-full px-1.5 py-1 text-xs border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded"
          />
          {showNameDD && filteredContacts.length > 0 && (
            <AutofillDropdown items={filteredContacts} anchorRef={nameDivRef} />
          )}
        </div>
      </td>

      {/* Invoice — with invoice autofill */}
      <td className="px-0 py-0 w-28 relative" ref={invoiceDivRef}>
        <div className="relative">
          <input
            type="text"
            value={invoiceQuery}
            onChange={(e) => {
              setInvoiceQuery(e.target.value)
              onChange(row.id, 'invoiceRef', e.target.value)
              setShowInvoiceDD(true)
            }}
            onFocus={() => setShowInvoiceDD(true)}
            onBlur={() => {
              setTimeout(() => setShowInvoiceDD(false), 150)
              onBlur(row.id)
            }}
            placeholder="INV…"
            className="w-full px-1.5 py-1 text-xs border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded"
          />
          {showInvoiceDD && filteredInvoices.length > 0 && (
            <AutofillDropdown items={filteredInvoices} anchorRef={invoiceDivRef} />
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-0 py-0 w-24">
        <div className="flex items-center gap-1 px-1">
          <select
            value={row.status}
            onChange={(e) => { onChange(row.id, 'status', e.target.value); onBlur(row.id) }}
            className="w-full px-1 py-0.5 text-xs border-0 bg-transparent focus:outline-none cursor-pointer"
          >
            {['', 'Packed', 'Hold'].map((o) => (
              <option key={o} value={o}>{o === '' ? '—' : o}</option>
            ))}
          </select>
          <span className="flex-shrink-0">{statusBadge(row.status)}</span>
        </div>
      </td>

      {/* Instructions */}
      <td className="px-0 py-0 w-36">
        <select
          value={row.instructions}
          onChange={(e) => { onChange(row.id, 'instructions', e.target.value); onBlur(row.id) }}
          className={`w-full px-1.5 py-1 text-xs border-0 focus:outline-none cursor-pointer rounded ${instructionsBg(row.instructions)}`}
        >
          {['', 'Ready to Ship', 'Hold', 'In Store', 'Card Payment', 'Awaiting Payment'].map((o) => (
            <option key={o} value={o}>{o === '' ? '—' : o}</option>
          ))}
        </select>
      </td>

      {/* Box Size */}
      <td className="px-0 py-0 w-28">
        <CellInput
          value={row.boxSize}
          onChange={(v) => onChange(row.id, 'boxSize', v)}
          onBlur={() => onBlur(row.id)}
          placeholder="OVB / Bag / dims"
        />
      </td>

      {/* Send Via */}
      <td className="px-0 py-0 w-28">
        <CellInput
          value={row.sendVia}
          onChange={(v) => onChange(row.id, 'sendVia', v)}
          onBlur={() => onBlur(row.id)}
          placeholder="Courier"
        />
      </td>

      {/* Tracking # */}
      <td className="px-0 py-0 w-32">
        <CellInput
          value={row.trackingNumber}
          onChange={(v) => onChange(row.id, 'trackingNumber', v)}
          onBlur={() => onBlur(row.id)}
          placeholder="Tracking #"
        />
      </td>

      {/* Notes */}
      <td className="px-0 py-0 w-36">
        <CellInput
          value={row.notes}
          onChange={(v) => onChange(row.id, 'notes', v)}
          onBlur={() => onBlur(row.id)}
          placeholder="Notes"
        />
      </td>

      {/* Delete */}
      <td className="px-1 py-0 w-10 text-center">
        <button
          onClick={() => onDelete(row.id)}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
          title="Delete row"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    </tr>
  )
}

// ─── Skeleton row ──────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="bg-white border-l-4 border-l-transparent animate-pulse">
      {[40, 80, 160, 110, 90, 150, 120, 110, 130, 150, 40].map((w, i) => (
        <td key={i} className="px-2 py-2">
          <div className="h-3 bg-gray-200 rounded" style={{ width: `${w * 0.6}px` }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Export CSV ───────────────────────────────────────────────────────────

function exportCSV(rows: ShipmentEntry[]) {
  const headers = ['#', 'Account', 'Name', 'Email', 'Phone', 'Invoice', 'Status', 'Instructions', 'Box Size', 'Send Via', 'Tracking #', 'Notes', 'Date']
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.rowNum, escape(r.account), escape(r.clientName), escape(r.clientEmail),
        escape(r.clientPhone), escape(r.invoiceRef), escape(r.status), escape(r.instructions),
        escape(r.boxSize), escape(r.sendVia), escape(r.trackingNumber), escape(r.notes), escape(r.date),
      ].join(',')
    ),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `shipments-register-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function ShipmentsRegisterPage() {
  const [rows, setRows] = useState<ShipmentEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [invoices, setInvoices] = useState<InvoiceDoc[]>([])
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Load data
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/shipments-register').then((r) => r.json()),
      fetch('/api/admin/contacts').then((r) => r.json()),
      fetch('/api/admin/orders/documents').then((r) => r.json()),
    ]).then(([shipments, contactsData, docsData]) => {
      setRows(Array.isArray(shipments) ? shipments : [])
      // contacts API may return { contacts: [] } or []
      const ctList = Array.isArray(contactsData) ? contactsData : (contactsData?.contacts ?? [])
      setContacts(ctList)
      // docs API may return { documents: [] } or []
      const docList = Array.isArray(docsData) ? docsData : (docsData?.documents ?? [])
      setInvoices(docList.filter((d: InvoiceDoc) => d.docNumber?.startsWith('INV')))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Update local state immediately
  const updateRow = useCallback((id: string, field: keyof ShipmentEntry, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    )
  }, [])

  // Debounced save on blur
  const saveRow = useCallback((id: string) => {
    const existing = saveTimers.current.get(id)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(async () => {
      setRows((current) => {
        const row = current.find((r) => r.id === id)
        if (!row) return current
        fetch(`/api/admin/shipments-register/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row),
        })
        return current
      })
    }, 600)
    saveTimers.current.set(id, timer)
  }, [])

  // Add new blank row
  const addRow = useCallback(async () => {
    const res = await fetch('/api/admin/shipments-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: todayISO() }),
    })
    if (res.ok) {
      const newRow: ShipmentEntry = await res.json()
      setRows((prev) => [newRow, ...prev])
    }
  }, [])

  // Delete row
  const deleteRow = useCallback(async (id: string) => {
    if (!confirm('Delete this row?')) return
    const res = await fetch(`/api/admin/shipments-register/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== id))
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 font-play">Shipments Register</h1>
            <p className="text-sm text-gray-500 font-play">{monthLabel()}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportCSV(rows)}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-play"
            >
              Export CSV
            </button>
            <button
              onClick={addRow}
              className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors font-play"
            >
              + Add Row
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" style={{ minWidth: '1100px' }}>
          {/* Sticky header */}
          <thead className="sticky top-[72px] z-20 bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-10">#</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">Account</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-40">Name</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">Invoice</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">Status</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-36">Instructions</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">Box Size</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">Send Via</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">Tracking #</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-36">Notes</th>
              <th className="px-1 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : rows.length === 0
              ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-gray-400 font-play">
                    No shipments yet. Click &quot;+ Add Row&quot; to get started.
                  </td>
                </tr>
              )
              : rows.map((row) => (
                <ShipmentRow
                  key={row.id}
                  row={row}
                  contacts={contacts}
                  invoices={invoices}
                  onChange={updateRow}
                  onBlur={saveRow}
                  onDelete={deleteRow}
                />
              ))}
          </tbody>
        </table>
      </div>

      {/* Bottom add row */}
      {!loading && (
        <div className="px-4 py-3 border-t border-gray-200 bg-white">
          <button
            onClick={addRow}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium font-play flex items-center gap-1"
          >
            <span className="text-lg leading-none">+</span> Add Row
          </button>
        </div>
      )}
    </div>
  )
}
