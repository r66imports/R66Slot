import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const CUSTOMERS_KEY = 'data/customers.json'
const RESET_TOKENS_KEY = 'data/password-reset-tokens.json'

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Validate token
    const tokens = await blobRead<any[]>(RESET_TOKENS_KEY, [])
    const entry = tokens.find((t: any) => t.token === token && t.expiresAt > Date.now())

    if (!entry) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
    }

    // Update customer password
    const customers = await blobRead<any[]>(CUSTOMERS_KEY, [])
    const idx = customers.findIndex((c: any) => c.id === entry.customerId)

    if (idx === -1) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    customers[idx].password = await bcrypt.hash(password, 12)
    customers[idx].updatedAt = new Date().toISOString()
    await blobWrite(CUSTOMERS_KEY, customers)

    // Remove used token (and any other tokens for this customer)
    const remaining = tokens.filter(
      (t: any) => t.customerId !== entry.customerId && t.expiresAt > Date.now()
    )
    await blobWrite(RESET_TOKENS_KEY, remaining)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[reset-password] error:', err?.message || err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
