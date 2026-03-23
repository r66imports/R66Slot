import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/site-rules.json'

export interface SiteRule {
  id: string
  name: string
  description: string
  active: boolean
  appliesTo: string[]
  value?: string
  options?: Array<{ label: string; value: string }>
}

const DEFAULT_RULES: SiteRule[] = [
  {
    id: 'enforce_stock_limit',
    name: 'Enforce Stock Limits',
    description: 'Prevent selling more items than available in stock. Qty is capped at stock level. If stock is 0, item cannot be added.',
    active: false,
    appliesTo: ['Admin Invoices', 'POS / Scanner', 'Online Store'],
  },
  {
    id: 'invoice_price_type',
    name: 'Invoice Default Price Type',
    description: 'Set the default price type applied when adding products to an invoice. Can be changed per-invoice in the Create / Edit Invoice modal.',
    active: true,
    appliesTo: ['Admin Invoices'],
    value: 'retail',
    options: [
      { label: 'Retail Price', value: 'retail' },
      { label: 'Cost Price', value: 'cost' },
      { label: 'Pre-Order Price', value: 'preorder' },
    ],
  },
]

export async function GET() {
  try {
    const stored = await blobRead<SiteRule[]>(KEY, DEFAULT_RULES)
    // Merge in any new default rules not yet in the stored data
    const merged = DEFAULT_RULES.map((def) => {
      const found = stored.find((r) => r.id === def.id)
      return found ? { ...def, ...found, options: def.options } : def
    })
    // Write back if any new rules were added (self-healing)
    const hasNew = DEFAULT_RULES.some((def) => !stored.find((r) => r.id === def.id))
    if (hasNew) await blobWrite(KEY, merged)
    return NextResponse.json(merged)
  } catch {
    return NextResponse.json(DEFAULT_RULES)
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const current = await blobRead<SiteRule[]>(KEY, DEFAULT_RULES)
    // Merge patches; preserve options from defaults
    const updated = DEFAULT_RULES.map((def) => {
      const stored = current.find((r) => r.id === def.id) || def
      const patch = body.find((b: any) => b.id === def.id)
      return patch ? { ...def, ...stored, ...patch, options: def.options } : { ...def, ...stored, options: def.options }
    })
    await blobWrite(KEY, updated)
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
