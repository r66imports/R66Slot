import { NextResponse } from 'next/server'
import { createPage, getAllPages } from '@/lib/pages/storage'
import type { Page, PageComponent } from '@/lib/pages/schema'

// POST /api/admin/pages/seed-nsr-test - Create NSR Test page with all components
export async function POST() {
  try {
    // Check if page already exists
    const existingPages = await getAllPages()
    const exists = existingPages.find(p => p.slug === 'nsr-test')
    if (exists) {
      return NextResponse.json({ message: 'NSR Test page already exists', page: exists })
    }

    // Create NSR Test page with components matching the original NSR page
    const components: PageComponent[] = [
      // Hero Section
      {
        id: 'hero-section',
        type: 'section',
        content: '',
        styles: {
          backgroundColor: '',
          backgroundImage: 'linear-gradient(to right, #dc2626, #b91c1c)',
          padding: '64px 16px',
          textAlign: 'center',
        },
        settings: {},
        children: [
          {
            id: 'hero-title',
            type: 'heading',
            content: 'NSR Slot Cars',
            styles: {
              fontSize: '48px',
              fontWeight: '700',
              textColor: '#ffffff',
              marginBottom: '16px',
            },
            settings: {},
          },
          {
            id: 'hero-subtitle',
            type: 'text',
            content: 'Premium Racing Performance',
            styles: {
              fontSize: '20px',
              textColor: '#fecaca',
            },
            settings: {},
          },
        ],
      },
      // Category Grid Container
      {
        id: 'category-grid',
        type: 'section',
        content: '',
        styles: {
          backgroundColor: '#f9fafb',
          padding: '64px 16px',
          maxWidth: '896px',
          margin: '0 auto',
        },
        settings: {},
        children: [
          // Two Column Layout
          {
            id: 'two-col-layout',
            type: 'two-column',
            content: '',
            styles: {
              gap: '32px',
            },
            settings: {
              columns: 2,
            },
            children: [
              // NSR Cars Card
              {
                id: 'nsr-cars-card',
                type: 'card',
                content: '',
                styles: {
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden',
                },
                settings: {
                  link: '/products/cars/nsr',
                },
                children: [
                  // Card Image Area
                  {
                    id: 'cars-image-area',
                    type: 'section',
                    content: '',
                    styles: {
                      backgroundImage: 'linear-gradient(to bottom right, #ef4444, #b91c1c)',
                      padding: '32px',
                      textAlign: 'center',
                      minHeight: '300px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                    },
                    settings: {},
                    children: [
                      {
                        id: 'cars-emoji',
                        type: 'text',
                        content: '🏎️',
                        styles: {
                          fontSize: '96px',
                          marginBottom: '16px',
                        },
                        settings: {},
                      },
                      {
                        id: 'cars-brand',
                        type: 'heading',
                        content: 'NSR',
                        styles: {
                          fontSize: '36px',
                          fontWeight: '700',
                          textColor: '#ffffff',
                        },
                        settings: {},
                      },
                      {
                        id: 'cars-type',
                        type: 'text',
                        content: 'Slot Cars',
                        styles: {
                          fontSize: '24px',
                          textColor: '#fecaca',
                          marginTop: '8px',
                        },
                        settings: {},
                      },
                    ],
                  },
                  // Card Content Area
                  {
                    id: 'cars-content-area',
                    type: 'section',
                    content: '',
                    styles: {
                      backgroundColor: '#ffffff',
                      padding: '24px',
                      textAlign: 'center',
                    },
                    settings: {},
                    children: [
                      {
                        id: 'cars-title',
                        type: 'heading',
                        content: 'NSR Slot Cars',
                        styles: {
                          fontSize: '24px',
                          fontWeight: '700',
                          textColor: '#111827',
                          marginBottom: '8px',
                        },
                        settings: {},
                      },
                      {
                        id: 'cars-desc',
                        type: 'text',
                        content: 'Explore our complete range of NSR racing models',
                        styles: {
                          textColor: '#6b7280',
                          marginBottom: '16px',
                        },
                        settings: {},
                      },
                      {
                        id: 'cars-button',
                        type: 'button',
                        content: 'View Cars →',
                        styles: {
                          backgroundColor: '#dc2626',
                          textColor: '#ffffff',
                          padding: '12px 24px',
                          borderRadius: '8px',
                          fontWeight: '600',
                        },
                        settings: {
                          link: '/products/cars/nsr',
                        },
                      },
                    ],
                  },
                ],
              },
              // NSR Parts Card
              {
                id: 'nsr-parts-card',
                type: 'card',
                content: '',
                styles: {
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden',
                },
                settings: {
                  link: '/products/parts/nsr',
                },
                children: [
                  // Card Image Area
                  {
                    id: 'parts-image-area',
                    type: 'section',
                    content: '',
                    styles: {
                      backgroundImage: 'linear-gradient(to bottom right, #374151, #111827)',
                      padding: '32px',
                      textAlign: 'center',
                      minHeight: '300px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                    },
                    settings: {},
                    children: [
                      {
                        id: 'parts-emoji',
                        type: 'text',
                        content: '⚙️',
                        styles: {
                          fontSize: '96px',
                          marginBottom: '16px',
                        },
                        settings: {},
                      },
                      {
                        id: 'parts-brand',
                        type: 'heading',
                        content: 'NSR',
                        styles: {
                          fontSize: '36px',
                          fontWeight: '700',
                          textColor: '#ffffff',
                        },
                        settings: {},
                      },
                      {
                        id: 'parts-type',
                        type: 'text',
                        content: 'Parts',
                        styles: {
                          fontSize: '24px',
                          textColor: '#d1d5db',
                          marginTop: '8px',
                        },
                        settings: {},
                      },
                    ],
                  },
                  // Card Content Area
                  {
                    id: 'parts-content-area',
                    type: 'section',
                    content: '',
                    styles: {
                      backgroundColor: '#ffffff',
                      padding: '24px',
                      textAlign: 'center',
                    },
                    settings: {},
                    children: [
                      {
                        id: 'parts-title',
                        type: 'heading',
                        content: 'NSR Parts',
                        styles: {
                          fontSize: '24px',
                          fontWeight: '700',
                          textColor: '#111827',
                          marginBottom: '8px',
                        },
                        settings: {},
                      },
                      {
                        id: 'parts-desc',
                        type: 'text',
                        content: 'Quality replacement parts and upgrades',
                        styles: {
                          textColor: '#6b7280',
                          marginBottom: '16px',
                        },
                        settings: {},
                      },
                      {
                        id: 'parts-button',
                        type: 'button',
                        content: 'View Parts →',
                        styles: {
                          backgroundColor: '#1f2937',
                          textColor: '#ffffff',
                          padding: '12px 24px',
                          borderRadius: '8px',
                          fontWeight: '600',
                        },
                        settings: {
                          link: '/products/parts/nsr',
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      // Back to Home Section
      {
        id: 'back-section',
        type: 'section',
        content: '',
        styles: {
          backgroundColor: '#f9fafb',
          padding: '0 16px 48px',
          textAlign: 'center',
        },
        settings: {},
        children: [
          {
            id: 'back-link',
            type: 'button',
            content: '← Back to Home',
            styles: {
              backgroundColor: 'transparent',
              textColor: '#6b7280',
              padding: '8px 16px',
              fontWeight: '500',
            },
            settings: {
              link: '/',
            },
          },
        ],
      },
    ]

    const pageData: Omit<Page, 'id' | 'createdAt' | 'updatedAt'> = {
      title: 'NSR Test',
      slug: 'nsr-test',
      published: true,
      isWebsitePage: true,
      components,
      pageSettings: {
        backgroundColor: '#f9fafb',
        fullWidth: true,
        seoTitle: 'NSR Test - R66Slot',
        seoDescription: 'NSR Slot Cars - Premium Racing Performance',
      },
      seo: {
        metaTitle: 'NSR Test - R66Slot',
        metaDescription: 'NSR Slot Cars - Premium Racing Performance',
        metaKeywords: 'NSR, slot cars, racing, parts',
      },
    }

    const page = await createPage(pageData)

    return NextResponse.json({
      message: 'NSR Test page created successfully!',
      page,
      editUrl: `/admin/pages/editor/${page.id}`,
      viewUrl: '/nsr-test',
    })
  } catch (error) {
    console.error('Error creating NSR Test page:', error)
    return NextResponse.json(
      { error: 'Failed to create NSR Test page' },
      { status: 500 }
    )
  }
}

// GET - Check if page exists
export async function GET() {
  try {
    const existingPages = await getAllPages()
    const exists = existingPages.find(p => p.slug === 'nsr-test')
    if (exists) {
      return NextResponse.json({
        exists: true,
        page: exists,
        editUrl: `/admin/pages/editor/${exists.id}`,
        viewUrl: '/nsr-test',
      })
    }
    return NextResponse.json({ exists: false })
  } catch (error) {
    console.error('Error checking NSR Test page:', error)
    return NextResponse.json({ error: 'Failed to check page' }, { status: 500 })
  }
}
