import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'
import { db } from '@/lib/db'
import { extractSku } from '@/lib/order-helpers'
import type { OrderDocument } from '@/app/api/admin/orders/documents/route'

const KEY = 'data/order-documents.json'
const CANCELLED = new Set(['archived', 'rejected'])

export interface InvoiceLine {
  docNumber: string
  type: 'invoice' | 'salesorder' | 'siteorder'
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
  impliedStarting: number   // stock booked in per the adjustment log, else derived
  startingSource: 'log' | 'derived'
  totalSoldQty: number      // ALL invoice line items + un-invoiced site orders
  syncedSoldQty: number     // only stockDeducted=true invoices
  totalReservedQty: number  // ALL SO line items
  unsyncedDocs: string[]
  invoices: InvoiceLine[]
  variance: number          // bookedIn - (current + sold + reserved); 0 = balances
  historyPartial: boolean   // sales predate the log, so variance cannot be trusted
  status: 'ok' | 'unsynced' | 'oversold'
}

export async function GET() {
  try {
    const docs = await blobRead<OrderDocument[]>(KEY, [])

    // Load products: sku, title, quantity, supplier
    const prodResult = await db.query(
      `SELECT id, sku, title, COALESCE(quantity, 0) AS quantity, COALESCE(supplier, '') AS supplier
       FROM products WHERE sku IS NOT NULL AND sku <> '' ORDER BY sku`
    )
    const productMap: Record<string, { title: string; qty: number; supplier: string }> = {}
    // Site order line items often carry no SKU, so keep id and title routes back to one
    const idToSku: Record<string, string> = {}
    const titleToSku: Record<string, string> = {}
    for (const row of prodResult.rows) {
      productMap[row.sku.toLowerCase()] = {
        title: row.title,
        qty: parseInt(row.quantity, 10),
        supplier: row.supplier || '',
      }
      if (row.id) idToSku[String(row.id)] = row.sku
      const title = String(row.title || '').trim().toLowerCase()
      if (title && !titleToSku[title]) titleToSku[title] = row.sku
    }

    // ── What was booked into the system, straight from the adjustment log ──
    // Est. Starting used to be back-calculated as current + sold + reserved, so it only
    // ever echoed the sales it could already see and never showed what was logged in.
    // A worksheet import of 48 that had sold 28 with 12 left read 40, not 48. The log
    // knows the intake, so read it and keep the old derivation only as a fallback.
    // POS is deliberately NOT an intake source: a POS sale writes its own invoice, so
    // its stock movement is already accounted for on the sales side.
    type LogAgg = { openingQty: number; intakeQty: number; intakeRows: number; firstMovement: string | null }
    const logMap: Record<string, LogAgg> = {}
    try {
      const logResult = await db.query(`
        WITH dedup AS (
          -- One save can land in the log more than once — an autosave that fires three
          -- times writes the same 1 -> 5 movement three times, milliseconds apart, and
          -- summing those triples the intake. Same second, same source, same
          -- before/after is the same movement: once the first made it 5, a second
          -- 1 -> 5 cannot happen. Restocking 1 -> 5 again next week is a different
          -- second, so it still counts.
          SELECT UPPER(sku) AS sku,
                 date_trunc('second', created_at) AS created_at,
                 source, change_qty, qty_before, qty_after, MIN(id) AS id
          FROM stock_audit_log
          GROUP BY UPPER(sku), date_trunc('second', created_at),
                   source, change_qty, qty_before, qty_after
        ),
        opening AS (
          SELECT DISTINCT ON (sku) sku, COALESCE(qty_before, 0) AS qty
          FROM dedup
          ORDER BY sku, created_at ASC, id ASC
        )
        SELECT d.sku AS sku,
               MAX(o.qty) AS opening_qty,
               COALESCE(SUM(d.change_qty) FILTER (
                 WHERE d.source IN ('inventory_save','worksheet_import','product_create','manual')
               ), 0) AS intake_qty,
               COUNT(*) FILTER (
                 WHERE d.source IN ('inventory_save','worksheet_import','product_create','manual')
               ) AS intake_rows,
               MIN(d.created_at) FILTER (
                 WHERE d.source IN ('invoice','invoice_restore','salesorder','salesorder_restore',
                                    'site_order','site_order_restore','pos')
               ) AS first_movement
        FROM dedup d
        LEFT JOIN opening o ON o.sku = d.sku
        GROUP BY d.sku
      `)
      for (const r of logResult.rows) {
        logMap[String(r.sku).toLowerCase()] = {
          openingQty: parseInt(r.opening_qty, 10) || 0,
          intakeQty: parseInt(r.intake_qty, 10) || 0,
          intakeRows: parseInt(r.intake_rows, 10) || 0,
          firstMovement: r.first_movement ? new Date(r.first_movement).toISOString().slice(0, 10) : null,
        }
      }
    } catch {
      // no stock_audit_log table on this site — every SKU falls back to the estimate
    }

    // Aggregate per SKU
    const skuData: Record<string, {
      totalSoldQty: number
      syncedSoldQty: number
      totalReservedQty: number
      unsyncedDocs: string[]
      invoices: InvoiceLine[]
      earliestSale: string      // yyyy-mm-dd of the oldest document touching this SKU
    }> = {}

    const ensure = (sku: string) => {
      const k = sku.toLowerCase()
      if (!skuData[k]) skuData[k] = {
        totalSoldQty: 0,
        syncedSoldQty: 0,
        totalReservedQty: 0,
        unsyncedDocs: [],
        invoices: [],
        earliestSale: '',
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

        const docDate = String((doc as any).date || (doc as any).createdAt || '').slice(0, 10)
        if (docDate && (!skuData[k].earliestSale || docDate < skuData[k].earliestSale)) {
          skuData[k].earliestSale = docDate
        }

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

    // ── Site orders that never reached an invoice ──
    // Rule 31: a website order deducts stock at checkout and its qty later lands on an
    // invoice via Send to Invoice. Once it has, that qty is ALREADY in totalSoldQty and
    // counting the order too would double it — which is why site orders must not be a
    // bucket of their own. Only an order still holding its stock with no invoice behind
    // it is added here: a real sale the audit would otherwise miss.
    try {
      const siteOrders = await blobRead<any[]>('data/checkout-orders.json', [])
      for (const order of siteOrders || []) {
        if (!order || order.invoiceRef || order.stockRestored) continue
        const oStatus = String(order.status || '').toLowerCase()
        if (oStatus === 'cancelled' || oStatus === 'archived') continue
        for (const item of order.items || []) {
          const qty = Number(item?.quantity ?? item?.qty ?? 0)
          if (!(qty > 0)) continue
          const sku =
            String(item?.sku || '').trim() ||
            idToSku[String(item?.id)] ||
            titleToSku[String(item?.title || '').trim().toLowerCase()] ||
            ''
          if (!sku) continue
          const k = ensure(sku)
          const orderDate = String(order.createdAt || '').slice(0, 10)
          if (orderDate && (!skuData[k].earliestSale || orderDate < skuData[k].earliestSale)) {
            skuData[k].earliestSale = orderDate
          }
          skuData[k].totalSoldQty += qty
          skuData[k].syncedSoldQty += qty   // stock came off at checkout
          skuData[k].invoices.push({
            docNumber: order.orderNumber || order.id || 'Site order',
            type: 'siteorder',
            date: order.createdAt || '',
            clientName: [order?.customer?.firstName, order?.customer?.lastName].filter(Boolean).join(' '),
            qty,
            synced: true,
          })
        }
      }
    } catch {
      // no site orders blob — nothing to fold in
    }

    const rows: SkuAuditRow[] = []
    const allSkus = new Set(Object.keys(skuData))

    for (const k of allSkus) {
      const product = productMap[k]
      const data = skuData[k]
      const currentQty = product?.qty ?? 0

      // Everything the audit can see, added back onto what is left on the shelf
      const derivedStarting = currentQty + data.totalSoldQty + data.totalReservedQty
      // What the log says came in: stock on hand before logging began, plus every
      // intake since (worksheet import, inventory save, manual adjust, product create)
      // A log holding only sales rows never recorded an intake, so its opening figure is
      // just a mid-life snapshot and says nothing about what was booked in. Those fall
      // back to the estimate rather than reporting a starting figure that was never set.
      const log = logMap[k]
      const loggedStarting = log && log.intakeRows > 0 ? log.openingQty + log.intakeQty : null
      const impliedStarting = loggedStarting ?? derivedStarting
      const startingSource: SkuAuditRow['startingSource'] = loggedStarting === null ? 'derived' : 'log'
      const variance = impliedStarting - derivedStarting

      // ── Can the variance be trusted at all? ──
      // The log only starts recording movement partway through a SKU's life; anything
      // sold before that is invisible to it, while sales come from the documents blob,
      // which goes back to the very first invoice. Grading a complete sales history
      // against a half-written intake history reports a shortfall that never happened.
      //
      // A SKU whose oldest document predates its first logged movement is therefore
      // reported as partial rather than short: the figure is unknowable, not wrong.
      // Only rows reporting a real shortfall need this. A SKU with no log at all already
      // derives its starting figure from sales, so it balances by construction and saying
      // "partial" over it would tag most of the table with a caveat that explains nothing.
      const firstMovement = log?.firstMovement ?? null
      const historyPartial =
        variance !== 0 &&
        loggedStarting !== null &&
        data.totalSoldQty > 0 &&
        !!data.earliestSale &&
        (firstMovement === null || data.earliestSale < firstMovement)

      const unsyncedQty = data.totalSoldQty - data.syncedSoldQty
      // Oversold means more went out than came in. With a partial history that cannot be
      // established — the intake it would be measured against was never written down.
      const oversold =
        !historyPartial && currentQty === 0 && data.totalSoldQty > 0 && impliedStarting < data.totalSoldQty

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
        startingSource,
        totalSoldQty: data.totalSoldQty,
        syncedSoldQty: data.syncedSoldQty,
        totalReservedQty: data.totalReservedQty,
        unsyncedDocs: data.unsyncedDocs,
        invoices: sortedInvoices,
        variance,
        historyPartial,
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
