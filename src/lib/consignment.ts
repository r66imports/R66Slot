/**
 * Consignment stock — R66Slot (ported from R66Emporium, 22 Nov 2026).
 *
 * A Sales Order ticked "Consignment stock" (`consignment: true`) is stock handed to a reseller
 * to sell on our behalf. The SO took the stock off the shelf when it was made (Rule 3), so it
 * is already out of Inventory QTY.
 *
 * The reseller opens Account → Consignment Checklist, picks the SO and ticks off the qtys they
 * have sold. Each submission is a Consignment Order (this blob). Admin sees them under
 * Orders → Consignment Orders and sends one to Invoice — that invoice is raised with
 * stockAlreadyReserved, so it never deducts the stock a second time.
 */

export const CONSIGNMENT_KEY = 'data/consignment-orders.json'
export const DOCS_KEY = 'data/order-documents.json'

export interface ConsignmentLine {
  lineId: string
  description: string
  qty: number
  unitPrice: number
}

export interface ConsignmentOrder {
  id: string
  number: string
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

/** An SO the reseller can still report against. */
export function isOpenConsignmentSO(d: any): boolean {
  return d?.type === 'salesorder' && d.consignment === true && d.status !== 'archived' && d.status !== 'rejected'
}

/** Qty already reported as sold per SO line. Rejected reports free their qtys again. */
export function reportedByLine(orders: ConsignmentOrder[], soId: string): Map<string, number> {
  const map = new Map<string, number>()
  for (const o of orders) {
    if (o.soId !== soId || o.status === 'rejected') continue
    for (const l of o.lines) map.set(l.lineId, (map.get(l.lineId) || 0) + (Number(l.qty) || 0))
  }
  return map
}

/** The checklist view of one consignment SO. */
export function checklistFor(so: any, orders: ConsignmentOrder[]) {
  const reported = reportedByLine(orders, so.id)
  const lines = (so.lineItems || [])
    .map((li: any, i: number) => {
      const key = lineKey(li, i)
      const qty = Number(li.qty) || 0
      const sold = reported.get(key) || 0
      return {
        lineId: key,
        description: li.description || '',
        qty,
        unitPrice: Number(li.unitPrice) || 0,
        sold,
        remaining: Math.max(0, qty - sold),
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
    totalSold: lines.reduce((s: number, l: any) => s + l.sold, 0),
    totalRemaining: lines.reduce((s: number, l: any) => s + l.remaining, 0),
  }
}

/** Next CON number: CON001, CON002 … */
export function nextConsignmentNumber(orders: ConsignmentOrder[]): string {
  const nums = orders.map(o => { const m = /^CON(\d+)$/.exec(o.number || ''); return m ? parseInt(m[1], 10) : 0 })
  const next = (nums.length ? Math.max(0, ...nums) : 0) + 1
  return `CON${String(next).padStart(3, '0')}`
}
