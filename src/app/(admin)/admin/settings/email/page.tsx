'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SecretState { set: boolean; length: number }
interface MailForm {
  host: string
  port: number
  user: string
  from: string
  pass: SecretState
  resendApiKey: SecretState
  resendFrom: string
}

export default function EmailSettingsPage() {
  const [form, setForm] = useState<MailForm | null>(null)
  const [source, setSource] = useState('')
  const [canSend, setCanSend] = useState(false)
  const [smtpStatus, setSmtpStatus] = useState('')
  const [newPass, setNewPass] = useState('')
  const [newResend, setNewResend] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    const res = await fetch('/api/admin/mail-settings')
    const data = await res.json()
    if (data.error) { setMessage({ kind: 'err', text: data.error }); return }
    setForm(data.settings)
    setSource(data.source)
    setCanSend(data.canSend)
    setSmtpStatus(data.smtpStatus)
  }

  const save = async () => {
    if (!form) return
    setIsSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/mail-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: form.host,
          port: form.port,
          user: form.user,
          from: form.from,
          pass: newPass,
          resendApiKey: newResend,
          resendFrom: form.resendFrom,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setNewPass('')
      setNewResend('')
      setCanSend(data.canSend)
      setSmtpStatus(data.smtpStatus)
      setMessage(
        data.canSend
          ? { kind: 'ok', text: data.usingResend ? 'Saved — sending via Resend.' : 'Saved — the mail server accepted the login.' }
          : { kind: 'err', text: `Saved, but the mail server refused it: ${data.smtpStatus}` }
      )
      load()
    } catch (e: any) {
      setMessage({ kind: 'err', text: e.message || 'Save failed' })
    } finally {
      setIsSaving(false)
    }
  }

  const sendTest = async () => {
    setIsTesting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/test-email', { method: 'POST' })
      const data = await res.json()
      setMessage(data.ok ? { kind: 'ok', text: data.detail } : { kind: 'err', text: data.error })
    } catch (e: any) {
      setMessage({ kind: 'err', text: e.message || 'Test failed' })
    } finally {
      setIsTesting(false)
    }
  }

  if (!form) return <div className="p-8 text-gray-500">Loading…</div>

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Email Settings</h1>
      <p className="text-gray-600 mb-6">
        Credentials for password reset links, quotes and invoices. Saved here they take effect
        immediately — no redeploy, no hosting dashboard.
      </p>

      <div className={`mb-6 px-4 py-3 rounded-lg text-sm ${canSend ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
        <strong>{canSend ? 'Email is working' : 'Email is NOT sending'}</strong>
        <div className="mt-1">{smtpStatus}</div>
        <div className="mt-1 text-xs opacity-75">Credentials currently read from: {source}</div>
      </div>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm ${message.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader><CardTitle>Gmail / SMTP (fallback)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Mail server</label>
            <Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="smtp.gmail.com" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Port</label>
              <Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Send from</label>
              <Input value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} placeholder="r66imports@gmail.com" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              App Password {form.pass.set && <span className="text-gray-500 font-normal">— {form.pass.length} characters saved</span>}
            </label>
            <Input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder={form.pass.set ? 'Leave blank to keep the saved password' : 'abcd efgh ijkl mnop'}
              autoComplete="new-password"
            />
            <p className="text-xs text-gray-500 mt-2">
              Not your Gmail login — a 16-character App Password from{' '}
              <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                myaccount.google.com/apppasswords
              </a>
              . Spaces are fine, they get stripped.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader><CardTitle>Resend (recommended)</CardTitle></CardHeader>
        <CardContent>
          <label className="block text-sm font-medium mb-2">
            API key {form.resendApiKey.set && <span className="text-gray-500 font-normal">— {form.resendApiKey.length} characters saved</span>}
          </label>
          <Input
            type="password"
            value={newResend}
            onChange={(e) => setNewResend(e.target.value)}
            placeholder={form.resendApiKey.set ? 'Leave blank to keep the saved key' : 're_...'}
            autoComplete="new-password"
          />
          <p className="text-xs text-gray-500 mt-2">
            Preferred when set — sends from your own domain with SPF and DKIM, so reset links land in
            the inbox instead of the spam folder. Free for 3,000 emails a month at{' '}
            <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">resend.com</a>.
          </p>
          <label className="block text-sm font-medium mt-4 mb-2">Send from (must be a domain verified in Resend)</label>
          <Input value={form.resendFrom} onChange={(e) => setForm({ ...form, resendFrom: e.target.value })} placeholder="noreply@r66slot.co.za" />
          <p className="text-xs text-gray-500 mt-2">
            Replies go to the address in the Send from field above, so customers reach a real inbox.
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={save} disabled={isSaving} size="lg">{isSaving ? 'Saving…' : 'Save & Verify'}</Button>
        <Button onClick={sendTest} disabled={isTesting} variant="outline" size="lg">
          {isTesting ? 'Sending…' : 'Send Test Email'}
        </Button>
      </div>
    </div>
  )
}
