import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { verifyITNSignature } from '@/lib/payfast/client'

/**
 * POST /api/auctions/payment/notify
 * PayFast ITN (Instant Transaction Notification) handler.
 * PayFast POSTs form-encoded data here after every payment event.
 * Must return 200 OK — any other status tells PayFast the notification failed.
 */
export async function POST(request: NextRequest) {
  try {
    const text = await request.text()
    const params = Object.fromEntries(new URLSearchParams(text)) as Record<string, string>

    const passphrase = process.env.PAYFAST_PASSPHRASE

    // Verify signature
    if (!verifyITNSignature(params, passphrase)) {
      console.error('[payfast-itn] Invalid signature', params)
      return new NextResponse('Invalid signature', { status: 400 })
    }

    const { payment_status, m_payment_id, pf_payment_id, amount_gross } = params

    if (payment_status !== 'COMPLETE') {
      // CANCELLED or FAILED — log and acknowledge
      console.log(`[payfast-itn] Non-complete status: ${payment_status} for ${m_payment_id}`)
      return new NextResponse('OK', { status: 200 })
    }

    const supabase = getSupabaseAdmin()

    // Find the payment record by m_payment_id (which is the auction_payments.id or auction id)
    const { data: payment } = await supabase
      .from('auction_payments')
      .select('*')
      .eq('id', m_payment_id)
      .single()

    if (!payment) {
      // Try matching by auction_id as fallback
      const { data: paymentByAuction } = await supabase
        .from('auction_payments')
        .select('*')
        .eq('auction_id', m_payment_id)
        .single()

      if (!paymentByAuction) {
        console.error('[payfast-itn] Payment record not found for m_payment_id:', m_payment_id)
        return new NextResponse('OK', { status: 200 })
      }

      await completePayment(supabase, paymentByAuction, pf_payment_id, amount_gross)
      return new NextResponse('OK', { status: 200 })
    }

    await completePayment(supabase, payment, pf_payment_id, amount_gross)
    return new NextResponse('OK', { status: 200 })
  } catch (err: any) {
    console.error('[payfast-itn] error:', err?.message || err)
    // Still return 200 to prevent PayFast from retrying endlessly
    return new NextResponse('OK', { status: 200 })
  }
}

async function completePayment(
  supabase: any,
  payment: any,
  pfPaymentId: string,
  amountGross: string
) {
  // Update payment record
  await supabase
    .from('auction_payments')
    .update({
      status: 'succeeded',
      payfast_payment_id: pfPaymentId,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id)

  // Mark auction as sold
  await supabase
    .from('auctions')
    .update({ status: 'sold', updated_at: new Date().toISOString() })
    .eq('id', payment.auction_id)

  // Notify the winner
  const { data: auction } = await supabase
    .from('auctions')
    .select('winner_id, title')
    .eq('id', payment.auction_id)
    .single()

  if (auction?.winner_id) {
    await supabase.from('notifications').insert({
      bidder_id: auction.winner_id,
      auction_id: payment.auction_id,
      type: 'payment_received',
      title: 'Payment Confirmed!',
      message: `Your payment of R${Number(amountGross).toFixed(2)} for "${auction.title}" has been received. Thank you!`,
    })
  }

  console.log(`[payfast-itn] Payment completed for auction ${payment.auction_id}, pf_id: ${pfPaymentId}`)
}
