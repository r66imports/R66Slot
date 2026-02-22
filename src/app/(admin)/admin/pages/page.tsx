'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Page } from '@/lib/pages/schema'

// Frontend pages that customers see
const FRONTEND_PAGES = [
  {
    id: 'homepage',
    title: 'Homepage',
    slug: '',
    description: 'Main landing page customers see when they visit your site',
    icon: '🏠',
    editable: true,
  },
  {
    id: 'products',
    title: 'Products Page',
    slug: 'products',
    description: 'Product catalog and listings',
    icon: '🛍️',
    editable: true,
  },
  {
    id: 'about',
    title: 'About Page',
    slug: 'about',
    description: 'Tell customers about your business',
    icon: 'ℹ️',
    editable: true,
  },
  {
    id: 'contact',
    title: 'Contact Page',
    slug: 'contact',
    description: 'Contact information and form',
    icon: '📧',
    editable: true,
  },
  {
    id: 'book-now',
    title: 'Book Now Page',
    slug: 'book',
    description: 'Pre-order booking page for customers',
    icon: '📋',
    editable: true,
  },
]

// Brand pages editable via the website editor
const BRAND_PAGES = [
  {
    id: 'brand-nsr',
    title: 'NSR',
    slug: 'brands/nsr',
    description: 'NSR brand page - high-performance racing models',
    icon: '🏎️',
    editable: true,
  },
  {
    id: 'brand-revo',
    title: 'Revo',
    slug: 'brands/revo',
    description: 'Revo brand page',
    icon: '🏎️',
    editable: true,
  },
  {
    id: 'brand-pioneer',
    title: 'Pioneer',
    slug: 'brands/pioneer',
    description: 'Pioneer brand page',
    icon: '🏎️',
    editable: true,
  },
  {
    id: 'brand-sideways',
    title: 'Sideways',
    slug: 'brands/sideways',
    description: 'Sideways brand page',
    icon: '🏎️',
    editable: true,
  },
]

// Cars pages grouped by brand
const CARS_PAGES = [
  { id: 'cars-nsr', brand: 'NSR', slug: 'cars/nsr', description: 'NSR slot cars catalog', icon: '🏎️', editable: true },
  { id: 'cars-revo', brand: 'Revo', slug: 'cars/revo', description: 'Revo slot cars catalog', icon: '🏎️', editable: true },
  { id: 'cars-pioneer', brand: 'Pioneer', slug: 'cars/pioneer', description: 'Pioneer slot cars catalog', icon: '🏎️', editable: true },
  { id: 'cars-sideways', brand: 'Sideways', slug: 'cars/sideways', description: 'Sideways slot cars catalog', icon: '🏎️', editable: true },
  { id: 'cars-slot-it', brand: 'Slot.it', slug: 'cars/slot-it', description: 'Slot.it slot cars catalog', icon: '🏎️', editable: true },
  { id: 'cars-policar', brand: 'Policar', slug: 'cars/policar', description: 'Policar slot cars catalog', icon: '🏎️', editable: true },
  { id: 'cars-thunderslot', brand: 'Thunderslot', slug: 'cars/thunderslot', description: 'Thunderslot slot cars catalog', icon: '🏎️', editable: true },
  { id: 'cars-scaleauto', brand: 'Scaleauto', slug: 'cars/scaleauto', description: 'Scaleauto slot cars catalog', icon: '🏎️', editable: true },
]

const CAR_BRANDS = [...new Set(CARS_PAGES.map(p => p.brand))]

function InlineEditableTitle({
  value,
  onSave,
  className,
}: {
  value: string
  onSave: (newTitle: string) => void
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) {
      onSave(trimmed)
    } else {
      setDraft(value)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setDraft(value)
            setEditing(false)
          }
        }}
        className={`${className} border border-blue-400 rounded px-2 py-0.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white`}
      />
    )
  }

  return (
    <span
      onDoubleClick={() => setEditing(true)}
      className={`${className} cursor-pointer hover:bg-gray-100 rounded px-1 -mx-1`}
      title="Double-click to rename"
    >
      {value}
    </span>
  )
}

