import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/worksheets.json'

export async function GET() {
  const sheets = await blobRead<any[]>(KEY, [])
  return NextResponse.json(sheets)
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
