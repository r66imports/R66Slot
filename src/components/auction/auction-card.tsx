'use client'

import Link from 'next/link'
import type { Auction } from '@/types/auction'
import { CONDITION_LABELS } from '@/types/auction'
import { formatPrice } from '@/lib/auction/helpers'
import CountdownTimer from './countdown-timer'

interface AuctionCardProps {
  auction: Auction
}

export default function AuctionCard({ auction }: AuctionCardProps) {
  const mainImage = auction.images?.[0]?.url || '/placeholder-auction.jpg'

  return (
    <Link
      href={`/auctions/${auction.slug}`}
      className="group bg-white rounded-lg border hover:shadow-lg transition-shadow overflow-hidden"
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        <img
          src={mainImage}
          alt={auction.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {auction.featured && (
          <span className="absolute top-2 left-2 bg-primary text-secondary text-xs font-bold px-2 py-1 rounded font-play">
            FEATURED
          </span>
        )}
        {auction.status === 'active' && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-play">
            <CountdownTimer endsAt={auction.ends_at} />
          </div>
        )}
        {auction.status !== 'active' && (
          <div className="absolute bottom-2 right-2 bg-gray-800/80 text-white text-xs px-2 py-1 rounded font-play">
            {auction.status === 'ended' || auction.status === 'sold' ? 'Sold' : 'Ended'}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-play font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          {auction.title}
        </h3>

        <div className="flex items-center gap-2 text-xs text-gray-500 font-play mb-2">
          {auction.brand && <span>{auction.brand}</span>}
          {auction.scale && <span>{auction.scale}</span>}
          <span>{CONDITION_LABELS[auction.condition]}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-play">Current Bid</p>
            <p className="text-lg font-bold font-play text-primary">{formatPrice(auction.current_price)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 font-play">{auction.bid_count} bid{auction.bid_count !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}
