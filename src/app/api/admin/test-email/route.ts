import { NextResponse } from 'next/server'
import { loadMailConfig, sendMail } from '@/lib/mailer'

export async function POST() {
  const cfg = await loadMailConfig()
  if (!cfg.ready) {
    return NextResponse.json({ ok: false, error: 'No mailer configured — add a Resend key or SMTP password below.' })
  }

  const to = cfg.from || cfg.user
  const sent = await sendMail({
    to,
    subject: 'R66 Slot — email test',
    html: '<p>Email is working correctly for R66 Slot.</p>',
    fromName: 'R66 Slot Test',
  })

  return sent.ok
    ? NextResponse.json({ ok: true, detail: `Test email sent to ${to} via ${sent.via}` })
    : NextResponse.json({ ok: false, error: sent.error })
}
