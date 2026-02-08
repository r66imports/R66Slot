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
  'frontend-brand-nsr': { title: 'NSR', slug: 'brands/nsr' },
  'frontend-brand-revo': { title: 'Revo', slug: 'brands/revo' },
  'frontend-brand-pioneer': { title: 'Pioneer', slug: 'brands/pioneer' },
  'frontend-brand-sideways': { title: 'Sideways', slug: 'brands/sideways' },
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
  } catch (error: any) {
    console.error('Error fetching page:', error)
    return NextResponse.json(
      { error: 'Failed to fetch page', details: error?.message },
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

    let body: any
    try {
      body = await request.json()
    } catch (parseErr: any) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body', details: parseErr?.message },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!body.title && !body.components) {
      return NextResponse.json(
        { error: 'Missing required fields (title or components)' },
        { status: 400 }
      )
    }

    const page = await updatePage(id, body)

    if (!page) {
      // Page not found — auto-create it with the provided data
      const now = new Date().toISOString()
      const newPage: Page = {
        id,
        title: body.title || 'Untitled Page',
        slug: body.slug || `page-${id}`,
        published: body.published || false,
        components: body.components || [],
        pageSettings: body.pageSettings || { backgroundColor: '#ffffff' },
        seo: body.seo || { metaTitle: body.title || '', metaDescription: '', metaKeywords: '' },
        createdAt: now,
        updatedAt: now,
      }
      await blobWrite(`data/pages/${id}.json`, newPage)

      return NextResponse.json(newPage)
    }

    // Revalidate the frontend page so edits appear immediately
    try {
      revalidatePath('/')
      if (id.startsWith('frontend-brand-')) {
        const brandSlug = id.replace('frontend-brand-', '')
        revalidatePath(`/brands/${brandSlug}`)
      } else if (id.startsWith('frontend-')) {
        const slug = id.replace('frontend-', '')
        revalidatePath(`/${slug}`)
      }
      if (page?.slug) {
        revalidatePath(`/${page.slug}`)
      }
    } catch {
      // Revalidation errors shouldn't block the save
    }

    return NextResponse.json(page)
  } catch (error: any) {
    console.error('Error updating page:', error)
    return NextResponse.json(
      { error: 'Failed to update page', details: error?.message },
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
  } catch (error: any) {
    console.error('Error deleting page:', error)
    return NextResponse.json(
      { error: 'Failed to delete page', details: error?.message },
      { status: 500 }
    )
  }
}
