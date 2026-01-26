// Local Product Types (R66SLOT)
export interface Product {
  id: string
  title: string
  description: string
  price: number
  compareAtPrice?: number
  costPerItem?: number
  sku?: string
  barcode?: string
  trackQuantity: boolean
  quantity: number
  weight?: number
  weightUnit?: 'lb' | 'oz' | 'kg' | 'g'
  brand: string
  productType: string
  partType?: string
  scale?: string
  supplier: string
  collections: string[]
  tags: string[]
  status: 'draft' | 'active'
  images: ProductImage[]
  createdAt: string
  updatedAt: string
}

export interface ProductImage {
  id: string
  url: string
  altText?: string
  width?: number
  height?: number
}

export interface ProductFormData {
  title: string
  description: string
  price: string
  compareAtPrice: string
  costPerItem: string
  sku: string
  barcode: string
  trackQuantity: boolean
  quantity: string
  weight: string
  weightUnit: string
  brand: string
  productType: string
  partType: string
  scale: string
  supplier: string
  collections: string[]
  tags: string
  status: string
}

export interface CartItem {
  id: string
  productId: string
  title: string
  price: number
  quantity: number
  image?: ProductImage
  sku?: string
}

export interface Cart {
  items: CartItem[]
  subtotal: number
  tax: number
  total: number
  itemCount: number
}

export interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  items: CartItem[]
  subtotal: number
  tax: number
  total: number
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  createdAt: string
  notes?: string
}
