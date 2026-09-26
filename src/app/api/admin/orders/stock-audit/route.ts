import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'
import { db } from '@/lib/db'
import { extractSku, isStockLine } from '@/lib/order-helpers'
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
  impliedStarting: number   // stock booked in per the adjustment log, else the worksheet, else derived
  startingSource: 'log' | 'worksheet' | 'derived'
  worksheetIntake: number | null   // what the worksheets say landed, shown even when the log wins
  totalSoldQty: number      // ALL invoice line items + un-invoiced site orders
  syncedSoldQty: number     // only stockDeducted=true invoices
  totalReservedQty: number  // ALL SO line items
  unsyncedDocs: string[]
  invoices: InvoiceLine[]
  variance: number | null   // bookedIn - (current + sold + reserved); 0 = balances, null = nothing to compare against
  historyPartial: boolean   // sales predate the log, so variance cannot be trusted
  noIntakeLogged: boolean   // no intake anywhere — the starting figure is sales worked backwards
  status: 'ok' | 'unsynced' | 'oversold' | 'unaudited' | 'unaccounted'
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

    // ── What the worksheets say landed ──
    // Stock reaches Inventory by one route: Pre-Order Dashboard -> Worksheet -> Update
    // Qty's. The worksheet is where the landed quantity is established, so it is the
    // birth certificate of on-hand stock. On this site nothing writes to stock_audit_log
    // at all, so without this every SKU falls back to sales worked backwards — a figure
    // then graded against the very sales it was built from, which can only read zero.
    type WsAgg = { qty: number; firstDate: string | null }
    const wsMap: Record<string, WsAgg> = {}
    try {
      const sheets = await blobRead<any[]>('data/worksheets.json', [])
      for (const sheet of sheets || []) {
        const sheetDate = String(sheet?.date || sheet?.createdAt || '').slice(0, 10)
        const items: any[] = Array.isArray(sheet?.items) ? sheet.items : []
        for (const it of items) {
          // Only quantities actually pushed to Inventory are intake. An item still sitting
          // on an open sheet has moved no stock yet, and counting it would book in goods
          // that are still on a boat.
          if (!it?.sentToInventory) continue
          const sku = String(it.sku || '').trim().toLowerCase()
          const qty = Number(it.qty) || 0
          if (!sku || qty <= 0) continue
          const agg = wsMap[sku] || (wsMap[sku] = { qty: 0, firstDate: null })
          agg.qty += qty
          if (sheetDate && (!agg.firstDate || sheetDate < agg.firstDate)) agg.firstDate = sheetDate
        }
      }
    } catch {
      // no worksheets blob — the ledger and the estimate carry it as before
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
        if (!isStockLine(li)) continue
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
      // Ranked, never summed. A SKU whose first worksheet went unlogged and whose later
      // restock WAS logged would otherwise count some units twice. The ledger wins wherever
      // it holds any intake, the worksheet fills the hole it leaves, and only when neither
      // says anything does the figure fall back to sales worked backwards.
      const ws = wsMap[k]
      const worksheetStarting = ws && ws.qty > 0 ? ws.qty : null
      const impliedStarting = loggedStarting ?? worksheetStarting ?? derivedStarting
      const startingSource: SkuAuditRow['startingSource'] =
        loggedStarting !== null ? 'log' : worksheetStarting !== null ? 'worksheet' : 'derived'

      // ── A derived starting figure cannot be audited against itself ──
      // With no intake anywhere, impliedStarting IS derivedStarting, so the subtraction
      // below reads 21 - 21 for every such SKU and can only ever come out at zero. That
      // reported a whole class of unauditable SKUs as balanced. Nothing to compare
      // against is now reported as exactly that.
      const noIntakeLogged = loggedStarting === null && worksheetStarting === null
      const variance = noIntakeLogged ? null : impliedStarting - derivedStarting

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
      // A worksheet-sourced figure has the same exposure: sales that predate the shipment
      // mean earlier stock arrived that no sheet here covers.
      const firstMovement = log?.firstMovement ?? null
      const intakeHorizon = startingSource === 'worksheet' ? (ws?.firstDate ?? null) : firstMovement
      const historyPartial =
        variance !== null && variance !== 0 &&
        !noIntakeLogged &&
        data.totalSoldQty > 0 &&
        !!data.earliestSale &&
        (intakeHorizon === null || data.earliestSale < intakeHorizon)

      const unsyncedQty = data.totalSoldQty - data.syncedSoldQty
      // Oversold means more went out than came in. With a partial history that cannot be
      // established — the intake it would be measured against was never written down.
      const oversold =
        !noIntakeLogged && !historyPartial &&
        currentQty === 0 && data.totalSoldQty > 0 && impliedStarting < data.totalSoldQty

      // Ordered so each rung can only ever promote a row, never hide a state the table
      // already showed. 'unaccounted' is new and claims rows that used to read a green OK;
      // it must not swallow the unsynced documents workflow, so unsynced outranks it.
      let status: SkuAuditRow['status'] = 'ok'
      if (noIntakeLogged) status = 'unaudited'
      // A real gap between what came in and what can be accounted for. This used to live
      // only in the detail modal, so a SKU 3 units short sat in the table as a green OK.
      if (variance !== null && variance !== 0 && !historyPartial) status = 'unaccounted'
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
        worksheetIntake: worksheetStarting,
        totalSoldQty: data.totalSoldQty,
        syncedSoldQty: data.syncedSoldQty,
        totalReservedQty: data.totalReservedQty,
        unsyncedDocs: data.unsyncedDocs,
        invoices: sortedInvoices,
        variance,
        historyPartial,
        noIntakeLogged,
        status,
      })
    }

    rows.sort((a, b) => {
      const order: Record<SkuAuditRow['status'], number> = {
        oversold: 0, unsynced: 1, unaccounted: 2, unaudited: 3, ok: 4,
      }
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
      return a.sku.localeCompare(b.sku)
    })

    return NextResponse.json({ totalDocs, syncedDocs, unsyncedDocs, rows })
  } catch (err: any) {
    console.error('[stock-audit]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
