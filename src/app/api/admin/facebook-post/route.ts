import { NextResponse } from 'next/server'

// POST /api/admin/facebook-post
// Posts a branded poster image + caption to the R66Slot Facebook Page via Graph API.
// Requires FACEBOOK_PAGE_ACCESS_TOKEN in Railway environment variables.
// The token must have pages_manage_posts + pages_read_engagement permissions.
export async function POST(request: Request) {
  const { shortCode, caption } = await request.json()

  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  const pageId = process.env.FACEBOOK_PAGE_ID || '61582238030752'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://r66slot.co.za'

  if (!accessToken) {
    return NextResponse.json(
      { error: 'FACEBOOK_PAGE_ACCESS_TOKEN not configured in Railway environment.' },
      { status: 503 }
    )
  }

  if (!shortCode) {
    return NextResponse.json({ error: 'shortCode is required' }, { status: 400 })
  }

  // Use the server-generated branded poster image (public URL, no auth required)
  const posterImageUrl = `${siteUrl}/api/poster-image/${shortCode}`

  const body = new URLSearchParams({
    url: posterImageUrl,
    message: caption || '',
    access_token: accessToken,
  })

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
      method: 'POST',
      body,
    })
    const data = await res.json()

    if (!res.ok || data.error) {
      return NextResponse.json(
        { error: data.error?.message || 'Facebook post failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Network error' }, { status: 500 })
  }
}
