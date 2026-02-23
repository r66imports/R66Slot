import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const BACKORDERS_KEY = 'data/backorders.json'

export interface Backorder {
  id: string
  // Client reference
  clientId?: string
  // Client Details
  clientName: string
  clientEmail: string
  clientPhone: string
  // Club Info
  clubName: string
  clubMemberId: string
  // Company Info
  companyName: string
  companyVAT: string
  companyAddress: string
  // Product Details
  sku: string
  description: string
  brand: string
  supplierLink: string
  qty: number
  price: number
  // Phase Tracking
  phaseQuote: boolean
  phaseQuoteDate?: string
  phaseSalesOrder: boolean
  phaseSalesOrderDate?: string
  phaseInvoice: boolean
  phaseInvoiceDate?: string
  phaseDepositPaid: boolean
  phaseDepositPaidDate?: string
  // Meta
  notes?: string
  status: 'active' | 'complete' | 'cancelled'
  createdAt: string
  updatedAt: string
}

async function getBackorders(): Promise<Backorder[]> {
  return await blobRead<Backorder[]>(BACKORDERS_KEY, [])
}

async function saveBackorders(backorders: Backorder[]): Promise<void> {
  await blobWrite(BACKORDERS_KEY, backorders)
}

// GET all backorders
export async function GET() {
  try {
    const backorders = await getBackorders()
    backorders.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    return NextResponse.json(backorders)
  } catch (error) {
    console.error('Error fetching backorders:', error)
    return NextResponse.json({ error: 'Failed to fetch backorders' }, { status: 500 })
  }
}

// POST create new backorder
export async function POST(request: Request) {
  try {
    const body = await request.json()

    const required = ['clientName', 'sku', 'description', 'qty']
    for (const field of required) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json({ error: `Field "${field}" is required` }, { status: 400 })
      }
    }

    const now = new Date().toISOString()
    const newBackorder: Backorder = {
      id: `bo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      clientId: body.clientId || undefined,
      clientName: body.clientName?.trim() || '',
      clientEmail: body.clientEmail?.trim() || '',
      clientPhone: body.clientPhone?.trim() || '',
      clubName: body.clubName?.trim() || '',
      clubMemberId: body.clubMemberId?.trim() || '',
      companyName: body.companyName?.trim() || '',
      companyVAT: body.companyVAT?.trim() || '',
      companyAddress: body.companyAddress?.trim() || '',
      sku: body.sku?.trim() || '',
      description: body.description?.trim() || '',
      brand: body.brand?.trim() || '',
      supplierLink: body.supplierLink?.trim() || '',
      qty: Number(body.qty) || 1,
      price: Number(body.price) || 0,
      phaseQuote: false,
      phaseSalesOrder: false,
      phaseInvoice: false,
      phaseDepositPaid: false,
      notes: body.notes?.trim() || '',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }

    const backorders = await getBackorders()
    backorders.unshift(newBackorder)
    await saveBackorders(backorders)

    return NextResponse.json(newBackorder, { status: 201 })
  } catch (error) {
    console.error('Error creating backorder:', error)
    return NextResponse.json({ error: 'Failed to create backorder' }, { status: 500 })
  }
}
