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

type PageGroup = 'isWebsitePage' | 'isRevoPage' | 'isPioneerPage' | 'isSidewaysPage' | 'isBrmPage'

const BRAND_SECTIONS: { key: PageGroup; label: string; color: string; icon: string }[] = [
  { key: 'isWebsitePage',  label: 'NSR Pages',      color: 'green',  icon: '🏎️' },
  { key: 'isRevoPage',     label: 'Revo Pages',     color: 'teal',   icon: '🏁' },
  { key: 'isPioneerPage',  label: 'Pioneer Pages',  color: 'blue',   icon: '🏎️' },
  { key: 'isSidewaysPage', label: 'Sideways Pages', color: 'violet', icon: '🏎️' },
  { key: 'isBrmPage',      label: 'BRM Pages',      color: 'red',    icon: '🏎️' },
]

const COLOR_MAP: Record<string, { border: string; bg: string; badge: string; btn: string }> = {
  green:  { border: 'border-green-200',  bg: 'bg-green-50',  badge: 'bg-green-100 text-green-700',   btn: 'bg-green-600 text-white hover:bg-green-700 border-green-600'  },
  teal:   { border: 'border-teal-200',   bg: 'bg-teal-50',   badge: 'bg-teal-100 text-teal-700',     btn: 'bg-teal-600 text-white hover:bg-teal-700 border-teal-600'    },
  blue:   { border: 'border-blue-200',   bg: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-700',     btn: 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600'    },
  violet: { border: 'border-violet-200', bg: 'bg-violet-50', badge: 'bg-violet-100 text-violet-700', btn: 'bg-violet-600 text-white hover:bg-violet-700 border-violet-600' },
  red:    { border: 'border-red-200',    bg: 'bg-red-50',    badge: 'bg-red-100 text-red-700',       btn: 'bg-red-600 text-white hover:bg-red-700 border-red-600'       },
}

function getPageColor(page: Page): string | null {
  for (const section of BRAND_SECTIONS) {
    if (page[section.key]) return section.color
  }
  return null
}

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
      setSaveMessage(allOk ? 'All pages saved successfully!' : 'Some pages failed to save.')
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
      const response = await fetch(`/api/admin/pages/${id}`, { method: 'DELETE' })
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

  const handleTogglePageGroup = async (e: React.MouseEvent, id: string, group: PageGroup) => {
    e.preventDefault()
    e.stopPropagation()

    const page = customPages.find((p) => p.id === id)
    if (!page || togglingIds.has(id)) return

    const newValue = !page[group]

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

  // Search across all pages by URL/slug
  const allSearchablePages = [
    ...FRONTEND_PAGES.map((p) => ({
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

  const normalizeSearch = (query: string): string => {
    let q = query.trim().toLowerCase()
    try {
      const url = new URL(q)
      q = url.pathname.replace(/^\//, '').replace(/\/$/, '')
    } catch {
      q = q.replace(/^\/+/, '').replace(/\/$/, '')
    }
    return q
  }

  const normalizedQuery = normalizeSearch(searchQuery)

  // Pages not assigned to any brand section — shown in Custom Pages
  const unassignedPages = customPages.filter(
    (p) => !BRAND_SECTIONS.some((s) => p[s.key])
  )

  const searchResults = searchQuery.trim()
    ? allSearchablePages.filter(
        (p) =>
          p.slug.toLowerCase().includes(normalizedQuery) ||
          p.title.toLowerCase().includes(normalizedQuery) ||
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

      {/* Brand Sections — NSR, Revo, Pioneer, Sideways, BRM */}
      {BRAND_SECTIONS.map((section) => {
        const sectionPages = customPages.filter((p) => p[section.key])
        const colors = COLOR_MAP[section.color]
        return (
          <div key={section.key} className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{section.label}</h2>
                <p className="text-gray-600 text-sm mt-1">
                  Custom pages assigned to the {section.label.replace(' Pages', '')} section
                </p>
              </div>
            </div>

            {sectionPages.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-400">
                  <div className="text-4xl mb-3">{section.icon}</div>
                  <p className="text-sm">No pages assigned to {section.label} yet.</p>
                  <p className="text-xs mt-1">
                    Create a custom page below and click &ldquo;{section.label}&rdquo; to assign it here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sectionPages.map((page) => (
                  <Card
                    key={page.id}
                    className={`hover:shadow-lg transition-shadow ${colors.border} ${colors.bg}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">{section.icon}</div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold mb-1">{page.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                            <span>/{page.slug}</span>
                            <span className={`px-2 py-0.5 rounded ${colors.badge}`}>
                              {section.label.replace(' Pages', '')}
                            </span>
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
                            onClick={(e) => handleTogglePageGroup(e, page.id, section.key)}
                            disabled={togglingIds.has(page.id)}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          >
                            {togglingIds.has(page.id) ? '...' : 'Remove'}
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
            )}
          </div>
        )
      })}

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

        {unassignedPages.length === 0 && customPages.length > 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-400">
              <div className="text-4xl mb-3">📄</div>
              <p className="text-sm">All custom pages have been assigned to a brand section.</p>
              <p className="text-xs mt-1">
                Use the &ldquo;Remove&rdquo; button in any brand section to move a page back here.
              </p>
            </CardContent>
          </Card>
        ) : customPages.length === 0 ? (
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
            {unassignedPages.map((page) => {
              const pageColor = getPageColor(page)
              const colors = pageColor ? COLOR_MAP[pageColor] : null
              return (
                <Card
                  key={page.id}
                  className={colors ? `${colors.border} ${colors.bg}` : ''}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
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
                          {BRAND_SECTIONS.map((section) =>
                            page[section.key] ? (
                              <span
                                key={section.key}
                                className={`px-2 py-1 text-xs rounded font-medium ${COLOR_MAP[section.color].badge}`}
                              >
                                {section.label.replace(' Pages', '')}
                              </span>
                            ) : null
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
                        {BRAND_SECTIONS.map((section) => (
                          <Button
                            key={section.key}
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleTogglePageGroup(e, page.id, section.key)}
                            disabled={togglingIds.has(page.id)}
                            className={
                              page[section.key]
                                ? COLOR_MAP[section.color].btn
                                : ''
                            }
                          >
                            {togglingIds.has(page.id) ? '...' : section.label}
                          </Button>
                        ))}
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
              )
            })}
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
                <li>• Use the brand section buttons (NSR Pages, Revo Pages, etc.) to move a page into that brand section</li>
                <li>• Assigned pages are hidden from Custom Pages — use &ldquo;Remove&rdquo; in the brand section to move them back</li>
                <li>• Use the search bar to quickly find pages by URL or name</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
