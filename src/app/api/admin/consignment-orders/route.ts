import { NextResponse } from 'next/server'
import { blobRead, blobReplaceArrayItem } from '@/lib/blob-storage'
import { CONSIGNMENT_KEY, DOCS_KEY, type ConsignmentOrder, checklistFor } from '@/lib/consignment'
import { POST as createDocument } from '@/app/api/admin/orders/documents/route'

/** GET — every Consignment Order, newest first, with each SO's sold / remaining picture. */
export async function GET() {
  const [orders, docs] = await Promise.all([
    blobRead<ConsignmentOrder[]>(CONSIGNMENT_KEY, []),
    blobRead<any[]>(DOCS_KEY, []),
  ])
  const soById = new Map(docs.filter(d => d.type === 'salesorder').map(d => [d.id, d]))
  const rows = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(o => {
    const so = soById.get(o.soId)
    return { ...o, so: so ? checklistFor(so, orders) : null }
  })
  return NextResponse.json(rows)
}

/**
 * POST { id, action: 'invoice' | 'reject' | 'reopen' }
 *  - invoice: raises an INV invoice for the sold lines. The consignment SO already took this stock
 *    off the shelf, so the invoice is created with stockAlreadyReserved and never deducts again.
 *  - reject:  the reseller's qtys go back to "remaining" on their checklist.
 *  - reopen:  a rejected report becomes new again.
 */
export async function POST(request: Request) {
  try {
    const { id, action } = await request.json()
    const orders = await blobRead<ConsignmentOrder[]>(CONSIGNMENT_KEY, [])
    const order = orders.find(o => o.id === id)
    if (!order) return NextResponse.json({ error: 'Consignment order not found' }, { status: 404 })

    if (action === 'reject' || action === 'reopen') {
      if (order.status === 'invoiced') return NextResponse.json({ error: `Already invoiced on ${order.invoiceNumber}` }, { status: 409 })
      const updated = { ...order, status: action === 'reject' ? 'rejected' : 'new' } as ConsignmentOrder
      await blobReplaceArrayItem(CONSIGNMENT_KEY, id, updated)
      return NextResponse.json(updated)
    }

    if (action !== 'invoice') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    if (order.status !== 'new') {
      return NextResponse.json({ error: order.status === 'invoiced' ? `Already invoiced on ${order.invoiceNumber}` : 'Rejected — reopen it first' }, { status: 409 })
    }

    const docs = await blobRead<any[]>(DOCS_KEY, [])
    const so = docs.find(d => d.id === order.soId)
    if (!so) return NextResponse.json({ error: `Sales Order ${order.soNumber} no longer exists` }, { status: 404 })

    const nums = docs.filter(d => d.type === 'invoice').map(d => {
      const m = /^INV(\d+)$/.exec(d.docNumber || '')
      return m ? parseInt(m[1], 10) : 0
    }).filter(n => n > 0)
    // Slot numbering: INV0026 (same as Orders → Send to Invoice).
    const docNumber = `INV${String((nums.length ? Math.max(...nums) : 25) + 1).padStart(4, '0')}`
    // Only skip the deduction when the SO really took the stock (Rule 3 may have been off).
    const stockAlreadyReserved = so.stockDeducted === true || so.stockHeldExternally === true
    const stamp = Date.now()

    const res = await createDocument(new Request('http://internal/api/admin/orders/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'invoice',
        docNumber,
        date: new Date().toISOString().slice(0, 10),
        clientName: so.clientName || order.clientName || 'Unknown',
        clientEmail: so.clientEmail || order.clientEmail,
        clientPhone: so.clientPhone || '',
        clientAddress: so.clientAddress || '',
        lineItems: order.lines.map((l, i) => ({ id: `li_${stamp}_${i}`, description: l.description, qty: l.qty, unitPrice: l.unitPrice })),
        notes: `Consignment ${order.number} — sold from ${order.soNumber}${order.note ? `\n${order.note}` : ''}`,
        terms: so.terms || '',
        status: 'draft',
        bankAccountId: so.bankAccountId || '',
        stockAlreadyReserved,
        // Read by the documents PATCH guard (Rule 69): this invoice never moves stock the SO holds.
        consignmentOrder: order.number,
      }),
    }))
    const created = await res.json()
    if (!res.ok) return NextResponse.json({ error: created?.error || 'Invoice could not be created' }, { status: res.status })

    const updated: ConsignmentOrder = {
      ...order, status: 'invoiced', invoiceId: created.id, invoiceNumber: created.docNumber, invoicedAt: new Date().toISOString(),
    }
    await blobReplaceArrayItem(CONSIGNMENT_KEY, id, updated)
    return NextResponse.json({ ...updated, invoice: created })
  } catch (e: any) {
    console.error('[consignment-orders POST]', e?.message)
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}
