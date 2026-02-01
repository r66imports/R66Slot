import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProducts } from '@/lib/shopify'
import { getPageById } from '@/lib/pages/storage'
import { ProductCard } from '@/components/product/product-card'
import { ComponentRenderer } from '@/components/page-renderer/component-renderer'
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

  // Check if there's an editable page for this brand
  const editablePage = await getPageById(`frontend-brand-${slug}`)

  // If an editable page exists with components, render it
  if (editablePage && editablePage.components.length > 0) {
    const ps = editablePage.pageSettings || {}
    return (
      <div
        style={{
          backgroundColor: ps.backgroundColor || '#ffffff',
          position: 'relative',
          minHeight: '100vh',
        }}
      >
        {ps.backgroundImage && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url("${ps.backgroundImage}")`,
              backgroundSize: ps.backgroundSize || 'cover',
              backgroundPosition: ps.backgroundPosition || 'center',
              backgroundRepeat: 'no-repeat',
              opacity: typeof ps.backgroundOpacity === 'number' ? ps.backgroundOpacity : 1,
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
        )}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {editablePage.components.map((component) => {
            if (component.positionMode === 'absolute' && component.position) {
              const rotation = component.position.rotation || 0
              return (
                <div
                  key={component.id}
                  style={{
                    position: 'absolute',
                    left: component.position.x,
                    top: component.position.y,
                    width: component.position.width,
                    height: component.position.height,
                    zIndex: component.position.zIndex || 10,
                    transform: rotation ? `rotate(${rotation}deg)` : undefined,
                  }}
                >
                  <ComponentRenderer component={component} />
                </div>
              )
            }
            return <ComponentRenderer key={component.id} component={component} />
          })}
        </div>
      </div>
    )
  }

  // Fallback: Shopify product listing
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
