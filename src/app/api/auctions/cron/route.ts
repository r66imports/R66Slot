import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

// POST - Called by Vercel Cron every minute to manage auction lifecycle
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()

    // Activate scheduled auctions
    const { data: activated } = await supabase.rpc('activate_scheduled_auctions')

    // Close expired auctions
    const { data: closed } = await supabase.rpc('close_expired_auctions')

    return NextResponse.json({
      activated: activated?.activated || 0,
      closed: closed?.closed || 0,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}

// Also support GET for manual triggering in development
export async function GET(request: NextRequest) {
  return POST(request)
}
