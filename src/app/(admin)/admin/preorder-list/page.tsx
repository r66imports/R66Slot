'use client'

import { useState, useEffect } from 'react'
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

export default function PreOrderListPage() {
  const [orders, setOrders] = useState<PreOrderItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)

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

  const updateOrderField = async (orderId: string, fields: Record<string, any>) => {
    try {
      const response = await fetch(`/api/admin/preorder-list/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })

      if (response.ok) {
        const updated = await response.json()
        setOrders(orders.map(order =>
          order.id === orderId ? { ...order, ...updated } : order
        ))
      }
    } catch (error) {
      console.error('Error updating order:', error)
    }
  }

  const handleSendQuote = (order: PreOrderItem) => {
    updateOrderField(order.id, { quoteSent: true })
  }

  const handleSendSalesOrder = (order: PreOrderItem) => {
    if (order.quantity <= 0) return
    updateOrderField(order.id, { salesOrderSent: true })
  }

  const handleSendInvoice = (order: PreOrderItem) => {
    if (order.quantity <= 0) return
    updateOrderField(order.id, { invoiceSent: true })
  }

  const handleShipped = (order: PreOrderItem) => {
    updateOrderField(order.id, {
      shipped: true,
      archivedAt: new Date().toISOString(),
      status: 'shipped',
    })
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
    a.download = `preorders-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // Split orders into active and archived
  const activeOrders = orders.filter(o => !o.archivedAt)
  const archivedOrders = orders.filter(o => !!o.archivedAt)
  const displayedOrders = showArchived ? archivedOrders : activeOrders

  if (isLoading) {
    return (
      <div className="font-play flex items-center justify-center min-h-[400px]">
        <p className="text-lg">Loading orders...</p>
      </div>
    )
  }

  return (
    <div className="font-play">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-play">
            {showArchived ? 'Archived Orders' : 'Book Now Orders'}
          </h1>
          <p className="text-gray-600 mt-1 font-play">
            {showArchived
              ? 'Shipped and archived orders'
              : 'Orders placed by customers through Book Now'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {orders.length > 0 && (
            <Button
              onClick={handleExportCSV}
              variant="outline"
              className="font-play"
            >
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Archive Toggle Link */}
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

      {displayedOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="space-y-4">
              <div className="text-6xl">📋</div>
              <h3 className="text-xl font-semibold font-play">
                {showArchived ? 'No Archived Orders' : 'No Active Orders'}
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
              {showArchived ? 'Archived' : 'Active'} Orders ({displayedOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-3 px-3 font-semibold text-xs font-play text-gray-500">Client Name</th>
                    <th className="py-3 px-3 font-semibold text-xs font-play text-gray-500">Date Ordered</th>
                    <th className="py-3 px-3 font-semibold text-xs font-play text-gray-500">Brand</th>
                    <th className="py-3 px-3 font-semibold text-xs font-play text-gray-500">SKU</th>
                    <th className="py-3 px-3 font-semibold text-xs font-play text-gray-500">Item Description</th>
                    <th className="py-3 px-3 font-semibold text-xs font-play text-gray-500">ETA</th>
                    <th className="py-3 px-3 font-semibold text-xs font-play text-gray-500">Est Retail Price</th>
                    <th className="py-3 px-3 font-semibold text-xs font-play text-gray-500">Qty</th>
                    <th className="py-3 px-3 font-semibold text-xs font-play text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedOrders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <p className="font-medium text-sm font-play">{order.customerName}</p>
                        <p className="text-xs text-gray-500 font-play">{order.customerEmail}</p>
                      </td>
                      <td className="py-3 px-3 text-sm font-play">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 text-sm font-play">{order.brand}</td>
                      <td className="py-3 px-3 text-sm font-play">{order.sku}</td>
                      <td className="py-3 px-3 text-sm font-play">{order.itemDescription}</td>
                      <td className="py-3 px-3 text-sm font-play">
                        {order.estimatedDeliveryDate || '—'}
                      </td>
                      <td className="py-3 px-3 text-sm font-bold font-play">
                        R{order.price}
                      </td>
                      <td className="py-3 px-3 text-sm font-play">{order.quantity}</td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1.5">
                          {/* Send Quote */}
                          <button
                            onClick={() => handleSendQuote(order)}
                            disabled={order.quoteSent}
                            className={`px-2.5 py-1.5 rounded text-xs font-bold font-play transition-colors ${
                              order.quoteSent
                                ? 'bg-green-500 text-white border border-green-600'
                                : 'bg-white text-black border-2 border-black hover:bg-gray-100'
                            }`}
                          >
                            Send Quote
                          </button>

                          {/* Send to Sales Order */}
                          <button
                            onClick={() => handleSendSalesOrder(order)}
                            disabled={order.salesOrderSent || order.quantity <= 0}
                            className={`px-2.5 py-1.5 rounded text-xs font-bold font-play transition-colors ${
                              order.salesOrderSent
                                ? 'bg-green-500 text-white border border-green-600'
                                : order.quantity <= 0
                                ? 'bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed'
                                : 'bg-white text-black border-2 border-black hover:bg-gray-100'
                            }`}
                          >
                            Send to Sales Order
                          </button>

                          {/* Send to Invoice */}
                          <button
                            onClick={() => handleSendInvoice(order)}
                            disabled={order.invoiceSent || order.quantity <= 0}
                            className={`px-2.5 py-1.5 rounded text-xs font-bold font-play transition-colors ${
                              order.invoiceSent
                                ? 'bg-green-500 text-white border border-green-600'
                                : order.quantity <= 0
                                ? 'bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed'
                                : 'bg-white text-black border-2 border-black hover:bg-gray-100'
                            }`}
                          >
                            Send to Invoice
                          </button>

                          {/* Shipped */}
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
                              Shipped
                            </button>
                          )}
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
