import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'
import { db } from '@/lib/db'
import { extractSku } from '@/lib/order-helpers'
import type { OrderDocument } from '@/app/api/admin/orders/documents/route'

const KEY = 'data/order-documents.json'

const CANCELLED = new Set(['archived', 'rejected'])

export interface SkuAuditRow {
  sku: string
  title: string
  currentQty: number
  soldQty: number       // confirmed deducted invoices
  reservedQty: number   // confirmed deducted SOs
  unsyncedQty: number   // invoices/SOs where stockDeducted !== true
  unsyncedDocs: string[]  // doc numbers not yet synced
  status: 'ok' | 'unsynced' | 'oversold'
}

export async function GET() {
  try {
    // Load all documents
    const docs = await blobRead<OrderDocument[]>(KEY, [])

    // Load all products for current quantities + titles
    const prodResult = await db.query(
      `SELECT sku, title, COALESCE(quantity, 0) AS quantity FROM products WHERE sku IS NOT NULL AND sku <> '' ORDER BY sku`
    )
    const productMap: Record<string, { title: string; qty: number }> = {}
    for (const row of prodResult.rows) {
      productMap[row.sku.toLowerCase()] = { title: row.title, qty: parseInt(row.quantity, 10) }
    }

    // Aggregate per SKU from documents
    const skuData: Record<string, {
      soldQty: number
      reservedQty: number
      unsyncedQty: number
      unsyncedDocs: string[]
    }> = {}

    const ensure = (sku: string) => {
      const k = sku.toLowerCase()
      if (!skuData[k]) skuData[k] = { soldQty: 0, reservedQty: 0, unsyncedQty: 0, unsyncedDocs: [] }
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

        if (doc.stockDeducted) {
          if (doc.type === 'invoice') skuData[k].soldQty += li.qty
          else if (doc.type === 'salesorder') skuData[k].reservedQty += li.qty
        } else {
          skuData[k].unsyncedQty += li.qty
          if (!skuData[k].unsyncedDocs.includes(doc.docNumber)) {
            skuData[k].unsyncedDocs.push(doc.docNumber)
          }
        }
      }
    }

    // Build result rows — only SKUs that appear in documents OR have stock discrepancies
    const rows: SkuAuditRow[] = []

    const allSkus = new Set([
      ...Object.keys(skuData),
      // Also include products with qty 0 that have been sold
    ])

    for (const k of allSkus) {
      const product = productMap[k]
      const data = skuData[k] || { soldQty: 0, reservedQty: 0, unsyncedQty: 0, unsyncedDocs: [] }
      const currentQty = product?.qty ?? 0

      // Detect "oversold": stock is 0 but there are confirmed sold/reserved quantities
      // (stock was floored at 0 by GREATEST clause — means we sold more than we had)
      const totalDemand = data.soldQty + data.reservedQty
      const impliedStarting = currentQty + totalDemand
      const oversold = impliedStarting < totalDemand && currentQty === 0 && totalDemand > 0

      let status: SkuAuditRow['status'] = 'ok'
      if (data.unsyncedQty > 0) status = 'unsynced'
      if (oversold) status = 'oversold'

      rows.push({
        sku: k,
        title: product?.title ?? '(unknown product)',
        currentQty,
        soldQty: data.soldQty,
        reservedQty: data.reservedQty,
        unsyncedQty: data.unsyncedQty,
        unsyncedDocs: data.unsyncedDocs,
        status,
      })
    }

    // Sort: unsynced first, then oversold, then ok; within group by sku
    rows.sort((a, b) => {
      const order = { unsynced: 0, oversold: 1, ok: 2 }
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
      return a.sku.localeCompare(b.sku)
    })

    return NextResponse.json({
      totalDocs,
      syncedDocs,
      unsyncedDocs,
      rows,
    })
  } catch (err: any) {
    console.error('[stock-audit]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
