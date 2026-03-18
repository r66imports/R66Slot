import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import type { Shipment } from '../route'

const KEY = 'data/shipments.json'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const current = await blobRead<Shipment[]>(KEY, [])
    const idx = current.findIndex((s) => s.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    current[idx] = { ...current[idx], ...body }
    await blobWrite(KEY, current)
    return NextResponse.json(current[idx])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const current = await blobRead<Shipment[]>(KEY, [])
    await blobWrite(KEY, current.filter((s) => s.id !== id))
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
