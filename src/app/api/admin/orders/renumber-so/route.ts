import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/order-documents.json'

// POST /api/admin/orders/renumber-so
// Renumbers all Sales Orders by date ascending: SO001, SO002, SO003...
export async function POST() {
  try {
    const docs = await blobRead<any[]>(KEY, [])

    // Sort SOs by date ascending (oldest = SO001)
    const soIndices = docs
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => d.type === 'salesorder')
      .sort((a, b) => {
        const da = new Date(a.d.date || a.d.createdAt).getTime()
        const db2 = new Date(b.d.date || b.d.createdAt).getTime()
        return da - db2
      })

    // Assign SO001, SO002... in order
    soIndices.forEach(({ i }, seq) => {
      docs[i].docNumber = `SO${String(seq + 1).padStart(3, '0')}`
      docs[i].updatedAt = new Date().toISOString()
    })

    await blobWrite(KEY, docs)

    return NextResponse.json({
      renumbered: soIndices.length,
      numbers: soIndices.map(({ i }) => docs[i].docNumber),
    })
  } catch (error: any) {
    console.error('Renumber SO error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
