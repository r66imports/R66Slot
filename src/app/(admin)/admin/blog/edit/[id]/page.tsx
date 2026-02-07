'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { BlogPost } from '@/lib/blog/schema'

export default function EditBlogPost({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [postId, setPostId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    author: '',
    published: false,
    tags: '',
  })

  useEffect(() => {
    const loadPost = async () => {
      const resolvedParams = await params
      setPostId(resolvedParams.id)

      try {
        const response = await fetch(`/api/admin/blog/${resolvedParams.id}`)
        if (response.ok) {
          const post: BlogPost = await response.json()
          setFormData({
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            content: post.content,
            author: post.author,
            published: post.published,
            tags: post.tags.join(', '),
          })
        } else {
          alert('Failed to load post')
          router.push('/admin/blog')
        }
      } catch (error) {
        console.error('Error loading post:', error)
        alert('Failed to load post')
        router.push('/admin/blog')
      } finally {
        setIsLoading(false)
      }
    }

    loadPost()
  }, [params, router])

  const handleSave = async (publish: boolean) => {
    setIsSaving(true)

    try {
      const response = await fetch(`/api/admin/blog/${postId}`, {
        method: 'PUT',
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
        alert('Failed to update post')
      }
    } catch (error) {
      console.error('Error updating post:', error)
      alert('Failed to update post')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading post...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Blog Post</h1>
        <p className="text-gray-600 mt-1">
          Update and manage your blog post
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

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Status:{' '}
            {formData.published ? (
              <span className="text-green-600 font-medium">Published</span>
            ) : (
              <span className="text-gray-500 font-medium">Draft</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => window.open(`/blog/${formData.slug}`, '_blank')}
              className="bg-green-600 hover:bg-green-700 text-white border-green-600"
            >
              View Live
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/admin/blog')}
            >
              Cancel
            </Button>
            {formData.published ? (
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={isSaving}
              >
                Unpublish
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={isSaving}
              >
                Save as Draft
              </Button>
            )}
            <Button
              onClick={() => handleSave(true)}
              disabled={isSaving}
              size="lg"
            >
              {isSaving ? 'Saving...' : formData.published ? 'Update & Keep Published' : 'Publish Post'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
