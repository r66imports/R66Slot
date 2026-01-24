import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const CUSTOMERS_FILE = path.join(process.cwd(), 'data', 'customers.json')

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// Initialize customers file if it doesn't exist
if (!fs.existsSync(CUSTOMERS_FILE)) {
  fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify([]))
}

function getCustomers() {
  const data = fs.readFileSync(CUSTOMERS_FILE, 'utf-8')
  return JSON.parse(data)
}

export async function POST(request: NextRequest) {
  try {
    const { emailOrUsername, password } = await request.json()

    if (!emailOrUsername || !password) {
      return NextResponse.json(
        { error: 'Email/Username and password are required' },
        { status: 400 }
      )
    }

    const customers = getCustomers()

    // Find customer by email OR username
    const customer = customers.find((c: any) =>
      c.email === emailOrUsername || c.username === emailOrUsername
    )

    if (!customer) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const isValid = await bcrypt.compare(password, customer.password)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Create JWT token
    const token = jwt.sign(
      { id: customer.id, email: customer.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set('customer_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    // Return user data (without password)
    const { password: _, ...customerData } = customer

    return NextResponse.json(customerData)
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
