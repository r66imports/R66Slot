import { productFragment } from './products'

export const collectionFragment = `
  fragment CollectionFragment on Collection {
    id
    handle
    title
    description
    descriptionHtml
    image {
      id
      url
      altText
      width
      height
    }
  }
`

export const GET_COLLECTION_BY_HANDLE = `
  ${collectionFragment}
  ${productFragment}
  query getCollectionByHandle($handle: String!, $first: Int = 20, $after: String, $sortKey: ProductCollectionSortKeys = BEST_SELLING) {
    collection(handle: $handle) {
      ...CollectionFragment
      products(first: $first, after: $after, sortKey: $sortKey) {
        edges {
          cursor
          node {
            ...ProductFragment
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
        }
      }
    }
  }
`

export const GET_COLLECTIONS = `
  ${collectionFragment}
  query getCollections($first: Int = 20) {
    collections(first: $first) {
      edges {
        node {
          ...CollectionFragment
        }
      }
    }
  }
`
