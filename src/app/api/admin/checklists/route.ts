import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/checklists.json'

export interface ChecklistItem {
  id: string
  sku: string
  description: string
  qty: number
  checked: boolean
  notes?: string
}

export interface Checklist {
  id: string
  name: string
  supplier: string
  date: string
  createdAt: string
  items: ChecklistItem[]
  archived: boolean
}

async function getAll(): Promise<Checklist[]> {
  return blobRead<Checklist[]>(KEY, [])
}

async function saveAll(data: Checklist[]): Promise<void> {
  await blobWrite(KEY, data)
}

// GET — list all (or single ?id=)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const all = await getAll()
  if (id) {
    const item = all.find(c => c.id === id)
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(item)
  }
  return NextResponse.json(all)
}

// POST — create new checklist
export async function POST(request: Request) {
  const body = await request.json()
  const now = new Date().toISOString()
  const checklist: Checklist = {
    id: `cl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: body.name || `Checklist ${now.slice(0, 10)}`,
    supplier: body.supplier || '',
    date: body.date || now.slice(0, 10),
    createdAt: now,
    items: (body.items || []).map((it: any, i: number) => ({
      id: `cli_${Date.now()}_${i}`,
      sku: it.sku || '',
      description: it.description || '',
      qty: it.qty || 1,
      checked: false,
      notes: '',
    })),
    archived: false,
  }
  const all = await getAll()
  all.unshift(checklist)
  await saveAll(all)
  return NextResponse.json(checklist, { status: 201 })
}

// PATCH — update checklist (item checks, archive, rename)
export async function PATCH(request: Request) {
  const body = await request.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const all = await getAll()
  const idx = all.findIndex(c => c.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  all[idx] = { ...all[idx], ...updates }
  await saveAll(all)
  return NextResponse.json(all[idx])
}

// DELETE — remove checklist
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const all = await getAll()
  const filtered = all.filter(c => c.id !== id)
  if (filtered.length === all.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await saveAll(filtered)
  return NextResponse.json({ success: true })
}
