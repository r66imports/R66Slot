import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

// GET public auction listings with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)

    const category = searchParams.get('category')
    const brand = searchParams.get('brand')
    const condition = searchParams.get('condition')
    const status = searchParams.get('status') || 'active'
    const search = searchParams.get('search')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const sort = searchParams.get('sort') || 'ending_soon'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 50)
    const offset = (page - 1) * limit

    let query = supabase
      .from('auctions')
      .select('*, category:auction_categories(*)', { count: 'exact' })

    // Only show active/ended auctions to public (not drafts)
    if (status === 'active') {
      query = query.eq('status', 'active')
    } else if (status === 'ended') {
      query = query.in('status', ['ended', 'sold'])
    } else {
      query = query.in('status', ['active', 'ended', 'sold'])
    }

    if (category) query = query.eq('category_id', category)
    if (brand) query = query.eq('brand', brand)
    if (condition) query = query.eq('condition', condition)
    if (minPrice) query = query.gte('current_price', parseFloat(minPrice))
    if (maxPrice) query = query.lte('current_price', parseFloat(maxPrice))
    if (search) query = query.ilike('title', `%${search}%`)

    // Sorting
    switch (sort) {
      case 'ending_soon':
        query = query.order('ends_at', { ascending: true })
        break
      case 'newly_listed':
        query = query.order('created_at', { ascending: false })
        break
      case 'price_low':
        query = query.order('current_price', { ascending: true })
        break
      case 'price_high':
        query = query.order('current_price', { ascending: false })
        break
      case 'most_bids':
        query = query.order('bid_count', { ascending: false })
        break
      default:
        query = query.order('ends_at', { ascending: true })
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      auctions: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Error fetching auctions:', error)
    return NextResponse.json({ error: 'Failed to fetch auctions' }, { status: 500 })
  }
}
