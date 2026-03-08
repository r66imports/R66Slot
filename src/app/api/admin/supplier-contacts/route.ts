import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/supplier-contacts.json'

export interface SupplierContact {
  id: string
  name: string
  code: string
  email: string
  phone: string
  country: string
  website: string
  notes: string
}

const DEFAULTS: SupplierContact[] = [
  { id: 'sc-1', name: 'NSR', code: 'NSR', email: 'sales@nsracing.com', phone: '+39 02 123 4567', country: 'Italy', website: 'https://www.nsracing.com', notes: 'Racing and tuning parts specialist' },
  { id: 'sc-2', name: 'Revo Slot', code: 'REVO', email: 'info@revoslot.com', phone: '+34 123 456 789', country: 'Spain', website: 'https://www.revoslot.com', notes: 'Premium 1:32 scale slot cars' },
  { id: 'sc-3', name: 'Pioneer', code: 'PIONEER', email: 'contact@pioneerslotcars.com', phone: '+44 20 7946 0958', country: 'UK', website: 'https://www.pioneerslotcars.com', notes: 'Classic and retro liveries' },
  { id: 'sc-4', name: 'Sideways', code: 'SW', email: 'info@sidewayslot.com', phone: '+39 055 123 4567', country: 'Italy', website: 'https://www.sidewayslot.com', notes: 'GT and touring car specialist' },
  { id: 'sc-5', name: 'Slot.it', code: 'SIT', email: 'info@slot.it', phone: '+39 02 987 6543', country: 'Italy', website: 'https://www.slot.it', notes: 'High-performance slot cars' },
]

export async function GET() {
  try {
    const saved = await blobRead<SupplierContact[]>(KEY, [])
    const merged = saved.length > 0 ? saved : DEFAULTS
    return NextResponse.json(merged)
  } catch {
    return NextResponse.json(DEFAULTS)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const current = await blobRead<SupplierContact[]>(KEY, DEFAULTS)
    const newSupplier: SupplierContact = {
      id: `sc-${Date.now()}`,
      name: body.name?.trim() || '',
      code: body.code?.trim() || '',
      email: body.email?.trim() || '',
      phone: body.phone?.trim() || '',
      country: body.country?.trim() || '',
      website: body.website?.trim() || '',
      notes: body.notes?.trim() || '',
    }
    current.push(newSupplier)
    await blobWrite(KEY, current)
    return NextResponse.json(newSupplier, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
