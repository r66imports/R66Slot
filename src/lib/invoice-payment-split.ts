/** How an invoice was paid, by payment method — shared by Events and Event Checklists. */

export interface SplitInvoice {
  id: string
  status: string
  lineItems: Array<{ description: string; qty: number; unitPrice: number; discountPct?: number }>
  discountPct?: number
  shippingCost?: number
  amountPaid?: number
  creditApplied?: number
  paymentMethod?: string
  paymentMethod2?: string
  paymentMethod1Amount?: number
  paymentMethod2Amount?: number
  payments?: Array<{ amountPaid?: number; creditApplied?: number; paymentMethod?: string }>
}

export type PaymentBucket = 'card' | 'cash' | 'eft' | 'other'
export type PaymentSplit = Record<PaymentBucket | 'unpaid', number>

export function paymentBucketOf(method: string): PaymentBucket {
  const m = method.trim()
  if (/^cash\b/i.test(m)) return 'cash' // Rule 48: "Cash", "Cash Deposit" — not "Cashback"
  if (/card|yoco|speedpoint/i.test(m)) return 'card'
  if (/eft|transfer|bank/i.test(m)) return 'eft'
  return 'other'
}

export function invoiceTotal(doc: SplitInvoice): number {
  const sub = (doc.lineItems || []).reduce(
    (s, li) => s + (Number(li.qty) || 0) * (Number(li.unitPrice) || 0) * (1 - (Number(li.discountPct) || 0) / 100), 0)
  return sub * (1 - (Number(doc.discountPct) || 0) / 100) + (Number(doc.shippingCost) || 0)
}

/**
 * Money received on an invoice, by payment method. payments[] is the source of truth
 * (Rule 44); the flat paymentMethod/paymentMethod2 pair is only read for legacy docs with no
 * payment history, using the same guards as Accounting → Invoice Cash (Rule 48).
 * Credit applied lands in Other; whatever is left of the total is Unpaid.
 */
export function paymentSplit(doc: SplitInvoice, total = invoiceTotal(doc)): PaymentSplit {
  const s: PaymentSplit = { card: 0, cash: 0, eft: 0, other: 0, unpaid: 0 }
  const history = (doc.payments || []).filter(
    (p) => (Number(p.amountPaid) || 0) > 0.005 || (Number(p.creditApplied) || 0) > 0.005)

  if (history.length) {
    for (const p of history) {
      const amt = Number(p.amountPaid) || 0
      if (amt > 0.005) s[paymentBucketOf(p.paymentMethod || '')] += amt
      s.other += Number(p.creditApplied) || 0
    }
  } else {
    const m1 = String(doc.paymentMethod || '').trim()
    const m2 = String(doc.paymentMethod2 || '').trim()
    const a1 = Number(doc.paymentMethod1Amount) || 0
    const a2 = Number(doc.paymentMethod2Amount) || 0
    // `??` not `||` — an amountPaid of exactly 0 means settled by credit, not unrecorded.
    const paid = Number(doc.amountPaid ?? (doc.status === 'paid' ? total : 0)) || 0
    let assigned = 0
    if (m1) {
      // A blank split amount alongside a second method is never read as the full amount.
      const amt = a1 > 0.005 ? a1 : (m2 ? 0 : paid)
      s[paymentBucketOf(m1)] += amt
      assigned += amt
    }
    if (m2 && a2 > 0.005) { s[paymentBucketOf(m2)] += a2; assigned += a2 }
    if (paid - assigned > 0.005) s.other += paid - assigned
    s.other += Number(doc.creditApplied) || 0
  }
  s.unpaid = Math.max(0, total - s.card - s.cash - s.eft - s.other)
  return s
}
