import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { isAdminRequest } from '@/lib/auction/auth'

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()

    const [
      { count: totalAuctions },
      { count: activeAuctions },
      { count: totalBids },
      { data: revenueData },
    ] = await Promise.all([
      supabase.from('auctions').select('*', { count: 'exact', head: true }),
      supabase.from('auctions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('bids').select('*', { count: 'exact', head: true }),
      supabase.from('auction_payments').select('amount').eq('status', 'succeeded'),
    ])

    const totalRevenue = (revenueData || []).reduce((sum, p) => sum + Number(p.amount), 0)

    return NextResponse.json({
      totalAuctions: totalAuctions || 0,
      activeAuctions: activeAuctions || 0,
      totalBids: totalBids || 0,
      totalRevenue,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
