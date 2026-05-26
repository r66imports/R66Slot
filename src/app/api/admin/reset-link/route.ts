import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const RESET_TOKENS_KEY = 'data/password-reset-tokens.json'
const CUSTOMERS_KEY = 'data/customers.json'
const TOKEN_TTL_MS = 60 * 60 * 1000

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

    const normalised = email.trim().toLowerCase()

    // Look up the actual customer record by email
    const customers = await blobRead<any[]>(CUSTOMERS_KEY, [])
    const customer = customers.find((c: any) => c.email?.toLowerCase() === normalised)
    if (!customer) {
      return NextResponse.json({ error: 'No customer account found for this email. Use "Set Password" first to create one.' }, { status: 404 })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = Date.now() + TOKEN_TTL_MS

    const tokens = await blobRead<any[]>(RESET_TOKENS_KEY, [])
    const fresh = tokens.filter((t: any) => t.expiresAt > Date.now())
    fresh.push({ token, customerId: customer.id, email: normalised, expiresAt })
    await blobWrite(RESET_TOKENS_KEY, fresh)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.r66slot.co.za'
    const resetLink = `${siteUrl}/account/reset-password?token=${token}`

    return NextResponse.json({ resetLink })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
