'use client'

import type { Bid } from '@/types/auction'
import { formatPrice } from '@/lib/auction/helpers'

interface LiveBidFeedProps {
  bids: Bid[]
  maxItems?: number
}

export default function LiveBidFeed({ bids, maxItems = 10 }: LiveBidFeedProps) {
  const displayBids = bids.slice(0, maxItems)

  if (displayBids.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-5">
        <h3 className="font-bold font-play mb-3">Bid History</h3>
        <p className="text-gray-400 font-play text-sm text-center py-4">No bids yet. Be the first!</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border p-5">
      <h3 className="font-bold font-play mb-3">Bid History ({bids.length})</h3>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {displayBids.map((bid, i) => (
          <div
            key={bid.id}
            className={`flex items-center justify-between py-2 px-3 rounded-md text-sm ${
              i === 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              {bid.is_winning && (
                <span className="w-2 h-2 bg-green-500 rounded-full" />
              )}
              <span className="font-play font-medium">
                {bid.bidder?.display_name || 'Bidder'}
              </span>
            </div>
            <div className="text-right">
              <span className="font-play font-bold">{formatPrice(bid.amount)}</span>
              <span className="text-xs text-gray-400 font-play ml-2">
                {new Date(bid.created_at).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
