import { NextRequest, NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/sku-entity-map.json'

export async function GET() {
  const map = await blobRead<Record<string, string>>(KEY, {})
  return NextResponse.json(map)
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, string>
  const existing = await blobRead<Record<string, string>>(KEY, {})
  const merged = { ...existing, ...body }
  await blobWrite(KEY, merged)
  return NextResponse.json(merged)
}
