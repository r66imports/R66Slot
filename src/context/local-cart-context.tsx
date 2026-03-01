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
}

interface LocalCartContextType {
  items: LocalCartItem[]
  totalItems: number
  subtotal: number
  addItem: (product: Omit<LocalCartItem, 'quantity'>, qty?: number) => void
  updateQuantity: (id: string, quantity: number) => void
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
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + qty } : i
        )
      }
      return [...prev, { ...product, quantity: qty }]
    })
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id)
      return
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)))
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const clearCart = () => setItems([])

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <LocalCartContext.Provider
      value={{ items, totalItems, subtotal, addItem, updateQuantity, removeItem, clearCart }}
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
