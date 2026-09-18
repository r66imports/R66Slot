import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import { DEFAULT_SKIN_ID, isSkinId } from '@/lib/account-skins'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const CUSTOMERS_KEY = 'data/customers.json'

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

// GET /api/account/appearance — the skin this client picked, on any device
export async function GET() {
  const customerId = await getCustomerId()
  if (!customerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const customers = await blobRead<any[]>(CUSTOMERS_KEY, [])
  const customer = customers.find((c: any) => c.id === customerId)
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  // A skin retired from the list must not leave the account unstyled.
  const skin = isSkinId(customer.accountSkin) ? customer.accountSkin : DEFAULT_SKIN_ID
  return NextResponse.json({ accountSkin: skin })
}

// PUT /api/account/appearance — saved the moment a swatch is clicked
export async function PUT(request: NextRequest) {
  const customerId = await getCustomerId()
  if (!customerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const accountSkin = body?.accountSkin

  if (!isSkinId(accountSkin)) {
    return NextResponse.json({ error: 'Unknown skin' }, { status: 400 })
  }

  const customers = await blobRead<any[]>(CUSTOMERS_KEY, [])
  const idx = customers.findIndex((c: any) => c.id === customerId)
  if (idx === -1) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  customers[idx] = {
    ...customers[idx],
    accountSkin,
    updatedAt: new Date().toISOString(),
  }
  await blobWrite(CUSTOMERS_KEY, customers)

  return NextResponse.json({ accountSkin })
}
