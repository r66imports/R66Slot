import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import { loadMailConfig, normaliseSecret, verifySmtp, MAIL_SETTINGS_KEY, type MailSettings } from '@/lib/mailer'

// These are live sending credentials — anyone who can read them can send as the business.
async function requireAdmin() {
  const cookieStore = await cookies()
  if (!cookieStore.get('admin-session')?.value) throw new Error('Unauthorized')
}

/** Secrets go out as a length, never a value — the form shows a placeholder, not the key. */
function describeSecret(v: string | undefined) {
  const s = normaliseSecret(v)
  return s ? { set: true, length: s.length } : { set: false, length: 0 }
}

export async function GET() {
  try {
    await requireAdmin()
    const saved = await blobRead<MailSettings>(MAIL_SETTINGS_KEY, {})
    const cfg = await loadMailConfig()
    const smtp = cfg.host && cfg.user && cfg.pass ? await verifySmtp(cfg) : { ok: false, error: 'SMTP not configured' }

    return NextResponse.json({
      settings: {
        host: saved.host || process.env.SMTP_HOST || '',
        port: saved.port || Number(process.env.SMTP_PORT || 587),
        user: saved.user || process.env.SMTP_USER || '',
        from: saved.from || process.env.SMTP_FROM || '',
        pass: describeSecret(saved.pass || process.env.SMTP_PASS),
        resendApiKey: describeSecret(saved.resendApiKey || process.env.RESEND_API_KEY),
        resendFrom: saved.resendFrom || process.env.RESEND_FROM || 'noreply@r66slot.co.za',
      },
      source: cfg.source,
      canSend: smtp.ok || !!cfg.resendKey,
      smtpStatus: cfg.resendKey
        ? `Sending via Resend as ${cfg.resendFrom}${smtp.ok ? ' (SMTP also available)' : ''}`
        : smtp.ok
          ? 'Login accepted'
          : smtp.error,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === 'Unauthorized' ? 401 : 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const saved = await blobRead<MailSettings>(MAIL_SETTINGS_KEY, {})

    const next: MailSettings = {
      host: typeof body.host === 'string' ? body.host.trim() : saved.host,
      port: body.port ? Number(body.port) : saved.port,
      user: typeof body.user === 'string' ? body.user.trim() : saved.user,
      from: typeof body.from === 'string' ? body.from.trim() : saved.from,
      // An empty field means "leave the stored secret alone", so saving the host does not
      // wipe the password the form never displays back.
      pass: body.pass ? normaliseSecret(body.pass) : saved.pass,
      resendApiKey: body.resendApiKey ? normaliseSecret(body.resendApiKey) : saved.resendApiKey,
      resendFrom: typeof body.resendFrom === 'string' && body.resendFrom.trim() ? body.resendFrom.trim() : saved.resendFrom,
    }
    if (body.clearPass) delete next.pass
    if (body.clearResend) delete next.resendApiKey

    await blobWrite(MAIL_SETTINGS_KEY, next)

    // Report straight away whether the new credentials actually log in — the whole point of
    // this page is that "saved" and "working" stopped being the same thing.
    const cfg = await loadMailConfig()
    const smtp = cfg.host && cfg.user && cfg.pass ? await verifySmtp(cfg) : { ok: false, error: 'SMTP not configured' }

    return NextResponse.json({
      saved: true,
      resendConfigured: !!cfg.resendKey,
      canSend: smtp.ok || !!cfg.resendKey,
      smtpStatus: cfg.resendKey
        ? `Sending via Resend as ${cfg.resendFrom}${smtp.ok ? ' (SMTP also available)' : ''}`
        : smtp.ok
          ? 'Login accepted'
          : smtp.error,
      usingResend: !!cfg.resendKey,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === 'Unauthorized' ? 401 : 500 })
  }
}
