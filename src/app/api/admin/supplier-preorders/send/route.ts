import { NextResponse } from 'next/server'
import { blobRead, blobWrite, blobAppendArrayItems } from '@/lib/blob-storage'
import type { SupplierPreOrder } from '@/types/supplier-preorder'
import type { SupplierOrderLine } from '@/types/supplier-order'

const KEY = 'data/supplier-preorders.json'
const SUPPLIER_ORDERS_KEY = 'data/supplier-orders.json'

/**
 * Push client pre-orders onto a Supplier Order.
 *
 * Client requests are gathered separately from the supplier orders we raise
 * ourselves, and only join them here, once reviewed. Every selected pre-order
 * for a supplier lands on ONE order ref so the supplier receives a single
 * order, whether that ref is new or an existing non-client one being merged
 * into.
 *
 * The push copies lines; it does not move stock. A supplier order line becomes
 * stock the ordinary way, when the goods land through the Worksheet (Rule 59).
 *
 * Body: {
 *   ids: string[],                   // pre-orders to send
 *   mode: 'new' | 'existing',
 *   supplierOrderRef?: string,       // required for 'existing'
 *   supplierOrderName?: string,      // label for a new order
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const ids: string[] = Array.isArray(body.ids) ? body.ids : []
    const mode = body.mode === 'existing' ? 'existing' : 'new'
    if (ids.length === 0) return NextResponse.json({ error: 'No pre orders selected' }, { status: 400 })

    const all = await blobRead<SupplierPreOrder[]>(KEY, [])
    const selected = all.filter((o) => ids.includes(o.id))
    if (selected.length === 0) return NextResponse.json({ error: 'Pre orders not found' }, { status: 404 })

    const archived = selected.filter((o) => o.status === 'archived')
    if (archived.length > 0) {
      return NextResponse.json(
        { error: `${archived.map((o) => o.ref).join(', ')} is archived and cannot be sent.` },
        { status: 409 }
      )
    }

    // One supplier per send. Mixing suppliers onto one order would send a
    // supplier somebody else's items.
    const supplierIds = [...new Set(selected.map((o) => o.supplierId))]
    if (supplierIds.length > 1) {
      return NextResponse.json(
        { error: 'Those pre orders belong to different suppliers. Send one supplier at a time.' },
        { status: 400 }
      )
    }

    const supplierId = supplierIds[0]
    const supplierName = selected[0].supplierName

    let ref = (body.supplierOrderRef || '').trim()
    let orderName = (body.supplierOrderName || '').trim()

    if (mode === 'existing') {
      if (!ref) return NextResponse.json({ error: 'Pick an order to merge into' }, { status: 400 })
      const existingLines = await blobRead<SupplierOrderLine[]>(SUPPLIER_ORDERS_KEY, [])
      const target = existingLines.find((l) => l.supplierOrderRef === ref)
      if (!target) return NextResponse.json({ error: `Order ${ref} no longer exists` }, { status: 404 })
      orderName = target.supplierOrderName || orderName || supplierName
    } else {
      if (!ref) {
        // SPO-ORD0001, numbered independently of the client pre-order refs.
        const existingLines = await blobRead<SupplierOrderLine[]>(SUPPLIER_ORDERS_KEY, [])
        const highest = existingLines.reduce((max, l) => {
          const m = /^SPO-ORD(\d+)$/i.exec(l.supplierOrderRef || '')
          const n = m ? parseInt(m[1], 10) : 0
          return n > max ? n : max
        }, 0)
        ref = `SPO-ORD${String(highest + 1).padStart(4, '0')}`
      }
      orderName = orderName || `${supplierName} — client requests`
    }

    const now = new Date().toISOString()
    const created: SupplierOrderLine[] = []

    for (const order of selected) {
      for (const line of order.lines) {
        if (line.status === 'rejected') continue
        created.push({
          id: `sol_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          supplierId: supplierId || undefined,
          supplierName,
          supplierOrderRef: ref,
          supplierOrderName: orderName,
          sku: line.sku,
          description: line.description,
          brand: line.brand || undefined,
          qty: line.qty,
          // The supplier order carries what WE pay, in the supplier's currency —
          // not the client's ZAR estimate.
          price: line.wholesalePrice,
          clientName: order.clientName || undefined,
          clientEmail: order.clientEmail || undefined,
          clientPhone: order.clientPhone || undefined,
          quoteNumber: order.quoteNumber || undefined,
          notes: line.isNewSku ? 'Client-entered SKU — confirm with supplier' : undefined,
          source: `supplier-preorder:${order.ref}`,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        })
      }
    }

    if (created.length === 0) {
      return NextResponse.json({ error: 'Every line on those pre orders is rejected' }, { status: 400 })
    }

    await blobAppendArrayItems(SUPPLIER_ORDERS_KEY, created)

    // Mark the pre-orders as sent. Read-modify-write the whole array once rather
    // than per order, so a multi-order send cannot half-apply.
    const fresh = await blobRead<SupplierPreOrder[]>(KEY, [])
    const updated = fresh.map((o) =>
      ids.includes(o.id)
        ? {
            ...o,
            status: 'ordered' as const,
            supplierOrderRef: ref,
            mergedIntoRef: mode === 'existing' ? ref : o.mergedIntoRef,
            updatedAt: now,
          }
        : o
    )
    await blobWrite(KEY, updated)

    return NextResponse.json({
      success: true,
      supplierOrderRef: ref,
      supplierOrderName: orderName,
      linesAdded: created.length,
      preOrders: selected.map((o) => o.ref),
      merged: mode === 'existing',
    })
  } catch (error: any) {
    console.error('Error sending supplier pre orders:', error)
    return NextResponse.json({ error: error?.message || 'Failed to send' }, { status: 500 })
  }
}
