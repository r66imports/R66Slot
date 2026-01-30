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
    [key: string]: string | boolean | number | undefined
  }
  children?: PageComponent[]
  // Free positioning support
  positionMode?: 'flow' | 'absolute'
  position?: {
    x: number
    y: number
    width: number
    height: number
    zIndex?: number
  }
}

export interface PageSettings {
  backgroundImage?: string
  backgroundColor?: string
  backgroundSize?: 'cover' | 'contain' | 'auto'
  backgroundPosition?: string
  backgroundOpacity?: number
  fullWidth?: boolean
}

export interface Page {
  id: string
  title: string
  slug: string
  published: boolean
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
