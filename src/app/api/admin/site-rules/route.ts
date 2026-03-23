import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/site-rules.json'

export interface SiteRule {
  id: string
  name: string
  description: string
  active: boolean
  appliesTo: string[]
}

const DEFAULT_RULES: SiteRule[] = [
  {
    id: 'enforce_stock_limit',
    name: 'Enforce Stock Limits',
    description: 'Prevent selling more items than available in stock. Qty is capped at stock level. If stock is 0, item cannot be added.',
    active: false,
    appliesTo: ['Admin Invoices', 'POS / Scanner', 'Online Store'],
  },
]

export async function GET() {
  try {
    const rules = await blobRead<SiteRule[]>(KEY, DEFAULT_RULES)
    return NextResponse.json(rules)
  } catch {
    return NextResponse.json(DEFAULT_RULES)
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const current = await blobRead<SiteRule[]>(KEY, DEFAULT_RULES)
    const updated = current.map((r) => {
      const patch = body.find((b: any) => b.id === r.id)
      return patch ? { ...r, ...patch } : r
    })
    await blobWrite(KEY, updated)
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
