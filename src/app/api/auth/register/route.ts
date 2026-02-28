import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const CUSTOMERS_KEY = 'data/customers.json'

async function getCustomers() {
  return await blobRead<any[]>(CUSTOMERS_KEY, [])
}

async function saveCustomers(customers: any[]) {
  await blobWrite(CUSTOMERS_KEY, customers)
}

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, username, email, password } = await request.json()

    if (!firstName || !lastName || !username || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters' },
        { status: 400 }
      )
    }

    if (!/^[a-zA-Z0-9_ ]+$/.test(username)) {
      return NextResponse.json(
        { error: 'Username can only contain letters, numbers, underscores, and spaces' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const customers = await getCustomers()

    // Check if email already exists
    if (customers.find((c: any) => c.email === email)) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    // Check if username already exists
    if (customers.find((c: any) => c.username === username)) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new customer
    const newCustomer = {
      id: `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      firstName,
      lastName,
      username,
      email,
      password: hashedPassword,
      phone: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    customers.push(newCustomer)
    await saveCustomers(customers)

    // Also create a contact entry so the customer appears in the admin Contacts page
    try {
      const CONTACTS_KEY = 'data/contacts.json'
      const contacts = await blobRead<any[]>(CONTACTS_KEY, [])
      const alreadyExists = contacts.find((c: any) => c.email === email)
      if (!alreadyExists) {
        const now = new Date().toISOString()
        contacts.push({
          id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: '',
          addressStreet: '', addressCity: '', addressProvince: '',
          addressPostalCode: '', addressCountry: 'South Africa',
          clubName: '', clubMemberId: '',
          companyName: '', companyVAT: '', companyAddress: '',
          deliveryDoorToDoor: false, deliveryKioskToKiosk: false,
          deliveryPudoLocker: false, deliveryPostnetAramex: false,
          source: 'website',
          notes: `Username: ${username}`,
          totalOrders: 0,
          totalSpent: 0,
          createdAt: now,
          updatedAt: now,
        })
        await blobWrite(CONTACTS_KEY, contacts)
      }
    } catch {
      // Non-fatal: registration still succeeds even if contact sync fails
    }

    // Create JWT token
    const token = jwt.sign(
      { id: newCustomer.id, email: newCustomer.email },
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
    const { password: _, ...customerData } = newCustomer

    return NextResponse.json(customerData, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
