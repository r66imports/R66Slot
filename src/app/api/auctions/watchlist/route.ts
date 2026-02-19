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
    const { data, error } = await supabase
      .from('watchlist')
      .select('*, auction:auctions(*, category:auction_categories(*))')
      .eq('bidder_id', bidder.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching watchlist:', error)
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 })
  }
}
