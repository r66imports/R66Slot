import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import type { OrderDocument } from '../route'
import { adjustStock } from '@/lib/order-helpers'
import { isRuleActive } from '@/lib/site-rules'

const KEY = 'data/order-documents.json'
const CANCELLED_STATUSES = new Set(['archived', 'rejected'])

// Both invoices and sales orders hold stock. Quotes do not.
function isStockable(type: string) {
  return type === 'invoice' || type === 'salesorder'
}

async function getDocs(): Promise<OrderDocument[]> {
  return await blobRead<OrderDocument[]>(KEY, [])
}

async function saveDocs(docs: OrderDocument[]): Promise<void> {
  await blobWrite(KEY, docs)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const docs = await getDocs()
    const idx = docs.findIndex((d) => d.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const prev = docs[idx]
    const newStatus = body.status ?? prev.status
    const newType = body.type ?? prev.type
    const newItems = body.lineItems ?? prev.lineItems

    const wasCancelled = CANCELLED_STATUSES.has(prev.status)
    const isCancelled = CANCELLED_STATUSES.has(newStatus)
    const wasStockable = isStockable(prev.type)
    const nowStockable = isStockable(newType)

    // Only run stock logic if something stock-relevant actually changed
    const stockRelevantChange = body.status !== undefined || body.type !== undefined || body.lineItems !== undefined

    // Rule 3 — Stock Deduction: only adjust stock if the rule is active
    if (stockRelevantChange && (wasStockable || nowStockable) && await isRuleActive('invoice_stock_deduction', true)) {
      if (prev.stockDeducted !== false && wasStockable && isCancelled && !wasCancelled) {
        // Being cancelled/archived — restore stock (handles both stockDeducted:true and legacy undefined)
        await adjustStock(prev.lineItems, 'add')
        body.stockDeducted = false
      } else if (prev.stockDeducted && !isCancelled && body.lineItems) {
        // Active invoice/SO with changed line items — reverse old qty, apply new qty
        await adjustStock(prev.lineItems, 'add')
        await adjustStock(newItems, 'subtract')
        body.stockDeducted = true
      } else if (!prev.stockDeducted && nowStockable && !isCancelled) {
        // Wasn't deducted (quote→SO/invoice upgrade, or old record) — deduct now
        await adjustStock(newItems, 'subtract')
        body.stockDeducted = true
      } else if (prev.stockDeducted && !nowStockable) {
        // Type downgraded to quote — restore stock
        await adjustStock(prev.lineItems, 'add')
        body.stockDeducted = false
      }
      // If type changes from salesorder→invoice and stockDeducted is already true: no action needed
    }

    docs[idx] = { ...prev, ...body, updatedAt: new Date().toISOString() }
    await saveDocs(docs)
    return NextResponse.json(docs[idx])
  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const docs = await getDocs()
    const doc = docs.find((d) => d.id === id)
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Restore stock on delete (handles both stockDeducted:true and legacy undefined)
    if (doc.stockDeducted !== false && isStockable(doc.type)) {
      await adjustStock(doc.lineItems, 'add')
    }

    const filtered = docs.filter((d) => d.id !== id)
    await saveDocs(filtered)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
