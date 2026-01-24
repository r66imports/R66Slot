'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { AuthGuard } from '@/components/admin/auth-guard'
import { useState } from 'react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const navigation = {
    site: [
      { name: 'Edit Site', href: '/admin/pages', icon: '✏️', highlight: true },
      { name: 'Dashboard', href: '/admin', icon: '📊' },
    ],
    content: [
      { name: 'Homepage', href: '/admin/homepage', icon: '🏠' },
      { name: 'Blog', href: '/admin/blog', icon: '📝' },
    ],
    business: [
      { name: 'Products', href: '/admin/products', icon: '🛍️' },
    ],
    settings: [
      { name: 'Site Settings', href: '/admin/settings', icon: '⚙️' },
    ],
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' })
      router.push('/admin/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  // Don't show navigation for login page
  if (pathname === '/admin/login') {
    return <AuthGuard>{children}</AuthGuard>
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-secondary text-white border-b border-gray-700">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/admin" className="text-2xl font-bold">
                <span className="text-white">R66</span>
                <span className="text-primary">SLOT</span>
                <span className="text-sm ml-2 text-gray-400">Admin</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                target="_blank"
                className="text-sm text-gray-300 hover:text-primary"
              >
                View Site →
              </Link>
              <Link
                href="https://admin.shopify.com"
                target="_blank"
                className="text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark font-semibold"
              >
                Shopify Admin
              </Link>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-sm text-gray-300 hover:text-primary disabled:opacity-50"
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Wix Style */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] flex flex-col">
          <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
            {/* Site Section */}
            <div>
              {navigation.site.map((item) => {
                const isActive = pathname === item.href || (item.href === '/admin/pages' && pathname.startsWith('/admin/pages'))
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-1',
                      item.highlight
                        ? isActive
                          ? 'bg-primary text-white shadow-md'
                          : 'bg-primary text-white hover:bg-primary-dark shadow-sm'
                        : isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.name}
                  </Link>
                )
              })}
            </div>

            {/* Content Section */}
            <div>
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Content
              </p>
              <div className="space-y-1">
                {navigation.content.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <span className="text-base">{item.icon}</span>
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Business Section */}
            <div>
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Business & Store
              </p>
              <div className="space-y-1">
                {navigation.business.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <span className="text-base">{item.icon}</span>
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Settings Section */}
            <div>
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Settings
              </p>
              <div className="space-y-1">
                {navigation.settings.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <span className="text-base">{item.icon}</span>
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          </nav>

          {/* Bottom Section */}
          <div className="p-3 border-t border-gray-200">
            <div className="space-y-1">
              <a
                href="https://admin.shopify.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="text-base">🛒</span>
                Shopify Admin
              </a>
              <Link
                href="/"
                target="_blank"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="text-base">👁️</span>
                View Live Site
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </div>
    </AuthGuard>
  )
}
