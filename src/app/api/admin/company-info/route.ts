import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const COMPANY_INFO_KEY = 'data/company-info.json'

export interface CompanyInfo {
  name: string
  address: string
  city: string
  postalCode: string
  country: string
  phone: string
  email: string
  website: string
  vatNumber: string
  registrationNumber: string
}

const defaultInfo: CompanyInfo = {
  name: '',
  address: '',
  city: '',
  postalCode: '',
  country: 'South Africa',
  phone: '',
  email: '',
  website: '',
  vatNumber: '',
  registrationNumber: '',
}

export async function GET() {
  try {
    const info = await blobRead<CompanyInfo>(COMPANY_INFO_KEY, defaultInfo)
    return NextResponse.json(info)
  } catch {
    return NextResponse.json(defaultInfo)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    await blobWrite(COMPANY_INFO_KEY, body)
    return NextResponse.json(body)
  } catch {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
