import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminUsers } from '@/lib/admin-users'
import { verifyAdminSession } from '@/lib/admin-session'
import { ALWAYS_ALLOWED } from '@/lib/admin-permissions'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('admin-session')

    if (!session) {
      return NextResponse.json({ authenticated: false })
    }

    // Verify the same way the /api/admin gate in middleware.ts does. This used to only
    // decode the username, so a cookie the gate rejects still reported authenticated:
    // true — the admin UI rendered as normal and then every write behind it 401'd with
    // "Unauthorized". Any disagreement between this check and the gate strands whoever
    // is logged in: they look signed in but cannot save anything.
    const verified = verifyAdminSession(session.value)
    if (!verified) {
      return NextResponse.json({ authenticated: false })
    }
    const username = verified.username

    // Main Admin — full access
    if (username === 'Admin') {
      return NextResponse.json({
        authenticated: true,
        role: 'admin',
        username: 'Admin',
        permissions: [],
      })
    }

    // Staff account — look up permissions
    const staffUsers = await getAdminUsers()
    const staffUser = staffUsers.find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    )

    if (!staffUser || !staffUser.active) {
      // User was deleted or deactivated after session was issued
      return NextResponse.json({ authenticated: false })
    }

    return NextResponse.json({
      authenticated: true,
      role: 'staff',
      username: staffUser.username,
      permissions: staffUser.permissions,
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ authenticated: false })
  }
}
