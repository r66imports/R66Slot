import type { PageComponent } from '@/lib/pages/schema'

export interface PageTemplate {
  id: string
  name: string
  description: string
  icon: string
  category: 'hero' | 'features' | 'content' | 'cta' | 'footer'
  components: PageComponent[]
}

export interface FullPageTemplate {
  id: string
  name: string
  description: string
  icon: string
  sections: string[]
  components: PageComponent[]
}

export const FULL_PAGE_TEMPLATES: FullPageTemplate[] = [
  {
    id: 'slot-car-landing',
    name: 'Slot Car Landing',
    description: 'Complete landing page for slot car enthusiasts',
    icon: '🏎️',
    sections: ['Hero', 'Gallery', 'Features', 'CTA'],
    components: [
      {
        id: 'fp-hero',
        type: 'hero',
        content: '',
        styles: {
          backgroundColor: '#1F2937',
          textColor: '#FFFFFF',
          paddingTop: '80px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        },
        settings: {
          title: 'Premium Slot Cars & Accessories',
          subtitle: 'South Africa\'s leading slot car retailer. Race-ready models from top brands.',
          buttonText: 'Shop Now',
          buttonLink: '/products',
          alignment: 'center',
        },
      },
      {
        id: 'fp-gallery',
        type: 'gallery',
        content: '',
        styles: { paddingTop: '48px', paddingBottom: '48px', paddingLeft: '16px', paddingRight: '16px' },
        settings: { columns: 3 },
        children: [
          { id: 'fp-gal-1', type: 'image', content: '', styles: {}, settings: { imageUrl: '', alt: 'Brand 1' } },
          { id: 'fp-gal-2', type: 'image', content: '', styles: {}, settings: { imageUrl: '', alt: 'Brand 2' } },
          { id: 'fp-gal-3', type: 'image', content: '', styles: {}, settings: { imageUrl: '', alt: 'Brand 3' } },
        ],
      },
      {
        id: 'fp-features',
        type: 'three-column',
        content: '',
        styles: { backgroundColor: '#F9FAFB', paddingTop: '48px', paddingBottom: '48px', paddingLeft: '16px', paddingRight: '16px', textAlign: 'center' },
        settings: { columns: 3 },
        children: [
          { id: 'fp-feat-1', type: 'icon-text', content: '<h3>Fast Shipping</h3><p>Nationwide delivery in 2-5 days</p>', styles: { textAlign: 'center' }, settings: { icon: '🚚' } },
          { id: 'fp-feat-2', type: 'icon-text', content: '<h3>Authentic Brands</h3><p>NSR, Slot.it, Scalextric & more</p>', styles: { textAlign: 'center' }, settings: { icon: '✅' } },
          { id: 'fp-feat-3', type: 'icon-text', content: '<h3>Expert Support</h3><p>Advice from racing enthusiasts</p>', styles: { textAlign: 'center' }, settings: { icon: '🏆' } },
        ],
      },
      {
        id: 'fp-cta',
        type: 'hero',
        content: '',
        styles: {
          backgroundColor: '#DC2626',
          textColor: '#FFFFFF',
          paddingTop: '48px',
          paddingBottom: '48px',
          paddingLeft: '16px',
          paddingRight: '16px',
        },
        settings: {
          title: 'Ready to Race?',
          subtitle: 'Browse our full collection of slot cars, tracks, and accessories.',
          buttonText: 'View All Products',
          buttonLink: '/products',
          alignment: 'center',
        },
      },
    ],
  },
  {
    id: 'product-showcase',
    name: 'Product Showcase',
    description: 'Showcase products with hero and grid',
    icon: '🛍️',
    sections: ['Hero Image', 'Product Grid', 'Testimonial'],
    components: [
      {
        id: 'ps-hero',
        type: 'hero',
        content: '',
        styles: {
          backgroundColor: '#111827',
          textColor: '#FFFFFF',
          paddingTop: '100px',
          paddingBottom: '100px',
          paddingLeft: '16px',
          paddingRight: '16px',
        },
        settings: {
          title: 'New Arrivals',
          subtitle: 'Discover the latest additions to our collection.',
          buttonText: 'Shop New',
          buttonLink: '/products',
          alignment: 'center',
          imageUrl: '',
        },
      },
      {
        id: 'ps-grid',
        type: 'product-grid',
        content: '',
        styles: { paddingTop: '48px', paddingBottom: '48px', paddingLeft: '16px', paddingRight: '16px' },
        settings: { productCount: 8, showPrice: true, showAddToCart: true },
      },
      {
        id: 'ps-quote',
        type: 'quote',
        content: 'Best slot car shop in South Africa! Amazing quality and fast delivery.',
        styles: { paddingTop: '32px', paddingBottom: '32px', paddingLeft: '16px', paddingRight: '16px' },
        settings: { author: 'Happy Customer' },
      },
    ],
  },
  {
    id: 'about-page',
    name: 'About Page',
    description: 'Tell your story with text, images, and gallery',
    icon: '📖',
    sections: ['Hero', 'Text + Image', 'Gallery', 'CTA'],
    components: [
      {
        id: 'ab-hero',
        type: 'hero',
        content: '',
        styles: {
          backgroundColor: '#1F2937',
          textColor: '#FFFFFF',
          paddingTop: '60px',
          paddingBottom: '60px',
          paddingLeft: '16px',
          paddingRight: '16px',
        },
        settings: {
          title: 'About Route 66',
          subtitle: 'Passionate about slot cars since day one.',
          alignment: 'center',
        },
      },
      {
        id: 'ab-twocol',
        type: 'two-column',
        content: '',
        styles: { paddingTop: '48px', paddingBottom: '48px', paddingLeft: '16px', paddingRight: '16px' },
        settings: {},
        children: [
          { id: 'ab-col-1', type: 'text', content: '<h3>Our Story</h3><p>We started with a love for slot car racing and a dream to bring the best brands to South Africa. Today, we serve racers across the country with premium products and expert advice.</p>', styles: {}, settings: {} },
          { id: 'ab-col-2', type: 'text', content: '<h3>Our Mission</h3><p>To be the premier destination for slot car enthusiasts. We curate only the finest products from world-renowned manufacturers and provide unmatched customer service.</p>', styles: {}, settings: {} },
        ],
      },
      {
        id: 'ab-gallery',
        type: 'gallery',
        content: '',
        styles: { paddingTop: '32px', paddingBottom: '32px', paddingLeft: '16px', paddingRight: '16px' },
        settings: { columns: 3 },
        children: [
          { id: 'ab-gal-1', type: 'image', content: '', styles: {}, settings: { imageUrl: '', alt: 'Our shop' } },
          { id: 'ab-gal-2', type: 'image', content: '', styles: {}, settings: { imageUrl: '', alt: 'Our team' } },
          { id: 'ab-gal-3', type: 'image', content: '', styles: {}, settings: { imageUrl: '', alt: 'Our products' } },
        ],
      },
      {
        id: 'ab-cta',
        type: 'hero',
        content: '',
        styles: {
          backgroundColor: '#DC2626',
          textColor: '#FFFFFF',
          paddingTop: '48px',
          paddingBottom: '48px',
          paddingLeft: '16px',
          paddingRight: '16px',
        },
        settings: {
          title: 'Visit Us Today',
          subtitle: 'Come see our collection in person or shop online.',
          buttonText: 'Contact Us',
          buttonLink: '/contact',
          alignment: 'center',
        },
      },
    ],
  },
]

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'hero-simple',
    name: 'Simple Hero',
    description: 'Clean hero with title and CTA',
    icon: '🎯',
    category: 'hero',
    components: [
      {
        id: 'hero-1',
        type: 'hero',
        content: 'Welcome to Your Site',
        styles: {
          backgroundColor: '#000000',
          textColor: '#FFFFFF',
          padding: '100px 20px',
          fontSize: '48px',
          fontWeight: 'bold',
          textAlign: 'center',
          minHeight: '500px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        settings: {},
      },
      {
        id: 'hero-subtitle',
        type: 'text',
        content: 'Create something amazing today',
        styles: {
          textAlign: 'center',
          fontSize: '20px',
          textColor: '#666666',
          padding: '20px',
          marginTop: '-60px',
        },
        settings: {},
      },
      {
        id: 'hero-btn',
        type: 'button',
        content: 'Get Started',
        styles: {
          backgroundColor: '#FFDD00',
          textColor: '#000000',
          padding: '16px 32px',
          borderRadius: '8px',
          fontSize: '18px',
          fontWeight: '600',
          textAlign: 'center',
          margin: '0 auto',
          display: 'block',
        },
        settings: {
          link: '/products',
        },
      },
    ],
  },
  {
    id: 'hero-image',
    name: 'Hero with Background',
    description: 'Hero section with background image',
    icon: '🖼️',
    category: 'hero',
    components: [
      {
        id: 'hero-bg',
        type: 'hero',
        content: 'Premium Quality Products',
        styles: {
          backgroundImage: 'url(https://images.unsplash.com/photo-1557821552-17105176677c?w=1600)',
          backgroundColor: 'rgba(0,0,0,0.5)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          textColor: '#FFFFFF',
          padding: '120px 20px',
          fontSize: '56px',
          fontWeight: 'bold',
          textAlign: 'center',
          minHeight: '600px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        settings: {},
      },
    ],
  },
  {
    id: 'features-3col',
    name: 'Three Features',
    description: '3-column feature section',
    icon: '⭐',
    category: 'features',
    components: [
      {
        id: 'features-section',
        type: 'section',
        content: '',
        styles: {
          backgroundColor: '#f9fafb',
          padding: '80px 20px',
        },
        settings: {},
      },
      {
        id: 'features-title',
        type: 'heading',
        content: 'Why Choose Us',
        styles: {
          fontSize: '40px',
          fontWeight: 'bold',
          textAlign: 'center',
          padding: '20px',
          marginBottom: '40px',
        },
        settings: {},
      },
      {
        id: 'features-cols',
        type: 'three-column',
        content: '',
        styles: {
          display: 'grid',
          gap: '30px',
          padding: '20px',
          maxWidth: '1200px',
          margin: '0 auto',
        },
        settings: {
          columns: 3,
        },
        children: [
          {
            id: 'feat-1',
            type: 'icon-text',
            content: 'Fast & reliable service with guaranteed delivery',
            styles: {
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              alignItems: 'center',
              padding: '20px',
              textAlign: 'center',
            },
            settings: {
              icon: '🚀',
            },
          },
          {
            id: 'feat-2',
            type: 'icon-text',
            content: 'Premium quality products tested for excellence',
            styles: {
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              alignItems: 'center',
              padding: '20px',
              textAlign: 'center',
            },
            settings: {
              icon: '💎',
            },
          },
          {
            id: 'feat-3',
            type: 'icon-text',
            content: '24/7 customer support ready to help you',
            styles: {
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              alignItems: 'center',
              padding: '20px',
              textAlign: 'center',
            },
            settings: {
              icon: '✨',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'features-icon-grid',
    name: 'Icon Feature Grid',
    description: 'Grid of icon features',
    icon: '🎨',
    category: 'features',
    components: [
      {
        id: 'icon-grid',
        type: 'two-column',
        content: '',
        styles: {
          display: 'grid',
          gap: '30px',
          padding: '60px 20px',
          maxWidth: '1000px',
          margin: '0 auto',
        },
        settings: {
          columns: 2,
        },
        children: [
          {
            id: 'feat-a',
            type: 'icon-text',
            content: 'Free shipping on all orders over $99',
            styles: {
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              padding: '20px',
            },
            settings: {
              icon: '📦',
            },
          },
          {
            id: 'feat-b',
            type: 'icon-text',
            content: '30-day money back guarantee',
            styles: {
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              padding: '20px',
            },
            settings: {
              icon: '✅',
            },
          },
          {
            id: 'feat-c',
            type: 'icon-text',
            content: 'Secure payment processing',
            styles: {
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              padding: '20px',
            },
            settings: {
              icon: '🔒',
            },
          },
          {
            id: 'feat-d',
            type: 'icon-text',
            content: 'Expert customer support',
            styles: {
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              padding: '20px',
            },
            settings: {
              icon: '💬',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'content-text-image',
    name: 'Text + Image',
    description: 'Two column text and image',
    icon: '📝',
    category: 'content',
    components: [
      {
        id: 'content-2col',
        type: 'two-column',
        content: '',
        styles: {
          display: 'grid',
          gap: '40px',
          padding: '80px 20px',
          maxWidth: '1200px',
          margin: '0 auto',
          alignItems: 'center',
        },
        settings: {
          columns: 2,
        },
        children: [
          {
            id: 'text-col',
            type: 'section',
            content: '',
            styles: {
              padding: '20px',
            },
            settings: {},
            children: [
              {
                id: 'text-heading',
                type: 'heading',
                content: 'About Our Products',
                styles: {
                  fontSize: '36px',
                  fontWeight: 'bold',
                  marginBottom: '20px',
                },
                settings: {},
              },
              {
                id: 'text-body',
                type: 'text',
                content: 'We provide premium quality products designed for enthusiasts and collectors. Each item is carefully selected and tested to ensure the highest standards of excellence.',
                styles: {
                  fontSize: '16px',
                  lineHeight: '1.6',
                  textColor: '#666666',
                },
                settings: {},
              },
            ],
          },
          {
            id: 'image-col',
            type: 'image',
            content: '',
            styles: {
              width: '100%',
              height: 'auto',
              borderRadius: '12px',
            },
            settings: {
              imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
              alt: 'Product showcase',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'testimonial',
    name: 'Testimonial',
    description: 'Customer quote section',
    icon: '💬',
    category: 'content',
    components: [
      {
        id: 'testimonial-section',
        type: 'section',
        content: '',
        styles: {
          backgroundColor: '#f9fafb',
          padding: '80px 20px',
        },
        settings: {},
      },
      {
        id: 'quote',
        type: 'quote',
        content: 'Absolutely amazing products! The quality exceeded my expectations and the customer service was outstanding.',
        styles: {
          fontSize: '24px',
          fontWeight: '500',
          fontStyle: 'italic',
          padding: '40px',
          borderLeft: '4px solid #FFDD00',
          backgroundColor: '#ffffff',
          margin: '0 auto',
          maxWidth: '800px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          borderRadius: '8px',
        },
        settings: {},
      },
      {
        id: 'author',
        type: 'text',
        content: '— Sarah Johnson, Verified Customer',
        styles: {
          textAlign: 'center',
          fontSize: '16px',
          fontWeight: '600',
          textColor: '#666666',
          padding: '20px',
          marginTop: '20px',
        },
        settings: {},
      },
    ],
  },
  {
    id: 'cta-simple',
    name: 'Simple CTA',
    description: 'Call to action section',
    icon: '🎯',
    category: 'cta',
    components: [
      {
        id: 'cta-card',
        type: 'card',
        content: '',
        styles: {
          backgroundColor: '#000000',
          textColor: '#FFFFFF',
          padding: '60px 40px',
          borderRadius: '16px',
          boxShadow: '0 10px 20px rgba(0,0,0,0.15)',
          margin: '60px 20px',
          maxWidth: '800px',
          marginLeft: 'auto',
          marginRight: 'auto',
          textAlign: 'center',
        },
        settings: {},
        children: [
          {
            id: 'cta-title',
            type: 'heading',
            content: 'Ready to Get Started?',
            styles: {
              fontSize: '36px',
              fontWeight: 'bold',
              textColor: '#FFFFFF',
              marginBottom: '16px',
            },
            settings: {},
          },
          {
            id: 'cta-text',
            type: 'text',
            content: 'Join thousands of satisfied customers today',
            styles: {
              fontSize: '18px',
              textColor: '#CCCCCC',
              marginBottom: '30px',
            },
            settings: {},
          },
          {
            id: 'cta-button',
            type: 'button',
            content: 'Shop Now',
            styles: {
              backgroundColor: '#FFDD00',
              textColor: '#000000',
              padding: '16px 48px',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '600',
              display: 'inline-block',
            },
            settings: {
              link: '/products',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'gallery-3x3',
    name: 'Photo Gallery',
    description: '3x3 image grid',
    icon: '📷',
    category: 'content',
    components: [
      {
        id: 'gallery-section',
        type: 'section',
        content: '',
        styles: {
          padding: '80px 20px',
        },
        settings: {},
      },
      {
        id: 'gallery-title',
        type: 'heading',
        content: 'Gallery',
        styles: {
          fontSize: '40px',
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '40px',
        },
        settings: {},
      },
      {
        id: 'gallery-grid',
        type: 'gallery',
        content: '',
        styles: {
          display: 'grid',
          gap: '20px',
          padding: '0 20px',
          maxWidth: '1200px',
          margin: '0 auto',
        },
        settings: {
          columns: 3,
        },
        children: [
          {
            id: 'gal-1',
            type: 'image',
            content: '',
            styles: {
              width: '100%',
              height: '300px',
              borderRadius: '12px',
              objectFit: 'cover',
            },
            settings: {
              imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
            },
          },
          {
            id: 'gal-2',
            type: 'image',
            content: '',
            styles: {
              width: '100%',
              height: '300px',
              borderRadius: '12px',
              objectFit: 'cover',
            },
            settings: {
              imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
            },
          },
          {
            id: 'gal-3',
            type: 'image',
            content: '',
            styles: {
              width: '100%',
              height: '300px',
              borderRadius: '12px',
              objectFit: 'cover',
            },
            settings: {
              imageUrl: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600',
            },
          },
        ],
      },
    ],
  },
]
