import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const CUSTOMERS_KEY = 'data/customers.json'

export async function POST(request: Request) {
  try {
    // Check if admin already exists
    const customers = await blobRead<any[]>(CUSTOMERS_KEY, [])
    const existingAdmin = customers.find((c: any) => c.username === 'Admin')

    if (existingAdmin) {
      return NextResponse.json({ message: 'Admin user already exists', seeded: false })
    }

    // Create admin user with hashed password
    const hashedPassword = await bcrypt.hash('admin123', 10)

    const adminUser = {
      id: 'admin-001',
      username: 'Admin',
      email: 'admin@r66slot.co.za',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'R66Slot',
      role: 'admin',
      createdAt: new Date().toISOString(),
    }

    customers.push(adminUser)
    await blobWrite(CUSTOMERS_KEY, customers)

    return NextResponse.json({ message: 'Admin user seeded successfully', seeded: true })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Failed to seed admin user' }, { status: 500 })
  }
}
