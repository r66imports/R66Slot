import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [products, blog, preorders, auctions] = await Promise.all([
      // Product count from json_store
      db.query(`
        SELECT COALESCE(jsonb_array_length(value), 0) AS count
        FROM json_store WHERE key = 'data/products.json'
      `),
      // Blog post count
      db.query(`
        SELECT COUNT(*) AS count FROM json_store WHERE key LIKE 'data/blog/%'
      `),
      // Pre-order count
      db.query(`
        SELECT COALESCE(jsonb_array_length(value), 0) AS count
        FROM json_store WHERE key = 'data/preorder-list.json'
      `),
      // Active auctions count
      db.query(`
        SELECT COUNT(*) AS count FROM auctions WHERE status = 'active'
      `).catch(() => ({ rows: [{ count: 0 }] })),
    ])

    return NextResponse.json({
      products: Number(products.rows[0]?.count ?? 0),
      blogPosts: Number(blog.rows[0]?.count ?? 0),
      preOrders: Number(preorders.rows[0]?.count ?? 0),
      activeAuctions: Number(auctions.rows[0]?.count ?? 0),
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ products: 0, blogPosts: 0, preOrders: 0, activeAuctions: 0 })
  }
}
