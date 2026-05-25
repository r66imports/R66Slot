import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/worksheets.json'

export async function GET() {
  const sheets = await blobRead<any[]>(KEY, [])
  return NextResponse.json(sheets)
}

// PATCH — update a single item's sentToInventory flag by worksheetId + SKU
export async function PATCH(req: Request) {
  try {
    const { worksheetId, sku, sentToInventory } = await req.json()
    if (!worksheetId || !sku) return NextResponse.json({ error: 'worksheetId and sku required' }, { status: 400 })
    const sheets = await blobRead<any[]>(KEY, [])
    const sheet = sheets.find((s) => s.id === worksheetId)
    if (!sheet) return NextResponse.json({ error: 'Worksheet not found' }, { status: 404 })
    sheet.items = (sheet.items || []).map((it: any) =>
      it.sku?.trim().toUpperCase() === sku.trim().toUpperCase()
        ? { ...it, sentToInventory: !!sentToInventory }
        : it
    )
    await blobWrite(KEY, sheets)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const sheet = await req.json()
    const sheets = await blobRead<any[]>(KEY, [])
    const idx = sheets.findIndex((s) => s.id === sheet.id)
    if (idx >= 0) sheets[idx] = sheet
    else sheets.unshift(sheet)
    await blobWrite(KEY, sheets)
    return NextResponse.json(sheet)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
