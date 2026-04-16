import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  getAdminUsers,
  saveAdminUsers,
  hashPassword,
  stripPassword,
  DEFAULT_PERMISSIONS,
  type AdminUser,
} from '@/lib/admin-users'

// Only the main Admin account can manage users
async function isMainAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin-session')
  if (!session) return false
  const decoded = Buffer.from(session.value, 'base64').toString('utf-8')
  const [username] = decoded.split(':')
  return username === 'Admin'
}

export async function GET() {
  try {
    if (process.env.NODE_ENV !== 'development' && !(await isMainAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const users = await getAdminUsers()
    return NextResponse.json(users.map(stripPassword))
  } catch (error) {
    console.error('GET /api/admin/users error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV !== 'development' && !(await isMainAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await request.json()
    const { username, password, firstName, lastName, email, permissions, active } = body

    if (!username || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'username, password, firstName and lastName are required' },
        { status: 400 }
      )
    }

    const users = await getAdminUsers()

    // Username must be unique and not 'Admin'
    if (username === 'Admin' || users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }

    const newUser: AdminUser = {
      id: `staff-${Date.now()}`,
      username,
      password: await hashPassword(password),
      firstName,
      lastName,
      email: email || '',
      role: 'staff',
      permissions: Array.isArray(permissions) ? permissions : DEFAULT_PERMISSIONS,
      active: active !== false,
      createdAt: new Date().toISOString(),
    }

    await saveAdminUsers([...users, newUser])
    return NextResponse.json(stripPassword(newUser), { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/users error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
