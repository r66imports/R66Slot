#!/usr/bin/env node
/**
 * Migration script: Supabase + Vercel Blob → Railway PostgreSQL
 * Run with: node scripts/migrate-to-railway.js
 */

const { Pool } = require('pg')
const { createClient } = require('@supabase/supabase-js')

const RAILWAY_URL = process.env.RAILWAY_DATABASE_URL
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!RAILWAY_URL) {
  console.error('Missing RAILWAY_DATABASE_URL environment variable')
  process.exit(1)
}

const db = new Pool({ connectionString: RAILWAY_URL, ssl: { rejectUnauthorized: false } })
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function createSchema() {
  console.log('\n📦 Creating schema in Railway PostgreSQL...')

  await db.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)

  // Enums
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

  // Tables
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

  // New tables to replace Vercel Blob JSON files
  await db.query(`
    CREATE TABLE IF NOT EXISTS json_store (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  // Indexes
  await db.query(`CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_auctions_ends_at ON auctions(ends_at)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_bids_auction ON bids(auction_id, amount DESC)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_bids_bidder ON bids(bidder_id)`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_notifications_bidder ON notifications(bidder_id, read, created_at DESC)`)

  console.log('✅ Schema created successfully')
}

async function createFunctions() {
  console.log('\n⚙️  Creating PostgreSQL functions...')

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

  console.log('✅ Functions created successfully')
}

async function seedCategories() {
  console.log('\n🌱 Seeding auction categories...')
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
  console.log('✅ Categories seeded')
}

async function migrateSupabaseData() {
  console.log('\n📤 Migrating data from Supabase...')

  // Clear seeded categories and migrate from Supabase with original UUIDs
  await db.query(`DELETE FROM auction_categories`)
  const { data: categories } = await supabase.from('auction_categories').select('*')
  if (categories?.length) {
    for (const c of categories) {
      await db.query(`
        INSERT INTO auction_categories (id, name, slug, description, sort_order, created_at)
        VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING
      `, [c.id, c.name, c.slug, c.description, c.sort_order, c.created_at])
    }
    console.log(`  ✅ Migrated ${categories.length} auction categories`)
  }

  // Migrate bidder_profiles
  const { data: bidders } = await supabase.from('bidder_profiles').select('*')
  if (bidders?.length) {
    for (const b of bidders) {
      await db.query(`
        INSERT INTO bidder_profiles (id, r66_customer_id, display_name, email, phone, is_banned, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING
      `, [b.id, b.r66_customer_id, b.display_name, b.email, b.phone, b.is_banned, b.created_at, b.updated_at])
    }
    console.log(`  ✅ Migrated ${bidders.length} bidder profiles`)
  }

  // Migrate auctions
  const { data: auctions } = await supabase.from('auctions').select('*')
  if (auctions?.length) {
    for (const a of auctions) {
      await db.query(`
        INSERT INTO auctions (id,title,slug,description,description_html,category_id,brand,scale,condition,images,
          starting_price,reserve_price,current_price,bid_increment,bid_count,status,starts_at,ends_at,
          original_end_time,anti_snipe_seconds,winner_id,winner_notified,featured,created_by,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
        ON CONFLICT (id) DO NOTHING
      `, [a.id,a.title,a.slug,a.description,a.description_html,a.category_id,a.brand,a.scale,a.condition,
          JSON.stringify(a.images),a.starting_price,a.reserve_price,a.current_price,a.bid_increment,
          a.bid_count,a.status,a.starts_at,a.ends_at,a.original_end_time,a.anti_snipe_seconds,
          a.winner_id,a.winner_notified,a.featured,a.created_by,a.created_at,a.updated_at])
    }
    console.log(`  ✅ Migrated ${auctions.length} auctions`)
  }

  // Migrate bids
  const { data: bids } = await supabase.from('bids').select('*')
  if (bids?.length) {
    for (const b of bids) {
      await db.query(`
        INSERT INTO bids (id, auction_id, bidder_id, amount, is_winning, created_at)
        VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING
      `, [b.id, b.auction_id, b.bidder_id, b.amount, b.is_winning, b.created_at])
    }
    console.log(`  ✅ Migrated ${bids.length} bids`)
  }

  // Migrate media_files
  const { data: media } = await supabase.from('media_files').select('*')
  if (media?.length) {
    for (const m of media) {
      await db.query(`
        INSERT INTO media_files (id, name, url, type, size, folder, uploaded_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING
      `, [m.id, m.name, m.url, m.type, m.size, m.folder, m.uploaded_at])
    }
    console.log(`  ✅ Migrated ${media.length} media files`)
  }

  // Migrate notifications
  const { data: notifs } = await supabase.from('notifications').select('*')
  if (notifs?.length) {
    for (const n of notifs) {
      await db.query(`
        INSERT INTO notifications (id, bidder_id, auction_id, type, title, message, read, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING
      `, [n.id, n.bidder_id, n.auction_id, n.type, n.title, n.message, n.read, n.created_at])
    }
    console.log(`  ✅ Migrated ${notifs.length} notifications`)
  }

  console.log('✅ Supabase data migration complete')
}

async function main() {
  console.log('🚀 Starting Railway migration...')
  try {
    await createSchema()
    await createFunctions()
    await migrateSupabaseData()
    console.log('\n🎉 Migration complete! Railway PostgreSQL is ready.')
  } catch (err) {
    console.error('❌ Migration failed:', err.message)
    process.exit(1)
  } finally {
    await db.end()
  }
}

main()
