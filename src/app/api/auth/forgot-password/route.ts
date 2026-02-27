import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const CUSTOMERS_KEY = 'data/customers.json'
const RESET_TOKENS_KEY = 'data/password-reset-tokens.json'
const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_FROM,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const normalised = email.toLowerCase().trim()

    const customers = await blobRead<any[]>(CUSTOMERS_KEY, [])
    const customer = customers.find((c: any) => c.email?.toLowerCase() === normalised)

    // Always respond success to prevent email enumeration
    if (!customer) {
      return NextResponse.json({ success: true })
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = Date.now() + TOKEN_TTL_MS

    // Store token (clean up expired ones first)
    const tokens = await blobRead<any[]>(RESET_TOKENS_KEY, [])
    const fresh = tokens.filter((t: any) => t.expiresAt > Date.now())
    fresh.push({ token, customerId: customer.id, email: normalised, expiresAt })
    await blobWrite(RESET_TOKENS_KEY, fresh)

    // Send email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.r66slot.co.za'
    const resetLink = `${siteUrl}/account/reset-password?token=${token}`

    if (process.env.SMTP_HOST && process.env.SMTP_PASS) {
      const transporter = createTransport()
      await transporter.sendMail({
        from: `"R66 Slot" <${process.env.SMTP_FROM}>`,
        to: customer.email,
        subject: 'Reset your R66 Slot password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#111">Password Reset</h2>
            <p>Hi ${customer.firstName || customer.username || 'there'},</p>
            <p>We received a request to reset your password. Click the button below to choose a new one.</p>
            <p style="margin:32px 0">
              <a href="${resetLink}"
                style="background:#f5c842;color:#111;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">
                Reset Password
              </a>
            </p>
            <p style="color:#666;font-size:13px">This link expires in 1 hour. If you didn&rsquo;t request a reset, you can safely ignore this email.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
            <p style="color:#999;font-size:12px">R66 Slot &mdash; r66slot.co.za</p>
          </div>
        `,
      })
    } else {
      // Dev fallback: log the link
      console.log('[forgot-password] Reset link:', resetLink)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[forgot-password] error:', err?.message || err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
