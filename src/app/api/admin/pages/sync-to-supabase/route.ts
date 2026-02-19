import { NextResponse } from 'next/server'
import { blobListWithUrls } from '@/lib/blob-storage'
import { supaUpsertPage } from '@/lib/pages/supabase-storage'
import type { Page } from '@/lib/pages/schema'

// POST /api/admin/pages/sync-to-supabase
// One-time (idempotent) sync of all blob pages into Supabase
export async function POST() {
  try {
    const urls = await blobListWithUrls('data/pages/')
    const jsonEntries = urls.filter(
      (e) => e.pathname.endsWith('.json') && !e.pathname.endsWith('_slug-index.json')
    )

    let synced = 0
    let failed = 0
    const errors: string[] = []

    for (const entry of jsonEntries) {
      try {
        const res = await fetch(entry.url, { cache: 'no-store' })
        if (!res.ok) {
          errors.push(`${entry.pathname}: fetch failed ${res.status}`)
          failed++
          continue
        }

        const text = await res.text()
        // Guard against "Your store is blocked" non-JSON responses
        if (!text.startsWith('{') && !text.startsWith('[')) {
          errors.push(`${entry.pathname}: not JSON (store may be blocked)`)
          failed++
          continue
        }

        const page = JSON.parse(text) as Page
        await supaUpsertPage(page)
        synced++
      } catch (err: any) {
        errors.push(`${entry.pathname}: ${err?.message}`)
        failed++
      }
    }

    return NextResponse.json({
      total: jsonEntries.length,
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
