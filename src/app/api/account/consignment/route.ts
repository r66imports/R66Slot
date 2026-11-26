import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { blobRead, blobAppendArrayItem } from '@/lib/blob-storage'
import {
  CONSIGNMENT_KEY, DOCS_KEY, type ConsignmentOrder, type ConsignmentLine,
  isOpenConsignmentSO, checklistFor, clientPictureFor,
} from '@/lib/consignment'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

async function currentCustomer(): Promise<{ id?: string; email: string } | null> {
  const token = (await cookies()).get('customer_token')?.value
  if (!token) return null
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    const email = String(decoded.email || '').toLowerCase()
    return email ? { id: decoded.id, email } : null
  } catch { return null }
}

function belongsTo(doc: any, who: { id?: string; email: string }) {
  return (doc.clientEmail || '').toLowerCase() === who.email || (!!who.id && doc.customerId === who.id)
}

async function isReseller(email: string): Promise<boolean> {
  const contacts: any[] = await blobRead('data/contacts.json', [])
  const c = (Array.isArray(contacts) ? contacts : []).find(x => (x.email || '').toLowerCase() === email)
  return c?.isReseller === true
}

/** GET — the logged-in reseller's consignment Sales Orders, with sold / remaining per line. */
export async function GET(_req: NextRequest) {
  const who = await currentCustomer()
  if (!who) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const reseller = await isReseller(who.email)
    // Rule 69 — only clients ticked Reseller on Contacts see consignment stock.
    if (!reseller) return NextResponse.json({ isReseller: false, salesOrders: [], reports: [] })
    const [docs, orders] = await Promise.all([
      blobRead<any[]>(DOCS_KEY, []),
      blobRead<ConsignmentOrder[]>(CONSIGNMENT_KEY, []),
    ])
    const sos = docs.filter(d => isOpenConsignmentSO(d) && belongsTo(d, who))
      .sort((a, b) => String(b.date || b.createdAt).localeCompare(String(a.date || a.createdAt)))
    const mine = orders.filter(o => o.clientEmail.toLowerCase() === who.email)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(o => ({ id: o.id, soNumber: o.soNumber, status: o.status, createdAt: o.createdAt,
        invoiceNumber: o.invoiceNumber, totalQty: o.lines.reduce((s, l) => s + l.qty, 0) }))
    return NextResponse.json({
      isReseller: true,
      salesOrders: sos.map(so => clientPictureFor(so, orders, docs)),
      reports: mine,
    })
  } catch (e: any) {
    console.error('[account/consignment GET]', e?.message)
    return NextResponse.json({ error: 'Could not load consignment stock' }, { status: 500 })
  }
}

/** POST { soId, lines: [{ lineId, qty }], note? } — report qtys sold off a consignment SO. */
export async function POST(req: NextRequest) {
  const who = await currentCustomer()
  if (!who) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    if (!(await isReseller(who.email))) return NextResponse.json({ error: 'Consignment stock is for resellers only' }, { status: 403 })
    const body = await req.json()
    const docs = await blobRead<any[]>(DOCS_KEY, [])
    const so = docs.find(d => d.id === body.soId)
    if (!so || !isOpenConsignmentSO(so) || !belongsTo(so, who)) {
      return NextResponse.json({ error: 'Consignment order not found' }, { status: 404 })
    }
    const orders = await blobRead<ConsignmentOrder[]>(CONSIGNMENT_KEY, [])
    const view = checklistFor(so, orders)
    const byId = new Map(view.lines.map((l: any) => [l.lineId, l]))

    const lines: ConsignmentLine[] = []
    for (const want of Array.isArray(body.lines) ? body.lines : []) {
      const qty = Math.floor(Number(want.qty) || 0)
      if (qty <= 0) continue
      const line: any = byId.get(want.lineId)
      if (!line) return NextResponse.json({ error: 'A line on this order has changed — reload and try again' }, { status: 409 })
      if (qty > line.remaining) {
        return NextResponse.json({ error: `${line.description}: only ${line.remaining} left to report, ${qty} ticked` }, { status: 422 })
      }
      lines.push({ lineId: line.lineId, description: line.description, qty, unitPrice: line.unitPrice })
    }
    if (lines.length === 0) return NextResponse.json({ error: 'Tick at least one sold qty' }, { status: 400 })

    const order: ConsignmentOrder = {
      id: `con_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      soId: so.id,
      soNumber: so.docNumber,
      clientName: so.clientName || '',
      clientEmail: who.email,
      lines,
      note: typeof body.note === 'string' ? body.note.slice(0, 1000) : undefined,
      status: 'new',
      createdAt: new Date().toISOString(),
    }
    await blobAppendArrayItem(CONSIGNMENT_KEY, order)
    return NextResponse.json(order)
  } catch (e: any) {
    console.error('[account/consignment POST]', e?.message)
    return NextResponse.json({ error: 'Could not send your sold qtys' }, { status: 500 })
  }
}
