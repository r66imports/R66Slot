import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const CUSTOMERS_KEY = 'data/customers.json'
const ADMIN_SESSION_COOKIE = 'admin-session'

async function verifyAdminSession(): Promise<boolean> {
  const cookieStore = await cookies()
  return !!cookieStore.get(ADMIN_SESSION_COOKIE)?.value
}

// POST /api/admin/account/change-password
export async function POST(request: NextRequest) {
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new passwords are required' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
    }

    const customers = await blobRead<any[]>(CUSTOMERS_KEY, [])
    const adminIndex = customers.findIndex((c: any) => c.username === 'Admin' || c.role === 'admin')

    if (adminIndex === -1) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 })
    }

    const isValid = await bcrypt.compare(currentPassword, customers[adminIndex].password)
    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
    }

    const hashed = await bcrypt.hash(newPassword, 12)
    customers[adminIndex] = {
      ...customers[adminIndex],
      password: hashed,
      updatedAt: new Date().toISOString(),
    }

    await blobWrite(CUSTOMERS_KEY, customers)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }
}
