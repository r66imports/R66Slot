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
    let idx = contacts.findIndex(c => c.id === id)

    // Virtual contacts (merged from customers.json by GET) have ephemeral IDs
    // that don't exist in contacts.json. Fall back to email lookup, then create.
    if (idx === -1 && body.email?.trim()) {
      idx = contacts.findIndex(c => c.email?.toLowerCase() === body.email.trim().toLowerCase())
    }

    const allowedFields: (keyof Contact)[] = [
      'firstName', 'lastName', 'email', 'phone',
      'addressStreet', 'addressCity', 'addressProvince', 'addressPostalCode', 'addressCountry',
      'clubName', 'clubMemberId',
      'companyName', 'companyVAT', 'companyAddress',
      'deliveryDoorToDoor', 'deliveryKioskToKiosk', 'deliveryPudoLocker', 'deliveryPostnetAramex',
      'preferredShipping', 'courierGuyBranch',
      'source', 'notes',
    ]

    const now = new Date().toISOString()
    const updates: Partial<Contact> = { updatedAt: now }
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (updates as Record<string, unknown>)[field] = body[field]
      }
    }

    if (idx === -1) {
      // Create a real contacts.json entry from the request body (promotes virtual contact)
      const newContact: Contact = {
        id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        firstName:            body.firstName?.trim()      || '',
        lastName:             body.lastName?.trim()       || '',
        email:                body.email?.trim()          || '',
        phone:                body.phone?.trim()          || '',
        mobile:               body.mobile?.trim()         || '',
        addressStreet:        body.addressStreet?.trim()  || '',
        addressCity:          body.addressCity?.trim()    || '',
        addressProvince:      body.addressProvince?.trim() || '',
        addressPostalCode:    body.addressPostalCode?.trim() || '',
        addressCountry:       body.addressCountry?.trim() || 'South Africa',
        clubName:             body.clubName?.trim()       || '',
        clubMemberId:         body.clubMemberId?.trim()   || '',
        companyName:          body.companyName?.trim()    || '',
        companyVAT:           body.companyVAT?.trim()     || '',
        companyAddress:       body.companyAddress?.trim() || '',
        deliveryDoorToDoor:    Boolean(body.deliveryDoorToDoor),
        deliveryKioskToKiosk:  Boolean(body.deliveryKioskToKiosk),
        deliveryPudoLocker:    Boolean(body.deliveryPudoLocker),
        deliveryPostnetAramex: Boolean(body.deliveryPostnetAramex),
        preferredShipping:    body.preferredShipping?.trim() || '',
        courierGuyBranch:     body.courierGuyBranch?.trim()  || '',
        source:               body.source || 'website',
        notes:                body.notes?.trim() || '',
        totalOrders: 0,
        totalSpent:  0,
        createdAt: now,
        updatedAt: now,
      }
      contacts.push(newContact)
      await saveContacts(contacts)
      return NextResponse.json(newContact)
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
