import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/auction-checkout'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const auctionId = session.metadata?.auction_id

      if (auctionId) {
        const supabase = getSupabaseAdmin()

        // Update payment status
        await supabase
          .from('auction_payments')
          .update({
            status: 'succeeded',
            stripe_payment_intent: session.payment_intent as string,
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('auction_id', auctionId)

        // Update auction status to sold
        await supabase
          .from('auctions')
          .update({ status: 'sold', updated_at: new Date().toISOString() })
          .eq('id', auctionId)

        // Notify winner
        const { data: auction } = await supabase
          .from('auctions')
          .select('winner_id, title')
          .eq('id', auctionId)
          .single()

        if (auction?.winner_id) {
          await supabase
            .from('notifications')
            .insert({
              bidder_id: auction.winner_id,
              auction_id: auctionId,
              type: 'payment_reminder',
              title: 'Payment Received!',
              message: `Your payment for "${auction.title}" has been confirmed. Thank you!`,
            })
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 400 })
  }
}
