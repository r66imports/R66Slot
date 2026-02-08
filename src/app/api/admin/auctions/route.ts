import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { isAdminRequest } from '@/lib/auction/auth'
import { generateSlug } from '@/lib/auction/helpers'
import type { AuctionFormData } from '@/types/auction'

// GET all auctions (admin list)
export async function GET(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('auctions')
      .select('*, category:auction_categories(*)')
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Error fetching auctions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch auctions', details: error?.message },
      { status: 500 }
    )
  }
}

// POST create new auction
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()

    let body: AuctionFormData
    try {
      body = await request.json()
    } catch (parseErr: any) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body', details: parseErr?.message },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!body.starts_at || !body.ends_at) {
      return NextResponse.json({ error: 'Start and end times are required' }, { status: 400 })
    }
    if (!body.starting_price || body.starting_price <= 0) {
      return NextResponse.json({ error: 'Starting price must be greater than 0' }, { status: 400 })
    }

    const slug = generateSlug(body.title)
    const startsAt = new Date(body.starts_at)
    const endsAt = new Date(body.ends_at)
    const now = new Date()

    if (endsAt <= startsAt) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
    }

    let status: string = 'draft'
    if (startsAt <= now && endsAt > now) {
      status = 'active'
    } else if (startsAt > now) {
      status = 'scheduled'
    }

    const insertData: Record<string, unknown> = {
      title: body.title.trim(),
      slug,
      description: body.description || null,
      description_html: body.description || null,
      category_id: body.category_id && body.category_id.trim() !== '' ? body.category_id : null,
      brand: body.brand && body.brand.trim() !== '' ? body.brand : null,
      scale: body.scale || null,
      condition: body.condition || 'new_sealed',
      images: body.images || [],
      starting_price: body.starting_price,
      reserve_price: body.reserve_price || null,
      current_price: body.starting_price,
      bid_increment: body.bid_increment || 1.00,
      status,
      starts_at: body.starts_at,
      ends_at: body.ends_at,
      original_end_time: body.ends_at,
      anti_snipe_seconds: body.anti_snipe_seconds || 30,
      featured: body.featured || false,
      created_by: 'admin',
    }

    const { data, error } = await supabase
      .from('auctions')
      .insert(insertData)
      .select('*, category:auction_categories(*)')
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      // Provide specific error messages for common issues
      if (error.code === '23505') {
        return NextResponse.json({ error: 'An auction with this title already exists. Please use a different title.' }, { status: 409 })
      }
      if (error.code === '23503') {
        return NextResponse.json({ error: 'Invalid category selected. Please choose a valid category or leave it empty.' }, { status: 400 })
      }
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Auction tables not set up. Please run the database schema first.' }, { status: 500 })
      }
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error creating auction:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create auction' },
      { status: 500 }
    )
  }
}
