import { NextResponse } from 'next/server'
import { blobRead, blobAppendArrayItem, blobReplaceArrayItem, blobRemoveArrayItem } from '@/lib/blob-storage'
import type { OrderDocument } from '../route'
import { adjustStock, findStockShortfalls, shortfallMessage, sameStockFootprint } from '@/lib/order-helpers'
import { isRuleActive } from '@/lib/site-rules'
import { documentTotal, isFullySettled, MONEY_EPSILON } from '@/lib/payment-math'

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

    // appendLineItems — merge against the document as it stands RIGHT NOW. Callers used to
    // build the whole array from a copy fetched when their dropdown opened; two sends racing
    // each other, or one made from a page loaded minutes earlier, then wrote whole arrays
    // over one another and quietly dropped the other's lines.
    if (Array.isArray(body.appendLineItems)) {
      body.lineItems = [...(prev.lineItems || []), ...body.appendLineItems]
      delete body.appendLineItems
    }

    const newStatus = body.status ?? prev.status
    const newType = body.type ?? prev.type
    const newItems = body.lineItems ?? prev.lineItems

    const isCancelled = CANCELLED_STATUSES.has(newStatus)
    // Only a REJECTION undoes a sale. ARCHIVING IS FILING — it clears a spent quote or a
    // finished invoice off the active list to keep the workflow fast, carries no business
    // meaning, and must never move stock.
    // `archived` deliberately STAYS in CANCELLED_STATUSES. That is what keeps an archived
    // document INERT: isCancelled remains true for it, so no later save can deduct it back
    // out either — including the on-open autosave of a legacy archived doc still carrying
    // stockDeducted: false from the old restore. It also leaves the Rule 1 shortfall guard
    // and sync-inventory reading 'archived' exactly as they always have.
    const isRejecting = newStatus === 'rejected' && prev.status !== 'rejected'
    const wasStockable = isStockable(prev.type)
    const nowStockable = isStockable(newType)

    // Only run stock logic if something stock-relevant actually changed. An autosave
    // resends the whole document every tick, so the presence of `lineItems` is not a
    // change — only a different SKU/qty footprint is. Comparing the two stops each tick
    // restoring and re-deducting every line for no net movement.
    const itemsChanged = body.lineItems !== undefined && !sameStockFootprint(prev.lineItems, newItems)
    // A stockable document that never took its stock still has to take it, even on a save
    // that changed nothing — that is how a record left un-deducted catches up. It settles
    // after one pass, because the deduction sets the flag and later saves find nothing to do.
    const needsInitialDeduct =
      body.lineItems !== undefined && !prev.stockDeducted && nowStockable && !isCancelled
    const stockRelevantChange =
      body.status !== undefined || body.type !== undefined || itemsChanged || needsInitialDeduct

    // Rule 1 — an invoice may never carry more than the shelf holds. Adding lines to an
    // existing invoice (Send to Invoice → Add to Existing) lands here rather than on POST,
    // so it needs the same guard. Quantities already deducted for this document are
    // restored before the new ones are taken, so they count as available.
    // stockAlreadyReserved: the caller already took the stock elsewhere (Rule 31 — a site
    // order deducts at checkout), so there is nothing left to check.
    if (itemsChanged && newType === 'invoice' && !isCancelled && !body.stockAlreadyReserved) {
      const alreadyDeducted = prev.stockDeducted !== false && wasStockable ? prev.lineItems : []
      const shortfalls = await findStockShortfalls(newItems, { creditFrom: alreadyDeducted })
      if (shortfalls.length > 0) {
        return NextResponse.json({ error: shortfallMessage(shortfalls), shortfalls }, { status: 422 })
      }
    }

    // skipStockAdjust: the caller owns this document's stock movement. Rule 31 — a site
    // order's stock is deducted at checkout and held by the order itself, so moving its
    // lines onto or off an invoice must neither credit nor deduct anything here.
    const skipStockAdjust = !!body.skipStockAdjust

    // Rule 3 — Stock Deduction: only adjust stock if the rule is active
    if (!skipStockAdjust && stockRelevantChange && (wasStockable || nowStockable) && await isRuleActive('invoice_stock_deduction', true)) {
      if (prev.stockDeducted !== false && wasStockable && isRejecting) {
        // Rejected — the sale is undone, so the goods go back on the shelf. Rejection and
        // DELETE are the only two deliberate restores; archiving is neither. This fires on a
        // rejection from any prior status, so filing an invoice and rejecting it afterwards
        // still returns the stock.
        await adjustStock(prev.lineItems, 'add')
        body.stockDeducted = false
      } else if (prev.stockDeducted !== false && wasStockable && !isCancelled && itemsChanged) {
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

    // A Paid document whose total goes UP on this edit (a line added, a discount taken off,
    // shipping added) is no longer paid. Left on 'paid', the list shows it green with no
    // "Due" badge while the balance sits unpaid. Falls back to 'accepted', the same status the
    // invoice modal uses when a payment is removed. Only on a rise, so a legacy doc that was
    // already short is never flipped by an unrelated save.
    if (prev.status === 'paid' && body.status === undefined) {
      const merged = { ...prev, ...body } as any
      if (documentTotal(merged) > documentTotal(prev as any) + MONEY_EPSILON && !isFullySettled(merged)) {
        body.status = 'accepted'
      }
    }

    // Request-only hints — they must not be persisted onto the document.
    delete body.stockAlreadyReserved
    delete body.skipStockAdjust
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
