import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/order-template.json'

export interface OrderTemplate {
  companyName: string
  companyAddress: string
  companyVAT: string
  companyPhone: string
  companyEmail: string
  logoUrl: string
  bankName: string
  bankAccount: string
  bankBranch: string
  bankType: string
  quoteTerms: string
  salesOrderTerms: string
  invoiceTerms: string
  footerText: string
}

const DEFAULT_TEMPLATE: OrderTemplate = {
  companyName: 'R66 Slot',
  companyAddress: '',
  companyVAT: '',
  companyPhone: '',
  companyEmail: '',
  logoUrl: '',
  bankName: '',
  bankAccount: '',
  bankBranch: '',
  bankType: 'Current',
  quoteTerms: 'This quote is valid for 30 days from the date of issue.',
  salesOrderTerms: 'Payment is required before the order can be processed.',
  invoiceTerms: 'Payment due within 30 days of invoice date.',
  footerText: '',
}

export async function GET() {
  try {
    const template = await blobRead<OrderTemplate>(KEY, DEFAULT_TEMPLATE)
    return NextResponse.json(template)
  } catch {
    return NextResponse.json(DEFAULT_TEMPLATE)
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    await blobWrite(KEY, body)
    return NextResponse.json(body)
  } catch (error) {
    console.error('Error saving template:', error)
    return NextResponse.json({ error: 'Failed to save template' }, { status: 500 })
  }
}
