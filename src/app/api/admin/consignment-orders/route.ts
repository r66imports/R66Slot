import { NextResponse } from 'next/server'
import { blobRead, blobReplaceArrayItem, blobRemoveArrayItem, blobAppendArrayItem } from '@/lib/blob-storage'
import { CONSIGNMENT_KEY, DOCS_KEY, type ConsignmentOrder, type LandedCosts, lineKey, isOpenConsignmentSO, stockPictureFor, invoicesFromSO, orderDiscount } from '@/lib/consignment'
import { skuFromDescription } from '@/lib/profit'
import { db } from '@/lib/db'
import { POST as createDocument } from '@/app/api/admin/orders/documents/route'
import { PATCH as patchDocument } from '@/app/api/admin/orders/documents/[id]/route'

/**
 * GET — clients' sold-qty reports, newest first.
 * GET ?view=stock — every open consignment Sales Order: sent / sold (invoices from it) / still out.
 */
export async function GET(request: Request) {
  const [orders, docs] = await Promise.all([
    blobRead<ConsignmentOrder[]>(CONSIGNMENT_KEY, []),
    blobRead<any[]>(DOCS_KEY, []),
  ])
  if (new URL(request.url).searchParams.get('view') === 'stock') {
    const sos = docs.filter(isOpenConsignmentSO)
      .sort((a, b) => String(b.date || b.createdAt).localeCompare(String(a.date || a.createdAt)))
    const skus = sos.flatMap(so => [...(so.lineItems || []), ...invoicesFromSO(so, docs).flatMap(i => i.lineItems || [])])
      .map((l: any) => skuFromDescription(l.description))
    const costs = await latestLandedCosts(skus)
    const rows = sos.map(so => stockPictureFor(so, orders, docs, costs))
    return NextResponse.json(rows)
  }
  return NextResponse.json([...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
}

/** LATEST landed cost per SKU — products.cost_per_item, which the Worksheet keeps current. */
async function latestLandedCosts(skus: string[]): Promise<LandedCosts> {
  const map: LandedCosts = new Map()
  const wanted = Array.from(new Set(skus.map(s => s.toUpperCase()).filter(Boolean)))
  if (wanted.length === 0) return map
  const { rows } = await db.query('SELECT UPPER(TRIM(sku)) AS sku, cost_per_item FROM products WHERE UPPER(TRIM(sku)) = ANY($1)', [wanted])
  for (const r of rows) map.set(r.sku, parseFloat(r.cost_per_item) || 0)
  return map
}

const patchDoc = (id: string, body: unknown) =>
  patchDocument(
    new Request(`http://internal/api/admin/orders/documents/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  )

/**
 * POST { id, action: 'invoice' | 'reject' | 'reopen' | 'delete' }
 *  - invoice: Orders' partial Sales Order → Invoice, run for the reported lines. The sold qtys
 *    come OFF the Sales Order and go onto a new INV invoice noted "Items from SO…". On an SO that
 *    deducted its stock, the SO keeps quiet (skipStockAdjust) and the invoice takes the deduction
 *    over (stockAlreadyReserved + stockTransferred), so nothing is taken twice. If the invoice
 *    fails the SO is put back exactly as it was.
 *  - reject:  the qtys go back to "left" on the client's checklist.
 *  - reopen:  a rejected report waits for invoicing again.
 */
export async function POST(request: Request) {
  try {
    const reqBody = await request.json()
    const { id, action } = reqBody
    const orders = await blobRead<ConsignmentOrder[]>(CONSIGNMENT_KEY, [])

    // fromInvoice { invoiceNumber } — files the client's report behind an invoice that was raised
    // from a consignment SO before the checklist existed (sales the client gave in by hand). The
    // report is filed as already invoiced on that invoice, dated when it was raised; the invoice,
    // the SO and stock are not touched.
    if (action === 'fromInvoice') {
      const docs = await blobRead<any[]>(DOCS_KEY, [])
      const inv = docs.find(d => d.type === 'invoice' && d.docNumber === reqBody.invoiceNumber)
      if (!inv) return NextResponse.json({ error: `Invoice ${reqBody.invoiceNumber} not found` }, { status: 404 })
      const so = docs.find(d => d.type === 'salesorder' && d.consignment === true && invoicesFromSO(d, [inv]).length > 0)
      if (!so) return NextResponse.json({ error: `${inv.docNumber} was not raised from a consignment Sales Order` }, { status: 409 })
      const existing = orders.find(o => o.invoiceId === inv.id)
      if (existing) return NextResponse.json({ error: `${inv.docNumber} already has a report` }, { status: 409 })
      const lines = (inv.lineItems || []).filter((l: any) => !l._service && Number(l.qty) > 0)
        .map((l: any, i: number) => ({ lineId: lineKey(l, i), description: l.description || '', qty: Number(l.qty) || 0, unitPrice: Number(l.unitPrice) || 0 }))
      const when = inv.createdAt || `${inv.date}T00:00:00.000Z`
      const filed: ConsignmentOrder = {
        id: `con_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        soId: so.id, soNumber: so.docNumber,
        clientName: so.clientName || inv.clientName || '',
        clientEmail: String(so.clientEmail || inv.clientEmail || '').toLowerCase(),
        lines,
        note: 'Sold qtys given in by the client before the checklist existed',
        status: 'invoiced', invoiceId: inv.id, invoiceNumber: inv.docNumber,
        createdAt: when, invoicedAt: when,
      }
      await blobAppendArrayItem(CONSIGNMENT_KEY, filed)
      return NextResponse.json(filed)
    }

    const order = orders.find(o => o.id === id)
    if (!order) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    if (action === 'reject' || action === 'reopen') {
      if (order.status === 'invoiced') return NextResponse.json({ error: `Already invoiced on ${order.invoiceNumber}` }, { status: 409 })
      const updated = { ...order, status: action === 'reject' ? 'rejected' : 'new' } as ConsignmentOrder
      await blobReplaceArrayItem(CONSIGNMENT_KEY, id, updated)
      return NextResponse.json(updated)
    }

    // delete — removes a report that was never invoiced (a test, or one sent by mistake).
    if (action === 'delete') {
      if (order.status === 'invoiced') return NextResponse.json({ error: `Invoiced on ${order.invoiceNumber} — it cannot be deleted` }, { status: 409 })
      await blobRemoveArrayItem(CONSIGNMENT_KEY, id)
      return NextResponse.json({ deleted: id })
    }

    if (action !== 'invoice') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    if (order.status !== 'new') {
      return NextResponse.json({ error: order.status === 'invoiced' ? `Already invoiced on ${order.invoiceNumber}` : 'Rejected — reopen it first' }, { status: 409 })
    }

    const docs = await blobRead<any[]>(DOCS_KEY, [])
    const so = docs.find(d => d.id === order.soId)
    if (!so) return NextResponse.json({ error: `Sales Order ${order.soNumber} no longer exists` }, { status: 404 })
    // An archived/rejected SO is inert on the server — shrinking it would not hand its stock over.
    if (['archived', 'rejected'].includes(so.status)) {
      return NextResponse.json({ error: `${so.docNumber} is ${so.status} — restore it to active first` }, { status: 409 })
    }

    const want = new Map(order.lines.map(l => [l.lineId, l.qty]))
    const origLines: any[] = so.lineItems || []
    const moved: any[] = []
    const remaining: any[] = []
    const stamp = Date.now()
    for (let i = 0; i < origLines.length; i++) {
      const li = origLines[i]
      const qty = Number(li.qty) || 0
      const send = want.get(lineKey(li, i)) || 0
      if (send > qty) {
        return NextResponse.json({ error: `${so.docNumber} now has only ${qty} of "${li.description}" — nothing has been changed` }, { status: 409 })
      }
      if (send > 0) moved.push({ ...li, id: `li_${stamp}_${moved.length}_${Math.random().toString(36).slice(2, 6)}`, qty: send })
      if (qty - send > 0) remaining.push({ ...li, qty: qty - send })
    }
    if (moved.length === 0) return NextResponse.json({ error: `None of the reported lines are on ${so.docNumber} any more` }, { status: 409 })

    const transferStock = so.stockDeducted === true
    // The whole consignment carries the discount the first invoice from it was given.
    const discount = orderDiscount(so, invoicesFromSO(so, docs))

    // 1 — take the sold qtys off the Sales Order (the SO's stock stays put).
    const soRes = await patchDoc(so.id, { lineItems: remaining, skipStockAdjust: true })
    if (!soRes.ok) {
      const e = await soRes.json().catch(() => ({}))
      return NextResponse.json({ error: e?.error || 'Sales Order could not be updated' }, { status: soRes.status })
    }

    // 2 — put them on a new INV invoice (Slot numbering, same as Orders).
    const nums = docs.filter(d => d.type === 'invoice').map(d => {
      const m = /^INV(\d+)$/.exec(d.docNumber || '')
      return m ? parseInt(m[1], 10) : 0
    }).filter(n => n > 0)
    const docNumber = `INV${String((nums.length ? Math.max(...nums) : 25) + 1).padStart(4, '0')}`
    const invRes = await createDocument(new Request('http://internal/api/admin/orders/documents', {
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
        lineItems: moved,
        notes: [`Items from ${so.docNumber}`, order.note].filter(Boolean).join('\n'),
        terms: so.terms || '',
        status: 'draft',
        depositMode: false,
        discountPct: discount.pct,
        ...(transferStock ? { stockAlreadyReserved: true, stockTransferred: true } : {}),
        sourceQuoteNumber: so.sourceQuoteNumber || '',
        sourceSalesOrderNumber: so.docNumber || '',
        bankAccountId: so.bankAccountId || '',
      }),
    }))
    const inv = await invRes.json().catch(() => null)
    if (!invRes.ok || !inv?.id) {
      // Put the Sales Order back exactly as it was.
      const back = await patchDoc(so.id, { lineItems: origLines, skipStockAdjust: true })
      return NextResponse.json({
        error: `${inv?.error || 'Invoice could not be created'} — ${back.ok ? `${so.docNumber} restored, nothing lost` : `AND ${so.docNumber} could not be restored, check its lines`}`,
      }, { status: invRes.ok ? 500 : invRes.status })
    }

    // Record the Invoice on the Sales Order ("INV:" under its doc # in Orders). Best-effort — the invoice already exists.
    {
      const refs = String((so as any).linkedInvoiceNumber || '').split(',').map((s: string) => s.trim()).filter(Boolean)
      if (!refs.includes(inv.docNumber)) refs.push(inv.docNumber)
      await patchDoc(so.id, { linkedInvoiceNumber: refs.join(', ') }).catch(() => null)
    }

    const updated: ConsignmentOrder = {
      ...order, status: 'invoiced', invoiceId: inv.id, invoiceNumber: inv.docNumber, invoicedAt: new Date().toISOString(),
    }
    await blobReplaceArrayItem(CONSIGNMENT_KEY, id, updated)
    return NextResponse.json({ ...updated, invoice: inv })
  } catch (e: any) {
    console.error('[consignment-orders POST]', e?.message)
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}
