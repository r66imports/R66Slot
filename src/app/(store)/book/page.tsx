import { Metadata } from 'next'
import BookNowClient from './client'

export const metadata: Metadata = {
  title: 'Book Now - R66SLOT',
  description: 'Browse and book premium slot cars and collectibles from R66SLOT. Pre-orders and new arrivals available.',
  openGraph: {
    title: 'Book Now - R66SLOT',
    description: 'Browse and book premium slot cars and collectibles',
    type: 'website',
  },
}

export default function BookNowPage() {
  return <BookNowClient />
}
