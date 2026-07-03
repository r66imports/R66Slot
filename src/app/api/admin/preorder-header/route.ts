import { NextRequest, NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/preorder-header.json'

export async function GET() {
  const data = await blobRead<any>(KEY, [])
  if (Array.isArray(data)) {
    return NextResponse.json({ logos: data, theme: 'dark', headerLogo: '' })
  }
  return NextResponse.json({ headerLogo: '', ...data })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const payload = Array.isArray(body) ? { logos: body, theme: 'dark', headerLogo: '' } : body
  await blobWrite(KEY, payload)
  return NextResponse.json({ ok: true })
}
