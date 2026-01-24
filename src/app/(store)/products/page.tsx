import { getProducts } from '@/lib/shopify'
import { ProductCard } from '@/components/product/product-card'
import type { ShopifyProduct } from '@/types/shopify'

export const metadata = {
  title: 'Shop All Products | R66SLOT',
  description: 'Browse our complete collection of slot cars and accessories.',
}

export default async function ProductsPage() {
  let products: ShopifyProduct[]
  try {
    const productsData = await getProducts({ first: 20 })
    products = productsData.edges.map((edge) => edge.node)
  } catch (error) {
    console.error('Error fetching products:', error)
    products = []
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">All Products</h1>
        <p className="text-gray-600">
          {products.length > 0
            ? `Showing ${products.length} products`
            : 'No products found'}
        </p>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">
            No products available at the moment.
          </p>
          <p className="text-sm text-gray-500">
            Make sure your Shopify store is configured with the correct API credentials.
          </p>
        </div>
      )}
    </div>
  )
}
