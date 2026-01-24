'use client'

import { useCart } from '@/context/cart-context'
import { formatPrice, getShopifyImageUrl } from '@/lib/shopify/client'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function CartPage() {
  const { cart, isLoading, updateCartLine, removeFromCart } = useCart()

  const cartLines = cart?.lines.edges || []
  const subtotal = cart?.cost.subtotalAmount
  const estimatedTotal = cart?.cost.totalAmount

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
          <div className="text-center py-12">
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!cart || cartLines.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-20 w-20 mx-auto text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">
              Looks like you haven&apos;t added anything to your cart yet.
            </p>
            <Button size="lg" asChild>
              <Link href="/products">Start Shopping</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart ({cart.totalQuantity} {cart.totalQuantity === 1 ? 'item' : 'items'})</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white border rounded-lg divide-y">
              {cartLines.map(({ node: line }) => (
                <div key={line.id} className="p-6">
                  <div className="flex gap-6">
                    {/* Product Image */}
                    <Link
                      href={`/products/${line.merchandise.product.handle}`}
                      className="relative w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden"
                    >
                      {line.merchandise.product.featuredImage ? (
                        <Image
                          src={getShopifyImageUrl(
                            line.merchandise.product.featuredImage.url,
                            256
                          )}
                          alt={
                            line.merchandise.product.featuredImage.altText ||
                            line.merchandise.product.title
                          }
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 96px, 128px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                          No image
                        </div>
                      )}
                    </Link>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/products/${line.merchandise.product.handle}`}
                        className="font-semibold text-lg hover:text-primary line-clamp-2"
                      >
                        {line.merchandise.product.title}
                      </Link>
                      {line.merchandise.title !== 'Default Title' && (
                        <p className="text-sm text-gray-600 mt-1">
                          {line.merchandise.title}
                        </p>
                      )}
                      <p className="text-lg font-bold mt-2">
                        {formatPrice(
                          line.merchandise.price.amount,
                          line.merchandise.price.currencyCode
                        )}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-4 mt-4">
                        <div className="flex items-center gap-3 border rounded-lg p-1">
                          <button
                            onClick={() =>
                              updateCartLine(line.id, line.quantity - 1)
                            }
                            disabled={line.quantity <= 1}
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            -
                          </button>
                          <span className="text-sm font-medium w-8 text-center">
                            {line.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateCartLine(line.id, line.quantity + 1)
                            }
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(line.id)}
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Line Total */}
                    <div className="hidden sm:block text-right">
                      <p className="text-lg font-bold">
                        {formatPrice(
                          line.cost.totalAmount.amount,
                          line.cost.totalAmount.currencyCode
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 border rounded-lg p-6 sticky top-24">
              <h2 className="text-xl font-semibold mb-6">Order Summary</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">
                    {subtotal &&
                      formatPrice(subtotal.amount, subtotal.currencyCode)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-sm text-gray-500">
                    Calculated at checkout
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Taxes</span>
                  <span className="text-sm text-gray-500">
                    Calculated at checkout
                  </span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Estimated Total</span>
                    <span>
                      {estimatedTotal &&
                        formatPrice(
                          estimatedTotal.amount,
                          estimatedTotal.currencyCode
                        )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Button size="lg" className="w-full" asChild>
                  <a href={cart.checkoutUrl}>Proceed to Checkout</a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <Link href="/products">Continue Shopping</Link>
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <span>Secure checkout powered by Shopify</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
