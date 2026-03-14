import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/supplier-contacts.json'

interface SupplierContact {
  id: string
  name: string
  code: string
  email: string
  phone: string
  country: string
  website: string
  notes: string
  isActive?: boolean
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const contacts = await blobRead<SupplierContact[]>(KEY, [])
    const idx = contacts.findIndex((c) => c.id === id)
    if (idx < 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    contacts[idx] = { ...contacts[idx], ...body, id }
    await blobWrite(KEY, contacts)
    return NextResponse.json(contacts[idx])
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
    const contacts = await blobRead<SupplierContact[]>(KEY, [])
    await blobWrite(KEY, contacts.filter((c) => c.id !== id))
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
