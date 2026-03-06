import { NextRequest, NextResponse } from 'next/server'

// Server-side image proxy — avoids browser CORS restrictions when fetching
// images from Cloudflare R2 for html2canvas capture.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return new NextResponse('Missing url param', { status: 400 })

  // Only allow our R2 bucket URLs
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return new NextResponse('Invalid URL', { status: 400 })
  }

  const allowed = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ''
  if (allowed && !url.startsWith(allowed)) {
    return new NextResponse('URL not allowed', { status: 403 })
  }

  try {
    const resp = await fetch(url, { cache: 'force-cache' })
    if (!resp.ok) return new NextResponse('Upstream fetch failed', { status: 502 })

    const contentType = resp.headers.get('content-type') || 'image/jpeg'
    const buffer = await resp.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new NextResponse('Fetch error', { status: 500 })
  }
}
