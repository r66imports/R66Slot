'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useLocalCart } from '@/context/local-cart-context'
import { CartDrawer } from '@/components/cart/cart-drawer'
import type { SiteSettings } from '@/lib/site-settings/schema'

export function DynamicHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [allProducts, setAllProducts] = useState<any[]>([])
  const { totalItems } = useLocalCart()
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [editorEnabled, setEditorEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

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

  // Load products when search opens (once)
  useEffect(() => {
    if (isSearchOpen && allProducts.length === 0) {
      fetch('/api/admin/products')
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setAllProducts(data.filter((p: any) => p.status === 'active'))
        })
        .catch(() => {})
    }
    if (isSearchOpen) {
      searchInputRef.current?.focus()
    }
  }, [isSearchOpen])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false)
        setSearchQuery('')
      }
    }
    if (isSearchOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isSearchOpen])

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q || q.length < 1) return []
    return allProducts
      .filter((p) =>
        p.sku?.toLowerCase().includes(q) ||
        p.title?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [searchQuery, allProducts])

  function handleSelectProduct(id: string) {
    router.push(`/product/${id}`)
    setIsSearchOpen(false)
    setSearchQuery('')
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchResults.length === 1) {
      handleSelectProduct(searchResults[0].id)
    } else if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`)
      setIsSearchOpen(false)
      setSearchQuery('')
    }
  }

  // Extract header config with defaults
  const headerConfig = settings?.header || {
    logoText: 'R66SLOT',
    logoStyle: 'split' as const,
    backgroundColor: '#ffffff',
    textColor: '#111827',
    navItems: [
      { label: 'New Arrivals', href: '/collections/new-arrivals' },
      { label: 'Book for Next Shipment', href: '/book' },
    ],
    showSearch: true,
    showAccount: true,
    showCart: true,
    sticky: true,
  }

  // Render logo — image takes priority over text
  const renderLogo = () => {
    const { logoText, logoStyle, logoImage, logoSize } = headerConfig
    if (logoImage) {
      const size = logoSize || 80
      return (
        <img
          src={logoImage}
          alt={logoText || 'Logo'}
          style={{ width: size, height: size, objectFit: 'contain' }}
        />
      )
    }
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
        className="sticky top-0 z-50 w-full border-b border-gray-200"
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
        className="sticky top-0 z-50 w-full border-b border-gray-200"
        style={{ backgroundColor: headerConfig.backgroundColor }}
      >
        {/* Search overlay bar + live dropdown */}
        {isSearchOpen && (
          <div ref={dropdownRef} className="border-b border-gray-200 bg-white px-4 py-3 relative z-50">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 container mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by SKU, name or brand…"
                className="flex-1 text-sm outline-none bg-transparent"
                autoComplete="off"
              />
              <button type="button" onClick={() => { setIsSearchOpen(false); setSearchQuery('') }} className="text-gray-400 hover:text-gray-600 p-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {searchQuery.trim() && (
                <button type="submit" className="text-sm font-semibold text-red-600 hover:text-red-700 px-3 py-1 border border-red-600 rounded whitespace-nowrap">
                  Search
                </button>
              )}
            </form>

            {/* Live results dropdown */}
            {searchQuery.trim().length > 0 && (
              <div className="container mx-auto mt-2">
                {searchResults.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2 pl-8">No products found for &ldquo;{searchQuery}&rdquo;</p>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {searchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProduct(p.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 text-left"
                      >
                        {/* Thumbnail */}
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                          {p.imageUrl
                            ? <img src={p.imageUrl} alt={p.title} className="w-full h-full object-contain" />
                            : <span className="w-full h-full flex items-center justify-center text-lg">🏎️</span>
                          }
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {p.sku && <span className="font-mono text-xs font-bold text-indigo-600">{p.sku}</span>}
                            {p.brand && <span className="text-xs text-gray-400">{p.brand}</span>}
                            {p.isPreOrder && (
                              <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
                                NEXT SHIPMENT
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-800 truncate">{p.title}</p>
                        </div>
                        {/* Price */}
                        {p.price > 0 && (
                          <span className="text-sm font-bold text-gray-900 flex-shrink-0">R{Number(p.price).toFixed(2)}</span>
                        )}
                      </button>
                    ))}
                    {searchResults.length === 8 && (
                      <button
                        type="submit"
                        className="w-full py-2 text-xs text-center text-red-600 hover:bg-red-50 font-medium transition-colors"
                      >
                        See all results for &ldquo;{searchQuery}&rdquo; →
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
                  href="/r66-editor"
                  className="text-sm font-medium hover:text-primary transition-colors"
                  style={{ color: headerConfig.textColor }}
                >
                  Editor
                </Link>
              )}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center space-x-1">
              {/* Search Icon */}
              {headerConfig.showSearch && (
                <button
                  onClick={() => setIsSearchOpen((prev) => !prev)}
                  className={`p-2 rounded-md transition-colors ${isSearchOpen ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
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
                  href="/account/login"
                  className="hidden md:flex p-2 hover:bg-gray-100 rounded-md transition-colors"
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
                  aria-label={`Cart${totalItems > 0 ? ` (${totalItems} items)` : ''}`}
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
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {totalItems > 9 ? '9+' : totalItems}
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
                    href="/r66-editor"
                    className="text-sm font-medium hover:text-primary transition-colors"
                    style={{ color: headerConfig.textColor }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Editor
                  </Link>
                )}

                {headerConfig.showAccount && (
                  <Link
                    href="/account/login"
                    className="text-sm font-medium hover:text-primary transition-colors"
                    style={{ color: headerConfig.textColor }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Account
                  </Link>
                )}

                {headerConfig.showCart && (
                  <button
                    className="text-sm font-medium hover:text-primary transition-colors text-left flex items-center gap-2"
                    style={{ color: headerConfig.textColor }}
                    onClick={() => { setIsMenuOpen(false); setIsCartOpen(true) }}
                  >
                    Cart
                    {totalItems > 0 && (
                      <span className="bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {totalItems}
                      </span>
                    )}
                  </button>
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
