'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type PreOrderItem = {
  id: string
  posterId: string
  sku: string
  itemDescription: string
  brand: string
  price: string
  quantity: number
  totalAmount: string
  customerId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  orderType: 'new-order' | 'pre-order'
  status: string
  estimatedDeliveryDate?: string
  quoteSent?: boolean
  salesOrderSent?: boolean
  invoiceSent?: boolean
  shipped?: boolean
  archivedAt?: string | null
  createdAt: string
}

type DocType = 'quote' | 'sales-order' | 'invoice'

type SortKey = 'customerName' | 'createdAt' | 'brand' | 'price' | 'quantity'
type SortDir = 'asc' | 'desc'

const DOC_LABELS: Record<DocType, string> = {
  'quote': 'Quote',
  'sales-order': 'Sales Order',
  'invoice': 'Invoice',
}

const DOC_NUMBERS: Record<DocType, string> = {
  'quote': 'QUO',
  'sales-order': 'SO',
  'invoice': 'INV',
}

function generateDocNumber(type: DocType, orderId: string) {
  const short = orderId.slice(-6).toUpperCase()
  const date = new Date().getFullYear()
  return `${DOC_NUMBERS[type]}-${date}-${short}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function getDueDate(days = 30) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })
}

function buildDocumentHTML(order: PreOrderItem, type: DocType): string {
  const docNumber = generateDocNumber(type, order.id)
  const today = formatDate(new Date().toISOString())
  const dueDate = getDueDate(30)
  const price = parseFloat(order.price || '0')
  const qty = order.quantity || 1
  const subtotal = price * qty
  const vat = subtotal * 0.15
  const total = subtotal + vat

  const headerColor = type === 'invoice' ? '#dc2626' : type === 'sales-order' ? '#2563eb' : '#16a34a'
  const title = DOC_LABELS[type].toUpperCase()

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title} - ${docNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1f2937; background: #fff; }
  .page { width: 210mm; min-height: 297mm; padding: 20mm; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .brand { font-size: 28px; font-weight: 900; letter-spacing: -1px; }
  .brand-r66 { color: #111827; }
  .brand-slot { color: ${headerColor}; }
  .doc-badge { background: ${headerColor}; color: white; padding: 8px 20px; border-radius: 4px; }
  .doc-badge h1 { font-size: 20px; font-weight: 800; letter-spacing: 2px; }
  .doc-badge p { font-size: 11px; opacity: 0.9; margin-top: 2px; }
  .divider { border: none; border-top: 2px solid ${headerColor}; margin: 20px 0; }
  .two-col { display: flex; gap: 32px; margin-bottom: 24px; }
  .col { flex: 1; }
  .col h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  .col p { margin-bottom: 4px; line-height: 1.5; }
  .col .name { font-weight: 700; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  thead { background: ${headerColor}; color: white; }
  th { padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
  tr:nth-child(even) td { background: #f9fafb; }
  .totals { margin-left: auto; width: 280px; margin-top: 8px; }
  .totals table { margin: 0; }
  .totals td { border: none; padding: 6px 12px; }
  .totals .label { color: #6b7280; font-size: 11px; }
  .totals .total-row td { border-top: 2px solid ${headerColor}; font-weight: 700; font-size: 14px; color: ${headerColor}; padding-top: 10px; }
  .notes { margin-top: 24px; padding: 16px; background: #f9fafb; border-left: 3px solid ${headerColor}; border-radius: 0 4px 4px 0; }
  .notes h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 6px; }
  .notes p { color: #374151; line-height: 1.6; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; color: #9ca3af; font-size: 10px; }
  .status-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; background: ${headerColor}20; color: ${headerColor}; text-transform: uppercase; margin-bottom: 16px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="brand">
        <span class="brand-r66">R66</span><span class="brand-slot">SLOT</span>
      </div>
      <p style="color:#6b7280;font-size:11px;margin-top:4px;">r66slot.co.za</p>
      <p style="color:#6b7280;font-size:11px;">info@r66slot.co.za</p>
    </div>
    <div class="doc-badge">
      <h1>${title}</h1>
      <p>${docNumber}</p>
    </div>
  </div>

  <hr class="divider" />

  <div class="two-col">
    <div class="col">
      <h3>Bill To</h3>
      <p class="name">${order.customerName}</p>
      <p>${order.customerEmail}</p>
      <p>${order.customerPhone || ''}</p>
    </div>
    <div class="col">
      <h3>Document Details</h3>
      <p><strong>Document No:</strong> ${docNumber}</p>
      <p><strong>Date:</strong> ${today}</p>
      ${type === 'quote' ? `<p><strong>Valid Until:</strong> ${dueDate}</p>` : ''}
      ${type === 'invoice' ? `<p><strong>Due Date:</strong> ${dueDate}</p>` : ''}
      ${type === 'sales-order' ? `<p><strong>Order Date:</strong> ${formatDate(order.createdAt)}</p>` : ''}
      ${order.estimatedDeliveryDate ? `<p><strong>ETA:</strong> ${order.estimatedDeliveryDate}</p>` : ''}
      <p><strong>Status:</strong> <span class="status-badge">${type === 'quote' ? 'Quoted' : type === 'sales-order' ? 'Confirmed' : 'Due'}</span></p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Brand</th>
        <th>SKU</th>
        <th>Description</th>
        <th style="text-align:right;">Unit Price</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Line Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>${order.brand || '—'}</td>
        <td><code style="font-size:11px;">${order.sku || '—'}</code></td>
        <td>${order.itemDescription}</td>
        <td style="text-align:right;">R ${price.toFixed(2)}</td>
        <td style="text-align:center;">${qty}</td>
        <td style="text-align:right;font-weight:600;">R ${subtotal.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td class="label">Subtotal (excl. VAT)</td>
        <td style="text-align:right;">R ${subtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td class="label">VAT (15%)</td>
        <td style="text-align:right;">R ${vat.toFixed(2)}</td>
      </tr>
      <tr class="total-row">
        <td>TOTAL</td>
        <td style="text-align:right;">R ${total.toFixed(2)}</td>
      </tr>
    </table>
  </div>

  <div class="notes">
    <h4>${type === 'invoice' ? 'Payment Details' : 'Terms & Notes'}</h4>
    ${type === 'invoice'
      ? `<p>Payment is due within 30 days. Bank transfer preferred. Please use invoice number <strong>${docNumber}</strong> as payment reference. Contact us at <strong>info@r66slot.co.za</strong> for banking details.</p>`
      : type === 'sales-order'
      ? `<p>This sales order confirms your purchase. Stock will be allocated upon receipt. You will be notified when your item is ready for dispatch. ETA: <strong>${order.estimatedDeliveryDate || 'TBC'}</strong>.</p>`
      : `<p>This quote is valid for 30 days from the date above. Prices are subject to change based on stock availability. To confirm your order, reply to this email or contact us at <strong>info@r66slot.co.za</strong>.</p>`
    }
  </div>

  <div class="footer">
    <span>R66SLOT | Premium Slot Cars & Collectibles | r66slot.co.za</span>
    <span>Generated ${today}</span>
  </div>
</div>
</body>
</html>`
}

