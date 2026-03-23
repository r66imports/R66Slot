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
    id: 'site_font',
    name: 'Rule 0 — Site Font',
    description: 'The global font used across all pages of the store, admin, and customer-facing areas. Currently set to Play (Google Fonts). Applied via the root layout body class — affects headings, body text, and UI elements site-wide.',
    active: true,
    appliesTo: ['Online Store', 'Admin', 'Customer Account', 'All Pages'],
    value: 'Play',
  },
  {
    id: 'enforce_stock_limit',
    name: 'Rule 1 — Enforce Stock Limits',
    description: 'Prevent selling more items than what is available in stock. Quantity is capped at the current stock level. If stock is 0, the item cannot be added to an invoice or sold at POS.',
    active: false,
    appliesTo: ['Admin Invoices', 'POS / Scanner', 'Online Store'],
  },
  {
    id: 'invoice_stock_deduction',
    name: 'Rule 2 — Stock Deduction on Invoice & Sales Order',
    description: 'Automatically adjusts inventory when documents are created, edited, or cancelled. Flow: Quote created → no stock impact. Sales Order created → stock reserved (deducted immediately, pending delivery). Invoice created → stock confirmed as sold (deducted). Line items edited on active SO/Invoice → old quantities restored, new quantities deducted. Document archived or rejected → stock fully restored. Use the "Sync Inventory" button on the Orders page to apply deductions to all historical invoices and sales orders that predate this rule.',
    active: true,
    appliesTo: ['Admin Invoices', 'Sales Orders'],
  },
  {
    id: 'backorder_to_invoice',
    name: 'Rule 3 — Backorder → Send to Invoice',
    description: 'Allows selected backorder items to be converted directly into an invoice without going through the Quote → Sales Order flow. Flow: Back Orders page → tick item checkboxes for a client → click "Send to Invoice (n)" → Create Invoice modal opens pre-filled with selected items and client details → save the invoice → stock is automatically deducted (Rule 2) → backorder items are marked as invoiced. Applies only to the checked items; unchecked items in the same client group remain as active backorders.',
    active: true,
    appliesTo: ['Back Orders', 'Admin Invoices'],
  },
  {
    id: 'invoice_price_type',
    name: 'Rule 4 — Invoice Default Price Type',
    description: 'Sets the default price type applied when adding products to an invoice. Choose between Retail, Cost, or Pre-Order as the default. Can be overridden per-invoice using the Retail | Cost | Pre-Order selector in the Line Items header. Per-row quick-switch buttons also appear under each line item showing all available prices. Products without a Pre-Order price configured will fall back to Retail when Pre-Order mode is selected.',
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
