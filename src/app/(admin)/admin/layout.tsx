'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { useState, useEffect } from 'react'
import CostingModal, { INITIAL_COSTING_STATE, type CostingState } from '@/components/admin/costing-modal'
import { AdminAuthContext, type AdminAuthData } from '@/lib/admin-auth-context'
import { ALWAYS_ALLOWED } from '@/lib/admin-permissions'

type DropItem = { name: string; href?: string; isModal?: boolean; adminOnly?: boolean }
type NavGroup = { label: string; href?: string; items?: DropItem[]; badge?: number }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === '/admin/login'
  const [authData, setAuthData] = useState<AdminAuthData>({ role: null, permissions: [], username: null })
  const [isAuthenticated, setIsAuthenticated] = useState(isLoginPage)
  const [isLoading, setIsLoading] = useState(!isLoginPage)
  const { role, permissions } = authData

  const canAccess = (href: string) => {
    if (role !== 'staff') return true
    if (ALWAYS_ALLOWED.includes(href)) return true
    return permissions.includes(href) || permissions.some((p) => p !== '/admin' && href.startsWith(p + '/'))
  }

  useEffect(() => {
    if (isLoginPage) return
    const check = async () => {
      if (process.env.NODE_ENV === 'development') {
        setAuthData({ role: 'admin', permissions: [], username: 'Admin' })
        setIsAuthenticated(true)
        setIsLoading(false)
        return
      }
      try {
        const res = await fetch('/api/admin/auth/check')
        const data = await res.json()
        if (data.authenticated) {
          const r = data.role ?? 'admin'
          const p: string[] = data.permissions ?? []
          setAuthData({ role: r, permissions: p, username: data.username ?? 'Admin' })
          setIsAuthenticated(true)
          if (r === 'staff') {
            const ok = ALWAYS_ALLOWED.includes(pathname) ||
              p.includes(pathname) ||
              p.some((x) => x !== '/admin' && pathname.startsWith(x + '/'))
            if (!ok) router.push(p.find((x) => !ALWAYS_ALLOWED.includes(x)) ?? '/admin')
          }
        } else {
          router.push('/admin/login')
        }
      } catch {
        router.push('/admin/login')
      } finally {
        setIsLoading(false)
      }
    }
    check()
  }, [pathname, isLoginPage, router])

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showCostingModal, setShowCostingModal] = useState(false)
  const [costingState, setCostingState] = useState<CostingState>(INITIAL_COSTING_STATE)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [newSiteOrders, setNewSiteOrders] = useState(0)

  const checkSiteOrders = async () => {
    try {
      const res = await fetch('/api/checkout')
      if (!res.ok) return
      const data = await res.json()
      const orders: any[] = Array.isArray(data) ? data : (data.orders ?? [])
      const total = orders.filter((o: any) => o.status !== 'archived').length
      const lastSeen = parseInt(localStorage.getItem('siteOrdersLastSeen') || '0', 10)
      setNewSiteOrders(Math.max(0, total - lastSeen))
    } catch {}
  }

  useEffect(() => {
    checkSiteOrders()
    const interval = setInterval(checkSiteOrders, 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (pathname !== '/admin/site-orders') return
    fetch('/api/checkout')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return
        const orders: any[] = Array.isArray(data) ? data : (data.orders ?? [])
        const total = orders.filter((o: any) => o.status !== 'archived').length
        localStorage.setItem('siteOrdersLastSeen', String(total))
        setNewSiteOrders(0)
      })
      .catch(() => {})
  }, [pathname])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' })
      router.push('/admin/login')
      router.refresh()
    } catch {}
    finally { setIsLoggingOut(false) }
  }

  if (isLoginPage) return <AdminAuthContext.Provider value={authData}>{children}</AdminAuthContext.Provider>
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="text-lg font-play">Loading...</div></div>
  if (!isAuthenticated) return null

  const itemActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : (pathname === href || pathname.startsWith(href + '/'))

  const NAV: NavGroup[] = [
    {
      label: 'Site',
      items: [
        { name: 'Dashboard', href: '/admin' },
        { name: 'Edit Header', href: '/admin/header' },
        { name: 'Edit Site', href: '/admin/pages' },
        { name: 'Homepage', href: '/admin/homepage' },
      ],
    },
    {
      label: 'Inventory',
      items: [
        { name: 'Products', href: '/admin/products' },
        { name: 'Product Archive', href: '/admin/products/archive' },
        { name: 'Task List', href: '/admin/task-list' },
        { name: 'Inventory', href: '/admin/inventory' },
        { name: 'Categories', href: '/admin/categories' },
        { name: 'POS / Scanner', href: '/admin/pos' },
        { name: 'Reports', href: '/admin/reports' },
        { name: 'Stock Audit', href: '/admin/stock-audit' },
        { name: 'Checklists', href: '/admin/checklists' },
      ],
    },
    {
      label: 'Orders',
      badge: newSiteOrders,
      items: [
        { name: 'Site Orders', href: '/admin/site-orders' },
        { name: 'Orders', href: '/admin/orders' },
        { name: 'Pre-Orders', href: '/admin/preorder-list' },
        { name: 'Pre Order Dashboard', href: '/admin/preorder-dashboard' },
        { name: 'Back Orders', href: '/admin/backorders' },
        { name: 'Suppliers Orders', href: '/admin/suppliers' },
        { name: 'Work Sheet', href: '/admin/worksheet' },
        { name: 'Price Lists', href: '/admin/price-lists' },
      ],
    },
    {
      label: 'Contacts',
      items: [
        { name: 'Customers', href: '/admin/contacts' },
        { name: 'Customer Dashboard', href: '/admin/customer-dashboard' },
        { name: 'Suppliers', href: '/admin/supplier-contacts' },
      ],
    },
    {
      label: 'Business',
      items: [
        { name: 'Events', href: '/admin/events' },
        { name: 'Payments', href: '/admin/payments' },
        { name: 'Accounting', href: '/admin/accounting' },
        { name: 'Sage Accounting', href: '/admin/sage' },
        { name: 'Costing Calculator', isModal: true },
        { name: 'Flyer Generator', href: '/admin/social' },
        { name: 'Media Library', href: '/admin/media' },
      ],
    },
    {
      label: 'Shipping',
      items: [
        { name: 'Shipping Network', href: '/admin/shipping-network' },
        { name: 'Local Shipping', href: '/admin/shipping' },
        { name: 'Packing List', href: '/admin/shipments' },
      ],
    },
    { label: 'Blog', href: '/admin/blog' },
    {
      label: 'Settings',
      items: [
        { name: 'Site Settings', href: '/admin/settings' },
        { name: 'Site Rules', href: '/admin/settings/site-rules' },
        { name: 'User Accounts', href: '/admin/settings/users', adminOnly: true },
        { name: 'My Account', href: '/admin/account' },
      ],
    },
  ]

  return (
    <AdminAuthContext.Provider value={authData}>
      <div className="h-screen flex flex-col overflow-hidden bg-gray-100">

        {/* ── Sticky top nav ── */}
        <header className="flex-shrink-0 bg-secondary text-white z-50 shadow-lg">

          {/* Row 1: Branding + actions */}
          <div className="px-4 flex items-center h-10 border-b border-gray-700/60 justify-between">
            <Link href="/admin" className="font-bold font-play text-base tracking-wide">
              <span className="text-white">R66</span>
              <span className="text-primary">SLOT</span>
              <span className="text-xs ml-2 text-gray-400 font-normal">Admin</span>
            </Link>
            <div className="flex items-center gap-4 text-sm">
              {authData.username && (
                <span className="text-gray-400 font-play hidden md:block">{authData.username}</span>
              )}
              <Link href="/" target="_blank" className="text-gray-300 hover:text-primary font-play transition-colors">
                View Site →
              </Link>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-gray-300 hover:text-primary disabled:opacity-50 font-play transition-colors"
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>

          {/* Row 2: Horizontal nav */}
          <nav className="px-1 flex items-stretch h-10">
            {NAV.map((group) => {
              const isOpen = openMenu === group.label
              const groupActive = group.href
                ? itemActive(group.href)
                : (group.items ?? []).some((i) => i.href && itemActive(i.href))

              if (group.href) {
                return (
                  <Link
                    key={group.label}
                    href={group.href}
                    className={cn(
                      'flex items-center px-3 text-sm font-medium font-play border-b-2 transition-colors whitespace-nowrap flex-shrink-0',
                      groupActive
                        ? 'text-white border-primary'
                        : 'text-gray-300 border-transparent hover:text-white hover:border-gray-600'
                    )}
                  >
                    {group.label}
                  </Link>
                )
              }

              return (
                <div
                  key={group.label}
                  className="relative flex items-stretch flex-shrink-0"
                  onMouseEnter={() => setOpenMenu(group.label)}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  <button
                    className={cn(
                      'flex items-center gap-1.5 px-3 text-sm font-medium font-play border-b-2 transition-colors whitespace-nowrap h-full',
                      groupActive || isOpen
                        ? 'text-white border-primary'
                        : 'text-gray-300 border-transparent hover:text-white hover:border-gray-600'
                    )}
                  >
                    {group.label}
                    {(group.badge ?? 0) > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none">
                        {group.badge}
                      </span>
                    )}
                    <svg
                      className={cn('w-3 h-3 flex-shrink-0 transition-transform', isOpen ? 'rotate-180' : '')}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isOpen && (
                    <div className="absolute top-full left-0 min-w-[190px] bg-white border border-gray-200 shadow-xl z-50 py-1 rounded-b-lg" onClick={() => setOpenMenu(null)}>
                      {(group.items ?? [])
                        .filter((i) => {
                          if (i.isModal) return true
                          if (i.adminOnly) return role !== 'staff'
                          return i.href ? canAccess(i.href) : true
                        })
                        .map((item) => {
                          const isActive = item.href ? itemActive(item.href) : false
                          const isSiteOrders = item.name === 'Site Orders'

                          if (item.isModal) {
                            return (
                              <button
                                key={item.name}
                                onClick={() => { setShowCostingModal(true); setOpenMenu(null) }}
                                className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary font-play transition-colors"
                              >
                                {item.name}
                              </button>
                            )
                          }

                          return (
                            <Link
                              key={item.href}
                              href={item.href!}
                              className={cn(
                                'flex items-center justify-between px-4 py-2.5 text-sm font-play transition-colors',
                                isActive
                                  ? 'bg-primary/10 text-primary font-medium'
                                  : isSiteOrders && newSiteOrders > 0
                                  ? 'text-red-600 hover:bg-red-50 font-bold'
                                  : 'text-gray-700 hover:bg-gray-50 hover:text-primary'
                              )}
                            >
                              <span>{item.name}</span>
                              {isSiteOrders && newSiteOrders > 0 && (
                                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none">
                                  {newSiteOrders}
                                </span>
                              )}
                            </Link>
                          )
                        })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </header>

        {/* Main content — full width, scrollable */}
        <main className="flex-1 overflow-y-auto p-8 font-play">{children}</main>
      </div>

      {showCostingModal && (
        <CostingModal
          costingState={costingState}
          setCostingState={setCostingState}
          onMinimize={() => setShowCostingModal(false)}
          onClose={() => { setShowCostingModal(false); setCostingState(INITIAL_COSTING_STATE) }}
        />
      )}
    </AdminAuthContext.Provider>
  )
}
