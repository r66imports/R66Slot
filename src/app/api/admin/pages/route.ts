import { NextResponse } from 'next/server'
import { getAllPages, createPage } from '@/lib/pages/storage'

// GET /api/admin/pages - Get all pages
export async function GET() {
  try {
    const pages = await getAllPages()
    return NextResponse.json(pages)
  } catch (error) {
    console.error('Error fetching pages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    )
  }
}

// POST /api/admin/pages - Create new page
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const page = await createPage(body)
    return NextResponse.json(page)
  } catch (error) {
    console.error('Error creating page:', error)
    return NextResponse.json(
      { error: 'Failed to create page' },
      { status: 500 }
    )
  }
}
