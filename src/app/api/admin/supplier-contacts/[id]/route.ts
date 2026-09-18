import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import type { SupplierContact } from '../route'

const KEY = 'data/supplier-contacts.json'

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

    // Brands drive the Supplier Pre Order brand→supplier lookup, so keep them
    // trimmed and de-duplicated however the client sent them.
    if ('brands' in body) {
      const seen = new Set<string>()
      contacts[idx].brands = (Array.isArray(body.brands) ? body.brands : [])
        .map((b: unknown) => String(b ?? '').trim())
        .filter((b: string) => {
          const key = b.toLowerCase()
          if (!b || seen.has(key)) return false
          seen.add(key)
          return true
        })
        .sort((a: string, b: string) => a.localeCompare(b))
    }
    if ('defaultAccount' in body) {
      contacts[idx].defaultAccount = body.defaultAccount === 'R66' ? 'R66' : 'JDM'
    }

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
