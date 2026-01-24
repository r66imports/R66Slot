// Shopify types
export interface ShopifyProduct {
  id: string
  handle: string
  title: string
  description: string
  descriptionHtml: string
  vendor: string
  productType: string
  tags: string[]
  priceRange: {
    minVariantPrice: {
      amount: string
      currencyCode: string
    }
    maxVariantPrice: {
      amount: string
      currencyCode: string
    }
  }
  images: {
    edges: Array<{
      node: {
        id: string
        url: string
        altText: string | null
        width: number
        height: number
      }
    }>
  }
  variants: {
    edges: Array<{
      node: ShopifyVariant
    }>
  }
  availableForSale: boolean
  totalInventory?: number
  collections?: {
    edges: Array<{
      node: {
        id: string
        handle: string
        title: string
      }
    }>
  }
}

export interface ShopifyVariant {
  id: string
  title: string
  sku: string | null
  availableForSale: boolean
  quantityAvailable: number
  price: {
    amount: string
    currencyCode: string
  }
  compareAtPrice: {
    amount: string
    currencyCode: string
  } | null
  image: {
    id: string
    url: string
    altText: string | null
    width: number
    height: number
  } | null
  selectedOptions: Array<{
    name: string
    value: string
  }>
}

export interface ShopifyCollection {
  id: string
  handle: string
  title: string
  description: string
  descriptionHtml: string
  image: {
    id: string
    url: string
    altText: string | null
    width: number
    height: number
  } | null
  products: {
    edges: Array<{
      node: ShopifyProduct
    }>
  }
}

export interface ShopifyCart {
  id: string
  checkoutUrl: string
  cost: {
    subtotalAmount: {
      amount: string
      currencyCode: string
    }
    totalAmount: {
      amount: string
      currencyCode: string
    }
    totalTaxAmount: {
      amount: string
      currencyCode: string
    } | null
  }
  lines: {
    edges: Array<{
      node: ShopifyCartLine
    }>
  }
  totalQuantity: number
}

export interface ShopifyCartLine {
  id: string
  quantity: number
  merchandise: {
    id: string
    title: string
    selectedOptions: Array<{
      name: string
      value: string
    }>
    product: {
      id: string
      handle: string
      title: string
      featuredImage: {
        url: string
        altText: string | null
        width: number
        height: number
      }
    }
    price: {
      amount: string
      currencyCode: string
    }
  }
  cost: {
    totalAmount: {
      amount: string
      currencyCode: string
    }
  }
}

export interface ShopifyCustomer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  defaultAddress: ShopifyAddress | null
  addresses: {
    edges: Array<{
      node: ShopifyAddress
    }>
  }
  orders: {
    edges: Array<{
      node: ShopifyOrder
    }>
  }
}

export interface ShopifyAddress {
  id: string
  firstName: string
  lastName: string
  company: string | null
  address1: string
  address2: string | null
  city: string
  province: string
  country: string
  zip: string
  phone: string | null
}

export interface ShopifyOrder {
  id: string
  orderNumber: number
  processedAt: string
  financialStatus: string
  fulfillmentStatus: string
  totalPrice: {
    amount: string
    currencyCode: string
  }
  lineItems: {
    edges: Array<{
      node: {
        title: string
        quantity: number
        variant: {
          image: {
            url: string
            altText: string | null
          }
          price: {
            amount: string
            currencyCode: string
          }
        }
      }
    }>
  }
}
