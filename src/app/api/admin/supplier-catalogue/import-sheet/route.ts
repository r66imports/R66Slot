import { NextResponse } from 'next/server'
import { googleSheetCsvUrl } from '@/lib/catalogue-import'

/**
 * Fetch a Google Sheet as CSV.
 *
 * Server-side because the browser cannot read docs.google.com cross-origin, and
 * because the artifact CSP would block it anyway. Only Google Sheets URLs are
 * accepted — this must not become a general fetch-any-URL proxy reachable by
 * anything with an admin session.
 */
export async function POST(request: Request) {
  try {
    const { url } = await request.json()
    const csvUrl = googleSheetCsvUrl(String(url || ''))
    if (!csvUrl) {
      return NextResponse.json({ error: 'That is not a Google Sheets link' }, { status: 400 })
    }

    const res = await fetch(csvUrl, { redirect: 'follow' })

    // Google answers a private sheet with an HTML sign-in page and a 200, so the
    // status alone is not enough to tell success from "you cannot see this".
    const text = await res.text()
    const type = res.headers.get('content-type') || ''
    if (!res.ok || type.includes('text/html') || /^\s*</.test(text)) {
      return NextResponse.json(
        {
          error:
            'Google would not return that sheet. Share it as “anyone with the link can view”, then try again.',
        },
        { status: 403 }
      )
    }

    if (!text.trim()) {
      return NextResponse.json({ error: 'That sheet came back empty' }, { status: 422 })
    }

    return NextResponse.json({ csv: text })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Could not fetch that sheet' }, { status: 500 })
  }
}
