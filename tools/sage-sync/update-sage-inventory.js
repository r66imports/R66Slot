#!/usr/bin/env node
// Simple CSV -> public/sage-inventory.json converter
// Usage: node update-sage-inventory.js path/to/sage.csv

const fs = require('fs')
const path = require('path')

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return {}
  const header = lines[0].split(',').map(h => h.trim().toLowerCase())
  const skuIdx = header.indexOf('sku')
  const qtyIdx = header.indexOf('quantity')
  if (skuIdx === -1 || qtyIdx === -1) {
    throw new Error('CSV must include headers: sku,quantity')
  }
  const out = {}
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const sku = (cols[skuIdx] || '').trim()
    const qtyRaw = (cols[qtyIdx] || '').trim()
    if (!sku) continue
    const qty = parseInt(qtyRaw, 10) || 0
    out[sku] = qty
  }
  return out
}

async function main() {
  const argv = process.argv.slice(2)
  if (!argv[0]) {
    console.error('Usage: node update-sage-inventory.js path/to/sage.csv')
    process.exit(1)
  }
  const csvPath = path.resolve(argv[0])
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found:', csvPath)
    process.exit(1)
  }

  const content = fs.readFileSync(csvPath, 'utf8')
  let mapping
  try {
    mapping = parseCsv(content)
  } catch (err) {
    console.error('Failed to parse CSV:', err.message)
    process.exit(1)
  }

  const publicDir = path.resolve(__dirname, '..', '..', 'public')
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }

  const outPath = path.join(publicDir, 'sage-inventory.json')
  fs.writeFileSync(outPath, JSON.stringify(mapping, null, 2), 'utf8')
  console.log('Wrote', outPath, 'with', Object.keys(mapping).length, 'items')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
