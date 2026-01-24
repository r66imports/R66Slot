'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/context/cart-context'

interface AddToCartButtonProps {
  variantId: string
  availableForSale: boolean
}

export function AddToCartButton({
  variantId,
  availableForSale,
}: AddToCartButtonProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const { addToCart } = useCart()

  const handleAddToCart = async () => {
    setIsAdding(true)
    try {
      await addToCart(variantId, quantity)
    } catch (error) {
      console.error('Failed to add to cart:', error)
      alert('Failed to add to cart. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div>
      {/* Quantity Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Quantity</label>
        <div className="flex items-center gap-3 border rounded-lg p-1 w-fit">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            -
          </button>
          <span className="text-base font-medium w-12 text-center">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Add to Cart Button */}
      <Button
        size="lg"
        className="w-full"
        disabled={!availableForSale || isAdding}
        onClick={handleAddToCart}
      >
        {isAdding
          ? 'Adding to Cart...'
          : availableForSale
          ? 'Add to Cart'
          : 'Out of Stock'}
      </Button>
    </div>
  )
}
