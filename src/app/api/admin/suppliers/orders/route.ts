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

// DELETE — remove a whole supplier order (every backorder line in the group).
// A group is identified by supplierName + supplierOrderRef, matching the grouping on
// /admin/suppliers. Legacy lines carry no ref, so `ref` is optional and an empty ref
// only matches lines that have none.
// Any quote stamped with this ref is un-stamped so it can be sent to a supplier order again.
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ref = (searchParams.get('ref') || '').trim()
    const supplier = (searchParams.get('supplier') || '').trim()

    if (!ref && !supplier) {
      return NextResponse.json({ error: 'Missing ref or supplier' }, { status: 400 })
    }

    const backorders = await blobRead<Backorder[]>(BACKORDERS_KEY, [])

    const inGroup = (b: Backorder) => {
      if (b.status !== 'active') return false
      if (ref) return b.supplierOrderRef === ref
      // Default (unnamed) order for a supplier — lines with no ref at all
      if (b.supplierOrderRef) return false
      return (b.supplierName || 'Unassigned') === supplier
    }

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
