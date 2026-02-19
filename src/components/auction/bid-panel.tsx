'use client'

import { useState } from 'react'
import type { Auction } from '@/types/auction'
import { calculateMinBid, formatPrice } from '@/lib/auction/helpers'
import CountdownTimer from './countdown-timer'

interface BidPanelProps {
  auction: Auction
  isLoggedIn: boolean
  onBidPlaced?: () => void
}

export default function BidPanel({ auction, isLoggedIn, onBidPlaced }: BidPanelProps) {
  const minBid = calculateMinBid(auction.current_price, auction.bid_increment)
  const [bidAmount, setBidAmount] = useState(minBid)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isActive = auction.status === 'active'

  const handleBid = async () => {
    if (!isLoggedIn) {
      setError('Please log in to place a bid')
      return
    }

    if (bidAmount < minBid) {
      setError(`Minimum bid is ${formatPrice(minBid)}`)
      return
    }

    setPlacing(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/auctions/${auction.id}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: bidAmount }),
      })

      const data = await res.json()

      if (data.success) {
        setSuccess(`Bid of ${formatPrice(bidAmount)} placed!`)
        setBidAmount(calculateMinBid(bidAmount, auction.bid_increment))
        onBidPlaced?.()
      } else {
        setError(data.error || 'Failed to place bid')
      }
    } catch {
      setError('Failed to place bid. Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border p-5">
      {/* Current Price */}
      <div className="mb-4">
        <p className="text-sm text-gray-500 font-play">Current Bid</p>
        <p className="text-3xl font-bold font-play text-primary">{formatPrice(auction.current_price)}</p>
        <p className="text-sm text-gray-500 font-play mt-1">
          {auction.bid_count} bid{auction.bid_count !== 1 ? 's' : ''}
          {auction.reserve_price && auction.current_price < auction.reserve_price && (
            <span className="text-orange-500 ml-2">Reserve not met</span>
          )}
        </p>
      </div>

      {/* Countdown */}
      <div className="mb-4 pb-4 border-b">
        <p className="text-sm text-gray-500 font-play mb-1">
          {isActive ? 'Time Remaining' : 'Auction Status'}
        </p>
        {isActive ? (
          <CountdownTimer endsAt={auction.ends_at} className="text-xl" />
        ) : (
          <p className="text-xl font-bold font-play text-gray-500">
            {auction.status === 'ended' || auction.status === 'sold' ? 'Auction Ended' : auction.status}
          </p>
        )}
      </div>

      {/* Bid Input */}
      {isActive ? (
        <div>
          <label className="block text-sm text-gray-500 font-play mb-1">
            Your Bid (min {formatPrice(minBid)})
          </label>
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-play">R</span>
              <input
                type="number"
                min={minBid}
                step={auction.bid_increment}
                value={bidAmount}
                onChange={e => setBidAmount(parseFloat(e.target.value) || minBid)}
                className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-md font-play text-lg font-bold"
              />
            </div>
          </div>

          {/* Quick bid buttons */}
          <div className="flex gap-2 mb-3">
            {[0, 5, 10, 25].map(extra => (
              <button
                key={extra}
                onClick={() => setBidAmount(minBid + extra)}
                className={`flex-1 py-1.5 text-xs rounded font-play border ${
                  bidAmount === minBid + extra
                    ? 'bg-primary text-secondary border-primary'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {extra === 0 ? 'Min' : `+R${extra}`}
              </button>
            ))}
          </div>

          <button
            onClick={handleBid}
            disabled={placing || !isLoggedIn}
            className="w-full py-3 bg-primary text-secondary rounded-md font-play font-bold text-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {placing ? 'Placing Bid...' : !isLoggedIn ? 'Log In to Bid' : `Place Bid - ${formatPrice(bidAmount)}`}
          </button>

          {error && <p className="text-red-500 text-sm font-play mt-2">{error}</p>}
          {success && <p className="text-green-600 text-sm font-play mt-2">{success}</p>}

          <p className="text-xs text-gray-400 font-play mt-3 text-center">
            Anti-snipe: Bids in the last {auction.anti_snipe_seconds}s extend the auction
          </p>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-gray-500 font-play">This auction has ended</p>
          {auction.winner_id && (
            <p className="text-sm text-gray-400 font-play mt-1">
              Won for {formatPrice(auction.current_price)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
