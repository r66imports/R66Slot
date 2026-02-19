'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Auction, AuctionStatus } from '@/types/auction'
import { STATUS_LABELS } from '@/types/auction'
import { getStatusColor, formatPrice } from '@/lib/auction/helpers'

export default function AdminAuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [stats, setStats] = useState({ totalAuctions: 0, activeAuctions: 0, totalBids: 0, totalRevenue: 0 })

  useEffect(() => {
    loadAuctions()
    loadStats()
  }, [filter])

  const loadAuctions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/auctions?status=${filter}`)
      const data = await res.json()
      setAuctions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load auctions:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/auctions/stats')
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this auction?')) return
    try {
      const res = await fetch(`/api/admin/auctions/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setAuctions(prev => prev.filter(a => a.id !== id))
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete')
      }
    } catch (error) {
      alert('Failed to delete auction')
    }
  }

  const handleStatusChange = async (id: string, status: AuctionStatus) => {
    try {
      const res = await fetch(`/api/admin/auctions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        loadAuctions()
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-play">Auction Management</h1>
        <Link
          href="/admin/auctions/new"
          className="px-4 py-2 bg-primary text-secondary rounded-md font-play font-bold hover:bg-primary/90"
        >
          + New Auction
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Auctions', value: stats.totalAuctions },
          { label: 'Active', value: stats.activeAuctions },
          { label: 'Total Bids', value: stats.totalBids },
          { label: 'Revenue', value: formatPrice(stats.totalRevenue) },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-lg p-4 border">
            <p className="text-sm text-gray-500 font-play">{stat.label}</p>
            <p className="text-2xl font-bold font-play">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {['all', 'draft', 'scheduled', 'active', 'ended', 'sold', 'cancelled', 'unsold'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-md text-sm font-play whitespace-nowrap ${
              filter === s ? 'bg-primary text-secondary font-bold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'all' ? 'All' : STATUS_LABELS[s as AuctionStatus]}
          </button>
        ))}
      </div>

      {/* Auction List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 font-play">Loading auctions...</div>
      ) : auctions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500 font-play mb-4">No auctions found</p>
          <Link
            href="/admin/auctions/new"
            className="px-4 py-2 bg-primary text-secondary rounded-md font-play font-bold hover:bg-primary/90"
          >
            Create Your First Auction
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 font-play">Auction</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 font-play hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 font-play">Price</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 font-play hidden sm:table-cell">Bids</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 font-play">Status</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500 font-play">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {auctions.map(auction => (
                <tr key={auction.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {auction.images?.[0] && (
                        <img
                          src={auction.images[0].url}
                          alt=""
                          className="w-10 h-10 rounded object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium font-play text-sm">{auction.title}</p>
                        <p className="text-xs text-gray-500 font-play">
                          {auction.brand && `${auction.brand} `}
                          {auction.scale && `- ${auction.scale}`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-play hidden md:table-cell">
                    {auction.category?.name || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold font-play text-sm">{formatPrice(auction.current_price)}</p>
                    {auction.reserve_price && (
                      <p className="text-xs text-gray-400 font-play">
                        Reserve: {formatPrice(auction.reserve_price)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-play hidden sm:table-cell">
                    {auction.bid_count}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium font-play ${getStatusColor(auction.status)}`}>
                      {STATUS_LABELS[auction.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/auctions/${auction.id}`}
                        className="px-2 py-1 text-xs bg-gray-100 rounded font-play hover:bg-gray-200"
                      >
                        Edit
                      </Link>
                      {auction.status === 'draft' && (
                        <button
                          onClick={() => handleStatusChange(auction.id, 'scheduled')}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded font-play hover:bg-blue-200"
                        >
                          Schedule
                        </button>
                      )}
                      {auction.status === 'active' && (
                        <button
                          onClick={() => handleStatusChange(auction.id, 'cancelled')}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded font-play hover:bg-red-200"
                        >
                          Cancel
                        </button>
                      )}
                      {['draft', 'cancelled'].includes(auction.status) && (
                        <button
                          onClick={() => handleDelete(auction.id)}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded font-play hover:bg-red-200"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
