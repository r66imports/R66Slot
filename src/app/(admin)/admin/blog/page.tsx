'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { BlogPost } from '@/lib/blog/schema'

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/admin/blog')
      const data = await response.json()
      setPosts(data)
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      const response = await fetch(`/api/admin/blog/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setPosts(posts.filter((p) => p.id !== id))
      }
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Failed to delete post')
    }
  }

  if (isLoading) {
    return <div>Loading posts...</div>
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Blog Posts</h1>
          <p className="text-gray-600 mt-1">
            Manage your blog content and articles
          </p>
        </div>
        <Button size="lg" asChild>
          <Link href="/admin/blog/new">Create New Post</Link>
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-semibold mb-2">No blog posts yet</h2>
            <p className="text-gray-600 mb-6">
              Create your first blog post to get started
            </p>
            <Button asChild>
              <Link href="/admin/blog/new">Create First Post</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold">{post.title}</h3>
                      {!post.published && (
                        <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">
                          Draft
                        </span>
                      )}
                      {post.published && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                          Published
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-3">{post.excerpt}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>By {post.author}</span>
                      <span>•</span>
                      <span>
                        {new Date(post.publishedAt).toLocaleDateString()}
                      </span>
                      {post.tags.length > 0 && (
                        <>
                          <span>•</span>
                          <div className="flex gap-1">
                            {post.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 bg-gray-100 rounded text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/blog/edit/${post.id}`}>Edit</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(post.id)}
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
  )
}
