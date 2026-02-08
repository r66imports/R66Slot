'use client'

import { useState, useEffect } from 'react'
import type { Auction, AuctionCategory, AuctionCondition, AuctionFormData, AuctionImage } from '@/types/auction'
import { CONDITION_LABELS, SLOT_CAR_BRANDS, SLOT_CAR_SCALES } from '@/types/auction'

interface AuctionFormProps {
  auction?: Auction | null
  onSubmit: (data: AuctionFormData) => Promise<void>
  isLoading?: boolean
}

export default function AuctionForm({ auction, onSubmit, isLoading }: AuctionFormProps) {
  const [categories, setCategories] = useState<AuctionCategory[]>([])
  const [imageUrl, setImageUrl] = useState('')
  const [form, setForm] = useState<AuctionFormData>({
    title: '',
    description: '',
    category_id: '',
    brand: '',
    scale: '1:32',
    condition: 'new_sealed',
    images: [],
    starting_price: 0,
    reserve_price: null,
    bid_increment: 1.00,
    starts_at: '',
    ends_at: '',
    anti_snipe_seconds: 30,
    featured: false,
  })

  useEffect(() => {
    fetch('/api/admin/auctions/categories')
      .then(r => r.json())
      .then(setCategories)
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (auction) {
      setForm({
        title: auction.title,
        description: auction.description || '',
        category_id: auction.category_id || '',
        brand: auction.brand || '',
        scale: auction.scale || '1:32',
        condition: auction.condition,
        images: auction.images || [],
        starting_price: auction.starting_price,
        reserve_price: auction.reserve_price,
        bid_increment: auction.bid_increment,
        starts_at: auction.starts_at ? new Date(auction.starts_at).toISOString().slice(0, 16) : '',
        ends_at: auction.ends_at ? new Date(auction.ends_at).toISOString().slice(0, 16) : '',
        anti_snipe_seconds: auction.anti_snipe_seconds,
        featured: auction.featured,
      })
    }
  }, [auction])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(form)
  }

  const addImage = () => {
    if (!imageUrl.trim()) return
    setForm(prev => ({
      ...prev,
      images: [...prev.images, { url: imageUrl.trim(), alt: prev.title }],
    }))
    setImageUrl('')
  }

  const removeImage = (index: number) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
  }

  const setNow = () => {
    setForm(prev => ({
      ...prev,
      starts_at: new Date().toISOString().slice(0, 16),
    }))
  }

  const setEndFromDuration = (hours: number) => {
    const start = form.starts_at ? new Date(form.starts_at) : new Date()
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000)
    setForm(prev => ({
      ...prev,
      starts_at: prev.starts_at || new Date().toISOString().slice(0, 16),
      ends_at: end.toISOString().slice(0, 16),
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 font-play mb-1">
          Auction Title *
        </label>
        <input
          type="text"
          required
          value={form.title}
          onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary font-play"
          placeholder="e.g., NSR Ford GT40 MkII - Gulf Livery"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 font-play mb-1">
          Description
        </label>
        <textarea
          rows={4}
          value={form.description}
          onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary font-play"
          placeholder="Describe the item, its features, and condition..."
        />
      </div>

      {/* Category + Brand + Scale row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 font-play mb-1">Category</label>
          <select
            value={form.category_id}
            onChange={e => setForm(prev => ({ ...prev, category_id: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-play"
          >
            <option value="">Select category</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 font-play mb-1">Brand</label>
          <select
            value={form.brand}
            onChange={e => setForm(prev => ({ ...prev, brand: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-play"
          >
            <option value="">Select brand</option>
            {SLOT_CAR_BRANDS.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 font-play mb-1">Scale</label>
          <select
            value={form.scale}
            onChange={e => setForm(prev => ({ ...prev, scale: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-play"
          >
            {SLOT_CAR_SCALES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Condition */}
      <div>
        <label className="block text-sm font-medium text-gray-700 font-play mb-1">Condition *</label>
        <select
          value={form.condition}
          onChange={e => setForm(prev => ({ ...prev, condition: e.target.value as AuctionCondition }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-play"
        >
          {Object.entries(CONDITION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Images */}
      <div>
        <label className="block text-sm font-medium text-gray-700 font-play mb-1">Images</label>
        <div className="flex gap-2 mb-2">
          <input
            type="url"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            placeholder="Paste image URL..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md font-play"
          />
          <button
            type="button"
            onClick={addImage}
            className="px-4 py-2 bg-primary text-secondary rounded-md font-play hover:bg-primary/90"
          >
            Add
          </button>
        </div>
        {form.images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.images.map((img, i) => (
              <div key={i} className="relative group">
                <img
                  src={img.url}
                  alt={img.alt}
                  className="w-20 h-20 object-cover rounded border"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pricing row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 font-play mb-1">Starting Price (R) *</label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={form.starting_price || ''}
            onChange={e => setForm(prev => ({ ...prev, starting_price: parseFloat(e.target.value) || 0 }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-play"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 font-play mb-1">Reserve Price (R)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.reserve_price ?? ''}
            onChange={e => setForm(prev => ({ ...prev, reserve_price: e.target.value ? parseFloat(e.target.value) : null }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-play"
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 font-play mb-1">Bid Increment (R)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.bid_increment || ''}
            onChange={e => setForm(prev => ({ ...prev, bid_increment: parseFloat(e.target.value) || 1 }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-play"
          />
        </div>
      </div>

      {/* Timing */}
      <div>
        <label className="block text-sm font-medium text-gray-700 font-play mb-2">Auction Timing *</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start Time</label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                required
                value={form.starts_at}
                onChange={e => setForm(prev => ({ ...prev, starts_at: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md font-play"
              />
              <button type="button" onClick={setNow} className="px-3 py-2 text-xs bg-gray-200 rounded-md font-play hover:bg-gray-300">
                Now
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">End Time</label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                required
                value={form.ends_at}
                onChange={e => setForm(prev => ({ ...prev, ends_at: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md font-play"
              />
            </div>
            <div className="flex gap-1 mt-1">
              {[1, 3, 5, 7].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setEndFromDuration(d * 24)}
                  className="px-2 py-1 text-xs bg-gray-100 rounded font-play hover:bg-gray-200"
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Anti-snipe + Featured */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 font-play mb-1">Anti-Snipe Extension (seconds)</label>
          <input
            type="number"
            min="0"
            max="300"
            value={form.anti_snipe_seconds}
            onChange={e => setForm(prev => ({ ...prev, anti_snipe_seconds: parseInt(e.target.value) || 30 }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-play"
          />
          <p className="text-xs text-gray-500 mt-1">Extends auction if bid placed in final N seconds</p>
        </div>
        <div className="flex items-center pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={e => setForm(prev => ({ ...prev, featured: e.target.checked }))}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-gray-700 font-play">Featured Auction</span>
          </label>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-primary text-secondary rounded-md font-play font-bold hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : auction ? 'Update Auction' : 'Create Auction'}
        </button>
      </div>
    </form>
  )
}
