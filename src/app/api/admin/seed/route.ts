import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

/**
 * POST /api/admin/seed
 * One-time database initialisation: creates tables + seeds admin + seeds homepage.
 * Idempotent — safe to call multiple times.
 * Requires Authorization: Bearer <SEED_SECRET> header.
 */
export async function POST(request: NextRequest) {
  const seedSecret = process.env.SEED_SECRET
  if (!seedSecret) {
    return NextResponse.json({ error: 'Seed endpoint disabled — set SEED_SECRET to enable' }, { status: 403 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${seedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const log: string[] = []

  try {
    // ── 1. Create json_store ──────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS json_store (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    log.push('json_store table ready')

    // ── 2. Create pages table ─────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS pages (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        published BOOLEAN DEFAULT FALSE,
        is_website_page BOOLEAN DEFAULT FALSE,
        components JSONB DEFAULT '[]',
        page_settings JSONB DEFAULT '{}',
        seo JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await db.query(`CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug)`)
    log.push('pages table ready')

    // ── 3. Seed Admin user ────────────────────────────────────────────────
    const existing = await db.query(
      "SELECT value FROM json_store WHERE key = 'data/customers.json'"
    )
    const currentCustomers: any[] = existing.rows.length > 0 ? existing.rows[0].value : []
    const hasAdmin = currentCustomers.some((c: any) => c.username === 'Admin')

    // Always reset/create admin with known password
    const passwordHash = await bcrypt.hash('Admin123!', 12)
    const adminCustomer = [{
      id: 'admin-1',
      username: 'Admin',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@r66slot.co.za',
      password: passwordHash,
      role: 'admin',
      createdAt: new Date().toISOString(),
    }]
    await db.query(
      `INSERT INTO json_store (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      ['data/customers.json', JSON.stringify(adminCustomer)]
    )
    log.push(hasAdmin ? 'Admin password reset to Admin123!' : 'Admin user created (username: Admin, password: Admin123!)')

    // ── 4. Seed starter homepage ──────────────────────────────────────────
    const hpCheck = await db.query("SELECT id FROM pages WHERE id = 'frontend-homepage'")
    if (hpCheck.rows.length > 0) {
      log.push('Homepage already exists — skipped')
    } else {
      const now = new Date().toISOString()
      const components = [
        {
          id: 'hero-1',
          type: 'hero',
          content: 'Welcome to R66SLOT',
          styles: {
            backgroundColor: '#1a1a2e',
            textColor: '#ffffff',
            minHeight: '500px',
            textAlign: 'center',
          },
          settings: {
            description: 'Your premium destination for slot car racing. Quality models, fast shipping, expert service.',
            cta: { label: 'Shop Now', url: '/products' },
          },
        },
        {
          id: 'products-1',
          type: 'product-grid',
          content: 'Featured Products',
          styles: {
            backgroundColor: '#ffffff',
            padding: '40px 20px',
          },
          settings: {
            productCount: 8,
            showPrice: true,
            showAddToCart: true,
          },
        },
      ]
      await db.query(
        `INSERT INTO pages (id, title, slug, published, is_website_page, components, page_settings, seo, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          'frontend-homepage',
          'Homepage',
          'homepage',
          true,
          true,
          JSON.stringify(components),
          JSON.stringify({ backgroundColor: '#ffffff' }),
          JSON.stringify({
            metaTitle: 'R66SLOT - Premium Slot Cars & Collectibles',
            metaDescription: 'Shop the finest slot cars, tracks and accessories.',
            metaKeywords: 'slot cars, racing, collectibles',
          }),
          now,
          now,
        ]
      )
      log.push('Starter homepage created')
    }

    return NextResponse.json({ success: true, log })
  } catch (error: any) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { success: false, error: error.message, log },
      { status: 500 }
    )
  }
}
