import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const CUSTOMERS_KEY = 'data/customers.json'

// POST /api/account/change-password
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('customer_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new passwords are required' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
    }

    const customers = await blobRead<any[]>(CUSTOMERS_KEY, [])
    const idx = customers.findIndex((c: any) => c.id === decoded.id)

    if (idx === -1) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const isValid = await bcrypt.compare(currentPassword, customers[idx].password)
    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
    }

    const hashed = await bcrypt.hash(newPassword, 12)
    customers[idx] = {
      ...customers[idx],
      password: hashed,
      updatedAt: new Date().toISOString(),
    }

    await blobWrite(CUSTOMERS_KEY, customers)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }
}
