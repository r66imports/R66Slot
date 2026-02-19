import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getBidderFromRequest } from '@/lib/auction/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const bidder = await getBidderFromRequest()
    if (!bidder) {
      return NextResponse.json({ error: 'Please log in' }, { status: 401 })
    }

    const { id } = await params
    const { action } = await request.json()
    const supabase = getSupabaseAdmin()

    if (action === 'unwatch') {
      await supabase
        .from('watchlist')
        .delete()
        .eq('bidder_id', bidder.id)
        .eq('auction_id', id)
    } else {
      await supabase
        .from('watchlist')
        .upsert(
          { bidder_id: bidder.id, auction_id: id },
          { onConflict: 'bidder_id,auction_id' }
        )
    }

    return NextResponse.json({ success: true, watching: action !== 'unwatch' })
  } catch (error) {
    console.error('Error toggling watchlist:', error)
    return NextResponse.json({ error: 'Failed to update watchlist' }, { status: 500 })
  }
}
