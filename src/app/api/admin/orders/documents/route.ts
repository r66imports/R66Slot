import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import { db } from '@/lib/db'

const KEY = 'data/order-documents.json'

export interface LineItem {
  id: string
  description: string
  qty: number
  unitPrice: number
}

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

/** Extract SKU from a line item description like "PT1172G25 – G25 Compound Slick Tires..." */
export function extractSku(description: string): string {
  return description.split(/\s*[–\-]\s*/)[0]?.trim() || ''
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
    // Extract title: everything after the first " – " separator, else use the full description
    const dashIdx = li.description.search(/\s*[–\-]\s*/)
    const title = dashIdx !== -1 ? li.description.slice(dashIdx).replace(/^\s*[–\-]\s*/, '').trim() : li.description.trim()
    try {
      // Check if product already exists
      const existing = await db.query(`SELECT id FROM products WHERE LOWER(sku) = LOWER($1) LIMIT 1`, [sku])
      if (existing.rowCount && existing.rowCount > 0) continue
      // Create as draft
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
  for (const li of items) {
    const sku = extractSku(li.description)
    if (!sku || li.qty <= 0) continue
    try {
      if (direction === 'subtract') {
        await db.query(
          `UPDATE products SET quantity = GREATEST(COALESCE(quantity, 0) - $1, 0), updated_at = $2 WHERE LOWER(sku) = LOWER($3)`,
          [li.qty, new Date().toISOString(), sku]
        )
      } else {
        await db.query(
          `UPDATE products SET quantity = COALESCE(quantity, 0) + $1, updated_at = $2 WHERE LOWER(sku) = LOWER($3)`,
          [li.qty, new Date().toISOString(), sku]
        )
      }
    } catch {
      // best-effort — don't fail the whole request if one product isn't found
    }
  }
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

    if (stockable) {
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
      stockDeducted: stockable,
    }
    const docs = await getDocs()
    docs.unshift(doc)
    await saveDocs(docs)
    // Auto-create draft products for any line items not yet in inventory (best-effort)
    await autoCreateMissingProducts(lineItems).catch(() => {})
    return NextResponse.json(doc, { status: 201 })
  } catch (error) {
    console.error('Error creating document:', error)
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
  }
}
