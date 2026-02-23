import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import type { Backorder } from '../route'

const BACKORDERS_KEY = 'data/backorders.json'

async function getBackorders(): Promise<Backorder[]> {
  return await blobRead<Backorder[]>(BACKORDERS_KEY, [])
}

async function saveBackorders(backorders: Backorder[]): Promise<void> {
  await blobWrite(BACKORDERS_KEY, backorders)
}

// PATCH — update any allowed fields, including phase checkboxes
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const backorders = await getBackorders()
    const idx = backorders.findIndex((b) => b.id === id)

    if (idx === -1) {
      return NextResponse.json({ error: 'Backorder not found' }, { status: 404 })
    }

    const allowedFields = [
      'clientName', 'clientEmail', 'clientPhone',
      'sku', 'description', 'brand', 'supplierLink', 'qty', 'price',
      'phaseQuote', 'phaseQuoteDate',
      'phaseSalesOrder', 'phaseSalesOrderDate',
      'phaseInvoice', 'phaseInvoiceDate',
      'phaseDepositPaid', 'phaseDepositPaidDate',
      'notes', 'status',
    ]

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    // Auto-stamp phase dates when ticked
    const now = new Date().toISOString()
    if (body.phaseQuote === true && !backorders[idx].phaseQuoteDate) {
      updates.phaseQuoteDate = now
    }
    if (body.phaseSalesOrder === true && !backorders[idx].phaseSalesOrderDate) {
      updates.phaseSalesOrderDate = now
    }
    if (body.phaseInvoice === true && !backorders[idx].phaseInvoiceDate) {
      updates.phaseInvoiceDate = now
    }
    if (body.phaseDepositPaid === true && !backorders[idx].phaseDepositPaidDate) {
      updates.phaseDepositPaidDate = now
    }

    // Auto-complete when all phases done
    if (
      (updates.phaseDepositPaid === true || backorders[idx].phaseDepositPaid) &&
      (updates.phaseInvoice === true || backorders[idx].phaseInvoice) &&
      (updates.phaseSalesOrder === true || backorders[idx].phaseSalesOrder) &&
      (updates.phaseQuote === true || backorders[idx].phaseQuote)
    ) {
      updates.status = 'complete'
    }

    backorders[idx] = { ...backorders[idx], ...updates } as Backorder
    await saveBackorders(backorders)

    return NextResponse.json(backorders[idx])
  } catch (error) {
    console.error('Error updating backorder:', error)
    return NextResponse.json({ error: 'Failed to update backorder' }, { status: 500 })
  }
}

// DELETE
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const backorders = await getBackorders()
    const filtered = backorders.filter((b) => b.id !== id)

    if (filtered.length === backorders.length) {
      return NextResponse.json({ error: 'Backorder not found' }, { status: 404 })
    }

    await saveBackorders(filtered)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting backorder:', error)
    return NextResponse.json({ error: 'Failed to delete backorder' }, { status: 500 })
  }
}
