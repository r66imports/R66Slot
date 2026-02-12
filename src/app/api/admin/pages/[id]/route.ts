import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getPageById, updatePage, deletePage } from '@/lib/pages/storage'
import { blobWrite } from '@/lib/blob-storage'
import type { Page, PageComponent } from '@/lib/pages/schema'

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
  'frontend-cars-nsr': { title: 'NSR Cars', slug: 'cars/nsr' },
  'frontend-cars-revo': { title: 'Revo Cars', slug: 'cars/revo' },
  'frontend-cars-pioneer': { title: 'Pioneer Cars', slug: 'cars/pioneer' },
  'frontend-cars-sideways': { title: 'Sideways Cars', slug: 'cars/sideways' },
  'frontend-cars-slot-it': { title: 'Slot.it Cars', slug: 'cars/slot-it' },
  'frontend-cars-policar': { title: 'Policar Cars', slug: 'cars/policar' },
  'frontend-cars-thunderslot': { title: 'Thunderslot Cars', slug: 'cars/thunderslot' },
  'frontend-cars-scaleauto': { title: 'Scaleauto Cars', slug: 'cars/scaleauto' },
}

// Brand color themes for auto-generated brand page templates
const BRAND_THEMES: Record<string, { primary: string; dark: string; gradient: string }> = {
  nsr: { primary: '#DC2626', dark: '#B91C1C', gradient: 'from-red-600 to-red-700' },
  revo: { primary: '#2563EB', dark: '#1D4ED8', gradient: 'from-blue-600 to-blue-700' },
  pioneer: { primary: '#059669', dark: '#047857', gradient: 'from-emerald-600 to-emerald-700' },
  sideways: { primary: '#7C3AED', dark: '#6D28D9', gradient: 'from-violet-600 to-violet-700' },
}

