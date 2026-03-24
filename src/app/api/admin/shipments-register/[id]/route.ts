import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import type { ShipmentEntry } from '../route'

const KEY = 'data/shipments-register.json'

async function getEntries(): Promise<ShipmentEntry[]> {
  return await blobRead<ShipmentEntry[]>(KEY, [])
}

async function saveEntries(entries: ShipmentEntry[]): Promise<void> {
  await blobWrite(KEY, entries)
}

// PATCH — update one entry by id
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const entries = await getEntries()
    const idx = entries.findIndex((e) => e.id === id)

    if (idx === -1) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    const allowedFields: Array<keyof ShipmentEntry> = [
      'account', 'clientName', 'clientEmail', 'clientPhone',
      'invoiceRef', 'status', 'instructions', 'boxSize',
      'sendVia', 'trackingNumber', 'notes', 'date',
    ]

    const now = new Date().toISOString()
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (entries[idx] as unknown as Record<string, unknown>)[field] = body[field]
      }
    }
    entries[idx].updatedAt = now

    await saveEntries(entries)
    return NextResponse.json(entries[idx])
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE — remove entry by id
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const entries = await getEntries()
    const filtered = entries.filter((e) => e.id !== id)

    if (filtered.length === entries.length) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    await saveEntries(filtered)
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
