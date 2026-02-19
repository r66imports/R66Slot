'use client'

import { useState } from 'react'
import type { AuctionImage } from '@/types/auction'

interface AuctionImageGalleryProps {
  images: AuctionImage[]
  title: string
}

export default function AuctionImageGallery({ images, title }: AuctionImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
        <span className="text-gray-400 font-play">No image available</span>
      </div>
    )
  }

  return (
    <div>
      {/* Main image */}
      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3">
        <img
          src={images[selectedIndex].url}
          alt={images[selectedIndex].alt || title}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelectedIndex(i)}
              className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                i === selectedIndex ? 'border-primary' : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <img
                src={img.url}
                alt={img.alt || ''}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
