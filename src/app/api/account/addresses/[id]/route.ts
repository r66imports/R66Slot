import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-replace-in-production'
const ADDRESSES_KEY = 'data/addresses.json'

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

// PUT /api/account/addresses/[id] — update address
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const customerId = await getCustomerId()
  if (!customerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const data = await request.json()
  const addresses = await blobRead<any[]>(ADDRESSES_KEY, [])
  const index = addresses.findIndex(a => a.id === id && a.customerId === customerId)
  if (index === -1) return NextResponse.json({ error: 'Address not found' }, { status: 404 })

  // If setting as default, clear other defaults first
  if (data.isDefault) {
    addresses.forEach(a => { if (a.customerId === customerId) a.isDefault = false })
  }

  addresses[index] = { ...addresses[index], ...data, id, customerId, updatedAt: new Date().toISOString() }
  await blobWrite(ADDRESSES_KEY, addresses)
  return NextResponse.json(addresses[index])
}

// DELETE /api/account/addresses/[id] — delete address
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const customerId = await getCustomerId()
  if (!customerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const addresses = await blobRead<any[]>(ADDRESSES_KEY, [])
  const filtered = addresses.filter(a => !(a.id === id && a.customerId === customerId))
  if (filtered.length === addresses.length) return NextResponse.json({ error: 'Address not found' }, { status: 404 })

  await blobWrite(ADDRESSES_KEY, filtered)
  return NextResponse.json({ success: true })
}
