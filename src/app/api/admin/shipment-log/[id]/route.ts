import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import type { ShipmentRow } from '../route'

const KEY = 'data/shipment-log.json'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const rows = await blobRead<ShipmentRow[]>(KEY, [])
    const idx = rows.findIndex((r) => r.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    rows[idx] = { ...rows[idx], ...body, updatedAt: new Date().toISOString() }
    await blobWrite(KEY, rows)
    return NextResponse.json(rows[idx])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const rows = await blobRead<ShipmentRow[]>(KEY, [])
    await blobWrite(KEY, rows.filter((r) => r.id !== id))
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
