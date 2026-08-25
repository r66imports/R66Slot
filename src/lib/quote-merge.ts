// Quote → Invoice consolidation helpers (Rule 28 audit trail).
//
// Several Quotes routinely end up on ONE Invoice: the first is converted into a new Invoice,
// the rest are merged in afterwards via "Send to Invoice → Add to Existing" or the Pre-Order
// Dashboard's Send-to dropdown. Two halves of the audit trail used to fall out of that:
//
//   1. Payments carried over from a Quote arrived UNLABELLED on every path but one, so the
//      Payments list showed a bare "R4 391.16 · EFT" with no way to tell which Quote's
//      deposit it was — the reason INV R66INV666708 showed "From Quote QR66100" on one line
//      and nothing on the two that came across with QR66126.
//   2. sourceQuoteNumber only ever held the Quote that CREATED the Invoice, so every Quote
//      merged in afterwards vanished from the "Quote Ref:" header, the PDF and the Orders
//      table label.
//
// Both carry-over paths (convert-to-new and append-to-existing, in Orders and in the
// Pre-Order Dashboard) must go through these helpers so the labelling is identical whichever
// entry point the user takes.

/** Stamp "From Quote QR66xxx" onto every payment copied off a Quote. Idempotent — re-running
 *  a merge, or moving an already-tagged payment on again, never double-stamps. */
export function tagPaymentsFromQuote<T extends { notes?: string }>(
  payments: T[] | undefined | null,
  quoteNumber: string | undefined | null,
): T[] {
  const list = Array.isArray(payments) ? payments : []
  const ref = String(quoteNumber || '').trim()
  if (!ref) return [...list]
  const tag = `From Quote ${ref}`
  return list.map((p) => {
    const notes = String(p?.notes || '')
    if (notes.includes(tag)) return p
    return { ...p, notes: [notes, tag].filter(Boolean).join(' — ') }
  })
}

/** Append a Quote number to an Invoice's "Quote Ref:" list, keeping order and de-duplicating.
 *  Stored as a comma-separated string so the existing single-value readers (header, PDF,
 *  Orders table) keep working unchanged. */
export function mergeQuoteRefs(
  existing: string | undefined | null,
  quoteNumber: string | undefined | null,
): string {
  const refs = String(existing || '').split(',').map((s) => s.trim()).filter(Boolean)
  const next = String(quoteNumber || '').trim()
  if (next && !refs.some((r) => r.toLowerCase() === next.toLowerCase())) refs.push(next)
  return refs.join(', ')
}
