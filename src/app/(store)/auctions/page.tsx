'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Auction } from '@/types/auction'
import AuctionGrid from '@/components/auction/auction-grid'
import AuctionFilters from '@/components/auction/auction-filters'

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadAuctions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), ...filters })
      const res = await fetch(`/api/auctions?${params}`)
      const data = await res.json()
      setAuctions(data.auctions || [])
      setTotalPages(data.totalPages || 1)
    } catch (error) {
      console.error('Failed to load auctions:', error)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => {
    loadAuctions()
  }, [loadAuctions])

  const handleFilterChange = (newFilters: Record<string, string>) => {
    setFilters(newFilters)
    setPage(1)
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold font-play mb-2">
          <span className="text-primary">Live</span> Auctions
        </h1>
        <p className="text-gray-600 font-play">
          Bid on rare and collectible slot cars. All auctions include anti-snipe protection.
        </p>
      </div>

      <AuctionFilters onFilterChange={handleFilterChange} initialFilters={filters} />
      <AuctionGrid auctions={auctions} loading={loading} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded-md font-play text-sm disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 font-play text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border rounded-md font-play text-sm disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
