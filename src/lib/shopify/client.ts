function getShopifyConfig() {
  const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
  const storefrontAccessToken = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN

  if (!domain || !storefrontAccessToken) {
    throw new Error('Missing Shopify environment variables')
  }

  return {
    endpoint: `https://${domain}/api/2024-01/graphql.json`,
    storefrontAccessToken,
  }
}

const config = getShopifyConfig()

export type ShopifyResponse<T> = {
  data: T
  errors?: Array<{ message: string }>
}

export async function shopifyFetch<T>({
  query,
  variables,
  cache = 'force-cache',
  tags,
}: {
  query: string
  variables?: Record<string, unknown>
  cache?: RequestCache
  tags?: string[]
}): Promise<ShopifyResponse<T>> {
  try {
    const result = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': config.storefrontAccessToken,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
      cache,
      ...(tags && { next: { tags } }),
    })

    const json = await result.json()

    if (json.errors) {
      console.error('Shopify GraphQL errors:', json.errors)
    }

    return json
  } catch (error) {
    console.error('Shopify fetch error:', error)
    throw error
  }
}

export function formatPrice(amount: string, currencyCode = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(parseFloat(amount))
}

export function getShopifyImageUrl(url: string, width?: number, height?: number): string {
  if (!url) return ''

  const params = []
  if (width) params.push(`width=${width}`)
  if (height) params.push(`height=${height}`)

  if (params.length === 0) return url

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}${params.join('&')}`
}
