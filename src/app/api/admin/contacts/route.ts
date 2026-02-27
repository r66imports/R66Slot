import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const CONTACTS_KEY  = 'data/contacts.json'
const ORDERS_KEY    = 'data/preorder-list.json'
const CUSTOMERS_KEY = 'data/customers.json'

export interface Contact {
  id: string
  // Personal
  firstName: string
  lastName: string
  email: string
  phone: string
  // Address
  addressStreet: string
  addressCity: string
  addressProvince: string
  addressPostalCode: string
  addressCountry: string
  // Club
  clubName: string
  clubMemberId: string
  // Business
  companyName: string
  companyVAT: string
  companyAddress: string
  // Delivery Options
  deliveryDoorToDoor: boolean
  deliveryKioskToKiosk: boolean
  deliveryPudoLocker: boolean
  deliveryPostnetAramex: boolean
  // Meta
  source: 'book-now' | 'manual' | 'import' | 'website'
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
    const contacts  = await getContacts()
    const orders    = await blobRead<any[]>(ORDERS_KEY, [])
    const customers = await blobRead<any[]>(CUSTOMERS_KEY, [])

    // Auto-merge website accounts that aren't already in the contacts list
    let dirty = false
    const now = new Date().toISOString()
    for (const cust of customers) {
      if (!cust.email) continue
      const exists = contacts.find((c: Contact) => c.email === cust.email)
      if (!exists) {
        contacts.push({
          id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          firstName:            cust.firstName?.trim()  || '',
          lastName:             cust.lastName?.trim()   || '',
          email:                cust.email.trim(),
          phone:                cust.phone?.trim()      || '',
          addressStreet: '', addressCity: '', addressProvince: '',
          addressPostalCode: '', addressCountry: 'South Africa',
          clubName: '', clubMemberId: '',
          companyName: '', companyVAT: '', companyAddress: '',
          deliveryDoorToDoor: false, deliveryKioskToKiosk: false,
          deliveryPudoLocker: false, deliveryPostnetAramex: false,
          source: 'website',
          notes: cust.username ? `Username: ${cust.username}` : '',
          totalOrders: 0,
          totalSpent: 0,
          createdAt: cust.createdAt || now,
          updatedAt: now,
        })
        dirty = true
      }
    }
    if (dirty) await saveContacts(contacts)

    const enriched = contacts.map(c => {
      const contactOrders = orders.filter(
        (o: any) => o.customerEmail === c.email || o.customerPhone === c.phone
      )
      return {
        ...c,
        totalOrders: contactOrders.length,
        totalSpent: contactOrders.reduce(
          (sum: number, o: any) => sum + parseFloat(o.totalAmount || '0'), 0
        ),
      }
    })

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json([], { status: 200 })
  }
}

// POST /api/admin/contacts — create new contact
export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.firstName?.trim()) {
      return NextResponse.json({ error: 'First name is required' }, { status: 400 })
    }

    const contacts = await getContacts()

    // Soft duplicate check on email
    if (body.email?.trim()) {
      const dup = contacts.find(c => c.email === body.email.trim())
      if (dup) {
        return NextResponse.json(
          { error: 'A contact with this email already exists' },
          { status: 409 }
        )
      }
    }

    const now = new Date().toISOString()
    const newContact: Contact = {
      id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      firstName:            body.firstName?.trim()      || '',
      lastName:             body.lastName?.trim()       || '',
      email:                body.email?.trim()          || '',
      phone:                body.phone?.trim()          || '',
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
      source:               body.source || 'manual',
      notes:                body.notes?.trim()          || '',
      totalOrders: 0,
      totalSpent:  0,
      createdAt: now,
      updatedAt: now,
    }

    contacts.push(newContact)
    await saveContacts(contacts)

    return NextResponse.json(newContact, { status: 201 })
  } catch (error) {
    console.error('Error creating contact:', error)
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
  }
}

// PUT /api/admin/contacts — sync from orders
export async function PUT() {
  try {
    const contacts = await getContacts()
    const orders   = await blobRead<any[]>(ORDERS_KEY, [])

    let added = 0
    for (const order of orders) {
      if (!order.customerEmail && !order.customerPhone) continue

      const exists = contacts.find(
        c =>
          (order.customerEmail && c.email === order.customerEmail) ||
          (order.customerPhone && c.phone === order.customerPhone)
      )

      if (!exists) {
        const nameParts = (order.customerName || '').split(' ')
        const now = new Date().toISOString()
        contacts.push({
          id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          firstName:            nameParts[0] || '',
          lastName:             nameParts.slice(1).join(' ') || '',
          email:                order.customerEmail || '',
          phone:                order.customerPhone || '',
          addressStreet:        '',
          addressCity:          '',
          addressProvince:      '',
          addressPostalCode:    '',
          addressCountry:       'South Africa',
          clubName:             '',
          clubMemberId:         '',
          companyName:          '',
          companyVAT:           '',
          companyAddress:       '',
          deliveryDoorToDoor:    false,
          deliveryKioskToKiosk:  false,
          deliveryPudoLocker:    false,
          deliveryPostnetAramex: false,
          source:   'book-now',
          notes:    '',
          totalOrders: 0,
          totalSpent:  0,
          createdAt: order.createdAt || now,
          updatedAt: now,
        })
        added++
      }
    }

    if (added > 0) await saveContacts(contacts)

    return NextResponse.json({ synced: added, total: contacts.length })
  } catch (error) {
    console.error('Error syncing contacts:', error)
    return NextResponse.json({ error: 'Failed to sync contacts' }, { status: 500 })
  }
}

// DELETE /api/admin/contacts?id=xxx  (legacy query-param route kept for compatibility)
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
