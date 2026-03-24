import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import type { OrderDocument } from '../route'
import { adjustStock } from '@/lib/order-helpers'

const KEY = 'data/order-documents.json'
const CANCELLED_STATUSES = new Set(['archived', 'rejected'])

/**
 * POST /api/admin/orders/documents/sync-inventory
 *
 * Scans all invoices and sales orders that haven't had stock deducted yet
 * and applies the deductions. Safe to run multiple times — only processes
 * documents where stockDeducted !== true.
 *
 * Workflow:
 *   Invoice created  → stock deducted  (permanent sale)
 *   Sales Order      → stock reserved  (same deduction, pending confirmation)
 *   Quote            → no stock impact
 *   SO → Invoice     → no additional deduction (already reserved)
 *   Cancel/Archive   → stock restored
 */
export async function POST() {
  try {
    const docs = await blobRead<OrderDocument[]>(KEY, [])

    const pending = docs.filter(
      (d) =>
        (d.type === 'invoice' || d.type === 'salesorder') &&
        !d.stockDeducted &&
        !CANCELLED_STATUSES.has(d.status)
    )

    let synced = 0
    let skipped = 0

    for (const doc of pending) {
      try {
        await adjustStock(doc.lineItems, 'subtract')
        const idx = docs.findIndex((d) => d.id === doc.id)
        if (idx !== -1) {
          docs[idx] = { ...docs[idx], stockDeducted: true, updatedAt: new Date().toISOString() }
        }
        synced++
      } catch {
        skipped++
      }
    }

    await blobWrite(KEY, docs)

    return NextResponse.json({
      synced,
      skipped,
      total: pending.length,
      message:
        pending.length === 0
          ? 'All invoices and sales orders are already synced.'
          : `Synced ${synced} document${synced !== 1 ? 's' : ''} to inventory${skipped > 0 ? `, ${skipped} skipped` : ''}.`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
