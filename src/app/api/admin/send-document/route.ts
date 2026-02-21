import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
  try {
    const { to, subject, html, documentType } = await request.json()

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Build transporter from env vars (user configures their SMTP in .env)
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = parseInt(process.env.SMTP_PORT || '587')
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const smtpFrom = process.env.SMTP_FROM || smtpUser || 'noreply@r66slot.co.za'

    if (!smtpHost || !smtpUser || !smtpPass) {
      // Return a mailto fallback if SMTP not configured
      const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent('Please find your document attached.')}`
      return NextResponse.json({
        success: false,
        mailto: mailtoLink,
        message: 'SMTP not configured. Use mailto link to send manually.',
      })
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    })

    await transporter.sendMail({
      from: `"R66SLOT Admin" <${smtpFrom}>`,
      to,
      subject,
      html,
    })

    return NextResponse.json({ success: true, message: `${documentType} sent to ${to}` })
  } catch (error: any) {
    console.error('Error sending document email:', error)
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 })
  }
}
