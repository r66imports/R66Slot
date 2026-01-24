import { Metadata } from 'next'
import { getProducts } from '@/lib/shopify'
import { ProductCard } from '@/components/product/product-card'
import type { ShopifyProduct } from '@/types/shopify'

interface BrandPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({
  params,
}: BrandPageProps): Promise<Metadata> {
  const { slug } = await params
  const brandName = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return {
    title: `${brandName} Slot Cars | R66SLOT`,
    description: `Shop ${brandName} slot cars, parts, and accessories. Premium quality models for collectors and enthusiasts.`,
  }
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { slug } = await params
  const brandName = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  let products: ShopifyProduct[]
  try {
    const productsData = await getProducts({
      first: 20,
      query: `vendor:${brandName}`,
    })
    products = productsData.edges.map((edge) => edge.node)
  } catch (error) {
    console.error('Error fetching products:', error)
    products = []
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{brandName}</h1>
        <p className="text-gray-600">
          {products.length > 0
            ? `Showing ${products.length} products`
            : 'Browse our complete collection'}
        </p>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h2 className="text-2xl font-semibold mb-2">Coming Soon</h2>
          <p className="text-gray-600 mb-6">
            We&apos;re currently stocking {brandName} products. Check back soon!
          </p>
        </div>
      )}
    </div>
  )
}
