'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useCart } from '@/context/cart-context'
import { CartDrawer } from '@/components/cart/cart-drawer'
import type { SiteSettings } from '@/lib/site-settings/schema'

/**
 * DynamicHeader - A fully configurable header that pulls settings from the admin editor.
 *
 * All navigation items, colors, logo text, and features are editable through
 * the site settings API. Falls back to sensible defaults if no settings are saved.
 */
export function DynamicHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const { cart } = useCart()
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [editorEnabled, setEditorEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchSettingsAndEditorAccess = async () => {
      try {
        const [settingsRes, accessRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/editor/access'),
        ])
        const settingsData = await settingsRes.json()
        const accessData = await accessRes.json()
        setSettings(settingsData)
        setIsAdmin(!!accessData.authenticated)
        setEditorEnabled(!!accessData.enabled)
      } catch (error) {
        console.error('Error fetching settings or editor access:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSettingsAndEditorAccess()
  }, [])

  // Extract header config with defaults
  const headerConfig = settings?.header || {
    logoText: 'R66SLOT',
    logoStyle: 'split' as const,
    backgroundColor: '#ffffff',
    textColor: '#111827',
    navItems: [
      { label: 'Shop All', href: '/products' },
      { label: 'Brands', href: '/brands' },
      { label: 'New Arrivals', href: '/collections/new-arrivals' },
      { label: 'Pre-Orders', href: '/pre-orders' },
      { label: 'Blog', href: '/blog' },
    ],
    showSearch: true,
    showAccount: true,
    showCart: true,
    sticky: true,
  }

  // Render logo with optional split styling
  const renderLogo = () => {
    const { logoText, logoStyle } = headerConfig
    if (logoStyle === 'split' && logoText.length > 3) {
      return (
        <div className="text-2xl font-bold">
          <span style={{ color: headerConfig.textColor }}>{logoText.substring(0, 3)}</span>
          <span className="text-primary">{logoText.substring(3)}</span>
        </div>
      )
    }
    return (
      <div className="text-2xl font-bold" style={{ color: headerConfig.textColor }}>
        {logoText}
      </div>
    )
  }

  // Don't render anything during initial load to prevent flash
  if (isLoading) {
    return (
      <header
        className={`${headerConfig.sticky ? 'sticky top-0' : ''} z-50 w-full border-b border-gray-200`}
        style={{ backgroundColor: headerConfig.backgroundColor }}
      >
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="text-2xl font-bold animate-pulse bg-gray-200 rounded w-32 h-8" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <>
      {/* Announcement Banner */}
      {settings?.announcement?.enabled && (
        <div
          className={`py-2 text-center text-sm font-medium ${
            settings.announcement.type === 'info'
              ? 'bg-blue-600 text-white'
              : settings.announcement.type === 'warning'
              ? 'bg-yellow-500 text-black'
              : 'bg-green-600 text-white'
          }`}
        >
          {settings.announcement.message}
        </div>
      )}

      <header
        className={`${headerConfig.sticky ? 'sticky top-0' : ''} z-50 w-full border-b border-gray-200`}
        style={{ backgroundColor: headerConfig.backgroundColor }}
      >
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              {renderLogo()}
            </Link>

            {/* Desktop Navigation - Dynamic from settings */}
            <nav className="hidden md:flex items-center space-x-8">
              {headerConfig.navItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  target={item.isExternal ? '_blank' : undefined}
                  rel={item.isExternal ? 'noopener noreferrer' : undefined}
                  className="text-sm font-medium hover:text-primary transition-colors"
                  style={{ color: headerConfig.textColor }}
                >
                  {item.label}
                </Link>
              ))}

              {/* Admin Editor Link (only for authenticated admins) */}
              {editorEnabled && isAdmin && (
                <Link
                  href="/wix-studio"
                  className="text-sm font-medium hover:text-primary transition-colors"
                  style={{ color: headerConfig.textColor }}
                >
                  Editor
                </Link>
              )}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center space-x-4">
              {/* Search Icon */}
              {headerConfig.showSearch && (
                <button
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                  aria-label="Search"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke={headerConfig.textColor}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>
              )}

              {/* Account Link */}
              {headerConfig.showAccount && (
                <Link
                  href="/account"
                  className="hidden md:block p-2 hover:bg-gray-100 rounded-md transition-colors"
                  aria-label="Account"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke={headerConfig.textColor}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </Link>
              )}

              {/* Cart */}
              {headerConfig.showCart && (
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative p-2 hover:bg-gray-100 rounded-md transition-colors"
                  aria-label="Cart"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke={headerConfig.textColor}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                  {cart && cart.totalQuantity > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-black text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {cart.totalQuantity}
                    </span>
                  )}
                </button>
              )}

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2 hover:bg-gray-100 rounded-md transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke={headerConfig.textColor}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={isMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu - Dynamic from settings */}
          {isMenuOpen && (
            <nav className="md:hidden py-4 border-t border-gray-200">
              <div className="flex flex-col space-y-4">
                {headerConfig.navItems.map((item, index) => (
                  <Link
                    key={index}
                    href={item.href}
                    target={item.isExternal ? '_blank' : undefined}
                    rel={item.isExternal ? 'noopener noreferrer' : undefined}
                    className="text-sm font-medium hover:text-primary transition-colors"
                    style={{ color: headerConfig.textColor }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}

                {editorEnabled && isAdmin && (
                  <Link
                    href="/wix-studio"
                    className="text-sm font-medium hover:text-primary transition-colors"
                    style={{ color: headerConfig.textColor }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Editor
                  </Link>
                )}

                {headerConfig.showAccount && (
                  <Link
                    href="/account"
                    className="text-sm font-medium hover:text-primary transition-colors"
                    style={{ color: headerConfig.textColor }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Account
                  </Link>
                )}
              </div>
            </nav>
          )}
        </div>

        {/* Cart Drawer */}
        <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      </header>
    </>
  )
}
