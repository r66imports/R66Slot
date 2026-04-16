'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AdminAuthContext, type AdminAuthData } from '@/lib/admin-auth-context'
import { ALWAYS_ALLOWED } from '@/lib/admin-permissions'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin/login'

  const [authData, setAuthData] = useState<AdminAuthData>({
    role: null,
    permissions: [],
    username: null,
  })
  const [isAuthenticated, setIsAuthenticated] = useState(isLoginPage)
  const [isLoading, setIsLoading] = useState(!isLoginPage)

  useEffect(() => {
    if (isLoginPage) return

    const checkAuth = async () => {
      // Development bypass
      if (process.env.NODE_ENV === 'development') {
        setAuthData({ role: 'admin', permissions: [], username: 'Admin' })
        setIsAuthenticated(true)
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch('/api/admin/auth/check')
        const data = await response.json()

        if (data.authenticated) {
          const role = data.role ?? 'admin'
          const permissions: string[] = data.permissions ?? []
          const username: string = data.username ?? 'Admin'

          setAuthData({ role, permissions, username })
          setIsAuthenticated(true)

          // Redirect staff away from pages they can't access
          if (role === 'staff') {
            const allowed = permissions
            const canAccess =
              allowed.includes(pathname) ||
              allowed.some((p) => pathname.startsWith(p + '/')) ||
              ALWAYS_ALLOWED.some((p) => pathname === p || pathname.startsWith(p + '/'))

            if (!canAccess) {
              // Redirect to first permitted page
              const firstPage = allowed.find((p) => !ALWAYS_ALLOWED.includes(p))
              router.push(firstPage ?? '/admin')
            }
          }
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

  return (
    <AdminAuthContext.Provider value={authData}>
      {children}
    </AdminAuthContext.Provider>
  )
}
