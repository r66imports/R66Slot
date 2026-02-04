import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  // Server-only feature flag (do NOT prefix with NEXT_PUBLIC_)
  const enabled = process.env.ENABLE_WIX_EDITOR === '1'

  try {
    const cookieStore = cookies()
    const session = cookieStore.get('admin-session')
    const authenticated = !!session

    return NextResponse.json({ enabled, authenticated })
  } catch (error) {
    console.error('Editor access check failed:', error)
    return NextResponse.json({ enabled, authenticated: false })
  }
}
