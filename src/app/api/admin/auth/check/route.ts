import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminUsers } from '@/lib/admin-users'
import { ALWAYS_ALLOWED } from '@/lib/admin-permissions'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('admin-session')

    if (!session) {
      return NextResponse.json({ authenticated: false })
    }

    // Decode session to get username
    let username = 'Admin'
    try {
      const decoded = Buffer.from(session.value, 'base64').toString('utf-8')
      username = decoded.split(':')[0] || 'Admin'
    } catch {
      // malformed cookie — treat as unauthenticated
      return NextResponse.json({ authenticated: false })
    }

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
