import { NextResponse } from 'next/server'
import { blobRead, blobAppendArrayItem } from '@/lib/blob-storage'
import { isRuleActive } from '@/lib/site-rules'
import { type LineItem, autoCreateMissingProducts, adjustStock, findStockShortfalls, shortfallMessage } from '@/lib/order-helpers'

export type { LineItem }

const KEY = 'data/order-documents.json'

export interface OrderDocument {
  id: string
  type: 'quote' | 'salesorder' | 'invoice'
  docNumber: string
  date: string
  clientName: string
  clientEmail: string
  clientPhone: string
  clientAddress: string
  lineItems: LineItem[]
  notes: string
  terms: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'complete' | 'paid' | 'archived'
  pushedToSage: boolean
  sageRef?: string
  discountPct?: number
  shippingCost?: number
  shippingMethod?: string
  trackingNumber?: string
  depositPaid?: number
  // Pre Order Deposit (Quotes only) — must survive creation, not just later edits
  preOrderDeposit?: boolean
  depositMode?: boolean
  depositPct?: number
  paymentMethod?: string
  bankAccountId?: string
  createdAt: string
  updatedAt: string
  backorderId?: string
  stockDeducted?: boolean
  // Quotes only — set once the quote's lines have been pushed to a supplier order
  supplierOrderSent?: boolean
  supplierOrderRef?: string
  supplierOrderName?: string
  supplierOrderSupplier?: string
}

async function getDocs(): Promise<OrderDocument[]> {
  return await blobRead<OrderDocument[]>(KEY, [])
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    let docs = await getDocs()
    if (type) docs = docs.filter((d) => d.type === type)
    docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return NextResponse.json(docs)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.type || !body.clientName || !body.docNumber) {
      return NextResponse.json({ error: 'type, clientName and docNumber are required' }, { status: 400 })
    }
    const now = new Date().toISOString()
    // Sales Orders AND Invoices deduct physical stock. SO = reserves/deducts immediately.
    // Converting SO→Invoice: stockAlreadyReserved:true skips re-deduction to avoid double-deduct.
    // Quotes = no impact.
    const stockable = body.type === 'invoice' || body.type === 'salesorder'
    const lineItems: LineItem[] = body.lineItems || []

    // stockAlreadyReserved = true when converting a Sales Order (stockDeducted:true) to Invoice.
    // The SO already deducted stock — skip re-deduction to avoid double-deduct.
    const stockAlreadyReserved = !!body.stockAlreadyReserved

    // Rule 1 — Enforce Stock Limits: invoices only (SOs may be created for items not yet in stock).
    // Always enforced, regardless of the toggle: an invoice raised against an empty product was
    // flagged as stock-deducted while inventory never moved, so the sale silently vanished.
    // Nothing that is not in stock may be invoiced.
    if (!stockAlreadyReserved && body.type === 'invoice') {
      const shortfalls = await findStockShortfalls(lineItems)
      if (shortfalls.length > 0) {
        return NextResponse.json({ error: shortfallMessage(shortfalls), shortfalls }, { status: 422 })
      }
    }

    // Rule 3 — Stock Deduction: deduct inventory when creating Sales Orders or Invoices
    const deductStock = !stockAlreadyReserved && stockable && await isRuleActive('invoice_stock_deduction', true)
    if (deductStock) {
      await adjustStock(lineItems, 'subtract')
    }

    const doc: OrderDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: body.type,
      docNumber: body.docNumber,
      date: body.date || now.slice(0, 10),
      clientName: body.clientName,
      clientEmail: body.clientEmail || '',
      clientPhone: body.clientPhone || '',
      clientAddress: body.clientAddress || '',
      lineItems,
      notes: body.notes || '',
      terms: body.terms || '',
      status: body.status || 'draft',
      pushedToSage: false,
      discountPct: body.discountPct || 0,
      shippingCost: body.shippingCost || 0,
      shippingMethod: body.shippingMethod || '',
      trackingNumber: body.trackingNumber || '',
      depositPaid: body.depositPaid || 0,
      preOrderDeposit: body.preOrderDeposit || false,
      depositMode: body.depositMode || false,
      depositPct: body.depositPct || 0,
      paymentMethod: body.paymentMethod || '',
      bankAccountId: body.bankAccountId || '',
      createdAt: now,
      updatedAt: now,
      backorderId: body.backorderId,
      stockDeducted: deductStock,
      supplierOrderSent: body.supplierOrderSent || false,
      supplierOrderRef: body.supplierOrderRef,
      supplierOrderName: body.supplierOrderName,
      supplierOrderSupplier: body.supplierOrderSupplier,
    }
    await blobAppendArrayItem(KEY, doc)
    // Rule 2 — Auto-Create Product: create draft products for unknown SKUs (best-effort)
    // Skip for pre-orders (stockAlreadyReserved) — items haven't arrived, products already exist
    if (!stockAlreadyReserved && await isRuleActive('auto_create_product', true)) {
      await autoCreateMissingProducts(lineItems).catch(() => {})
    }
    return NextResponse.json(doc, { status: 201 })
  } catch (error) {
    console.error('Error creating document:', error)
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
  }
}
