'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { shopifyFetch } from '@/lib/shopify/client'
import {
  CREATE_CART,
  ADD_TO_CART,
  UPDATE_CART_LINES,
  REMOVE_FROM_CART,
  GET_CART,
} from '@/lib/shopify/mutations/cart'
import type { ShopifyCart } from '@/types/shopify'

interface CartContextType {
  cart: ShopifyCart | null
  isLoading: boolean
  addToCart: (variantId: string, quantity: number) => Promise<void>
  updateCartLine: (lineId: string, quantity: number) => Promise<void>
  removeFromCart: (lineId: string) => Promise<void>
  clearCart: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_ID_KEY = 'r66slot-cart-id'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<ShopifyCart | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load cart on mount
  useEffect(() => {
    const loadCart = async () => {
      const cartId = localStorage.getItem(CART_ID_KEY)
      if (cartId) {
        try {
          const response = await shopifyFetch<{ cart: ShopifyCart }>({
            query: GET_CART,
            variables: { id: cartId },
            cache: 'no-store',
          })
          if (response.data.cart) {
            setCart(response.data.cart)
          } else {
            localStorage.removeItem(CART_ID_KEY)
          }
        } catch (error) {
          console.error('Error loading cart:', error)
          localStorage.removeItem(CART_ID_KEY)
        }
      }
      setIsLoading(false)
    }

    loadCart()
  }, [])

  const createCart = async (variantId: string, quantity: number) => {
    try {
      const response = await shopifyFetch<{
        cartCreate: {
          cart: ShopifyCart
          userErrors: Array<{ field: string; message: string }>
        }
      }>({
        query: CREATE_CART,
        variables: {
          input: {
            lines: [
              {
                merchandiseId: variantId,
                quantity,
              },
            ],
          },
        },
        cache: 'no-store',
      })

      if (response.data.cartCreate.userErrors.length > 0) {
        throw new Error(response.data.cartCreate.userErrors[0].message)
      }

      const newCart = response.data.cartCreate.cart
      setCart(newCart)
      localStorage.setItem(CART_ID_KEY, newCart.id)
    } catch (error) {
      console.error('Error creating cart:', error)
      throw error
    }
  }

  const addToCart = async (variantId: string, quantity: number) => {
    setIsLoading(true)
    try {
      if (!cart) {
        await createCart(variantId, quantity)
      } else {
        const response = await shopifyFetch<{
          cartLinesAdd: {
            cart: ShopifyCart
            userErrors: Array<{ field: string; message: string }>
          }
        }>({
          query: ADD_TO_CART,
          variables: {
            cartId: cart.id,
            lines: [
              {
                merchandiseId: variantId,
                quantity,
              },
            ],
          },
          cache: 'no-store',
        })

        if (response.data.cartLinesAdd.userErrors.length > 0) {
          throw new Error(response.data.cartLinesAdd.userErrors[0].message)
        }

        setCart(response.data.cartLinesAdd.cart)
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const updateCartLine = async (lineId: string, quantity: number) => {
    if (!cart) return

    setIsLoading(true)
    try {
      const response = await shopifyFetch<{
        cartLinesUpdate: {
          cart: ShopifyCart
          userErrors: Array<{ field: string; message: string }>
        }
      }>({
        query: UPDATE_CART_LINES,
        variables: {
          cartId: cart.id,
          lines: [
            {
              id: lineId,
              quantity,
            },
          ],
        },
        cache: 'no-store',
      })

      if (response.data.cartLinesUpdate.userErrors.length > 0) {
        throw new Error(response.data.cartLinesUpdate.userErrors[0].message)
      }

      setCart(response.data.cartLinesUpdate.cart)
    } catch (error) {
      console.error('Error updating cart:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const removeFromCart = async (lineId: string) => {
    if (!cart) return

    setIsLoading(true)
    try {
      const response = await shopifyFetch<{
        cartLinesRemove: {
          cart: ShopifyCart
          userErrors: Array<{ field: string; message: string }>
        }
      }>({
        query: REMOVE_FROM_CART,
        variables: {
          cartId: cart.id,
          lineIds: [lineId],
        },
        cache: 'no-store',
      })

      if (response.data.cartLinesRemove.userErrors.length > 0) {
        throw new Error(response.data.cartLinesRemove.userErrors[0].message)
      }

      setCart(response.data.cartLinesRemove.cart)
    } catch (error) {
      console.error('Error removing from cart:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const clearCart = () => {
    setCart(null)
    localStorage.removeItem(CART_ID_KEY)
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        addToCart,
        updateCartLine,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
