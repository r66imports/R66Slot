import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import { syncDefaultAddressToContact } from '@/lib/customer-address-sync'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-replace-in-production'
const ADDRESSES_KEY = 'data/addresses.json'

// POST /api/account/addresses/[id]/default — set as default
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('customer_token')?.value
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const decoded = jwt.verify(token, JWT_SECRET) as any
    const { id } = await params
    const addresses = await blobRead<any[]>(ADDRESSES_KEY, [])

    const target = addresses.find(a => a.id === id && a.customerId === decoded.id)
    if (!target) return NextResponse.json({ error: 'Address not found' }, { status: 404 })

    addresses.forEach(a => { if (a.customerId === decoded.id) a.isDefault = a.id === id })
    await blobWrite(ADDRESSES_KEY, addresses)

    // Mirror the new default onto the admin contact record (Rule 53)
    await syncDefaultAddressToContact(decoded.id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
