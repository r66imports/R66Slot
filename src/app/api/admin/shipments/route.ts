import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/shipments.json'

export interface Shipment {
  id: string
  trackingNumber: string
  courierId: string
  courierName: string
  courierCode: string
  reference: string
  dateShipped: string
  status: 'pending' | 'in-transit' | 'out-for-delivery' | 'delivered' | 'returned' | 'failed'
  notes: string
  createdAt: string
}

export async function GET() {
  try {
    const data = await blobRead<Shipment[]>(KEY, [])
    return NextResponse.json(data)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const current = await blobRead<Shipment[]>(KEY, [])
    const newShipment: Shipment = {
      id: `sh-${Date.now()}`,
      trackingNumber: body.trackingNumber?.trim() || '',
      courierId: body.courierId || '',
      courierName: body.courierName?.trim() || '',
      courierCode: body.courierCode?.trim() || '',
      reference: body.reference?.trim() || '',
      dateShipped: body.dateShipped || new Date().toISOString().split('T')[0],
      status: body.status || 'pending',
      notes: body.notes?.trim() || '',
      createdAt: new Date().toISOString(),
    }
    current.unshift(newShipment)
    await blobWrite(KEY, current)
    return NextResponse.json(newShipment, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
