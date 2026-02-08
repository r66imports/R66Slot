import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { isAdminRequest } from '@/lib/auction/auth'

// GET all categories
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('auction_categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Error fetching categories:', error)
    // Return empty array instead of error to prevent form from breaking
    return NextResponse.json([])
  }
}

// POST create category
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const { name, description, sort_order } = await request.json()

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    const { data, error } = await supabase
      .from('auction_categories')
      .insert({ name, slug, description: description || null, sort_order: sort_order || 0 })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
