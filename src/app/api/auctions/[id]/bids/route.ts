import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getBidderFromRequest } from '@/lib/auction/auth'

// GET bids for an auction
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('bids')
      .select('*, bidder:bidder_profiles(id, display_name)')
      .eq('auction_id', id)
      .order('amount', { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching bids:', error)
    return NextResponse.json({ error: 'Failed to fetch bids' }, { status: 500 })
  }
}

// POST place a bid
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const bidder = await getBidderFromRequest()
    if (!bidder) {
      return NextResponse.json({ error: 'Please log in to place a bid' }, { status: 401 })
    }

    const { id } = await params
    const { amount } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid bid amount' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Call the place_bid database function
    const { data, error } = await supabase.rpc('place_bid', {
      p_auction_id: id,
      p_bidder_id: bidder.id,
      p_amount: amount,
    })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error placing bid:', error)
    return NextResponse.json({ error: 'Failed to place bid' }, { status: 500 })
  }
}
