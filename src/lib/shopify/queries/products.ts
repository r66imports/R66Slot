export const productFragment = `
  fragment ProductFragment on Product {
    id
    handle
    title
    description
    descriptionHtml
    vendor
    productType
    tags
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    images(first: 10) {
      edges {
        node {
          id
          url
          altText
          width
          height
        }
      }
    }
    variants(first: 100) {
      edges {
        node {
          id
          title
          sku
          availableForSale
          quantityAvailable
          price {
            amount
            currencyCode
          }
          compareAtPrice {
            amount
            currencyCode
          }
          image {
            id
            url
            altText
            width
            height
          }
          selectedOptions {
            name
            value
          }
        }
      }
    }
    availableForSale
    totalInventory
  }
`

export const GET_PRODUCT_BY_HANDLE = `
  ${productFragment}
  query getProductByHandle($handle: String!) {
    product(handle: $handle) {
      ...ProductFragment
      collections(first: 10) {
        edges {
          node {
            id
            handle
            title
          }
        }
      }
    }
  }
`

export const GET_PRODUCTS = `
  ${productFragment}
  query getProducts($first: Int = 20, $after: String, $query: String, $sortKey: ProductSortKeys = BEST_SELLING) {
    products(first: $first, after: $after, query: $query, sortKey: $sortKey) {
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
`

export const GET_PRODUCT_RECOMMENDATIONS = `
  ${productFragment}
  query getProductRecommendations($productId: ID!) {
    productRecommendations(productId: $productId) {
      ...ProductFragment
    }
  }
`

export const SEARCH_PRODUCTS = `
  ${productFragment}
  query searchProducts($query: String!, $first: Int = 20) {
    search(query: $query, first: $first, types: PRODUCT) {
      edges {
        node {
          ... on Product {
            ...ProductFragment
          }
        }
      }
    }
  }
`
