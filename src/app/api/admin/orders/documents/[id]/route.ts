import { NextResponse } from 'next/server'
import { blobRead, blobAppendArrayItem, blobReplaceArrayItem, blobRemoveArrayItem } from '@/lib/blob-storage'
import type { OrderDocument } from '../route'
import { adjustStock, findStockShortfalls, shortfallMessage } from '@/lib/order-helpers'
import { isRuleActive } from '@/lib/site-rules'

const KEY = 'data/order-documents.json'
const BIN_KEY = 'data/invoices-bin.json'
const CANCELLED_STATUSES = new Set(['archived', 'rejected'])

// Sales Orders AND Invoices physically deduct stock. isStockable includes salesorder so all
// stock-relevant changes (line item edits, archive, delete) correctly adjust inventory.
function isStockable(type: string) {
  return type === 'invoice' || type === 'salesorder'
}

async function getDocs(): Promise<OrderDocument[]> {
  return await blobRead<OrderDocument[]>(KEY, [])
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

    // Rule 1 — an invoice may never carry more than the shelf holds. Adding lines to an
    // existing invoice (Send to Invoice → Add to Existing) lands here rather than on POST,
    // so it needs the same guard. Quantities already deducted for this document are
    // restored before the new ones are taken, so they count as available.
    // stockAlreadyReserved: the caller already took the stock elsewhere (Rule 31 — a site
    // order deducts at checkout), so there is nothing left to check.
    if (body.lineItems !== undefined && newType === 'invoice' && !isCancelled && !body.stockAlreadyReserved) {
      const alreadyDeducted = prev.stockDeducted !== false && wasStockable ? prev.lineItems : []
      const shortfalls = await findStockShortfalls(newItems, { creditFrom: alreadyDeducted })
      if (shortfalls.length > 0) {
        return NextResponse.json({ error: shortfallMessage(shortfalls), shortfalls }, { status: 422 })
      }
    }

    // Rule 3 — Stock Deduction: only adjust stock if the rule is active
    if (stockRelevantChange && (wasStockable || nowStockable) && await isRuleActive('invoice_stock_deduction', true)) {
      if (prev.stockDeducted !== false && wasStockable && isCancelled && !wasCancelled) {
        // Being cancelled/archived — restore stock UNLESS it's a fully-paid invoice being archived.
        // A paid invoice means the sale completed; stock is legitimately gone and must stay deducted.
        let shouldRestore = true
        if (newStatus === 'archived' && prev.type === 'invoice') {
          const lineTotal = prev.lineItems.reduce((s: number, li: any) => s + li.qty * (li.unitPrice || 0) * (1 - ((li.discountPct || 0) / 100)), 0)
          const disc = lineTotal * ((prev as any).discountPct || 0) / 100
          const ship = (prev as any).shippingCost || 0
          const total = lineTotal - disc + ship
          const paid = ((prev as any).amountPaid || 0) + ((prev as any).creditApplied || 0)
          if (total > 0 && total - paid <= 0.005) shouldRestore = false
        }
        if (shouldRestore) {
          await adjustStock(prev.lineItems, 'add')
          body.stockDeducted = false
        }
      } else if (prev.stockDeducted !== false && wasStockable && !isCancelled && body.lineItems) {
        // Active invoice/SO with changed line items — reverse old qty, apply new qty (handles legacy undefined)
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

    // stockAlreadyReserved is a request-only hint — it must not be persisted onto the document.
    delete body.stockAlreadyReserved
    docs[idx] = { ...prev, ...body, updatedAt: new Date().toISOString() }
    await blobReplaceArrayItem(KEY, id, docs[idx])
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

    if (doc.type === 'invoice') {
      await blobAppendArrayItem(BIN_KEY, { ...doc, stockDeducted: false, deletedAt: new Date().toISOString() })
    }

    await blobRemoveArrayItem(KEY, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
