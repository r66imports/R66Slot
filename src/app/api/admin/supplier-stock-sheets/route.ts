import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/supplier-stock-sheets.json'

export interface StockSheet {
  id: string
  supplierId: string
  supplierName: string
  filename: string
  r2Key: string
  url: string
  fileType: string
  fileSize: number
  uploadedAt: string
  notes?: string
}

async function getSheets(): Promise<StockSheet[]> {
  return await blobRead<StockSheet[]>(KEY, [])
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplierId')
    const sheets = await getSheets()
    return NextResponse.json(supplierId ? sheets.filter(s => s.supplierId === supplierId) : sheets)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const sheets = await getSheets()
    const sheet: StockSheet = {
      id: `ss-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      supplierId: body.supplierId || '',
      supplierName: body.supplierName || '',
      filename: body.filename || '',
      r2Key: body.r2Key || '',
      url: body.url || '',
      fileType: body.fileType || '',
      fileSize: body.fileSize || 0,
      uploadedAt: new Date().toISOString(),
      notes: body.notes || '',
    }
    sheets.unshift(sheet)
    await blobWrite(KEY, sheets)
    return NextResponse.json(sheet, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const sheets = await getSheets()
    await blobWrite(KEY, sheets.filter(s => s.id !== id))
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
