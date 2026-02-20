import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const CONTACTS_KEY = 'data/contacts.json'
const ORDERS_KEY = 'data/preorder-list.json'

export interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  source: 'book-now' | 'manual' | 'import'
  notes: string
  totalOrders: number
  totalSpent: number
  createdAt: string
  updatedAt: string
}

async function getContacts(): Promise<Contact[]> {
  return await blobRead<Contact[]>(CONTACTS_KEY, [])
}

async function saveContacts(contacts: Contact[]): Promise<void> {
  await blobWrite(CONTACTS_KEY, contacts)
}

// GET /api/admin/contacts
export async function GET() {
  try {
    const contacts = await getContacts()

    // Enrich contacts with order data
    const orders = await blobRead<any[]>(ORDERS_KEY, [])

    const enriched = contacts.map(contact => {
      const contactOrders = orders.filter(
        (o: any) => o.customerEmail === contact.email || o.customerPhone === contact.phone
      )
      return {
        ...contact,
        totalOrders: contactOrders.length,
        totalSpent: contactOrders.reduce((sum: number, o: any) => sum + parseFloat(o.totalAmount || '0'), 0),
      }
    })

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json([], { status: 200 })
  }
}

// POST /api/admin/contacts - Add new contact
export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.firstName?.trim() || !body.phone?.trim()) {
      return NextResponse.json({ error: 'First name and phone are required' }, { status: 400 })
    }

    const contacts = await getContacts()

    // Check for duplicate by email or phone
    const existing = contacts.find(
      c => (body.email && c.email === body.email) || (body.phone && c.phone === body.phone)
    )
    if (existing) {
      return NextResponse.json({ error: 'Contact with this email or phone already exists' }, { status: 409 })
    }

    const newContact: Contact = {
      id: `contact-${Date.now()}`,
      firstName: body.firstName?.trim() || '',
      lastName: body.lastName?.trim() || '',
      email: body.email?.trim() || '',
      phone: body.phone?.trim() || '',
      source: body.source || 'manual',
      notes: body.notes?.trim() || '',
      totalOrders: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    contacts.push(newContact)
    await saveContacts(contacts)

    return NextResponse.json(newContact, { status: 201 })
  } catch (error) {
    console.error('Error creating contact:', error)
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
  }
}

// PUT /api/admin/contacts - Sync contacts from orders
export async function PUT() {
  try {
    const contacts = await getContacts()
    const orders = await blobRead<any[]>(ORDERS_KEY, [])

    let added = 0
    for (const order of orders) {
      if (!order.customerEmail && !order.customerPhone) continue

      const exists = contacts.find(
        c => (order.customerEmail && c.email === order.customerEmail) ||
             (order.customerPhone && c.phone === order.customerPhone)
      )

      if (!exists) {
        const nameParts = (order.customerName || '').split(' ')
        contacts.push({
          id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          email: order.customerEmail || '',
          phone: order.customerPhone || '',
          source: 'book-now',
          notes: '',
          totalOrders: 0,
          totalSpent: 0,
          createdAt: order.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        added++
      }
    }

    if (added > 0) {
      await saveContacts(contacts)
    }

    return NextResponse.json({ synced: added, total: contacts.length })
  } catch (error) {
    console.error('Error syncing contacts:', error)
    return NextResponse.json({ error: 'Failed to sync contacts' }, { status: 500 })
  }
}

// DELETE /api/admin/contacts
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Contact ID required' }, { status: 400 })
    }

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
