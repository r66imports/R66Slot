import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import { getAdminUsers, verifyPassword } from '@/lib/admin-users'

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

    // --- Main Admin account ---
    if (username === 'Admin') {
      const customers = await getCustomers()
      const admin = customers.find((c: any) => c.username === 'Admin')

      if (!admin) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      }

      let isValid = await bcrypt.compare(password, admin.password)

      // Fallback: ADMIN_PASSWORD env var override with self-heal
      if (!isValid && process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
        isValid = true
        try {
          const newHash = await bcrypt.hash(password, 10)
          const fresh = await getCustomers()
          const adminIndex = fresh.findIndex((c: any) => c.username === 'Admin')
          if (adminIndex !== -1) {
            fresh[adminIndex].password = newHash
            await blobWrite(CUSTOMERS_KEY, fresh)
          }
        } catch (hashErr) {
          console.error('Failed to update admin password hash:', hashErr)
        }
      }

      if (!isValid) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      }

      return await setSessionAndRespond('Admin')
    }

    // --- Staff accounts ---
    const staffUsers = await getAdminUsers()
    const staffUser = staffUsers.find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    )

    if (!staffUser) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    if (!staffUser.active) {
      return NextResponse.json({ error: 'Account is inactive' }, { status: 401 })
    }

    const isValid = await verifyPassword(password, staffUser.password)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    return await setSessionAndRespond(staffUser.username)
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}

async function setSessionAndRespond(username: string) {
  try {
    const sessionToken = Buffer.from(
      `${username}:${Date.now()}:${process.env.SESSION_SECRET || 'dev-secret'}`
    ).toString('base64')

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
}
