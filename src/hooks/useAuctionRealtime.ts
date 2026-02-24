'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { Auction, Bid } from '@/types/auction'

const POLL_INTERVAL = 4000 // 4 seconds

export function useAuctionRealtime(auctionId: string) {
  const [auction, setAuction] = useState<Auction | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchAuction = useCallback(async () => {
    try {
      const res = await fetch(`/api/auctions/${auctionId}`)
      if (res.ok) setAuction(await res.json())
    } catch (error) {
      console.error('Error fetching auction:', error)
    }
  }, [auctionId])

  const fetchBids = useCallback(async () => {
    try {
      const res = await fetch(`/api/auctions/${auctionId}/bids`)
      if (res.ok) setBids(await res.json())
    } catch (error) {
      console.error('Error fetching bids:', error)
    }
  }, [auctionId])

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchAuction(), fetchBids()])
      setLoading(false)
    }
    load()
  }, [fetchAuction, fetchBids])

  // Poll for updates every 4 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchAuction()
      fetchBids()
    }, POLL_INTERVAL)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchAuction, fetchBids])

  return { auction, bids, loading, refetchAuction: fetchAuction, refetchBids: fetchBids }
}
