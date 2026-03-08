import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/order-documents.json'

export interface LineItem {
  id: string
  description: string
  qty: number
  unitPrice: number
}

export interface OrderDocument {
  id: string
  type: 'quote' | 'salesorder' | 'invoice'
  docNumber: string
  date: string
  clientName: string
  clientEmail: string
  clientPhone: string
  clientAddress: string
  lineItems: LineItem[]
  notes: string
  terms: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  pushedToSage: boolean
  sageRef?: string
  createdAt: string
  updatedAt: string
  backorderId?: string
}

async function getDocs(): Promise<OrderDocument[]> {
  return await blobRead<OrderDocument[]>(KEY, [])
}

async function saveDocs(docs: OrderDocument[]): Promise<void> {
  await blobWrite(KEY, docs)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    let docs = await getDocs()
    if (type) docs = docs.filter((d) => d.type === type)
    docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return NextResponse.json(docs)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.type || !body.clientName || !body.docNumber) {
      return NextResponse.json({ error: 'type, clientName and docNumber are required' }, { status: 400 })
    }
    const now = new Date().toISOString()
    const doc: OrderDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: body.type,
      docNumber: body.docNumber,
      date: body.date || now.slice(0, 10),
      clientName: body.clientName,
      clientEmail: body.clientEmail || '',
      clientPhone: body.clientPhone || '',
      clientAddress: body.clientAddress || '',
      lineItems: body.lineItems || [],
      notes: body.notes || '',
      terms: body.terms || '',
      status: body.status || 'draft',
      pushedToSage: false,
      createdAt: now,
      updatedAt: now,
      backorderId: body.backorderId,
    }
    const docs = await getDocs()
    docs.unshift(doc)
    await saveDocs(docs)
    return NextResponse.json(doc, { status: 201 })
  } catch (error) {
    console.error('Error creating document:', error)
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
  }
}
