import { Metadata } from 'next'
import { blobRead } from '@/lib/blob-storage'
import BookingPageClient from './client'

type PosterData = {
  id: string
  shortCode: string
  orderType: 'new-order' | 'pre-order'
  sku: string
  itemDescription: string
  estimatedDeliveryDate: string
  brand: string
  description: string
  preOrderPrice: string
  availableQty: number
  imageUrl: string
  posterImageUrl?: string // The generated poster image for WhatsApp
}

async function getPosterByCode(code: string): Promise<PosterData | null> {
  try {
    // List all posters and find by short code
    const { blobListWithUrls } = await import('@/lib/blob-storage')
    const urls = await blobListWithUrls('data/slotcar-orders/')
    const jsonEntries = urls.filter((e) => e.pathname.endsWith('.json'))

    for (const entry of jsonEntries) {
      try {
        const response = await fetch(entry.url, { next: { revalidate: 60 } })
        if (response.ok) {
          const poster = await response.json() as PosterData
          if (poster.shortCode === code) {
            return poster
          }
        }
      } catch {
        continue
      }
    }
    return null
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>
}): Promise<Metadata> {
  const { code } = await params
  const poster = await getPosterByCode(code)

  if (!poster) {
    return {
      title: 'Booking Not Found - R66SLOT',
    }
  }

  // Use the poster image (product image) for OG
  const imageUrl = poster.posterImageUrl || poster.imageUrl || ''

  return {
    title: `${poster.itemDescription} - R66SLOT`,
    description: `${poster.orderType === 'pre-order' ? 'Pre-Order' : 'Order'} ${poster.itemDescription} - R${poster.preOrderPrice} - ${poster.brand}`,
    openGraph: {
      title: `${poster.orderType === 'pre-order' ? '🎯 PRE-ORDER' : '✨ NEW'} ${poster.itemDescription}`,
      description: `${poster.brand} - R${poster.preOrderPrice}\n${poster.description || ''}`,
      images: imageUrl ? [{ url: imageUrl, width: 800, height: 800 }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${poster.itemDescription} - R${poster.preOrderPrice}`,
      description: `${poster.brand} ${poster.orderType === 'pre-order' ? 'Pre-Order' : 'Available Now'}`,
      images: imageUrl ? [imageUrl] : [],
    },
  }
}

export default async function BookHerePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const poster = await getPosterByCode(code)

  return <BookingPageClient code={code} initialPoster={poster} />
}
