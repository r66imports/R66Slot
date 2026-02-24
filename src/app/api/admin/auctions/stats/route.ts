import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdminRequest } from '@/lib/auction/auth'

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [totalRes, activeRes, bidsRes, revenueRes] = await Promise.all([
      db.query('SELECT COUNT(*) FROM auctions'),
      db.query("SELECT COUNT(*) FROM auctions WHERE status = 'active'"),
      db.query('SELECT COUNT(*) FROM bids'),
      db.query("SELECT COALESCE(SUM(amount), 0) AS total FROM auction_payments WHERE status = 'succeeded'"),
    ])

    return NextResponse.json({
      totalAuctions: parseInt(totalRes.rows[0].count),
      activeAuctions: parseInt(activeRes.rows[0].count),
      totalBids: parseInt(bidsRes.rows[0].count),
      totalRevenue: parseFloat(revenueRes.rows[0].total),
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
