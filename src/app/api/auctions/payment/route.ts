import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getBidderFromRequest } from '@/lib/auction/auth'
import { createAuctionCheckoutSession } from '@/lib/stripe/auction-checkout'

// POST - Create Stripe checkout session for won auction
export async function POST(request: NextRequest) {
  try {
    const bidder = await getBidderFromRequest()
    if (!bidder) {
      return NextResponse.json({ error: 'Please log in' }, { status: 401 })
    }

    const { auctionId } = await request.json()
    const supabase = getSupabaseAdmin()

    // Verify the bidder won this auction
    const { data: auction } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .eq('winner_id', bidder.id)
      .eq('status', 'ended')
      .single()

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found or you are not the winner' }, { status: 404 })
    }

    // Check if payment already exists
    const { data: existingPayment } = await supabase
      .from('auction_payments')
      .select('*')
      .eq('auction_id', auctionId)
      .eq('bidder_id', bidder.id)
      .single()

    if (existingPayment?.status === 'succeeded') {
      return NextResponse.json({ error: 'Payment already completed' }, { status: 400 })
    }

    const origin = new URL(request.url).origin

    const session = await createAuctionCheckoutSession({
      auctionId: auction.id,
      auctionTitle: auction.title,
      amount: auction.current_price,
      bidderEmail: bidder.email,
      successUrl: `${origin}/account/auctions/won?payment=success`,
      cancelUrl: `${origin}/account/auctions/won?payment=cancelled`,
    })

    // Update payment record with Stripe session ID
    if (existingPayment) {
      await supabase
        .from('auction_payments')
        .update({
          stripe_session_id: session.id,
          status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPayment.id)
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
