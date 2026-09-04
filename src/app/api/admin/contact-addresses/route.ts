import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSavedAddresses } from '@/lib/customer-address-sync'

// GET /api/admin/contact-addresses?email=…&customerId=…
// Saved Addresses the customer entered in their own back office
// (data/addresses.json). Read-only — admin never writes this store.
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    if (!cookieStore.get('admin-session')?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email') || ''
    const customerId = searchParams.get('customerId') || ''
    if (!email && !customerId) return NextResponse.json([])

    const addresses = await getSavedAddresses({ email, customerId })
    // Default first, then newest
    addresses.sort((a, b) => {
      if (!!a.isDefault !== !!b.isDefault) return a.isDefault ? -1 : 1
      return new Date(b.updatedAt || b.createdAt || 0).getTime() -
             new Date(a.updatedAt || a.createdAt || 0).getTime()
    })

    return NextResponse.json(addresses)
  } catch (error) {
    console.error('Error fetching contact addresses:', error)
    return NextResponse.json([], { status: 200 })
  }
}
