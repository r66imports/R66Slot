import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getBidderFromRequest } from '@/lib/auction/auth'

// GET notifications for current user
export async function GET() {
  try {
    const bidder = await getBidderFromRequest()
    if (!bidder) {
      return NextResponse.json({ error: 'Please log in' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('bidder_id', bidder.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

// PUT mark notification as read
export async function PUT(request: NextRequest) {
  try {
    const bidder = await getBidderFromRequest()
    if (!bidder) {
      return NextResponse.json({ error: 'Please log in' }, { status: 401 })
    }

    const { id } = await request.json()
    const supabase = getSupabaseAdmin()

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('bidder_id', bidder.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}
