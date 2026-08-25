import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import { loadMailConfig, sendMail } from '@/lib/mailer'

const CUSTOMERS_KEY = 'data/customers.json'
const RESET_TOKENS_KEY = 'data/password-reset-tokens.json'
// A reset link that dies in an hour is no use to someone who reads mail once a day —
// they come back to a dead link and are locked out all over again.
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const normalised = email.toLowerCase().trim()

    // Checked BEFORE the customer lookup on purpose: a misconfigured mailer is the same
    // answer for every address, so failing here leaks nothing about who has an account.
    // Reporting success with no mailer configured tells customers to check an inbox that
    // will never receive anything, and leaves them locked out with no way to recover.
    const mail = await loadMailConfig()
    if (!mail.ready) {
      console.error('[forgot-password] no mail transport configured')
      return NextResponse.json(
        { error: 'Password reset email is temporarily unavailable. Please contact us and we will reset it for you.' },
        { status: 503 }
      )
    }

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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.r66slot.co.za'
    const resetLink = `${siteUrl}/account/reset-password?token=${token}`

    const sent = await sendMail({
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
          <p style="color:#666;font-size:13px">This link expires in 24 hours. If you didn&rsquo;t request a reset, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="color:#999;font-size:12px">R66 Slot &mdash; r66slot.co.za</p>
        </div>
      `,
    })

    if (!sent.ok) {
      // Say so rather than letting the customer wait on mail that was never accepted.
      // 503, not 502: the CDN in front of this app replaces a 502 body with its own
      // "error code: 502" page, so the customer never sees why nothing arrived.
      console.error('[forgot-password] send failed:', sent.error)
      return NextResponse.json(
        { error: 'We could not send the reset email. Please contact us and we will reset it for you.' },
        { status: 503 }
      )
    }

    console.log(`[forgot-password] reset link sent to ${normalised} via ${sent.via}`)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[forgot-password] error:', err?.message || err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
