import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const CUSTOMERS_KEY = 'data/customers.json'
const CONTACTS_KEY = 'data/contacts.json'

async function getCustomers() {
  return await blobRead<any[]>(CUSTOMERS_KEY, [])
}

async function saveCustomers(customers: any[]) {
  await blobWrite(CUSTOMERS_KEY, customers)
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('customer_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any
    const customers = await getCustomers()
    const customer = customers.find((c: any) => c.id === decoded.id)

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const { password, ...customerData } = customer
    return NextResponse.json(customerData)
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('customer_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any
    const { firstName, lastName, username, email, phone } = await request.json()

    const customers = await getCustomers()
    const customerIndex = customers.findIndex((c: any) => c.id === decoded.id)

    if (customerIndex === -1) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    if (username && !/^[a-zA-Z]{3,}$/.test(username)) {
      return NextResponse.json(
        { error: 'Username must contain letters only — no spaces, numbers, or special characters' },
        { status: 400 }
      )
    }

    if (username && username !== customers[customerIndex].username) {
      if (customers.find((c: any) => c.username === username && c.id !== decoded.id)) {
        return NextResponse.json(
          { error: 'Username already taken' },
          { status: 409 }
        )
      }
    }

    if (email !== customers[customerIndex].email) {
      if (customers.find((c: any) => c.email === email && c.id !== decoded.id)) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 409 }
        )
      }
    }

    customers[customerIndex] = {
      ...customers[customerIndex],
      firstName,
      lastName,
      username: username || customers[customerIndex].username,
      email,
      phone: phone || '',
      updatedAt: new Date().toISOString(),
    }

    await saveCustomers(customers)

    // Sync updated info to contacts list so admin autofill stays current
    try {
      const contacts = await blobRead<any[]>(CONTACTS_KEY, [])
      const ci = contacts.findIndex(
        (c: any) => c.email === customers[customerIndex].email ||
          (decoded.id && c.customerId === decoded.id)
      )
      if (ci !== -1) {
        contacts[ci] = {
          ...contacts[ci],
          firstName,
          lastName,
          email,
          phone: phone || contacts[ci].phone || '',
          updatedAt: new Date().toISOString(),
        }
        await blobWrite(CONTACTS_KEY, contacts)
      }
    } catch {
      // Non-fatal — profile is already saved
    }

    const { password, ...customerData } = customers[customerIndex]
    return NextResponse.json(customerData)
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
