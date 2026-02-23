import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const CLIENTS_KEY = 'data/clients.json'

export interface Client {
  id: string
  // Personal
  firstName: string
  lastName: string
  email: string
  phone: string
  // Club Info
  clubName: string
  clubMemberId: string
  // Company Info
  companyName: string
  companyVAT: string
  companyAddress: string
  // Meta
  notes: string
  createdAt: string
  updatedAt: string
}

async function getClients(): Promise<Client[]> {
  return await blobRead<Client[]>(CLIENTS_KEY, [])
}

async function saveClients(clients: Client[]): Promise<void> {
  await blobWrite(CLIENTS_KEY, clients)
}

// GET /api/admin/clients — return all, sorted by name
export async function GET() {
  try {
    const clients = await getClients()
    clients.sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    )
    return NextResponse.json(clients)
  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
}

// POST /api/admin/clients — create new client
export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.firstName?.trim()) {
      return NextResponse.json({ error: 'First name is required' }, { status: 400 })
    }

    const clients = await getClients()

    // Soft duplicate check on email or phone
    if (body.email?.trim()) {
      const dup = clients.find((c) => c.email === body.email.trim())
      if (dup) {
        return NextResponse.json(
          { error: `A client with email "${body.email.trim()}" already exists`, existing: dup },
          { status: 409 }
        )
      }
    }

    const now = new Date().toISOString()
    const newClient: Client = {
      id: `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      firstName: body.firstName?.trim() || '',
      lastName: body.lastName?.trim() || '',
      email: body.email?.trim() || '',
      phone: body.phone?.trim() || '',
      clubName: body.clubName?.trim() || '',
      clubMemberId: body.clubMemberId?.trim() || '',
      companyName: body.companyName?.trim() || '',
      companyVAT: body.companyVAT?.trim() || '',
      companyAddress: body.companyAddress?.trim() || '',
      notes: body.notes?.trim() || '',
      createdAt: now,
      updatedAt: now,
    }

    clients.push(newClient)
    await saveClients(clients)

    return NextResponse.json(newClient, { status: 201 })
  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }
}
