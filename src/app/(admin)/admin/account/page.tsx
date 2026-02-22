'use client'

import { useEffect, useState } from 'react'

type AdminProfile = {
  id: string
  firstName: string
  lastName: string
  username: string
  email: string
  phone: string
  displayName: string
  bio: string
  whatsapp: string
  location: string
  createdAt: string
  updatedAt?: string
}

type Tab = 'personal' | 'password'

export default function AdminAccountPage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('personal')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Personal info form
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    displayName: '',
    bio: '',
    whatsapp: '',
    location: '',
  })

  // Password form
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false })

  useEffect(() => {
    fetch('/api/admin/account/profile')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return
        setProfile(data)
        setForm({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          displayName: data.displayName || '',
          bio: data.bio || '',
          whatsapp: data.whatsapp || '',
          location: data.location || '',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleSavePersonal(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/admin/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast('error', data.error || 'Failed to save')
      } else {
        setProfile(data)
        showToast('success', 'Profile saved successfully')
      }
    } catch {
      showToast('error', 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      showToast('error', 'New passwords do not match')
      return
    }
    if (pwForm.newPassword.length < 8) {
      showToast('error', 'New password must be at least 8 characters')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast('error', data.error || 'Failed to change password')
      } else {
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
        showToast('success', 'Password changed successfully')
      }
    } catch {
      showToast('error', 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-play">Loading profile...</p>
        </div>
      </div>
    )
  }

  const initials = profile
    ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase() || 'A'
    : 'A'

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-play font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-play text-gray-900">My Account</h1>
        <p className="text-gray-500 font-play text-sm mt-1">
          Manage your personal information and security settings
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-2xl font-bold font-play flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1">
          <p className="text-lg font-bold font-play text-gray-900">
            {profile?.displayName || `${profile?.firstName} ${profile?.lastName}`}
          </p>
          <p className="text-sm text-gray-500 font-play">{profile?.email}</p>
          <p className="text-xs text-gray-400 font-play mt-1">
            Administrator · Member since{' '}
            {profile?.createdAt
              ? new Date(profile.createdAt).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
              : '—'}
          </p>
        </div>
        {profile?.updatedAt && (
          <p className="text-xs text-gray-400 font-play hidden sm:block">
            Last updated{' '}
            {new Date(profile.updatedAt).toLocaleDateString('en-ZA', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {(['personal', 'password'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold font-play transition-all ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'personal' ? '👤 Personal Info' : '🔒 Password'}
          </button>
        ))}
      </div>

      {/* Personal Info Form */}
      {activeTab === 'personal' && (
        <form onSubmit={handleSavePersonal} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h2 className="text-base font-bold font-play text-gray-800">Personal Information</h2>

          {/* Name row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First Name *">
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
                placeholder="e.g. Reinhardt"
                className={inputCls}
              />
            </Field>
            <Field label="Last Name *">
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
                placeholder="e.g. van Jaarsveld"
                className={inputCls}
              />
            </Field>
          </div>

          {/* Display Name */}
          <Field label="Display Name" hint="How your name appears across the admin">
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="e.g. Reinhardt (Admin)"
              className={inputCls}
            />
          </Field>

          {/* Contact row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email Address *">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                placeholder="admin@r66slot.co.za"
                className={inputCls}
              />
            </Field>
            <Field label="Phone Number">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+27 61 234 5678"
                className={inputCls}
              />
            </Field>
          </div>

          {/* Extra contact row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="WhatsApp Number" hint="Used for quick notifications">
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="+27 61 234 5678"
                className={inputCls}
              />
            </Field>
            <Field label="Location / City">
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Johannesburg, ZA"
                className={inputCls}
              />
            </Field>
          </div>

          {/* Bio */}
          <Field label="Short Bio" hint="A brief description (optional)">
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3}
              maxLength={300}
              placeholder="e.g. Passionate slot car collector and R66SLOT founder."
              className={`${inputCls} resize-none`}
            />
            <p className="text-xs text-gray-400 font-play mt-1 text-right">{form.bio.length}/300</p>
          </Field>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-2.5 bg-red-600 text-white font-semibold font-play rounded-xl hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Details'}
            </button>
          </div>
        </form>
      )}

      {/* Password Form */}
      {activeTab === 'password' && (
        <form onSubmit={handleChangePassword} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h2 className="text-base font-bold font-play text-gray-800">Change Password</h2>
          <p className="text-sm text-gray-500 font-play -mt-2">
            Choose a strong password with at least 8 characters.
          </p>

          <Field label="Current Password">
            <div className="relative">
              <input
                type={showPw.current ? 'text' : 'password'}
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                required
                placeholder="••••••••"
                className={`${inputCls} pr-12`}
              />
              <EyeToggle show={showPw.current} onToggle={() => setShowPw({ ...showPw, current: !showPw.current })} />
            </div>
          </Field>

          <Field label="New Password">
            <div className="relative">
              <input
                type={showPw.new ? 'text' : 'password'}
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                required
                minLength={8}
                placeholder="Min. 8 characters"
                className={`${inputCls} pr-12`}
              />
              <EyeToggle show={showPw.new} onToggle={() => setShowPw({ ...showPw, new: !showPw.new })} />
            </div>
            {/* Strength bar */}
            {pwForm.newPassword && (
              <div className="mt-2">
                <PasswordStrength password={pwForm.newPassword} />
              </div>
            )}
          </Field>

          <Field label="Confirm New Password">
            <div className="relative">
              <input
                type={showPw.confirm ? 'text' : 'password'}
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                required
                placeholder="Repeat new password"
                className={`${inputCls} pr-12 ${
                  pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword
                    ? 'border-red-400 focus:ring-red-400'
                    : ''
                }`}
              />
              <EyeToggle show={showPw.confirm} onToggle={() => setShowPw({ ...showPw, confirm: !showPw.confirm })} />
            </div>
            {pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword && (
              <p className="text-xs text-red-500 font-play mt-1">Passwords do not match</p>
            )}
          </Field>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-2.5 bg-red-600 text-white font-semibold font-play rounded-xl hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const inputCls =
  'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-play text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-shadow'

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-semibold font-play text-gray-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 font-play mt-1">{hint}</p>}
    </div>
  )
}

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      tabIndex={-1}
    >
      {show ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  )
}

function PasswordStrength({ password }: { password: string }) {
  let strength = 0
  if (password.length >= 8) strength++
  if (/[A-Z]/.test(password)) strength++
  if (/[0-9]/.test(password)) strength++
  if (/[^A-Za-z0-9]/.test(password)) strength++

  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400', 'bg-green-600']

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              i < strength ? colors[strength] : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-play ${strength >= 3 ? 'text-green-600' : 'text-gray-500'}`}>
        {labels[strength]}
      </p>
    </div>
  )
}
