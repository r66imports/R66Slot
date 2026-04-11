import { NextResponse } from 'next/server'

// GET /api/admin/media/proxy?url=...
// Server-side image proxy — avoids canvas CORS taint when editing R2 images
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 })
  }

  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 })
    }

    const blob = await res.blob()
    const contentType = res.headers.get('Content-Type') || 'image/jpeg'

    return new Response(blob, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
