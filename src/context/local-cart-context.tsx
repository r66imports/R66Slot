'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export interface LocalCartItem {
  id: string
  title: string
  brand: string
  price: number
  imageUrl: string
  pageUrl: string
  quantity: number
  /** Available stock — set when Rule 1 (Enforce Stock Limits) is active */
  stockQty?: number
  /** True when Rule 1 is active and stock should be capped */
  trackQty?: boolean
  /** True when this is a pre-order product */
  isPreOrder?: boolean
}

interface LocalCartContextType {
  items: LocalCartItem[]
  totalItems: number
  subtotal: number
  addItem: (product: Omit<LocalCartItem, 'quantity'>, qty?: number) => void
  updateQuantity: (id: string, quantity: number) => void
  patchItem: (id: string, patch: Partial<LocalCartItem>) => void
  removeItem: (id: string) => void
  clearCart: () => void
}

const LocalCartContext = createContext<LocalCartContextType | undefined>(undefined)

const STORAGE_KEY = 'r66-local-cart'

export function LocalCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<LocalCartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setItems(JSON.parse(stored))
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
      } catch {}
    }
  }, [items, hydrated])

  const addItem = (product: Omit<LocalCartItem, 'quantity'>, qty: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id)
      if (existing) {
        const max = existing.trackQty && existing.stockQty !== undefined ? existing.stockQty : Infinity
        const newQty = Math.min(existing.quantity + qty, max)
        return prev.map((i) => i.id === product.id ? { ...i, quantity: newQty } : i)
      }
      const max = product.trackQty && product.stockQty !== undefined ? product.stockQty : Infinity
      return [...prev, { ...product, quantity: Math.min(qty, max) }]
    })
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id)
      return
    }
    setItems((prev) => prev.map((i) => {
      if (i.id !== id) return i
      const max = i.trackQty && i.stockQty !== undefined ? i.stockQty : Infinity
      return { ...i, quantity: Math.min(quantity, max) }
    }))
  }

  const patchItem = (id: string, patch: Partial<LocalCartItem>) => {
    setItems((prev) => prev.map((i) => {
      if (i.id !== id) return i
      const updated = { ...i, ...patch }
      // Re-apply stock cap if patch includes stock data
      if (patch.stockQty !== undefined || patch.trackQty !== undefined) {
        const max = updated.trackQty && updated.stockQty !== undefined ? updated.stockQty : Infinity
        updated.quantity = Math.min(updated.quantity, max)
      }
      return updated
    }))
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const clearCart = () => setItems([])

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <LocalCartContext.Provider
      value={{ items, totalItems, subtotal, addItem, updateQuantity, patchItem, removeItem, clearCart }}
    >
      {children}
    </LocalCartContext.Provider>
  )
}

export function useLocalCart() {
  const ctx = useContext(LocalCartContext)
  if (!ctx) throw new Error('useLocalCart must be used within LocalCartProvider')
  return ctx
}
