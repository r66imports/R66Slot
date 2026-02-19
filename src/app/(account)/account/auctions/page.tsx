'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Bid, Auction } from '@/types/auction'
import { formatPrice } from '@/lib/auction/helpers'
import CountdownTimer from '@/components/auction/countdown-timer'

interface BidWithAuction extends Bid {
  auction: Auction
}

export default function MyBidsPage() {
  const [bids, setBids] = useState<BidWithAuction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auctions/my-bids')
      .then(r => r.json())
      .then(data => setBids(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-gray-500 font-play">Loading your bids...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold font-play mb-6">My Bids</h2>

      {bids.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <p className="text-gray-500 font-play mb-4">You haven't placed any bids yet.</p>
          <Link
            href="/auctions"
            className="px-4 py-2 bg-primary text-secondary rounded-md font-play font-bold hover:bg-primary/90"
          >
            Browse Auctions
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bids.map(bid => (
            <Link
              key={bid.id}
              href={`/auctions/${bid.auction?.slug || bid.auction_id}`}
              className="flex items-center justify-between bg-white rounded-lg border p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                {bid.auction?.images?.[0] && (
                  <img
                    src={bid.auction.images[0].url}
                    alt=""
                    className="w-16 h-16 rounded object-cover"
                  />
                )}
                <div>
                  <p className="font-play font-medium">{bid.auction?.title || 'Unknown Auction'}</p>
                  <p className="text-sm text-gray-500 font-play">
                    Your bid: <span className="font-bold">{formatPrice(bid.amount)}</span>
                    {bid.is_winning && (
                      <span className="ml-2 text-green-600 font-bold">Winning!</span>
                    )}
                    {!bid.is_winning && bid.auction?.status === 'active' && (
                      <span className="ml-2 text-orange-500">Outbid</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 font-play">
                  Current: <span className="font-bold">{formatPrice(bid.auction?.current_price || 0)}</span>
                </p>
                {bid.auction?.status === 'active' && (
                  <CountdownTimer endsAt={bid.auction.ends_at} className="text-sm" />
                )}
                {bid.auction?.status !== 'active' && (
                  <p className="text-xs text-gray-400 font-play">{bid.auction?.status}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
