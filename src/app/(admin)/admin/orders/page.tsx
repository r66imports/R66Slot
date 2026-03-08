'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  imageBlock: string[]
  bankName: string
  bankAccount: string
  bankBranch: string
  bankType: string
  quoteTerms: string
  salesOrderTerms: string
  invoiceTerms: string
  footerText: string
}

// Normalised view data — works for both backorder + standalone source
interface DocViewData {
  docType: DocType
  docNumber: string
  date: string
  clientName: string
  clientEmail: string
  clientPhone: string
  clientAddress: string
  lineItems: LineItem[]
  notes: string
  terms: string
  status: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_TEMPLATE: OrderTemplate = {
  companyName: 'R66 Slot',
  companyAddress: '',
  companyVAT: '',
  companyPhone: '',
  companyEmail: '',
  logoUrl: '',
  imageBlock: ['', '', '', '', '', ''],
  bankName: '',
  bankAccount: '',
  bankBranch: '',
  bankType: 'Current',
  quoteTerms: 'This quote is valid for 30 days from the date of issue.',
  salesOrderTerms: 'Payment is required before the order can be processed.',
  invoiceTerms: 'Payment due within 30 days of invoice date.',
  footerText: '',
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
    label: 'Quotes', singularLabel: 'Quote',
    icon: '📄', createLabel: 'Create Quote', prefix: 'Q',
    boPhase: (b: Backorder) => b.phaseQuote && b.quoteNumber,
    boDocNum: (b: Backorder) => b.quoteNumber ?? '',
    boDate: (b: Backorder) => b.phaseQuoteDate,
    termsKey: 'quoteTerms' as keyof OrderTemplate,
  },
  salesorders: {
    docType: 'salesorder' as DocType,
    label: 'Sales Orders', singularLabel: 'Sales Order',
    icon: '🧾', createLabel: 'Create Sales Order', prefix: 'SO',
    boPhase: (b: Backorder) => b.phaseSalesOrder && b.salesOrderNumber,
    boDocNum: (b: Backorder) => b.salesOrderNumber ?? '',
    boDate: (b: Backorder) => b.phaseSalesOrderDate,
    termsKey: 'salesOrderTerms' as keyof OrderTemplate,
  },
  invoices: {
    docType: 'invoice' as DocType,
    label: 'Invoices', singularLabel: 'Invoice',
    icon: '💰', createLabel: 'Create Invoice', prefix: 'INV',
    boPhase: (b: Backorder) => b.phaseInvoice && b.invoiceNumber,
    boDocNum: (b: Backorder) => b.invoiceNumber ?? '',
    boDate: (b: Backorder) => b.phaseInvoiceDate,
    termsKey: 'invoiceTerms' as keyof OrderTemplate,
  },
} as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
    .toUpperCase()
}
function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtPrice(n: number) {
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function newLine(): LineItem {
  return { id: `li_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, description: '', qty: 1, unitPrice: 0 }
}

// ─── Image Upload Helper ───────────────────────────────────────────────────────

function ImageUpload({
  value,
  onChange,
  placeholder = 'Upload or paste URL',
  size = 'md',
}: {
  value: string
  onChange: (url: string) => void
  placeholder?: string
  size?: 'sm' | 'md'
}) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const { url } = await res.json()
        onChange(url)
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-2">
      {value && (
        <img src={value} alt="" className={`object-contain border rounded ${size === 'sm' ? 'h-8 w-8' : 'h-12 w-12'}`} />
      )}
      <div className="flex-1 flex items-center gap-1.5">
        <input
          className="flex-1 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 whitespace-nowrap disabled:opacity-50"
        >
          {uploading ? '...' : '↑ Upload'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  )
}

// ─── Document View (rendered document body, shared by View & Print) ───────────

function DocumentBody({
  data,
  template,
}: {
  data: DocViewData
  template: OrderTemplate
}) {
  const subtotal = data.lineItems.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const vat = subtotal * 0.15
  const total = subtotal + vat
  const docTitle = data.docType === 'quote' ? 'QUOTE' : data.docType === 'salesorder' ? 'SALES ORDER' : 'INVOICE'
  const activeImages = template.imageBlock?.filter(Boolean) ?? []

  return (
    <div className="bg-white text-gray-900 text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header: Logo left, Doc title/number/date right */}
      <div className="flex items-start justify-between mb-4">
        <div>
          {template.logoUrl && (
            <img src={template.logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-800 tracking-widest">{docTitle}</div>
          <div className="text-base font-semibold mt-1">{data.docNumber}</div>
          <div className="text-xs text-gray-500 mt-0.5">{fmtDateLong(data.date)}</div>
          <div className={`mt-2 inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize
            ${DOC_STATUS_COLORS[data.status] ?? BO_STATUS_COLORS[data.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {data.status}
          </div>
        </div>
      </div>

      {/* Image block — full width, 16:9 containers, above addresses */}
      {activeImages.length > 0 && (
        <div className="flex gap-2 mb-4">
          {activeImages.map((url, i) => (
            <div key={i} className="flex-1 overflow-hidden rounded border border-gray-100 bg-gray-50" style={{ aspectRatio: '16/9' }}>
              <img src={url} alt="" className="w-full h-full object-contain" />
            </div>
          ))}
        </div>
      )}

      {/* Company + Client row */}
      <div className="flex gap-8 mb-5 pt-4 border-t border-gray-200">
        <div className="flex-1">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">From</div>
          <div className="font-semibold text-gray-800">{template.companyName || 'Your Company'}</div>
          {template.companyAddress && <div className="text-xs text-gray-600 whitespace-pre-line">{template.companyAddress}</div>}
          {template.companyVAT && <div className="text-xs text-gray-500">VAT: {template.companyVAT}</div>}
          {template.companyPhone && <div className="text-xs text-gray-500">Tel: {template.companyPhone}</div>}
          {template.companyEmail && <div className="text-xs text-gray-500">{template.companyEmail}</div>}
        </div>
        <div className="flex-1">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Bill To</div>
          <div className="font-semibold text-gray-800">{data.clientName}</div>
          {data.clientEmail && <div className="text-xs text-gray-600">{data.clientEmail}</div>}
          {data.clientPhone && <div className="text-xs text-gray-600">{data.clientPhone}</div>}
          {data.clientAddress && <div className="text-xs text-gray-600 whitespace-pre-line">{data.clientAddress}</div>}
        </div>
      </div>

      {/* Line items */}
      <table className="w-full border-collapse mb-4 text-sm">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="text-left px-3 py-2 font-medium">#</th>
            <th className="text-left px-3 py-2 font-medium">Description</th>
            <th className="text-right px-3 py-2 font-medium w-14">Qty</th>
            <th className="text-right px-3 py-2 font-medium w-28">Unit Price</th>
            <th className="text-right px-3 py-2 font-medium w-28">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.lineItems.map((li, i) => (
            <tr key={li.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-3 py-2 text-gray-500 text-xs">{i + 1}</td>
              <td className="px-3 py-2">{li.description || '—'}</td>
              <td className="px-3 py-2 text-right">{li.qty}</td>
              <td className="px-3 py-2 text-right">{fmtPrice(li.unitPrice)}</td>
              <td className="px-3 py-2 text-right font-medium">{fmtPrice(li.qty * li.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-5">
        <div className="w-64">
          <div className="flex justify-between py-1 border-b border-gray-100 text-sm">
            <span className="text-gray-500">Subtotal (excl. VAT)</span>
            <span className="font-medium">{fmtPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100 text-sm">
            <span className="text-gray-500">VAT (15%)</span>
            <span className="font-medium">{fmtPrice(vat)}</span>
          </div>
          <div className="flex justify-between py-2 mt-1 bg-gray-800 text-white px-3 rounded-lg text-sm font-bold">
            <span>TOTAL</span>
            <span>{fmtPrice(total)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {data.notes && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</div>
          <div className="text-xs text-gray-600 whitespace-pre-line">{data.notes}</div>
        </div>
      )}

      {/* Banking (show for invoices always, others if banking details exist) */}
      {(data.docType === 'invoice' || template.bankName) && template.bankName && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Banking Details</div>
          <div className="grid grid-cols-2 gap-x-6 text-xs text-gray-700">
            <div><span className="text-gray-500">Bank: </span>{template.bankName}</div>
            <div><span className="text-gray-500">Account: </span>{template.bankAccount}</div>
            <div><span className="text-gray-500">Branch Code: </span>{template.bankBranch}</div>
            <div><span className="text-gray-500">Type: </span>{template.bankType}</div>
          </div>
        </div>
      )}

      {/* Terms */}
      {data.terms && (
        <div className="mb-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Terms &amp; Conditions</div>
          <div className="text-xs text-gray-500 whitespace-pre-line">{data.terms}</div>
        </div>
      )}

      {/* Footer */}
      {template.footerText && (
        <div className="pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
          {template.footerText}
        </div>
      )}
    </div>
  )
}

// ─── View Document Modal ───────────────────────────────────────────────────────

function ViewDocumentModal({
  data,
  template,
  onClose,
}: {
  data: DocViewData
  template: OrderTemplate
  onClose: () => void
}) {
  const docTypeLabel = data.docType === 'salesorder' ? 'Sales Order' : data.docType.charAt(0).toUpperCase() + data.docType.slice(1)

  const handlePrint = () => doPrint(data, template)
  const handleEmail = () => doEmail(data, template)
  const handlePrintAndEmail = () => { doPrint(data, template); setTimeout(() => doEmail(data, template), 600) }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold">{data.docNumber}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{docTypeLabel} • {data.clientName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-400 rounded-lg text-gray-700 hover:bg-gray-100 hover:border-gray-600 shadow-sm font-medium transition-colors" title="Print">
              <IconPrint /> Print
            </button>
            <button onClick={handlePrintAndEmail} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-blue-400 rounded-lg text-blue-700 hover:bg-blue-50 hover:border-blue-600 shadow-sm font-medium transition-colors" title="Print & Email">
              <IconPrint /><IconEmail /> Print &amp; Email
            </button>
            <button onClick={handleEmail} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-400 rounded-lg text-gray-700 hover:bg-gray-100 hover:border-gray-600 shadow-sm font-medium transition-colors" title="Email">
              <IconEmail /> Email
            </button>
            <button onClick={() => doDownload(data, template)} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-400 rounded-lg text-gray-700 hover:bg-gray-100 hover:border-gray-600 shadow-sm font-medium transition-colors" title="Download">
              <IconDownload /> Download
            </button>
            <button onClick={onClose} className="ml-1 text-gray-500 hover:text-gray-800 text-xl leading-none font-bold">✕</button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          <DocumentBody data={data} template={template} />
        </div>
      </div>
    </div>
  )
}

// ─── Template Preview Modal ────────────────────────────────────────────────────

function TemplatePreviewModal({
  template,
  onClose,
}: {
  template: OrderTemplate
  onClose: () => void
}) {
  const sampleData: DocViewData = {
    docType: 'invoice',
    docNumber: 'INV-001',
    date: new Date().toISOString().slice(0, 10),
    clientName: 'Sample Client',
    clientEmail: 'client@example.com',
    clientPhone: '+27 82 000 0000',
    clientAddress: '1 Sample Street\nCape Town, 8001',
    lineItems: [
      { id: '1', description: 'NSR Formula 22 – Red Bull #1', qty: 2, unitPrice: 850 },
      { id: '2', description: 'Slot.it Motor SICN21 27k', qty: 1, unitPrice: 320 },
    ],
    notes: 'Thank you for your order.',
    terms: template.invoiceTerms,
    status: 'sent',
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold">Template Preview</h2>
            <p className="text-xs text-gray-400 mt-0.5">Using sample data to show how your documents will look</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          <DocumentBody data={sampleData} template={template} />
        </div>
      </div>
    </div>
  )
}

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
  const [form, setForm] = useState<OrderTemplate>({
    ...template,
    imageBlock: template.imageBlock?.length === 6 ? template.imageBlock : ['', '', '', '', '', ''],
  })
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const set = (k: keyof OrderTemplate, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const setImg = (i: number, url: string) =>
    setForm((f) => {
      const block = [...f.imageBlock]
      block[i] = url
      return { ...f, imageBlock: block }
    })

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
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h2 className="text-lg font-bold">Document Template</h2>
              <p className="text-xs text-gray-400 mt-0.5">Company details &amp; terms used on all documents</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview(true)}
                className="px-3 py-1.5 text-xs border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 font-medium"
              >
                👁️ Preview
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-6 space-y-6">

            {/* Logo */}
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Logo</h3>
              <ImageUpload value={form.logoUrl} onChange={(url) => set('logoUrl', url)} placeholder="Paste logo URL or upload" size="md" />
            </section>

            {/* Image Block */}
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Image Block</h3>
              <p className="text-xs text-gray-400 mb-3">6 images displayed below the logo on documents (product showcase, certifications, etc.)</p>
              <div className="grid grid-cols-2 gap-2">
                {form.imageBlock.map((url, i) => (
                  <div key={i}>
                    <label className="text-xs text-gray-400 mb-1 block">Image {i + 1}</label>
                    <ImageUpload value={url} onChange={(u) => setImg(i, u)} placeholder="Upload or paste URL" size="sm" />
                  </div>
                ))}
              </div>
            </section>

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

      {showPreview && (
        <TemplatePreviewModal template={form} onClose={() => setShowPreview(false)} />
      )}
    </>
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
      if (res.ok) { onCreated(await res.json()); onClose() }
      else setError('Failed to save — please try again')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold">Create {cfg.singularLabel}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{cfg.singularLabel} Number *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder={`e.g. ${cfg.prefix}-001`} value={form.docNumber} onChange={(e) => setField('docNumber', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Date</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.date} onChange={(e) => setField('date', e.target.value)} />
            </div>
          </div>

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-500 mb-1 block">Name *</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.clientName} onChange={(e) => setField('clientName', e.target.value)} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Email</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.clientEmail} onChange={(e) => setField('clientEmail', e.target.value)} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Phone</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.clientPhone} onChange={(e) => setField('clientPhone', e.target.value)} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Address</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.clientAddress} onChange={(e) => setField('clientAddress', e.target.value)} /></div>
            </div>
          </section>

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
                      <td className="px-2 py-1"><input className="w-full px-2 py-1.5 text-sm rounded focus:outline-none focus:bg-blue-50" placeholder="Item description" value={li.description} onChange={(e) => updateLine(li.id, 'description', e.target.value)} /></td>
                      <td className="px-2 py-1"><input type="number" min={1} className="w-full px-2 py-1.5 text-sm text-right rounded focus:outline-none focus:bg-blue-50" value={li.qty} onChange={(e) => updateLine(li.id, 'qty', Number(e.target.value))} /></td>
                      <td className="px-2 py-1"><input type="number" min={0} step={0.01} className="w-full px-2 py-1.5 text-sm text-right rounded focus:outline-none focus:bg-blue-50" value={li.unitPrice} onChange={(e) => updateLine(li.id, 'unitPrice', Number(e.target.value))} /></td>
                      <td className="px-3 py-2 text-right text-gray-600 whitespace-nowrap">{fmtPrice(li.qty * li.unitPrice)}</td>
                      <td className="px-2 py-2 text-center">{lineItems.length > 1 && <button onClick={() => removeLine(li.id)} className="text-gray-300 hover:text-red-500 leading-none">✕</button>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="text-sm">
                  <tr className="border-t bg-gray-50"><td colSpan={3} className="px-3 py-2 text-right text-gray-500">Subtotal (excl. VAT)</td><td className="px-3 py-2 text-right font-medium">{fmtPrice(subtotal)}</td><td /></tr>
                  <tr className="bg-gray-50"><td colSpan={3} className="px-3 py-2 text-right text-gray-500">VAT (15%)</td><td className="px-3 py-2 text-right font-medium">{fmtPrice(vat)}</td><td /></tr>
                  <tr className="border-t bg-blue-50"><td colSpan={3} className="px-3 py-2.5 text-right font-bold text-blue-800">Total (incl. VAT)</td><td className="px-3 py-2.5 text-right font-bold text-blue-800">{fmtPrice(subtotal + vat)}</td><td /></tr>
                </tfoot>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Notes</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" rows={3} value={form.notes} onChange={(e) => setField('notes', e.target.value)} /></div>
            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Terms &amp; Conditions</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" rows={3} value={form.terms} onChange={(e) => setField('terms', e.target.value)} /></div>
          </div>

          <div className="w-44">
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Status</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.status} onChange={(e) => setField('status', e.target.value)}>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
            {saving ? 'Saving...' : `Save ${cfg.singularLabel}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Document Print / Email Utilities ─────────────────────────────────────────

function generateDocHTML(data: DocViewData, template: OrderTemplate): string {
  const docTitle = data.docType === 'quote' ? 'QUOTE' : data.docType === 'salesorder' ? 'SALES ORDER' : 'INVOICE'
  const subtotal = data.lineItems.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const vat = subtotal * 0.15
  const total = subtotal + vat
  const activeImages = (template.imageBlock ?? []).filter(Boolean)

  const imagesHTML = activeImages.length > 0
    ? `<div style="display:flex;gap:8px;margin-bottom:16px">${activeImages.map(url =>
        `<div style="flex:1;aspect-ratio:16/9;overflow:hidden;border-radius:4px;border:1px solid #f3f4f6;background:#f9fafb"><img src="${url}" style="width:100%;height:100%;object-fit:contain"/></div>`
      ).join('')}</div>`
    : ''

  const rowsHTML = data.lineItems.map((li, i) =>
    `<tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
      <td style="padding:7px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#9ca3af">${i + 1}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #f3f4f6">${li.description || '—'}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #f3f4f6;text-align:right">${li.qty}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #f3f4f6;text-align:right">${fmtPrice(li.unitPrice)}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600">${fmtPrice(li.qty * li.unitPrice)}</td>
    </tr>`
  ).join('')

  const bankHTML = template.bankName
    ? `<div style="margin-bottom:16px;padding:12px;background:#eff6ff;border-radius:8px;border:1px solid #dbeafe">
        <div style="font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;margin-bottom:6px">Banking Details</div>
        <table style="width:100%"><tr>
          <td style="font-size:12px">Bank: <strong>${template.bankName}</strong></td>
          <td style="font-size:12px">Account: <strong>${template.bankAccount}</strong></td>
        </tr><tr>
          <td style="font-size:12px">Branch: <strong>${template.bankBranch}</strong></td>
          <td style="font-size:12px">Type: <strong>${template.bankType}</strong></td>
        </tr></table>
      </div>`
    : ''

  return `<!DOCTYPE html><html><head><title>${data.docNumber}</title>
  <style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:40px;color:#111;font-size:14px}@media print{body{margin:20px}}</style>
  </head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
    <div>${template.logoUrl ? `<img src="${template.logoUrl}" style="height:64px;width:auto;object-fit:contain"/>` : ''}</div>
    <div style="text-align:right">
      <div style="font-size:24px;font-weight:700;letter-spacing:0.1em;color:#1f2937">${docTitle}</div>
      <div style="font-size:16px;font-weight:600;margin-top:4px">${data.docNumber}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:2px">${fmtDateLong(data.date)}</div>
    </div>
  </div>
  ${imagesHTML}
  <div style="display:flex;gap:32px;margin-bottom:20px;padding-top:16px;border-top:1px solid #e5e7eb">
    <div style="flex:1">
      <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">From</div>
      <div style="font-weight:600">${template.companyName || 'R66 Slot'}</div>
      ${template.companyAddress ? `<div style="font-size:12px;color:#4b5563;white-space:pre-line">${template.companyAddress}</div>` : ''}
      ${template.companyVAT ? `<div style="font-size:12px;color:#6b7280">VAT: ${template.companyVAT}</div>` : ''}
      ${template.companyPhone ? `<div style="font-size:12px;color:#6b7280">Tel: ${template.companyPhone}</div>` : ''}
      ${template.companyEmail ? `<div style="font-size:12px;color:#6b7280">${template.companyEmail}</div>` : ''}
    </div>
    <div style="flex:1">
      <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Bill To</div>
      <div style="font-weight:600">${data.clientName}</div>
      ${data.clientEmail ? `<div style="font-size:12px;color:#4b5563">${data.clientEmail}</div>` : ''}
      ${data.clientPhone ? `<div style="font-size:12px;color:#4b5563">${data.clientPhone}</div>` : ''}
      ${data.clientAddress ? `<div style="font-size:12px;color:#4b5563;white-space:pre-line">${data.clientAddress}</div>` : ''}
    </div>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
    <thead><tr style="background:#1f2937;color:white">
      <th style="padding:8px 12px;text-align:left;font-size:13px">#</th>
      <th style="padding:8px 12px;text-align:left;font-size:13px">Description</th>
      <th style="padding:8px 12px;text-align:right;font-size:13px">Qty</th>
      <th style="padding:8px 12px;text-align:right;font-size:13px">Unit Price</th>
      <th style="padding:8px 12px;text-align:right;font-size:13px">Total</th>
    </tr></thead>
    <tbody>${rowsHTML}</tbody>
  </table>
  <div style="display:flex;justify-content:flex-end;margin-bottom:20px">
    <div style="width:260px">
      <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f3f4f6"><span style="color:#6b7280">Subtotal (excl. VAT)</span><span style="font-weight:500">${fmtPrice(subtotal)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f3f4f6"><span style="color:#6b7280">VAT (15%)</span><span style="font-weight:500">${fmtPrice(vat)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 12px;margin-top:4px;background:#1f2937;color:white;border-radius:8px;font-weight:700"><span>TOTAL</span><span>${fmtPrice(total)}</span></div>
    </div>
  </div>
  ${data.notes ? `<div style="margin-bottom:16px;padding:12px;background:#f9fafb;border-radius:8px"><div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Notes</div><div style="font-size:12px;color:#4b5563;white-space:pre-line">${data.notes}</div></div>` : ''}
  ${bankHTML}
  ${data.terms ? `<div style="margin-bottom:16px"><div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Terms &amp; Conditions</div><div style="font-size:12px;color:#6b7280;white-space:pre-line">${data.terms}</div></div>` : ''}
  ${template.footerText ? `<div style="padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af">${template.footerText}</div>` : ''}
  </body></html>`
}

function doPrint(data: DocViewData, template: OrderTemplate) {
  const win = window.open('', '_blank', 'width=920,height=750')
  if (!win) return
  win.document.write(generateDocHTML(data, template))
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 400)
}

function doEmail(data: DocViewData, template: OrderTemplate) {
  const docLabel = data.docType === 'quote' ? 'Quote' : data.docType === 'salesorder' ? 'Sales Order' : 'Invoice'
  const subtotal = data.lineItems.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const vat = subtotal * 0.15
  const subject = `${docLabel} ${data.docNumber} – ${template.companyName || 'R66 Slot'}`
  const lines = data.lineItems.map((li, i) =>
    `  ${i + 1}. ${li.description}  ×${li.qty}  @  ${fmtPrice(li.unitPrice)}  =  ${fmtPrice(li.qty * li.unitPrice)}`
  ).join('\n')
  const banking = template.bankName
    ? `\nBANKING DETAILS\nBank: ${template.bankName}  |  Account: ${template.bankAccount}\nBranch: ${template.bankBranch}  |  Type: ${template.bankType}\n`
    : ''
  const body = [
    `Dear ${data.clientName},`,
    '',
    `Please see your ${docLabel} details below.`,
    '',
    `${docLabel.toUpperCase()}: ${data.docNumber}`,
    `Date: ${fmtDateLong(data.date)}`,
    '',
    `ITEMS`,
    '─'.repeat(52),
    lines,
    '─'.repeat(52),
    `Subtotal (excl. VAT):  ${fmtPrice(subtotal)}`,
    `VAT (15%):             ${fmtPrice(vat)}`,
    `TOTAL (incl. VAT):     ${fmtPrice(subtotal + vat)}`,
    banking,
    data.terms ? `\nTERMS & CONDITIONS\n${data.terms}` : '',
    '',
    `Kind regards,`,
    template.companyName || 'R66 Slot',
    template.companyPhone ? `Tel: ${template.companyPhone}` : '',
    template.companyEmail || '',
  ].filter((l) => l !== undefined).join('\n')

  window.location.href = `mailto:${data.clientEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

function doDownload(data: DocViewData, template: OrderTemplate) {
  const html = generateDocHTML(data, template)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${data.docNumber}.html`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Shared icon button style ──────────────────────────────────────────────────
const ICON_BTN = 'p-1.5 border border-gray-400 rounded-lg bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-600 shadow-sm transition-colors'

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconView() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
      <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
    </svg>
  )
}
function IconPrint() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/>
      <path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4V3zm1 5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5zm7 2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1z"/>
    </svg>
  )
}
function IconEmail() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z"/>
    </svg>
  )
}
function IconDownload() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="black" aria-hidden>
      <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
      <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
    </svg>
  )
}
function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6Z"/>
      <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1ZM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118ZM2.5 3h11V2h-11v1Z"/>
    </svg>
  )
}

// ─── Push to Sage Button ───────────────────────────────────────────────────────

function PushToSageBtn() {
  return (
    <div className="relative group inline-block">
      <button disabled className="p-1.5 border border-gray-300 rounded-lg bg-white text-gray-300 cursor-not-allowed shadow-sm opacity-60">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm.5 4.5v3.793l2.146 2.147a.5.5 0 0 1-.708.707L7.5 8.707V4.5a.5.5 0 0 1 1 0z"/>
        </svg>
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block text-xs bg-gray-800 text-white rounded px-2 py-1 whitespace-nowrap z-20">
        Push to Sage — coming soon
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
  const [viewData, setViewData] = useState<DocViewData | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

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
      if (tmplRes.ok) {
        const t = await tmplRes.json()
        setTemplate({ ...DEFAULT_TEMPLATE, ...t, imageBlock: t.imageBlock?.length === 6 ? t.imageBlock : ['', '', '', '', '', ''] })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const cfg = TAB_CFG[tab]

  const boRows = backorders.filter(cfg.boPhase)
  const docRows = documents.filter((d) => d.type === cfg.docType)
  const totalCount = boRows.length + docRows.length

  const grandTotal =
    boRows.reduce((s, b) => s + b.price * b.qty, 0) +
    docRows.reduce((s, d) => s + d.lineItems.reduce((ls, li) => ls + li.qty * li.unitPrice, 0), 0)

  const tabCounts = {
    quotes: backorders.filter(TAB_CFG.quotes.boPhase).length + documents.filter((d) => d.type === 'quote').length,
    salesorders: backorders.filter(TAB_CFG.salesorders.boPhase).length + documents.filter((d) => d.type === 'salesorder').length,
    invoices: backorders.filter(TAB_CFG.invoices.boPhase).length + documents.filter((d) => d.type === 'invoice').length,
  }

  // Build DocViewData from a backorder row (current tab context)
  const boToViewData = useCallback((b: Backorder): DocViewData => {
    const c = TAB_CFG[tab]
    return {
      docType: c.docType,
      docNumber: c.boDocNum(b),
      date: c.boDate(b) ?? b.createdAt,
      clientName: b.clientName,
      clientEmail: b.clientEmail ?? '',
      clientPhone: b.clientPhone ?? '',
      clientAddress: '',
      lineItems: [{ id: b.id, description: `${b.sku ? b.sku + ' – ' : ''}${b.description}`, qty: b.qty, unitPrice: b.price }],
      notes: b.notes ?? '',
      terms: template[c.termsKey] as string,
      status: b.status,
    }
  }, [tab, template])

  // Build DocViewData from a standalone document
  const docToViewData = (doc: OrderDocument): DocViewData => ({
    docType: doc.type, docNumber: doc.docNumber, date: doc.date,
    clientName: doc.clientName, clientEmail: doc.clientEmail,
    clientPhone: doc.clientPhone, clientAddress: doc.clientAddress,
    lineItems: doc.lineItems, notes: doc.notes, terms: doc.terms, status: doc.status,
  })

  const viewBackorder = (b: Backorder) => setViewData(boToViewData(b))
  const viewDocument = (doc: OrderDocument) => setViewData(docToViewData(doc))

  // Delete a standalone document
  const deleteDocument = async (id: string) => {
    const res = await fetch(`/api/admin/orders/documents/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== id))
      setDeleteConfirm(null)
    }
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

      {/* Tabs + Actions */}
      <div className="flex items-end justify-between border-b border-gray-200 mb-6">
        <div className="flex">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tab === t.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                {tabCounts[t.key]}
              </span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 pb-2">
          <button onClick={() => setShowTemplate(true)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Edit Template</button>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">{cfg.createLabel}</button>
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
            {tab === 'quotes' && 'Create a quote, or tick the Quote phase + add a number in a Back Order.'}
            {tab === 'salesorders' && 'Create a sales order, or tick the Sales Order phase + add a number in a Back Order.'}
            {tab === 'invoices' && 'Create an invoice, or tick the Invoice phase + add a number in a Back Order.'}
          </p>
          <button onClick={() => setShowCreate(true)} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">{cfg.createLabel}</button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">{totalCount} {cfg.label}</p>
            <p className="text-sm font-semibold text-gray-700">Total (excl. VAT): {fmtPrice(grandTotal)}</p>
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
                    <th className="text-center py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Backorder-derived rows */}
                  {boRows.map((b) => (
                    <tr key={`bo-${b.id}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-blue-700">{cfg.boDocNum(b)}</td>
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{fmtDate(cfg.boDate(b) ?? b.createdAt)}</td>
                      <td className="py-3 px-4 font-medium">{b.clientName}</td>
                      <td className="py-3 px-4 text-gray-600 max-w-[180px] truncate">{b.description}</td>
                      <td className="py-3 px-4 text-right font-semibold">{fmtPrice(b.price * b.qty)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${BO_STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600'}`}>{b.status}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Back Order</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => viewBackorder(b)} className={ICON_BTN} title="View"><IconView /></button>
                          <button onClick={() => doPrint(boToViewData(b), template)} className={ICON_BTN} title="Print"><IconPrint /></button>
                          <button onClick={() => doEmail(boToViewData(b), template)} className={ICON_BTN} title="Email"><IconEmail /></button>
                          <button onClick={() => doDownload(boToViewData(b), template)} className={ICON_BTN} title="Download"><IconDownload /></button>
                          <PushToSageBtn />
                        </div>
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
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{fmtDate(doc.date)}</td>
                        <td className="py-3 px-4 font-medium">{doc.clientName}</td>
                        <td className="py-3 px-4 text-gray-600 max-w-[180px] truncate">{firstDesc}</td>
                        <td className="py-3 px-4 text-right font-semibold">{fmtPrice(subtotal)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${DOC_STATUS_COLORS[doc.status] ?? 'bg-gray-100 text-gray-600'}`}>{doc.status}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">Standalone</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => viewDocument(doc)} className={ICON_BTN} title="View"><IconView /></button>
                            <button onClick={() => doPrint(docToViewData(doc), template)} className={ICON_BTN} title="Print"><IconPrint /></button>
                            <button onClick={() => doEmail(docToViewData(doc), template)} className={ICON_BTN} title="Email"><IconEmail /></button>
                            <button onClick={() => doDownload(docToViewData(doc), template)} className={ICON_BTN} title="Download"><IconDownload /></button>
                            <PushToSageBtn />
                            {deleteConfirm === doc.id ? (
                              <>
                                <button
                                  onClick={() => deleteDocument(doc.id)}
                                  className="text-xs px-2.5 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="text-xs px-2 py-1.5 text-gray-400 hover:text-gray-600"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(doc.id)}
                                className="p-1.5 border border-red-300 rounded-lg bg-white text-red-500 hover:bg-red-50 hover:border-red-500 shadow-sm transition-colors"
                                title="Delete"
                              >
                                <IconTrash />
                              </button>
                            )}
                          </div>
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
        <TemplateModal template={template} onSave={setTemplate} onClose={() => setShowTemplate(false)} />
      )}
      {showCreate && (
        <CreateDocumentModal
          docType={cfg.docType}
          template={template}
          onCreated={(doc) => setDocuments((prev) => [doc, ...prev])}
          onClose={() => setShowCreate(false)}
        />
      )}
      {viewData && (
        <ViewDocumentModal data={viewData} template={template} onClose={() => setViewData(null)} />
      )}
    </div>
  )
}
