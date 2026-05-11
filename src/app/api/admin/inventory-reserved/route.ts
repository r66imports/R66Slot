import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'

const ACTIVE_STATUSES = new Set(['draft', 'sent', 'accepted', 'pending', 'active', 'processing'])

export async function GET() {
  const docs = await blobRead<any[]>('data/order-documents.json', [])
  const reserved: Record<string, number> = {}

  for (const doc of docs) {
    if (doc.type !== 'salesorder') continue
    if (!ACTIVE_STATUSES.has((doc.status || '').toLowerCase())) continue
    for (const item of doc.lineItems || []) {
      const sku = (item.sku || '').trim().toUpperCase()
      if (!sku) continue
      reserved[sku] = (reserved[sku] || 0) + (Number(item.qty) || 0)
    }
  }

  return NextResponse.json(reserved)
}
