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

  useEffect(() => {
    fetchCustomPages()
  }, [])

  const fetchCustomPages = async () => {
    try {
      const response = await fetch('/api/admin/pages')
      const data = await response.json()
      setCustomPages(data)
    } catch (error) {
      console.error('Error fetching pages:', error)
    } finally {
      setIsLoading(false)
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

  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  const handleToggleWebsitePage = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()

    const page = customPages.find((p) => p.id === id)
    if (!page || togglingIds.has(id)) return

    const newValue = !page.isWebsitePage

    // Optimistic update
    setCustomPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isWebsitePage: newValue } : p))
    )
    setTogglingIds((prev) => new Set(prev).add(id))

    try {
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isWebsitePage: newValue }),
      })
      if (!res.ok) {
        // Revert on failure
        setCustomPages((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isWebsitePage: !newValue } : p))
        )
      }
    } catch (error) {
      console.error('Error toggling website page:', error)
      // Revert on failure
      setCustomPages((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isWebsitePage: !newValue } : p))
      )
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  // Website pages = custom pages marked as website pages
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <span>✏️</span> Edit Site - Frontend Pages
        </h1>
        <p className="text-gray-600 mt-2">
          Edit the pages that your customers see on the website
        </p>
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
          {BRAND_PAGES.map((page) => (
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

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
                  page.isWebsitePage
                    ? 'border-green-300 bg-green-50'
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
                        {page.isWebsitePage && (
                          <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded font-medium">
                            Website Page
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
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleToggleWebsitePage(e, page.id)}
                        disabled={togglingIds.has(page.id)}
                        className={
                          page.isWebsitePage
                            ? 'bg-green-600 text-white hover:bg-green-700 border-green-600'
                            : ''
                        }
                      >
                        {togglingIds.has(page.id) ? '...' : 'Website Page'}
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/pages/editor/${page.id}`}>Edit</Link>
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
                <li>• Click &ldquo;Website Page&rdquo; to link a custom page to the Website Pages section</li>
                <li>• Use the search bar to quickly find pages by URL or name</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
