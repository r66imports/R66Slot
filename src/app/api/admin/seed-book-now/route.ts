import { NextResponse } from 'next/server'
import { blobWrite, blobRead } from '@/lib/blob-storage'
import type { Page } from '@/lib/pages/schema'

const PAGE_ID = 'frontend-book-now'
const PAGE_KEY = `data/pages/${PAGE_ID}.json`
const SLUG_INDEX_KEY = 'data/pages/_slug-index.json'

// POST /api/admin/seed-book-now
// Creates or resets the frontend Book Now page with default booking components.
// Safe to call multiple times – only seeds if the page doesn't exist yet.
export async function POST(request: Request) {
  try {
    const { force } = await request.json().catch(() => ({ force: false }))

    // Check if page already exists
    const existing = await blobRead<Page | null>(PAGE_KEY, null)
    if (existing && !force) {
      return NextResponse.json({ message: 'Page already exists', id: PAGE_ID })
    }

    const now = new Date().toISOString()

    const page: Page = {
      id: PAGE_ID,
      title: 'Book Now',
      slug: 'book-now',
      published: true,
      isWebsitePage: true,
      components: [
        {
          id: 'book-now-header',
          type: 'header',
          content: '',
          styles: {
            backgroundColor: '#111827',
            textColor: '#FFFFFF',
            height: '64px',
            paddingTop: '0',
            paddingBottom: '0',
            paddingLeft: '24px',
            paddingRight: '24px',
          },
          settings: {
            logoText: 'R66SLOT',
            menuItems: 'Products,Brands,About,Book Now',
            menuLinks: '/products,/brands,/about,/book-now',
          },
        },
        {
          id: 'book-now-hero',
          type: 'hero',
          content: '',
          styles: {
            backgroundColor: '#111827',
            textColor: '#FFFFFF',
            paddingTop: '72px',
            paddingBottom: '72px',
            paddingLeft: '16px',
            paddingRight: '16px',
          },
          settings: {
            title: 'Pre-Order Your Slot Cars',
            subtitle: 'Secure your spot on the latest arrivals before they sell out. Limited quantities available.',
            buttonText: '',
            buttonLink: '',
            alignment: 'center',
            imageUrl: '',
          },
        },
        {
          id: 'book-now-divider-top',
          type: 'divider',
          content: '',
          styles: {
            paddingTop: '0',
            paddingBottom: '0',
            paddingLeft: '0',
            paddingRight: '0',
          },
          settings: {
            thickness: '3px',
            style: 'solid',
            color: '#DC2626',
          },
        },
        {
          id: 'book-now-form',
          type: 'booking-form',
          content: '',
          styles: {
            backgroundColor: '#F9FAFB',
            textColor: '#DC2626',
            paddingTop: '56px',
            paddingBottom: '56px',
            paddingLeft: '16px',
            paddingRight: '16px',
          },
          settings: {
            bookingTitle: 'Available for Pre-Order',
            bookingSubtitle: 'Select an item and fill in your details to secure your order',
            bookingLayout: 'grid',
            showBrandFilter: true,
          },
        },
        {
          id: 'book-now-info',
          type: 'section',
          content: '',
          styles: {
            backgroundColor: '#1F2937',
            textColor: '#FFFFFF',
            paddingTop: '56px',
            paddingBottom: '56px',
            paddingLeft: '16px',
            paddingRight: '16px',
          },
          settings: {
            sectionTitle: 'How Pre-Orders Work',
            sectionSubtitle: '',
          },
          children: [
            {
              id: 'book-now-info-cols',
              type: 'columns',
              content: '',
              styles: {
                paddingTop: '24px',
                paddingBottom: '0',
                paddingLeft: '0',
                paddingRight: '0',
              },
              settings: { columns: 3 },
              children: [
                {
                  id: 'book-now-step1',
                  type: 'text',
                  content: '<div style="text-align:center"><div style="font-size:2.5rem;margin-bottom:12px">1️⃣</div><h3 style="font-size:1.1rem;font-weight:700;margin-bottom:8px;color:#fff">Choose Your Item</h3><p style="color:#9CA3AF;font-size:0.9rem">Browse available pre-order items and select the one you want.</p></div>',
                  styles: {},
                  settings: {},
                },
                {
                  id: 'book-now-step2',
                  type: 'text',
                  content: '<div style="text-align:center"><div style="font-size:2.5rem;margin-bottom:12px">2️⃣</div><h3 style="font-size:1.1rem;font-weight:700;margin-bottom:8px;color:#fff">Pick Your Quantity</h3><p style="color:#9CA3AF;font-size:0.9rem">Select how many units you need and fill in your contact details.</p></div>',
                  styles: {},
                  settings: {},
                },
                {
                  id: 'book-now-step3',
                  type: 'text',
                  content: '<div style="text-align:center"><div style="font-size:2.5rem;margin-bottom:12px">3️⃣</div><h3 style="font-size:1.1rem;font-weight:700;margin-bottom:8px;color:#fff">We\'ll Confirm</h3><p style="color:#9CA3AF;font-size:0.9rem">We\'ll contact you to confirm your pre-order and arrange payment.</p></div>',
                  styles: {},
                  settings: {},
                },
              ],
            },
          ],
        },
        {
          id: 'book-now-banner',
          type: 'banner',
          content: 'Questions about pre-orders? Contact us on WhatsApp',
          styles: {
            backgroundColor: '#DC2626',
            textColor: '#FFFFFF',
            paddingTop: '24px',
            paddingBottom: '24px',
            paddingLeft: '16px',
            paddingRight: '16px',
            fontSize: '18px',
            fontWeight: '600',
          },
          settings: {
            buttonText: 'WhatsApp Us',
            buttonLink: 'https://wa.me/27000000000',
          },
        },
      ],
      pageSettings: {
        backgroundColor: '#ffffff',
        seoTitle: 'Book Now – Pre-Order Slot Cars | R66SLOT',
        seoDescription: 'Pre-order the latest slot cars from R66SLOT. Choose your quantity and secure your spot before stock runs out.',
      },
      seo: {
        metaTitle: 'Book Now – Pre-Order Slot Cars | R66SLOT',
        metaDescription: 'Pre-order the latest slot cars from R66SLOT. Choose your quantity and secure your spot before stock runs out.',
        metaKeywords: 'slot cars, pre-order, book now, R66SLOT',
      },
      createdAt: now,
      updatedAt: now,
    }

    // Write page to blob
    await blobWrite(PAGE_KEY, page)

    // Update slug index
    const index = await blobRead<Record<string, string>>(SLUG_INDEX_KEY, {})
    index['book-now'] = PAGE_ID
    await blobWrite(SLUG_INDEX_KEY, index).catch(() => {})

    // Dual-write to Supabase (best-effort)
    try {
      const { supaUpsertPage } = await import('@/lib/pages/supabase-storage')
      await supaUpsertPage(page)
    } catch {
      // Supabase not required
    }

    return NextResponse.json({ success: true, id: PAGE_ID, slug: 'book-now' })
  } catch (error) {
    console.error('Error seeding book-now page:', error)
    return NextResponse.json({ error: 'Failed to seed page' }, { status: 500 })
  }
}

// GET – trigger via browser for convenience during setup
export async function GET() {
  return POST(new Request('http://localhost', { method: 'POST', body: '{}' }))
}
