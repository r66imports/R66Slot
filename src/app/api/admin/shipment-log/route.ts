import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/shipment-log.json'

export interface ShipmentRow {
  id: string
  account: string
  name: string
  invoiceNumber: string
  wixRef: string
  status: string
  instruction: string
  boxSize: string
  trackingNumber: string
  sendVia: string
  notes: string
  createdAt: string
  updatedAt: string
}

async function getRows(): Promise<ShipmentRow[]> {
  return blobRead<ShipmentRow[]>(KEY, [])
}

async function saveRows(rows: ShipmentRow[]): Promise<void> {
  await blobWrite(KEY, rows)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // YYYY-MM
    let rows = await getRows()
    if (month) rows = rows.filter((r) => r.createdAt.startsWith(month))
    return NextResponse.json(rows)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const now = new Date().toISOString()
    const row: ShipmentRow = {
      id: `shp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      account: body.account || '',
      name: body.name || '',
      invoiceNumber: body.invoiceNumber || '',
      wixRef: body.wixRef || '',
      status: body.status || '',
      instruction: body.instruction || '',
      boxSize: body.boxSize || '',
      trackingNumber: body.trackingNumber || '',
      sendVia: body.sendVia || '',
      notes: body.notes || '',
      createdAt: now,
      updatedAt: now,
    }
    const rows = await getRows()
    rows.unshift(row)
    await saveRows(rows)
    return NextResponse.json(row, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
