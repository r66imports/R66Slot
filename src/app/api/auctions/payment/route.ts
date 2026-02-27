import { NextRequest, NextResponse } from 'next/server'
import { getBidderFromRequest } from '@/lib/auction/auth'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { buildPayFastParams, PAYFAST_URL } from '@/lib/payfast/client'

// POST — generate PayFast payment form params for a won auction
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
      return NextResponse.json(
        { error: 'Auction not found or you are not the winner' },
        { status: 404 }
      )
    }

    // Check if already paid
    const { data: existingPayment } = await supabase
      .from('auction_payments')
      .select('*')
      .eq('auction_id', auctionId)
      .eq('bidder_id', bidder.id)
      .single()

    if (existingPayment?.status === 'succeeded') {
      return NextResponse.json({ error: 'Payment already completed' }, { status: 400 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.r66slot.co.za'
    const mPaymentId = existingPayment?.id || auctionId

    const params = buildPayFastParams({
      returnUrl: `${siteUrl}/account/auctions/won?payment=success`,
      cancelUrl: `${siteUrl}/account/auctions/payment/${auctionId}?payment=cancelled`,
      notifyUrl: `${siteUrl}/api/auctions/payment/notify`,
      nameFirst: bidder.display_name || bidder.email.split('@')[0],
      emailAddress: bidder.email,
      mPaymentId,
      amount: Number(auction.current_price),
      itemName: auction.title.slice(0, 100),
      itemDescription: `Won auction #${auctionId.slice(-8).toUpperCase()}`,
    })

    // Mark payment as processing
    if (existingPayment) {
      await supabase
        .from('auction_payments')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', existingPayment.id)
    }

    return NextResponse.json({ url: PAYFAST_URL, params })
  } catch (error: any) {
    console.error('[payment] error:', error?.message || error)
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
  }
}
