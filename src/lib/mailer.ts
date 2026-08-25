import nodemailer from 'nodemailer'
import { blobRead } from '@/lib/blob-storage'

export const MAIL_SETTINGS_KEY = 'data/mail-settings.json'

export interface MailSettings {
  host?: string
  port?: number
  user?: string
  from?: string
  pass?: string
  resendApiKey?: string
  /** Resend refuses to send as gmail.com — it only sends from a domain you have verified. */
  resendFrom?: string
}

// Gmail shows an App Password as four space-separated groups ("abcd efgh ijkl mnop"), and a
// value pasted in that way — or wrapped in quotes, or with a stray trailing newline — is
// rejected as BadCredentials exactly like a wrong password. Normalise before authenticating.
export function normaliseSecret(raw: string | undefined | null): string {
  if (!raw) return ''
  let v = raw.trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1)
  }
  return v.replace(/\s+/g, '')
}

export interface MailConfig {
  host: string
  port: number
  user: string
  from: string
  pass: string
  resendKey: string
  resendFrom: string
  ready: boolean
  /** Where the credentials came from — the settings page or the deploy environment. */
  source: 'admin settings' | 'environment' | 'none'
}

/**
 * Credentials come from the admin settings page first, then the deploy environment.
 * Reset email was dead for months behind an env var only the host's dashboard could change;
 * storing them in the database lets the mailer be fixed from inside the site.
 */
export async function loadMailConfig(): Promise<MailConfig> {
  const saved = await blobRead<MailSettings>(MAIL_SETTINGS_KEY, {})

  const host = (saved.host || process.env.SMTP_HOST || '').trim()
  const port = Number(saved.port || process.env.SMTP_PORT || 587)
  // SMTP_USER is the documented login, but this deployment sets only SMTP_FROM and the two
  // carry the same address — accepting either is what keeps mail flowing.
  const user = (saved.user || process.env.SMTP_USER || saved.from || process.env.SMTP_FROM || '').trim()
  const from = (saved.from || process.env.SMTP_FROM || user).trim()
  const pass = normaliseSecret(saved.pass || process.env.SMTP_PASS)
  const resendKey = normaliseSecret(saved.resendApiKey || process.env.RESEND_API_KEY)
  const resendFrom = (saved.resendFrom || process.env.RESEND_FROM || 'noreply@r66slot.co.za').trim()

  const savedAnything = !!(saved.pass || saved.resendApiKey || saved.host)
  return {
    host,
    port,
    user,
    from,
    pass,
    resendKey,
    resendFrom,
    ready: !!((host && user && pass) || resendKey),
    source: savedAnything ? 'admin settings' : host || resendKey ? 'environment' : 'none',
  }
}

export function createTransport(cfg: Pick<MailConfig, 'host' | 'port' | 'user' | 'pass'>) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
    // A mail server that never answers must not hold the caller's request open until the
    // proxy times out and replaces our response with its own error page.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  })
}

/** True when SMTP can actually log in — env vars being present never meant that. */
export async function verifySmtp(cfg: MailConfig): Promise<{ ok: boolean; error?: string }> {
  if (!cfg.host || !cfg.user || !cfg.pass) return { ok: false, error: 'SMTP host, login or password missing' }
  try {
    await createTransport(cfg).verify()
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: (e?.message || String(e)).trim() }
  }
}

export interface SendResult {
  ok: boolean
  via?: 'resend' | 'smtp'
  error?: string
}

/**
 * Resend first when a key exists: it sends from the verified domain with SPF and DKIM, so
 * reset links reach the inbox rather than the spam folder, and it survives Google refusing
 * an SMTP login. SMTP stays as the fallback for deployments that only have a mailbox.
 *
 * Mail from noreply@ has nowhere to receive a reply, so every message carries a Reply-To
 * pointing at the mailbox a human actually reads.
 */
export async function sendMail(opts: {
  to: string
  subject: string
  html: string
  fromName?: string
  replyTo?: string
}): Promise<SendResult> {
  const cfg = await loadMailConfig()
  const fromName = opts.fromName || 'R66 Slot'
  const replyTo = opts.replyTo || cfg.from || undefined
  const errors: string[] = []

  if (cfg.resendKey) {
    try {
      const { Resend } = await import('resend')
      const { data, error } = await new Resend(cfg.resendKey).emails.send({
        from: `${fromName} <${cfg.resendFrom}>`,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        replyTo,
      })
      if (!error) {
        console.log(`[mail] sent via Resend to ${opts.to}, id: ${data?.id}`)
        return { ok: true, via: 'resend' }
      }
      errors.push(`Resend: ${JSON.stringify(error)}`)
    } catch (e: any) {
      errors.push(`Resend: ${e?.message || String(e)}`)
    }
  }

  if (cfg.host && cfg.user && cfg.pass) {
    try {
      await createTransport(cfg).sendMail({
        from: `"${fromName}" <${cfg.from}>`,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        replyTo,
      })
      console.log(`[mail] sent via SMTP to ${opts.to}`)
      return { ok: true, via: 'smtp' }
    } catch (e: any) {
      errors.push(`SMTP: ${(e?.message || String(e)).trim()}`)
    }
  }

  return { ok: false, error: errors.join(' | ') || 'No mail transport is configured' }
}
