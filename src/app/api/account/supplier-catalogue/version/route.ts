import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { getCatalogueVersion } from '@/lib/supplier-catalogue'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

/**
 * Fingerprint of the orderable sheet, for the client page to poll. One blob
 * read and no Inventory query, so it stays cheap enough to call on a timer —
 * the full catalogue read behind /api/account/supplier-catalogue is not.
 */
export async function GET(_request: NextRequest) {
  try {
    const token = (await cookies()).get('customer_token')?.value
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    jwt.verify(token, JWT_SECRET)
    return NextResponse.json({ version: await getCatalogueVersion() })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
