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

  // Header Configuration (editable from admin)
  header?: {
    logoText: string
    logoStyle: 'split' | 'solid' // split = first 3 chars different color
    logoImage?: string // URL to image logo — overrides text logo when set
    logoSize?: number // px size for image logo (default 80)
    logoPosition?: 'left' | 'center' | 'right' // header logo position (default 'left')
    headerHeight?: number // header bar height in px (default 64)
    // Company name shown next to logo
    showCompanyName?: boolean
    companyName?: string
    companyNameSize?: number // font size px (default 20)
    companyNameBold?: boolean
    companyNameColor?: string // overall color (default inherits textColor)
    companyNameOutline?: string // CSS text-stroke color (optional)
    companyNameLetterColors?: string[] // per-letter colors (optional)
    backgroundColor: string
    textColor: string
    // Navigation typography
    navFontFamily?: string // CSS font-family value (default system-ui)
    navFontSize?: number   // px (default 14)
    navFontWeight?: number // 400 | 500 | 600 | 700 (default 500)
    navHoverColor?: string // color on hover (default brand red)
    navHoverEffect?: 'color' | 'underline' | 'background' | 'bold' // hover behaviour
    navItems: Array<{
      label: string
      href: string
      isExternal?: boolean
      dropdown?: Array<{
        label: string
        href: string
        isExternal?: boolean
      }>
    }>
    showSearch: boolean
    showAccount: boolean
    showCart: boolean
    sticky: boolean
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
  header: {
    logoText: 'R66SLOT',
    logoStyle: 'split',
    backgroundColor: '#ffffff',
    textColor: '#111827',
    navItems: [
      { label: 'New Arrivals', href: '/collections/new-arrivals' },
      { label: 'Book for Next Shipment', href: '/book' },
    ],
    showSearch: true,
    showAccount: true,
    showCart: true,
    sticky: true,
  },
  freeShippingThreshold: 100,
  standardShippingCost: 5.99,
  expressShippingCost: 12.99,
}
