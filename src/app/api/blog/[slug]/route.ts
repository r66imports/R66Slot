import { NextResponse } from 'next/server'
import { getPostBySlug } from '@/lib/blog/storage'

// GET /api/blog/[slug] - Get single published post by slug (public)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const post = await getPostBySlug(slug)

    if (!post || !post.published) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error('Error fetching post:', error)
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    )
  }
}
