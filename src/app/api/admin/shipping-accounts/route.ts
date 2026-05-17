import { NextRequest, NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'

const KEY = 'data/order-documents.json'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month') // 0-indexed

    const docs = await blobRead<any[]>(KEY, [])

    const rows = docs
      .filter(d =>
        d.type === 'invoice' &&
        Number(d.shippingCost || 0) > 0
      )
      .map(d => ({
        id: d.id,
        docNumber: d.docNumber || '',
        date: d.createdAt,
        clientName: d.clientName || '',
        shippingMethod: d.shippingMethod || '',
        shippingCost: Number(d.shippingCost || 0),
        status: d.status || '',
      }))
      .filter(r => {
        if (!year || !month) return true
        const d = new Date(r.date)
        return d.getFullYear() === Number(year) && d.getMonth() === Number(month)
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const total = rows.reduce((s, r) => s + r.shippingCost, 0)

    return NextResponse.json({ rows, total })
  } catch (err) {
    console.error('[shipping-accounts]', err)
    return NextResponse.json({ rows: [], total: 0 })
  }
}
