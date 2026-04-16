import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  getAdminUsers,
  saveAdminUsers,
  hashPassword,
  stripPassword,
} from '@/lib/admin-users'

async function isMainAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin-session')
  if (!session) return false
  const decoded = Buffer.from(session.value, 'base64').toString('utf-8')
  const [username] = decoded.split(':')
  return username === 'Admin'
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (process.env.NODE_ENV !== 'development' && !(await isMainAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    const body = await request.json()
    const users = await getAdminUsers()
    const idx = users.findIndex((u) => u.id === id)

    if (idx === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const existing = users[idx]
    const updated = {
      ...existing,
      firstName: body.firstName ?? existing.firstName,
      lastName: body.lastName ?? existing.lastName,
      email: body.email ?? existing.email,
      permissions: Array.isArray(body.permissions) ? body.permissions : existing.permissions,
      active: body.active !== undefined ? body.active : existing.active,
      updatedAt: new Date().toISOString(),
    }

    // Update password only if provided
    if (body.password && body.password.trim()) {
      updated.password = await hashPassword(body.password)
    }

    users[idx] = updated
    await saveAdminUsers(users)
    return NextResponse.json(stripPassword(updated))
  } catch (error) {
    console.error('PATCH /api/admin/users/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (process.env.NODE_ENV !== 'development' && !(await isMainAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    const users = await getAdminUsers()
    const filtered = users.filter((u) => u.id !== id)

    if (filtered.length === users.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await saveAdminUsers(filtered)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/users/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
