'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useColumnResize } from '@/hooks/use-column-resize'

type SlotifyOrder = {
  id: string
  sku: string
  description: string
  estimatedDeliveryDate: string
  brand: string
  fullDescription: string
  preOrderPrice: string
  qty: number
  customerName?: string
  customerEmail?: string
  bookedAt: string
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered'
}

export default function SlotifyOrdersPage() {
  const [orders, setOrders] = useState<SlotifyOrder[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'shipped' | 'delivered'>('all')
  const [sortBy, setSortBy] = useState<string>('bookedAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const { widths: colW, setWidth } = useColumnResize('slotify-orders', {
    orderId: 120, sku: 80, description: 160, customer: 130,
    brand: 100, price: 85, qty: 60, status: 90, bookedAt: 120,
  })

  // Load orders from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('slotify-orders')
    if (stored) {
      setOrders(JSON.parse(stored))
    }
  }, [])

  const handleExport = () => {
    // Export as CSV with editable qty
    const csvContent = [
      ['Order ID', 'SKU', 'Description', 'Estimated Delivery', 'Brand', 'Price (R)', 'Qty', 'Customer', 'Status', 'Booked Date'],
      ...filteredOrders.map(order => [
        order.id,
        order.sku,
        order.description,
        order.estimatedDeliveryDate,
        order.brand,
        order.preOrderPrice,
        order.qty.toString(),
        order.customerName || 'N/A',
        order.status,
        new Date(order.bookedAt).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `slotify-orders-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const filteredOrders = (filter === 'all' ? orders : orders.filter(order => order.status === filter))
    .slice()
    .sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''
      if      (sortBy === 'sku')        { av = a.sku || ''; bv = b.sku || '' }
      else if (sortBy === 'description'){ av = a.description || ''; bv = b.description || '' }
      else if (sortBy === 'customer')   { av = a.customerName || ''; bv = b.customerName || '' }
      else if (sortBy === 'brand')      { av = a.brand || ''; bv = b.brand || '' }
      else if (sortBy === 'price')      { av = Number(a.preOrderPrice) || 0; bv = Number(b.preOrderPrice) || 0 }
      else if (sortBy === 'qty')        { av = a.qty ?? 0; bv = b.qty ?? 0 }
      else if (sortBy === 'status')     { av = a.status || ''; bv = b.status || '' }
      else if (sortBy === 'bookedAt')   { av = a.bookedAt || ''; bv = b.bookedAt || '' }
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Slotify Orders</h1>
          <p className="text-gray-600 mt-1">
            Manage customer pre-order bookings
          </p>
        </div>
        {orders.length > 0 && (
          <Button variant="outline" onClick={handleExport}>
            📤 Export Orders
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2">
        {(['all', 'pending', 'confirmed', 'shipped', 'delivered'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && ` (${orders.filter(o => o.status === status).length})`}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="space-y-4">
              <div className="text-6xl">📋</div>
              <h3 className="text-xl font-semibold">No Orders Yet</h3>
              <p className="text-gray-600">
                Customer bookings will appear here when they book pre-order items
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Orders ({filteredOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <colgroup>
                  <col style={{ width: colW.orderId }} />
                  <col style={{ width: colW.sku }} />
                  <col style={{ width: colW.description }} />
                  <col style={{ width: colW.customer }} />
                  <col style={{ width: colW.brand }} />
                  <col style={{ width: colW.price }} />
                  <col style={{ width: colW.qty }} />
                  <col style={{ width: colW.status }} />
                  <col style={{ width: colW.bookedAt }} />
                  <col style={{ width: 80 }} />
                </colgroup>
                <thead>
                  <tr className="border-b bg-gray-50 text-xs uppercase tracking-wide">
                    {(() => {
                      const SortTh = ({ col, label, align = 'left' }: { col: string; label: string; align?: 'left'|'right'|'center' }) => {
                        const active = sortBy === col
                        return (
                          <th style={{ position: 'relative' }} className={`py-3 px-4 cursor-pointer select-none group whitespace-nowrap text-${align} ${active ? 'text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => { if (active) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(col); setSortDir('asc') } }}>
                            <span className="inline-flex items-center gap-1">{label}
                              <span className={`transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>{active && sortDir === 'desc' ? '↑' : '↓'}</span>
                            </span>
                            <div onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); const startX = e.clientX; const startW = (e.currentTarget as HTMLElement).closest('th')?.offsetWidth ?? 100; const onMove = (ev: MouseEvent) => setWidth(col, Math.max(40, startW + ev.clientX - startX)); const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp) }} onClick={e => e.stopPropagation()} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/50 select-none z-10" />
                          </th>
                        )
                      }
                      return (
                        <>
                          <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase" style={{ position: 'relative' }}>Order ID<div onMouseDown={(e) => { e.preventDefault(); const startX = e.clientX; const startW = (e.currentTarget as HTMLElement).closest('th')?.offsetWidth ?? colW.orderId; const onMove = (ev: MouseEvent) => setWidth('orderId', Math.max(40, startW + ev.clientX - startX)); const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp) }} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/50 select-none z-10" /></th>
                          <SortTh col="sku" label="SKU" />
                          <SortTh col="description" label="Description" />
                          <SortTh col="customer" label="Customer" />
                          <SortTh col="brand" label="Brand" />
                          <SortTh col="price" label="Price (R)" align="right" />
                          <SortTh col="qty" label="Qty" align="right" />
                          <SortTh col="status" label="Status" align="center" />
                          <SortTh col="bookedAt" label="Booked Date" />
                          <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase">Actions</th>
                        </>
                      )
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm">{order.id}</td>
                      <td className="py-3 px-4 font-mono text-sm">{order.sku}</td>
                      <td className={`py-3 px-4 break-words ${colW.description < 120 ? 'text-[10px]' : colW.description < 155 ? 'text-[11px]' : 'text-sm'}`}>{order.description}</td>
                      <td className="py-3 px-4">{order.customerName || 'N/A'}</td>
                      <td className="py-3 px-4">{order.brand}</td>
                      <td className="py-3 px-4">R{order.preOrderPrice}</td>
                      <td className="py-3 px-4">{order.qty}</td>
                      <td className="py-3 px-4">{getStatusBadge(order.status)}</td>
                      <td className="py-3 px-4">{new Date(order.bookedAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <Button variant="outline" size="sm">
                          View
                        </Button>
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
