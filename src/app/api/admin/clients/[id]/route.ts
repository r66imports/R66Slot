import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import type { Client } from '../route'

const CLIENTS_KEY = 'data/clients.json'

async function getClients(): Promise<Client[]> {
  return await blobRead<Client[]>(CLIENTS_KEY, [])
}

async function saveClients(clients: Client[]): Promise<void> {
  await blobWrite(CLIENTS_KEY, clients)
}

// GET single client
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const clients = await getClients()
    const client = clients.find((c) => c.id === id)
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    return NextResponse.json(client)
  } catch (error) {
    console.error('Error fetching client:', error)
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 })
  }
}

// PATCH — update client fields
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const clients = await getClients()
    const idx = clients.findIndex((c) => c.id === id)

    if (idx === -1) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const allowedFields: (keyof Client)[] = [
      'firstName', 'lastName', 'email', 'phone',
      'clubName', 'clubMemberId',
      'companyName', 'companyVAT', 'companyAddress',
      'notes',
    ]

    const updates: Partial<Client> = { updatedAt: new Date().toISOString() }
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (updates as Record<string, unknown>)[field] = typeof body[field] === 'string'
          ? body[field].trim()
          : body[field]
      }
    }

    clients[idx] = { ...clients[idx], ...updates }
    await saveClients(clients)

    return NextResponse.json(clients[idx])
  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
  }
}

// DELETE
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const clients = await getClients()
    const filtered = clients.filter((c) => c.id !== id)

    if (filtered.length === clients.length) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    await saveClients(filtered)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
  }
}
