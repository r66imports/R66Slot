'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Backorder } from '@/types/backorder'
import { useColumnResize } from '@/hooks/use-column-resize'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientContact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  companyName: string
  companyAddress: string
}

type DocType = 'quote' | 'salesorder' | 'invoice'
type Tab = 'backorders' | 'quotes' | 'salesorders' | 'invoices'

interface LineItem {
  id: string
  description: string
  qty: number
  unitPrice: number
  _retailPrice?: number
  _costPrice?: number
  _preOrderPrice?: number
  _stockQty?: number
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
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'complete' | 'paid' | 'archived'
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
  discountPct: number
  shippingCost: number
  shippingMethod: string
  trackingNumber: string
  depositPaid: number
  paymentMethod: string
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
  complete: 'bg-green-100 text-green-700',
  paid: 'bg-green-600 text-white',
  archived: 'bg-gray-200 text-gray-500',
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
  const discountAmt = subtotal * (data.discountPct || 0) / 100
  const shipping = data.shippingCost || 0
  const total = subtotal - discountAmt + shipping
  const deposit = data.depositPaid || 0
  const balanceDuePreview = total - deposit
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
          {((data.discountPct || 0) > 0 || shipping > 0) && (<>
            <div className="flex justify-between py-1 border-b border-gray-100 text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{fmtPrice(subtotal)}</span>
            </div>
            {(data.discountPct || 0) > 0 && (
              <div className="flex justify-between py-1 border-b border-gray-100 text-sm">
                <span className="text-gray-500">Discount ({data.discountPct}%)</span>
                <span className="font-medium text-red-500">-{fmtPrice(discountAmt)}</span>
              </div>
            )}
            {shipping > 0 && (
              <div className="flex justify-between py-1 border-b border-gray-100 text-sm">
                <span className="text-gray-500">Shipping</span>
                <span className="font-medium">{fmtPrice(shipping)}</span>
              </div>
            )}
          </>)}
          <div className="flex justify-between py-2 mt-1 bg-gray-800 text-white px-3 rounded-lg text-sm font-bold">
            <span>TOTAL</span>
            <span>{fmtPrice(total)}</span>
          </div>
          {deposit > 0 && (<>
            <div className="flex justify-between py-1 border-b border-gray-100 text-sm mt-1">
              <span className="text-gray-500">Deposit Paid</span>
              <span className="font-medium text-green-600">-{fmtPrice(deposit)}</span>
            </div>
            <div className="flex justify-between py-2 bg-orange-600 text-white px-3 rounded-lg text-sm font-bold mt-1">
              <span>BALANCE DUE</span>
              <span>{fmtPrice(balanceDuePreview)}</span>
            </div>
          </>)}
        </div>
      </div>

      {/* Shipping info */}
      {(data.shippingMethod || data.trackingNumber) && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {data.shippingMethod && (
            <>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Shipping:</span>
              <span className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">{data.shippingMethod}</span>
            </>
          )}
          {data.trackingNumber && (
            <>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2">Tracking:</span>
              <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-mono">{data.trackingNumber}</span>
            </>
          )}
        </div>
      )}

      {/* Payment Method */}
      {data.paymentMethod && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment:</span>
          <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{data.paymentMethod}</span>
        </div>
      )}

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
    docNumber: 'INV0001',
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
    discountPct: 0,
    shippingCost: 0,
    shippingMethod: '',
    trackingNumber: '',
    depositPaid: 0,
    paymentMethod: '',
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

// ─── Client Autofill Dropdown ─────────────────────────────────────────────────

