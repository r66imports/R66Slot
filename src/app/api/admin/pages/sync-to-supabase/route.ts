import { NextResponse } from 'next/server'
import { blobList, blobRead } from '@/lib/blob-storage'
import { supaUpsertPage } from '@/lib/pages/supabase-storage'
import type { Page } from '@/lib/pages/schema'

// POST /api/admin/pages/sync-to-supabase
// One-time (idempotent) sync of all json_store page entries into the pages table
export async function POST() {
  try {
    const keys = await blobList('data/pages/')
    const pageKeys = keys.filter(
      (k) => k.endsWith('.json') && !k.endsWith('_slug-index.json')
    )

    let synced = 0
    let failed = 0
    const errors: string[] = []

    for (const key of pageKeys) {
      try {
        const page = await blobRead<Page | null>(key, null)
        if (!page) {
          errors.push(`${key}: not found in json_store`)
          failed++
          continue
        }
        await supaUpsertPage(page)
        synced++
      } catch (err: any) {
        errors.push(`${key}: ${err?.message}`)
        failed++
      }
    }

    return NextResponse.json({
      total: pageKeys.length,
      synced,
      failed,
      errors: errors.slice(0, 20),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Sync failed', details: error?.message },
      { status: 500 }
    )
  }
}
