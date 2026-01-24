// Site settings schema
export interface SiteSettings {
  // General Settings
  siteName: string
  siteDescription: string
  siteUrl: string

  // Contact Info
  email: string
  phone: string
  address: string

  // Social Media
  facebook?: string
  instagram?: string
  twitter?: string
  youtube?: string

  // Homepage Content
  hero: {
    title: string
    subtitle: string
    ctaText: string
    ctaLink: string
    backgroundImage?: string
  }

  // Featured Brands (for homepage)
  featuredBrands: string[]

  // Announcements
  announcement?: {
    enabled: boolean
    message: string
    type: 'info' | 'warning' | 'success'
  }

  // SEO
  metaTitle?: string
  metaDescription?: string
  metaKeywords?: string[]

  // Shipping
  freeShippingThreshold: number
  standardShippingCost: number
  expressShippingCost: number
}

export const defaultSettings: SiteSettings = {
  siteName: 'R66SLOT',
  siteDescription: 'Premium Slot Cars & Collectibles',
  siteUrl: 'http://localhost:3000',
  email: 'support@r66slot.com',
  phone: '1-800-R66-SLOT',
  address: '',
  hero: {
    title: 'Premium Slot Cars',
    subtitle: 'For Collectors',
    ctaText: 'Shop Now',
    ctaLink: '/products',
  },
  featuredBrands: ['Carrera', 'Scalextric', 'Slot.it', 'NSR', 'Ninco', 'Fly'],
  announcement: {
    enabled: false,
    message: '',
    type: 'info',
  },
  freeShippingThreshold: 100,
  standardShippingCost: 5.99,
  expressShippingCost: 12.99,
}
