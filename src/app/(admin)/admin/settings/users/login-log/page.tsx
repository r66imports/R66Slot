'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAdminAuth } from '@/lib/admin-auth-context'

interface LoginLogEntry {
  id: number
  username: string
  outcome: 'success' | 'bad_password' | 'unknown_user' | 'inactive' | 'error'
  ip: string | null
  userAgent: string | null
  createdAt: string
}

const OUTCOME: Record<LoginLogEntry['outcome'], { label: string; cls: string }> = {
  success: { label: 'Logged in', cls: 'bg-green-100 text-green-700' },
  bad_password: { label: 'Wrong password', cls: 'bg-amber-100 text-amber-700' },
  unknown_user: { label: 'No such user', cls: 'bg-red-100 text-red-700' },
  inactive: { label: 'Account inactive', cls: 'bg-red-100 text-red-700' },
  error: { label: 'Server error', cls: 'bg-gray-100 text-gray-600' },
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** Short browser label — the full user-agent sits in the tooltip. */
function browserLabel(ua: string | null): string {
  if (!ua) return '—'
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : ''
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : /curl/i.test(ua) ? 'curl' : 'Other'
  return os ? `${br} · ${os}` : br
}

export default function LoginLogPage() {
  const router = useRouter()
  const { role } = useAdminAuth()
  const [entries, setEntries] = useState<LoginLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [failedOnly, setFailedOnly] = useState(false)

  // Block staff accounts from accessing this page
  useEffect(() => {
    if (role === 'staff') router.replace('/admin')
  }, [role, router])

  const load = async (name: string) => {
    setLoading(true)
    setError('')
    try {
      const qs = name.trim() ? `?username=${encodeURIComponent(name.trim())}` : ''
      const res = await fetch(`/api/admin/users/login-log${qs}`)
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`)
      setEntries(await res.json())
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load('') }, [])

  const shown = failedOnly ? entries.filter((e) => e.outcome !== 'success') : entries

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Login Log</h1>
          <p className="text-sm text-gray-500 mt-1">Every admin login attempt — successful or not. Newest first.</p>
        </div>
        <Link href="/admin/settings/users" className="text-sm text-indigo-600 hover:underline">← User Accounts</Link>
      </div>

      <form
        className="flex flex-wrap items-center gap-3 mb-4"
        onSubmit={(e) => { e.preventDefault(); load(username) }}
      >
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Filter by username"
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-56"
        />
        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          Search
        </button>
        {username && (
          <button type="button" onClick={() => { setUsername(''); load('') }} className="text-sm text-gray-500 hover:underline">
            Clear
          </button>
        )}
        <label className="flex items-center gap-2 text-sm text-gray-700 ml-auto">
          <input type="checkbox" checked={failedOnly} onChange={(e) => setFailedOnly(e.target.checked)} />
          Failed attempts only
        </label>
      </form>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Result</th>
              <th className="px-4 py-3 font-medium">IP</th>
              <th className="px-4 py-3 font-medium">Browser</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : shown.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No login attempts recorded.</td></tr>
            ) : (
              shown.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-700">{formatWhen(e.createdAt)}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">{e.username}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${OUTCOME[e.outcome]?.cls ?? 'bg-gray-100 text-gray-600'}`}>
                      {OUTCOME[e.outcome]?.label ?? e.outcome}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-600">{e.ip || '—'}</td>
                  <td className="px-4 py-2 text-gray-600" title={e.userAgent || ''}>{browserLabel(e.userAgent)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-3">Shows the latest 500. Recording started 24 Oct 2026 — nothing before that was logged.</p>
    </div>
  )
}
