import { db } from '@/lib/db'

export type StockSource =
  | 'invoice'
  | 'invoice_restore'
  | 'salesorder'
  | 'salesorder_restore'
  | 'site_order'
  | 'site_order_restore'
  | 'worksheet_import'
  | 'inventory_save'
  | 'pos'
  | 'manual'
  | 'product_create'
  | 'product_delete'
  | 'dedupe_merge'
  // A physical shelf count. Deliberately NOT an intake source: nothing arrived, the book
  // was corrected to match the shelf. Counting it as intake would let a count of 3 on a
  // SKU with a 24-unit worksheet overwrite the 24 and report 21 units oversold.
  | 'stocktake'

let tableReady = false

async function ensureTable() {
  if (tableReady) return
  await db.query(`
    CREATE TABLE IF NOT EXISTS stock_audit_log (
      id          BIGSERIAL PRIMARY KEY,
      sku         TEXT NOT NULL,
      change_qty  INTEGER NOT NULL,
      qty_before  INTEGER,
      qty_after   INTEGER,
      source      TEXT NOT NULL,
      reference   TEXT,
      notes       TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`CREATE INDEX IF NOT EXISTS stock_audit_log_sku_idx ON stock_audit_log (sku)`)
  await db.query(`CREATE INDEX IF NOT EXISTS stock_audit_log_ts_idx  ON stock_audit_log (created_at DESC)`)
  tableReady = true
}

export async function logStockChange(opts: {
  sku: string
  changeQty: number
  qtyBefore?: number | null
  qtyAfter?: number | null
  source: StockSource
  reference?: string
  notes?: string
}): Promise<void> {
  try {
    await ensureTable()
    await db.query(
      `INSERT INTO stock_audit_log (sku, change_qty, qty_before, qty_after, source, reference, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        opts.sku.toUpperCase(),
        opts.changeQty,
        opts.qtyBefore ?? null,
        opts.qtyAfter ?? null,
        opts.source,
        opts.reference ?? null,
        opts.notes ?? null,
      ]
    )
  } catch {
    // non-fatal — never break the main operation
  }
}
