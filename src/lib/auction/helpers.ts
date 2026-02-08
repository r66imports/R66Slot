import type { AuctionStatus } from '@/types/auction'

/**
 * Generate a URL-safe slug from a title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80)
    + '-' + Date.now().toString(36)
}

/**
 * Calculate the minimum bid allowed for an auction
 */
export function calculateMinBid(currentPrice: number, bidIncrement: number): number {
  return Math.round((currentPrice + bidIncrement) * 100) / 100
}

/**
 * Format time remaining as a human-readable string
 */
export function formatTimeRemaining(endsAt: string): string {
  const end = new Date(endsAt).getTime()
  const now = Date.now()
  const diff = end - now

  if (diff <= 0) return 'Ended'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

/**
 * Get the display color for an auction status
 */
export function getStatusColor(status: AuctionStatus): string {
  const colors: Record<AuctionStatus, string> = {
    draft: 'bg-gray-100 text-gray-700',
    scheduled: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    ended: 'bg-yellow-100 text-yellow-700',
    sold: 'bg-purple-100 text-purple-700',
    cancelled: 'bg-red-100 text-red-700',
    unsold: 'bg-orange-100 text-orange-700',
  }
  return colors[status]
}

/**
 * Format a price in Rand
 */
export function formatPrice(amount: number): string {
  return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Check if an auction is ending soon (within 5 minutes)
 */
export function isEndingSoon(endsAt: string): boolean {
  const end = new Date(endsAt).getTime()
  const diff = end - Date.now()
  return diff > 0 && diff <= 5 * 60 * 1000
}

/**
 * Check if an auction has ended based on its end time
 */
export function hasAuctionEnded(endsAt: string): boolean {
  return new Date(endsAt).getTime() <= Date.now()
}
