import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getBidderFromRequest } from '@/lib/auction/auth'

export async function GET() {
  try {
    const bidder = await getBidderFromRequest()
    if (!bidder) {
      return NextResponse.json({ error: 'Please log in' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()

    // Get all auctions the user has bid on with their highest bid
    const { data, error } = await supabase
      .from('bids')
      .select('*, auction:auctions(*, category:auction_categories(*))')
      .eq('bidder_id', bidder.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Group by auction, keep highest bid per auction
    const auctionMap = new Map<string, any>()
    for (const bid of data || []) {
      if (!auctionMap.has(bid.auction_id) || bid.amount > auctionMap.get(bid.auction_id).amount) {
        auctionMap.set(bid.auction_id, bid)
      }
    }

    return NextResponse.json(Array.from(auctionMap.values()))
  } catch (error) {
    console.error('Error fetching user bids:', error)
    return NextResponse.json({ error: 'Failed to fetch bids' }, { status: 500 })
  }
}
