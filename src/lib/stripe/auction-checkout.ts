import Stripe from 'stripe'

let _stripe: Stripe | null = null
function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-01-28.clover',
    })
  }
  return _stripe
}
const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as any)[prop]
  },
})

export async function createAuctionCheckoutSession({
  auctionId,
  auctionTitle,
  amount,
  bidderEmail,
  successUrl,
  cancelUrl,
}: {
  auctionId: string
  auctionTitle: string
  amount: number
  bidderEmail: string
  successUrl: string
  cancelUrl: string
}) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    customer_email: bidderEmail,
    line_items: [
      {
        price_data: {
          currency: 'zar',
          product_data: {
            name: `Auction Win: ${auctionTitle}`,
            description: `Payment for won auction item`,
          },
          unit_amount: Math.round(amount * 100), // Stripe uses cents
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      auction_id: auctionId,
    },
  })

  return session
}

export { stripe }
