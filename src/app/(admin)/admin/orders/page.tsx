'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Backorder } from '@/app/api/admin/backorders/route'

type Tab = 'quotes' | 'salesorders' | 'invoices'

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase()
}

function formatPrice(price: number) {
  return `R ${price.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  complete: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function OrdersPage() {
  const [backorders, setBackorders] = useState<Backorder[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('quotes')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/backorders')
      if (res.ok) setBackorders(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const quotes = backorders.filter((b) => b.phaseQuote && b.quoteNumber)
  const salesOrders = backorders.filter((b) => b.phaseSalesOrder && b.salesOrderNumber)
  const invoices = backorders.filter((b) => b.phaseInvoice && b.invoiceNumber)

  const tabs: { key: Tab; label: string; icon: string; count: number }[] = [
    { key: 'quotes', label: 'Quotes', icon: '📄', count: quotes.length },
    { key: 'salesorders', label: 'Sales Orders', icon: '🧾', count: salesOrders.length },
    { key: 'invoices', label: 'Invoices', icon: '💰', count: invoices.length },
  ]

  const activeRows = tab === 'quotes' ? quotes : tab === 'salesorders' ? salesOrders : invoices
  const docField = tab === 'quotes' ? 'quoteNumber' : tab === 'salesorders' ? 'salesOrderNumber' : 'invoiceNumber'
  const dateField = tab === 'quotes' ? 'phaseQuoteDate' : tab === 'salesorders' ? 'phaseSalesOrderDate' : 'phaseInvoiceDate'
  const docLabel = tab === 'quotes' ? 'Quote #' : tab === 'salesorders' ? 'Sales Order #' : 'Invoice #'

  const totalValue = activeRows.reduce((sum, b) => sum + (b.price * b.qty), 0)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-gray-500 mt-1">Quotes, Sales Orders &amp; Invoices from Back Orders</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map((t) => (
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
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              tab === t.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : activeRows.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">{tabs.find((t) => t.key === tab)?.icon}</div>
          <p className="text-lg font-medium text-gray-500">No {tabs.find((t) => t.key === tab)?.label} yet</p>
          <p className="text-sm mt-1">
            {tab === 'quotes' && 'Tick the Quote phase and add a quote number in a Back Order to see it here.'}
            {tab === 'salesorders' && 'Tick the Sales Order phase and add a sales order number in a Back Order to see it here.'}
            {tab === 'invoices' && 'Tick the Invoice phase and add an invoice number in a Back Order to see it here.'}
          </p>
        </div>
      ) : (
        <>
          {/* Summary bar */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{activeRows.length} {tabs.find((t) => t.key === tab)?.label}</p>
            <p className="text-sm font-semibold text-gray-700">Total: {formatPrice(totalValue)}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                    <th className="text-left py-3 px-4">{docLabel}</th>
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Client</th>
                    <th className="text-left py-3 px-4">SKU</th>
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-right py-3 px-4">Qty</th>
                    <th className="text-right py-3 px-4">Price</th>
                    <th className="text-right py-3 px-4">Total</th>
                    <th className="text-center py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRows.map((b) => {
                    const docNumber = (b as Record<string, unknown>)[docField] as string
                    const docDate = (b as Record<string, unknown>)[dateField] as string | undefined
                    return (
                      <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-blue-700">{docNumber}</td>
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                          {docDate ? formatDate(docDate) : formatDate(b.createdAt)}
                        </td>
                        <td className="py-3 px-4 font-medium">{b.clientName}</td>
                        <td className="py-3 px-4 font-mono text-xs text-gray-600">{b.sku}</td>
                        <td className="py-3 px-4 text-gray-700 max-w-[240px] truncate">{b.description}</td>
                        <td className="py-3 px-4 text-right">{b.qty}</td>
                        <td className="py-3 px-4 text-right text-gray-600">{formatPrice(b.price)}</td>
                        <td className="py-3 px-4 text-right font-semibold">{formatPrice(b.price * b.qty)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {b.status}
                          </span>
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
    </div>
  )
}
