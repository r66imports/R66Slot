'use client'

import { useState, useEffect } from 'react'
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

export default function PagesManagementPage() {
  const [customPages, setCustomPages] = useState<Page[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
                      <Link href={`/admin/pages/frontend/${page.id}`}>
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

      {/* Custom Pages - User Created */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Custom Pages</h2>
            <p className="text-gray-600 text-sm mt-1">
              Additional pages created with the visual editor
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
              <Card key={page.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold">{page.title}</h3>
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
                <li>• Changes are saved automatically and can be published when ready</li>
                <li>• Create custom pages for landing pages, promotions, or special content</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
