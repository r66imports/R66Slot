import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'
import { db } from '@/lib/db'
import { extractSku } from '@/lib/order-helpers'
import type { OrderDocument } from '@/app/api/admin/orders/documents/route'

const KEY = 'data/order-documents.json'
const CANCELLED = new Set(['archived', 'rejected'])

export interface InvoiceLine {
  docNumber: string
  type: 'invoice' | 'salesorder'
  date: string
  clientName: string
  qty: number
  synced: boolean
}

export interface SkuAuditRow {
  sku: string
  title: string
  supplier: string
  currentQty: number
  impliedStarting: number   // currentQty + totalSoldQty + totalReservedQty
  totalSoldQty: number      // ALL invoice line items (synced + unsynced)
  syncedSoldQty: number     // only stockDeducted=true invoices
  totalReservedQty: number  // ALL SO line items
  unsyncedDocs: string[]
  invoices: InvoiceLine[]
  status: 'ok' | 'unsynced' | 'oversold'
}

export async function GET() {
  try {
    const docs = await blobRead<OrderDocument[]>(KEY, [])

    // Load products: sku, title, quantity, supplier
    const prodResult = await db.query(
      `SELECT sku, title, COALESCE(quantity, 0) AS quantity, COALESCE(supplier, '') AS supplier
       FROM products WHERE sku IS NOT NULL AND sku <> '' ORDER BY sku`
    )
    const productMap: Record<string, { title: string; qty: number; supplier: string }> = {}
    for (const row of prodResult.rows) {
      productMap[row.sku.toLowerCase()] = {
        title: row.title,
        qty: parseInt(row.quantity, 10),
        supplier: row.supplier || '',
      }
    }

    // Aggregate per SKU
    const skuData: Record<string, {
      totalSoldQty: number
      syncedSoldQty: number
      totalReservedQty: number
      unsyncedDocs: string[]
      invoices: InvoiceLine[]
    }> = {}

    const ensure = (sku: string) => {
      const k = sku.toLowerCase()
      if (!skuData[k]) skuData[k] = {
        totalSoldQty: 0,
        syncedSoldQty: 0,
        totalReservedQty: 0,
        unsyncedDocs: [],
        invoices: [],
      }
      return k
    }

    let totalDocs = 0, syncedDocs = 0, unsyncedDocs = 0

    for (const doc of docs) {
      if (doc.type === 'quote') continue
      if (CANCELLED.has(doc.status)) continue
      totalDocs++
      if (doc.stockDeducted) syncedDocs++
      else unsyncedDocs++

      for (const li of doc.lineItems || []) {
        const sku = extractSku(li.description)
        if (!sku || li.qty <= 0) continue
        const k = ensure(sku)

        if (doc.type === 'invoice') {
          skuData[k].totalSoldQty += li.qty
          if (doc.stockDeducted) skuData[k].syncedSoldQty += li.qty
        } else if (doc.type === 'salesorder') {
          skuData[k].totalReservedQty += li.qty
        }

        if (!doc.stockDeducted && !skuData[k].unsyncedDocs.includes(doc.docNumber)) {
          skuData[k].unsyncedDocs.push(doc.docNumber)
        }

        // Build invoice breakdown list (invoices + SOs)
        skuData[k].invoices.push({
          docNumber: doc.docNumber,
          type: doc.type as 'invoice' | 'salesorder',
          date: (doc as any).date || (doc as any).createdAt || '',
          clientName: (doc as any).clientName || (doc as any).toName || '',
          qty: li.qty,
          synced: !!doc.stockDeducted,
        })
      }
    }

    const rows: SkuAuditRow[] = []
    const allSkus = new Set(Object.keys(skuData))

    for (const k of allSkus) {
      const product = productMap[k]
      const data = skuData[k]
      const currentQty = product?.qty ?? 0
      const impliedStarting = currentQty + data.totalSoldQty + data.totalReservedQty

      const unsyncedQty = data.totalSoldQty - data.syncedSoldQty
      const oversold = currentQty === 0 && data.totalSoldQty > 0 && impliedStarting < data.totalSoldQty

      let status: SkuAuditRow['status'] = 'ok'
      if (unsyncedQty > 0) status = 'unsynced'
      if (oversold) status = 'oversold'

      // Sort invoices newest first
      const sortedInvoices = data.invoices.sort((a, b) => {
        if (a.date && b.date) return b.date.localeCompare(a.date)
        return 0
      })

      rows.push({
        sku: k,
        title: product?.title ?? '(unknown product)',
        supplier: product?.supplier ?? '',
        currentQty,
        impliedStarting,
        totalSoldQty: data.totalSoldQty,
        syncedSoldQty: data.syncedSoldQty,
        totalReservedQty: data.totalReservedQty,
        unsyncedDocs: data.unsyncedDocs,
        invoices: sortedInvoices,
        status,
      })
    }

    rows.sort((a, b) => {
      const order = { unsynced: 0, oversold: 1, ok: 2 }
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
      return a.sku.localeCompare(b.sku)
    })

    return NextResponse.json({ totalDocs, syncedDocs, unsyncedDocs, rows })
  } catch (err: any) {
    console.error('[stock-audit]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
