import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/supplier-google-sheets.json'

// Stored as { [supplierId]: url }
async function getMap(): Promise<Record<string, string>> {
  return await blobRead<Record<string, string>>(KEY, {})
}

export async function GET() {
  try {
    return NextResponse.json(await getMap())
  } catch {
    return NextResponse.json({})
  }
}

export async function POST(request: Request) {
  try {
    const { supplierId, url } = await request.json()
    if (!supplierId) return NextResponse.json({ error: 'supplierId required' }, { status: 400 })
    const map = await getMap()
    if (url) map[supplierId] = url
    else delete map[supplierId]
    await blobWrite(KEY, map)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
