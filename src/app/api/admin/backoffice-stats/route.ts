import { NextRequest, NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'
import { db } from '@/lib/db'

const DOCS_KEY = 'data/order-documents.json'
const CLIENTS_KEY = 'data/clients.json'

function docTotal(doc: any): number {
  const subtotal = (doc.lineItems || []).reduce(
    (s: number, li: any) => s + (li.qty || 0) * (li.unitPrice || 0),
    0
  )
  const discount = subtotal * ((doc.discountPct || 0) / 100)
  return subtotal - discount + (doc.shippingCost || 0)
}

export async function GET(req: NextRequest) {
  // API key auth — set BACKOFFICE_API_KEY env var on Railway
  const apiKey = process.env.BACKOFFICE_API_KEY
  if (apiKey) {
    const provided = req.headers.get('x-bo-key')
    if (provided !== apiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const todayStr = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const thisMonth = todayStr.slice(0, 7)                  // YYYY-MM

    const [docs, clients] = await Promise.all([
      blobRead<any[]>(DOCS_KEY, []),
      blobRead<any[]>(CLIENTS_KEY, []),
    ])

    const invoices = docs.filter((d) => d.type === 'invoice')
    const quotes = docs.filter((d) => d.type === 'quote')
    const salesOrders = docs.filter((d) => d.type === 'salesorder')

    // Orders today (invoices created today)
    const ordersToday = invoices.filter((d) =>
      (d.createdAt || d.date || '').startsWith(todayStr)
    ).length

    // Revenue this month (paid + unpaid invoices)
    const revenueThisMonth = invoices
      .filter((d) => (d.createdAt || d.date || '').startsWith(thisMonth))
      .reduce((s, d) => s + docTotal(d), 0)

    // Unpaid invoices (sent/draft/pending)
    const unpaidInvoices = invoices.filter((d) =>
      ['draft', 'sent', 'pending'].includes(d.status)
    )
    const unpaidTotal = unpaidInvoices.reduce((s, d) => s + docTotal(d), 0)

    // Open quotes
    const openQuotes = quotes.filter((d) =>
      ['draft', 'sent'].includes(d.status)
    ).length

    // Active sales orders
    const activeSalesOrders = salesOrders.filter((d) =>
      ['draft', 'sent', 'accepted', 'pending', 'active', 'processing'].includes(d.status)
    ).length

    // Low stock from PostgreSQL
    let lowStockCount = 0
    let totalProducts = 0
    try {
      const [lowRes, totalRes] = await Promise.all([
        db.query(
          `SELECT COUNT(*) FROM products WHERE status = 'active' AND track_quantity = true AND quantity <= 5`
        ),
        db.query(`SELECT COUNT(*) FROM products WHERE status = 'active'`),
      ])
      lowStockCount = parseInt(lowRes.rows[0].count, 10)
      totalProducts = parseInt(totalRes.rows[0].count, 10)
    } catch {
      // DB unavailable — skip stock counts
    }

    return NextResponse.json({
      project: 'r66slot',
      generatedAt: new Date().toISOString(),
      orders: {
        today: ordersToday,
        openQuotes,
        activeSalesOrders,
        unpaidInvoices: unpaidInvoices.length,
        unpaidTotal: Math.round(unpaidTotal * 100) / 100,
      },
      revenue: {
        thisMonth: Math.round(revenueThisMonth * 100) / 100,
        currency: 'ZAR',
      },
      inventory: {
        lowStockCount,
        totalProducts,
      },
      customers: {
        total: clients.length,
      },
    })
  } catch (err) {
    console.error('[backoffice-stats]', err)
    return NextResponse.json({ error: 'Failed to compute stats' }, { status: 500 })
  }
}
