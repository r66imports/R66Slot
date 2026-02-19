'use client'

import { useState, useEffect } from 'react'
import type { AuctionCategory, AuctionCondition } from '@/types/auction'
import { CONDITION_LABELS, SLOT_CAR_BRANDS } from '@/types/auction'

interface AuctionFiltersProps {
  onFilterChange: (filters: Record<string, string>) => void
  initialFilters?: Record<string, string>
}

export default function AuctionFilters({ onFilterChange, initialFilters = {} }: AuctionFiltersProps) {
  const [categories, setCategories] = useState<AuctionCategory[]>([])
  const [filters, setFilters] = useState(initialFilters)
  const [search, setSearch] = useState(initialFilters.search || '')

  useEffect(() => {
    fetch('/api/auctions/categories')
      .then(r => r.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(console.error)
  }, [])

  const updateFilter = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    if (!value) delete newFilters[key]
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleSearch = () => {
    updateFilter('search', search)
  }

  return (
    <div className="bg-white rounded-lg border p-4 mb-6">
      {/* Search */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search auctions..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md font-play text-sm"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-primary text-secondary rounded-md font-play text-sm font-bold hover:bg-primary/90"
        >
          Search
        </button>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filters.category || ''}
          onChange={e => updateFilter('category', e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md font-play text-sm"
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={filters.brand || ''}
          onChange={e => updateFilter('brand', e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md font-play text-sm"
        >
          <option value="">All Brands</option>
          {SLOT_CAR_BRANDS.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        <select
          value={filters.condition || ''}
          onChange={e => updateFilter('condition', e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md font-play text-sm"
        >
          <option value="">Any Condition</option>
          {Object.entries(CONDITION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select
          value={filters.sort || 'ending_soon'}
          onChange={e => updateFilter('sort', e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md font-play text-sm"
        >
          <option value="ending_soon">Ending Soon</option>
          <option value="newly_listed">Newly Listed</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
          <option value="most_bids">Most Bids</option>
        </select>
      </div>
    </div>
  )
}
