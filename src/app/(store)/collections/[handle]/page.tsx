import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCollectionByHandle } from '@/lib/shopify'
import { ProductCard } from '@/components/product/product-card'

interface CollectionPageProps {
  params: Promise<{
    handle: string
  }>
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { handle } = await params
  const collection = await getCollectionByHandle(handle)

  if (!collection) {
    return {
      title: 'Collection Not Found',
    }
  }

  return {
    title: `${collection.title} | R66SLOT`,
    description: collection.description,
  }
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { handle } = await params
  const collection = await getCollectionByHandle(handle)

  if (!collection) {
    notFound()
  }

  const products = collection.products.edges.map((edge) => edge.node)

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Collection Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4">{collection.title}</h1>
        {collection.description && (
          <p className="text-lg text-gray-600 max-w-3xl">
            {collection.description}
          </p>
        )}
        <p className="text-sm text-gray-500 mt-4">
          {products.length} {products.length === 1 ? 'product' : 'products'}
        </p>
      </div>

      {/* Products Grid */}
      {products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No products in this collection yet.</p>
        </div>
      )}
    </div>
  )
}
