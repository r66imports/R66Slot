import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import type { SlotEvent } from '../route'

const KEY = 'data/slot-events.json'

async function getEvents(): Promise<SlotEvent[]> {
  return blobRead<SlotEvent[]>(KEY, [])
}
async function saveEvents(events: SlotEvent[]): Promise<void> {
  await blobWrite(KEY, events)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const events = await getEvents()
    const idx = events.findIndex((e) => e.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    events[idx] = { ...events[idx], ...body, updatedAt: new Date().toISOString() }
    await saveEvents(events)
    return NextResponse.json(events[idx])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const events = await getEvents()
    const filtered = events.filter((e) => e.id !== id)
    if (filtered.length === events.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await saveEvents(filtered)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
