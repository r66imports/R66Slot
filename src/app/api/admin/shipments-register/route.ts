import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/shipments-register.json'

export interface ShipmentEntry {
  id: string
  rowNum: number
  account: string       // Sage, Walk-in, Online, Other
  clientName: string
  clientEmail: string
  clientPhone: string
  invoiceRef: string    // e.g. INV0000041
  status: string        // '', 'Packed', 'Hold'
  instructions: string  // 'Ready to Ship', 'Hold', 'In Store', 'Card Payment', 'Awaiting Payment'
  boxSize: string       // OVB, Bag, dimensions like "53x38x24 4.2kg"
  sendVia: string       // courier name or tracking code
  trackingNumber: string
  notes: string
  date: string
  createdAt: string
  updatedAt: string
}

async function getEntries(): Promise<ShipmentEntry[]> {
  return await blobRead<ShipmentEntry[]>(KEY, [])
}

async function saveEntries(entries: ShipmentEntry[]): Promise<void> {
  await blobWrite(KEY, entries)
}

// GET — return all entries sorted by rowNum desc
export async function GET() {
  try {
    const entries = await getEntries()
    const sorted = [...entries].sort((a, b) => b.rowNum - a.rowNum)
    return NextResponse.json(sorted)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST — create new entry, auto-assign rowNum = max + 1
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const entries = await getEntries()
    const maxRow = entries.reduce((m, e) => Math.max(m, e.rowNum), 0)
    const now = new Date().toISOString()
    const newEntry: ShipmentEntry = {
      id: crypto.randomUUID(),
      rowNum: maxRow + 1,
      account: body.account ?? '',
      clientName: body.clientName ?? '',
      clientEmail: body.clientEmail ?? '',
      clientPhone: body.clientPhone ?? '',
      invoiceRef: body.invoiceRef ?? '',
      status: body.status ?? '',
      instructions: body.instructions ?? '',
      boxSize: body.boxSize ?? '',
      sendVia: body.sendVia ?? '',
      trackingNumber: body.trackingNumber ?? '',
      notes: body.notes ?? '',
      date: body.date ?? now.slice(0, 10),
      createdAt: now,
      updatedAt: now,
    }
    entries.push(newEntry)
    await saveEntries(entries)
    return NextResponse.json(newEntry, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PATCH — bulk update (array of partial entries with id)
export async function PATCH(request: Request) {
  try {
    const body: Array<Partial<ShipmentEntry> & { id: string }> = await request.json()
    const entries = await getEntries()
    const now = new Date().toISOString()
    const allowedFields: Array<keyof ShipmentEntry> = [
      'account', 'clientName', 'clientEmail', 'clientPhone',
      'invoiceRef', 'status', 'instructions', 'boxSize',
      'sendVia', 'trackingNumber', 'notes', 'date',
    ]
    for (const patch of body) {
      const idx = entries.findIndex((e) => e.id === patch.id)
      if (idx === -1) continue
      for (const field of allowedFields) {
        if (patch[field] !== undefined) {
          (entries[idx] as unknown as Record<string, unknown>)[field] = patch[field]
        }
      }
      entries[idx].updatedAt = now
    }
    await saveEntries(entries)
    return NextResponse.json(entries)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
