'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { BlogPost } from '@/lib/blog/schema'

export default function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const router = useRouter()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPost = async () => {
      const resolvedParams = await params
      try {
        const response = await fetch(`/api/blog/${resolvedParams.slug}`)
        if (response.ok) {
          const data = await response.json()
          setPost(data)
        } else {
          router.push('/blog')
        }
      } catch (error) {
        console.error('Error fetching post:', error)
        router.push('/blog')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPost()
  }, [params, router])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">Loading post...</div>
      </div>
    )
  }

  if (!post) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Button variant="outline" asChild>
            <Link href="/blog">← Back to Blog</Link>
          </Button>
        </div>

        <article>
          <header className="mb-8">
            <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
            <div className="flex items-center gap-4 text-gray-600 mb-6">
              <span className="font-medium">{post.author}</span>
              <span>•</span>
              <span>
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            {post.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          <Card>
            <CardContent className="p-8">
              <div className="prose prose-lg max-w-none">
                {post.content.split('\n').map((paragraph, index) => {
                  if (paragraph.trim() === '') return null

                  // Handle markdown-style headings
                  if (paragraph.startsWith('## ')) {
                    return (
                      <h2 key={index} className="text-2xl font-bold mt-8 mb-4">
                        {paragraph.replace('## ', '')}
                      </h2>
                    )
                  }
                  if (paragraph.startsWith('### ')) {
                    return (
                      <h3 key={index} className="text-xl font-bold mt-6 mb-3">
                        {paragraph.replace('### ', '')}
                      </h3>
                    )
                  }

                  // Handle markdown-style bold
                  const processedText = paragraph
                    .split(/(\*\*.*?\*\*)/)
                    .map((part, i) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return (
                          <strong key={i}>
                            {part.replace(/\*\*/g, '')}
                          </strong>
                        )
                      }
                      return part
                    })

                  return (
                    <p key={index} className="mb-4 text-gray-700 leading-relaxed">
                      {processedText}
                    </p>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <Button asChild size="lg">
              <Link href="/blog">← Back to All Posts</Link>
            </Button>
          </div>
        </article>
      </div>
    </div>
  )
}
