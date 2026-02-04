'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useCart } from '@/context/cart-context'
import { CartDrawer } from '@/components/cart/cart-drawer'
import type { SiteSettings } from '@/lib/site-settings/schema'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const { cart } = useCart()
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [editorEnabled, setEditorEnabled] = useState(false)

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
      }
    }
    fetchSettingsAndEditorAccess()
  }, [])

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

      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="text-2xl font-bold">
              <span className="text-black">R66</span>
              <span className="text-primary">SLOT</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/products"
              className="text-sm font-medium text-gray-900 hover:text-primary transition-colors"
            >
              Shop All
            </Link>
            <Link
              href="/brands"
              className="text-sm font-medium text-gray-900 hover:text-primary transition-colors"
            >
              Brands
            </Link>
            <Link
              href="/collections/new-arrivals"
              className="text-sm font-medium text-gray-900 hover:text-primary transition-colors"
            >
              New Arrivals
            </Link>
            <Link
              href="/pre-orders"
              className="text-sm font-medium text-gray-900 hover:text-primary transition-colors"
            >
              Pre-Orders
            </Link>
            <Link
              href="/blog"
              className="text-sm font-medium text-gray-900 hover:text-primary transition-colors"
            >
              Blog
            </Link>

            {editorEnabled && isAdmin && (
              <Link
                href="/wix-studio"
                className="text-sm font-medium text-gray-900 hover:text-primary transition-colors"
              >
                Editor
              </Link>
            )}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            {/* Search Icon */}
            <button
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Search"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>

            {/* Account Link */}
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
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </Link>

            {/* Cart */}
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
                stroke="currentColor"
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
                stroke="currentColor"
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

        {/* Mobile Menu */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4">
              <Link
                href="/products"
                className="text-sm font-medium text-gray-900 hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Shop All
              </Link>
              <Link
                href="/brands"
                className="text-sm font-medium text-gray-900 hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Brands
              </Link>
              <Link
                href="/collections/new-arrivals"
                className="text-sm font-medium text-gray-900 hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                New Arrivals
              </Link>
              <Link
                href="/pre-orders"
                className="text-sm font-medium text-gray-900 hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Pre-Orders
              </Link>
              <Link
                href="/blog"
                className="text-sm font-medium text-gray-900 hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Blog
              </Link>

              {editorEnabled && isAdmin && (
                <Link
                  href="/wix-studio"
                  className="text-sm font-medium text-gray-900 hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Editor
                </Link>
              )}

              <Link
                href="/account"
                className="text-sm font-medium text-gray-900 hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Account
              </Link>
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
