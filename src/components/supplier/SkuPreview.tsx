'use client'

import { useEffect } from 'react'
import { formatZAR } from '@/lib/preorder-pricing'

/**
 * Shared SKU preview for Supplier Pre Orders — the same thumbnail and popup on
 * the admin review table and on the client's item list, so both sides are
 * looking at the same picture and the same shelf count.
 *
 * `qtyAvailable` is Inventory on hand. A pre-order never reserves or deducts
 * (Rule 59); it is here so nobody orders in something that is already on the
 * shelf.
 */

export interface SkuPreviewItem {
  sku: string
  brand?: string
  description?: string
  imageUrl?: string
  qtyAvailable?: number
  estRetailZAR?: number
}

/** Small square thumbnail that sits to the left of the SKU. */
export function SkuThumb({
  item,
  onClick,
  size = 40,
}: {
  item: SkuPreviewItem
  onClick?: () => void
  size?: number
}) {
  const inner = item.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.imageUrl}
      alt={item.sku}
      className="w-full h-full object-contain"
      loading="lazy"
    />
  ) : (
    <span className="text-[10px] text-gray-400 leading-none text-center px-0.5">no photo</span>
  )

  const cls =
    'shrink-0 flex items-center justify-center bg-white border border-gray-200 rounded overflow-hidden'

  if (!onClick) {
    return (
      <span className={cls} style={{ width: size, height: size }}>
        {inner}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${cls} hover:border-gray-400 transition-colors`}
      style={{ width: size, height: size }}
      aria-label={`View ${item.sku}`}
    >
      {inner}
    </button>
  )
}

export function SkuPreviewModal({
  item,
  onClose,
}: {
  item: SkuPreviewItem | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!item) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [item, onClose])

  if (!item) return null

  const qty = item.qtyAvailable || 0

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${item.sku} details`}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-3 border-b border-gray-200">
          <div>
            {item.brand && (
              <p className="text-xs uppercase tracking-wide text-gray-500">{item.brand}</p>
            )}
            <p className="font-mono text-sm font-semibold text-gray-900">{item.sku}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded flex items-center justify-center h-64">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.sku}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-sm text-gray-400">No photo on file</span>
            )}
          </div>

          <p className="text-sm text-gray-700">{item.description || 'No description'}</p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm border-t border-gray-200 pt-3">
            <span className="text-gray-600">
              Available in stock:{' '}
              <strong className={qty > 0 ? 'text-green-700' : 'text-gray-500'}>{qty}</strong>
            </span>
            {item.estRetailZAR !== undefined && (
              <span className="text-gray-600">
                Est. retail:{' '}
                <strong className="text-gray-900">
                  {item.estRetailZAR > 0 ? formatZAR(item.estRetailZAR) : 'On request'}
                </strong>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
