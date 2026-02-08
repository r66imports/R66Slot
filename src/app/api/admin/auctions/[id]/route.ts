import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { isAdminRequest } from '@/lib/auction/auth'

// GET single auction
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('auctions')
      .select('*, category:auction_categories(*)')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching auction:', error)
    return NextResponse.json(
      { error: 'Failed to fetch auction', details: error?.message },
      { status: 500 }
    )
  }
}

// PUT update auction
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch (parseErr: any) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body', details: parseErr?.message },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      'title', 'description', 'description_html', 'category_id', 'brand',
      'scale', 'condition', 'images', 'starting_price', 'reserve_price',
      'bid_increment', 'status', 'starts_at', 'ends_at', 'anti_snipe_seconds',
      'featured', 'winner_notified',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Convert empty strings to null for nullable fields
        if (['category_id', 'brand', 'scale', 'description', 'description_html', 'reserve_price'].includes(field)) {
          const val = body[field]
          updateData[field] = (val === '' || val === null) ? null : val
        } else {
          updateData[field] = body[field]
        }
      }
    }
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('auctions')
      .update(updateData)
      .eq('id', id)
      .select('*, category:auction_categories(*)')
      .single()

    if (error) {
      console.error('Supabase update error:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
      }
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Duplicate slug conflict. Please change the title.' }, { status: 409 })
      }
      if (error.code === '23503') {
        return NextResponse.json({ error: 'Invalid category. Please choose a valid category or leave it empty.' }, { status: 400 })
      }
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error updating auction:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update auction' },
      { status: 500 }
    )
  }
}

// DELETE auction (only drafts/cancelled)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    // Only allow deleting drafts and cancelled auctions
    const { data: auction } = await supabase
      .from('auctions')
      .select('status')
      .eq('id', id)
      .single()

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }

    if (!['draft', 'cancelled'].includes(auction.status)) {
      return NextResponse.json(
        { error: 'Can only delete draft or cancelled auctions' },
        { status: 400 }
      )
    }

    const { error } = await supabase.from('auctions').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting auction:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to delete auction' },
      { status: 500 }
    )
  }
}
