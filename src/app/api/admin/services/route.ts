import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/services-accounting.json'

export interface ManualServiceEntry {
  id: string
  source: 'manual'
  serviceType: string
  description: string
  clientName: string
  qty: number
  billedAmount: number
  staffCost: number
  staffMember: string
  paidToStaff: boolean
  paidToStaffAt?: string
  notes?: string
  date: string
  createdAt: string
}

export interface ServiceStore {
  entries: ManualServiceEntry[]
  paid: Record<string, string> // `${docId}_${lineItemId}` → paidAt ISO
}

function blank(): ServiceStore { return { entries: [], paid: {} } }

export async function GET() {
  try {
    const store = await blobRead<ServiceStore>(KEY, blank())
    if (!store.entries) store.entries = []
    if (!store.paid) store.paid = {}
    return NextResponse.json(store)
  } catch { return NextResponse.json(blank()) }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const store = await blobRead<ServiceStore>(KEY, blank())
    if (!store.entries) store.entries = []
    if (!store.paid) store.paid = {}

    if (body.action === 'mark_paid_doc') {
      const key = `${body.docId}_${body.lineItemId}`
      store.paid[key] = new Date().toISOString()
      await blobWrite(KEY, store)
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'unmark_paid_doc') {
      const key = `${body.docId}_${body.lineItemId}`
      delete store.paid[key]
      await blobWrite(KEY, store)
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'mark_paid_manual') {
      store.entries = store.entries.map(e =>
        e.id === body.id ? { ...e, paidToStaff: true, paidToStaffAt: new Date().toISOString() } : e
      )
      await blobWrite(KEY, store)
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'unmark_paid_manual') {
      store.entries = store.entries.map(e =>
        e.id === body.id ? { ...e, paidToStaff: false, paidToStaffAt: undefined } : e
      )
      await blobWrite(KEY, store)
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'delete') {
      store.entries = store.entries.filter(e => e.id !== body.id)
      await blobWrite(KEY, store)
      return NextResponse.json({ ok: true })
    }

    // Create manual entry
    const entry: ManualServiceEntry = {
      id: `svc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      source: 'manual',
      serviceType: body.serviceType || 'setup',
      description: body.description || '',
      clientName: body.clientName || '',
      qty: Number(body.qty) || 1,
      billedAmount: Number(body.billedAmount) || 0,
      staffCost: Number(body.staffCost) || 0,
      staffMember: body.staffMember || '',
      paidToStaff: false,
      notes: body.notes || '',
      date: body.date || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    }
    store.entries.push(entry)
    await blobWrite(KEY, store)
    return NextResponse.json(entry)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
