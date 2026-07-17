import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/order-documents.json'

export async function POST() {
  try {
    const docs: any[] = await blobRead(KEY, [])

    // Find docs where type=invoice but docNumber looks like a quote (QR66...)
    const broken = docs.filter(
      (d) => d.type === 'invoice' && /^QR66/i.test(d.docNumber || '')
    )

    if (broken.length === 0) {
      return NextResponse.json({ fixed: [], message: 'No broken documents found' })
    }

    // Find next available R66INV number
    const existingNums = docs
      .map((d) => /^R66INV(\d+)$/i.exec(d.docNumber || ''))
      .filter(Boolean)
      .map((m) => parseInt(m![1]))
    let nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1

    const fixed: { id: string; oldDocNumber: string; newDocNumber: string }[] = []

    for (const doc of broken) {
      const idx = docs.findIndex((d) => d.id === doc.id)
      const newDocNumber = `R66INV${nextNum++}`
      fixed.push({ id: doc.id, oldDocNumber: doc.docNumber, newDocNumber })
      docs[idx] = {
        ...docs[idx],
        docNumber: newDocNumber,
        depositMode: false,
        depositPct: 0,
        updatedAt: new Date().toISOString(),
      }
    }

    await blobWrite(KEY, docs)

    return NextResponse.json({ fixed, message: `Fixed ${fixed.length} document(s)` })
  } catch (error) {
    console.error('fix-quote-invoices error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
