import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAdminSession } from '@/lib/admin-session'
import { getLoginLog } from '@/lib/admin-login-log'

export const dynamic = 'force-dynamic'

// Main Admin only — the same rule as managing the accounts themselves.
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const session = verifyAdminSession(cookieStore.get('admin-session')?.value)
    if (process.env.NODE_ENV !== 'development' && session?.username !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const url = new URL(request.url)
    const username = url.searchParams.get('username')?.trim() || undefined
    const limit = Number(url.searchParams.get('limit')) || undefined
    return NextResponse.json(await getLoginLog({ username, limit }))
  } catch (error) {
    console.error('GET /api/admin/users/login-log error:', error)
    return NextResponse.json({ error: 'Failed to load login log' }, { status: 500 })
  }
}
