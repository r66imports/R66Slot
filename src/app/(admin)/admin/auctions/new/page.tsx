'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AuctionForm from '@/components/admin/auction-form'
import type { AuctionFormData } from '@/types/auction'

export default function NewAuctionPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: AuctionFormData) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        let errMsg = 'Failed to create auction'
        try {
          const err = await res.json()
          errMsg = err.error || err.details || errMsg
        } catch {}
        alert(errMsg)
        return
      }

      router.push('/admin/auctions')
    } catch (error: any) {
      console.error('Error creating auction:', error)
      alert(`Failed to create auction: ${error?.message || 'Network error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-play">Create New Auction</h1>
        <p className="text-gray-500 font-play text-sm mt-1">
          Fill in the details below to create a new auction listing.
        </p>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <AuctionForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>
    </div>
  )
}
