import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const CUSTOMERS_KEY = 'data/customers.json'

async function getCustomers() {
  return await blobRead<any[]>(CUSTOMERS_KEY, [])
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    const customers = await getCustomers()

    // Find admin user by username "Admin"
    const admin = customers.find((c: any) => c.username === 'Admin')

    if (!admin) {
      console.warn('Admin login attempt - admin user not found', { username })
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify username matches
    if (username !== 'Admin') {
      console.warn('Admin login attempt - username mismatch', { username })
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify password via bcrypt
    let isValid = await bcrypt.compare(password, admin.password)

    // Fallback: if bcrypt fails, check ADMIN_PASSWORD env var override
    // This handles cases where the DB hash is stale/incorrect
    if (!isValid && process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
      isValid = true
      // Self-heal: update the DB hash so future logins work via bcrypt
      try {
        const newHash = await bcrypt.hash(password, 10)
        const customers = await getCustomers()
        const adminIndex = customers.findIndex((c: any) => c.username === 'Admin')
        if (adminIndex !== -1) {
          customers[adminIndex].password = newHash
          await blobWrite(CUSTOMERS_KEY, customers)
          console.log('Admin password hash updated via ADMIN_PASSWORD env var')
        }
      } catch (hashErr) {
        console.error('Failed to update admin password hash:', hashErr)
        // Still allow login even if hash update fails
      }
    }

    if (!isValid) {
      console.warn('Admin login attempt - invalid password for', { username })
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Create session token
    const sessionToken = Buffer.from(
      `${username}:${Date.now()}:${process.env.SESSION_SECRET || 'dev-secret'}`
    ).toString('base64')

    try {
      // Set httpOnly cookie
      const cookieStore = await cookies()
      cookieStore.set('admin-session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      })

      return NextResponse.json({ success: true })
    } catch (err) {
      console.error('Admin login - cookie set failed:', err instanceof Error ? err.stack : String(err))
      return NextResponse.json({ error: 'Login failed' }, { status: 500 })
    }
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