/** Generate a pre-populated brand page template with editable components */
function buildBrandPageTemplate(brandSlug: string, brandTitle: string): PageComponent[] {
  const theme = BRAND_THEMES[brandSlug] || BRAND_THEMES.nsr
  const ts = Date.now()
  return [
    {
      id: `bp-header-${ts}`,
      type: 'header',
      content: '',
      styles: {
        backgroundColor: '#1F2937',
        textColor: '#FFFFFF',
        paddingTop: '0px',
        paddingBottom: '0px',
        paddingLeft: '32px',
        paddingRight: '32px',
        height: '64px',
      },
      settings: {
        logoText: 'R66SLOT',
        menuItems: 'Products,Brands,New Arrivals,Slotify Pre-Orders,About,Contact',
        menuLinks: '/products,/brands,/collections/new-arrivals,/slotify-preorders,/about,/contact',
      },
    },
    {
      id: `bp-hero-${ts}`,
      type: 'hero',
      content: '',
      styles: {
        backgroundColor: theme.primary,
        textColor: '#FFFFFF',
        paddingTop: '64px',
        paddingBottom: '64px',
        paddingLeft: '16px',
        paddingRight: '16px',
      },
      settings: {
        title: `${brandTitle} Slot Cars`,
        subtitle: 'Premium Racing Performance',
        alignment: 'center',
      },
    },
    {
      id: `bp-back-${ts}`,
      type: 'text',
      content: '<a href="/" style="color:#4B5563;font-size:14px;text-decoration:none;">&larr; Back to Home</a>',
      styles: {
        backgroundColor: '#F9FAFB',
        paddingTop: '24px',
        paddingBottom: '8px',
        paddingLeft: '80px',
        paddingRight: '16px',
      },
      settings: {},
    },
    {
      id: `bp-cards-${ts}`,
      type: 'columns',
      content: '',
      styles: {
        backgroundColor: '#F9FAFB',
        paddingTop: '16px',
        paddingBottom: '64px',
        paddingLeft: '64px',
        paddingRight: '64px',
      },
      settings: { columns: 2 },
      children: [
        {
          id: `bp-card-cars-${ts}`,
          type: 'icon-text',
          content: `<h3 style="font-size:24px;font-weight:700;color:#fff;margin:0 0 8px;">${brandTitle} Slot Cars</h3><p style="font-size:14px;color:rgba(255,255,255,0.8);margin:0 0 16px;text-align:center;">Explore our complete range of ${brandTitle} racing models</p><a href="/products/cars/${brandSlug}" style="display:inline-block;padding:12px 32px;background:${theme.dark};color:#fff;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">View Cars &rarr;</a>`,
          styles: {
            backgroundColor: theme.primary,
            textAlign: 'center',
            paddingTop: '48px',
            paddingBottom: '48px',
            paddingLeft: '24px',
            paddingRight: '24px',
            borderRadius: '12px',
          },
          settings: { icon: '🏎️' },
        },
        {
          id: `bp-card-parts-${ts}`,
          type: 'icon-text',
          content: `<h3 style="font-size:24px;font-weight:700;color:#fff;margin:0 0 8px;">${brandTitle} Parts</h3><p style="font-size:14px;color:rgba(255,255,255,0.8);margin:0 0 16px;text-align:center;">Quality replacement parts and upgrades</p><a href="/products/parts/${brandSlug}" style="display:inline-block;padding:12px 32px;background:#1F2937;color:#fff;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">View Parts &rarr;</a>`,
          styles: {
            backgroundColor: '#374151',
            textAlign: 'center',
            paddingTop: '48px',
            paddingBottom: '48px',
            paddingLeft: '24px',
            paddingRight: '24px',
            borderRadius: '12px',
          },
          settings: { icon: '⚙️' },
        },
      ],
    },
    {
      id: `bp-footer-${ts}`,
      type: 'text',
      content: '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:32px;width:100%;margin-bottom:32px;"><div><div style="font-size:24px;font-weight:700;margin-bottom:16px;"><span style="color:#fff;">R66</span><span style="color:#DC2626;">SLOT</span></div><p style="font-size:13px;color:#9CA3AF;line-height:1.6;">Your premium destination for slot car racing. Quality models, fast shipping, expert service.</p></div><div><h4 style="font-size:15px;font-weight:600;color:#fff;margin-bottom:16px;">Shop</h4><div style="display:flex;flex-direction:column;gap:10px;"><span style="font-size:13px;color:#9CA3AF;">All Products</span><span style="font-size:13px;color:#9CA3AF;">Brands</span><span style="font-size:13px;color:#9CA3AF;">New Arrivals</span><span style="font-size:13px;color:#9CA3AF;">Pre-Orders</span></div></div><div><h4 style="font-size:15px;font-weight:600;color:#fff;margin-bottom:16px;">Information</h4><div style="display:flex;flex-direction:column;gap:10px;"><span style="font-size:13px;color:#9CA3AF;">About Us</span><span style="font-size:13px;color:#9CA3AF;">Contact</span><span style="font-size:13px;color:#9CA3AF;">Shipping Info</span><span style="font-size:13px;color:#9CA3AF;">Returns</span></div></div><div><h4 style="font-size:15px;font-weight:600;color:#fff;margin-bottom:16px;">Account</h4><div style="display:flex;flex-direction:column;gap:10px;"><span style="font-size:13px;color:#9CA3AF;">My Account</span><span style="font-size:13px;color:#9CA3AF;">Order History</span><span style="font-size:13px;color:#9CA3AF;">Login</span><span style="font-size:13px;color:#9CA3AF;">Register</span></div></div></div><div style="padding-top:24px;border-top:1px solid #374151;display:flex;justify-content:space-between;align-items:center;width:100%;"><span style="font-size:13px;color:#9CA3AF;">&copy; 2026 R66SLOT. All rights reserved.</span><div style="display:flex;gap:24px;"><span style="font-size:13px;color:#9CA3AF;">Privacy Policy</span><span style="font-size:13px;color:#9CA3AF;">Terms of Service</span></div></div>',
      styles: {
        backgroundColor: '#1F2937',
        textColor: '#FFFFFF',
        paddingTop: '48px',
        paddingBottom: '32px',
        paddingLeft: '80px',
        paddingRight: '80px',
      },
      settings: {},
    },
  ]
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
      // Use template if available, otherwise generate title/slug from the ID
      const fallbackName = id.replace('frontend-', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      const fallbackSlug = id.replace('frontend-', '').replace(/-/g, '/')
      const title = template?.title || fallbackName
      const slug = template?.slug ?? fallbackSlug

      // Pre-populate brand pages with an editable template
      let defaultComponents: PageComponent[] = []
      const brandMatch = id.match(/^frontend-brand-(.+)$/)
      if (brandMatch) {
        defaultComponents = buildBrandPageTemplate(brandMatch[1], title)
      }

      const now = new Date().toISOString()
      const newPage: Page = {
        id,
        title,
        slug,
        published: false,
        components: defaultComponents,
        pageSettings: {
          backgroundColor: '#ffffff',
        },
        seo: {
          metaTitle: title,
          metaDescription: '',
          metaKeywords: '',
        },
        createdAt: now,
        updatedAt: now,
      }

      // Try to persist, but return the page even if blob storage fails
      try {
        await blobWrite(`data/pages/${id}.json`, newPage)
      } catch (writeErr: any) {
        console.error(`[pages/${id}] blob write failed (store may be suspended):`, writeErr?.message)
      }
      page = newPage
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

    // Validate required fields (allow group toggles through)
    if (!body.title && !body.components && body.isBrandPage === undefined && body.isCarsPage === undefined && body.isWebsitePage === undefined) {
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
      try {
        await blobWrite(`data/pages/${id}.json`, newPage)
      } catch (writeErr: any) {
        console.error(`[pages/${id}] blob write failed:`, writeErr?.message)
        // Still return the page so the editor doesn't break
      }

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
