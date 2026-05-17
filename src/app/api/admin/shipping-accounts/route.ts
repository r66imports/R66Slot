import { NextRequest, NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const DOCS_KEY    = 'data/order-documents.json'
const PAID_KEY    = 'data/shipping-paid.json'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from') // YYYY-MM-DD
    const to   = searchParams.get('to')   // YYYY-MM-DD

    const [docs, paid] = await Promise.all([
      blobRead<any[]>(DOCS_KEY, []),
      blobRead<Record<string, string | null>>(PAID_KEY, {}),
    ])

    const fromMs = from ? new Date(from).setHours(0, 0, 0, 0) : null
    const toMs   = to   ? new Date(to).setHours(23, 59, 59, 999) : null

    const rows = docs
      .filter(d => d.type === 'invoice' && Number(d.shippingCost || 0) > 0)
      .map(d => ({
        id:             d.id,
        docNumber:      d.docNumber || '',
        date:           d.createdAt,
        clientName:     d.clientName || '',
        shippingMethod: d.shippingMethod || '',
        shippingCost:   Number(d.shippingCost || 0),
        status:         d.status || '',
        shippingPaid:   !!paid[d.id],
        shippingPaidAt: paid[d.id] || null,
      }))
      .filter(r => {
        const t = new Date(r.date).getTime()
        if (fromMs !== null && t < fromMs) return false
        if (toMs   !== null && t > toMs)   return false
        return true
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const total       = rows.reduce((s, r) => s + r.shippingCost, 0)
    const totalPaid   = rows.filter(r => r.shippingPaid).reduce((s, r) => s + r.shippingCost, 0)
    const outstanding = total - totalPaid

    return NextResponse.json({ rows, total, totalPaid, outstanding })
  } catch (err) {
    console.error('[shipping-accounts GET]', err)
    return NextResponse.json({ rows: [], total: 0, totalPaid: 0, outstanding: 0 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { invoiceId, paid } = await request.json()
    if (!invoiceId) return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 })

    const paidMap = await blobRead<Record<string, string | null>>(PAID_KEY, {})
    if (paid) {
      paidMap[invoiceId] = new Date().toISOString()
    } else {
      delete paidMap[invoiceId]
    }
    await blobWrite(PAID_KEY, paidMap)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[shipping-accounts PATCH]', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
