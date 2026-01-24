import { NextResponse } from 'next/server'
import { getAllPosts } from '@/lib/blog/storage'

// GET /api/blog - Get all published posts (public)
export async function GET() {
  try {
    const allPosts = await getAllPosts()
    // Filter to only show published posts
    const publishedPosts = allPosts.filter((post) => post.published)
    return NextResponse.json(publishedPosts)
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}
