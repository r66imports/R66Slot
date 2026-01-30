import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getPageById, updatePage, deletePage } from '@/lib/pages/storage'
import { blobWrite } from '@/lib/blob-storage'
import type { Page } from '@/lib/pages/schema'

// Default page templates for frontend pages that don't exist yet
const FRONTEND_PAGE_TEMPLATES: Record<string, { title: string; slug: string }> = {
  'frontend-homepage': { title: 'Homepage', slug: '' },
  'frontend-products': { title: 'Products Page', slug: 'products' },
  'frontend-about': { title: 'About Page', slug: 'about' },
  'frontend-contact': { title: 'Contact Page', slug: 'contact' },
}

// GET /api/admin/pages/[id] - Get single page
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    let page = await getPageById(id)

    // Auto-create frontend pages that don't exist yet
    if (!page && id.startsWith('frontend-')) {
      const template = FRONTEND_PAGE_TEMPLATES[id]
      if (template) {
        const now = new Date().toISOString()
        const newPage: Page = {
          id,
          title: template.title,
          slug: template.slug,
          published: false,
          components: [],
          pageSettings: {
            backgroundColor: '#ffffff',
          },
          seo: {
            metaTitle: template.title,
            metaDescription: '',
            metaKeywords: '',
          },
          createdAt: now,
          updatedAt: now,
        }

        await blobWrite(`data/pages/${id}.json`, newPage)
        page = newPage
      }
    }

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    return NextResponse.json(page)
  } catch (error) {
    console.error('Error fetching page:', error)
    return NextResponse.json(
      { error: 'Failed to fetch page' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/pages/[id] - Update page
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const page = await updatePage(id, body)

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    // Revalidate the frontend page so edits appear immediately
    try {
      revalidatePath('/')
      if (id.startsWith('frontend-')) {
        const slug = id.replace('frontend-', '')
        revalidatePath(`/${slug}`)
      }
    } catch {
      // Revalidation errors shouldn't block the save
    }

    return NextResponse.json(page)
  } catch (error) {
    console.error('Error updating page:', error)
    return NextResponse.json(
      { error: 'Failed to update page' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/pages/[id] - Delete page
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const success = await deletePage(id)

    if (!success) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting page:', error)
    return NextResponse.json(
      { error: 'Failed to delete page' },
      { status: 500 }
    )
  }
}
