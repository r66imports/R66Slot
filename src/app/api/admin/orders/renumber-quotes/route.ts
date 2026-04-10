import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/order-documents.json'

// POST /api/admin/orders/renumber-quotes
// Renumbers all Quotes by date ascending: QR660001, QR660002, QR660003...
export async function POST() {
  try {
    const docs = await blobRead<any[]>(KEY, [])

    // Sort quotes by date ascending (oldest = QR660001)
    const quoteIndices = docs
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => d.type === 'quote')
      .sort((a, b) => {
        const da = new Date(a.d.date || a.d.createdAt).getTime()
        const db2 = new Date(b.d.date || b.d.createdAt).getTime()
        return da - db2
      })

    // Assign QR660001, QR660002... in order
    quoteIndices.forEach(({ i }, seq) => {
      docs[i].docNumber = `QR66${String(seq + 1).padStart(4, '0')}`
      docs[i].updatedAt = new Date().toISOString()
    })

    await blobWrite(KEY, docs)

    return NextResponse.json({
      renumbered: quoteIndices.length,
      numbers: quoteIndices.map(({ i }) => docs[i].docNumber),
    })
  } catch (error: any) {
    console.error('Renumber Quotes error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET /api/admin/orders/renumber-quotes
// Returns the next available QR66 quote number
export async function GET() {
  try {
    const docs = await blobRead<any[]>(KEY, [])
    const nums = docs
      .filter((d) => d.type === 'quote')
      .map((d) => { const m = /^QR66(\d+)$/.exec(d.docNumber || ''); return m ? parseInt(m[1], 10) : 0 })
      .filter((n) => n > 0)
    const next = (nums.length ? Math.max(...nums) : 0) + 1
    return NextResponse.json({ next: `QR66${String(next).padStart(4, '0')}` })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
