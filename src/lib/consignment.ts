/**
 * Consignment stock — R66Slot (Rule 69).
 *
 * The Sales Order IS the consignment record. A Sales Order ticked "Consignment stock"
 * (`consignment: true`) holds what is out with the client; its stock came off the shelf when it
 * was made.
 *
 * The client opens Account → Consignment Checklist, picks the SO and ticks off what sold. That
 * report waits in `data/consignment-orders.json` until admin sends it to Invoice from
 * Orders → Consignment Orders. Sending it does exactly what Orders' partial
 * Sales Order → Invoice has always done: the sold lines come OFF the Sales Order onto a normal
 * INV invoice (note "Items from SO…"), and the invoice takes the SO's stock deduction over.
 * So the SO always shows what is still out, and the invoices from it are what sold.
 */

export const CONSIGNMENT_KEY = 'data/consignment-orders.json'
export const DOCS_KEY = 'data/order-documents.json'

export interface ConsignmentLine {
  lineId: string
  description: string
  qty: number
  unitPrice: number
}

/** A client's sold-qty report against one consignment Sales Order. */
export interface ConsignmentOrder {
  id: string
  soId: string
  soNumber: string
  clientName: string
  clientEmail: string
  lines: ConsignmentLine[]
  note?: string
  status: 'new' | 'invoiced' | 'rejected'
  invoiceId?: string
  invoiceNumber?: string
  createdAt: string
  invoicedAt?: string
}

/** A line's stable key. Legacy lines without an id fall back to their position. */
export function lineKey(li: { id?: string }, index: number): string {
  return li.id || `idx_${index}`
}

/** An SO the client can still report against. */
export function isOpenConsignmentSO(d: any): boolean {
  return d?.type === 'salesorder' && d.consignment === true && d.status !== 'archived' && d.status !== 'rejected'
}

/** Qty reported sold but not yet invoiced, per SO line. Invoiced lines have already left the SO. */
export function pendingByLine(orders: ConsignmentOrder[], soId: string): Map<string, number> {
  const map = new Map<string, number>()
  for (const o of orders) {
    if (o.soId !== soId || o.status !== 'new') continue
    for (const l of o.lines) map.set(l.lineId, (map.get(l.lineId) || 0) + (Number(l.qty) || 0))
  }
  return map
}

/** Invoices raised from this Sales Order — Orders' partial SO → Invoice notes them "Items from SO…". */
export function invoicesFromSO(so: any, docs: any[]): any[] {
  const num = String(so.docNumber || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (!num) return []
  const re = new RegExp(`Items from ${num}(?!\\d)`)
  return docs.filter(d => d.type === 'invoice' && d.status !== 'rejected' && re.test(d.notes || ''))
}

/** The checklist view of one consignment SO: what is still out, and what is already reported. */
export function checklistFor(so: any, orders: ConsignmentOrder[]) {
  const pending = pendingByLine(orders, so.id)
  const lines = (so.lineItems || [])
    .map((li: any, i: number) => {
      const key = lineKey(li, i)
      const qty = Number(li.qty) || 0
      const reported = pending.get(key) || 0
      return {
        lineId: key,
        description: li.description || '',
        qty,
        unitPrice: Number(li.unitPrice) || 0,
        reported,
        remaining: Math.max(0, qty - reported),
        _service: !!li._service,
      }
    })
    .filter((l: any) => !l._service && l.qty > 0)
  return {
    soId: so.id,
    soNumber: so.docNumber,
    date: so.date,
    clientName: so.clientName,
    lines,
    totalQty: lines.reduce((s: number, l: any) => s + l.qty, 0),
    totalReported: lines.reduce((s: number, l: any) => s + l.reported, 0),
    totalRemaining: lines.reduce((s: number, l: any) => s + l.remaining, 0),
  }
}

/** Admin picture of one consignment SO: sent = still out + sold; sold = invoices from the SO. */
export function stockPictureFor(so: any, orders: ConsignmentOrder[], docs: any[]) {
  const view = checklistFor(so, orders)
  const invoices = invoicesFromSO(so, docs).map(inv => {
    const lines = (inv.lineItems || []).filter((l: any) => !l._service)
    return {
      id: inv.id,
      docNumber: inv.docNumber,
      date: inv.date,
      status: inv.status,
      lines: lines.map((l: any) => ({ description: l.description || '', qty: Number(l.qty) || 0, unitPrice: Number(l.unitPrice) || 0 })),
      qty: lines.reduce((s: number, l: any) => s + (Number(l.qty) || 0), 0),
    }
  })
  const soldQty = invoices.reduce((s, i) => s + i.qty, 0)
  const outValue = view.lines.reduce((s: number, l: any) => s + l.qty * l.unitPrice, 0)
  return {
    ...view,
    clientEmail: so.clientEmail || '',
    /** Where the SO came from — the start of the Quote → Sales Order → Invoice chain. */
    sourceQuoteNumber: so.sourceQuoteNumber || '',
    invoices,
    soldQty,
    sentQty: view.totalQty + soldQty,
    outValue: Math.round(outValue * 100) / 100,
  }
}
