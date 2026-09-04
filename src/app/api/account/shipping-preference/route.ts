import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { db } from '@/lib/db'
import { getShippingOption, shippingRequiresBranch } from '@/lib/shipping-options'
import { syncShippingPreferenceToContact } from '@/lib/customer-address-sync'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const CUSTOMERS_KEY = 'data/customers.json'

async function getCustomers(): Promise<any[]> {
  const result = await db.query('SELECT value FROM json_store WHERE key = $1', [CUSTOMERS_KEY])
  if (result.rows.length === 0) return []
  const v = result.rows[0].value
  if (Array.isArray(v)) return v
  if (typeof v === 'string') { try { return JSON.parse(v) } catch {} }
  return []
}

async function saveCustomers(customers: any[]) {
  await db.query(
    `INSERT INTO json_store (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [CUSTOMERS_KEY, JSON.stringify(customers)]
  )
}

async function getCustomerId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('customer_token')?.value
    if (!token) return null
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded.id
  } catch {
    return null
  }
}

// GET /api/account/shipping-preference
export async function GET() {
  const customerId = await getCustomerId()
  if (!customerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const customers = await getCustomers()
  const customer = customers.find((c: any) => c.id === customerId)
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  return NextResponse.json({
    preferredShipping: customer.preferredShipping || '',
    courierGuyBranch:  customer.courierGuyBranch  || '',
  })
}

// PUT /api/account/shipping-preference — autosaved from the account page
export async function PUT(request: NextRequest) {
  const customerId = await getCustomerId()
  if (!customerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json()
  const preferredShipping = String(body.preferredShipping || '').trim()
  const courierGuyBranch = String(body.courierGuyBranch || '').trim()

  // An unknown id would print nonsense on the invoice — reject it
  if (preferredShipping && !getShippingOption(preferredShipping)) {
    return NextResponse.json({ error: 'Unknown shipping option' }, { status: 400 })
  }
  if (shippingRequiresBranch(preferredShipping) && !courierGuyBranch) {
    return NextResponse.json(
      { error: 'Please enter your Courier Guy branch for a Kiosk to Kiosk option' },
      { status: 400 }
    )
  }

  const customers = await getCustomers()
  const idx = customers.findIndex((c: any) => c.id === customerId)
  if (idx === -1) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  customers[idx] = {
    ...customers[idx],
    preferredShipping,
    // Only a kiosk option carries a branch — don't leave a stale one behind
    courierGuyBranch: shippingRequiresBranch(preferredShipping) ? courierGuyBranch : '',
    updatedAt: new Date().toISOString(),
  }
  await saveCustomers(customers)

  // Mirror onto the contact so admin and invoices see it (Rule 54)
  await syncShippingPreferenceToContact(customerId)

  return NextResponse.json({
    preferredShipping: customers[idx].preferredShipping,
    courierGuyBranch:  customers[idx].courierGuyBranch,
  })
}
