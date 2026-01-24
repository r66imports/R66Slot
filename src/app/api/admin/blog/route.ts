import { NextResponse } from 'next/server'
import { getAllPosts, createPost } from '@/lib/blog/storage'

// GET /api/admin/blog - Get all posts
export async function GET() {
  try {
    const posts = await getAllPosts()
    return NextResponse.json(posts)
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

// POST /api/admin/blog - Create new post
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const post = await createPost(body)
    return NextResponse.json(post)
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    )
  }
}
