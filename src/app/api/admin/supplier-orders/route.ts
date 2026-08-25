import { NextResponse } from 'next/server'
import { blobRead, blobAppendArrayItems, blobReplaceArrayItem, blobRemoveArrayItem } from '@/lib/blob-storage'
import type { SupplierOrderLine } from '@/types/supplier-order'

const SUPPLIER_ORDERS_KEY = 'data/supplier-orders.json'

function normalizeLine(body: any, ref: string, name: string, supplierId: string, supplierName: string, now: string, idx: number): SupplierOrderLine {
  return {
    id: `sol_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 8)}`,
    supplierId: supplierId || undefined,
    supplierName,
    supplierOrderRef: ref,
    supplierOrderName: name,
    sku: (body.sku || '').trim(),
    description: (body.description || '').trim(),
    brand: (body.brand || '').trim() || undefined,
    qty: Number(body.qty) || 1,
    price: Number(body.price) || 0,
    clientName: (body.clientName || '').trim() || undefined,
    clientEmail: (body.clientEmail || '').trim() || undefined,
    clientPhone: (body.clientPhone || '').trim() || undefined,
    quoteNumber: (body.quoteNumber || '').trim() || undefined,
    notes: (body.notes || '').trim() || undefined,
    source: (body.source || '').trim() || undefined,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }
}

// GET — every supplier order line. ?all=true includes completed/cancelled lines.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all') === 'true'
    const lines = await blobRead<SupplierOrderLine[]>(SUPPLIER_ORDERS_KEY, [])
    const filtered = all ? lines : lines.filter((l) => l.status === 'active')
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return NextResponse.json(filtered)
  } catch (error) {
    console.error('Error fetching supplier orders:', error)
    return NextResponse.json([], { status: 200 })
  }
}

// POST — add lines to a supplier order. Send the whole quote in one call:
// { supplierOrderRef, supplierOrderName, supplierId, supplierName, lines: [...] }
// All lines land in a single write, so parallel sends cannot clobber each other.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supplierName = (body.supplierName || '').trim()
    const ref = (body.supplierOrderRef || '').trim()
    const name = (body.supplierOrderName || '').trim() || supplierName
    const supplierId = (body.supplierId || '').trim()

    if (!supplierName) return NextResponse.json({ error: 'supplierName is required' }, { status: 400 })
    if (!ref) return NextResponse.json({ error: 'supplierOrderRef is required' }, { status: 400 })

    const incoming: any[] = Array.isArray(body.lines) ? body.lines : [body]
    const usable = incoming.filter((l) => (l?.description || '').trim())
    if (usable.length === 0) return NextResponse.json({ error: 'No lines to add' }, { status: 400 })

    const now = new Date().toISOString()
    const created = usable.map((l, i) =>
      normalizeLine({ ...l, clientName: l.clientName ?? body.clientName, clientEmail: l.clientEmail ?? body.clientEmail, clientPhone: l.clientPhone ?? body.clientPhone, quoteNumber: l.quoteNumber ?? body.quoteNumber, source: l.source ?? body.source }, ref, name, supplierId, supplierName, now, i)
    )

    await blobAppendArrayItems(SUPPLIER_ORDERS_KEY, created)
    return NextResponse.json({ success: true, added: created.length, lines: created }, { status: 201 })
  } catch (error) {
    console.error('Error creating supplier order lines:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}

// PATCH — update one line (qty, price, status, …)
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const id = (body.id || '').trim()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const lines = await blobRead<SupplierOrderLine[]>(SUPPLIER_ORDERS_KEY, [])
    const existing = lines.find((l) => l.id === id)
    if (!existing) return NextResponse.json({ error: 'Line not found' }, { status: 404 })

    const updated: SupplierOrderLine = { ...existing, ...body, id: existing.id, updatedAt: new Date().toISOString() }
    await blobReplaceArrayItem(SUPPLIER_ORDERS_KEY, id, updated)
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating supplier order line:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

// DELETE — remove one line by ?id=
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = (searchParams.get('id') || '').trim()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    await blobRemoveArrayItem(SUPPLIER_ORDERS_KEY, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting supplier order line:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
