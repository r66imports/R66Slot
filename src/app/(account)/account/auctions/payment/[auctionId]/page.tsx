'use client'

import { useState, useEffect, useRef, use } from 'react'
import type { Auction } from '@/types/auction'
import { formatPrice } from '@/lib/auction/helpers'

export default function AuctionPaymentPage({ params }: { params: Promise<{ auctionId: string }> }) {
  const { auctionId } = use(params)
  const [auction, setAuction] = useState<Auction | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [payfastData, setPayfastData] = useState<{ url: string; params: Record<string, string> } | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    fetch(`/api/auctions/${auctionId}`)
      .then(r => r.json())
      .then(setAuction)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [auctionId])

  // Auto-submit the hidden PayFast form once data is ready
  useEffect(() => {
    if (payfastData && formRef.current) {
      formRef.current.submit()
    }
  }, [payfastData])

  const handlePayment = async () => {
    setPaying(true)
    setError('')
    try {
      const res = await fetch('/api/auctions/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auctionId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create payment session')
        setPaying(false)
        return
      }

      if (data.url && data.params) {
        setPayfastData({ url: data.url, params: data.params })
        // form auto-submits via useEffect above
      } else {
        setError('Invalid payment response')
        setPaying(false)
      }
    } catch {
      setError('Failed to start payment')
      setPaying(false)
    }
  }

  if (loading) {
    return <div className="text-gray-500 font-play">Loading...</div>
  }

  if (!auction) {
    return <div className="text-red-500 font-play">Auction not found</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold font-play mb-6">Complete Payment</h2>

      <div className="bg-white rounded-lg border p-6 max-w-lg">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b">
          {auction.images?.[0] && (
            <img
              src={auction.images[0].url}
              alt={auction.title}
              className="w-24 h-24 rounded object-cover"
            />
          )}
          <div>
            <h3 className="font-play font-bold">{auction.title}</h3>
            <p className="text-sm text-gray-500 font-play">
              {auction.brand} {auction.scale}
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between font-play">
            <span className="text-gray-600">Winning Bid</span>
            <span className="font-bold">{formatPrice(auction.current_price)}</span>
          </div>
          <div className="flex justify-between font-play border-t pt-3">
            <span className="font-bold">Total Due</span>
            <span className="text-xl font-bold text-primary">{formatPrice(auction.current_price)}</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm font-play">
            {error}
          </div>
        )}

        <button
          onClick={handlePayment}
          disabled={paying}
          className="w-full py-3 bg-primary text-secondary rounded-md font-play font-bold text-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {paying ? 'Redirecting to PayFast...' : `Pay ${formatPrice(auction.current_price)}`}
        </button>

        <p className="text-xs text-gray-400 font-play mt-3 text-center">
          You'll be redirected to PayFast for secure payment
        </p>
      </div>

      {/* Hidden form that auto-submits to PayFast */}
      {payfastData && (
        <form
          ref={formRef}
          action={payfastData.url}
          method="POST"
          style={{ display: 'none' }}
        >
          {Object.entries(payfastData.params).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
        </form>
      )}
    </div>
  )
}
