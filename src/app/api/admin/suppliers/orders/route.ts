import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import type { Backorder } from '@/types/backorder'

const BACKORDERS_KEY = 'data/backorders.json'
const DOCS_KEY = 'data/order-documents.json'

// Only the supplier-order stamp fields matter here — kept local so this route does not
// import from another route file.
interface StampedDoc {
  supplierOrderSent?: boolean
  supplierOrderRef?: string
  supplierOrderName?: string
  supplierOrderSupplier?: string
  updatedAt?: string
}

// DELETE — remove a whole supplier order.
// Preferred form: the page sends the explicit backorder ids making up the group it is showing,
// so exactly the lines on screen go and nothing added since the page loaded gets caught.
// A deployed page may still send ?ref=&supplier= instead, so that form keeps working: the
// group is supplierName + supplierOrderRef, and legacy lines carry no ref at all.
// When the order carries a ref, any quote stamped with it is un-stamped so it can be sent again.
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const body = await request.json().catch(() => ({}))
    const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((i: unknown) => typeof i === 'string') : []
    const ref: string = (typeof body.ref === 'string' ? body.ref : searchParams.get('ref') || '').trim()
    const supplier = (searchParams.get('supplier') || '').trim()

    if (ids.length === 0 && !ref && !supplier) {
      return NextResponse.json({ error: 'No order lines supplied' }, { status: 400 })
    }

    const idSet = new Set(ids)
    const inGroup = (b: Backorder) => {
      if (idSet.size > 0) return idSet.has(b.id)
      if (b.status !== 'active') return false
      if (ref) return b.supplierOrderRef === ref
      // Default (unnamed) order for a supplier — lines with no ref at all
      if (b.supplierOrderRef) return false
      return (b.supplierName || 'Unassigned') === supplier
    }

    const backorders = await blobRead<Backorder[]>(BACKORDERS_KEY, [])
    const remaining = backorders.filter((b) => !inGroup(b))
    const deleted = backorders.length - remaining.length

    if (deleted === 0) {
      return NextResponse.json({ error: 'Supplier order not found' }, { status: 404 })
    }

    await blobWrite(BACKORDERS_KEY, remaining)

    // Un-stamp the source quote(s) so the lines can be re-sent
    let unstamped = 0
    if (ref) {
      const docs = await blobRead<StampedDoc[]>(DOCS_KEY, [])
      let changed = false
      const updated = docs.map((d) => {
        if (d.supplierOrderRef !== ref) return d
        changed = true
        unstamped++
        return {
          ...d,
          supplierOrderSent: false,
          supplierOrderRef: undefined,
          supplierOrderName: undefined,
          supplierOrderSupplier: undefined,
          updatedAt: new Date().toISOString(),
        }
      })
      if (changed) await blobWrite(DOCS_KEY, updated)
    }

    return NextResponse.json({ success: true, deleted, unstamped })
  } catch (error) {
    console.error('Error deleting supplier order:', error)
    return NextResponse.json({ error: 'Failed to delete supplier order' }, { status: 500 })
  }
}
