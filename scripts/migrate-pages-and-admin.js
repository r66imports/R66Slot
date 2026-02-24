#!/usr/bin/env node
/**
 * Migrate Supabase pages to Railway PostgreSQL + seed admin user in json_store
 */

const { Pool } = require('pg')
const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

const RAILWAY_URL = process.env.RAILWAY_DATABASE_URL
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!'

if (!RAILWAY_URL) {
  console.error('Missing RAILWAY_DATABASE_URL')
  process.exit(1)
}

const db = new Pool({ connectionString: RAILWAY_URL, ssl: { rejectUnauthorized: false } })
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function createPagesTable() {
  console.log('\n📦 Creating pages table in Railway PostgreSQL...')
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
  console.log('✅ Pages table ready')
}

async function migratePages() {
  console.log('\n📤 Migrating pages from Supabase...')
  const { data: pages, error } = await supabase.from('pages').select('*')
  if (error) {
    console.error('  ❌ Failed to fetch pages from Supabase:', error.message)
    return
  }

  let migrated = 0
  for (const p of pages || []) {
    try {
      await db.query(
        `INSERT INTO pages (id, title, slug, published, is_website_page, components, page_settings, seo, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO UPDATE SET title=$2, slug=$3, published=$4, is_website_page=$5,
           components=$6, page_settings=$7, seo=$8, updated_at=$10`,
        [p.id, p.title, p.slug, p.published, p.is_website_page ?? false,
         JSON.stringify(p.components ?? []), JSON.stringify(p.page_settings ?? {}),
         JSON.stringify(p.seo ?? {}), p.created_at, p.updated_at]
      )
      migrated++
    } catch (err) {
      console.log(`  ⚠️  Page ${p.slug}: ${err.message}`)
    }
  }
  console.log(`  ✅ Migrated ${migrated} pages`)
}

async function seedAdminUser() {
  console.log('\n👤 Seeding admin user in json_store...')

  // Check if admin already exists in json_store
  const existing = await db.query("SELECT value FROM json_store WHERE key = 'data/customers.json'")
  if (existing.rows.length > 0) {
    const customers = existing.rows[0].value
    const hasAdmin = Array.isArray(customers) && customers.some(c => c.username === 'Admin')
    if (hasAdmin) {
      console.log('  ℹ️  Admin user already exists in json_store, skipping')
      return
    }
  }

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

  console.log(`  ✅ Admin user created`)
  console.log(`  📝 Username: Admin`)
  console.log(`  📝 Password: ${ADMIN_PASSWORD}`)
  console.log(`  ⚠️  CHANGE THIS PASSWORD after first login!`)
}

async function main() {
  console.log('🚀 Running pages migration + admin seed...\n')
  try {
    await createPagesTable()
    await migratePages()
    await seedAdminUser()
    console.log('\n🎉 Done!')
  } catch (err) {
    console.error('❌ Failed:', err.message)
    process.exit(1)
  } finally {
    await db.end()
  }
}

main()
