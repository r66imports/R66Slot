'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface CheckoutOrder {
  id: string
  orderNumber: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'invoiced' | 'archived'
  invoiceRef?: string
  stockRestored?: boolean
  createdAt: string
  customer: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  shipping: {
    address: string
    suburb: string
    city: string
    postalCode: string
    method: string
    notes: string
  }
  items: Array<{
    id: string
    sku: string
    title: string
    brand: string
    price: number
    quantity: number
    imageUrl: string
  }>
  subtotal: number
  total: number
}

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  invoiced:  'bg-blue-100 text-blue-800 border-blue-200',
  archived:  'bg-gray-100 text-gray-500 border-gray-200',
}

export default function SiteOrdersPage() {
  const [orders, setOrders] = useState<CheckoutOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled' | 'invoiced' | 'archived'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [converting, setConverting] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<CheckoutOrder | null>(null)
  const [search, setSearch] = useState('')
  const [pendingConvertOrder, setPendingConvertOrder] = useState<CheckoutOrder | null>(null)
  const [existingClientInvoices, setExistingClientInvoices] = useState<any[]>([])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout')
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  async function sendToInvoice(order: CheckoutOrder) {
    const docsRes = await fetch('/api/admin/orders/documents?type=invoice')
    const allInvoices: any[] = docsRes.ok ? await docsRes.json() : []
    const clientEmail = order.customer.email.toLowerCase()
    const clientName = `${order.customer.firstName} ${order.customer.lastName}`.trim().toLowerCase()
    const clientInvoices = allInvoices.filter((d: any) =>
      d.status !== 'archived' &&
      // The invoice the order already sits on is not a move target.
      d.docNumber !== order.invoiceRef && (
        (d.clientEmail?.toLowerCase() === clientEmail) ||
        d.clientName?.toLowerCase() === clientName
      )
    )
    // An order that is already on an invoice always asks first — its line items leave
    // that invoice, so this must never happen on one stray click.
    if (clientInvoices.length > 0 || order.invoiceRef) {
      setExistingClientInvoices(clientInvoices)
      setPendingConvertOrder(order)
    } else {
      await doCreateNewInvoice(order)
    }
  }

  function orderLineItems(order: CheckoutOrder) {
    return order.items.map((item, i) => ({
      id: `li_${Date.now()}_${i}`,
      description: item.sku ? `${item.sku} \u2013 ${item.title}` : item.title,
      qty: item.quantity,
      unitPrice: item.price,
      // Stamped so these lines can be found again when the order moves to another invoice.
      sourceOrderId: order.id,
    }))
  }

  // The invoice lines belonging to an order — stamped ones when present, otherwise matched
  // by description for invoices raised before the stamp existed (one line per ordered item).
  function stripOrderLines(lines: any[], order: CheckoutOrder) {
    if (lines.some((li) => li.sourceOrderId === order.id)) {
      return lines.filter((li) => li.sourceOrderId !== order.id)
    }
    const remaining = [...lines]
    for (const item of order.items) {
      const desc = item.sku ? `${item.sku} \u2013 ${item.title}` : item.title
      const i = remaining.findIndex((li) => !li.sourceOrderId && li.description === desc)
      if (i !== -1) remaining.splice(i, 1)
    }
    return remaining
  }

  // Pull the order's line items off the invoice it currently sits on. Stock does not move:
  // Rule 31 — a site order's stock is deducted at checkout and held by the order itself,
  // so its lines travel between invoices without touching inventory.
  async function detachFromInvoice(order: CheckoutOrder) {
    if (!order.invoiceRef) return
    const res = await fetch('/api/admin/orders/documents?type=invoice')
    const docs: any[] = res.ok ? await res.json() : []
    const doc = docs.find((d: any) => d.docNumber === order.invoiceRef)
    if (!doc) return
    const lines: any[] = doc.lineItems || []
    const remaining = stripOrderLines(lines, order)
    if (remaining.length === lines.length) return
    await fetch(`/api/admin/orders/documents/${doc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineItems: remaining, stockAlreadyReserved: true, skipStockAdjust: true }),
    })
    // Nothing left on an invoice that never took money — send it to the Bin rather than
    // leave a blank document behind. It can be restored from there.
    const paid = (doc.amountPaid || 0) + (doc.creditApplied || 0) + (doc.depositPaid || 0)
    if (remaining.length === 0 && paid <= 0 && (doc.payments || []).length === 0) {
      await fetch(`/api/admin/orders/documents/${doc.id}`, { method: 'DELETE' })
    }
  }

  // A cancelled order whose stock was restored gave those units back to the shelf.
  // Invoicing it again has to take them out a second time — and fail loudly if they
  // are no longer there.
  async function reclaimStock(order: CheckoutOrder): Promise<boolean> {
    if (!order.stockRestored) return true
    const res = await fetch('/api/checkout', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: order.id, deductStock: true }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(err.error || 'Not enough stock to invoice this order again.')
      return false
    }
    return true
  }

  // Hand back stock taken by reclaimStock when the invoice it was taken for never landed.
  async function releaseReclaimedStock(order: CheckoutOrder) {
    await fetch('/api/checkout', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: order.id, restoreStock: true }),
    }).catch(() => {})
  }

  async function doCreateNewInvoice(order: CheckoutOrder) {
    setConverting(order.id)
    setPendingConvertOrder(null)
    setExistingClientInvoices([])
    let reclaimed = false
    try {
      if (!(await reclaimStock(order))) return
      reclaimed = !!order.stockRestored

      const docsRes = await fetch('/api/admin/orders/documents?type=invoice')
      const docs = docsRes.ok ? await docsRes.json() : []
      const nums = docs
        .map((d: any) => parseInt(d.docNumber?.replace(/\D/g, '') || '0', 10))
        .filter((n: number) => n > 0)
      const next = (nums.length > 0 ? Math.max(...nums) : 0) + 1
      const docNumber = `INV${String(next).padStart(4, '0')}`

      // Detach only now that the next number is settled — the old invoice may be binned
      // by this, and it must still count when the new document is numbered.
      await detachFromInvoice(order)

      const lineItems = orderLineItems(order)

      const clientName = `${order.customer.firstName} ${order.customer.lastName}`.trim()
      const clientAddress = [
        order.shipping.address,
        order.shipping.suburb,
        order.shipping.city,
        order.shipping.postalCode,
      ].filter(Boolean).join(', ')

      const invoiceRes = await fetch('/api/admin/orders/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'invoice',
          docNumber,
          date: new Date().toISOString().slice(0, 10),
          clientName,
          clientEmail: order.customer.email,
          clientPhone: order.customer.phone,
          clientAddress,
          lineItems,
          notes: `Site Order: ${order.orderNumber}${order.shipping.notes ? '\n' + order.shipping.notes : ''}`,
          shippingMethod: order.shipping.method,
          status: 'sent',
          stockAlreadyReserved: true,
          stockDeducted: true,
        }),
      })

      if (!invoiceRes.ok) throw new Error('Failed to create invoice')

      await fetch('/api/checkout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, status: 'invoiced', invoiceRef: docNumber }),
      })

      await load()
    } catch {
      // Stock was taken back out for an invoice that never landed — hand it back.
      if (reclaimed) await releaseReclaimedStock(order)
      alert('Failed to create invoice. Please try again.')
    } finally {
      setConverting(null)
    }
  }

  async function appendOrderToInvoice(order: CheckoutOrder, invoiceDoc: any) {
    setConverting(order.id)
    setPendingConvertOrder(null)
    setExistingClientInvoices([])
    let reclaimed = false
    try {
      if (!(await reclaimStock(order))) return
      reclaimed = !!order.stockRestored
      await detachFromInvoice(order)

      // Re-read the target: detaching the order from its previous invoice may have
      // rewritten it, and the copy handed to this function would then be stale.
      const freshRes = await fetch('/api/admin/orders/documents?type=invoice')
      const freshDocs: any[] = freshRes.ok ? await freshRes.json() : []
      const target = freshDocs.find((d: any) => d.id === invoiceDoc.id) || invoiceDoc

      const newItems = orderLineItems(order)
      const merged = [...(target.lineItems || []), ...newItems]
      const res = await fetch(`/api/admin/orders/documents/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // Rule 31 — the site order's stock was deducted at checkout and is held by the
        // order, not by the invoice: no guard to run, and nothing here for it to move.
        body: JSON.stringify({ lineItems: merged, stockAlreadyReserved: true, skipStockAdjust: true }),
      })
      if (!res.ok) throw new Error('Failed to update invoice')

      await fetch('/api/checkout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, status: 'invoiced', invoiceRef: target.docNumber }),
      })

      await load()
    } catch {
      // Stock was taken back out for an invoice that never landed — hand it back.
      if (reclaimed) await releaseReclaimedStock(order)
      alert('Failed to add to invoice. Please try again.')
    } finally {
      setConverting(null)
    }
  }

  async function updateStatus(order: CheckoutOrder, status: CheckoutOrder['status']) {
    await fetch('/api/checkout', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: order.id, status }),
    })
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status } : o))
  }

  async function handleCancelConfirmed() {
    if (!confirmCancel) return
    setCancelling(confirmCancel.id)
    setConfirmCancel(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmCancel.id, status: 'cancelled', restoreStock: true }),
      })
      const updated = await res.json()
      setOrders((prev) => prev.map((o) => o.id === confirmCancel.id ? { ...o, ...updated } : o))
    } finally {
      setCancelling(null)
    }
  }

  async function handleRestoreStock(order: CheckoutOrder) {
    setCancelling(order.id)
    try {
      const res = await fetch('/api/checkout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, restoreStock: true }),
      })
      const updated = await res.json()
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, ...updated } : o))
    } finally {
      setCancelling(null)
    }
  }

  const filtered = orders.filter((o) => {
    if (filter === 'all' && o.status === 'archived') return false
    if (filter !== 'all' && o.status !== filter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        `${o.customer.firstName} ${o.customer.lastName}`.toLowerCase().includes(q) ||
        o.customer.email.toLowerCase().includes(q)
      )
    }
    return true
  })

  const counts = {
    all: orders.filter((o) => o.status !== 'archived').length,
    pending: orders.filter((o) => o.status === 'pending').length,
    confirmed: orders.filter((o) => o.status === 'confirmed').length,
    invoiced: orders.filter((o) => o.status === 'invoiced').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
    archived: orders.filter((o) => o.status === 'archived').length,
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Site Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Website checkout orders — stock deducted at time of order.
          </p>
        </div>
        <Link
          href="/admin/orders"
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          View Invoices →
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {(['all', 'pending', 'confirmed', 'invoiced'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`bg-white rounded-xl border p-3 text-left transition-all ${
              filter === s ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-2xl font-bold text-gray-900">{counts[s]}</div>
            <div className="text-xs text-gray-500 capitalize mt-0.5">{s === 'all' ? 'All Orders' : s}</div>
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by order #, name, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
        />
        <div className="flex gap-1">
          {(['all', 'pending', 'confirmed', 'invoiced', 'cancelled', 'archived'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                filter === s
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            {search || filter !== 'all' ? 'No orders match your filter.' : 'No site orders yet.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order #</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((order) => (
                <>
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50/50 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  >
                    <td className="px-4 py-3 font-semibold text-indigo-700">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{order.customer.firstName} {order.customer.lastName}</div>
                      <div className="text-xs text-gray-400">{order.customer.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{order.items.reduce((s, i) => s + i.quantity, 0)} item{order.items.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">R{order.total.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[order.status] ?? STATUS_STYLES.pending}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {order.invoiceRef ? (
                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          {order.invoiceRef}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {order.status !== 'archived' && (
                          <button
                            onClick={() => sendToInvoice(order)}
                            disabled={converting === order.id}
                            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {converting === order.id
                              ? (order.invoiceRef ? 'Moving…' : 'Creating…')
                              : (order.invoiceRef ? 'Change Invoice' : 'Send to Invoice')}
                          </button>
                        )}
                        {order.status === 'pending' && (
                          <button
                            onClick={() => updateStatus(order, 'confirmed')}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 whitespace-nowrap"
                          >
                            Confirm
                          </button>
                        )}
                        {order.status !== 'cancelled' && (
                          <button
                            onClick={() => setConfirmCancel(order)}
                            disabled={cancelling === order.id}
                            className="px-2 py-1.5 text-gray-400 hover:text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 whitespace-nowrap disabled:opacity-50"
                          >
                            {cancelling === order.id ? 'Cancelling…' : 'Cancel'}
                          </button>
                        )}
                        {order.status === 'cancelled' && !order.stockRestored && (
                          <button
                            onClick={() => handleRestoreStock(order)}
                            disabled={cancelling === order.id}
                            className="px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-50 whitespace-nowrap"
                          >
                            {cancelling === order.id ? 'Restoring…' : 'Restore Stock'}
                          </button>
                        )}
                        {order.status === 'cancelled' && order.stockRestored && (
                          <span className="text-xs text-green-600 font-semibold">✓ Stock restored</span>
                        )}
                        {(order.status === 'invoiced' || order.status === 'cancelled') && (
                          <button
                            onClick={() => updateStatus(order, 'archived')}
                            className="px-2 py-1.5 text-gray-400 hover:text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-100 whitespace-nowrap"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded row — order details */}
                  {expandedId === order.id && (
                    <tr key={`${order.id}-expanded`} className="bg-indigo-50/30">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-6">
                          {/* Items */}
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Line Items</p>
                            <div className="space-y-1.5">
                              {order.items.map((item, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm">
                                  {item.imageUrl && (
                                    <img src={item.imageUrl} alt={item.title} className="w-8 h-8 object-cover rounded border border-gray-200 flex-shrink-0" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <span className="font-medium text-gray-700">{item.sku}</span>
                                    <span className="text-gray-400 mx-1">—</span>
                                    <span className="text-gray-600">{item.title}</span>
                                  </div>
                                  <div className="text-gray-500 flex-shrink-0">×{item.quantity}</div>
                                  <div className="font-semibold text-gray-800 flex-shrink-0 w-20 text-right">R{(item.price * item.quantity).toFixed(2)}</div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-3 pt-2 border-t border-gray-200 flex justify-between text-sm font-semibold">
                              <span>Total</span>
                              <span>R{order.total.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Shipping + contact */}
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Shipping Details</p>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div><span className="font-medium text-gray-700">Method:</span> {order.shipping.method || '—'}</div>
                              <div><span className="font-medium text-gray-700">Address:</span> {[order.shipping.address, order.shipping.suburb, order.shipping.city, order.shipping.postalCode].filter(Boolean).join(', ') || '—'}</div>
                              <div><span className="font-medium text-gray-700">Phone:</span> {order.customer.phone || '—'}</div>
                              {order.shipping.notes && <div><span className="font-medium text-gray-700">Notes:</span> {order.shipping.notes}</div>}
                            </div>
                            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 font-medium">
                              ✓ Stock already deducted at checkout
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add-to-existing-invoice picker */}
      {pendingConvertOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {pendingConvertOrder.invoiceRef ? 'Change Invoice' : 'Send to Invoice'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Order <span className="font-semibold text-gray-800">{pendingConvertOrder.orderNumber}</span> — {pendingConvertOrder.customer.firstName} {pendingConvertOrder.customer.lastName}
            </p>
            {pendingConvertOrder.invoiceRef && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                Currently on <span className="font-semibold">{pendingConvertOrder.invoiceRef}</span> — these items are removed from that invoice and placed on the one you pick.
              </div>
            )}
            {pendingConvertOrder.stockRestored && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 font-medium">
                Stock for this order was restored — invoicing it again deducts it from inventory a second time.
              </div>
            )}
            <div className="space-y-2 mb-4">
              <button
                onClick={() => doCreateNewInvoice(pendingConvertOrder)}
                className="w-full text-left px-4 py-3 rounded-xl border-2 border-indigo-400 bg-indigo-50 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                + Create New Invoice
              </button>
              {existingClientInvoices.length > 0 && (
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide pt-1">
                  {pendingConvertOrder.invoiceRef ? 'Move to Existing' : 'Add to Existing'}
                </p>
              )}
              {existingClientInvoices.map((inv: any) => (
                <button
                  key={inv.id}
                  onClick={() => appendOrderToInvoice(pendingConvertOrder, inv)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">{inv.docNumber}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[inv.status] ?? STATUS_STYLES.pending}`}>{inv.status}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{inv.date}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => { setPendingConvertOrder(null); setExistingClientInvoices([]) }}
              className="w-full px-4 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Cancel confirmation modal */}
      {confirmCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Cancel Order?</h3>
            <p className="text-sm text-gray-500 mb-1">
              Order <span className="font-semibold text-gray-800">{confirmCancel.orderNumber}</span> — {confirmCancel.customer.firstName} {confirmCancel.customer.lastName}
            </p>
            <div className="my-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 font-medium">
              ⚠ Stock for {confirmCancel.items.reduce((s, i) => s + i.quantity, 0)} item{confirmCancel.items.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''} will be restored to inventory.
            </div>
            {confirmCancel.invoiceRef && (
              <div className="my-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                Linked invoice <span className="font-semibold">{confirmCancel.invoiceRef}</span> will not be automatically archived — please cancel it manually in the Orders page.
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setConfirmCancel(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelConfirmed}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700"
              >
                Yes, Cancel &amp; Restore Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
