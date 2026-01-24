'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername, password }),
      })

      const data = await response.json()

      if (response.ok) {
        // Successful login
        router.push('/account')
        router.refresh()
      } else {
        setError(data.error || 'Invalid email or password')
      }
    } catch (err) {
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
          <h1 className="text-2xl font-bold mt-4">Welcome Back</h1>
          <p className="text-gray-600 mt-2">Customer Login</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Email or Username
                </label>
                <Input
                  type="text"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="username or email@example.com"
                  required
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-gray-600">Remember me</span>
                </label>
                <Link
                  href="/account/forgot-password"
                  className="text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="text-center text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <Link
                  href="/account/register"
                  className="text-primary hover:underline font-semibold"
                >
                  Create one
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center space-y-3">
          <Link href="/" className="text-sm text-gray-600 hover:text-black block">
            ← Back to store
          </Link>
          <div className="border-t pt-3">
            <p className="text-xs text-gray-500 mb-1">Staff Member?</p>
            <Link
              href="/admin/login"
              className="text-sm text-gray-600 hover:text-primary"
            >
              Admin Login →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
