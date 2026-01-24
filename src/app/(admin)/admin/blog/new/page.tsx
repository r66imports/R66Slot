'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function NewBlogPost() {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    author: 'R66SLOT Team',
    published: false,
    tags: '',
  })

  const handleSave = async (publish: boolean) => {
    setIsSaving(true)

    try {
      const response = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          published: publish,
          tags: formData.tags.split(',').map((t) => t.trim()).filter((t) => t),
        }),
      })

      if (response.ok) {
        router.push('/admin/blog')
      } else {
        alert('Failed to create post')
      }
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Failed to create post')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Blog Post</h1>
        <p className="text-gray-600 mt-1">
          Write and publish content for your blog
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Post Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Post Title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Enter post title"
            />
            <Input
              label="URL Slug"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              placeholder="auto-generated-from-title"
            />
            <Input
              label="Author"
              value={formData.author}
              onChange={(e) =>
                setFormData({ ...formData, author: e.target.value })
              }
            />
            <Input
              label="Tags (comma-separated)"
              value={formData.tags}
              onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
              }
              placeholder="slot cars, racing, collectors"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Excerpt (Short Description)
              </label>
              <textarea
                value={formData.excerpt}
                onChange={(e) =>
                  setFormData({ ...formData, excerpt: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border rounded-md"
                placeholder="Brief description of the post (shown in listings)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Post Content (Markdown supported)
              </label>
              <textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                rows={20}
                className="w-full px-4 py-2 border rounded-md font-mono text-sm"
                placeholder="Write your blog post content here..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/blog')}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={isSaving}
          >
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={isSaving}
            size="lg"
          >
            {isSaving ? 'Publishing...' : 'Publish Post'}
          </Button>
        </div>
      </div>
    </div>
  )
}
