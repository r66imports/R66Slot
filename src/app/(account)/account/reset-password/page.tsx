'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <p className="text-red-600 font-medium">Invalid reset link</p>
        <Link href="/account/forgot-password">
          <Button variant="outline">Request a new link</Button>
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (res.ok) {
        setDone(true)
        setTimeout(() => router.push('/account/login'), 3000)
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-3xl">✅</span>
        </div>
        <p className="font-medium">Password updated!</p>
        <p className="text-sm text-gray-600">Redirecting you to login…</p>
        <Link href="/account/login">
          <Button className="w-full mt-2">Go to Login</Button>
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      <div>
        <label className="block text-sm font-medium mb-2">New Password</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimum 8 characters"
          required
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Confirm Password</label>
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat your new password"
          required
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full" size="lg">
        {isLoading ? 'Updating...' : 'Set New Password'}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold inline-block mb-2">
            <span className="text-black">R66</span>
            <span className="text-primary">SLOT</span>
          </Link>
          <h1 className="text-2xl font-bold mt-4">Set New Password</h1>
          <p className="text-gray-600 mt-2">Choose a strong password</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>New Password</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<p className="text-sm text-gray-500">Loading…</p>}>
              <ResetPasswordForm />
            </Suspense>
          </CardContent>
        </Card>
        <div className="mt-6 text-center">
          <Link href="/account/login" className="text-sm text-gray-600 hover:text-black">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
