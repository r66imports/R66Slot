import { db } from '@/lib/db'
import { isRuleActive } from '@/lib/site-rules'

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

/** Adjust product stock by sku. direction='subtract' deducts (floor 0), 'add' restores. */
export async function adjustStock(items: LineItem[], direction: 'subtract' | 'add'): Promise<void> {
  const autoPreOrder = await isRuleActive('auto_preorder_on_oos', true)
  const now = new Date().toISOString()
  for (const li of items) {
    const sku = extractSku(li.description)
    if (!sku || li.qty <= 0) continue
    try {
      if (direction === 'subtract') {
        const res = await db.query(
          `UPDATE products SET quantity = GREATEST(COALESCE(quantity, 0) - $1, 0), updated_at = $2 WHERE LOWER(sku) = LOWER($3) RETURNING quantity`,
          [li.qty, now, sku]
        )
        if (autoPreOrder && res.rows[0]?.quantity === 0) {
          await db.query(
            `UPDATE products SET is_pre_order = true, updated_at = $1 WHERE LOWER(sku) = LOWER($2) AND NOT COALESCE(is_pre_order, false)`,
            [now, sku]
          )
        }
      } else {
        const res = await db.query(
          `UPDATE products SET quantity = COALESCE(quantity, 0) + $1, updated_at = $2 WHERE LOWER(sku) = LOWER($3) RETURNING quantity`,
          [li.qty, now, sku]
        )
        if (autoPreOrder && (res.rows[0]?.quantity ?? 0) > 0) {
          await db.query(
            `UPDATE products SET is_pre_order = false, updated_at = $1 WHERE LOWER(sku) = LOWER($2) AND COALESCE(is_pre_order, false)`,
            [now, sku]
          )
        }
      }
    } catch {
      // best-effort
    }
  }
}
