#!/usr/bin/env node
/**
 * Railway startup initialisation
 * - Creates all required tables / types if they don't exist
 * - Seeds the admin user (json_store) if missing
 * - Seeds a starter homepage page if missing
 *
 * Runs every deploy — all operations are idempotent.
 */

const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const connectionString = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL
if (!connectionString) {
  console.error('⚠️  No DATABASE_URL — skipping Railway init')
  process.exit(0)
}

const db = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
})

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
async function ensureSchema() {
  console.log('📦  Ensuring schema…')

  await db.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)

  // Enums (safe if already exist)
  await db.query(`
    DO $$ BEGIN
      CREATE TYPE auction_status AS ENUM ('draft','scheduled','active','ended','sold','cancelled','unsold');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `)
  await db.query(`
    DO $$ BEGIN
      CREATE TYPE auction_condition AS ENUM ('new_sealed','new_open_box','used_like_new','used_good','used_fair','for_parts');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `)
  await db.query(`
    DO $$ BEGIN
      CREATE TYPE payment_status AS ENUM ('pending','processing','succeeded','failed','refunded');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `)

  // Core tables
  await db.query(`
    CREATE TABLE IF NOT EXISTS json_store (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

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
  await db.query(`CREATE INDEX IF NOT EXISTS idx_pages_published ON pages(published)`)

  // Dedicated products table (replaces json_store blob)
  await db.query(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      price NUMERIC(10,2) DEFAULT 0,
      compare_at_price NUMERIC(10,2),
      cost_per_item NUMERIC(10,2),
      sku TEXT DEFAULT '',
      barcode TEXT DEFAULT '',
      brand TEXT DEFAULT '',
      product_type TEXT DEFAULT '',
      car_class TEXT DEFAULT '',
      car_type TEXT DEFAULT '',
      part_type TEXT DEFAULT '',
      scale TEXT DEFAULT '',
      supplier TEXT DEFAULT '',
      collections JSONB DEFAULT '[]',
      tags JSONB DEFAULT '[]',
      quantity INTEGER DEFAULT 0,
      track_quantity BOOLEAN DEFAULT TRUE,
      weight NUMERIC(10,3),
      weight_unit TEXT DEFAULT 'kg',
      box_size TEXT DEFAULT '',
      dimensions JSONB DEFAULT '{}',
      eta TEXT DEFAULT '',
      status TEXT DEFAULT 'draft',
      image_url TEXT DEFAULT '',
      images JSONB DEFAULT '[]',
      page_id TEXT DEFAULT '',
      page_url TEXT DEFAULT '',
      seo JSONB DEFAULT '{}',
      sage_item_code TEXT,
      sage_last_synced TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_products_sage ON products(sage_item_code)`)

  await db.query(`
    CREATE TABLE IF NOT EXISTS bidder_profiles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      r66_customer_id TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      is_banned BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS auction_categories (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS auctions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      description_html TEXT,
      category_id UUID REFERENCES auction_categories(id),
      brand TEXT,
      scale TEXT,
      condition auction_condition NOT NULL DEFAULT 'new_sealed',
      images JSONB DEFAULT '[]',
      starting_price DECIMAL(10,2) NOT NULL,
      reserve_price DECIMAL(10,2),
      current_price DECIMAL(10,2) NOT NULL,
      bid_increment DECIMAL(10,2) NOT NULL DEFAULT 1.00,
      bid_count INT DEFAULT 0,
      status auction_status NOT NULL DEFAULT 'draft',
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      original_end_time TIMESTAMPTZ NOT NULL,
      anti_snipe_seconds INT DEFAULT 30,
      winner_id UUID REFERENCES bidder_profiles(id),
      winner_notified BOOLEAN DEFAULT FALSE,
      featured BOOLEAN DEFAULT FALSE,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS bids (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
      bidder_id UUID NOT NULL REFERENCES bidder_profiles(id),
      amount DECIMAL(10,2) NOT NULL,
      is_winning BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS watchlist (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      bidder_id UUID NOT NULL REFERENCES bidder_profiles(id) ON DELETE CASCADE,
      auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(bidder_id, auction_id)
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS auction_payments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      auction_id UUID NOT NULL REFERENCES auctions(id),
      bidder_id UUID NOT NULL REFERENCES bidder_profiles(id),
      amount DECIMAL(10,2) NOT NULL,
      currency TEXT DEFAULT 'ZAR',
      stripe_payment_intent TEXT,
      stripe_session_id TEXT,
      status payment_status DEFAULT 'pending',
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      bidder_id UUID NOT NULL REFERENCES bidder_profiles(id) ON DELETE CASCADE,
      auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS media_files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      type TEXT,
      size INT,
      folder TEXT DEFAULT 'All Files',
      uploaded_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  // Indexes
  await db.query(`CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_auctions_ends_at ON auctions(ends_at)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_bids_auction ON bids(auction_id, amount DESC)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_bids_bidder ON bids(bidder_id)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_notifications_bidder ON notifications(bidder_id, read, created_at DESC)`)

  console.log('✅  Schema ready')
}

// ---------------------------------------------------------------------------
// PostgreSQL functions
// ---------------------------------------------------------------------------
async function ensureFunctions() {
  console.log('⚙️   Ensuring DB functions…')

  await db.query(`
    CREATE OR REPLACE FUNCTION place_bid(p_auction_id UUID, p_bidder_id UUID, p_amount DECIMAL)
    RETURNS JSONB LANGUAGE plpgsql AS $$
    DECLARE
      v_auction auctions%ROWTYPE;
      v_new_bid bids%ROWTYPE;
      v_previous_winner UUID;
      v_time_remaining INTERVAL;
    BEGIN
      SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id FOR UPDATE;
      IF v_auction IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Auction not found'); END IF;
      IF v_auction.status != 'active' THEN RETURN jsonb_build_object('success', false, 'error', 'Auction is not active'); END IF;
      IF NOW() > v_auction.ends_at THEN RETURN jsonb_build_object('success', false, 'error', 'Auction has ended'); END IF;
      IF p_amount < v_auction.current_price + v_auction.bid_increment THEN
        RETURN jsonb_build_object('success', false, 'error', format('Bid must be at least %s', v_auction.current_price + v_auction.bid_increment));
      END IF;
      IF EXISTS (SELECT 1 FROM bidder_profiles WHERE id = p_bidder_id AND is_banned = TRUE) THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are not permitted to bid');
      END IF;
      SELECT bidder_id INTO v_previous_winner FROM bids WHERE auction_id = p_auction_id AND is_winning = TRUE LIMIT 1;
      UPDATE bids SET is_winning = FALSE WHERE auction_id = p_auction_id AND is_winning = TRUE;
      INSERT INTO bids (auction_id, bidder_id, amount, is_winning) VALUES (p_auction_id, p_bidder_id, p_amount, TRUE) RETURNING * INTO v_new_bid;
      UPDATE auctions SET current_price = p_amount, bid_count = bid_count + 1, updated_at = NOW() WHERE id = p_auction_id;
      v_time_remaining := v_auction.ends_at - NOW();
      IF v_time_remaining < (v_auction.anti_snipe_seconds || ' seconds')::INTERVAL THEN
        UPDATE auctions SET ends_at = NOW() + (v_auction.anti_snipe_seconds || ' seconds')::INTERVAL WHERE id = p_auction_id;
      END IF;
      IF v_previous_winner IS NOT NULL AND v_previous_winner != p_bidder_id THEN
        INSERT INTO notifications (bidder_id, auction_id, type, title, message)
        VALUES (v_previous_winner, p_auction_id, 'outbid', 'You have been outbid!', format('Someone bid R%s on "%s"', p_amount, v_auction.title));
      END IF;
      RETURN jsonb_build_object('success', true, 'bid_id', v_new_bid.id, 'amount', v_new_bid.amount, 'new_price', p_amount, 'bid_count', v_auction.bid_count + 1);
    END; $$
  `)

  await db.query(`
    CREATE OR REPLACE FUNCTION close_expired_auctions()
    RETURNS JSONB LANGUAGE plpgsql AS $$
    DECLARE
      v_auction RECORD; v_closed_count INT := 0; v_winning_bid RECORD;
    BEGIN
      FOR v_auction IN SELECT * FROM auctions WHERE status = 'active' AND ends_at <= NOW() FOR UPDATE SKIP LOCKED LOOP
        SELECT * INTO v_winning_bid FROM bids WHERE auction_id = v_auction.id AND is_winning = TRUE LIMIT 1;
        IF v_winning_bid IS NOT NULL THEN
          IF v_auction.reserve_price IS NOT NULL AND v_winning_bid.amount < v_auction.reserve_price THEN
            UPDATE auctions SET status = 'unsold', updated_at = NOW() WHERE id = v_auction.id;
          ELSE
            UPDATE auctions SET status = 'ended', winner_id = v_winning_bid.bidder_id, updated_at = NOW() WHERE id = v_auction.id;
            INSERT INTO notifications (bidder_id, auction_id, type, title, message)
            VALUES (v_winning_bid.bidder_id, v_auction.id, 'winner', 'You won the auction!',
              format('You won "%s" with a bid of R%s. Please complete payment.', v_auction.title, v_winning_bid.amount));
            INSERT INTO auction_payments (auction_id, bidder_id, amount) VALUES (v_auction.id, v_winning_bid.bidder_id, v_winning_bid.amount);
          END IF;
        ELSE
          UPDATE auctions SET status = 'unsold', updated_at = NOW() WHERE id = v_auction.id;
        END IF;
        v_closed_count := v_closed_count + 1;
      END LOOP;
      RETURN jsonb_build_object('closed', v_closed_count);
    END; $$
  `)

  await db.query(`
    CREATE OR REPLACE FUNCTION activate_scheduled_auctions()
    RETURNS JSONB LANGUAGE plpgsql AS $$
    DECLARE v_activated INT := 0;
    BEGIN
      UPDATE auctions SET status = 'active', updated_at = NOW() WHERE status = 'scheduled' AND starts_at <= NOW();
      GET DIAGNOSTICS v_activated = ROW_COUNT;
      RETURN jsonb_build_object('activated', v_activated);
    END; $$
  `)

  console.log('✅  Functions ready')
}

// ---------------------------------------------------------------------------
// Seed admin user
// ---------------------------------------------------------------------------
async function seedAdmin() {
  const existing = await db.query("SELECT value FROM json_store WHERE key = 'data/customers.json'")
  if (existing.rows.length > 0) {
    const customers = existing.rows[0].value
    if (Array.isArray(customers) && customers.some(c => c.username === 'Admin')) {
      console.log('ℹ️   Admin user already exists — skipping')
      return
    }
  }

  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!'
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)
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

  console.log(`✅  Admin user created (username: Admin, password: ${ADMIN_PASSWORD})`)
  console.log('⚠️   Change this password after first login!')
}

// ---------------------------------------------------------------------------
// Seed starter homepage
// ---------------------------------------------------------------------------
async function seedHomepage() {
  const existing = await db.query("SELECT id FROM pages WHERE id = 'frontend-homepage'")
  if (existing.rows.length > 0) {
    console.log('ℹ️   Homepage already exists — skipping')
    return
  }

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
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      'frontend-homepage',
      'Homepage',
      'homepage',
      true,
      true,
      JSON.stringify(components),
      JSON.stringify({ backgroundColor: '#ffffff' }),
      JSON.stringify({ metaTitle: 'R66SLOT - Premium Slot Cars & Collectibles', metaDescription: 'Shop the finest slot cars, tracks and accessories.', metaKeywords: 'slot cars, racing, collectibles' }),
      now,
      now,
    ]
  )

  console.log('✅  Starter homepage created')
}

// ---------------------------------------------------------------------------
// Seed default auction categories
// ---------------------------------------------------------------------------
async function seedCategories() {
  const existing = await db.query('SELECT COUNT(*) FROM auction_categories')
  if (parseInt(existing.rows[0].count) > 0) {
    console.log('ℹ️   Auction categories already exist — skipping')
    return
  }

  await db.query(`
    INSERT INTO auction_categories (name, slug, sort_order) VALUES
      ('1:32 Slot Cars', '1-32-slot-cars', 1),
      ('1:24 Slot Cars', '1-24-slot-cars', 2),
      ('Parts & Accessories', 'parts-accessories', 3),
      ('Track & Sets', 'track-sets', 4),
      ('Controllers', 'controllers', 5),
      ('Collectibles', 'collectibles', 6)
    ON CONFLICT (slug) DO NOTHING
  `)
  console.log('✅  Auction categories seeded')
}

// ---------------------------------------------------------------------------
// Migrate products from json_store blob → products table (one-time, idempotent)
// ---------------------------------------------------------------------------
async function migrateProducts() {
  const existing = await db.query(`SELECT COUNT(*) AS count FROM products`)
  if (parseInt(existing.rows[0].count) > 0) return // already migrated

  const blob = await db.query(`SELECT value FROM json_store WHERE key = 'data/products.json'`)
  if (!blob.rows.length || !Array.isArray(blob.rows[0].value) || blob.rows[0].value.length === 0) return

  const products = blob.rows[0].value
  console.log(`📦  Migrating ${products.length} products from json_store → products table…`)

  for (const p of products) {
    await db.query(`
      INSERT INTO products (
        id, title, description, price, compare_at_price, cost_per_item,
        sku, barcode, brand, product_type, car_class, car_type, part_type,
        scale, supplier, collections, tags, quantity, track_quantity,
        weight, weight_unit, box_size, dimensions, eta, status,
        image_url, images, page_id, page_url, seo, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
        $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32
      ) ON CONFLICT (id) DO NOTHING
    `, [
      p.id || `prod-${Date.now()}`, p.title || '', p.description || '',
      p.price || 0, p.compareAtPrice || null, p.costPerItem || null,
      p.sku || '', p.barcode || '', p.brand || '', p.productType || '',
      p.carClass || '', p.carType || '', p.partType || '', p.scale || '',
      p.supplier || '',
      JSON.stringify(p.collections || []), JSON.stringify(p.tags || []),
      p.quantity || 0, p.trackQuantity !== false,
      p.weight || null, p.weightUnit || 'kg', p.boxSize || '',
      JSON.stringify(p.dimensions || {}), p.eta || '', p.status || 'draft',
      p.imageUrl || '', JSON.stringify(p.images || []),
      p.pageId || '', p.pageUrl || '', JSON.stringify(p.seo || {}),
      p.createdAt || new Date().toISOString(), p.updatedAt || new Date().toISOString(),
    ])
  }
  console.log(`✅  Migrated ${products.length} products`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n🚀  Railway init starting…\n')
  try {
    await ensureSchema()
    await ensureFunctions()
    await seedAdmin()
    await seedHomepage()
    await seedCategories()
    await migrateProducts()
    console.log('\n✅  Railway init complete\n')
  } catch (err) {
    console.error('❌  Railway init failed:', err.message)
    // Don't exit(1) — allow the app to start anyway
  } finally {
    await db.end()
  }
}

// Hard timeout — if init takes longer than 60 s, skip and let the app start
const initTimeout = setTimeout(() => {
  console.error('⚠️  Railway init timed out after 60 s — starting app anyway')
  process.exit(0)
}, 60000)

main().finally(() => clearTimeout(initTimeout))
