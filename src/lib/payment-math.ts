// Single source of truth for payment arithmetic on Quotes, Sales Orders and Invoices.
//
// ─── THE TRAP THIS FILE EXISTS TO CLOSE ──────────────────────────────────────
//
// `depositPaid` carries TWO DIFFERENT MEANINGS depending on `depositMode`:
//
//   depositMode === true   depositPaid is the deposit DUE, auto-computed from depositPct.
//                          It is money the customer still OWES. Nothing has been received.
//
//   depositMode !== true   depositPaid is a deposit that WAS received — legacy documents
//                          written before payments[] became the payment history.
//
// Counting the deposit-mode value as "already settled" collapses the balance due to the
// balance-on-delivery, so every payment above that figure gets booked as an overpayment
// credit the customer never made. Four payment paths each hand-rolled this arithmetic and
// all four got it wrong, minting R6 886.36 of phantom credit across 12 clients before it
// was caught (QR6671, QR66113, QR66120, QR660029-36, INV0019, INV0251).
//
// DO NOT hand-roll `Math.max(amountPaid, depositPaid)` at a call site. Every payment path —
// Record Payment modal, inline payment panel, payment removal, list badges, and any future
// entry point — must go through the functions below so the meaning of depositPaid is
// resolved in exactly one place.
//
// Related site rules: Rule 47 (credit balances), Rule 49/44 (Record Payment is the only
// payment entry point), Rule 50/45 (totals block consistency).

export interface PaymentLineItem {
  qty: number
  unitPrice: number
  discountPct?: number
}

export interface PaymentDoc {
  lineItems?: PaymentLineItem[]
  discountPct?: number
  shippingCost?: number
  amountPaid?: number
  creditApplied?: number
  depositPaid?: number
  depositMode?: boolean
  docNumber?: string
}

/** Values that override what is currently stored on the document — used when a call site is
 *  projecting the result of a payment it has not written yet. */
export interface SettlementOverrides {
  amountPaid?: number
  creditApplied?: number
}

/** Rounding tolerance for money comparisons — half a cent. */
export const MONEY_EPSILON = 0.005

export function lineAmount(li: PaymentLineItem): number {
  return li.qty * li.unitPrice * (1 - (li.discountPct || 0) / 100)
}

/** Total = Subtotal − Discount + Shipping (Rule 5). */
export function documentTotal(doc: PaymentDoc | null | undefined): number {
  if (!doc) return 0
  const sub = (doc.lineItems || []).reduce((s, li) => s + lineAmount(li), 0)
  const disc = sub * (doc.discountPct || 0) / 100
  return sub - disc + (doc.shippingCost || 0)
}

/**
 * How much of `depositPaid` may be treated as money already received.
 *
 * In deposit mode: none of it. The figure is the deposit DUE — the customer still owes it.
 * Otherwise: all of it, on the legacy reading where depositPaid recorded a real deposit.
 */
export function depositAsSettled(doc: PaymentDoc | null | undefined): number {
  if (!doc) return 0
  return doc.depositMode ? 0 : (doc.depositPaid || 0)
}

/**
 * Money considered settled against the document.
 *
 * A legacy deposit is usually folded into amountPaid once recorded as a payment, so the two
 * are combined with Math.max rather than added — otherwise the deposit counts twice.
 */
export function settledAmount(
  doc: PaymentDoc | null | undefined,
  overrides: SettlementOverrides = {},
): number {
  if (!doc) return 0
  const paid = overrides.amountPaid ?? (doc.amountPaid || 0)
  const credit = overrides.creditApplied ?? (doc.creditApplied || 0)
  return Math.max(paid, depositAsSettled(doc)) + credit
}

/** Outstanding balance, never negative. */
export function balanceDue(
  doc: PaymentDoc | null | undefined,
  overrides: SettlementOverrides = {},
): number {
  return Math.max(0, documentTotal(doc) - settledAmount(doc, overrides))
}

/**
 * Settlement once an incoming payment is applied on top of what the document already holds.
 *
 * Note this is CUMULATIVE, not marginal — the incoming amount is added to amountPaid and the
 * Math.max against the deposit is applied to the result. Comparing a payment against the
 * pre-payment balance instead silently sums a legacy deposit twice: the deposit counts as
 * settled, and then the payment that actually delivered it counts again on top. That is what
 * turned R2 395.00 on INV0019 into a R1 335.75 credit. Rules 50/45 are explicit that a
 * deposit folded into amountPaid combines with Math.max, never addition.
 */
export function settledAfterPayment(
  doc: PaymentDoc | null | undefined,
  incoming: { amountReceived?: number; creditApplied?: number } = {},
): number {
  if (!doc) return 0
  const paid = (doc.amountPaid || 0) + (incoming.amountReceived || 0)
  const credit = (doc.creditApplied || 0) + (incoming.creditApplied || 0)
  return Math.max(paid, depositAsSettled(doc)) + credit
}

/** The credit a payment of `amountReceived` would create. Zero unless the customer genuinely
 *  paid more than the document total. */
export function overpaymentFor(
  doc: PaymentDoc | null | undefined,
  amountReceived: number,
  creditApplied = 0,
): number {
  return Math.max(0, settledAfterPayment(doc, { amountReceived, creditApplied }) - documentTotal(doc))
}

export function isFullySettled(
  doc: PaymentDoc | null | undefined,
  overrides: SettlementOverrides = {},
): boolean {
  return settledAmount(doc, overrides) >= documentTotal(doc) - MONEY_EPSILON
}

// ─── Entry-error guards ──────────────────────────────────────────────────────
// Two payments of R66 110.00 and R66 137.00 were once recorded against quotes QR66110 and
// QR66137 — the amount was the document's own number, pasted or autofilled into the amount
// box. Each silently became a five-figure customer credit. These flag it before saving.

/** True when the amount entered is the digits of the document number (e.g. R66 110.00 typed
 *  against QR66110) — almost always a paste or autofill mistake, not a real payment. */
export function amountLooksLikeDocNumber(doc: PaymentDoc | null | undefined, amountReceived: number): boolean {
  const digits = (doc?.docNumber || '').replace(/\D/g, '')
  if (digits.length < 3) return false
  return Math.abs(amountReceived - Number(digits)) < 0.005
}

export type PaymentWarning =
  | { kind: 'doc_number'; message: string }
  | { kind: 'far_over'; message: string }

/**
 * Non-blocking warnings for an amount about to be recorded. The caller shows these and
 * requires explicit confirmation before writing a credit.
 */
export function paymentWarnings(
  doc: PaymentDoc | null | undefined,
  amountReceived: number,
  overrides: SettlementOverrides = {},
): PaymentWarning[] {
  const out: PaymentWarning[] = []
  if (amountReceived <= 0) return out

  if (amountLooksLikeDocNumber(doc, amountReceived)) {
    out.push({
      kind: 'doc_number',
      message: `The amount matches this document's number (${doc?.docNumber}). Check it was not pasted into the amount box.`,
    })
  }

  const total = documentTotal(doc)
  const due = balanceDue(doc, overrides)
  if (total > 0 && amountReceived > total * 2) {
    out.push({
      kind: 'far_over',
      message: `This is more than double the document total. Only R${due.toFixed(2)} is outstanding.`,
    })
  }
  return out
}
