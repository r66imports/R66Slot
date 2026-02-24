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
      `SELECT w.*,
        (SELECT row_to_json(a) FROM (
          SELECT auctions.*,
            (SELECT row_to_json(c) FROM auction_categories c WHERE c.id = auctions.category_id) AS category
          FROM auctions WHERE auctions.id = w.auction_id
        ) a) AS auction
      FROM watchlist w
      WHERE w.bidder_id = $1
      ORDER BY w.created_at DESC`,
      [bidder.id]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching watchlist:', error)
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 })
  }
}
