'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuctionRealtime } from '@/hooks/useAuctionRealtime'
import { CONDITION_LABELS } from '@/types/auction'
import AuctionImageGallery from '@/components/auction/auction-image-gallery'
import BidPanel from '@/components/auction/bid-panel'
import LiveBidFeed from '@/components/auction/live-bid-feed'
import WatchButton from '@/components/auction/watch-button'

export default function AuctionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [auctionId, setAuctionId] = useState<string>('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Resolve slug to ID first
  useEffect(() => {
    fetch(`/api/auctions/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.id) setAuctionId(data.id)
      })
      .catch(console.error)
  }, [slug])

  // Check login status
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { setIsLoggedIn(r.ok); return r })
      .catch(() => setIsLoggedIn(false))
  }, [])

  const { auction, bids, loading, refetchBids } = useAuctionRealtime(auctionId || slug)

  if (loading || !auction) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 aspect-square bg-gray-200 rounded-lg" />
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded-lg" />
              <div className="h-48 bg-gray-200 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 font-play mb-6">
        <Link href="/auctions" className="hover:text-primary">Auctions</Link>
        <span>/</span>
        {auction.category && (
          <>
            <span>{auction.category.name}</span>
            <span>/</span>
          </>
        )}
        <span className="text-gray-900">{auction.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Images */}
        <div className="lg:col-span-2">
          <AuctionImageGallery images={auction.images} title={auction.title} />

          {/* Details */}
          <div className="mt-6 bg-white rounded-lg border p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold font-play">{auction.title}</h1>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 font-play">
                  {auction.brand && <span>{auction.brand}</span>}
                  {auction.scale && <span>{auction.scale}</span>}
                  <span>{CONDITION_LABELS[auction.condition]}</span>
                </div>
              </div>
              <WatchButton
                auctionId={auction.id}
                isLoggedIn={isLoggedIn}
              />
            </div>

            {auction.description && (
              <div className="border-t pt-4">
                <h2 className="font-bold font-play mb-2">Description</h2>
                <div className="text-gray-600 font-play text-sm whitespace-pre-wrap">
                  {auction.description}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Bidding */}
        <div className="space-y-4">
          <BidPanel
            auction={auction}
            isLoggedIn={isLoggedIn}
            onBidPlaced={refetchBids}
          />
          <LiveBidFeed bids={bids} />
        </div>
      </div>
    </div>
  )
}
