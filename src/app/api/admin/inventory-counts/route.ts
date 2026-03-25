import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/inventory-counts.json'

interface CountRecord {
  counts: Record<string, number> // productId → counted qty
  date: string                   // ISO timestamp of last stock take
}

export async function GET() {
  try {
    const data = await blobRead<CountRecord>(KEY, { counts: {}, date: '' })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ counts: {}, date: '' })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as CountRecord
    await blobWrite(KEY, body)
    return NextResponse.json(body)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
