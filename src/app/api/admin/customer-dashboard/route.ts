import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'

const DOCS_KEY    = 'data/order-documents.json'
const CREDITS_KEY = 'data/customer-credits.json'

function docTotal(doc: any): number {
  const sub = (doc.lineItems || []).reduce((s: number, li: any) => s + (li.qty || 0) * (li.unitPrice || 0), 0)
  const disc = sub * ((doc.discountPct || 0) / 100)
  return sub - disc + (doc.shippingCost || 0)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientName = searchParams.get('client')
    const dateFrom   = searchParams.get('from')
    const dateTo     = searchParams.get('to')

    if (!clientName) return NextResponse.json({ error: 'client required' }, { status: 400 })

    const [allDocs, credits] = await Promise.all([
      blobRead<any[]>(DOCS_KEY, []),
      blobRead<any>(CREDITS_KEY, {}),
    ])

    const clientLower = clientName.toLowerCase()
    let docs = allDocs.filter((d) => (d.clientName || '').toLowerCase() === clientLower)

    if (dateFrom) {
      const from = new Date(dateFrom)
      docs = docs.filter((d) => new Date(d.createdAt) >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo); to.setHours(23, 59, 59, 999)
      docs = docs.filter((d) => new Date(d.createdAt) <= to)
    }

    // Enrich with computed total
    docs = docs.map((d) => ({ ...d, _total: docTotal(d) }))

    const creditKey = clientName.toLowerCase().replace(/\s+/g, '_')
    const credit = credits[creditKey] || { clientName, balance: 0, transactions: [] }

    return NextResponse.json({ documents: docs, credit })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
