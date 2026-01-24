import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getProductByHandle } from '@/lib/shopify'
import { formatPrice, getShopifyImageUrl } from '@/lib/shopify/client'
import { Button } from '@/components/ui/button'
import { AddToCartButton } from '@/components/product/add-to-cart-button'

interface ProductPageProps {
  params: Promise<{
    handle: string
  }>
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { handle } = await params
  const product = await getProductByHandle(handle)

  if (!product) {
    return {
      title: 'Product Not Found',
    }
  }

  const mainImage = product.images.edges[0]?.node

  return {
    title: `${product.title} | R66SLOT`,
    description: product.description,
    openGraph: {
      title: product.title,
      description: product.description,
      images: mainImage ? [{ url: mainImage.url }] : [],
    },
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { handle } = await params
  const product = await getProductByHandle(handle)

  if (!product) {
    notFound()
  }

  const mainVariant = product.variants.edges[0]?.node
  const images = product.images.edges.map((edge) => edge.node)

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/" className="text-gray-600 hover:text-primary">
              Home
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li>
            <Link href="/products" className="text-gray-600 hover:text-primary">
              Products
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li className="text-gray-900 font-medium">{product.title}</li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div>
          <div className="sticky top-24">
            {images.length > 0 ? (
              <div className="space-y-4">
                <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={getShopifyImageUrl(images[0].url, 800)}
                    alt={images[0].altText || product.title}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  {!product.availableForSale && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white font-semibold text-2xl">
                        Sold Out
                      </span>
                    </div>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="grid grid-cols-4 gap-4">
                    {images.slice(1, 5).map((image, idx) => (
                      <div
                        key={image.id}
                        className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-75 transition-opacity"
                      >
                        <Image
                          src={getShopifyImageUrl(image.url, 200)}
                          alt={image.altText || `${product.title} ${idx + 2}`}
                          fill
                          className="object-cover"
                          sizes="25vw"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-400">No Image Available</span>
              </div>
            )}
          </div>
        </div>

        {/* Product Info */}
        <div>
          <div className="mb-6">
            <Link
              href={`/brands/${product.vendor.toLowerCase()}`}
              className="text-sm text-gray-600 hover:text-primary"
            >
              {product.vendor}
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold mt-2 mb-4">
              {product.title}
            </h1>
            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {product.tags.includes('new') && (
                  <span className="bg-primary text-black px-3 py-1 rounded-full text-xs font-semibold">
                    NEW
                  </span>
                )}
                {product.tags.includes('limited-edition') && (
                  <span className="bg-black text-primary px-3 py-1 rounded-full text-xs font-semibold">
                    LIMITED EDITION
                  </span>
                )}
                {product.tags.includes('pre-order') && (
                  <span className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    PRE-ORDER
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Price */}
          <div className="mb-8">
            <div className="flex items-baseline space-x-4">
              <span className="text-4xl font-bold">
                {formatPrice(
                  mainVariant.price.amount,
                  mainVariant.price.currencyCode
                )}
              </span>
              {mainVariant.compareAtPrice && (
                <span className="text-xl text-gray-500 line-through">
                  {formatPrice(
                    mainVariant.compareAtPrice.amount,
                    mainVariant.compareAtPrice.currencyCode
                  )}
                </span>
              )}
            </div>
            {mainVariant.availableForSale && mainVariant.quantityAvailable > 0 && (
              <p className="text-sm text-green-600 mt-2">
                {mainVariant.quantityAvailable < 10
                  ? `Only ${mainVariant.quantityAvailable} left in stock`
                  : 'In stock and ready to ship'}
              </p>
            )}
          </div>

          {/* Add to Cart */}
          <div className="mb-8">
            <AddToCartButton
              variantId={mainVariant.id}
              availableForSale={product.availableForSale}
            />
            {product.availableForSale && (
              <Button
                size="lg"
                variant="outline"
                className="w-full mt-4"
              >
                Add to Wishlist
              </Button>
            )}
          </div>

          {/* Product Details */}
          <div className="border-t border-gray-200 pt-8">
            <h2 className="text-xl font-semibold mb-4">Product Details</h2>
            <div
              className="prose prose-sm max-w-none text-gray-600"
              dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
            />
          </div>

          {/* Additional Info */}
          <div className="border-t border-gray-200 mt-8 pt-8 space-y-4">
            {product.productType && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">{product.productType}</span>
              </div>
            )}
            {mainVariant.sku && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">SKU:</span>
                <span className="font-medium">{mainVariant.sku}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Brand:</span>
              <Link
                href={`/brands/${product.vendor.toLowerCase()}`}
                className="font-medium hover:text-primary"
              >
                {product.vendor}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
