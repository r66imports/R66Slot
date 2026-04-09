import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const BACKORDERS_KEY = 'data/backorders.json'

// POST /api/admin/backorders/cleanup
// One-time cleanup: removes all inventory-restock entries from backorders store.
// Matches on source === 'inventory-restock' OR clientName === 'INVENTORY RESTOCK'.
export async function POST() {
  try {
    const backorders = await blobRead<any[]>(BACKORDERS_KEY, [])
    const before = backorders.length
    const cleaned = backorders.filter(
      (b: any) =>
        b.source !== 'inventory-restock' && b.clientName !== 'INVENTORY RESTOCK'
    )
    await blobWrite(BACKORDERS_KEY, cleaned)
    return NextResponse.json({ ok: true, removed: before - cleaned.length, remaining: cleaned.length })
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}
