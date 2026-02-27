'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setSent(true)
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold inline-block mb-2">
            <span className="text-black">R66</span>
            <span className="text-primary">SLOT</span>
          </Link>
          <h1 className="text-2xl font-bold mt-4">Forgot Password</h1>
          <p className="text-gray-600 mt-2">We&apos;ll send you a reset link</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-3xl">✉️</span>
                </div>
                <p className="font-medium">Check your email</p>
                <p className="text-sm text-gray-600">
                  If an account exists for <strong>{email}</strong>, we&apos;ve sent a reset link. Check your inbox (and spam folder).
                </p>
                <Link href="/account/login">
                  <Button variant="outline" className="w-full mt-2">Back to Login</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
                <Button type="submit" disabled={isLoading} className="w-full" size="lg">
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
                <div className="text-center text-sm">
                  <Link href="/account/login" className="text-primary hover:underline">
                    Back to Login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
