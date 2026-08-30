import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'
import { getItems, saveItems, invalidateCache } from '@/lib/preorder-helpers'

// One-off repair for Pre-Order Dashboard entries left pointing at a converted Quote.
//
// Sending a Quote to an Invoice only re-pointed the card whose Send-to dropdown was used,
// so the customer's other cards on the same Quote kept showing the Quote number even
// though that Quote had been archived into the Invoice. The Send-to paths now relink every
// entry at conversion time; this catches the entries stranded before that.
//
// The forward pointer is the Invoice's sourceQuoteNumber, which under Rule 28 names every
// Quote merged into it. Only entries whose Quote is actually archived are moved — a live
// Quote has not been converted and must keep its own number.
//
// GET  /api/admin/fix/relink-preorder-quotes          -> dry run, returns the plan
// GET  /api/admin/fix/relink-preorder-quotes?apply=1  -> writes

const DOCS_KEY = 'data/order-documents.json'

export async function GET(request: Request) {
  try {
    const apply = new URL(request.url).searchParams.get('apply') === '1'
    const docs = await blobRead<any[]>(DOCS_KEY, [])

    const quotesByNumber = new Map<string, any>()
    for (const d of docs) if (d.type === 'quote' && d.docNumber) quotesByNumber.set(d.docNumber, d)

    // Quote number -> the Invoice that absorbed it. Rule 28 keeps every merged Quote named
    // in sourceQuoteNumber, so a consolidated Invoice resolves all of its Quotes.
    const invoiceByQuote = new Map<string, any>()
    const ambiguous: { quote: string; invoices: string[] }[] = []
    for (const d of docs) {
      if (d.type !== 'invoice' || !d.sourceQuoteNumber) continue
      for (const raw of String(d.sourceQuoteNumber).split(',')) {
        const q = raw.trim()
        if (!q) continue
        const prev = invoiceByQuote.get(q)
        if (prev && prev.id !== d.id) {
          const hit = ambiguous.find((a) => a.quote === q)
          if (hit) hit.invoices.push(d.docNumber)
          else ambiguous.push({ quote: q, invoices: [prev.docNumber, d.docNumber] })
          continue
        }
        invoiceByQuote.set(q, d)
      }
    }

    const items = await getItems()
    const plan: any[] = []
    const skipped: any[] = []

    for (const item of items) {
      for (const c of (item.customers || []) as any[]) {
        const linked = c.linkedDocNumber
        if (!linked) continue
        const inv = invoiceByQuote.get(linked)
        if (!inv) continue
        if (ambiguous.some((a) => a.quote === linked)) {
          skipped.push({ sku: item.sku, name: c.name, quote: linked, reason: 'quote merged into more than one invoice' })
          continue
        }
        const quote = quotesByNumber.get(linked)
        if (quote && quote.status !== 'archived') {
          skipped.push({ sku: item.sku, name: c.name, quote: linked, reason: 'quote still open — not converted' })
          continue
        }
        plan.push({
          itemId: item.id, sku: item.sku, customerId: c.id, name: c.name,
          from: linked, to: inv.docNumber, toDocId: inv.id,
        })
      }
    }

    if (!apply) {
      return NextResponse.json({ dryRun: true, count: plan.length, plan, skipped, ambiguous })
    }
    if (plan.length === 0) {
      return NextResponse.json({ applied: false, count: 0, reason: 'Nothing to relink', skipped, ambiguous })
    }

    const now = new Date().toISOString()
    const updated = items.map((item) => {
      const hits = plan.filter((p) => p.itemId === item.id)
      if (hits.length === 0) return item
      return {
        ...item,
        customers: ((item.customers || []) as any[]).map((c) => {
          const hit = hits.find((p) => p.customerId === c.id)
          return hit ? { ...c, linkedDocId: hit.toDocId, linkedDocNumber: hit.to } : c
        }),
        updatedAt: now,
      }
    })
    await saveItems(updated)
    invalidateCache()

    return NextResponse.json({ applied: true, count: plan.length, plan, skipped, ambiguous })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 })
  }
}
