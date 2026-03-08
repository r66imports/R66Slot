'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Backorder } from '@/app/api/admin/backorders/route'

// ─── Types ────────────────────────────────────────────────────────────────────

type DocType = 'quote' | 'salesorder' | 'invoice'
type Tab = 'quotes' | 'salesorders' | 'invoices'

interface LineItem {
  id: string
  description: string
  qty: number
  unitPrice: number
}

interface OrderDocument {
  id: string
  type: DocType
  docNumber: string
  date: string
  clientName: string
  clientEmail: string
  clientPhone: string
  clientAddress: string
  lineItems: LineItem[]
  notes: string
  terms: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  pushedToSage: boolean
  createdAt: string
  updatedAt: string
}

interface OrderTemplate {
  companyName: string
  companyAddress: string
  companyVAT: string
  companyPhone: string
  companyEmail: string
  logoUrl: string
  bankName: string
  bankAccount: string
  bankBranch: string
  bankType: string
  quoteTerms: string
  salesOrderTerms: string
  invoiceTerms: string
  footerText: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_TEMPLATE: OrderTemplate = {
  companyName: 'R66 Slot',
  companyAddress: '',
  companyVAT: '',
  companyPhone: '',
  companyEmail: '',
  logoUrl: '',
  bankName: '',
  bankAccount: '',
  bankBranch: '',
  bankType: 'Current',
  quoteTerms: 'This quote is valid for 30 days from the date of issue.',
  salesOrderTerms: 'Payment is required before the order can be processed.',
  invoiceTerms: 'Payment due within 30 days of invoice date.',
  footerText: '',
}

function formatDate(iso: string) {
  return new Date(iso)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
    .toUpperCase()
}

function formatPrice(n: number) {
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function newLine(): LineItem {
  return { id: `li_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, description: '', qty: 1, unitPrice: 0 }
}

const DOC_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const BO_STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  complete: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const TAB_CFG = {
  quotes: {
    docType: 'quote' as DocType,
    label: 'Quotes',
    icon: '📄',
    createLabel: 'Create Quote',
    prefix: 'Q',
    boPhase: (b: Backorder) => b.phaseQuote && b.quoteNumber,
    boDocNum: (b: Backorder) => b.quoteNumber,
    boDate: (b: Backorder) => b.phaseQuoteDate,
    termsKey: 'quoteTerms' as keyof OrderTemplate,
  },
  salesorders: {
    docType: 'salesorder' as DocType,
    label: 'Sales Orders',
    icon: '🧾',
    createLabel: 'Create Sales Order',
    prefix: 'SO',
    boPhase: (b: Backorder) => b.phaseSalesOrder && b.salesOrderNumber,
    boDocNum: (b: Backorder) => b.salesOrderNumber,
    boDate: (b: Backorder) => b.phaseSalesOrderDate,
    termsKey: 'salesOrderTerms' as keyof OrderTemplate,
  },
  invoices: {
    docType: 'invoice' as DocType,
    label: 'Invoices',
    icon: '💰',
    createLabel: 'Create Invoice',
    prefix: 'INV',
    boPhase: (b: Backorder) => b.phaseInvoice && b.invoiceNumber,
    boDocNum: (b: Backorder) => b.invoiceNumber,
    boDate: (b: Backorder) => b.phaseInvoiceDate,
    termsKey: 'invoiceTerms' as keyof OrderTemplate,
  },
} as const

// ─── Template Modal ────────────────────────────────────────────────────────────

function TemplateModal({
  template,
  onSave,
  onClose,
}: {
  template: OrderTemplate
  onSave: (t: OrderTemplate) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<OrderTemplate>(template)
  const [saving, setSaving] = useState(false)

  const set = (k: keyof OrderTemplate, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/orders/template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) { onSave(form); onClose() }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold">Document Template</h2>
            <p className="text-xs text-gray-400 mt-0.5">Company details &amp; terms used on all documents</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Company */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Company Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Company Name</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">VAT Number</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.companyVAT} onChange={(e) => set('companyVAT', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.companyPhone} onChange={(e) => set('companyPhone', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.companyEmail} onChange={(e) => set('companyEmail', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Address</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" rows={2} value={form.companyAddress} onChange={(e) => set('companyAddress', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Logo URL</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="https://..." value={form.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} />
              </div>
            </div>
          </section>

          {/* Banking */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Banking Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Bank Name</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.bankName} onChange={(e) => set('bankName', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Account Type</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.bankType} onChange={(e) => set('bankType', e.target.value)}>
                  <option>Current</option>
                  <option>Savings</option>
                  <option>Transmission</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Account Number</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.bankAccount} onChange={(e) => set('bankAccount', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Branch Code</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.bankBranch} onChange={(e) => set('bankBranch', e.target.value)} />
              </div>
            </div>
          </section>

          {/* Terms */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Terms &amp; Conditions</h3>
            <div className="space-y-3">
              {(
                [
                  ['quoteTerms', 'Quote Terms'],
                  ['salesOrderTerms', 'Sales Order Terms'],
                  ['invoiceTerms', 'Invoice Terms'],
                  ['footerText', 'Footer Text'],
                ] as [keyof OrderTemplate, string][]
              ).map(([k, lbl]) => (
                <div key={k}>
                  <label className="text-xs text-gray-500 mb-1 block">{lbl}</label>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                    rows={2}
                    value={form[k] as string}
                    onChange={(e) => set(k, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Create Document Modal ─────────────────────────────────────────────────────

function CreateDocumentModal({
  docType,
  template,
  onCreated,
  onClose,
}: {
  docType: DocType
  template: OrderTemplate
  onCreated: (doc: OrderDocument) => void
  onClose: () => void
}) {
  const cfg = TAB_CFG[docType === 'quote' ? 'quotes' : docType === 'salesorder' ? 'salesorders' : 'invoices']
  const label = cfg.label.replace(/s$/, '') // Quote, Sales Order, Invoice

  const [form, setForm] = useState({
    docNumber: '',
    date: new Date().toISOString().slice(0, 10),
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    notes: '',
    terms: template[cfg.termsKey] as string,
    status: 'draft' as const,
  })
  const [lineItems, setLineItems] = useState<LineItem[]>([newLine()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const addLine = () => setLineItems((p) => [...p, newLine()])
  const removeLine = (id: string) => setLineItems((p) => p.filter((l) => l.id !== id))
  const updateLine = (id: string, k: keyof LineItem, v: string | number) =>
    setLineItems((p) => p.map((l) => (l.id === id ? { ...l, [k]: v } : l)))

  const subtotal = lineItems.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const vat = subtotal * 0.15
  const total = subtotal + vat

  const handleSave = async () => {
    if (!form.clientName.trim()) { setError('Client name is required'); return }
    if (!form.docNumber.trim()) { setError('Document number is required'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/orders/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, type: docType, lineItems }),
      })
      if (res.ok) {
        onCreated(await res.json())
        onClose()
      } else {
        setError('Failed to save — please try again')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold">Create {label}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}

          {/* Doc # + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{label} Number *</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder={`e.g. ${cfg.prefix}-001`}
                value={form.docNumber}
                onChange={(e) => setField('docNumber', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Date</label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={form.date}
                onChange={(e) => setField('date', e.target.value)}
              />
            </div>
          </div>

          {/* Client */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Name *</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.clientName} onChange={(e) => setField('clientName', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.clientEmail} onChange={(e) => setField('clientEmail', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.clientPhone} onChange={(e) => setField('clientPhone', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Address</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.clientAddress} onChange={(e) => setField('clientAddress', e.target.value)} />
              </div>
            </div>
          </section>

          {/* Line Items */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Line Items</h3>
              <button onClick={addLine} className="text-xs text-blue-600 hover:text-blue-800 font-semibold">+ Add Line</button>
            </div>
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-3 py-2">Description</th>
                    <th className="text-right px-3 py-2 w-16">Qty</th>
                    <th className="text-right px-3 py-2 w-28">Unit Price</th>
                    <th className="text-right px-3 py-2 w-28">Total</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li) => (
                    <tr key={li.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-2 py-1">
                        <input
                          className="w-full px-2 py-1.5 text-sm rounded focus:outline-none focus:bg-blue-50"
                          placeholder="Item description"
                          value={li.description}
                          onChange={(e) => updateLine(li.id, 'description', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          min={1}
                          className="w-full px-2 py-1.5 text-sm text-right rounded focus:outline-none focus:bg-blue-50"
                          value={li.qty}
                          onChange={(e) => updateLine(li.id, 'qty', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className="w-full px-2 py-1.5 text-sm text-right rounded focus:outline-none focus:bg-blue-50"
                          value={li.unitPrice}
                          onChange={(e) => updateLine(li.id, 'unitPrice', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600 whitespace-nowrap">{formatPrice(li.qty * li.unitPrice)}</td>
                      <td className="px-2 py-2 text-center">
                        {lineItems.length > 1 && (
                          <button onClick={() => removeLine(li.id)} className="text-gray-300 hover:text-red-500 leading-none">✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="text-sm">
                  <tr className="border-t bg-gray-50">
                    <td colSpan={3} className="px-3 py-2 text-right text-gray-500">Subtotal (excl. VAT)</td>
                    <td className="px-3 py-2 text-right font-medium">{formatPrice(subtotal)}</td>
                    <td />
                  </tr>
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="px-3 py-2 text-right text-gray-500">VAT (15%)</td>
                    <td className="px-3 py-2 text-right font-medium">{formatPrice(vat)}</td>
                    <td />
                  </tr>
                  <tr className="border-t bg-blue-50">
                    <td colSpan={3} className="px-3 py-2.5 text-right font-bold text-blue-800">Total (incl. VAT)</td>
                    <td className="px-3 py-2.5 text-right font-bold text-blue-800">{formatPrice(total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* Notes + Terms */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Notes</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                rows={3}
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Terms &amp; Conditions</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                rows={3}
                value={form.terms}
                onChange={(e) => setField('terms', e.target.value)}
              />
            </div>
          </div>

          {/* Status */}
          <div className="w-44">
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Status</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={form.status}
              onChange={(e) => setField('status', e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {saving ? 'Saving...' : `Save ${label}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Push to Sage Button ───────────────────────────────────────────────────────

function PushToSageBtn() {
  return (
    <div className="relative group inline-block">
      <button
        disabled
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-300 cursor-not-allowed"
      >
        <span>📤</span> Push to Sage
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block text-xs bg-gray-800 text-white rounded px-2 py-1 whitespace-nowrap z-20">
        Coming soon — Sage integration
      </span>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [backorders, setBackorders] = useState<Backorder[]>([])
  const [documents, setDocuments] = useState<OrderDocument[]>([])
  const [template, setTemplate] = useState<OrderTemplate>(DEFAULT_TEMPLATE)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('quotes')
  const [showTemplate, setShowTemplate] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [boRes, docRes, tmplRes] = await Promise.all([
        fetch('/api/admin/backorders'),
        fetch('/api/admin/orders/documents'),
        fetch('/api/admin/orders/template'),
      ])
      if (boRes.ok) setBackorders(await boRes.json())
      if (docRes.ok) setDocuments(await docRes.json())
      if (tmplRes.ok) setTemplate(await tmplRes.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const cfg = TAB_CFG[tab]

  const boRows = backorders.filter(cfg.boPhase)
  const docRows = documents.filter((d) => d.type === cfg.docType)
  const totalCount = boRows.length + docRows.length

  const boTotal = boRows.reduce((s, b) => s + b.price * b.qty, 0)
  const docTotal = docRows.reduce((s, d) => s + d.lineItems.reduce((ls, li) => ls + li.qty * li.unitPrice, 0), 0)
  const grandTotal = boTotal + docTotal

  const tabCounts = {
    quotes: backorders.filter(TAB_CFG.quotes.boPhase).length + documents.filter((d) => d.type === 'quote').length,
    salesorders: backorders.filter(TAB_CFG.salesorders.boPhase).length + documents.filter((d) => d.type === 'salesorder').length,
    invoices: backorders.filter(TAB_CFG.invoices.boPhase).length + documents.filter((d) => d.type === 'invoice').length,
  }

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'quotes', label: 'Quotes', icon: '📄' },
    { key: 'salesorders', label: 'Sales Orders', icon: '🧾' },
    { key: 'invoices', label: 'Invoices', icon: '💰' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-gray-500 mt-1">Quotes, Sales Orders &amp; Invoices</p>
      </div>

      {/* Tabs + Action Bar */}
      <div className="flex items-end justify-between border-b border-gray-200 mb-6">
        <div className="flex">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  tab === t.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {tabCounts[t.key]}
              </span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 pb-2">
          <button
            onClick={() => setShowTemplate(true)}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          >
            Edit Template
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            {cfg.createLabel}
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : totalCount === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">{cfg.icon}</div>
          <p className="text-lg font-semibold text-gray-600">No {cfg.label} yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">
            {tab === 'quotes' && 'Create a quote, or tick the Quote phase + add a quote number in a Back Order.'}
            {tab === 'salesorders' && 'Create a sales order, or tick the Sales Order phase + add a number in a Back Order.'}
            {tab === 'invoices' && 'Create an invoice, or tick the Invoice phase + add an invoice number in a Back Order.'}
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            {cfg.createLabel}
          </button>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">{totalCount} {cfg.label}</p>
            <p className="text-sm font-semibold text-gray-700">
              Total (excl. VAT): {formatPrice(grandTotal)}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                    <th className="text-left py-3 px-4">Doc #</th>
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Client</th>
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-right py-3 px-4">Total</th>
                    <th className="text-center py-3 px-4">Status</th>
                    <th className="text-center py-3 px-4">Source</th>
                    <th className="text-center py-3 px-4">Sage</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Backorder-derived rows */}
                  {boRows.map((b) => (
                    <tr key={`bo-${b.id}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-blue-700">
                        {cfg.boDocNum(b)}
                      </td>
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                        {formatDate(cfg.boDate(b) || b.createdAt)}
                      </td>
                      <td className="py-3 px-4 font-medium">{b.clientName}</td>
                      <td className="py-3 px-4 text-gray-600 max-w-[200px] truncate">{b.description}</td>
                      <td className="py-3 px-4 text-right font-semibold">{formatPrice(b.price * b.qty)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${BO_STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Back Order</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <PushToSageBtn />
                      </td>
                    </tr>
                  ))}

                  {/* Standalone document rows */}
                  {docRows.map((doc) => {
                    const subtotal = doc.lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0)
                    const firstDesc = doc.lineItems[0]?.description || '—'
                    return (
                      <tr key={`doc-${doc.id}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-blue-700">{doc.docNumber}</td>
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDate(doc.date)}</td>
                        <td className="py-3 px-4 font-medium">{doc.clientName}</td>
                        <td className="py-3 px-4 text-gray-600 max-w-[200px] truncate">{firstDesc}</td>
                        <td className="py-3 px-4 text-right font-semibold">{formatPrice(subtotal)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${DOC_STATUS_COLORS[doc.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">Standalone</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <PushToSageBtn />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      {showTemplate && (
        <TemplateModal
          template={template}
          onSave={setTemplate}
          onClose={() => setShowTemplate(false)}
        />
      )}
      {showCreate && (
        <CreateDocumentModal
          docType={cfg.docType}
          template={template}
          onCreated={(doc) => setDocuments((prev) => [doc, ...prev])}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}
