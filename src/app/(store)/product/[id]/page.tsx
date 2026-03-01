'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useLocalCart } from '@/context/local-cart-context'

export default function ProductDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeImg, setActiveImg] = useState(0)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const { addItem } = useLocalCart()

  useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setProduct(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 text-lg">Product not found.</p>
        <Link href="/products" className="mt-4 inline-block text-red-600 hover:underline">← Back to Products</Link>
      </div>
    )
  }

  // Build full image list: primary + gallery
  const allImages: string[] = [
    ...(product.imageUrl ? [product.imageUrl] : []),
    ...((product.images as string[]) || []).filter((img: string) => img && img !== product.imageUrl),
  ]

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      title: product.title,
      brand: product.brand || '',
      price: product.price || 0,
      imageUrl: product.imageUrl || '',
      pageUrl: `/product/${product.id}`,
    }, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const outOfStock = product.quantity === 0 && !product.isPreOrder
  const isPreOrder = product.isPreOrder

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500 flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:text-red-600">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-red-600">Products</Link>
        {product.brand && (
          <>
            <span>/</span>
            <span className="text-gray-400">{product.brand}</span>
          </>
        )}
        <span>/</span>
        <span className="text-gray-800 font-medium">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* ── Left: Images ── */}
        <div>
          {/* Main image */}
          <div className="rounded-xl overflow-hidden bg-gray-50 border border-gray-100 mb-3 flex items-center justify-center" style={{ minHeight: '340px' }}>
            {allImages.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={allImages[activeImg]}
                alt={product.title}
                className="w-full object-contain"
                style={{ maxHeight: '480px' }}
              />
            ) : (
              <span className="text-gray-300 text-8xl">🏎️</span>
            )}
          </div>

          {/* Thumbnail strip */}
          {allImages.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImg(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                    activeImg === idx ? 'border-red-600' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}

          {/* SKU + title below images (mobile-friendly) */}
          {product.sku && (
            <p className="text-xs text-gray-400 font-mono mt-3">{product.sku}</p>
          )}
        </div>

        {/* ── Right: Info ── */}
        <div className="flex flex-col gap-4">
          {/* Brand */}
          {product.brand && (
            <p className="text-sm font-bold uppercase tracking-widest text-gray-500">{product.brand}</p>
          )}

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">{product.title}</h1>

          {/* SKU */}
          {product.sku && (
            <p className="text-sm text-gray-500">SKU: <span className="font-mono font-semibold text-gray-700">{product.sku}</span></p>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-gray-900">
              {product.price > 0 ? `R${product.price.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : 'POA'}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-lg text-gray-400 line-through">
                R{product.compareAtPrice.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>

          {/* Stock status */}
          {!outOfStock && !isPreOrder && (
            <p className="text-sm text-green-600 font-medium">
              {product.quantity > 0 ? `${product.quantity} in stock` : 'Available'}
            </p>
          )}

          {/* Quantity + Add to Cart */}
          {!outOfStock ? (
            <div className="flex flex-col gap-3">
              {!isPreOrder && (
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-600">Quantity</label>
                  <div className="flex items-center gap-2 border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="w-9 h-9 flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >−</button>
                    <span className="w-10 text-center font-semibold text-sm">{qty}</span>
                    <button
                      onClick={() => setQty((q) => q + 1)}
                      className="w-9 h-9 flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >+</button>
                  </div>
                </div>
              )}

              {isPreOrder ? (
                <a
                  href="/book"
                  className="w-full text-center font-bold py-3 px-6 rounded-lg text-base bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                >
                  Pre Order
                </a>
              ) : (
                <button
                  onClick={handleAddToCart}
                  className={`w-full font-bold py-3 px-6 rounded-lg text-base transition-all duration-200 ${
                    added ? 'bg-green-600 text-white scale-95' : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {added ? '✓ Added to Cart!' : 'Add to Cart'}
                </button>
              )}
            </div>
          ) : (
            <button disabled className="w-full font-bold py-3 px-6 rounded-lg text-base bg-gray-200 text-gray-500 cursor-not-allowed">
              Out of Stock
            </button>
          )}

          {/* Meta tags */}
          <div className="flex flex-wrap gap-2 pt-1">
            {product.carClass && (
              <span className="px-3 py-1 bg-black text-white text-xs font-bold rounded-full">{product.carClass}</span>
            )}
            {product.scale && (
              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">Scale {product.scale}</span>
            )}
            {product.productType && (
              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">{product.productType}</span>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div className="border-t border-gray-100 pt-4">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Description</h2>
              <div
                className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
