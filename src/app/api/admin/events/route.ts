import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/slot-events.json'

export interface EventExpense {
  id: string
  description: string
  amount: number
}

export interface EventSalesItem {
  sku: string
  title: string
  totalQty: number
  totalRevenue: number
  totalCogs: number
  invoiceCount: number
}

export interface SlotEvent {
  id: string
  name: string
  location: string
  dateFrom: string
  dateTo: string
  timeFrom?: string
  timeTo?: string
  notes: string
  expenses: EventExpense[]
  salesItems: EventSalesItem[]
  totalRevenue: number
  totalCogs: number
  totalExpenses: number
  grossProfit: number
  netProfit: number
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}

async function getEvents(): Promise<SlotEvent[]> {
  return blobRead<SlotEvent[]>(KEY, [])
}
async function saveEvents(events: SlotEvent[]): Promise<void> {
  await blobWrite(KEY, events)
}

export async function GET() {
  try {
    const events = await getEvents()
    events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return NextResponse.json(events)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.name || !body.dateFrom || !body.dateTo) {
      return NextResponse.json({ error: 'name, dateFrom and dateTo are required' }, { status: 400 })
    }
    const now = new Date().toISOString()
    const event: SlotEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: body.name.trim(),
      location: body.location?.trim() || '',
      dateFrom: body.dateFrom,
      dateTo: body.dateTo,
      timeFrom: body.timeFrom || '',
      timeTo: body.timeTo || '',
      notes: body.notes?.trim() || '',
      expenses: body.expenses || [],
      salesItems: body.salesItems || [],
      totalRevenue: body.totalRevenue || 0,
      totalCogs: body.totalCogs || 0,
      totalExpenses: body.totalExpenses || 0,
      grossProfit: body.grossProfit || 0,
      netProfit: body.netProfit || 0,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }
    const events = await getEvents()
    events.unshift(event)
    await saveEvents(events)
    return NextResponse.json(event, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
