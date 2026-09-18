import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import type { SupplierContact } from '../supplier-contacts/route'

const KEY = 'data/inventory-pricelists.json'
const SUPPLIERS_KEY = 'data/supplier-contacts.json'

/**
 * A supplier's wholesale price for a SKU, in the SUPPLIER's currency.
 *
 * `currency` is stored on the entry, not inferred at read time. It used to be
 * derived from the supplier's Preferred Currency with a `|| 'ZAR'` fallback,
 * which is how a €33.90 Sideways price came to be read as R33.90 and every
 * margin built on it went wrong. A price without a currency is not a price.
 *
 * Every estimate in the system is built from this figure (Rule 20, Rule 60), so
 * it must carry its own unit and never be assumed to be Rand.
 */
export interface PricelistEntry {
  supplierId: string
  sku: string
  wholesalePrice: number
  shopQty: number
  /** ISO code. Empty means genuinely unknown — never silently treated as ZAR. */
  currency?: string
}

async function supplierCurrencies(): Promise<Map<string, string>> {
  const suppliers = await blobRead<SupplierContact[]>(SUPPLIERS_KEY, [])
  return new Map(suppliers.map((s) => [s.id, (s.preferredCurrency || '').toUpperCase()]))
}

/**
 * Fill in the currency of older entries saved before the field existed, from
 * their supplier. Read-time only — it does not rewrite stored data, so a
 * supplier whose currency is corrected later fixes its own history.
 */
function withCurrency(entries: PricelistEntry[], currencies: Map<string, string>): PricelistEntry[] {
  return entries.map((e) => ({
    ...e,
    currency: (e.currency || currencies.get(e.supplierId) || '').toUpperCase(),
  }))
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplierId')
    const [all, currencies] = await Promise.all([
      blobRead<PricelistEntry[]>(KEY, []),
      supplierCurrencies(),
    ])
    const scoped = supplierId ? all.filter((e) => e.supplierId === supplierId) : all
    return NextResponse.json(withCurrency(scoped, currencies))
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const incoming: PricelistEntry[] = body.entries || []
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return NextResponse.json({ error: 'entries array required' }, { status: 400 })
    }

    const [all, currencies] = await Promise.all([
      blobRead<PricelistEntry[]>(KEY, []),
      supplierCurrencies(),
    ])

    for (const entry of incoming) {
      // Stamp the currency at write time so the price keeps its unit even if the
      // supplier is switched to another currency later.
      const stamped: PricelistEntry = {
        ...entry,
        currency: (entry.currency || currencies.get(entry.supplierId) || '').toUpperCase(),
      }
      const idx = all.findIndex((e) => e.supplierId === entry.supplierId && e.sku === entry.sku)
      if (idx >= 0) all[idx] = { ...all[idx], ...stamped }
      else all.push(stamped)
    }

    await blobWrite(KEY, all)
    const supplierId = incoming[0]?.supplierId
    const scoped = supplierId ? all.filter((e) => e.supplierId === supplierId) : all
    return NextResponse.json(withCurrency(scoped, currencies))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH — backfill stored currencies from each entry's supplier.
 * ?dryRun=true reports what it would stamp without writing.
 */
export async function PATCH(request: Request) {
  try {
    const dryRun = new URL(request.url).searchParams.get('dryRun') === 'true'
    const [all, currencies] = await Promise.all([
      blobRead<PricelistEntry[]>(KEY, []),
      supplierCurrencies(),
    ])

    const byCurrency: Record<string, number> = {}
    let stamped = 0
    let unknown = 0

    const updated = all.map((e) => {
      if (e.currency) return e
      const cur = currencies.get(e.supplierId) || ''
      if (!cur) {
        unknown++
        return e
      }
      stamped++
      byCurrency[cur] = (byCurrency[cur] || 0) + 1
      return { ...e, currency: cur }
    })

    if (!dryRun && stamped > 0) await blobWrite(KEY, updated)

    return NextResponse.json({
      dryRun,
      total: all.length,
      stamped,
      byCurrency,
      unknownSupplierCurrency: unknown,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
