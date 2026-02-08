'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import AuctionForm from '@/components/admin/auction-form'
import type { Auction, AuctionFormData, Bid } from '@/types/auction'
import { formatPrice } from '@/lib/auction/helpers'

export default function EditAuctionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [auction, setAuction] = useState<Auction | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingAuction, setLoadingAuction] = useState(true)

  useEffect(() => {
    loadAuction()
    loadBids()
  }, [id])

  const loadAuction = async () => {
    try {
      const res = await fetch(`/api/admin/auctions/${id}`)
      if (res.ok) {
        setAuction(await res.json())
      }
    } catch (error) {
      console.error('Error loading auction:', error)
    } finally {
      setLoadingAuction(false)
    }
  }

  const loadBids = async () => {
    try {
      const res = await fetch(`/api/auctions/${id}/bids`)
      if (res.ok) {
        setBids(await res.json())
      }
    } catch {
      // Bids endpoint may not exist yet
    }
  }

  const handleSubmit = async (data: AuctionFormData) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/auctions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        let errMsg = 'Failed to update auction'
        try {
          const err = await res.json()
          errMsg = err.error || err.details || errMsg
        } catch {}
        alert(errMsg)
        return
      }

      router.push('/admin/auctions')
    } catch (error: any) {
      console.error('Error updating auction:', error)
      alert(`Failed to update auction: ${error?.message || 'Network error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingAuction) {
    return <div className="p-6 text-gray-500 font-play">Loading auction...</div>
  }

  if (!auction) {
    return <div className="p-6 text-red-500 font-play">Auction not found</div>
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-play">Edit Auction</h1>
        <p className="text-gray-500 font-play text-sm mt-1">{auction.title}</p>
      </div>

      <div className="bg-white rounded-lg border p-6 mb-6">
        <AuctionForm auction={auction} onSubmit={handleSubmit} isLoading={isLoading} />
      </div>

      {/* Bid History */}
      {bids.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-bold font-play mb-4">Bid History ({bids.length})</h2>
          <div className="space-y-2">
            {bids.map(bid => (
              <div key={bid.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <span className="font-play text-sm font-medium">{bid.bidder?.display_name || 'Anonymous'}</span>
                  {bid.is_winning && (
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-play">
                      Winning
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold font-play">{formatPrice(bid.amount)}</p>
                  <p className="text-xs text-gray-400 font-play">
                    {new Date(bid.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
