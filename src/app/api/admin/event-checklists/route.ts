import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/event-checklists.json'

export interface EventChecklistItem {
  id: string
  sku: string
  title: string
  qtyOut: number
  /** null until the stock has been counted back in — Sold is only known once it is set. */
  qtyIn: number | null
  /** Staff confirmed the unsold stock is back in the shop. Confirmation only — no stock moves. */
  returned?: boolean
  returnedAt?: string
  returnedBy?: string
}

/**
 * Stock taken to an event and brought back. This is a count sheet only — it never moves
 * stock. Stock drops when the sale is invoiced. Sold is the invoiced quantity, listed per
 * SKU with the invoice numbers, quantities and payment methods; QTY In is the physical count
 * back (expected = Event Stock − Sold). Event Stock is capped at what inventory holds.
 */
export interface EventChecklist {
  id: string
  name: string
  location: string
  date: string
  /** Last day of a multi-day event. Equal to `date` for a single day. */
  dateTo: string
  notes: string
  items: EventChecklistItem[]
  /** Invoices in the date range that are not event sales (e.g. an online order that day). */
  excludedInvoiceIds: string[]
  archived: boolean
  createdAt: string
  updatedAt: string
}

async function getAll(): Promise<EventChecklist[]> {
  return blobRead<EventChecklist[]>(KEY, [])
}

async function saveAll(data: EventChecklist[]): Promise<void> {
  await blobWrite(KEY, data)
}

export async function GET() {
  const all = await getAll()
  all.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt.localeCompare(a.createdAt))
  return NextResponse.json(all)
}

export async function POST(request: Request) {
  const body = await request.json()
  if (!body.date) return NextResponse.json({ error: 'date is required' }, { status: 400 })
  const now = new Date().toISOString()
  const date = String(body.date).slice(0, 10)
  const dateTo = body.dateTo && String(body.dateTo) >= date ? String(body.dateTo).slice(0, 10) : date
  const location = String(body.location || '').trim()
  const checklist: EventChecklist = {
    id: `ecl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: String(body.name || '').trim() || location || `Event ${date}`,
    location,
    date,
    dateTo,
    notes: '',
    items: [],
    excludedInvoiceIds: [],
    archived: false,
    createdAt: now,
    updatedAt: now,
  }
  const all = await getAll()
  all.unshift(checklist)
  await saveAll(all)
  return NextResponse.json(checklist, { status: 201 })
}

export async function PATCH(request: Request) {
  const body = await request.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const all = await getAll()
  const idx = all.findIndex((c) => c.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  delete updates.createdAt
  all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() }
  await saveAll(all)
  return NextResponse.json(all[idx])
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const all = await getAll()
  const filtered = all.filter((c) => c.id !== id)
  if (filtered.length === all.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await saveAll(filtered)
  return NextResponse.json({ success: true })
}
