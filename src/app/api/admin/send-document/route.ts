import { NextResponse } from 'next/server'
import { loadMailConfig, sendMail } from '@/lib/mailer'

export async function POST(request: Request) {
  try {
    const { to, subject, html, documentType } = await request.json()

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const cfg = await loadMailConfig()
    if (!cfg.ready) {
      // Return a mailto fallback if no mailer is configured
      const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent('Please find your document attached.')}`
      return NextResponse.json({
        success: false,
        mailto: mailtoLink,
        message: 'Email is not configured. Use the mailto link, or set it up under Settings → Email.',
      })
    }

    const sent = await sendMail({ to, subject, html, fromName: 'R66SLOT Admin' })
    if (!sent.ok) {
      return NextResponse.json({ success: false, error: sent.error }, { status: 503 })
    }

    return NextResponse.json({ success: true, message: `${documentType} sent to ${to}` })
  } catch (error: any) {
    console.error('Error sending document email:', error)
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 })
  }
}
