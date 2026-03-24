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
  category?: string
}

const DEFAULT_RULES: SiteRule[] = [
  {
    id: 'site_font',
    name: 'Rule 0 \u2014 Site Font',
    description: 'The global font used across all pages of the store, admin, and customer-facing areas. Currently set to Play (Google Fonts). Applied via the root layout body class \u2014 affects headings, body text, and UI elements site-wide.',
    active: true,
    appliesTo: ['Online Store', 'Admin', 'Customer Account', 'All Pages'],
    value: 'Play',
    category: 'System',
  },
  {
    id: 'enforce_stock_limit',
    name: 'Rule 1 \u2014 Enforce Stock Limits',
    description: 'Prevent selling more items than what is available in stock. Quantity is capped at the current stock level. If stock is 0, the item cannot be added to an invoice or sold at POS.',
    active: false,
    appliesTo: ['Admin Invoices', 'POS / Scanner', 'Online Store'],
    category: 'Inventory',
  },
  {
    id: 'auto_create_product',
    name: 'Rule 2 \u2014 Auto-Create Product from Invoice',
    description: 'When a new invoice is created, any line item whose SKU does not already exist in the Products inventory is automatically created as a draft product. Flow: Create Invoice \u2192 line items checked against Products DB \u2192 SKU not found \u2192 draft product created with SKU, title (from description), and price (from line item unit price) \u2192 product visible in Products admin with status Draft \u2192 you can edit and complete the product details at any time. Only runs on new invoices \u2014 editing an existing invoice does not re-trigger auto-creation.',
    active: true,
    appliesTo: ['Admin Invoices', 'Products'],
    category: 'Inventory',
  },
  {
    id: 'invoice_stock_deduction',
    name: 'Rule 3 \u2014 Stock Deduction on Invoice & Sales Order',
    description: 'Automatically adjusts inventory when documents are created, edited, or cancelled. Flow: Quote created \u2192 no stock impact. Sales Order created \u2192 stock reserved (deducted immediately, pending delivery). Invoice created \u2192 stock confirmed as sold (deducted). Line items edited on active SO/Invoice \u2192 old quantities restored, new quantities deducted. Document archived or rejected \u2192 stock fully restored. Use the "Sync Inventory" button on the Orders page to apply deductions to all historical invoices and sales orders that predate this rule.',
    active: true,
    appliesTo: ['Admin Invoices', 'Sales Orders'],
    category: 'Inventory',
  },
  {
    id: 'backorder_to_invoice',
    name: 'Rule 4 \u2014 Backorder \u2192 Send to Invoice',
    description: 'Allows selected backorder items to be converted directly into an invoice without going through the Quote \u2192 Sales Order flow. Flow: Back Orders page \u2192 tick item checkboxes for a client \u2192 click "Send to Invoice (n)" \u2192 Create Invoice modal opens pre-filled with selected items and client details \u2192 save the invoice \u2192 stock is automatically deducted (Rule 2) \u2192 backorder items are marked as invoiced. Applies only to the checked items; unchecked items in the same client group remain as active backorders.',
    active: true,
    appliesTo: ['Back Orders', 'Admin Invoices'],
    category: 'Invoices',
  },
  {
    id: 'document_shipping',
    name: 'Rule 5 \u2014 Shipping & Discounts on Quotes, Sales Orders & Invoices',
    description: 'Discount and shipping can be applied to any document type. Discount %: applied to the line items subtotal only \u2014 reduces the base total before shipping is added. Shipping Cost: added after discount and is never discounted. Formula: Total = Subtotal \u2212 Discount + Shipping. Flow: Create or Edit Quote / Sales Order / Invoice \u2192 scroll to Line Items totals \u2192 enter Discount % (optional) \u2192 select Shipping Method (Pudo Locker-to-Locker, Pudo Door-to-Door, The Courier Guy, Fastway, Aramex, PostNet, Collection, Other) \u2192 enter Shipping Cost \u2192 enter Tracking Number (hidden for Collection) \u2192 final Total = Subtotal \u2212 Discount + Shipping \u2192 appears correctly in the document list, PDF, print, and email. Tracking number field only appears when a shipping method is selected and method is not Collection.',
    active: true,
    appliesTo: ['Admin Invoices', 'Quotes', 'Sales Orders'],
    category: 'Invoices',
  },
  {
    id: 'configurable_dropdowns',
    name: 'Rule 7 \u2014 Configurable Dropdown Options',
    description: 'All dropdown menus across the admin can have their options managed inline. Each dropdown shows a + Add and trash Delete icon directly inside the dropdown popup. Adding a new option: type the label, choose a colour dot, press + or Enter. Deleting: hover the option and click the trash icon. Changes save automatically. Applies to: Status, Instructions, Courier (Shipment Log), Box Sizes, and any future dropdown fields.',
    active: true,
    appliesTo: ['Admin', 'Shipment Log', 'All Dropdowns'],
    category: 'System',
  },
  {
    id: 'invoice_price_type',
    name: 'Rule 6 \u2014 Invoice Default Price Type',
    description: 'Sets the default price type applied when adding products to an invoice. Choose between Retail, Cost, or Pre-Order as the default. Can be overridden per-invoice using the Retail | Cost | Pre-Order selector in the Line Items header. Per-row quick-switch buttons also appear under each line item showing all available prices. Products without a Pre-Order price configured will fall back to Retail when Pre-Order mode is selected.',
    active: true,
    appliesTo: ['Admin Invoices'],
    value: 'retail',
    options: [
      { label: 'Retail Price', value: 'retail' },
      { label: 'Cost Price', value: 'cost' },
      { label: 'Pre-Order Price', value: 'preorder' },
    ],
    category: 'Invoices',
  },
]

export async function GET() {
  try {
    const stored = await blobRead<SiteRule[]>(KEY, DEFAULT_RULES)
    // Merge in any new default rules not yet in the stored data
    const merged = DEFAULT_RULES.map((def) => {
      const found = stored.find((r) => r.id === def.id)
      if (!found) return def
      return {
        ...def,
        ...found,
        options: def.options,
        // Fall back to default category if stored rule has none
        category: found.category ?? def.category,
      }
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
      return patch
        ? { ...def, ...stored, ...patch, options: def.options }
        : { ...def, ...stored, options: def.options, category: stored.category ?? def.category }
    })
    await blobWrite(KEY, updated)
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
