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

const DEFAULTS: Courier[] = [
  { id: 'cn-1', name: 'The Courier Guy', code: 'TCG', contactName: '', email: 'support@thecourierguy.co.za', phone: '087 357 0916', trackingUrl: 'https://www.thecourierguy.co.za/tracking', notes: '', isActive: true },
  { id: 'cn-2', name: 'Aramex', code: 'ARAMEX', contactName: '', email: 'customercare@aramex.com', phone: '011 574 8000', trackingUrl: 'https://www.aramex.com/track', notes: '', isActive: true },
  { id: 'cn-3', name: 'PostNet', code: 'POSTNET', contactName: '', email: '', phone: '011 445 9000', trackingUrl: 'https://www.postnet.co.za', notes: '', isActive: true },
]

export async function GET() {
  try {
    const saved = await blobRead<Courier[]>(KEY, [])
    return NextResponse.json(saved.length > 0 ? saved : DEFAULTS)
  } catch {
    return NextResponse.json(DEFAULTS)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const current = await blobRead<Courier[]>(KEY, DEFAULTS)
    const newCourier: Courier = {
      id: `cn-${Date.now()}`,
      name: body.name?.trim() || '',
      code: body.code?.trim() || '',
      contactName: body.contactName?.trim() || '',
      email: body.email?.trim() || '',
      phone: body.phone?.trim() || '',
      trackingUrl: body.trackingUrl?.trim() || '',
      notes: body.notes?.trim() || '',
      isActive: body.isActive !== false,
    }
    current.push(newCourier)
    await blobWrite(KEY, current)
    return NextResponse.json(newCourier, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
