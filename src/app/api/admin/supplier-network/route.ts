import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const SUPPLIERS_KEY = 'data/supplier-network.json'

export interface Supplier {
  id: string
  name: string
  code: string
  email: string
  phone: string
  country: string
  website: string
  notes: string
  isActive: boolean
  createdAt: string
}

async function getSuppliers(): Promise<Supplier[]> {
  return await blobRead<Supplier[]>(SUPPLIERS_KEY, [])
}

async function saveSuppliers(suppliers: Supplier[]): Promise<void> {
  await blobWrite(SUPPLIERS_KEY, suppliers)
}

export async function GET() {
  try {
    const suppliers = await getSuppliers()
    return NextResponse.json(suppliers)
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const suppliers = await getSuppliers()

    if (body.id) {
      const idx = suppliers.findIndex((s) => s.id === body.id)
      if (idx >= 0) {
        suppliers[idx] = { ...suppliers[idx], ...body }
        await saveSuppliers(suppliers)
        return NextResponse.json(suppliers[idx])
      }
    }

    const newSupplier: Supplier = {
      id: `sup_${Date.now()}`,
      name: body.name?.trim() || '',
      code: body.code?.trim().toUpperCase() || '',
      email: body.email?.trim() || '',
      phone: body.phone?.trim() || '',
      country: body.country?.trim() || '',
      website: body.website?.trim() || '',
      notes: body.notes?.trim() || '',
      isActive: true,
      createdAt: new Date().toISOString(),
    }
    suppliers.push(newSupplier)
    await saveSuppliers(suppliers)
    return NextResponse.json(newSupplier, { status: 201 })
  } catch (error) {
    console.error('Error saving supplier:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const suppliers = await getSuppliers()
    const filtered = suppliers.filter((s) => s.id !== id)
    await saveSuppliers(filtered)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting supplier:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