// Document Modal Component
function DocumentModal({
  order,
  docType,
  onClose,
  onMarkSent,
}: {
  order: PreOrderItem
  docType: DocType
  onClose: () => void
  onMarkSent: (type: DocType) => void
}) {
  const [isSending, setIsSending] = useState(false)
  const [sendStatus, setSendStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const docHTML = buildDocumentHTML(order, docType)
  const docLabel = DOC_LABELS[docType]
  const docNumber = generateDocNumber(docType, order.id)

  const handlePrint = () => {
    const iframe = iframeRef.current
    if (!iframe) return
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
  }

  const handleDownload = () => {
    const blob = new Blob([docHTML], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${docNumber}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSendEmail = async () => {
    setIsSending(true)
    setSendStatus(null)

    const subject = `${docLabel} ${docNumber} – R66SLOT`

    try {
      const res = await fetch('/api/admin/send-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: order.customerEmail,
          subject,
          html: docHTML,
          documentType: docLabel,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setSendStatus({ type: 'success', message: `${docLabel} sent to ${order.customerEmail}` })
        onMarkSent(docType)
      } else if (data.mailto) {
        window.open(data.mailto, '_blank')
        setSendStatus({ type: 'info', message: 'SMTP not configured — opened your email client instead.' })
        onMarkSent(docType)
      } else {
        setSendStatus({ type: 'error', message: data.error || 'Failed to send' })
      }
    } catch {
      setSendStatus({ type: 'error', message: 'Network error. Try again.' })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold font-play">
              {docLabel} — {order.customerName}
            </h2>
            <p className="text-sm text-gray-500 font-play">{docNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendEmail}
              disabled={isSending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors font-play"
            >
              {isSending ? <span className="animate-spin text-xs">⟳</span> : <span>✉️</span>}
              {isSending ? 'Sending...' : `Email ${docLabel}`}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-colors font-play"
            >
              ⬇️ Download
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:opacity-90 transition-colors font-play"
            >
              🖨️ Print / PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 transition-colors text-xl font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {sendStatus && (
          <div className={`mx-6 mt-4 px-4 py-3 rounded-lg text-sm font-play font-medium ${
            sendStatus.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            sendStatus.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {sendStatus.type === 'success' ? '✅ ' : sendStatus.type === 'error' ? '❌ ' : 'ℹ️ '}
            {sendStatus.message}
          </div>
        )}

        <div className="p-6">
          <iframe
            ref={iframeRef}
            srcDoc={docHTML}
            className="w-full rounded-lg border border-gray-200 shadow-inner"
            style={{ height: '780px' }}
            title={`${docLabel} Preview`}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────
function SortIcon({ col, sortKey, sortDir }: { col: string; sortKey: string; sortDir: SortDir }) {
  if (sortKey !== col) return <span className="ml-1 text-gray-300">↕</span>
  return <span className="ml-1 text-gray-700">{sortDir === 'asc' ? '↑' : '↓'}</span>
}

function sortOrders(orders: PreOrderItem[], key: SortKey, dir: SortDir) {
  return [...orders].sort((a, b) => {
    let aVal: string | number = ''
    let bVal: string | number = ''
    switch (key) {
      case 'customerName': aVal = a.customerName; bVal = b.customerName; break
      case 'createdAt':    aVal = new Date(a.createdAt).getTime(); bVal = new Date(b.createdAt).getTime(); break
      case 'brand':        aVal = a.brand || ''; bVal = b.brand || ''; break
      case 'price':        aVal = parseFloat(a.price || '0'); bVal = parseFloat(b.price || '0'); break
      case 'quantity':     aVal = a.quantity; bVal = b.quantity; break
    }
    if (aVal < bVal) return dir === 'asc' ? -1 : 1
    if (aVal > bVal) return dir === 'asc' ? 1 : -1
    return 0
  })
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PreOrderListPage() {
  const [orders, setOrders] = useState<PreOrderItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [activeDoc, setActiveDoc] = useState<{ order: PreOrderItem; type: DocType } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Sorting state
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/admin/preorder-list')
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateOrderField = async (orderId: string, fields: Record<string, unknown>) => {
    try {
      const response = await fetch(`/api/admin/preorder-list/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (response.ok) {
        const updated = await response.json()
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o))
      }
    } catch (error) {
      console.error('Error updating order:', error)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (order: PreOrderItem) => {
    if (!confirm(`Permanently delete the order for "${order.customerName}" (${order.itemDescription})?\n\nThis cannot be undone.`)) return
    setDeletingId(order.id)
    try {
      const res = await fetch(`/api/admin/preorder-list/${order.id}`, { method: 'DELETE' })
      if (res.ok) {
        setOrders(prev => prev.filter(o => o.id !== order.id))
      } else {
        alert('Failed to delete order.')
      }
    } catch {
      alert('Network error. Could not delete.')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Archive ───────────────────────────────────────────────────────────────
  const handleArchive = (order: PreOrderItem) => {
    updateOrderField(order.id, { archivedAt: new Date().toISOString() })
  }

  const handleUnarchive = (order: PreOrderItem) => {
    updateOrderField(order.id, { archivedAt: null })
  }

  const handleOpenDoc = (order: PreOrderItem, type: DocType) => setActiveDoc({ order, type })

  const handleMarkSent = (type: DocType) => {
    if (!activeDoc) return
    const field = type === 'quote' ? 'quoteSent' : type === 'sales-order' ? 'salesOrderSent' : 'invoiceSent'
    updateOrderField(activeDoc.order.id, { [field]: true })
  }

  const handleShipped = (order: PreOrderItem) => {
    updateOrderField(order.id, { shipped: true, archivedAt: new Date().toISOString(), status: 'shipped' })
  }

  const handleExportCSV = () => {
    const csvContent = [
      ['Order ID', 'Date', 'Client Name', 'Email', 'Phone', 'Brand', 'SKU', 'Item', 'ETA', 'Price', 'Qty', 'Total', 'Type', 'Quote Sent', 'Sales Order', 'Invoice', 'Shipped'],
      ...orders.map(order => [
        order.id,
        new Date(order.createdAt).toLocaleDateString(),
        order.customerName,
        order.customerEmail,
        order.customerPhone,
        order.brand,
        order.sku,
        order.itemDescription,
        order.estimatedDeliveryDate || '',
        `R${order.price}`,
        order.quantity.toString(),
        `R${order.totalAmount}`,
        order.orderType,
        order.quoteSent ? 'Yes' : 'No',
        order.salesOrderSent ? 'Yes' : 'No',
        order.invoiceSent ? 'Yes' : 'No',
        order.shipped ? 'Yes' : 'No',
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pre-orders-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // ── Sort toggle ───────────────────────────────────────────────────────────
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const activeOrders = orders.filter(o => !o.archivedAt)
  const archivedOrders = orders.filter(o => !!o.archivedAt)
  const baseOrders = showArchived ? archivedOrders : activeOrders
  const displayedOrders = useMemo(() => sortOrders(baseOrders, sortKey, sortDir), [baseOrders, sortKey, sortDir])

  if (isLoading) {
    return (
      <div className="font-play flex items-center justify-center min-h-[400px]">
        <p className="text-lg">Loading pre-orders...</p>
      </div>
    )
  }

  // ── Sortable TH helper ────────────────────────────────────────────────────
  const SortTH = ({ col, label }: { col: SortKey; label: string }) => (
    <th
      className="py-3 px-3 font-semibold text-xs font-play text-gray-500 cursor-pointer select-none whitespace-nowrap hover:text-gray-800 transition-colors"
      onClick={() => toggleSort(col)}
    >
      {label}
      <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
    </th>
  )

  return (
    <div className="font-play">
      {/* Document Modal */}
      {activeDoc && (
        <DocumentModal
          order={activeDoc.order}
          docType={activeDoc.type}
          onClose={() => setActiveDoc(null)}
          onMarkSent={handleMarkSent}
        />
      )}

      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-play">
            {showArchived ? 'Archived Pre-Orders' : 'Pre-Orders'}
          </h1>
          <p className="text-gray-600 mt-1 font-play">
            {showArchived
              ? 'Shipped and archived pre-orders'
              : 'Pre-orders placed by customers through Book Now'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {orders.length > 0 && (
            <Button onClick={handleExportCSV} variant="outline" className="font-play">
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Archive Toggle */}
      <div className="mb-4">
        <button
          onClick={() => setShowArchived(!showArchived)}
          className="text-sm text-blue-600 hover:text-blue-800 underline font-play"
        >
          {showArchived
            ? `← Back to Active Pre-Orders (${activeOrders.length})`
            : `View Archived Pre-Orders (${archivedOrders.length})`}
        </button>
      </div>

      {/* Stats Cards */}
      {!showArchived && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 font-play">Total Active</p>
              <p className="text-3xl font-bold font-play">{activeOrders.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 font-play">Quotes Sent</p>
              <p className="text-3xl font-bold text-green-600 font-play">
                {activeOrders.filter(o => o.quoteSent).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 font-play">Invoiced</p>
              <p className="text-3xl font-bold text-blue-600 font-play">
                {activeOrders.filter(o => o.invoiceSent).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 font-play">Total Value</p>
              <p className="text-3xl font-bold text-primary font-play">
                R{activeOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount || '0'), 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Orders Table */}
      {displayedOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="space-y-4">
              <div className="text-6xl">📋</div>
              <h3 className="text-xl font-semibold font-play">
                {showArchived ? 'No Archived Pre-Orders' : 'No Active Pre-Orders'}
              </h3>
              <p className="text-gray-600 font-play">
                {showArchived
                  ? 'Shipped orders will appear here once archived.'
                  : 'Pre-orders placed by customers will appear here.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="font-play">
              {showArchived ? 'Archived' : 'Active'} Pre-Orders ({displayedOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left bg-gray-50">
                    <SortTH col="customerName" label="Client Name" />
                    <SortTH col="createdAt" label="Date Ordered" />
                    <SortTH col="brand" label="Brand" />
                    <th className="py-3 px-3 font-semibold text-xs font-play text-gray-500">SKU</th>
                    <th className="py-3 px-3 font-semibold text-xs font-play text-gray-500">Item Description</th>
                    <th className="py-3 px-3 font-semibold text-xs font-play text-gray-500">ETA</th>
                    <SortTH col="price" label="Price" />
                    <SortTH col="quantity" label="Qty" />
                    <th className="py-3 px-3 font-semibold text-xs font-play text-gray-500 min-w-[340px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedOrders.map((order) => (
                    <tr key={order.id} className={`border-b hover:bg-gray-50 ${deletingId === order.id ? 'opacity-40 pointer-events-none' : ''}`}>
                      <td className="py-3 px-3">
                        <p className="font-medium text-sm font-play">{order.customerName}</p>
                        <p className="text-xs text-gray-500 font-play">{order.customerEmail}</p>
                        {order.customerPhone && (
                          <p className="text-xs text-gray-400 font-play">{order.customerPhone}</p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-sm font-play whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 text-sm font-play">{order.brand}</td>
                      <td className="py-3 px-3 text-sm font-play font-mono text-xs">{order.sku}</td>
                      <td className="py-3 px-3 text-sm font-play">{order.itemDescription}</td>
                      <td className="py-3 px-3 text-sm font-play whitespace-nowrap">
                        {order.estimatedDeliveryDate || '—'}
                      </td>
                      <td className="py-3 px-3 text-sm font-bold font-play whitespace-nowrap">
                        R{order.price}
                      </td>
                      <td className="py-3 px-3 text-sm font-play text-center">{order.quantity}</td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1.5">
                          {/* Quote */}
                          <button
                            onClick={() => handleOpenDoc(order, 'quote')}
                            className={`px-2.5 py-1.5 rounded text-xs font-bold font-play transition-colors ${
                              order.quoteSent
                                ? 'bg-green-500 text-white border border-green-600'
                                : 'bg-white text-black border-2 border-black hover:bg-gray-100'
                            }`}
                          >
                            {order.quoteSent ? '✓ Quote' : 'Quote'}
                          </button>

                          {/* Sales Order */}
                          <button
                            onClick={() => handleOpenDoc(order, 'sales-order')}
                            className={`px-2.5 py-1.5 rounded text-xs font-bold font-play transition-colors ${
                              order.salesOrderSent
                                ? 'bg-green-500 text-white border border-green-600'
                                : 'bg-white text-black border-2 border-black hover:bg-gray-100'
                            }`}
                          >
                            {order.salesOrderSent ? '✓ Sales Order' : 'Sales Order'}
                          </button>

                          {/* Invoice */}
                          <button
                            onClick={() => handleOpenDoc(order, 'invoice')}
                            className={`px-2.5 py-1.5 rounded text-xs font-bold font-play transition-colors ${
                              order.invoiceSent
                                ? 'bg-green-500 text-white border border-green-600'
                                : 'bg-white text-black border-2 border-black hover:bg-gray-100'
                            }`}
                          >
                            {order.invoiceSent ? '✓ Invoice' : 'Invoice'}
                          </button>

                          {/* Shipped (active only) */}
                          {!showArchived && (
                            <button
                              onClick={() => handleShipped(order)}
                              disabled={order.shipped}
                              className={`px-2.5 py-1.5 rounded text-xs font-bold font-play transition-colors ${
                                order.shipped
                                  ? 'bg-green-500 text-white border border-green-600'
                                  : 'bg-white text-black border-2 border-black hover:bg-gray-100'
                              }`}
                            >
                              {order.shipped ? '✓ Shipped' : 'Shipped'}
                            </button>
                          )}

                          {/* Archive / Unarchive */}
                          {showArchived ? (
                            <button
                              onClick={() => handleUnarchive(order)}
                              className="px-2.5 py-1.5 rounded text-xs font-bold font-play transition-colors bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200"
                            >
                              Unarchive
                            </button>
                          ) : (
                            <button
                              onClick={() => handleArchive(order)}
                              className="px-2.5 py-1.5 rounded text-xs font-bold font-play transition-colors bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200"
                            >
                              Archive
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(order)}
                            disabled={deletingId === order.id}
                            className="px-2.5 py-1.5 rounded text-xs font-bold font-play transition-colors bg-red-100 text-red-700 border border-red-300 hover:bg-red-600 hover:text-white"
                          >
                            {deletingId === order.id ? '...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
