import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const CUSTOMERS_KEY = 'data/customers.json'
const ADMIN_SESSION_COOKIE = 'admin-session'

async function verifyAdminSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  return !!session
}

async function getCustomers(): Promise<any[]> {
  return await blobRead<any[]>(CUSTOMERS_KEY, [])
}

async function saveCustomers(customers: any[]): Promise<void> {
  await blobWrite(CUSTOMERS_KEY, customers)
}

// GET /api/admin/account/profile — return admin user data (no password)
export async function GET() {
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const customers = await getCustomers()
    const admin = customers.find((c: any) => c.username === 'Admin' || c.role === 'admin')

    if (!admin) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 })
    }

    const { password, ...profile } = admin
    return NextResponse.json(profile)
  } catch (error) {
    console.error('GET admin profile error:', error)
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
  }
}

// PUT /api/admin/account/profile — update personal info
export async function PUT(request: NextRequest) {
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { firstName, lastName, email, phone, displayName, bio, whatsapp, location } = body

    // Basic validation
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 })
    }
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
    }

    const customers = await getCustomers()
    const adminIndex = customers.findIndex((c: any) => c.username === 'Admin' || c.role === 'admin')

    if (adminIndex === -1) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 })
    }

    // Check email uniqueness (among other users)
    const emailTaken = customers.some(
      (c: any, i: number) => i !== adminIndex && c.email === email.trim()
    )
    if (emailTaken) {
      return NextResponse.json({ error: 'Email already in use by another account' }, { status: 409 })
    }

    customers[adminIndex] = {
      ...customers[adminIndex],
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone?.trim() || '',
      displayName: displayName?.trim() || '',
      bio: bio?.trim() || '',
      whatsapp: whatsapp?.trim() || '',
      location: location?.trim() || '',
      updatedAt: new Date().toISOString(),
    }

    await saveCustomers(customers)

    const { password, ...profile } = customers[adminIndex]
    return NextResponse.json(profile)
  } catch (error) {
    console.error('PUT admin profile error:', error)
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
  }
}
