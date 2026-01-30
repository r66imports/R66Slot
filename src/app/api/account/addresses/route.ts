import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const ADDRESSES_KEY = 'data/addresses.json'

async function getAddresses() {
  return await blobRead<any[]>(ADDRESSES_KEY, [])
}

async function saveAddresses(addresses: any[]) {
  await blobWrite(ADDRESSES_KEY, addresses)
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('customer_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any
    const addresses = (await getAddresses()).filter((a: any) => a.customerId === decoded.id)

    return NextResponse.json(addresses)
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('customer_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any
    const addressData = await request.json()

    const addresses = await getAddresses()

    // If this is set as default, unset other default addresses
    if (addressData.isDefault) {
      addresses.forEach((a: any) => {
        if (a.customerId === decoded.id) {
          a.isDefault = false
        }
      })
    }

    const newAddress = {
      id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      customerId: decoded.id,
      ...addressData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    addresses.push(newAddress)
    await saveAddresses(addresses)

    return NextResponse.json(newAddress, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
