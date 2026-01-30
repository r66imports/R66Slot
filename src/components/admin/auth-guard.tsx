'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin/login'
  const [isAuthenticated, setIsAuthenticated] = useState(isLoginPage)
  const [isLoading, setIsLoading] = useState(!isLoginPage)

  useEffect(() => {
    // Don't check auth for login page
    if (isLoginPage) {
      return
    }

    const checkAuth = async () => {
      // Development bypass - skip auth in development mode
      if (process.env.NODE_ENV === 'development') {
        setIsAuthenticated(true)
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch('/api/admin/auth/check')
        const data = await response.json()

        if (data.authenticated) {
          setIsAuthenticated(true)
        } else {
          router.push('/admin/login')
        }
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/admin/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [pathname, router, isLoginPage])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated && !isLoginPage) {
    return null
  }

  return <>{children}</>
}
