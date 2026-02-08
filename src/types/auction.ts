export type AuctionStatus = 'draft' | 'scheduled' | 'active' | 'ended' | 'sold' | 'cancelled' | 'unsold'

export type AuctionCondition =
  | 'new_sealed'
  | 'new_open_box'
  | 'used_like_new'
  | 'used_good'
  | 'used_fair'
  | 'for_parts'

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'

export type NotificationType = 'outbid' | 'winner' | 'auction_ending' | 'payment_reminder'

export interface AuctionImage {
  url: string
  alt: string
  width?: number
  height?: number
}

export interface Auction {
  id: string
  title: string
  slug: string
  description: string | null
  description_html: string | null
  category_id: string | null
  brand: string | null
  scale: string | null
  condition: AuctionCondition
  images: AuctionImage[]
  starting_price: number
  reserve_price: number | null
  current_price: number
  bid_increment: number
  bid_count: number
  status: AuctionStatus
  starts_at: string
  ends_at: string
  original_end_time: string
  anti_snipe_seconds: number
  winner_id: string | null
  winner_notified: boolean
  featured: boolean
  created_by: string
  created_at: string
  updated_at: string
  // Joined fields
  category?: AuctionCategory
}

export interface AuctionCategory {
  id: string
  name: string
  slug: string
  description: string | null
  sort_order: number
  created_at: string
}

export interface Bid {
  id: string
  auction_id: string
  bidder_id: string
  amount: number
  is_winning: boolean
  created_at: string
  bidder?: BidderProfile
}

export interface BidderProfile {
  id: string
  r66_customer_id: string
  display_name: string
  email: string
  phone: string | null
  is_banned: boolean
  created_at: string
  updated_at: string
}

export interface WatchlistItem {
  id: string
  bidder_id: string
  auction_id: string
  created_at: string
  auction?: Auction
}

export interface AuctionPayment {
  id: string
  auction_id: string
  bidder_id: string
  amount: number
  currency: string
  stripe_payment_intent: string | null
  stripe_session_id: string | null
  status: PaymentStatus
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface AuctionNotification {
  id: string
  bidder_id: string
  auction_id: string | null
  type: NotificationType
  title: string
  message: string
  read: boolean
  created_at: string
}

export interface AuctionFilters {
  category?: string
  brand?: string
  condition?: AuctionCondition
  status?: AuctionStatus
  minPrice?: number
  maxPrice?: number
  search?: string
  sort?: 'ending_soon' | 'newly_listed' | 'price_low' | 'price_high' | 'most_bids'
  page?: number
  limit?: number
}

export interface PlaceBidResult {
  success: boolean
  error?: string
  bid_id?: string
  amount?: number
  new_price?: number
  bid_count?: number
}

export interface AuctionFormData {
  title: string
  description: string
  category_id: string
  brand: string
  scale: string
  condition: AuctionCondition
  images: AuctionImage[]
  starting_price: number
  reserve_price: number | null
  bid_increment: number
  starts_at: string
  ends_at: string
  anti_snipe_seconds: number
  featured: boolean
}

export const CONDITION_LABELS: Record<AuctionCondition, string> = {
  new_sealed: 'New (Sealed)',
  new_open_box: 'New (Open Box)',
  used_like_new: 'Used - Like New',
  used_good: 'Used - Good',
  used_fair: 'Used - Fair',
  for_parts: 'For Parts',
}

export const STATUS_LABELS: Record<AuctionStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  active: 'Active',
  ended: 'Ended',
  sold: 'Sold',
  cancelled: 'Cancelled',
  unsold: 'Unsold',
}

export const SLOT_CAR_BRANDS = [
  'NSR', 'Revo', 'Pioneer', 'Sideways', 'Slot.it',
  'Carrera', 'Scalextric', 'Policar', 'Fly', 'Scaleauto',
  'Thunderslot', 'BRM', 'MRRC', 'Avant Slot', 'Other',
]

export const SLOT_CAR_SCALES = ['1:32', '1:24', '1:43', 'Other']
