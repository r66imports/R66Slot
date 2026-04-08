'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils/cn'

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [user, setUser] = useState<{ firstName: string; lastName: string; username: string; email: string } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data && !data.error) setUser(data) })
      .catch(() => {})
  }, [])

  // Public pages that don't need sidebar
  const isAuthPage = pathname === '/account/login' || pathname === '/account/register'

  if (isAuthPage) {
    return <div className="min-h-screen bg-gray-50">{children}</div>
  }

  const navigation = [
    { name: 'Dashboard', href: '/account', icon: '🏠' },
    { name: 'Orders', href: '/account/orders', icon: '📦' },
    { name: 'Addresses', href: '/account/addresses', icon: '📍' },
    { name: 'Profile', href: '/account/profile', icon: '👤' },
    { name: 'My Bids', href: '/account/auctions', icon: '🔨' },
    { name: 'Won Auctions', href: '/account/auctions/won', icon: '🏆' },
    { name: 'Watchlist', href: '/account/auctions/watchlist', icon: '❤️' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Account</h1>
          <p className="text-gray-600 mt-1">Manage your account and orders</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-full md:w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-sm p-4 space-y-1">
              {/* Profile summary */}
              {user && (
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-black font-bold text-lg flex-shrink-0">
                      {user.firstName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      {user.username && (
                        <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                      )}
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-black'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {item.name}
                  </Link>
                )
              })}

              <div className="pt-4 mt-4 border-t border-gray-200">
                <Link
                  href="/"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  <span className="text-lg">🏪</span>
                  Continue Shopping
                </Link>
                <button
                  onClick={async () => {
                    await fetch('/api/auth/logout', { method: 'POST' })
                    window.location.href = '/account/login'
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <span className="text-lg">🚪</span>
                  Logout
                </button>
              </div>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}
