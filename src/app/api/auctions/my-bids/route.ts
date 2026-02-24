import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getBidderFromRequest } from '@/lib/auction/auth'

export async function GET() {
  try {
    const bidder = await getBidderFromRequest()
    if (!bidder) {
      return NextResponse.json({ error: 'Please log in' }, { status: 401 })
    }

    const result = await db.query(
      `SELECT b.*,
        (SELECT row_to_json(a) FROM (
          SELECT auctions.*,
            (SELECT row_to_json(c) FROM auction_categories c WHERE c.id = auctions.category_id) AS category
          FROM auctions WHERE auctions.id = b.auction_id
        ) a) AS auction
      FROM bids b
      WHERE b.bidder_id = $1
      ORDER BY b.created_at DESC`,
      [bidder.id]
    )

    // Group by auction, keep highest bid per auction
    const auctionMap = new Map<string, any>()
    for (const bid of result.rows) {
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
