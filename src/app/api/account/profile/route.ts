import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
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

    if (username && username.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters' },
        { status: 400 }
      )
    }

    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: 'Username can only contain letters, numbers, and underscores' },
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

    const { password, ...customerData } = customers[customerIndex]
    return NextResponse.json(customerData)
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
