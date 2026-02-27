import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/sage/client'

/**
 * GET /api/admin/sage/callback?code=xxx
 * Sage redirects here after the user logs in and approves access.
 * Exchanges the code for tokens and redirects back to the admin Sage page.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')

  if (error || !code) {
    const msg = error || 'No authorization code received'
    return NextResponse.redirect(
      new URL(`/admin/sage?error=${encodeURIComponent(msg)}`, request.url)
    )
  }

  try {
    await exchangeCodeForTokens(code)
    return NextResponse.redirect(new URL('/admin/sage?connected=1', request.url))
  } catch (err: any) {
    return NextResponse.redirect(
      new URL(`/admin/sage?error=${encodeURIComponent(err.message)}`, request.url)
    )
  }
}