export default function PagesManagementPage() {
  const [customPages, setCustomPages] = useState<Page[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [selectedCarBrand, setSelectedCarBrand] = useState<string>('all')
  const [deletedBrandIds, setDeletedBrandIds] = useState<Set<string>>(new Set())
  const [deletedCarsIds, setDeletedCarsIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchCustomPages()
  }, [])

  const fetchCustomPages = async () => {
    try {
      const response = await fetch('/api/admin/pages', { cache: 'no-store' })
      if (!response.ok) {
        console.error('Error fetching pages:', response.status, response.statusText)
        return
      }
      const data = await response.json()
      setCustomPages(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching pages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveAll = async () => {
    setIsSaving(true)
    setSaveMessage(null)
    try {
      // Save each custom page to persist any inline edits
      const results = await Promise.all(
        customPages.map((page) =>
          fetch(`/api/admin/pages/${page.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(page),
          })
        )
      )
      const allOk = results.every((r) => r.ok)
      if (allOk) {
        setSaveMessage('All pages saved successfully!')
      } else {
        setSaveMessage('Some pages failed to save.')
      }
    } catch (error) {
      console.error('Error saving pages:', error)
      setSaveMessage('Failed to save pages.')
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  const handleRename = async (id: string, newTitle: string) => {
    try {
      // Generate a new slug from the title
      const newSlug = newTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, slug: newSlug }),
      })
      if (res.ok) {
        const updated = await res.json()
        setCustomPages((prev) =>
          prev.map((p) => (p.id === id ? { ...p, title: updated.title, slug: updated.slug } : p))
        )
      }
    } catch (error) {
      console.error('Error renaming page:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return

    try {
      const response = await fetch(`/api/admin/pages/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCustomPages(customPages.filter((p) => p.id !== id))
      }
    } catch (error) {
      console.error('Error deleting page:', error)
      alert('Failed to delete page')
    }
  }

  const handleCreatePage = async () => {
    try {
      const response = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Page',
          slug: `page-${Date.now()}`,
          published: false,
          components: [],
        }),
      })

      if (response.ok) {
        const newPage = await response.json()
        window.location.href = `/admin/pages/editor/${newPage.id}`
      }
    } catch (error) {
      console.error('Error creating page:', error)
      alert('Failed to create page')
    }
  }

  const handleDuplicatePage = async (page: Page) => {
    try {
      const response = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${page.title} (Copy)`,
          slug: `${page.slug}-copy-${Date.now()}`,
          published: false,
          components: page.components,
          pageSettings: page.pageSettings,
          seo: {
            metaTitle: `${page.seo?.metaTitle || page.title} (Copy)`,
            metaDescription: page.seo?.metaDescription || '',
            metaKeywords: page.seo?.metaKeywords || '',
          },
        }),
      })

      if (response.ok) {
        const newPage = await response.json()
        setCustomPages((prev) => [...prev, newPage])
      } else {
        alert('Failed to duplicate page')
      }
    } catch (error) {
      console.error('Error duplicating page:', error)
      alert('Failed to duplicate page')
    }
  }

  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  const handleTogglePageGroup = async (e: React.MouseEvent, id: string, group: 'isBrandPage' | 'isCarsPage' | 'isRevoPage') => {
    e.preventDefault()
    e.stopPropagation()

    const page = customPages.find((p) => p.id === id)
    if (!page || togglingIds.has(id)) return

    const newValue = !page[group]

    // Optimistic update
    setCustomPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [group]: newValue } : p))
    )
    setTogglingIds((prev) => new Set(prev).add(id))

    try {
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [group]: newValue }),
      })
      if (!res.ok) {
        setCustomPages((prev) =>
          prev.map((p) => (p.id === id ? { ...p, [group]: !newValue } : p))
        )
      }
    } catch (error) {
      console.error('Error toggling page group:', error)
      setCustomPages((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [group]: !newValue } : p))
      )
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleDeleteBrandPage = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}" from Brand Pages?`)) return
    setDeletedBrandIds((prev) => new Set(prev).add(id))
    try {
      await fetch(`/api/admin/pages/frontend-${id}`, { method: 'DELETE' })
    } catch {
      // Ignore - the page may not have been persisted yet
    }
  }

  const handleDeleteCarsPage = async (id: string, brand: string) => {
    if (!confirm(`Delete "${brand} Cars" from Cars Pages?`)) return
    setDeletedCarsIds((prev) => new Set(prev).add(id))
    try {
      await fetch(`/api/admin/pages/frontend-${id}`, { method: 'DELETE' })
    } catch {
      // Ignore
    }
  }

  // Custom pages marked for Brand, Cars, or Revo groups
  const brandCustomPages = customPages.filter((p) => p.isBrandPage)
  const carsCustomPages = customPages.filter((p) => p.isCarsPage)
  const revoCustomPages = customPages.filter((p) => p.isRevoPage)

  // Website pages = custom pages marked as website pages (legacy)
  const websitePages = customPages.filter((p) => p.isWebsitePage)

  // Search across all pages (frontend + brand + custom) by URL/slug
  const allSearchablePages = [
    ...FRONTEND_PAGES.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      type: 'frontend' as const,
      icon: p.icon,
      description: p.description,
    })),
    ...BRAND_PAGES.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      type: 'frontend' as const,
      icon: p.icon,
      description: p.description,
    })),
    ...CARS_PAGES.map((p) => ({
      id: p.id,
      title: `${p.brand} Cars`,
      slug: p.slug,
      type: 'frontend' as const,
      icon: p.icon,
      description: p.description,
    })),
    ...customPages.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      type: 'custom' as const,
      icon: '📄',
      description: `/${p.slug}`,
    })),
  ]

  // Strip domain from search query to match slugs from full URLs
  const normalizeSearch = (query: string): string => {
    let q = query.trim().toLowerCase()
    // Strip common domain patterns: https://r66slot.co.za/about -> about
    try {
      const url = new URL(q)
      q = url.pathname.replace(/^\//, '').replace(/\/$/, '')
    } catch {
      // Not a full URL, strip leading slash
      q = q.replace(/^\/+/, '').replace(/\/$/, '')
    }
    return q
  }

  const normalizedQuery = normalizeSearch(searchQuery)

  const searchResults = searchQuery.trim()
    ? allSearchablePages.filter(
        (p) =>
          p.slug.toLowerCase().includes(normalizedQuery) ||
          p.title.toLowerCase().includes(normalizedQuery) ||
          // Also match raw query against title
          p.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : []

  if (isLoading) {
    return <div>Loading pages...</div>
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <span>✏️</span> Edit Site - Frontend Pages
          </h1>
          <p className="text-gray-600 mt-2">
            Edit the pages that your customers see on the website
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className={`text-sm font-medium ${saveMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
              {saveMessage}
            </span>
          )}
          <Button
            size="lg"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isSaving ? 'Saving...' : 'Save All Pages'}
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search pages by URL or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Search Results */}
        {searchQuery.trim() && (
          <div className="mt-2 border border-gray-200 rounded-lg bg-white shadow-lg">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 rounded-t-lg">
              <p className="text-xs text-gray-500 font-play">
                {searchResults.length} page{searchResults.length !== 1 ? 's' : ''} found
                {normalizedQuery !== searchQuery.trim().toLowerCase() && (
                  <span className="ml-1 text-blue-500">
                    (searching: /{normalizedQuery || 'home'})
                  </span>
                )}
              </p>
            </div>
            {searchResults.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-3xl mb-2">🔍</div>
                <p className="text-sm text-gray-500">
                  No pages found matching &ldquo;{searchQuery}&rdquo;
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Try searching by page name or URL path
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {searchResults.map((page) => (
                  <div
                    key={`${page.type}-${page.id}`}
                    className="flex items-center justify-between p-4 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{page.icon}</span>
                      <div>
                        <p className="text-sm font-semibold">{page.title}</p>
                        <p className="text-xs text-gray-500">
                          https://r66slot.co.za/{page.slug || ''}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-xs rounded font-medium ${
                          page.type === 'frontend'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {page.type === 'frontend' ? 'Main Page' : 'Custom Page'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={page.slug ? `/${page.slug}` : '/'} target="_blank">
                          View Live
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        asChild
                      >
                        <Link
                          href={
                            page.type === 'frontend'
                              ? `/admin/pages/editor/frontend-${page.id}`
                              : `/admin/pages/editor/${page.id}`
                          }
                        >
                          Edit Page
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Frontend Pages - Main Site Pages */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Main Website Pages</h2>
            <p className="text-gray-600 text-sm mt-1">
              Edit the core pages of your storefront
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FRONTEND_PAGES.map((page) => (
            <Card key={page.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{page.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">{page.title}</h3>
                    <p className="text-gray-600 text-sm mb-3">{page.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>/{page.slug || 'home'}</span>
                      <span>•</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
                        Live
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary-dark text-white"
                      asChild
                    >
                      <Link href={`/admin/pages/editor/frontend-${page.id}`}>
                        Edit Page
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={page.slug ? `/${page.slug}` : '/'} target="_blank">
                        View Live
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Brand Pages */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Brand Pages</h2>
            <p className="text-gray-600 text-sm mt-1">
              Edit brand-specific pages on your website
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BRAND_PAGES.filter((p) => !deletedBrandIds.has(p.id)).map((page) => (
            <Card key={page.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{page.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">{page.title}</h3>
                    <p className="text-gray-600 text-sm mb-3">{page.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>/{page.slug}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary-dark text-white"
                      asChild
                    >
                      <Link href={`/admin/pages/editor/frontend-${page.id}`}>
                        Edit Page
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/${page.slug}`} target="_blank">
                        View Live
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteBrandPage(page.id, page.title)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {brandCustomPages.map((page) => (
            <Card key={page.id} className="hover:shadow-lg transition-shadow border-purple-200 bg-purple-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">🏎️</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">{page.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <span>/{page.slug}</span>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">Custom</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" className="bg-primary hover:bg-primary-dark text-white" asChild>
                      <Link href={`/admin/pages/editor/${page.id}`}>Edit Page</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/${page.slug}`} target="_blank">View Live</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(page.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Cars Pages */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Cars Pages</h2>
            <p className="text-gray-600 text-sm mt-1">
              Edit car catalog pages by brand
            </p>
          </div>
          <select
            value={selectedCarBrand}
            onChange={(e) => setSelectedCarBrand(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Brands</option>
            {CAR_BRANDS.map((brand) => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CARS_PAGES
            .filter((p) => !deletedCarsIds.has(p.id))
            .filter((p) => selectedCarBrand === 'all' || p.brand === selectedCarBrand)
            .map((page) => (
            <Card key={page.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{page.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">{page.brand} Cars</h3>
                    <p className="text-gray-600 text-sm mb-3">{page.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>/{page.slug}</span>
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                        {page.brand}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary-dark text-white"
                      asChild
                    >
                      <Link href={`/admin/pages/editor/frontend-${page.id}`}>
                        Edit Page
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/${page.slug}`} target="_blank">
                        View Live
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCarsPage(page.id, page.brand)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {carsCustomPages
            .filter((p) => selectedCarBrand === 'all' || p.title.toLowerCase().includes(selectedCarBrand.toLowerCase()))
            .map((page) => (
            <Card key={page.id} className="hover:shadow-lg transition-shadow border-orange-200 bg-orange-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">🏎️</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">{page.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <span>/{page.slug}</span>
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">Custom</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" className="bg-primary hover:bg-primary-dark text-white" asChild>
                      <Link href={`/admin/pages/editor/${page.id}`}>Edit Page</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/${page.slug}`} target="_blank">View Live</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(page.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Revo Pages */}
      {revoCustomPages.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Revo Pages</h2>
              <p className="text-gray-600 text-sm mt-1">
                Custom pages assigned to the Revo section
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {revoCustomPages.map((page) => (
              <Card key={page.id} className="hover:shadow-lg transition-shadow border-teal-200 bg-teal-50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">🏁</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-1">{page.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <span>/{page.slug}</span>
                        <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded">Revo</span>
                        {page.published ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">Published</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded">Draft</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{page.components.length} components</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" className="bg-primary hover:bg-primary-dark text-white" asChild>
                        <Link href={`/admin/pages/editor/${page.id}`}>Edit Page</Link>
                      </Button>
                      {page.published && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/${page.slug}`} target="_blank">View Live</Link>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(page.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Website Pages Section */}
      {websitePages.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Website Pages</h2>
              <p className="text-gray-600 text-sm mt-1">
                Linked pages from the Main Website Pages
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {websitePages.map((page) => (
              <Card
                key={page.id}
                className="hover:shadow-lg transition-shadow border-green-200 bg-green-50"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">🌐</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-1">{page.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <span>/{page.slug}</span>
                        <span>•</span>
                        {page.published ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
                            Published
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                            Draft
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {page.components.length} components
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary-dark text-white"
                        asChild
                      >
                        <Link href={`/admin/pages/editor/${page.id}`}>
                          Edit Page
                        </Link>
                      </Button>
                      {page.published && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/${page.slug}`} target="_blank">
                            View Live
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Custom Pages - User Created */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Custom Pages</h2>
            <p className="text-gray-600 text-sm mt-1">
              Additional pages created with the visual editor.{' '}
              <span className="text-blue-600">Double-click a page name to rename it.</span>
            </p>
          </div>
          <Button
            size="lg"
            onClick={handleCreatePage}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            + Create Custom Page
          </Button>
        </div>

        {customPages.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold mb-2">No custom pages yet</h3>
              <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                Create additional pages like landing pages, promotional pages, or special content pages.
              </p>
              <Button onClick={handleCreatePage} className="bg-blue-600 hover:bg-blue-700">
                Create Your First Custom Page
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {customPages.map((page) => (
              <Card
                key={page.id}
                className={
                  page.isBrandPage
                    ? 'border-purple-300 bg-purple-50'
                    : page.isCarsPage
                    ? 'border-orange-300 bg-orange-50'
                    : page.isRevoPage
                    ? 'border-teal-300 bg-teal-50'
                    : ''
                }
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <InlineEditableTitle
                          value={page.title}
                          onSave={(newTitle) => handleRename(page.id, newTitle)}
                          className="text-xl font-semibold"
                        />
                        {!page.published && (
                          <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">
                            Draft
                          </span>
                        )}
                        {page.published && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                            Published
                          </span>
                        )}
                        {page.isBrandPage && (
                          <span className="px-2 py-1 bg-purple-200 text-purple-800 text-xs rounded font-medium">
                            Brand Page
                          </span>
                        )}
                        {page.isCarsPage && (
                          <span className="px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded font-medium">
                            Cars Page
                          </span>
                        )}
                        {page.isRevoPage && (
                          <span className="px-2 py-1 bg-teal-200 text-teal-800 text-xs rounded font-medium">
                            Revo Page
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-3">/{page.slug}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{page.components.length} components</span>
                        <span>•</span>
                        <span>
                          Updated {new Date(page.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4 flex-wrap justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleTogglePageGroup(e, page.id, 'isBrandPage')}
                        disabled={togglingIds.has(page.id)}
                        className={
                          page.isBrandPage
                            ? 'bg-purple-600 text-white hover:bg-purple-700 border-purple-600'
                            : ''
                        }
                      >
                        {togglingIds.has(page.id) ? '...' : 'Brand Pages'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleTogglePageGroup(e, page.id, 'isCarsPage')}
                        disabled={togglingIds.has(page.id)}
                        className={
                          page.isCarsPage
                            ? 'bg-orange-600 text-white hover:bg-orange-700 border-orange-600'
                            : ''
                        }
                      >
                        {togglingIds.has(page.id) ? '...' : 'Cars Pages'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleTogglePageGroup(e, page.id, 'isRevoPage')}
                        disabled={togglingIds.has(page.id)}
                        className={
                          page.isRevoPage
                            ? 'bg-teal-600 text-white hover:bg-teal-700 border-teal-600'
                            : ''
                        }
                      >
                        {togglingIds.has(page.id) ? '...' : 'Revo Pages'}
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/pages/editor/${page.id}`}>Edit</Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicatePage(page)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Duplicate
                      </Button>
                      {page.published && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/${page.slug}`} target="_blank">
                            View
                          </Link>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(page.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Help Section */}
      <Card className="mt-8 bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">💡</div>
            <div>
              <h3 className="font-semibold mb-2">How to Edit Your Website</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• Click &ldquo;Edit Page&rdquo; on any main website page to customize its content</li>
                <li>• Use drag & drop to rearrange sections and components</li>
                <li>• Double-click any custom page name to rename it</li>
                <li>• Create custom pages for landing pages, promotions, or special content</li>
                <li>• Click &ldquo;Brand Pages&rdquo;, &ldquo;Cars Pages&rdquo;, or &ldquo;Revo Pages&rdquo; to add a custom page to those sections</li>
                <li>• Use the search bar to quickly find pages by URL or name</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
