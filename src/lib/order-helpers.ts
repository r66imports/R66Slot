import { db } from '@/lib/db'

export interface LineItem {
  id: string
  description: string
  qty: number
  unitPrice: number
}

/** Extract SKU from a line item description like "SC-5068 – Car-motor test-bench" or "PT1172G25 – G25 Compound..." */
export function extractSku(description: string): string {
  // Split only on em dash (–) or a hyphen surrounded by spaces ( - ), not on hyphens within SKUs like SC-5068
  return description.split(/\s*–\s*|\s+-\s+/)[0]?.trim() || ''
}

/**
 * Do these two line-item sets move the same stock?
 *
 * An autosave posts the whole document every tick, line items included, so a PATCH
 * carrying `lineItems` says nothing about whether the goods changed. Treating its mere
 * presence as a stock event made every tick restore all lines and deduct them again,
 * burying real history in the stock ledger and leaving drift on product quantities
 * where the capped restores did not cancel out.
 *
 * Only the SKU and the quantity behind it move stock. Price edits, renamed
 * descriptions, reordered rows and split or merged lines that keep the same totals all
 * leave the shelf exactly where it was, so they compare equal here.
 */
export function sameStockFootprint(a: LineItem[] | undefined, b: LineItem[] | undefined): boolean {
  const tally = (items: LineItem[] | undefined) => {
    const m = new Map<string, number>()
    for (const li of items || []) {
      const sku = extractSku(li?.description || '').toUpperCase()
      const qty = Number(li?.qty) || 0
      if (!sku || qty <= 0) continue
      m.set(sku, (m.get(sku) || 0) + qty)
    }
    return m
  }
  const ma = tally(a)
  const mb = tally(b)
  if (ma.size !== mb.size) return false
  for (const [sku, qty] of ma) if (mb.get(sku) !== qty) return false
  return true
}

/**
 * Auto-create draft products for any line items whose SKU doesn't exist in the products table.
 * Sets price from the line item unit price. All other details can be filled in later.
 */
export async function autoCreateMissingProducts(items: LineItem[]): Promise<number> {
  let created = 0
  const now = new Date().toISOString()
  for (const li of items) {
    const sku = extractSku(li.description)
    if (!sku) continue
    const dashIdx = li.description.search(/\s*[–\-]\s*/)
    const title = dashIdx !== -1 ? li.description.slice(dashIdx).replace(/^\s*[–\-]\s*/, '').trim() : li.description.trim()
    try {
      const existing = await db.query(`SELECT id FROM products WHERE LOWER(sku) = LOWER($1) LIMIT 1`, [sku])
      if (existing.rowCount && existing.rowCount > 0) continue
      const id = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      await db.query(`
        INSERT INTO products (
          id, title, description, price, sku, brand, supplier,
          status, quantity, track_quantity, weight_unit,
          collections, tags, images, page_ids, car_brands, revo_parts,
          seo, created_at, updated_at,
          sales_account, purchase_account, category_brands, item_categories,
          sideways_brands, sideways_parts
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,
          'draft',0,true,'kg',
          '[]','[]','[]','[]','[]','[]',
          '{}', $8,$9,
          '[]','[]','[]','[]',
          '[]','[]'
        )
      `, [id, title || sku, '', li.unitPrice || 0, sku, '', '', now, now])
      created++
    } catch {
      // Skip — product may have been created concurrently
    }
  }
  return created
}

export interface StockShortfall {
  sku: string
  requested: number
  available: number
}

/**
 * Line items that ask for more stock than the product actually has.
 *
 * An invoice raised against an empty product used to deduct nothing at all — the old
 * `GREATEST(qty - n, 0)` floor silently swallowed it, so the sale was flagged as
 * stock-deducted while inventory never moved. Blocking up front is the only way that
 * cannot happen; see `adjustStock` for the matching arithmetic fix.
 *
 * `creditFrom` is the set of line items already deducted for this same document (an
 * invoice being edited): those quantities are restored before the new ones are taken,
 * so they count as available.
 */
export async function findStockShortfalls(
  items: LineItem[],
  opts?: { creditFrom?: LineItem[] }
): Promise<StockShortfall[]> {
  const tally = (list: LineItem[], sign: 1 | -1, into: Map<string, number>) => {
    for (const li of list) {
      const sku = extractSku(li.description)
      if (!sku || li.qty <= 0) continue
      const k = sku.toUpperCase()
      into.set(k, (into.get(k) ?? 0) + sign * li.qty)
    }
    return into
  }

  const wanted = tally(items, 1, new Map<string, number>())
  if (opts?.creditFrom) tally(opts.creditFrom, -1, wanted)

  const shortfalls: StockShortfall[] = []
  for (const [sku, requested] of wanted) {
    if (requested <= 0) continue
    const res = await db.query(
      `SELECT COALESCE(quantity, 0) AS q, track_quantity FROM products WHERE UPPER(sku) = $1 LIMIT 1`,
      [sku]
    )
    const row = res.rows[0]
    // Unknown SKU — Rule 2 auto-creates it as a draft product, there is no stock to check.
    // track_quantity = false means the product deliberately opts out of stock control.
    if (!row || row.track_quantity === false) continue
    const available = Number(row.q) || 0
    if (requested > available) shortfalls.push({ sku, requested, available })
  }
  return shortfalls
}

/** Human-readable 422 message for a set of shortfalls. */
export function shortfallMessage(shortfalls: StockShortfall[]): string {
  return `Not in stock — invoice not created:\n${shortfalls
    .map((s) => `• ${s.sku}: ${s.available} in stock, ${s.requested} requested`)
    .join('\n')}`
}

/**
 * Adjust product stock by sku. direction='subtract' deducts, 'add' restores.
 *
 * Deductions are no longer floored at zero: a shortfall shows up as a negative quantity
 * that is visible and self-corrects when stock arrives, rather than disappearing. That
 * floor also broke restores — reversing a deduction that never moved anything handed back
 * stock the shelf never had. Invoices are blocked before they get here (see
 * `findStockShortfalls`); Sales Orders may legitimately reserve stock that has not landed.
 */
export async function adjustStock(items: LineItem[], direction: 'subtract' | 'add'): Promise<void> {
  const now = new Date().toISOString()
  for (const li of items) {
    const sku = extractSku(li.description)
    if (!sku || li.qty <= 0) continue
    try {
      if (direction === 'subtract') {
        await db.query(
          `UPDATE products SET quantity = COALESCE(quantity, 0) - $1, updated_at = $2 WHERE LOWER(sku) = LOWER($3) RETURNING quantity`,
          [li.qty, now, sku]
        )
        // Rule 30: selling out no longer flips the product to Pre-Order. A sold-out
        // item reads Sold Out — Pre Order / Book Now is for products deliberately
        // flagged as pre-order items.
      } else {
        await db.query(
          `UPDATE products SET quantity = COALESCE(quantity, 0) + $1, updated_at = $2 WHERE LOWER(sku) = LOWER($3) RETURNING quantity`,
          [li.qty, now, sku]
        )
        // Restoring stock must not clear a deliberately-set pre-order flag either —
        // the flag is owned by the product, not by the stock level.
      }
    } catch {
      // best-effort
    }
  }
}
