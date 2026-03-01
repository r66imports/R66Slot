'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { AuthGuard } from '@/components/admin/auth-guard'
import { useState, useEffect } from 'react'
import CostingModal, { INITIAL_COSTING_STATE, type CostingState } from '@/components/admin/costing-modal'

// Submenu item type
interface NavItem {
  name: string
  href: string
  icon: string
  highlight?: boolean
  isModal?: boolean
  submenu?: NavItem[]
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [currentBrand, setCurrentBrand] = useState('')

  // Read brand param from URL on client (avoids useSearchParams Suspense requirement)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setCurrentBrand(params.get('brand') || '')
  }, [pathname])
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showCostingModal, setShowCostingModal] = useState(false)
  const [costingState, setCostingState] = useState<CostingState>(INITIAL_COSTING_STATE)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['Inventory Management', 'Order Network']) // Default expanded

  const toggleSubmenu = (name: string) => {
    setExpandedMenus(prev =>
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : [...prev, name]
    )
  }

  const navigation: { [key: string]: NavItem[] } = {
    site: [
      { name: 'Edit Site', href: '/admin/pages', icon: '✏️', highlight: true },
      { name: 'Dashboard', href: '/admin', icon: '📊' },
    ],
    content: [
      { name: 'Homepage', href: '/admin/homepage', icon: '🏠' },
      {
        name: 'Inventory Management',
        href: '/admin/products',
        icon: '📦',
        submenu: [
          { name: 'All Products', href: '/admin/products', icon: '🛍️' },
          { name: 'NSR', href: '/admin/products?brand=NSR', icon: '🏎️' },
          { name: 'Revo', href: '/admin/products?brand=Revo', icon: '🔧' },
          { name: 'BRM', href: '/admin/products?brand=BRM', icon: '🏁' },
          { name: 'Pioneer', href: '/admin/products?brand=Pioneer', icon: '🚗' },
          { name: 'Sideways', href: '/admin/products?brand=Sideways', icon: '🔄' },
          { name: 'Suppliers', href: '/admin/suppliers', icon: '📥' },
        ]
      },
    ],
    blog: [
      { name: 'Blog', href: '/admin/blog', icon: '📝' },
    ],
    auctions: [
      {
        name: 'Auctions',
        href: '/admin/auctions',
        icon: '🔨',
        submenu: [
          { name: 'All Auctions', href: '/admin/auctions', icon: '📋' },
          { name: 'Create Auction', href: '/admin/auctions/new', icon: '➕' },
        ]
      },
    ],
    orderNetwork: [
      {
        name: 'Order Network',
        href: '/admin/preorder-list',
        icon: '🌐',
        submenu: [
          { name: 'Store Orders', href: '/admin/slotify-orders', icon: '🛒' },
          { name: 'Orders', href: '/admin/slotify-preorders', icon: '📦' },
          { name: 'Pre-Orders', href: '/admin/preorder-list', icon: '📋' },
          { name: 'Back Orders', href: '/admin/backorders', icon: '🔄' },
        ],
      },
    ],
    business: [
      {
        name: 'Social Media',
        href: '/admin/social-media',
        icon: '📱',
        submenu: [
          { name: 'Create Poster', href: '/admin/slotcar-orders', icon: '🎨' },
          { name: 'Media Library', href: '/admin/media', icon: '🖼️' },
        ]
      },
      { name: 'Customers', href: '/admin/contacts', icon: '👥' },
      { name: 'Local Shipping', href: '/admin/shipping', icon: '🚚' },
      { name: 'Payments', href: '/admin/payments', icon: '💳' },
      { name: 'Sage Accounting', href: '/admin/sage', icon: '📊' },
      { name: 'Costing Calculator', href: '#', icon: '💰', isModal: true },
    ],
    settings: [
      { name: 'Site Settings', href: '/admin/settings', icon: '⚙️' },
      { name: 'My Account', href: '/admin/account', icon: '👤' },
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

  const handleMinimizeCosting = () => {
    setShowCostingModal(false)
  }

  const handleCloseCosting = () => {
    setShowCostingModal(false)
    setCostingState(INITIAL_COSTING_STATE)
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
              <Link href="/admin" className="text-2xl font-bold font-play">
                <span className="text-white">R66</span>
                <span className="text-primary">SLOT</span>
                <span className="text-sm ml-2 text-gray-400">Admin</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                target="_blank"
                className="text-sm text-gray-300 hover:text-primary font-play"
              >
                View Site →
              </Link>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-sm text-gray-300 hover:text-primary disabled:opacity-50 font-play"
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
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-1 font-play',
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
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 font-play">
                Content
              </p>
              <div className="space-y-1">
                {navigation.content.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  const hasSubmenu = item.submenu && item.submenu.length > 0
                  const isExpanded = expandedMenus.includes(item.name)

                  if (hasSubmenu) {
                    return (
                      <div key={item.name}>
                        {/* Parent with submenu toggle */}
                        <button
                          onClick={() => toggleSubmenu(item.name)}
                          className={cn(
                            'flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors font-play',
                            isActive
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-700 hover:bg-gray-50'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-base">{item.icon}</span>
                            {item.name}
                          </div>
                          <svg
                            className={cn('w-4 h-4 transition-transform', isExpanded ? 'rotate-180' : '')}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {/* Submenu items */}
                        {isExpanded && (
                          <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
                            {item.submenu!.map((subItem) => {
                              const subBrandMatch = subItem.href.match(/\?brand=(.+)/)
                              const subBrand = subBrandMatch ? decodeURIComponent(subBrandMatch[1]) : ''
                              const isSubActive = subBrand
                                ? pathname === '/admin/products' && currentBrand.toLowerCase() === subBrand.toLowerCase()
                                : !subBrand && pathname === subItem.href && !currentBrand || pathname.startsWith(subItem.href + '/') && !subBrand && !currentBrand
                              return (
                                <Link
                                  key={subItem.name}
                                  href={subItem.href}
                                  className={cn(
                                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors font-play',
                                    isSubActive
                                      ? 'bg-blue-50 text-blue-700 font-medium'
                                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                  )}
                                >
                                  <span className="text-sm">{subItem.icon}</span>
                                  {subItem.name}
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors font-play',
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

            {/* Business & Store Section */}
            <div>
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 font-play">
                Business &amp; Store
              </p>
              <div className="space-y-1">
                {navigation.business.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  const hasSubmenu = item.submenu && item.submenu.length > 0
                  const isExpanded = expandedMenus.includes(item.name)

                  // Handle submenu items (like Social Media)
                  if (hasSubmenu) {
                    return (
                      <div key={item.name}>
                        <button
                          onClick={() => toggleSubmenu(item.name)}
                          className={cn(
                            'flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors font-play',
                            isActive
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-700 hover:bg-gray-50'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-base">{item.icon}</span>
                            {item.name}
                          </div>
                          <svg
                            className={cn('w-4 h-4 transition-transform', isExpanded ? 'rotate-180' : '')}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isExpanded && (
                          <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
                            {item.submenu!.map((subItem) => {
                              const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/')
                              return (
                                <Link
                                  key={subItem.name}
                                  href={subItem.href}
                                  className={cn(
                                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors font-play',
                                    isSubActive
                                      ? 'bg-blue-50 text-blue-700 font-medium'
                                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                  )}
                                >
                                  <span className="text-sm">{subItem.icon}</span>
                                  {subItem.name}
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  }

                  // Handle modal items (like Costing Calculator)
                  if ((item as any).isModal) {
                    return (
                      <button
                        key={item.name}
                        onClick={() => setShowCostingModal(true)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left font-play',
                          'text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        <span className="text-base">{item.icon}</span>
                        {item.name}
                      </button>
                    )
                  }

                  // Handle regular link items
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors font-play',
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

            {/* Order Network Section */}
            <div>
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 font-play">
                Order Network
              </p>
              <div className="space-y-1">
                {navigation.orderNetwork.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  const hasSubmenu = item.submenu && item.submenu.length > 0
                  const isExpanded = expandedMenus.includes(item.name)

                  if (hasSubmenu) {
                    return (
                      <div key={item.name}>
                        <button
                          onClick={() => toggleSubmenu(item.name)}
                          className={cn(
                            'flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors font-play',
                            isActive
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-700 hover:bg-gray-50'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-base">{item.icon}</span>
                            {item.name}
                          </div>
                          <svg
                            className={cn('w-4 h-4 transition-transform', isExpanded ? 'rotate-180' : '')}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isExpanded && (
                          <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
                            {item.submenu!.map((subItem) => {
                              const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/')
                              return (
                                <Link
                                  key={subItem.name}
                                  href={subItem.href}
                                  className={cn(
                                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors font-play',
                                    isSubActive
                                      ? 'bg-blue-50 text-blue-700 font-medium'
                                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                  )}
                                >
                                  <span className="text-sm">{subItem.icon}</span>
                                  {subItem.name}
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors font-play',
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

            {/* Auctions Section */}
            <div>
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 font-play">
                Auctions
              </p>
              <div className="space-y-1">
                {navigation.auctions.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  const hasSubmenu = item.submenu && item.submenu.length > 0
                  const isExpanded = expandedMenus.includes(item.name)

                  if (hasSubmenu) {
                    return (
                      <div key={item.name}>
                        <button
                          onClick={() => toggleSubmenu(item.name)}
                          className={cn(
                            'flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors font-play',
                            isActive
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-700 hover:bg-gray-50'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-base">{item.icon}</span>
                            {item.name}
                          </div>
                          <svg
                            className={cn('w-4 h-4 transition-transform', isExpanded ? 'rotate-180' : '')}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isExpanded && (
                          <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
                            {item.submenu!.map((subItem) => {
                              const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/')
                              return (
                                <Link
                                  key={subItem.name}
                                  href={subItem.href}
                                  className={cn(
                                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors font-play',
                                    isSubActive
                                      ? 'bg-blue-50 text-blue-700 font-medium'
                                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                  )}
                                >
                                  <span className="text-sm">{subItem.icon}</span>
                                  {subItem.name}
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors font-play',
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

            {/* Blog Section */}
            <div>
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 font-play">
                Blog
              </p>
              <div className="space-y-1">
                {navigation.blog.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors font-play',
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
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 font-play">
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
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors font-play',
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
              <Link
                href="/"
                target="_blank"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-play"
              >
                <span className="text-base">👁️</span>
                View Live Site
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-auto font-play">{children}</main>
      </div>
    </div>

    {/* Costing Modal */}
    {showCostingModal && (
      <CostingModal
        costingState={costingState}
        setCostingState={setCostingState}
        onMinimize={handleMinimizeCosting}
        onClose={handleCloseCosting}
      />
    )}
    </AuthGuard>
  )
}
