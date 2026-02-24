import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
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

    const conditions: string[] = []
    const values: any[] = []
    let idx = 1

    if (status === 'active') {
      conditions.push(`a.status = $${idx++}`)
      values.push('active')
    } else if (status === 'ended') {
      conditions.push(`a.status IN ('ended', 'sold')`)
    } else {
      conditions.push(`a.status IN ('active', 'ended', 'sold')`)
    }

    if (category) { conditions.push(`a.category_id = $${idx++}`); values.push(category) }
    if (brand) { conditions.push(`a.brand = $${idx++}`); values.push(brand) }
    if (condition) { conditions.push(`a.condition = $${idx++}`); values.push(condition) }
    if (minPrice) { conditions.push(`a.current_price >= $${idx++}`); values.push(parseFloat(minPrice)) }
    if (maxPrice) { conditions.push(`a.current_price <= $${idx++}`); values.push(parseFloat(maxPrice)) }
    if (search) { conditions.push(`a.title ILIKE $${idx++}`); values.push(`%${search}%`) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const orderMap: Record<string, string> = {
      ending_soon: 'a.ends_at ASC',
      newly_listed: 'a.created_at DESC',
      price_low: 'a.current_price ASC',
      price_high: 'a.current_price DESC',
      most_bids: 'a.bid_count DESC',
    }
    const order = `ORDER BY ${orderMap[sort] || 'a.ends_at ASC'}`

    const countResult = await db.query(`SELECT COUNT(*) FROM auctions a ${where}`, values)
    const total = parseInt(countResult.rows[0].count)

    const sql = `
      SELECT a.*,
        (SELECT row_to_json(c) FROM auction_categories c WHERE c.id = a.category_id) AS category
      FROM auctions a ${where} ${order}
      LIMIT $${idx++} OFFSET $${idx++}
    `
    const result = await db.query(sql, [...values, limit, offset])

    return NextResponse.json({ auctions: result.rows, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Error fetching auctions:', error)
    return NextResponse.json({ error: 'Failed to fetch auctions' }, { status: 500 })
  }
}
