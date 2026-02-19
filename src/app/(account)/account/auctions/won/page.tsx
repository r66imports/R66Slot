'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Bid, Auction } from '@/types/auction'
import { formatPrice } from '@/lib/auction/helpers'

interface BidWithAuction extends Bid {
  auction: Auction
}

export default function WonAuctionsPage() {
  const [bids, setBids] = useState<BidWithAuction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auctions/my-bids')
      .then(r => r.json())
      .then(data => {
        const allBids: BidWithAuction[] = Array.isArray(data) ? data : []
        // Filter to only won auctions
        const won = allBids.filter(b =>
          b.is_winning && ['ended', 'sold'].includes(b.auction?.status)
        )
        setBids(won)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-gray-500 font-play">Loading won auctions...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold font-play mb-6">Won Auctions</h2>

      {bids.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <p className="text-gray-500 font-play mb-4">You haven't won any auctions yet.</p>
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
            <div
              key={bid.id}
              className="bg-white rounded-lg border p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {bid.auction?.images?.[0] && (
                    <img
                      src={bid.auction.images[0].url}
                      alt=""
                      className="w-16 h-16 rounded object-cover"
                    />
                  )}
                  <div>
                    <p className="font-play font-medium">{bid.auction?.title}</p>
                    <p className="text-sm text-gray-500 font-play">
                      Won for <span className="font-bold text-green-600">{formatPrice(bid.amount)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {bid.auction?.status === 'ended' && (
                    <Link
                      href={`/account/auctions/payment/${bid.auction_id}`}
                      className="px-4 py-2 bg-primary text-secondary rounded-md font-play font-bold text-sm hover:bg-primary/90"
                    >
                      Pay Now
                    </Link>
                  )}
                  {bid.auction?.status === 'sold' && (
                    <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-md font-play text-sm font-bold">
                      Paid
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
