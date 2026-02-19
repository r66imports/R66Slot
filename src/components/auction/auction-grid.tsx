'use client'

import type { Auction } from '@/types/auction'
import AuctionCard from './auction-card'

interface AuctionGridProps {
  auctions: Auction[]
  loading?: boolean
}

export default function AuctionGrid({ auctions, loading }: AuctionGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border overflow-hidden animate-pulse">
            <div className="aspect-square bg-gray-200" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-6 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (auctions.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-lg border">
        <p className="text-gray-500 font-play text-lg mb-2">No auctions found</p>
        <p className="text-gray-400 font-play text-sm">Check back soon for new listings!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {auctions.map(auction => (
        <AuctionCard key={auction.id} auction={auction} />
      ))}
    </div>
  )
}
