'use client'

import React, { useEffect, useState } from 'react'

interface Props {
  sku?: string | null
}

export default function SageInventoryDisplay({ sku }: Props) {
  const [qty, setQty] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!sku) return
    let cancelled = false
    fetch('/sage-inventory.json')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const q = data?.[sku]
        if (typeof q === 'number') setQty(q)
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoaded(true))

    return () => {
      cancelled = true
    }
  }, [sku])

  if (!sku) return null
  if (!loaded) return null
  if (qty === null) return null
  return (
    <p className="text-sm text-blue-600 mt-2">Sage inventory: {qty} unit{qty === 1 ? '' : 's'}</p>
  )
}
