import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'

function parseSku(description: string): string {
  const sep = description.indexOf(' \u2013 ')
  return sep !== -1 ? description.slice(0, sep).trim() : ''
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sku = searchParams.get('sku')?.trim()
  if (!sku) return NextResponse.json({ error: 'sku required' }, { status: 400 })

  const skuLower = sku.toLowerCase()

  // ── Sales: from invoices ──────────────────────────────────────────────────
  type LineItem = { description: string; qty: number; unitPrice: number }
  type OrderDoc = { id: string; docNumber: string; date: string; clientName: string; type: string; status: string; lineItems: LineItem[] }

  const docs = await blobRead<OrderDoc[]>('data/order-documents.json', [])
  const invoices = docs.filter((d) => d.type === 'invoice' && d.status !== 'archived')

  type SaleRow = { docNumber: string; date: string; clientName: string; qty: number; unitPrice: number; lineTotal: number }
  const salesRows: SaleRow[] = []
  let totalQtySold = 0
  let totalRevenue = 0

  for (const inv of invoices) {
    for (const li of (inv.lineItems || [])) {
      if (parseSku(li.description).toLowerCase() === skuLower) {
        const qty = Number(li.qty) || 0
        const price = Number(li.unitPrice) || 0
        const lineTotal = qty * price
        totalQtySold += qty
        totalRevenue += lineTotal
        salesRows.push({
          docNumber: inv.docNumber,
          date: inv.date,
          clientName: inv.clientName,
          qty,
          unitPrice: price,
          lineTotal,
        })
      }
    }
  }
  salesRows.sort((a, b) => a.date.localeCompare(b.date))

  // ── Purchases: from backorders ────────────────────────────────────────────
  type BackorderItem = { sku: string; qty: number; description?: string; brand?: string }
  type Backorder = { id: string; orderNumber?: string; clientName?: string; createdAt?: string; status?: string; items: BackorderItem[] }

  const backorders = await blobRead<Backorder[]>('data/backorders.json', [])

  type PurchaseRow = { orderNumber: string; date: string; clientName: string; qty: number }
  const purchaseRows: PurchaseRow[] = []
  let totalQtyOrdered = 0

  for (const bo of backorders) {
    for (const item of (bo.items || [])) {
      if ((item.sku || '').toLowerCase() === skuLower) {
        const qty = Number(item.qty) || 0
        totalQtyOrdered += qty
        purchaseRows.push({
          orderNumber: bo.orderNumber || bo.id,
          date: bo.createdAt || '',
          clientName: bo.clientName || '',
          qty,
        })
      }
    }
  }
  purchaseRows.sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({
    sku,
    sales: {
      totalQtySold,
      totalRevenue,
      invoiceCount: salesRows.length,
      lastSold: salesRows[0]?.date || null,
      rows: salesRows.slice(0, 20),
    },
    purchases: {
      totalQtyOrdered,
      orderCount: purchaseRows.length,
      rows: purchaseRows.slice(0, 20),
    },
  })
}
