'use client'

import { useState } from 'react'

interface WatchButtonProps {
  auctionId: string
  initialWatching?: boolean
  isLoggedIn: boolean
}

export default function WatchButton({ auctionId, initialWatching = false, isLoggedIn }: WatchButtonProps) {
  const [watching, setWatching] = useState(initialWatching)
  const [loading, setLoading] = useState(false)

  const toggleWatch = async () => {
    if (!isLoggedIn) return

    setLoading(true)
    try {
      const res = await fetch(`/api/auctions/${auctionId}/watch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: watching ? 'unwatch' : 'watch' }),
      })

      if (res.ok) {
        setWatching(!watching)
      }
    } catch (error) {
      console.error('Error toggling watchlist:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggleWatch}
      disabled={loading || !isLoggedIn}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-play transition-colors ${
        watching
          ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
      } disabled:opacity-50`}
      title={!isLoggedIn ? 'Log in to watch' : watching ? 'Remove from watchlist' : 'Add to watchlist'}
    >
      <span>{watching ? '\u2665' : '\u2661'}</span>
      {watching ? 'Watching' : 'Watch'}
    </button>
  )
}
