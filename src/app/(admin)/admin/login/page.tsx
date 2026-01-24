'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function AdminLoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        router.push('/admin')
        router.refresh()
      } else {
        const data = await response.json()
        setError(data.error || 'Invalid credentials')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Failed to login. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-black">R66</span>
            <span className="text-primary">SLOT</span>
          </h1>
          <p className="text-gray-600 font-semibold">Admin Back Office</p>
          <p className="text-sm text-gray-500 mt-1">Staff Access Only</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login to Admin Panel</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                  {error}
                </div>
              )}

              <Input
                label="Username"
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                placeholder="Enter your username"
                required
                autoComplete="username"
              />

              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Logging in...' : 'Login'}
                </Button>
              </div>

              <div className="text-xs text-gray-500 text-center pt-2">
                Admin access only
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 mb-2">Customer Login?</p>
          <Link
            href="/account/login"
            className="text-sm text-primary hover:underline font-semibold"
          >
            Go to Customer Login →
          </Link>
        </div>
      </div>
    </div>
  )
}
