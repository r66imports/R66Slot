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
    const adminIndex = customers.findIndex((c: any) => c.username === 'Admin')

    if (adminIndex === -1) {
      return NextResponse.json({ error: 'Admin user not found in DB' }, { status: 404 })
    }

    const newHash = await bcrypt.hash('Admin123!', 10)
    customers[adminIndex].password = newHash
    await blobWrite(CUSTOMERS_KEY, customers)

    return NextResponse.json({
      success: true,
      message: 'Admin password reset to Admin123! — you can now log in from any device. Delete this endpoint file after use.',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
