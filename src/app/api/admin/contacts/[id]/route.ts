import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import type { Contact } from '../route'

const CONTACTS_KEY = 'data/contacts.json'

async function getContacts(): Promise<Contact[]> {
  return await blobRead<Contact[]>(CONTACTS_KEY, [])
}

async function saveContacts(contacts: Contact[]): Promise<void> {
  await blobWrite(CONTACTS_KEY, contacts)
}

// PATCH /api/admin/contacts/[id] — update any contact fields
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const contacts = await getContacts()
    const idx = contacts.findIndex(c => c.id === id)

    if (idx === -1) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const allowedFields: (keyof Contact)[] = [
      'firstName', 'lastName', 'email', 'phone',
      'addressStreet', 'addressCity', 'addressProvince', 'addressPostalCode', 'addressCountry',
      'clubName', 'clubMemberId',
      'companyName', 'companyVAT', 'companyAddress',
      'deliveryDoorToDoor', 'deliveryKioskToKiosk', 'deliveryPudoLocker', 'deliveryPostnetAramex',
      'source', 'notes',
    ]

    const updates: Partial<Contact> = { updatedAt: new Date().toISOString() }
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (updates as Record<string, unknown>)[field] = body[field]
      }
    }

    contacts[idx] = { ...contacts[idx], ...updates }
    await saveContacts(contacts)

    return NextResponse.json(contacts[idx])
  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
  }
}

// DELETE /api/admin/contacts/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const contacts = await getContacts()
    const filtered = contacts.filter(c => c.id !== id)

    if (filtered.length === contacts.length) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    await saveContacts(filtered)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
  }
}
