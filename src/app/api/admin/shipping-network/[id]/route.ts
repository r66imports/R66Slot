import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/shipping-network.json'

interface Courier {
  id: string
  name: string
  code: string
  contactName: string
  email: string
  phone: string
  trackingUrl: string
  notes: string
  isActive: boolean
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const couriers = await blobRead<Courier[]>(KEY, [])
    const idx = couriers.findIndex((c) => c.id === id)
    if (idx < 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    couriers[idx] = { ...couriers[idx], ...body, id }
    await blobWrite(KEY, couriers)
    return NextResponse.json(couriers[idx])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const couriers = await blobRead<Courier[]>(KEY, [])
    await blobWrite(KEY, couriers.filter((c) => c.id !== id))
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
