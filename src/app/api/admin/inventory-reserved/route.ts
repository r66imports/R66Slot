import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'

const ACTIVE_STATUSES = new Set(['draft', 'sent', 'accepted', 'pending', 'active', 'processing'])

function skuFromDescription(description: string): string {
  if (!description) return ''
  // Em-dash separator: "SKU – Title"
  const emIdx = description.indexOf('–')
  if (emIdx > -1) return description.slice(0, emIdx).trim()
  // Space-hyphen-space separator: "SKU - Title"
  const hyphenMatch = description.match(/^(.+?)\s+-\s+(.+)$/)
  if (hyphenMatch) return hyphenMatch[1].trim()
  return ''
}

export async function GET() {
  const docs = await blobRead<any[]>('data/order-documents.json', [])
  const reserved: Record<string, number> = {}

  for (const doc of docs) {
    if (doc.type !== 'salesorder') continue
    if (!ACTIVE_STATUSES.has((doc.status || '').toLowerCase())) continue
    for (const item of doc.lineItems || []) {
      // SKU is embedded in description as "SKU – Title"; item.sku may also be set directly
      const sku = ((item.sku || '').trim() || skuFromDescription(item.description || '')).toUpperCase()
      if (!sku) continue
      reserved[sku] = (reserved[sku] || 0) + (Number(item.qty) || 0)
    }
  }

  return NextResponse.json(reserved)
}
