import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const CUSTOMERS_KEY = 'data/customers.json'

// One-time password reset endpoint.
// Visit GET /api/admin/auth/reset-password to reset admin password to Admin123!
// Delete this file after use.
export async function GET() {
  try {
    const customers = await blobRead<any[]>(CUSTOMERS_KEY, [])
    const newHash = await bcrypt.hash('Route66@1978', 10)
    const adminIndex = customers.findIndex((c: any) => c.username === 'Admin')

    if (adminIndex === -1) {
      customers.push({
        id: 'admin-001',
        username: 'Admin',
        email: 'admin@r66slot.co.za',
        firstName: 'Admin',
        lastName: '',
        password: newHash,
        role: 'admin',
        createdAt: new Date().toISOString(),
      })
    } else {
      customers[adminIndex].password = newHash
    }

    await blobWrite(CUSTOMERS_KEY, customers)

    return NextResponse.json({
      success: true,
      message: 'Admin password set to Route66@1978 — log in now.',
      username: 'Admin',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
