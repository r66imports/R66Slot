import { shopifyFetch } from './client'
import { GET_PRODUCTS, GET_PRODUCT_BY_HANDLE } from './queries/products'
import { GET_COLLECTIONS, GET_COLLECTION_BY_HANDLE } from './queries/collections'
import type { ShopifyProduct, ShopifyCollection } from '@/types/shopify'

// Products
export async function getProducts(options?: {
  first?: number
  after?: string
  query?: string
  sortKey?: string
}) {
  const response = await shopifyFetch<{
    products: {
      edges: Array<{ cursor: string; node: ShopifyProduct }>
      pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean }
    }
  }>({
    query: GET_PRODUCTS,
    variables: {
      first: options?.first || 20,
      after: options?.after,
      query: options?.query,
      sortKey: options?.sortKey || 'BEST_SELLING',
    },
    tags: ['products'],
  })

  return response.data.products
}

export async function getProductByHandle(handle: string) {
  const response = await shopifyFetch<{
    product: ShopifyProduct | null
  }>({
    query: GET_PRODUCT_BY_HANDLE,
    variables: { handle },
    tags: [`product-${handle}`],
  })

  return response.data.product
}

// Collections
export async function getCollections(first = 20) {
  const response = await shopifyFetch<{
    collections: {
      edges: Array<{ node: ShopifyCollection }>
    }
  }>({
    query: GET_COLLECTIONS,
    variables: { first },
    tags: ['collections'],
  })

  return response.data.collections.edges.map((edge) => edge.node)
}

export async function getCollectionByHandle(
  handle: string,
  options?: {
    first?: number
    after?: string
    sortKey?: string
  }
) {
  const response = await shopifyFetch<{
    collection: ShopifyCollection | null
  }>({
    query: GET_COLLECTION_BY_HANDLE,
    variables: {
      handle,
      first: options?.first || 20,
      after: options?.after,
      sortKey: options?.sortKey || 'BEST_SELLING',
    },
    tags: [`collection-${handle}`],
  })

  return response.data.collection
}
