'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCart } from '@/context/cart-context'
import type { ShopifyProduct } from '@/types/shopify'
import { formatPrice, getShopifyImageUrl } from '@/lib/shopify/client'

interface ProductCardProps {
  product: ShopifyProduct
}

export function ProductCard({ product }: ProductCardProps) {
  const mainImage = product.images.edges[0]?.node
  const price = product.priceRange.minVariantPrice
  const [isAdding, setIsAdding] = useState(false)
  const { addToCart } = useCart()

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    const variantId = product.variants.edges[0]?.node.id
    if (!variantId) return

    setIsAdding(true)
    try {
      await addToCart(variantId, 1)
    } catch (error) {
      console.error('Failed to add to cart:', error)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Card className="group hover:shadow-lg transition-shadow h-full flex flex-col">
      <Link href={`/products/${product.handle}`} className="block">
        <div className="relative aspect-square bg-gray-100 overflow-hidden">
          {mainImage ? (
            <Image
              src={getShopifyImageUrl(mainImage.url, 600)}
              alt={mainImage.altText || product.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
          {!product.availableForSale && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white font-semibold text-lg">Sold Out</span>
            </div>
          )}
          {product.tags.includes('new') && (
            <span className="absolute top-2 left-2 bg-primary text-black px-2 py-1 rounded text-xs font-semibold">
              NEW
            </span>
          )}
          {product.tags.includes('limited-edition') && (
            <span className="absolute top-2 right-2 bg-black text-primary px-2 py-1 rounded text-xs font-semibold">
              LIMITED
            </span>
          )}
        </div>
      </Link>
      <CardContent className="p-4 flex-1 flex flex-col">
        <Link href={`/products/${product.handle}`}>
          <p className="text-sm text-gray-600 mb-1">{product.vendor}</p>
          <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {product.title}
          </h3>
        </Link>
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-bold">
              {formatPrice(price.amount, price.currencyCode)}
            </span>
            {product.variants.edges[0]?.node.compareAtPrice && (
              <span className="text-sm text-gray-500 line-through">
                {formatPrice(
                  product.variants.edges[0].node.compareAtPrice.amount,
                  product.variants.edges[0].node.compareAtPrice.currencyCode
                )}
              </span>
            )}
          </div>
          <Button
            size="sm"
            className="w-full"
            disabled={!product.availableForSale || isAdding}
            onClick={handleAddToCart}
          >
            {isAdding ? 'Adding...' : product.availableForSale ? 'Add to Cart' : 'Out of Stock'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