function ClientAutofill({
  clients,
  onSelect,
}: {
  clients: ClientContact[]
  onSelect: (c: ClientContact) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? clients.filter((c) => {
        const q = query.toLowerCase()
        return (
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.companyName.toLowerCase().includes(q)
        )
      })
    : clients

  useEffect(() => {
    function h(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleSelect = (c: ClientContact) => {
    setQuery(`${c.firstName} ${c.lastName}`)
    setOpen(false)
    onSelect(c)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">🔍</span>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search saved clients to autofill…"
          className="w-full border-2 border-blue-200 focus:border-blue-400 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none bg-blue-50 focus:bg-white transition-colors"
          autoComplete="off"
        />
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-xl max-h-48 overflow-y-auto">
          {filtered.map((c) => (
            <li
              key={c.id}
              onMouseDown={() => handleSelect(c)}
              className="flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-blue-50 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                {c.firstName.charAt(0)}{c.lastName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{c.firstName} {c.lastName}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                  {c.email && <span className="text-xs text-gray-500">{c.email}</span>}
                  {c.phone && <span className="text-xs text-gray-500">{c.phone}</span>}
                  {c.companyName && <span className="text-xs text-emerald-600 font-medium">{c.companyName}</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── SKU Line Input ────────────────────────────────────────────────────────────

function SkuLineInput({ value, onChange, products, onSelectProduct }: {
  value: string
  onChange: (v: string) => void
  products: Array<{ id: string; sku: string; title: string; price: number; costPerItem: number; preOrderPrice: number; quantity: number }>
  onSelectProduct: (sku: string, title: string, price: number, costPerItem: number, preOrderPrice: number, stockQty: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [outOfStockMsg, setOutOfStockMsg] = useState('')
  const q = value.toLowerCase()
  const filtered = q.length >= 1
    ? products.filter((p) =>
        p.sku.toLowerCase().includes(q) || p.title.toLowerCase().includes(q)
      ).slice(0, 8)
    : []

  function handleSelect(p: { sku: string; title: string; price: number; costPerItem: number; preOrderPrice: number; quantity: number }) {
    if (p.quantity <= 0) {
      setOutOfStockMsg(`"${p.title}" is out of stock`)
      setTimeout(() => setOutOfStockMsg(''), 3000)
      return
    }
    onSelectProduct(p.sku, p.title, p.price, p.costPerItem, p.preOrderPrice, p.quantity)
    setOpen(false)
  }

  return (
    <div className="relative">
      <input
        className="w-full px-2 py-1.5 text-sm rounded focus:outline-none focus:bg-blue-50"
        placeholder="SKU or description"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setOutOfStockMsg('') }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {outOfStockMsg && (
        <div className="absolute left-0 top-full z-50 mt-0.5 bg-red-600 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
          ⚠ {outOfStockMsg}
        </div>
      )}
      {!outOfStockMsg && open && filtered.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg w-80 max-h-48 overflow-y-auto">
          {filtered.map((p) => {
            const oos = p.quantity <= 0
            return (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(p)}
                className={`w-full text-left px-3 py-2 text-sm border-b border-gray-50 last:border-0 ${oos ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'hover:bg-blue-50'}`}
              >
                <span className="font-mono text-xs text-indigo-500 mr-2">{p.sku}</span>
                <span className={oos ? 'text-gray-400' : 'text-gray-800'}>{p.title}</span>
                {oos
                  ? <span className="float-right text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">OUT OF STOCK</span>
                  : <span className="float-right text-gray-400 text-xs">R {p.price.toFixed(2)}</span>
                }
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Create Document Modal ─────────────────────────────────────────────────────

function CreateDocumentModal({
  docType,
  template,
  clients,
  prefilledClient,
  prefilledItems,
  editDoc,
  shippingEnabled = true,
  stockDeductionEnabled = true,
  onCreated,
  onClose,
}: {
  docType: DocType
  template: OrderTemplate
  clients: ClientContact[]
  prefilledClient?: { name: string; email: string; phone: string; address: string }
  prefilledItems?: LineItem[]
  editDoc?: OrderDocument
  shippingEnabled?: boolean
  stockDeductionEnabled?: boolean
  onCreated: (doc: OrderDocument) => void
  onClose: () => void
}) {
  const cfg = TAB_CFG[docType === 'quote' ? 'quotes' : docType === 'salesorder' ? 'salesorders' : 'invoices']

  const [form, setForm] = useState({
    docNumber: editDoc?.docNumber || '',
    date: editDoc?.date || new Date().toISOString().slice(0, 10),
    clientName: editDoc?.clientName || prefilledClient?.name || '',
    clientEmail: editDoc?.clientEmail || prefilledClient?.email || '',
    clientPhone: editDoc?.clientPhone || prefilledClient?.phone || '',
    clientAddress: editDoc?.clientAddress || prefilledClient?.address || '',
    notes: editDoc?.notes || '',
    terms: editDoc?.terms || template[cfg.termsKey] as string,
    status: (editDoc?.status || 'draft') as 'draft' | 'sent' | 'accepted' | 'rejected' | 'complete',
    paymentMethod: (editDoc as any)?.paymentMethod || '',
  })
  const [lineItems, setLineItems] = useState<LineItem[]>(
    editDoc?.lineItems?.length ? editDoc.lineItems : prefilledItems?.length ? prefilledItems : [newLine()]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [modalProducts, setModalProducts] = useState<Array<{ id: string; sku: string; title: string; price: number; costPerItem: number; preOrderPrice: number; quantity: number }>>([])
  const [enforceStockLimit, setEnforceStockLimit] = useState(false)
  const [priceMode, setPriceMode] = useState<'retail' | 'cost' | 'preorder'>('retail')

  useEffect(() => {
    fetch('/api/admin/site-rules')
      .then((r) => r.ok ? r.json() : [])
      .then((rules: any[]) => {
        const stockRule = rules.find((r) => r.id === 'enforce_stock_limit')
        setEnforceStockLimit(stockRule?.active === true)
        const priceRule = rules.find((r) => r.id === 'invoice_price_type')
        if (priceRule?.active && priceRule.value) {
          setPriceMode(priceRule.value as 'retail' | 'cost' | 'preorder')
        }
      })
      .catch(() => {})
  }, [])

  const changePriceMode = (mode: 'retail' | 'cost' | 'preorder') => {
    setPriceMode(mode)
    setLineItems((prev) => prev.map((li) => {
      if (mode === 'retail' && li._retailPrice) return { ...li, unitPrice: li._retailPrice }
      if (mode === 'cost' && li._costPrice) return { ...li, unitPrice: li._costPrice }
      if (mode === 'preorder') return { ...li, unitPrice: li._preOrderPrice && li._preOrderPrice > 0 ? li._preOrderPrice : (li._retailPrice || li.unitPrice) }
      return li
    }))
  }

  useEffect(() => {
    fetch('/api/admin/products')
      .then((r) => r.ok ? r.json() : [])
      .then((data: any[]) => setModalProducts(
        data.filter((p) => p.sku || p.title).map((p) => ({ id: p.id, sku: p.sku || '', title: p.title || '', price: Number(p.price) || 0, costPerItem: Number(p.cost_per_item ?? p.costPerItem) || 0, preOrderPrice: Number(p.pre_order_price ?? p.preOrderPrice) || 0, quantity: Number(p.quantity) || 0 }))
      ))
      .catch(() => {})
  }, [])

  // Enrich existing line items with stock/price data once products load
  // (needed for edit mode — _stockQty is only set on fresh product selection otherwise)
  useEffect(() => {
    if (modalProducts.length === 0) return
    setLineItems((prev) => prev.map((li) => {
      if (li._stockQty !== undefined) return li // already enriched
      // Description format is "SKU – title" — extract SKU before the dash
      const sku = li.description.split(/\s*[–\-]\s*/)[0]?.trim()
      if (!sku) return li
      const prod = modalProducts.find((p) => p.sku && p.sku.toLowerCase() === sku.toLowerCase())
      if (!prod) return li
      return {
        ...li,
        _stockQty: prod.quantity,
        _retailPrice: li._retailPrice ?? (prod.price || undefined),
        _costPrice: li._costPrice ?? (prod.costPerItem || undefined),
        _preOrderPrice: li._preOrderPrice ?? (prod.preOrderPrice > 0 ? prod.preOrderPrice : undefined),
      }
    }))
  }, [modalProducts])

  // Auto-generate next invoice number (INV000001 format) for new invoices only
  useEffect(() => {
    if (editDoc || docType !== 'invoice') return
    fetch('/api/admin/orders/documents?type=invoice')
      .then((r) => r.ok ? r.json() : [])
      .then((docs: any[]) => {
        const nums = docs
          .map((d: any) => { const m = /^INV(\d+)$/.exec(d.docNumber || ''); return m ? parseInt(m[1], 10) : 0 })
          .filter((n) => n > 0)
        const next = Math.max(25, ...(nums.length ? nums : [0])) + 1
        setForm((f) => ({ ...f, docNumber: `INV${String(next).padStart(4, '0')}` }))
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-generate next SO number (SO001 format) for new sales orders only
  useEffect(() => {
    if (editDoc || docType !== 'salesorder') return
    fetch('/api/admin/orders/documents?type=salesorder')
      .then((r) => r.ok ? r.json() : [])
      .then((docs: any[]) => {
        const nums = docs
          .map((d: any) => { const m = /^SO(\d+)$/.exec(d.docNumber || ''); return m ? parseInt(m[1], 10) : 0 })
          .filter((n) => n > 0)
        const next = (nums.length ? Math.max(...nums) : 0) + 1
        setForm((f) => ({ ...f, docNumber: `SO${String(next).padStart(3, '0')}` }))
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const addLine = () => setLineItems((p) => [...p, newLine()])
  const removeLine = (id: string) => setLineItems((p) => p.filter((l) => l.id !== id))
  const updateLine = (id: string, k: keyof LineItem, v: string | number) =>
    setLineItems((p) => p.map((l) => (l.id === id ? { ...l, [k]: v } : l)))

  const [discountPct, setDiscountPct] = useState<number>((editDoc as any)?.discountPct || 0)
  const [shippingCost, setShippingCost] = useState<number>((editDoc as any)?.shippingCost || 0)
  const [shippingMethod, setShippingMethod] = useState<string>((editDoc as any)?.shippingMethod || '')
  const [trackingNumber, setTrackingNumber] = useState<string>((editDoc as any)?.trackingNumber || '')
  const [depositPaid, setDepositPaid] = useState<number>((editDoc as any)?.depositPaid || 0)
  const subtotal = lineItems.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const discountAmt = subtotal * discountPct / 100
  const total = subtotal - discountAmt + shippingCost
  const balanceDue = total - depositPaid

  const handleSave = async () => {
    if (!form.clientName.trim()) { setError('Client name is required'); return }
    if (!form.docNumber.trim()) { setError('Document number is required'); return }
    setSaving(true)
    setError('')
    try {
      const url = editDoc
        ? `/api/admin/orders/documents/${editDoc.id}`
        : '/api/admin/orders/documents'
      const method = editDoc ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, type: docType, lineItems, discountPct, shippingCost, shippingMethod, trackingNumber, depositPaid, paymentMethod: form.paymentMethod }),
      })
      if (res.ok) { onCreated(await res.json()); onClose() }
      else setError('Failed to save — please try again')
    } catch { setError('Network error — please try again') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold">{editDoc ? `Edit ${cfg.singularLabel}` : `Create ${cfg.singularLabel}`}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {prefilledClient && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2.5 rounded-lg text-sm">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              <span>Compiled from <strong>{prefilledItems?.length} back order{prefilledItems?.length !== 1 ? 's' : ''}</strong> for <strong>{prefilledClient.name}</strong> — review and add a document number to save.</span>
            </div>
          )}
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
            {clients.length > 0 && (
              <div className="mb-3">
                <ClientAutofill
                  clients={clients}
                  onSelect={(c) => {
                    setField('clientName', `${c.firstName} ${c.lastName}`.trim())
                    setField('clientEmail', c.email)
                    setField('clientPhone', c.phone)
                    setField('clientAddress', c.companyAddress || '')
                  }}
                />
              </div>
            )}
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
              <div className="flex items-center gap-3">
                {/* Price mode selector */}
                <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
                  {([
                    { key: 'retail', label: 'Retail' },
                    { key: 'cost', label: 'Cost' },
                    { key: 'preorder', label: 'Pre-Order' },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => changePriceMode(key)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        priceMode === key
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button onClick={addLine} className="text-xs text-blue-600 hover:text-blue-800 font-semibold">+ Add Line</button>
              </div>
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
                        <SkuLineInput value={li.description} onChange={(v) => updateLine(li.id, 'description', v)} products={modalProducts} onSelectProduct={(sku, title, price, costPerItem, preOrderPrice, stockQty) => { updateLine(li.id, 'description', sku ? `${sku} – ${title}` : title); const autoPrice = priceMode === 'cost' ? (costPerItem || price) : priceMode === 'preorder' ? (preOrderPrice > 0 ? preOrderPrice : price) : price; updateLine(li.id, 'unitPrice', autoPrice); if (preOrderPrice > 0) updateLine(li.id, '_preOrderPrice', preOrderPrice); updateLine(li.id, '_retailPrice', price); updateLine(li.id, '_costPrice', costPerItem); updateLine(li.id, '_stockQty', stockQty) }} />
                        {(li._retailPrice || li._costPrice || li._preOrderPrice) && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {li._retailPrice ? <button type="button" onClick={() => updateLine(li.id, 'unitPrice', li._retailPrice!)} className={`text-[10px] px-1.5 py-0.5 rounded font-medium border transition-colors ${li.unitPrice === li._retailPrice ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-300 hover:border-indigo-400'}`}>Retail R{li._retailPrice.toFixed(2)}</button> : null}
                            {li._preOrderPrice ? <button type="button" onClick={() => updateLine(li.id, 'unitPrice', li._preOrderPrice!)} className={`text-[10px] px-1.5 py-0.5 rounded font-medium border transition-colors ${li.unitPrice === li._preOrderPrice ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-500 border-gray-300 hover:border-amber-400'}`}>Pre-Order R{li._preOrderPrice.toFixed(2)}</button> : null}
                            {li._costPrice ? <button type="button" onClick={() => updateLine(li.id, 'unitPrice', li._costPrice!)} className={`text-[10px] px-1.5 py-0.5 rounded font-medium border transition-colors ${li.unitPrice === li._costPrice ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-500 border-gray-300 hover:border-gray-500'}`}>Cost R{li._costPrice.toFixed(2)}</button> : null}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          min={1}
                          max={enforceStockLimit && li._stockQty !== undefined ? li._stockQty : undefined}
                          className={`w-full px-2 py-1.5 text-sm text-right rounded focus:outline-none focus:bg-blue-50 ${enforceStockLimit && li._stockQty !== undefined && li.qty >= li._stockQty ? 'text-red-600 bg-red-50' : ''}`}
                          value={li.qty}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            const max = enforceStockLimit && li._stockQty !== undefined ? li._stockQty : Infinity
                            updateLine(li.id, 'qty', Math.min(v, max))
                          }}
                        />
                        {enforceStockLimit && li._stockQty !== undefined && li.qty >= li._stockQty && (
                          <div className="text-[10px] text-red-500 font-medium mt-0.5 text-right">{li._stockQty} in stock</div>
                        )}
                      </td>
                      <td className="px-2 py-1"><input type="number" min={0} step={0.01} className="w-full px-2 py-1.5 text-sm text-right rounded focus:outline-none focus:bg-blue-50" value={li.unitPrice} onChange={(e) => updateLine(li.id, 'unitPrice', Number(e.target.value))} /></td>
                      <td className="px-3 py-2 text-right text-gray-600 whitespace-nowrap">{fmtPrice(li.qty * li.unitPrice)}</td>
                      <td className="px-2 py-2 text-center">{lineItems.length > 1 && <button onClick={() => removeLine(li.id)} className="text-gray-300 hover:text-red-500 leading-none">✕</button>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="text-sm">
                  <tr className="border-t bg-gray-50">
                    <td colSpan={3} className="px-3 py-2 text-right text-gray-500">Subtotal</td>
                    <td className="px-3 py-2 text-right font-medium">{fmtPrice(subtotal)}</td><td />
                  </tr>
                  {/* Rule 5 — Shipping & Discounts: only shown when rule is active */}
                  {shippingEnabled ? (<>
                    <tr className="bg-gray-50">
                      <td colSpan={2} className="px-3 py-1.5 text-right text-gray-500 text-xs">Discount %</td>
                      <td className="px-2 py-1">
                        <input type="number" min={0} max={100} step={0.5}
                          className="w-full px-2 py-1 text-sm text-right rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-300"
                          value={discountPct}
                          onChange={(e) => setDiscountPct(Math.max(0, Math.min(100, Number(e.target.value))))}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right text-red-500 font-medium">
                        {discountPct > 0 ? `-${fmtPrice(discountAmt)}` : '—'}
                      </td>
                      <td />
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-3 py-1.5 text-right text-gray-500 text-xs">Shipping</td>
                      <td className="px-2 py-1">
                        <select
                          className="w-full px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
                          value={shippingMethod}
                          onChange={(e) => setShippingMethod(e.target.value)}
                        >
                          <option value="">— None —</option>
                          <option value="Pudo Locker-to-Locker">Pudo Locker-to-Locker</option>
                          <option value="Pudo Door-to-Door">Pudo Door-to-Door</option>
                          <option value="The Courier Guy">The Courier Guy</option>
                          <option value="Fastway Courier">Fastway Courier</option>
                          <option value="Aramex">Aramex</option>
                          <option value="PostNet-to-PostNet">PostNet-to-PostNet</option>
                          <option value="Collection">Collection (Self-Collect)</option>
                          <option value="Other">Other</option>
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" min={0} step={0.01}
                          className="w-full px-2 py-1 text-sm text-right rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-300"
                          placeholder="0.00"
                          value={shippingCost || ''}
                          onChange={(e) => setShippingCost(Math.max(0, Number(e.target.value)))}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right text-gray-700 font-medium">
                        {shippingCost > 0 ? fmtPrice(shippingCost) : '—'}
                      </td>
                      <td />
                    </tr>
                    {shippingMethod && shippingMethod !== 'Collection' && (
                      <tr className="bg-gray-50">
                        <td className="px-3 py-1.5 text-right text-gray-400 text-xs">Tracking #</td>
                        <td colSpan={2} className="px-2 py-1">
                          <input
                            type="text"
                            placeholder="Enter tracking number"
                            className="w-full px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-300"
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right text-xs text-gray-400">
                          {trackingNumber ? '✓' : ''}
                        </td>
                        <td />
                      </tr>
                    )}
                  </>) : (
                    <tr className="bg-amber-50">
                      <td colSpan={5} className="px-3 py-2 text-xs text-amber-700 font-medium text-center">
                        Rule 5 inactive — Shipping &amp; Discounts are disabled. Enable in Site Rules to add these fields.
                      </td>
                    </tr>
                  )}
                  {/* Rule 3 — Stock Deduction: show warning when inactive */}
                  {!stockDeductionEnabled && (docType === 'invoice' || docType === 'salesorder') && (
                    <tr className="bg-orange-50">
                      <td colSpan={5} className="px-3 py-2 text-xs text-orange-700 font-medium text-center">
                        Rule 3 inactive — Stock will NOT be deducted when this document is saved.
                      </td>
                    </tr>
                  )}
                  <tr className="border-t bg-blue-50">
                    <td colSpan={3} className="px-3 py-2.5 text-right font-bold text-blue-800">Total</td>
                    <td className="px-3 py-2.5 text-right font-bold text-blue-800">{fmtPrice(total)}</td><td />
                  </tr>
                  <tr className="bg-gray-50">
                    <td colSpan={2} className="px-3 py-1.5 text-right text-gray-500 text-xs">Deposit Paid</td>
                    <td className="px-2 py-1">
                      <input type="number" min={0} step={0.01}
                        className="w-full px-2 py-1 text-sm text-right rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-300"
                        value={depositPaid}
                        onChange={(e) => setDepositPaid(Math.max(0, Number(e.target.value)))}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right text-green-600 font-medium">
                      {depositPaid > 0 ? `-${fmtPrice(depositPaid)}` : '—'}
                    </td>
                    <td />
                  </tr>
                  {depositPaid > 0 && (
                    <tr className="border-t bg-orange-50">
                      <td colSpan={3} className="px-3 py-2.5 text-right font-bold text-orange-700">Balance Due</td>
                      <td className="px-3 py-2.5 text-right font-bold text-orange-700">{fmtPrice(balanceDue)}</td><td />
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Notes</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" rows={3} value={form.notes} onChange={(e) => setField('notes', e.target.value)} /></div>
            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Terms &amp; Conditions</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" rows={3} value={form.terms} onChange={(e) => setField('terms', e.target.value)} /></div>
          </div>

          <div className="flex gap-4">
            <div className="w-44">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Status</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="complete">Complete</option>
              </select>
            </div>
            {docType === 'invoice' && (
              <div className="w-44">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Payment Method</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={form.paymentMethod} onChange={(e) => setField('paymentMethod', e.target.value)}>
                  <option value="">— Select —</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="EFT">EFT</option>
                  <option value="Snapscan">Snapscan</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
              {saving ? 'Saving...' : editDoc ? `Update ${cfg.singularLabel}` : `Save ${cfg.singularLabel}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Document Print / Email Utilities ─────────────────────────────────────────

function generateDocHTML(data: DocViewData, template: OrderTemplate): string {
  const docTitle = data.docType === 'quote' ? 'QUOTE' : data.docType === 'salesorder' ? 'SALES ORDER' : 'INVOICE'
  const subtotal = data.lineItems.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const discountAmt = subtotal * (data.discountPct || 0) / 100
  const shippingHTML = data.shippingCost || 0
  const total = subtotal - discountAmt + shippingHTML
  const depositHTML = data.depositPaid || 0
  const balanceDueHTML = total - depositHTML
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
      ${((data.discountPct || 0) > 0 || shippingHTML > 0) ? `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f3f4f6"><span style="color:#6b7280">Subtotal</span><span style="font-weight:500">${fmtPrice(subtotal)}</span></div>` : ''}
      ${(data.discountPct || 0) > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f3f4f6"><span style="color:#ef4444">Discount (${data.discountPct}%)</span><span style="font-weight:500;color:#ef4444">-${fmtPrice(discountAmt)}</span></div>` : ''}
      ${shippingHTML > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f3f4f6"><span style="color:#6b7280">Shipping${data.shippingMethod ? ` (${data.shippingMethod})` : ''}</span><span style="font-weight:500">${fmtPrice(shippingHTML)}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;padding:8px 12px;margin-top:4px;background:#1f2937;color:white;border-radius:8px;font-weight:700"><span>TOTAL</span><span>${fmtPrice(total)}</span></div>
      ${depositHTML > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:4px 0;margin-top:4px;border-bottom:1px solid #f3f4f6"><span style="color:#6b7280">Deposit Paid</span><span style="font-weight:500;color:#16a34a">-${fmtPrice(depositHTML)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 12px;margin-top:4px;background:#ea580c;color:white;border-radius:8px;font-weight:700"><span>BALANCE DUE</span><span>${fmtPrice(balanceDueHTML)}</span></div>
      ` : ''}
    </div>
  </div>
  ${(data.shippingMethod || data.trackingNumber) ? `<div style="margin-bottom:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">${data.shippingMethod ? `<span style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase">Shipping:</span><span style="font-size:12px;font-weight:600;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:2px 10px;border-radius:99px">${data.shippingMethod}</span>` : ''}${data.trackingNumber ? `<span style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-left:8px">Tracking:</span><span style="font-size:12px;font-weight:600;background:#f3f4f6;color:#374151;font-family:monospace;padding:2px 10px;border-radius:99px">${data.trackingNumber}</span>` : ''}</div>` : ''}
  ${data.paymentMethod ? `<div style="margin-bottom:12px;display:flex;align-items:center;gap:8px"><span style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase">Payment Method:</span><span style="font-size:12px;font-weight:600;background:#f3f4f6;color:#374151;padding:2px 10px;border-radius:99px">${data.paymentMethod}</span></div>` : ''}
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
  const discountAmt = subtotal * (data.discountPct || 0) / 100
  const shippingEmail = data.shippingCost || 0
  const total = subtotal - discountAmt + shippingEmail
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
    ...((data.discountPct || 0) > 0 || shippingEmail > 0 ? [`Subtotal:  ${fmtPrice(subtotal)}`] : []),
    ...((data.discountPct || 0) > 0 ? [`Discount (${data.discountPct}%):  -${fmtPrice(discountAmt)}`] : []),
    ...(shippingEmail > 0 ? [`Shipping${data.shippingMethod ? ` (${data.shippingMethod})` : ''}:  ${fmtPrice(shippingEmail)}`] : []),
    `TOTAL:  ${fmtPrice(total)}`,
    ...((data.depositPaid || 0) > 0 ? [`Deposit Paid:  -${fmtPrice(data.depositPaid)}`, `BALANCE DUE:  ${fmtPrice(total - (data.depositPaid || 0))}`] : []),
    ...(data.shippingMethod ? [`Shipping via:  ${data.shippingMethod}`] : []),
    ...(data.trackingNumber ? [`Tracking #:  ${data.trackingNumber}`] : []),
    ...(data.paymentMethod ? [`Payment Method:  ${data.paymentMethod}`] : []),
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

async function doDownload(data: DocViewData, template: OrderTemplate) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 18
  const col2 = pageW / 2 + 5
  let y = 18

  const docTitle = data.docType === 'quote' ? 'QUOTE' : data.docType === 'salesorder' ? 'SALES ORDER' : 'INVOICE'
  const subtotal = data.lineItems.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const discountAmt = subtotal * (data.discountPct || 0) / 100
  const shippingPDF = data.shippingCost || 0
  const total = subtotal - discountAmt + shippingPDF

  // ── Logo (top left) ──────────────────────────────────────────────────────────
  if (template.logoUrl) {
    try {
      const res = await fetch(template.logoUrl)
      const blob = await res.blob()
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      const ext = (template.logoUrl.split('.').pop() ?? 'png').toUpperCase()
      const fmt = ext === 'JPG' ? 'JPEG' : ['PNG', 'JPEG', 'WEBP'].includes(ext) ? ext : 'PNG'
      doc.addImage(dataUrl, fmt as 'PNG', margin, y, 0, 16)
    } catch { /* logo optional */ }
  }

  // ── Doc title block (top right) ──────────────────────────────────────────────
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(31, 41, 55)
  doc.text(docTitle, pageW - margin, y + 6, { align: 'right' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(50)
  doc.text(data.docNumber, pageW - margin, y + 13, { align: 'right' })

  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(fmtDateLong(data.date), pageW - margin, y + 19, { align: 'right' })

  y += 30

  // ── Brand image block (matches modal preview) ─────────────────────────────
  const activeImages = (template.imageBlock ?? []).filter(Boolean)
  if (activeImages.length > 0) {
    const gap = 4
    const imgW = (pageW - margin * 2 - gap * (activeImages.length - 1)) / activeImages.length
    const imgH = Math.round(imgW * (9 / 16))
    let ix = margin
    for (const url of activeImages) {
      try {
        const res = await fetch(url)
        const blob = await res.blob()
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
        const ext = (url.split('.').pop() ?? 'png').toUpperCase().split('?')[0]
        const fmt = ext === 'JPG' ? 'JPEG' : ['PNG', 'JPEG', 'WEBP'].includes(ext) ? ext : 'PNG'
        doc.addImage(dataUrl, fmt as 'PNG', ix, y, imgW, imgH, undefined, 'FAST')
      } catch { /* skip failed image */ }
      ix += imgW + gap
    }
    y += imgH + 8
  }

  // ── Divider ──────────────────────────────────────────────────────────────────
  doc.setDrawColor(220)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y)
  y += 6

  // ── From / Bill To ───────────────────────────────────────────────────────────
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(160)
  doc.text('FROM', margin, y)
  doc.text('BILL TO', col2, y)
  y += 4

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30)
  doc.text(template.companyName || 'R66 Slot', margin, y)
  doc.text(data.clientName, col2, y)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80)

  let fromY = y + 5
  if (template.companyAddress) {
    const lines = doc.splitTextToSize(template.companyAddress, pageW / 2 - margin - 5)
    doc.text(lines, margin, fromY); fromY += lines.length * 4.5
  }
  if (template.companyVAT) { doc.text(`VAT: ${template.companyVAT}`, margin, fromY); fromY += 4.5 }
  if (template.companyPhone) { doc.text(`Tel: ${template.companyPhone}`, margin, fromY); fromY += 4.5 }
  if (template.companyEmail) { doc.text(template.companyEmail, margin, fromY); fromY += 4.5 }

  let toY = y + 5
  if (data.clientEmail) { doc.text(data.clientEmail, col2, toY); toY += 4.5 }
  if (data.clientPhone) { doc.text(data.clientPhone, col2, toY); toY += 4.5 }
  if (data.clientAddress) {
    const lines = doc.splitTextToSize(data.clientAddress, pageW / 2 - margin - 5)
    doc.text(lines, col2, toY); toY += lines.length * 4.5
  }

  y = Math.max(fromY, toY) + 8

  // ── Line items table ─────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    head: [['#', 'Description', 'Qty', 'Unit Price', 'Total']],
    body: data.lineItems.map((li, i) => [
      i + 1,
      li.description || '—',
      li.qty,
      fmtPrice(li.unitPrice),
      fmtPrice(li.qty * li.unitPrice),
    ]),
    foot: [
      ...((data.discountPct || 0) > 0 || shippingPDF > 0 ? [
        ['', '', '', 'Subtotal', fmtPrice(subtotal)],
      ] : []),
      ...((data.discountPct || 0) > 0 ? [
        ['', '', '', `Discount (${data.discountPct}%)`, `-${fmtPrice(discountAmt)}`],
      ] : []),
      ...(shippingPDF > 0 ? [
        ['', '', '', `Shipping${data.shippingMethod ? ` (${data.shippingMethod})` : ''}`, fmtPrice(shippingPDF)],
      ] : []),
      ['', '', '', 'TOTAL', fmtPrice(total)],
      ...((data.depositPaid || 0) > 0 ? [
        ['', '', '', 'Deposit Paid', `-${fmtPrice(data.depositPaid || 0)}`],
        ['', '', '', 'BALANCE DUE', fmtPrice(total - (data.depositPaid || 0))],
      ] : []),
    ],
    headStyles: { fillColor: [31, 41, 55], fontSize: 8, fontStyle: 'bold', textColor: 255 },
    bodyStyles: { fontSize: 8.5, textColor: [40, 40, 40] },
    footStyles: { fontSize: 8.5, textColor: [80, 80, 80], fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      2: { halign: 'right', cellWidth: 12 },
      3: { halign: 'right', cellWidth: 38 },
      4: { halign: 'right', cellWidth: 38, fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
    didParseCell(hookData) {
      const hasSubtotal = (data.discountPct || 0) > 0 || shippingPDF > 0
      const hasDiscount = (data.discountPct || 0) > 0
      const hasShipping = shippingPDF > 0
      const subtotalIdx = 0
      const discountIdx = hasSubtotal ? 1 : 0
      const shippingIdx = (hasSubtotal ? 1 : 0) + (hasDiscount ? 1 : 0)
      const preRows = (hasSubtotal ? 1 : 0) + (hasDiscount ? 1 : 0) + (hasShipping ? 1 : 0)
      const footLen = preRows + 1 + ((data.depositPaid || 0) > 0 ? 2 : 0)
      const totalIdx = preRows
      const balanceIdx = (data.depositPaid || 0) > 0 ? footLen - 1 : -1
      if (hookData.section !== 'foot') return
      // Subtotal row — grey text
      if (hasSubtotal && hookData.row.index === subtotalIdx) {
        hookData.cell.styles.textColor = [107, 114, 128]
      }
      // Discount row — red text
      if (hasDiscount && hookData.row.index === discountIdx) {
        hookData.cell.styles.textColor = [239, 68, 68]
      }
      // Shipping row — grey text
      if (hasShipping && hookData.row.index === shippingIdx) {
        hookData.cell.styles.textColor = [107, 114, 128]
      }
      // TOTAL row — dark fill, white text
      if (hookData.row.index === totalIdx) {
        hookData.cell.styles.fillColor = [31, 41, 55]
        hookData.cell.styles.textColor = [255, 255, 255]
        hookData.cell.styles.fontStyle = 'bold'
      }
      // BALANCE DUE row — orange fill, white text
      if (hookData.row.index === balanceIdx) {
        hookData.cell.styles.fillColor = [234, 88, 12]
        hookData.cell.styles.textColor = [255, 255, 255]
        hookData.cell.styles.fontStyle = 'bold'
      }
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8

  // ── Notes ────────────────────────────────────────────────────────────────────
  if (data.notes) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(150)
    doc.text('NOTES', margin, y)
    y += 4
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(70)
    const noteLines = doc.splitTextToSize(data.notes, pageW - margin * 2)
    doc.text(noteLines, margin, y)
    y += noteLines.length * 4.5 + 6
  }

  // ── Shipping info ────────────────────────────────────────────────────────────
  if (data.shippingMethod || data.trackingNumber) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(70)
    const parts: string[] = []
    if (data.shippingMethod) parts.push(`Shipping: ${data.shippingMethod}`)
    if (data.trackingNumber) parts.push(`Tracking #: ${data.trackingNumber}`)
    doc.text(parts.join('   |   '), margin, y); y += 6
  }

  // ── Banking ──────────────────────────────────────────────────────────────────
  if (template.bankName) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(29, 78, 216)
    doc.text('BANKING DETAILS', margin, y)
    y += 4
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(50)
    doc.text(`Bank: ${template.bankName}   |   Account: ${template.bankAccount}`, margin, y); y += 4.5
    doc.text(`Branch Code: ${template.bankBranch}   |   Account Type: ${template.bankType}`, margin, y); y += 8
  }

  // ── Terms ────────────────────────────────────────────────────────────────────
  if (data.terms) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(150)
    doc.text('TERMS & CONDITIONS', margin, y)
    y += 4
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120)
    const termLines = doc.splitTextToSize(data.terms, pageW - margin * 2)
    doc.text(termLines, margin, y)
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  if (template.footerText) {
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160)
    doc.text(template.footerText, pageW / 2, pageH - 10, { align: 'center' })
  }

  doc.save(`${data.docNumber}.pdf`)
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

// ─── Actions Dropdown ──────────────────────────────────────────────────────────

type ActionItem =
  | { label: string; icon?: React.ReactNode; onClick: () => void; className?: string; disabled?: boolean }
  | 'separator'

function ActionsDropdown({ items }: { items: ActionItem[] }) {
  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])
  function handleToggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setDropUp(window.innerHeight - rect.bottom < 200)
    }
    setOpen((v) => !v)
  }
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button ref={btnRef} onClick={handleToggle} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 shadow-sm whitespace-nowrap">
        Actions <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div ref={menuRef} className={`fixed z-[200] bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[170px]`}
          style={(() => {
            if (!btnRef.current) return {}
            const r = btnRef.current.getBoundingClientRect()
            return dropUp
              ? { bottom: window.innerHeight - r.top + 4, right: window.innerWidth - r.right }
              : { top: r.bottom + 4, right: window.innerWidth - r.right }
          })()}
        >
          {items.map((item, i) =>
            item === 'separator' ? (
              <div key={i} className="border-t border-gray-100 my-1" />
            ) : (
              <button key={i} onClick={() => { item.onClick(); setOpen(false) }} disabled={item.disabled}
                className={`w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-40 ${item.className || 'text-gray-700'}`}>
                {item.icon && <span className="flex-shrink-0 w-4">{item.icon}</span>}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [backorders, setBackorders] = useState<Backorder[]>([])
  const [documents, setDocuments] = useState<OrderDocument[]>([])
  const [template, setTemplate] = useState<OrderTemplate>(DEFAULT_TEMPLATE)
  const [clients, setClients] = useState<ClientContact[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('backorders')
  const [docSortBy, setDocSortBy] = useState<string>('date')
  const [docSortDir, setDocSortDir] = useState<'asc' | 'desc'>('desc')
  const { widths: docColW, setWidth: setDocWidth } = useColumnResize('orders-docs', {
    docNumber: 100, date: 90, client: 150, description: 160, total: 90, status: 90, source: 90,
  })
  const [showTemplate, setShowTemplate] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showPL, setShowPL] = useState(true)
  const [compileDocType, setCompileDocType] = useState<DocType>('quote')
  const [compileClient, setCompileClient] = useState<{ name: string; email: string; phone: string; address: string; items: LineItem[] } | null>(null)
  // Groups the user has explicitly opened — starts empty (all collapsed). Never reset on focus reload.
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [viewData, setViewData] = useState<DocViewData | null>(null)
  const [editDocState, setEditDocState] = useState<OrderDocument | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [checkedBoIds, setCheckedBoIds] = useState<Set<string>>(new Set())
  const [pendingInvoiceBoIds, setPendingInvoiceBoIds] = useState<string[]>([])
  const [syncingInventory, setSyncingInventory] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [renumberingSODocs, setRenumberingSODocs] = useState(false)
  const [renumberSOResult, setRenumberSOResult] = useState<string | null>(null)
  const [shippingEnabled, setShippingEnabled] = useState(true)
  const [stockDeductionEnabled, setStockDeductionEnabled] = useState(true)
  const [showArchive, setShowArchive] = useState(false)
  const [packingListResult, setPackingListResult] = useState<string | null>(null)
  const [soToInvoiceResult, setSoToInvoiceResult] = useState<string | null>(null)

  const handleSendSOToInvoice = async (doc: OrderDocument) => {
    try {
      const existingRaw = await fetch('/api/admin/orders/documents?type=invoice').then((r) => r.ok ? r.json() : [])
      const existing: any[] = Array.isArray(existingRaw) ? existingRaw : []
      const nums = existing
        .map((d: any) => { const m = /^INV(\d+)$/.exec(d.docNumber || ''); return m ? parseInt(m[1], 10) : 0 })
        .filter((n: number) => n > 0)
      const next = (nums.length > 0 ? Math.max(...nums) : 25) + 1
      const newDocNumber = `INV${String(next).padStart(4, '0')}`

      const res = await fetch('/api/admin/orders/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'invoice',
          docNumber: newDocNumber,
          date: new Date().toISOString().split('T')[0],
          clientName: doc.clientName || 'Unknown',
          clientEmail: doc.clientEmail || '',
          clientPhone: doc.clientPhone || '',
          clientAddress: doc.clientAddress || '',
          lineItems: doc.lineItems || [],
          notes: doc.notes || '',
          terms: doc.terms || '',
          status: 'draft',
          discountPct: (doc as any).discountPct || 0,
          shippingMethod: (doc as any).shippingMethod || '',
          shippingCost: (doc as any).shippingCost || 0,
          trackingNumber: (doc as any).trackingNumber || '',
          stockAlreadyReserved: true,
        }),
      })
      if (res.ok) {
        const newInvoice = await res.json()
        setDocuments((prev) => [newInvoice, ...prev])
        setSoToInvoiceResult(`✓ ${doc.docNumber} → ${newDocNumber}`)
        setTimeout(() => setSoToInvoiceResult(null), 4000)
      } else {
        const errData = await res.json().catch(() => ({}))
        setSoToInvoiceResult(`Error: ${errData.error || res.status}`)
        setTimeout(() => setSoToInvoiceResult(null), 5000)
      }
    } catch (e: any) {
      setSoToInvoiceResult(`Error: ${e?.message || 'unknown'}`)
      setTimeout(() => setSoToInvoiceResult(null), 5000)
    }
  }

  const handleSendToPackingList = async (doc: OrderDocument) => {
    try {
      const res = await fetch('/api/admin/shipment-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: doc.docNumber,
          name: doc.clientName,
        }),
      })
      if (res.ok) {
        setPackingListResult(`✓ ${doc.docNumber} sent to Packing List`)
        setTimeout(() => setPackingListResult(null), 4000)
      } else {
        setPackingListResult('Error sending to Packing List')
        setTimeout(() => setPackingListResult(null), 3000)
      }
    } catch {
      setPackingListResult('Error sending to Packing List')
      setTimeout(() => setPackingListResult(null), 3000)
    }
  }

  const handleSyncInventory = async () => {
    setSyncingInventory(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/admin/orders/documents/sync-inventory', { method: 'POST' })
      const data = await res.json()
      setSyncResult(data.message || 'Done')
      setTimeout(() => setSyncResult(null), 5000)
      load()
    } catch {
      setSyncResult('Sync failed — please try again')
      setTimeout(() => setSyncResult(null), 4000)
    } finally {
      setSyncingInventory(false)
    }
  }

  const [plProducts, setPlProducts] = useState<Array<{ sku: string; costPerItem: number }>>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [boRes, docRes, tmplRes, clRes, contactRes, prodRes, rulesRes] = await Promise.all([
        fetch('/api/admin/backorders'),
        fetch('/api/admin/orders/documents'),
        fetch('/api/admin/orders/template'),
        fetch('/api/admin/clients'),
        fetch('/api/admin/contacts'),
        fetch('/api/admin/products'),
        fetch('/api/admin/site-rules'),
      ])
      if (boRes.ok) {
        const bos: Backorder[] = await boRes.json()
        setBackorders(bos)
        // openGroups is intentionally NOT reset here — preserves user's open/closed state across focus reloads
      }
      if (docRes.ok) setDocuments(await docRes.json())
      if (tmplRes.ok) {
        const t = await tmplRes.json()
        setTemplate({ ...DEFAULT_TEMPLATE, ...t, imageBlock: t.imageBlock?.length === 6 ? t.imageBlock : ['', '', '', '', '', ''] })
      }
      // Merge clients + contacts for autofill
      const clList: ClientContact[] = clRes.ok ? await clRes.json() : []
      const ctList: any[] = contactRes.ok ? await contactRes.json() : []
      const emailSet = new Set(clList.map((c) => c.email?.toLowerCase()).filter(Boolean))
      for (const ct of ctList) {
        if (!ct.firstName && !ct.lastName) continue
        if (ct.email && emailSet.has(ct.email.toLowerCase())) continue
        clList.push({ id: ct.id, firstName: ct.firstName || '', lastName: ct.lastName || '', email: ct.email || '', phone: ct.phone || '', companyName: ct.companyName || '', companyAddress: ct.companyAddress || '' })
        if (ct.email) emailSet.add(ct.email.toLowerCase())
      }
      clList.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
      setClients(clList)
      if (prodRes.ok) {
        const prods: any[] = await prodRes.json()
        setPlProducts(prods.filter((p) => p.sku).map((p) => ({ sku: p.sku || '', costPerItem: Number(p.cost_per_item ?? p.costPerItem) || 0 })))
      }
      if (rulesRes.ok) {
        const rules: any[] = await rulesRes.json()
        const shipRule = rules.find((r: any) => r.id === 'document_shipping')
        const stockRule = rules.find((r: any) => r.id === 'invoice_stock_deduction')
        setShippingEnabled(shipRule ? shipRule.active !== false : true)
        setStockDeductionEnabled(stockRule ? stockRule.active !== false : true)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    window.addEventListener('focus', load)
    return () => window.removeEventListener('focus', load)
  }, [load])

  const cfg = tab !== 'backorders' ? TAB_CFG[tab] : TAB_CFG.quotes // fallback, not used when tab=backorders

  const boRows = tab !== 'backorders' ? backorders.filter(cfg.boPhase) : []
  const docRows = tab !== 'backorders'
    ? documents
        .filter((d) => d.type === cfg.docType && (showArchive ? d.status === 'archived' : d.status !== 'archived'))
        .sort((a, b) => {
          let av: string | number = ''
          let bv: string | number = ''
          if      (docSortBy === 'docNumber') { av = a.docNumber || ''; bv = b.docNumber || '' }
          else if (docSortBy === 'date')      { av = a.date || ''; bv = b.date || '' }
          else if (docSortBy === 'client')    { av = a.clientName || ''; bv = b.clientName || '' }
          else if (docSortBy === 'total')     {
            av = a.lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0)
            bv = b.lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0)
          }
          else if (docSortBy === 'status')    { av = a.status || ''; bv = b.status || '' }
          const cmp = typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av).localeCompare(String(bv))
          return docSortDir === 'asc' ? cmp : -cmp
        })
    : []
  const totalCount = boRows.length + docRows.length

  const grandTotal =
    boRows.reduce((s, b) => s + b.price * b.qty, 0) +
    docRows.reduce((s, d) => {
      const sub = d.lineItems.reduce((ls, li) => ls + li.qty * li.unitPrice, 0)
      const disc = sub * ((d as any).discountPct || 0) / 100
      const ship = (d as any).shippingCost || 0
      return s + sub - disc + ship
    }, 0)

  // Group all active backorders by client — use email (lowercase) as key for reliable deduplication
  const backordersByClient: Record<string, { displayName: string; email: string; phone: string; items: Backorder[] }> = {}
  for (const b of backorders) {
    if (b.status === 'cancelled') continue
    const key = b.clientEmail?.toLowerCase().trim() || b.clientId || b.clientName || 'Unknown Client'
    if (!backordersByClient[key]) {
      backordersByClient[key] = { displayName: b.clientName || key, email: b.clientEmail || '', phone: b.clientPhone || '', items: [] }
    } else if (b.clientName && !backordersByClient[key].displayName) {
      backordersByClient[key].displayName = b.clientName
    }
    backordersByClient[key].items.push(b)
  }

  const tabCounts = {
    backorders: backorders.filter((b) => b.status !== 'cancelled').length,
    quotes: backorders.filter(TAB_CFG.quotes.boPhase).length + documents.filter((d) => d.type === 'quote').length,
    salesorders: backorders.filter(TAB_CFG.salesorders.boPhase).length + documents.filter((d) => d.type === 'salesorder').length,
    invoices: backorders.filter(TAB_CFG.invoices.boPhase).length + documents.filter((d) => d.type === 'invoice').length,
  }

  // ── Profit & Loss (Invoices only) ──────────────────────────────────────────
  const invoiceDocs = documents.filter((d) => d.type === 'invoice')
  const paidInvoices = invoiceDocs.filter((d) => d.status === 'paid' || d.status === 'complete')
  const docRevenue = (doc: OrderDocument) => {
    const sub = doc.lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0)
    const disc = sub * ((doc as any).discountPct || 0) / 100
    const ship = (doc as any).shippingCost || 0
    const dep = (doc as any).depositPaid || 0
    return sub - disc + ship - dep
  }
  const plRevenue = paidInvoices.reduce((s, d) => s + docRevenue(d), 0)
  const plOutstanding = invoiceDocs
    .filter((d) => d.status === 'draft' || d.status === 'sent')
    .reduce((s, d) => s + docRevenue(d), 0)
  const plCogs = paidInvoices.reduce((s, doc) =>
    s + doc.lineItems.reduce((ls, li) => {
      const sku = li.description.split(' – ')[0].trim()
      const prod = plProducts.find((p) => p.sku.trim().toLowerCase() === sku.toLowerCase())
      return ls + li.qty * (prod?.costPerItem || 0)
    }, 0)
  , 0)
  const plGrossProfit = plRevenue - plCogs
  const plMargin = plRevenue > 0 ? (plGrossProfit / plRevenue) * 100 : 0
  const plTotalRevenue = invoiceDocs.reduce((s, d) => s + docRevenue(d), 0)

  const handleCompile = (groupKey: string, docType: DocType) => {
    const group = backordersByClient[groupKey]
    if (!group) return
    setCompileDocType(docType)
    setCompileClient({
      name: group.displayName,
      email: group.email,
      phone: group.phone,
      address: group.items[0]?.companyAddress || '',
      items: group.items.map((b) => ({
        id: `li_${b.id}`,
        description: `${b.sku ? b.sku + ' – ' : ''}${b.description}`,
        qty: b.qty,
        unitPrice: b.price,
      })),
    })
    setShowCreate(true)
  }

  const handleSendToInvoice = (groupKey: string) => {
    const group = backordersByClient[groupKey]
    if (!group) return
    const checked = group.items.filter((b) => checkedBoIds.has(b.id))
    if (checked.length === 0) return
    setPendingInvoiceBoIds(checked.map((b) => b.id))
    setCompileDocType('invoice')
    setCompileClient({
      name: group.displayName,
      email: group.email,
      phone: group.phone,
      address: group.items[0]?.companyAddress || '',
      items: checked.map((b) => ({
        id: `li_${b.id}`,
        description: `${b.sku ? b.sku + ' – ' : ''}${b.description}`,
        qty: b.qty,
        unitPrice: b.price,
      })),
    })
    setShowCreate(true)
  }

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Build DocViewData from a backorder row (current tab context)
  const boToViewData = useCallback((b: Backorder): DocViewData => {
    const c = TAB_CFG[tab === 'backorders' ? 'quotes' : tab]
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
      discountPct: 0,
      shippingCost: 0,
      shippingMethod: '',
      trackingNumber: '',
      depositPaid: 0,
      paymentMethod: '',
    }
  }, [tab, template])

  // Build DocViewData from a standalone document
  const docToViewData = (doc: OrderDocument): DocViewData => ({
    docType: doc.type, docNumber: doc.docNumber, date: doc.date,
    clientName: doc.clientName, clientEmail: doc.clientEmail,
    clientPhone: doc.clientPhone, clientAddress: doc.clientAddress,
    lineItems: doc.lineItems, notes: doc.notes, terms: doc.terms, status: doc.status,
    discountPct: (doc as any).discountPct || 0,
    shippingCost: (doc as any).shippingCost || 0,
    shippingMethod: (doc as any).shippingMethod || '',
    trackingNumber: (doc as any).trackingNumber || '',
    depositPaid: (doc as any).depositPaid || 0,
    paymentMethod: (doc as any).paymentMethod || '',
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
    { key: 'backorders', label: 'Back Orders', icon: '🔄' },
    { key: 'quotes', label: 'Quotes', icon: '📄' },
    { key: 'salesorders', label: 'Sales Orders', icon: '🧾' },
    { key: 'invoices', label: 'Invoices', icon: '💰' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-gray-500 mt-1">Quotes, Sales Orders &amp; Invoices</p>
        </div>
        <div className="flex items-center gap-3 mt-1">
          {syncResult && (
            <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
              ✓ {syncResult}
            </span>
          )}
          {packingListResult && (
            <span className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${packingListResult.startsWith('✓') ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
              {packingListResult}
            </span>
          )}
          {soToInvoiceResult && (
            <span className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${soToInvoiceResult.startsWith('✓') ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
              {soToInvoiceResult}
            </span>
          )}
          <button
            onClick={handleSyncInventory}
            disabled={syncingInventory}
            title="Apply stock deductions for all invoices and sales orders not yet synced"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 shadow-sm disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${syncingInventory ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {syncingInventory ? 'Syncing…' : 'Sync Inventory'}
          </button>
        </div>
      </div>

      {/* Tabs + Actions */}
      <div className="flex items-end justify-between border-b border-gray-200 mb-6">
        <div className="flex">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setShowArchive(false) }}
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
          {tab !== 'backorders' && (
            <button onClick={() => { setCompileClient(null); setShowCreate(true) }} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">{cfg.createLabel}</button>
          )}
        </div>
      </div>

      {/* ── Back Orders Tab ── */}
      {tab === 'backorders' && !loading && (
        <div className="space-y-4">
          {Object.keys(backordersByClient).length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🔄</div>
              <p className="text-lg font-semibold text-gray-600">No active back orders</p>
              <p className="text-sm text-gray-400 mt-1">Add backorders from the Back Orders page.</p>
            </div>
          ) : (
            Object.entries(backordersByClient)
              .sort(([, a], [, b]) => a.displayName.localeCompare(b.displayName))
              .map(([key, group]) => {
                const { displayName, email, items } = group
                const total = items.reduce((s, b) => s + b.price * b.qty, 0)
                const isOpen = openGroups.has(key)
                const groupCheckedCount = items.filter((b) => checkedBoIds.has(b.id)).length
                return (
                  <div key={key} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    {/* Client header — click anywhere to toggle */}
                    <div
                      className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                      onClick={() => toggleGroup(key)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Chevron */}
                        <svg
                          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                        <span className="font-semibold text-gray-900">{displayName}</span>
                        <span className="text-xs text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''} · {fmtPrice(total)}</span>
                        {email && <span className="text-xs text-gray-400 hidden sm:inline">{email}</span>}
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleSendToInvoice(key)}
                          disabled={groupCheckedCount === 0}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                            groupCheckedCount > 0
                              ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                              : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          }`}
                        >
                          {groupCheckedCount > 0 ? `Send to Invoice (${groupCheckedCount})` : 'Send to Invoice'}
                        </button>
                        <span className="text-xs text-gray-400 mr-1">Compile →</span>
                        <button
                          onClick={() => handleCompile(key, 'quote')}
                          className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors"
                        >Quote</button>
                        <button
                          onClick={() => handleCompile(key, 'salesorder')}
                          className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors"
                        >Sales Order</button>
                        <button
                          onClick={() => handleCompile(key, 'invoice')}
                          className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors"
                        >Invoice</button>
                      </div>
                    </div>
                    {/* Line items — only when open */}
                    {isOpen && (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs uppercase tracking-wider text-gray-400 border-b border-gray-100">
                            <th className="text-left px-5 py-2">SKU</th>
                            <th className="text-left px-5 py-2">Description</th>
                            <th className="text-left px-5 py-2">Brand</th>
                            <th className="text-center px-5 py-2">Qty</th>
                            <th className="text-right px-5 py-2">Price</th>
                            <th className="text-right px-5 py-2">Total</th>
                            <th className="text-center px-2 py-2 w-8">☑</th>
                            <th className="text-center px-5 py-2">Status</th>
                            <th className="w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((b) => (
                            <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                              <td className="px-5 py-2.5 font-mono text-xs text-blue-700 font-semibold">{b.sku || '—'}</td>
                              <td className="px-5 py-2.5 text-gray-700 break-words">{b.description}</td>
                              <td className="px-5 py-2.5 text-gray-500 text-xs">{b.brand || '—'}</td>
                              <td className="px-5 py-2.5 text-center text-gray-700">{b.qty}</td>
                              <td className="px-5 py-2.5 text-right text-gray-700">{fmtPrice(b.price)}</td>
                              <td className="px-5 py-2.5 text-right font-semibold">{fmtPrice(b.price * b.qty)}</td>
                              <td className="px-2 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={checkedBoIds.has(b.id)}
                                  onChange={() => setCheckedBoIds((prev) => {
                                    const next = new Set(prev)
                                    if (next.has(b.id)) next.delete(b.id); else next.add(b.id)
                                    return next
                                  })}
                                  className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                                />
                              </td>
                              <td className="px-5 py-2.5 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${BO_STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600'}`}>{b.status}</span>
                              </td>
                              <td className="px-2 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                {deleteConfirm === `bo-${b.id}` ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={async () => {
                                        const res = await fetch(`/api/admin/backorders/${b.id}`, { method: 'DELETE' })
                                        if (res.ok) {
                                          setBackorders((prev) => prev.filter((x) => x.id !== b.id))
                                          setCheckedBoIds((prev) => { const next = new Set(prev); next.delete(b.id); return next })
                                        }
                                        setDeleteConfirm(null)
                                      }}
                                      className="text-xs px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                    >Yes</button>
                                    <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2 py-1 text-gray-400 hover:text-gray-600">No</button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setDeleteConfirm(`bo-${b.id}`)}
                                    className="text-gray-300 hover:text-red-500 transition-colors"
                                    title="Delete item"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )
              })
          )}
        </div>
      )}

      {/* Content */}
      {tab !== 'backorders' && loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : tab !== 'backorders' && totalCount === 0 ? (
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
          {/* ── P&L Summary Cards (Invoices tab only) ── */}
          {tab === 'invoices' && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setShowPL((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                >
                  <svg className={`w-3 h-3 transition-transform ${showPL ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  {showPL ? 'Hide' : 'Show'} P&amp;L
                </button>
              </div>
            {showPL && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Total Invoiced</p>
                  <p className="text-lg font-bold text-gray-800">{fmtPrice(plTotalRevenue)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{invoiceDocs.length} invoice{invoiceDocs.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Collected</p>
                  <p className="text-lg font-bold text-green-700">{fmtPrice(plRevenue)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{paidInvoices.length} paid / complete</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Outstanding</p>
                  <p className="text-lg font-bold text-orange-600">{fmtPrice(plOutstanding)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Draft &amp; sent invoices</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Cost of Goods</p>
                  <p className="text-lg font-bold text-gray-700">{fmtPrice(plCogs)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">From paid invoices</p>
                </div>
                <div className={`border rounded-xl p-4 ${plGrossProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Gross Profit</p>
                  <p className={`text-lg font-bold ${plGrossProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmtPrice(plGrossProfit)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{plGrossProfit >= 0 ? 'Profit' : 'Loss'}</p>
                </div>
                <div className={`border rounded-xl p-4 ${plMargin >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Margin</p>
                  <p className={`text-lg font-bold ${plMargin >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{plMargin.toFixed(1)}%</p>
                  <p className="text-xs text-gray-400 mt-0.5">Gross margin</p>
                </div>
              </div>
            )}
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-500">{totalCount} {showArchive ? 'Archived' : ''} {cfg.label}</p>
              {tab === 'salesorders' && !showArchive && (
                <button
                  onClick={async () => {
                    setRenumberingSODocs(true)
                    setRenumberSOResult(null)
                    try {
                      const res = await fetch('/api/admin/orders/renumber-so', { method: 'POST' })
                      const data = await res.json()
                      if (res.ok) {
                        setRenumberSOResult(`✓ Renumbered ${data.renumbered} Sales Orders`)
                        await load()
                      } else {
                        setRenumberSOResult(`Error: ${data.error}`)
                      }
                    } finally {
                      setRenumberingSODocs(false)
                      setTimeout(() => setRenumberSOResult(null), 3000)
                    }
                  }}
                  disabled={renumberingSODocs}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50"
                >
                  {renumberingSODocs ? '⏳ Renumbering…' : renumberSOResult || '↻ Renumber SO'}
                </button>
              )}
              <button
                onClick={() => setShowArchive((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  showArchive
                    ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" />
                </svg>
                {showArchive ? 'Back to Active' : 'View Archive'}
              </button>
            </div>
            {!showArchive && <p className="text-sm font-semibold text-gray-700">Total (excl. VAT): {fmtPrice(grandTotal)}</p>}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col style={{ width: docColW.docNumber }} />
                  <col style={{ width: docColW.date }} />
                  <col style={{ width: docColW.client }} />
                  <col style={{ width: docColW.description }} />
                  <col style={{ width: docColW.total }} />
                  <col style={{ width: docColW.status }} />
                  <col style={{ width: docColW.source }} />
                  <col style={{ width: 80 }} />
                </colgroup>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider">
                    {(() => {
                      const SortTh = ({ col, label, align = 'left' }: { col: string; label: string; align?: 'left'|'right'|'center' }) => {
                        const active = docSortBy === col
                        return (
                          <th style={{ position: 'relative' }} className={`py-3 px-4 cursor-pointer select-none group whitespace-nowrap text-${align} ${active ? 'text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => { if (active) setDocSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setDocSortBy(col); setDocSortDir('asc') } }}>
                            <span className="inline-flex items-center gap-1">{label}
                              <span className={`transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>{active && docSortDir === 'desc' ? '↑' : '↓'}</span>
                            </span>
                            <div onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); const startX = e.clientX; const startW = (e.currentTarget as HTMLElement).closest('th')?.offsetWidth ?? 100; const onMove = (ev: MouseEvent) => setDocWidth(col, Math.max(40, startW + ev.clientX - startX)); const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp) }} onClick={e => e.stopPropagation()} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/50 select-none z-10" />
                          </th>
                        )
                      }
                      return (
                        <>
                          <SortTh col="docNumber" label="Doc #" />
                          <SortTh col="date" label="Date" />
                          <SortTh col="client" label="Client" />
                          <th className="text-left py-3 px-4 text-gray-500" style={{ position: 'relative' }}>Description<div onMouseDown={(e) => { e.preventDefault(); const startX = e.clientX; const startW = (e.currentTarget as HTMLElement).closest('th')?.offsetWidth ?? docColW.description; const onMove = (ev: MouseEvent) => setDocWidth('description', Math.max(40, startW + ev.clientX - startX)); const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp) }} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/50 select-none z-10" /></th>
                          <SortTh col="total" label="Total" align="right" />
                          <SortTh col="status" label="Status" align="center" />
                          <th className="text-center py-3 px-4 text-gray-500" style={{ position: 'relative' }}>Source<div onMouseDown={(e) => { e.preventDefault(); const startX = e.clientX; const startW = (e.currentTarget as HTMLElement).closest('th')?.offsetWidth ?? docColW.source; const onMove = (ev: MouseEvent) => setDocWidth('source', Math.max(40, startW + ev.clientX - startX)); const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp) }} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/50 select-none z-10" /></th>
                          <th className="text-center py-3 px-4 text-gray-500">Actions</th>
                        </>
                      )
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {/* Backorder-derived rows */}
                  {boRows.map((b) => (
                    <tr key={`bo-${b.id}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-blue-700">{cfg.boDocNum(b)}</td>
                      <td className="py-3 px-4 text-gray-500">{fmtDate(cfg.boDate(b) ?? b.createdAt)}</td>
                      <td className="py-3 px-4 font-medium">{b.clientName}</td>
                      <td className={`py-3 px-4 text-gray-600 break-words ${docColW.description < 120 ? 'text-[10px]' : docColW.description < 155 ? 'text-[11px]' : 'text-xs'}`}>{b.description}</td>
                      <td className="py-3 px-4 text-right font-semibold">{fmtPrice(b.price * b.qty)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${BO_STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600'}`}>{b.status}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Back Order</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <ActionsDropdown items={[
                          { label: 'View', icon: <IconView />, onClick: () => viewBackorder(b) },
                          { label: 'Print', icon: <IconPrint />, onClick: () => doPrint(boToViewData(b), template) },
                          { label: 'Email', icon: <IconEmail />, onClick: () => doEmail(boToViewData(b), template) },
                          { label: 'Download', icon: <IconDownload />, onClick: () => doDownload(boToViewData(b), template) },
                          'separator' as const,
                          { label: 'Push to Sage', onClick: () => {}, disabled: true, className: 'text-gray-400' },
                          'separator' as const,
                          {
                            label: deleteConfirm === b.id ? 'Confirm Delete' : 'Delete',
                            icon: <IconTrash />,
                            className: 'text-red-500',
                            onClick: async () => {
                              if (deleteConfirm === b.id) {
                                const res = await fetch(`/api/admin/backorders/${b.id}`, { method: 'DELETE' })
                                if (res.ok) setBackorders((prev) => prev.filter((x) => x.id !== b.id))
                                setDeleteConfirm(null)
                              } else {
                                setDeleteConfirm(b.id)
                              }
                            },
                          },
                        ]} />
                      </td>
                    </tr>
                  ))}

                  {/* Standalone document rows */}
                  {docRows.map((doc) => {
                    const sub = doc.lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0)
                    const disc = sub * ((doc as any).discountPct || 0) / 100
                    const ship = (doc as any).shippingCost || 0
                    const docTotal = sub - disc + ship
                    const firstDesc = doc.lineItems[0]?.description || '—'
                    return (
                      <tr key={`doc-${doc.id}`} onDoubleClick={() => setEditDocState(doc)} className={`border-b border-gray-100 transition-colors cursor-pointer ${doc.status === 'paid' ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'}`}>
                        <td className="py-3 px-4 font-mono font-semibold text-blue-700">{doc.docNumber}</td>
                        <td className="py-3 px-4 text-gray-500">{fmtDate(doc.date)}</td>
                        <td className="py-3 px-4 font-medium">{doc.clientName}</td>
                        <td className={`py-3 px-4 text-gray-600 break-words ${docColW.description < 120 ? 'text-[10px]' : docColW.description < 155 ? 'text-[11px]' : 'text-xs'}`}>{firstDesc}</td>
                        <td className="py-3 px-4 text-right font-semibold">{fmtPrice(docTotal)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${DOC_STATUS_COLORS[doc.status] ?? 'bg-gray-100 text-gray-600'}`}>{doc.status}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">Standalone</span>
                            {(doc as any).paymentMethod && (
                              <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{(doc as any).paymentMethod}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <ActionsDropdown items={[
                            ...(doc.type === 'invoice' && doc.status !== 'paid' ? [{
                              label: 'Mark as Paid',
                              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                              className: 'text-green-600',
                              onClick: async () => {
                                const res = await fetch(`/api/admin/orders/documents/${doc.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'paid' }) })
                                if (res.ok) setDocuments((prev) => prev.map((d) => d.id === doc.id ? { ...d, status: 'paid' } : d))
                              },
                            }] : []),
                            {
                              label: 'Edit',
                              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
                              onClick: () => setEditDocState(doc),
                            },
                            { label: 'View', icon: <IconView />, onClick: () => viewDocument(doc) },
                            { label: 'Print', icon: <IconPrint />, onClick: () => doPrint(docToViewData(doc), template) },
                            { label: 'Email', icon: <IconEmail />, onClick: () => doEmail(docToViewData(doc), template) },
                            { label: 'Download', icon: <IconDownload />, onClick: () => doDownload(docToViewData(doc), template) },
                            ...(doc.type === 'salesorder' ? [{
                              label: 'Send to Invoice',
                              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
                              className: 'text-indigo-600',
                              onClick: () => handleSendSOToInvoice(doc),
                            }] : []),
                            ...(doc.type === 'invoice' ? [{
                              label: 'Send to Packing List',
                              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12h12L19 8" /></svg>,
                              className: 'text-blue-600',
                              onClick: () => handleSendToPackingList(doc),
                            }] : []),
                            'separator' as const,
                            {
                              label: 'Send to Archive',
                              icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12h12L19 8" /></svg>,
                              className: 'text-gray-500',
                              onClick: async () => {
                                const res = await fetch(`/api/admin/orders/documents/${doc.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'archived' }) })
                                if (res.ok) setDocuments((prev) => prev.map((d) => d.id === doc.id ? { ...d, status: 'archived' } : d))
                              },
                            },
                            { label: 'Push to Sage', onClick: () => {}, disabled: true, className: 'text-gray-400' },
                            'separator' as const,
                            {
                              label: deleteConfirm === doc.id ? 'Confirm Delete' : 'Delete',
                              icon: <IconTrash />,
                              className: 'text-red-500',
                              onClick: () => {
                                if (deleteConfirm === doc.id) {
                                  deleteDocument(doc.id)
                                } else {
                                  setDeleteConfirm(doc.id)
                                }
                              },
                            },
                          ]} />
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
          docType={compileClient ? compileDocType : cfg.docType}
          template={template}
          clients={clients}
          prefilledClient={compileClient ?? undefined}
          prefilledItems={compileClient?.items}
          shippingEnabled={shippingEnabled}
          stockDeductionEnabled={stockDeductionEnabled}
          onCreated={async (doc) => {
            setDocuments((prev) => [doc, ...prev])
            setCompileClient(null)
            if (pendingInvoiceBoIds.length > 0) {
              await Promise.all(
                pendingInvoiceBoIds.map((id) =>
                  fetch(`/api/admin/backorders/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'complete' }),
                  })
                )
              )
              const completed = new Set(pendingInvoiceBoIds)
              setBackorders((prev) => prev.filter((b) => !completed.has(b.id)))
              setCheckedBoIds((prev) => { const next = new Set(prev); completed.forEach((id) => next.delete(id)); return next })
              setPendingInvoiceBoIds([])
            }
          }}
          onClose={() => { setShowCreate(false); setCompileClient(null) }}
        />
      )}
      {viewData && (
        <ViewDocumentModal data={viewData} template={template} onClose={() => setViewData(null)} />
      )}
      {editDocState && (
        <CreateDocumentModal
          docType={editDocState.type}
          template={template}
          clients={clients}
          editDoc={editDocState}
          shippingEnabled={shippingEnabled}
          stockDeductionEnabled={stockDeductionEnabled}
          onCreated={(updated) => {
            setDocuments((prev) => prev.map((d) => d.id === updated.id ? updated : d))
            setEditDocState(null)
          }}
          onClose={() => setEditDocState(null)}
        />
      )}
    </div>
  )
}
