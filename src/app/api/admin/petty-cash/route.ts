import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/petty-cash.json'

export type PettyCashType = 'in' | 'out'

export interface PettyCashEntry {
  id: string
  date: string
  type: PettyCashType
  description: string
  category: string
  reference?: string
  amount: number
  /** Set only on entries imported from an invoice cash payment: `${docId}:${paymentIndex}`.
   *  Makes the import idempotent — the same payment can never be booked twice. */
  sourceId?: string
  createdAt: string
}

async function read(): Promise<PettyCashEntry[]> {
  return blobRead<PettyCashEntry[]>(KEY, [])
}

async function write(data: PettyCashEntry[]): Promise<void> {
  await blobWrite(KEY, data)
}

// newest first; same-day entries fall back to insertion order (newest first)
function sortEntries(entries: PettyCashEntry[]): PettyCashEntry[] {
  return entries.sort((a, b) =>
    (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '')
  )
}

// GET — list all petty cash entries
export async function GET() {
  try {
    const entries = await read()
    return NextResponse.json(sortEntries(entries))
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

// POST — add a new cash in / cash out entry
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const now = new Date().toISOString()

    const build = (src: any, seq: number): PettyCashEntry | null => {
      const amount = Math.abs(Number(src.amount) || 0)
      if (amount <= 0) return null
      return {
        id: `pc-${Date.now()}-${seq}-${Math.random().toString(36).slice(2, 7)}`,
        date: src.date || now.slice(0, 10),
        type: src.type === 'in' ? 'in' : 'out',
        description: src.description?.trim() || '',
        category: src.category?.trim() || '',
        reference: src.reference?.trim() || undefined,
        sourceId: src.sourceId?.trim() || undefined,
        amount,
        createdAt: now,
      }
    }

    // ── Import invoice cash payments as Cash In entries ──
    // Idempotent: anything whose sourceId is already booked is skipped, never duplicated.
    if (body.action === 'import') {
      const incoming: any[] = Array.isArray(body.entries) ? body.entries : []
      if (incoming.length === 0) return NextResponse.json({ error: 'entries required' }, { status: 400 })

      const entries = await read()
      const existingSources = new Set(entries.map(e => e.sourceId).filter(Boolean))

      const created: PettyCashEntry[] = []
      let skipped = 0
      incoming.forEach((src, i) => {
        if (src?.sourceId && existingSources.has(String(src.sourceId).trim())) { skipped++; return }
        const entry = build({ ...src, type: 'in' }, i)
        if (!entry) { skipped++; return }
        if (entry.sourceId) existingSources.add(entry.sourceId)
        entries.push(entry)
        created.push(entry)
      })

      if (created.length > 0) await write(entries)
      return NextResponse.json({ created, imported: created.length, skipped }, { status: 201 })
    }

    const entry = build(body, 0)
    if (!entry) return NextResponse.json({ error: 'amount required' }, { status: 400 })

    const entries = await read()
    if (entry.sourceId && entries.some(e => e.sourceId === entry.sourceId)) {
      return NextResponse.json({ error: 'already imported' }, { status: 409 })
    }
    entries.push(entry)
    await write(entries)
    return NextResponse.json(entry, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to add entry' }, { status: 500 })
  }
}

// PATCH — edit an entry
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const entries = await read()
    const idx = entries.findIndex(e => e.id === id)
    if (idx === -1) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const existing = entries[idx]
    const updated: PettyCashEntry = {
      ...existing,
      ...(updates.date !== undefined ? { date: updates.date } : {}),
      ...(updates.type !== undefined ? { type: updates.type === 'in' ? 'in' : 'out' } : {}),
      ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
      ...(updates.category !== undefined ? { category: updates.category.trim() } : {}),
      ...(updates.reference !== undefined ? { reference: updates.reference.trim() || undefined } : {}),
      ...(updates.amount !== undefined ? { amount: Math.abs(Number(updates.amount) || 0) } : {}),
    }
    entries[idx] = updated
    await write(entries)
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })
  }
}

// DELETE ?id=xxx — remove an entry
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const entries = await read()
    const filtered = entries.filter(e => e.id !== id)
    if (filtered.length === entries.length) return NextResponse.json({ error: 'not found' }, { status: 404 })

    await write(filtered)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
