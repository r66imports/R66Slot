'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Auction, Bid } from '@/types/auction'

export function useAuctionRealtime(auctionId: string) {
  const [auction, setAuction] = useState<Auction | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)

  // Initial fetch
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

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchAuction(), fetchBids()])
      setLoading(false)
    }
    load()
  }, [fetchAuction, fetchBids])

  // Real-time subscriptions
  useEffect(() => {
    const auctionChannel = supabase
      .channel(`auction-${auctionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'auctions',
          filter: `id=eq.${auctionId}`,
        },
        (payload) => {
          setAuction(prev => prev ? { ...prev, ...payload.new } as Auction : null)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `auction_id=eq.${auctionId}`,
        },
        (payload) => {
          const newBid = payload.new as Bid
          setBids(prev => [newBid, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(auctionChannel)
    }
  }, [auctionId])

  return { auction, bids, loading, refetchAuction: fetchAuction, refetchBids: fetchBids }
}
