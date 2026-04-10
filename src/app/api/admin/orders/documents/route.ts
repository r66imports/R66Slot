import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import { isRuleActive } from '@/lib/site-rules'
import { type LineItem, extractSku, autoCreateMissingProducts, adjustStock } from '@/lib/order-helpers'
import { db } from '@/lib/db'

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
  paymentMethod?: string
  createdAt: string
  updatedAt: string
  backorderId?: string
  stockDeducted?: boolean
}

async function getDocs(): Promise<OrderDocument[]> {
  return await blobRead<OrderDocument[]>(KEY, [])
}

async function saveDocs(docs: OrderDocument[]): Promise<void> {
  await blobWrite(KEY, docs)
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
    // Invoices deduct stock permanently; Sales Orders reserve (same deduction). Quotes = no impact.
    const stockable = body.type === 'invoice' || body.type === 'salesorder'
    const lineItems: LineItem[] = body.lineItems || []

    // stockAlreadyReserved = true when converting a Sales Order to Invoice.
    // The SO already deducted stock — skip both the stock limit check and re-deduction.
    const stockAlreadyReserved = !!body.stockAlreadyReserved

    // Rule 1 — Enforce Stock Limits: block creation if any line item exceeds available qty
    if (!stockAlreadyReserved && stockable && await isRuleActive('enforce_stock_limit', false)) {
      for (const li of lineItems) {
        const sku = extractSku(li.description)
        if (!sku || li.qty <= 0) continue
        const result = await db.query(
          'SELECT quantity FROM products WHERE LOWER(sku) = LOWER($1) LIMIT 1',
          [sku]
        )
        if (result.rows[0]) {
          const available = result.rows[0].quantity ?? 0
          if (li.qty > available) {
            return NextResponse.json(
              { error: `Insufficient stock for ${sku}: ${available} available, ${li.qty} requested` },
              { status: 422 }
            )
          }
        }
      }
    }

    // Rule 3 — Stock Deduction: deduct inventory when invoice/SO is created
    // Skip if stock was already reserved by the originating Sales Order
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
      paymentMethod: body.paymentMethod || '',
      createdAt: now,
      updatedAt: now,
      backorderId: body.backorderId,
      stockDeducted: deductStock,
    }
    const docs = await getDocs()
    docs.unshift(doc)
    await saveDocs(docs)
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
