'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Auction, WatchlistItem } from '@/types/auction'
import { formatPrice } from '@/lib/auction/helpers'
import CountdownTimer from '@/components/auction/countdown-timer'

interface WatchlistItemWithAuction extends WatchlistItem {
  auction: Auction
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItemWithAuction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auctions/watchlist')
      .then(r => r.json())
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const removeFromWatchlist = async (auctionId: string) => {
    try {
      await fetch(`/api/auctions/${auctionId}/watch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unwatch' }),
      })
      setItems(prev => prev.filter(i => i.auction_id !== auctionId))
    } catch (error) {
      console.error('Error removing from watchlist:', error)
    }
  }

  if (loading) {
    return <div className="text-gray-500 font-play">Loading watchlist...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold font-play mb-6">My Watchlist</h2>

      {items.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <p className="text-gray-500 font-play mb-4">Your watchlist is empty.</p>
          <Link
            href="/auctions"
            className="px-4 py-2 bg-primary text-secondary rounded-md font-play font-bold hover:bg-primary/90"
          >
            Browse Auctions
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between bg-white rounded-lg border p-4"
            >
              <Link
                href={`/auctions/${item.auction?.slug || item.auction_id}`}
                className="flex items-center gap-4 flex-1 hover:opacity-80"
              >
                {item.auction?.images?.[0] && (
                  <img
                    src={item.auction.images[0].url}
                    alt=""
                    className="w-16 h-16 rounded object-cover"
                  />
                )}
                <div>
                  <p className="font-play font-medium">{item.auction?.title || 'Unknown'}</p>
                  <p className="text-sm text-gray-500 font-play">
                    Current: <span className="font-bold">{formatPrice(item.auction?.current_price || 0)}</span>
                    <span className="ml-2">{item.auction?.bid_count || 0} bids</span>
                  </p>
                </div>
              </Link>
              <div className="flex items-center gap-3">
                {item.auction?.status === 'active' && (
                  <CountdownTimer endsAt={item.auction.ends_at} className="text-sm" />
                )}
                <button
                  onClick={() => removeFromWatchlist(item.auction_id)}
                  className="text-red-400 hover:text-red-600 text-sm font-play"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
