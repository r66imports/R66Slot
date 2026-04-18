import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'

const DOCS_KEY     = 'data/order-documents.json'
const TEMPLATE_KEY = 'data/order-template.json'
const CLIENTS_KEY  = 'data/clients.json'
const BACKORDERS_KEY = 'data/backorders.json'
const RULES_KEY    = 'data/site-rules.json'

// Single endpoint that reads all Orders-page bootstrap data in one server-side
// parallel batch — reduces 5 browser→server round-trips to 1.
export async function GET() {
  try {
    const [docs, template, clients, backorders, storedRules] = await Promise.all([
      blobRead<any[]>(DOCS_KEY, []),
      blobRead<any>(TEMPLATE_KEY, {}),
      blobRead<any[]>(CLIENTS_KEY, []),
      blobRead<any[]>(BACKORDERS_KEY, []),
      blobRead<any[]>(RULES_KEY, []),
    ])

    // Sort docs newest-first
    docs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Filter backorders (exclude book-now and inventory-restock for orders view)
    const filteredBackorders = backorders.filter(
      (b: any) => b.source !== 'book-now' && b.source !== 'inventory-restock'
    )
    filteredBackorders.sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Sort clients
    clients.sort((a: any, b: any) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    )

    // Extract only the two rule flags the Orders page needs
    const shipRule  = storedRules.find((r: any) => r.id === 'document_shipping')
    const stockRule = storedRules.find((r: any) => r.id === 'invoice_stock_deduction')
    const rules = {
      shippingEnabled:       shipRule  ? shipRule.active  !== false : true,
      stockDeductionEnabled: stockRule ? stockRule.active !== false : true,
    }

    // Pad imageBlock to 6 slots
    const ib = Array.isArray(template?.imageBlock) ? template.imageBlock : []
    const imageBlock = [...ib, '', '', '', '', '', ''].slice(0, 6)

    return NextResponse.json({
      documents:   docs,
      template:    { ...template, imageBlock, imageBlockHeight: template?.imageBlockHeight ?? 80 },
      clients,
      backorders:  filteredBackorders,
      rules,
    })
  } catch (error) {
    console.error('[orders/bootstrap] error:', error)
    return NextResponse.json({ error: 'Failed to load orders data' }, { status: 500 })
  }
}
