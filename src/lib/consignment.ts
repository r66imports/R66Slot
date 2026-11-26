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

import { costIssue, skuFromDescription } from '@/lib/profit'

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

const r2 = (n: number) => Math.round(n * 100) / 100

/**
 * The discount the WHOLE consignment carries. The first invoice raised from the SO sets it
 * (INV0457 at 20% → all of SO025 is 20% off); before any invoice exists, the SO's own discount.
 */
export function orderDiscount(so: any, invoices: any[]): { pct: number; source: string } {
  const first = [...invoices].sort((a, b) =>
    String(a.date || a.createdAt).localeCompare(String(b.date || b.createdAt)) ||
    String(a.createdAt).localeCompare(String(b.createdAt)))[0]
  if (first) return { pct: Number(first.discountPct) || 0, source: first.docNumber }
  return { pct: Number(so.discountPct) || 0, source: so.docNumber }
}

/** Invoice total with its discount and shipping (same as payment-math documentTotal). */
function invoiceTotal(inv: any): number {
  const sub = (inv.lineItems || []).reduce((s: number, l: any) => s + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0) * (1 - (Number(l.discountPct) || 0) / 100), 0)
  return sub - sub * (Number(inv.discountPct) || 0) / 100 + (Number(inv.shippingCost) || 0)
}
/** Money received on an invoice (payment-math settledAmount: deposit folds in with Math.max). */
function invoiceSettled(inv: any): number {
  const deposit = inv.depositMode ? 0 : (Number(inv.depositPaid) || 0)
  return Math.max(Number(inv.amountPaid) || 0, deposit) + (Number(inv.creditApplied) || 0)
}

export type LandedCosts = Map<string, number>

/**
 * One line priced for the consignment: net = after the order discount; profit only when the
 * LATEST landed cost (product costPerItem, which the Worksheet keeps current) is reliable —
 * a missing or suspect cost (Accounting → Profit's 15% guard) is shown, never guessed.
 */
function priceLine(description: string, qty: number, unitPrice: number, discPct: number, costs: LandedCosts) {
  const sku = skuFromDescription(description).toUpperCase()
  const netUnit = unitPrice * (1 - discPct / 100)
  const landed = costs.get(sku) ?? 0
  const issue = costIssue(landed, netUnit)
  const net = qty * netUnit
  return {
    description, sku, qty, unitPrice, netUnit: r2(netUnit), net: r2(net),
    landed: r2(landed), costIssue: issue,
    profit: issue ? null : r2(net - qty * landed),
  }
}

function sumBlock(lines: ReturnType<typeof priceLine>[]) {
  const costed = lines.filter(l => !l.costIssue)
  const net = lines.reduce((s, l) => s + l.net, 0)
  const costedNet = costed.reduce((s, l) => s + l.net, 0)
  const landed = costed.reduce((s, l) => s + l.qty * l.landed, 0)
  const profit = costedNet - landed
  return {
    net: r2(net),
    costedNet: r2(costedNet),
    landed: r2(landed),
    profit: r2(profit),
    marginPct: costedNet > 0 ? Math.round(profit / costedNet * 1000) / 10 : null,
    uncostedNet: r2(net - costedNet),
    uncostedCount: lines.length - costed.length,
  }
}

/** Admin picture of one consignment SO: sent = still out + sold; sold = invoices from the SO. */
export function stockPictureFor(so: any, orders: ConsignmentOrder[], docs: any[], costs: LandedCosts = new Map()) {
  const view = checklistFor(so, orders)
  const rawInvoices = invoicesFromSO(so, docs)
  const disc = orderDiscount(so, rawInvoices)

  const invoices = rawInvoices.map(inv => {
    const invDisc = Number(inv.discountPct) || 0
    const lines = (inv.lineItems || []).filter((l: any) => !l._service)
      .map((l: any) => priceLine(l.description || '', Number(l.qty) || 0, Number(l.unitPrice) || 0, invDisc, costs))
    const total = invoiceTotal(inv)
    const paid = invoiceSettled(inv)
    return {
      id: inv.id,
      docNumber: inv.docNumber,
      date: inv.date,
      status: inv.status,
      discountPct: invDisc,
      lines,
      qty: lines.reduce((s: number, l: any) => s + l.qty, 0),
      total: r2(total),
      paid: r2(paid),
      due: r2(Math.max(0, total - paid)),
    }
  })
  const outLines = view.lines.map((l: any) => ({
    ...priceLine(l.description, l.qty, l.unitPrice, disc.pct, costs),
    lineId: l.lineId, reported: l.reported, remaining: l.remaining,
  }))

  const soldQty = invoices.reduce((s, i) => s + i.qty, 0)
  const sold = sumBlock(invoices.flatMap(i => i.lines))
  const out = sumBlock(outLines)
  const outGross = view.lines.reduce((s: number, l: any) => s + l.qty * l.unitPrice, 0)
  const allLines = [...invoices.flatMap(i => i.lines), ...outLines]
  return {
    ...view,
    lines: outLines,
    clientEmail: so.clientEmail || '',
    /** Where the SO came from — the start of the Quote → Sales Order → Invoice chain. */
    sourceQuoteNumber: so.sourceQuoteNumber || '',
    invoices,
    soldQty,
    sentQty: view.totalQty + soldQty,
    discountPct: disc.pct,
    discountSource: disc.source,
    /** Still out at full price, and at the order's discounted price. */
    outValue: r2(outGross),
    outValueNet: out.net,
    sold,
    out,
    whole: sumBlock(allLines),
    invoicedTotal: r2(invoices.reduce((s, i) => s + i.total, 0)),
    paid: r2(invoices.reduce((s, i) => s + i.paid, 0)),
    due: r2(invoices.reduce((s, i) => s + i.due, 0)),
    /** SKUs whose landed cost is missing or suspect — fix them on the product / Worksheet. */
    uncosted: Array.from(new Map(allLines.filter(l => l.costIssue).map(l => [l.sku, { sku: l.sku, landed: l.landed, issue: l.costIssue }])).values()),
  }
}

/**
 * The CLIENT's picture of a consignment SO — everything admin sees (sent / sold / still out,
 * the order discount, every invoice with its lines, invoiced / paid / due) EXCEPT landed cost
 * and profit, which are admin only. Built on the server so cost never reaches the browser.
 */
export function clientPictureFor(so: any, orders: ConsignmentOrder[], docs: any[]) {
  const p = stockPictureFor(so, orders, docs)
  const strip = (l: any) => ({ description: l.description, qty: l.qty, unitPrice: l.unitPrice, netUnit: l.netUnit, net: l.net })
  return {
    soId: p.soId,
    soNumber: p.soNumber,
    date: p.date,
    clientName: p.clientName,
    sourceQuoteNumber: p.sourceQuoteNumber,
    lines: p.lines.map((l: any) => ({ ...strip(l), lineId: l.lineId, reported: l.reported, remaining: l.remaining })),
    totalQty: p.totalQty,
    totalReported: p.totalReported,
    totalRemaining: p.totalRemaining,
    sentQty: p.sentQty,
    soldQty: p.soldQty,
    discountPct: p.discountPct,
    outValue: p.outValue,
    outValueNet: p.outValueNet,
    invoicedTotal: p.invoicedTotal,
    paid: p.paid,
    due: p.due,
    invoices: p.invoices.map(inv => ({
      id: inv.id, docNumber: inv.docNumber, date: inv.date, status: inv.status, discountPct: inv.discountPct,
      qty: inv.qty, total: inv.total, paid: inv.paid, due: inv.due, lines: inv.lines.map(strip),
    })),
  }
}
