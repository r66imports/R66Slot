import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'
import type { CreditStore } from '../route'

const KEY = 'data/customer-credits.json'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ client: string }> }
) {
  try {
    const { client } = await params
    const store = await blobRead<CreditStore>(KEY, {})
    const record = store[client]
    if (!record) return NextResponse.json({ clientName: '', balance: 0, transactions: [] })
    return NextResponse.json(record)
  } catch {
    return NextResponse.json({ clientName: '', balance: 0, transactions: [] })
  }
}
