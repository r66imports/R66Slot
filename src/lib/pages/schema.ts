// Page and Component schemas for visual editor

export interface PageComponent {
  id: string
  type:
    | 'text'
    | 'image'
    | 'button'
    | 'section'
    | 'hero'
    | 'heading'
    | 'spacer'
    | 'two-column'
    | 'three-column'
    | 'card'
    | 'video'
    | 'divider'
    | 'quote'
    | 'icon-text'
    | 'gallery'
    | 'product-grid'
    | 'product-card'
    | 'product-carousel'
    | 'featured-product'
    | 'add-to-cart'
    | 'price-display'
    | 'content-block'
    | 'ui-component'
    | 'slot'
    | 'widget'
    | 'media'
    | 'box'
    | 'strip'
    | 'banner'
    | 'columns'
    | 'header'
  content: string
  styles: {
    backgroundColor?: string
    textColor?: string
    fontSize?: string
    fontWeight?: string
    padding?: string
    paddingTop?: string
    paddingRight?: string
    paddingBottom?: string
    paddingLeft?: string
    margin?: string
    marginTop?: string
    marginRight?: string
    marginBottom?: string
    marginLeft?: string
    textAlign?: 'left' | 'center' | 'right'
    width?: string
    maxWidth?: string
    height?: string
    minHeight?: string
    borderRadius?: string
    border?: string
    borderColor?: string
    borderWidth?: string
    boxShadow?: string
    display?: string
    flexDirection?: string
    justifyContent?: string
    alignItems?: string
    gap?: string
    backgroundImage?: string
    backgroundSize?: string
    backgroundPosition?: string
    [key: string]: string | undefined
  }
  settings: {
    link?: string
    alt?: string
    imageUrl?: string
    videoUrl?: string
    icon?: string
    columns?: number
    productCount?: number
    showPrice?: boolean
    showAddToCart?: boolean
    price?: string
    description?: string
    productId?: string
    showDiscount?: boolean
    originalPrice?: string
    autoplay?: boolean
    cta?: { label: string; url: string }
    [key: string]: string | boolean | number | { label: string; url: string } | undefined
  }
  children?: PageComponent[]
  // Free positioning support
  positionMode?: 'flow' | 'absolute'

  // Legacy pixel-based position (deprecated - use normalizedPosition)
  position?: {
    x: number
    y: number
    width: number
    height: number
    zIndex?: number
    rotation?: number
  }

  // Legacy per-breakpoint pixel positions (deprecated - use normalizedPosition)
  positionByView?: {
    desktop?: { x: number; y: number; width: number; height: number; zIndex?: number; rotation?: number }
    tablet?: { x: number; y: number; width: number; height: number; zIndex?: number; rotation?: number }
    mobile?: { x: number; y: number; width: number; height: number; zIndex?: number; rotation?: number }
  }

  // NEW: Normalized percentage-based position (relative to design canvas)
  // xPercent/yPercent: 0-100 representing position as percentage of canvas
  // widthPercent/heightPercent: 0-100 representing size as percentage of canvas
  normalizedPosition?: {
    desktop: {
      xPercent: number
      yPercent: number
      widthPercent: number
      heightPercent: number
      zIndex: number
      rotation: number
    }
    tablet?: {
      xPercent: number
      yPercent: number
      widthPercent: number
      heightPercent: number
      zIndex: number
      rotation: number
    }
    mobile?: {
      xPercent: number
      yPercent: number
      widthPercent: number
      heightPercent: number
      zIndex: number
      rotation: number
    }
  }

  // Responsive strategy for smaller viewports
  responsiveStrategy?: 'percentage' | 'zoom-to-fit' | 'stack'
}

export interface PageSettings {
  backgroundImage?: string
  backgroundColor?: string
  backgroundSize?: 'cover' | 'contain' | 'auto'
  backgroundPosition?: string
  backgroundOpacity?: number
  fullWidth?: boolean
  // SEO Basics
  seoTitle?: string
  seoDescription?: string
  seoKeywords?: string
  seoCanonicalUrl?: string
  seoNoIndex?: boolean
  seoNoFollow?: boolean
  // Social Sharing (Open Graph)
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  ogType?: 'website' | 'article' | 'product'
  // Twitter Card
  twitterCard?: 'summary' | 'summary_large_image'
  twitterTitle?: string
  twitterDescription?: string
  twitterImage?: string
}

export interface Page {
  id: string
  title: string
  slug: string
  published: boolean
  isWebsitePage?: boolean
  components: PageComponent[]
  pageSettings?: PageSettings
  seo: {
    metaTitle: string
    metaDescription: string
    metaKeywords: string
  }
  createdAt: string
  updatedAt: string
}
