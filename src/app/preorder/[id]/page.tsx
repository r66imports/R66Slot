'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Item = {
  id: string
  sku: string
  description: string
  retailPrice: string
  estimatedRetailPrice: string
  eta: string
  cutoffDate?: string
  brand: string
  unit: string
  imageUrl?: string
  isLocked?: boolean
  availableQty?: number | null
  resellerMoq?: number
  myReservedQty?: number
}

type Customer = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
}

export default function PublicPreOrderItemPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string
  const isReseller = searchParams.get('reseller') === '1'

  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [qty, setQty] = useState(1)
  const [reserving, setReserving] = useState(false)
  const [reserved, setReserved] = useState<{ totalQty: number } | null>(null)
  const [reserveError, setReserveError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`/api/preorder-item/${id}`).then(r => r.ok ? r.json() : Promise.reject()),
      fetch('/api/auth/me').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([itemData, custData]) => {
      setItem(itemData)
      if (custData) setCustomer(custData)
      // Pre-fill qty to the reseller minimum — unless this reseller has already
      // met the MOQ on a prior reservation, in which case any qty is fine.
      const alreadyMetMoq = isReseller && (itemData?.myReservedQty ?? 0) >= (itemData?.resellerMoq ?? 1)
      const rMoq = isReseller && !alreadyMetMoq ? Math.max(1, itemData?.resellerMoq ?? 1) : 1
      setQty(rMoq)
    }).catch(() => setError('Pre-order not found'))
    .finally(() => setLoading(false))
  }, [id, isReseller])

  const handleReserve = async () => {
    setReserving(true)
    setReserveError('')
    try {
      const res = await fetch(`/api/preorder-item/${id}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qty: Math.min(Math.max(qty, minQty), maxQty), source: isReseller ? 'reseller' : undefined, resellerMoq: isReseller ? (item?.resellerMoq ?? 1) : undefined }),
      })
      const data = await res.json()
      if (res.ok) {
        setReserved({ totalQty: data.totalQty })
      } else {
        setReserveError(data.error || 'Failed to reserve')
      }
    } catch {
      setReserveError('Something went wrong. Please try again.')
    } finally {
      setReserving(false)
    }
  }

  const price = item
    ? isReseller
      ? parseFloat(item.estimatedRetailPrice || item.retailPrice || '0')
      : parseFloat(item.retailPrice || item.estimatedRetailPrice || '0')
    : 0
  const moqAlreadyMet = isReseller && (item?.myReservedQty ?? 0) >= (item?.resellerMoq ?? 1)
  const minQty = isReseller && !moqAlreadyMet ? Math.max(1, item?.resellerMoq ?? 1) : 1
  const maxQty = item?.isLocked && item.availableQty != null ? item.availableQty : Infinity

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#111]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )

  if (error || !item) return (
    <div className="min-h-screen flex items-center justify-center bg-[#111] text-white">
      <div className="text-center">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-2xl font-bold mb-2">Pre-Order Not Found</h1>
        <Link href="/pre-orders" className="mt-4 inline-block px-6 py-3 bg-primary text-white rounded-lg">See All Pre-Orders</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#111] text-white font-play">
      {/* Header */}
      <header className="bg-primary py-4 px-6 flex items-center gap-4">
        <Link href="/" className="text-2xl font-bold">
          <span className="text-white">R66</span>
          <span className="text-black">EMPORIUM</span>
        </Link>
        <Link href={isReseller ? '/resellers-pre-orders' : '/pre-orders'} className="ml-3 text-white/70 text-sm hover:text-white">
          {isReseller ? '← Resellers' : '← All Pre-Orders'}
        </Link>
        <span className="ml-auto text-sm font-bold tracking-widest uppercase bg-black/30 px-4 py-1 rounded-full">
          {isReseller ? 'RESELLER' : 'PRE ORDER'}
        </span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl">

          {/* Product image */}
          <div className="bg-[#1e1e1e] flex items-center justify-center" style={{ minHeight: 360 }}>
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.description} className="max-h-[460px] max-w-full object-contain p-4" />
            ) : (
              <div className="text-gray-600 text-center py-20">
                <div className="text-5xl mb-3">📦</div>
                <p className="text-sm">No image available</p>
              </div>
            )}
          </div>

          <div className="h-2 bg-primary w-full" />

          <div className="p-8 space-y-6">
            {/* Brand + SKU */}
            <div className="flex items-center gap-3 flex-wrap">
              {item.brand && <span className="bg-primary text-white text-sm font-bold px-4 py-1 rounded-full">{item.brand}</span>}
              <span className="text-gray-400 text-sm">SKU: {item.sku}</span>
            </div>

            <h1 className="text-2xl font-bold leading-snug">{item.description}</h1>

            <div>
              <p className="text-gray-400 text-sm mb-1">{isReseller ? 'Reseller Price (Est. Retail)' : 'Retail Price'}</p>
              <p className="text-4xl font-bold text-primary">{price > 0 ? `R ${price.toFixed(2)}` : 'POA'}</p>
            </div>

            {/* ETA + cutoff */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#111] rounded-xl p-4">
                <p className="text-gray-400 text-xs mb-1 uppercase tracking-wider">ETA</p>
                <p className="font-semibold text-lg">{item.eta || '—'}</p>
              </div>
              {item.cutoffDate && (
                <div className="bg-[#111] rounded-xl p-4">
                  <p className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Order Cut-off</p>
                  <p className="font-semibold text-lg">
                    {new Date(item.cutoffDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>

            {/* Reserve section */}
            {reserved ? (
              <div className="bg-green-900/40 border border-green-500 rounded-xl p-6 text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-bold text-green-400 text-lg">Reserved Successfully!</p>
                <p className="text-gray-300 mt-2">You now have <strong>{reserved.totalQty}</strong> unit{reserved.totalQty !== 1 ? 's' : ''} reserved for this item.</p>
                <p className="text-gray-400 text-sm mt-3">We'll contact you to confirm your deposit. A 50% deposit is required to secure your order.</p>
                <Link href={isReseller ? '/resellers-pre-orders' : '/pre-orders'} className="mt-4 inline-block text-primary hover:underline text-sm">← Browse more {isReseller ? 'reseller' : ''} pre-orders</Link>
              </div>
            ) : item?.isLocked && maxQty === 0 ? (
              <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 text-center space-y-2">
                <div className="text-3xl">🔒</div>
                <p className="font-semibold text-white">Reservations Closed</p>
                <p className="text-gray-400 text-sm">The order cut-off has passed and all available stock has been reserved.</p>
                <Link href="/pre-orders" className="mt-2 inline-block text-primary hover:underline text-sm">← Browse other pre-orders</Link>
              </div>
            ) : customer ? (
              <div className="bg-[#111] rounded-xl p-6 space-y-4">
                <p className="text-sm text-gray-400">Reserving as <span className="text-white font-semibold">{customer.firstName} {customer.lastName}</span></p>
                {isReseller && minQty > 1 && (
                  <div className="bg-purple-900/30 border border-purple-500/40 rounded-lg px-4 py-2 text-sm text-purple-300 font-medium">
                    Reseller minimum order: {minQty} units
                  </div>
                )}
                {item?.isLocked && maxQty < Infinity && (
                  <div className="bg-orange-900/30 border border-orange-500/40 rounded-lg px-4 py-2 text-sm text-orange-300 font-medium">
                    Only {maxQty} unit{maxQty !== 1 ? 's' : ''} remaining
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Quantity</label>
                    {isReseller && minQty > 1 && (
                      <span className="text-xs font-semibold text-purple-400 bg-purple-900/30 border border-purple-500/30 px-2 py-0.5 rounded-full">
                        Min {minQty} units
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setQty(q => Math.max(minQty, q - 1))} className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-white/10 text-xl hover:bg-white/10 transition-colors">−</button>
                    <span className="w-12 text-center text-xl font-bold">{Math.min(Math.max(qty, minQty), maxQty)}</span>
                    <button
                      onClick={() => setQty(q => Math.min(q + 1, maxQty))}
                      disabled={qty >= maxQty}
                      className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-white/10 text-xl hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >+</button>
                  </div>
                </div>
                {price > 0 && (
                  <div className="bg-[#1a1a1a] rounded-lg p-4 flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Est. deposit (50%)</span>
                    <span className="font-bold text-primary">R {(price * Math.min(qty, maxQty) * 0.5).toFixed(2)}</span>
                  </div>
                )}
                {reserveError && <p className="text-red-400 text-sm">{reserveError}</p>}
                <button
                  onClick={handleReserve}
                  disabled={reserving || maxQty === 0}
                  className="w-full py-4 bg-primary text-white font-bold rounded-xl text-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {reserving ? 'Reserving…' : `Reserve ${Math.min(qty, maxQty)} Unit${Math.min(qty, maxQty) !== 1 ? 's' : ''}`}
                </button>
              </div>
            ) : (
              <div className="bg-[#111] rounded-xl p-6 text-center space-y-3">
                <p className="text-gray-300">Sign in to reserve this item</p>
                <Link
                  href={`/account/login?returnUrl=/pre-order/${id}`}
                  className="block w-full py-4 bg-primary text-white font-bold rounded-xl text-lg hover:bg-red-700 transition-colors"
                >
                  Sign In to Reserve
                </Link>
                <p className="text-gray-500 text-sm">
                  Don't have an account?{' '}
                  <Link href={`/account/register?returnUrl=/pre-order/${id}`} className="text-primary hover:underline">Create one</Link>
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 bg-[#1a1a1a] rounded-xl p-6 text-sm text-gray-400 space-y-2">
          <p className="font-semibold text-white mb-3">About Pre-Orders</p>
          <p>• Pre-orders secure your item before it arrives in stock</p>
          <p>• A 50% deposit is required to confirm your reservation</p>
          <p>• ETA dates are subject to supplier availability</p>
          <p>• Contact us via WhatsApp for any questions</p>
        </div>
      </main>

      <footer className="bg-[#0a0a0a] text-gray-500 text-center py-6 mt-10 text-sm">
        © {new Date().getFullYear()} R66SLOT · www.r66slot.co.za
      </footer>
    </div>
  )
}
