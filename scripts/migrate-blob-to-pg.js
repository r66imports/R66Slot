#!/usr/bin/env node
/**
 * Migrate Vercel Blob JSON data → Railway PostgreSQL json_store table
 */

const { Pool } = require('pg')

const RAILWAY_URL = process.env.RAILWAY_DATABASE_URL
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN

if (!RAILWAY_URL || !BLOB_TOKEN) {
  console.error('Missing RAILWAY_DATABASE_URL or BLOB_READ_WRITE_TOKEN')
  process.exit(1)
}

const db = new Pool({ connectionString: RAILWAY_URL, ssl: { rejectUnauthorized: false } })

async function fetchBlob(key) {
  const res = await fetch(`https://blob.vercel-storage.com`, {
    headers: { Authorization: `Bearer ${BLOB_TOKEN}` }
  })
  // Use the Vercel Blob list API to find the blob URL
  const listRes = await fetch(`https://blob.vercel-storage.com?prefix=${encodeURIComponent(key)}&limit=1`, {
    headers: { Authorization: `Bearer ${BLOB_TOKEN}` }
  })
  const list = await listRes.json()
  if (!list.blobs?.length) return null
  const blobUrl = list.blobs[0].url
  const dataRes = await fetch(blobUrl, { cache: 'no-store' })
  if (!dataRes.ok) return null
  return dataRes.json()
}

async function migrateKey(key, fallback = null) {
  try {
    const data = await fetchBlob(key)
    if (!data) {
      console.log(`  ⚠️  ${key} — not found in blob, skipping`)
      return
    }
    await db.query(
      `INSERT INTO json_store (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, JSON.stringify(data)]
    )
    const count = Array.isArray(data) ? data.length : Object.keys(data).length
    console.log(`  ✅ ${key} — migrated (${count} items)`)
  } catch (err) {
    console.log(`  ⚠️  ${key} — ${err.message}`)
  }
}

async function main() {
  console.log('🚀 Migrating Vercel Blob JSON data to Railway PostgreSQL...\n')

  const keys = [
    'data/products.json',
    'data/customers.json',
    'data/contacts.json',
    'data/preorder-list.json',
    'data/media-library.json',
    'data/suppliers.json',
    'data/site-settings.json',
    'data/blog-posts.json',
    'data/categories.json',
  ]

  for (const key of keys) {
    await migrateKey(key)
  }

  // Also try to list and migrate all pages
  try {
    const listRes = await fetch(`https://blob.vercel-storage.com?prefix=data/pages/&limit=100`, {
      headers: { Authorization: `Bearer ${BLOB_TOKEN}` }
    })
    const list = await listRes.json()
    if (list.blobs?.length) {
      for (const blob of list.blobs) {
        const dataRes = await fetch(blob.url, { cache: 'no-store' })
        if (dataRes.ok) {
          const data = await dataRes.json()
          await db.query(
            `INSERT INTO json_store (key, value, updated_at) VALUES ($1, $2, NOW())
             ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
            [blob.pathname, JSON.stringify(data)]
          )
          console.log(`  ✅ ${blob.pathname} — migrated`)
        }
      }
    }
  } catch (err) {
    console.log(`  ⚠️  pages migration: ${err.message}`)
  }

  console.log('\n🎉 Blob migration complete!')
  await db.end()
}

main().catch(err => { console.error(err); process.exit(1) })
