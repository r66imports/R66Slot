import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/customers.json'

async function requireAdmin() {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin-session')?.value
  if (!session) throw new Error('Unauthorized')
}

async function getCustomers(): Promise<any[]> {
  return await blobRead<any[]>(KEY, [])
}

async function saveCustomers(customers: any[]) {
  await blobWrite(KEY, customers)
}

// GET — list all customer accounts (no passwords)
export async function GET() {
  try {
    await requireAdmin()
    const customers = await getCustomers()
    return NextResponse.json(customers.map((c: any) => ({
      id: c.id,
      email: c.email,
      username: c.username,
      firstName: c.firstName,
      lastName: c.lastName,
      hasPassword: !!c.password,
      passwordHashLength: c.password?.length,
      role: c.role,
      createdAt: c.createdAt,
    })))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 })
  }
}

// POST — create new customer or reset existing password
// Body: { email, username, password, firstName, lastName, resetIfExists?: boolean }
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const { email, username, password, firstName, lastName, resetIfExists } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 })
    }

    const customers = await getCustomers()
    const normalised = email.trim().toLowerCase()
    const existingIdx = customers.findIndex((c: any) => c.email?.toLowerCase() === normalised)
    const hash = await bcrypt.hash(password, 12)

    if (existingIdx !== -1) {
      if (!resetIfExists) {
        return NextResponse.json({ error: 'Customer already exists. Send resetIfExists:true to reset password.' }, { status: 409 })
      }
      customers[existingIdx] = { ...customers[existingIdx], password: hash, updatedAt: new Date().toISOString() }
      await saveCustomers(customers)
      return NextResponse.json({ ok: true, action: 'password_reset', id: customers[existingIdx].id })
    }

    const newCustomer = {
      id: `cust_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      email: normalised,
      username: (username || email.split('@')[0]).trim(),
      firstName: (firstName || '').trim(),
      lastName: (lastName || '').trim(),
      password: hash,
      phone: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    customers.push(newCustomer)
    await saveCustomers(customers)
    return NextResponse.json({ ok: true, action: 'created', id: newCustomer.id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 })
  }
}

// DELETE — remove a customer account by email, plus the CRM contact registration
// created alongside it. Identified by email because that is the one field shared
// between the customer record and its contact (register writes both).
//   DELETE /api/admin/customer-accounts?email=<address>
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin()
    const email = (new URL(request.url).searchParams.get('email') || '').trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ error: 'email query param required' }, { status: 400 })
    }

    const customers = await getCustomers()
    const remaining = customers.filter((c: any) => c.email?.toLowerCase() !== email)
    const removedCustomer = customers.length - remaining.length
    if (removedCustomer === 0) {
      return NextResponse.json({ error: 'No customer with that email' }, { status: 404 })
    }
    await saveCustomers(remaining)

    // The matching CRM contact is best-effort: the account is the thing being
    // deleted, and a left-behind contact should not fail the whole operation.
    let removedContact = 0
    try {
      const CONTACTS_KEY = 'data/contacts.json'
      const contacts = await blobRead<any[]>(CONTACTS_KEY, [])
      const keep = contacts.filter((c: any) => c.email?.toLowerCase() !== email)
      removedContact = contacts.length - keep.length
      if (removedContact > 0) await blobWrite(CONTACTS_KEY, keep)
    } catch {
      /* contact cleanup is non-critical */
    }

    return NextResponse.json({ ok: true, removedCustomer, removedContact })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 })
  }
}
