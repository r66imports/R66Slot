import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'

const CUSTOMERS_FILE = path.join(process.cwd(), 'data', 'customers.json')

function getCustomers() {
  try {
    const data = fs.readFileSync(CUSTOMERS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
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

    const customers = getCustomers()

    // Find admin user by username "Admin"
    const admin = customers.find((c: any) => c.username === 'Admin')

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify username matches
    if (username !== 'Admin') {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify password
    const isValid = await bcrypt.compare(password, admin.password)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Create session token
    const sessionToken = Buffer.from(
      `${username}:${Date.now()}:${process.env.SESSION_SECRET || 'dev-secret'}`
    ).toString('base64')

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
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
