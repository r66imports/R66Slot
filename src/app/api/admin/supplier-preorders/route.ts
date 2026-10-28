import { NextResponse } from 'next/server'
import { blobRead, blobWrite, blobReplaceArrayItem } from '@/lib/blob-storage'
import { getRates, rateFor } from '@/lib/exchange-rates'
import {
  accountById,
  clientQuoteZAR,
  lineEstRetailZAR,
  DEFAULT_COSTING_ACCOUNTS,
} from '@/lib/preorder-pricing'
import { getSkuInfo } from '@/lib/supplier-catalogue'
import { db } from '@/lib/db'
import { resolveStockRow } from '@/lib/order-helpers'
import { logStockChange } from '@/lib/stock-log'
import type { CostingAccount, SupplierPreOrder } from '@/types/supplier-preorder'

const KEY = 'data/supplier-preorders.json'

/**
 * Admin view of client Supplier Pre Orders. Unlike the customer route this one
 * returns wholesale prices and the costing account, because this is where they
 * get reviewed and re-priced.
 *
 * Still a request list, not stock — see Rule 59. The one exception is the
 * POST setStock action: an admin correcting a wrong In Stock figure by hand,
 * which is a shelf count and is logged as one.
 */

// GET — ?status=open (default) | archived | bin | all
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'open'

    const [all, savedAccounts, rateData] = await Promise.all([
      blobRead<SupplierPreOrder[]>(KEY, []),
      blobRead<CostingAccount[]>('data/costing-accounts.json', []),
      getRates(),
    ])
    const accounts = savedAccounts.length > 0 ? savedAccounts : DEFAULT_COSTING_ACCOUNTS

    const live = all.filter((o) => !o.deletedAt)
    const binned = all.filter((o) => !!o.deletedAt)

    let orders: SupplierPreOrder[]
    if (status === 'bin') orders = binned
    else if (status === 'archived') orders = live.filter((o) => o.status === 'archived')
    else if (status === 'all') orders = live
    else orders = live.filter((o) => o.status !== 'archived')

    orders = [...orders].sort((a, b) =>
      status === 'bin'
        ? new Date(b.deletedAt || 0).getTime() - new Date(a.deletedAt || 0).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Photo and on-hand qty keyed by SKU rather than folded into the lines —
    // PATCH writes `lines` back verbatim, and derived data has no business
    // being persisted into the request. Fetched BEFORE pricing because the
    // quoted price depends on stock on hand.
    const skuInfo = await getSkuInfo(orders.flatMap((o) => o.lines.map((l) => l.sku)))

    // Re-price every unlocked line against the live rate so the admin sees the
    // same number the client is currently being shown. That means the SAME
    // rule the client route applies — stock on hand quotes the shelf price,
    // everything else the floating estimate — or the two disagree on money.
    const priced = orders.map((o) => {
      const account = accountById(accounts, o.account)
      const rate = rateFor(rateData.rates, o.currency)
      const lines = o.lines.map((l) => {
        const inf = skuInfo[l.sku.trim().toUpperCase()]
        const est = Math.round(lineEstRetailZAR(l, rate, account) * 100) / 100
        const quote = l.priceLocked
          ? { amount: est, basis: 'estimate' as const }
          : clientQuoteZAR({
              qtyAvailable: inf?.qtyAvailable || 0,
              retailZAR: inf?.retailZAR || 0,
              estRetailZAR: est,
            })
        return { ...l, estRetailZAR: est, quoteZAR: quote.amount, quoteBasis: quote.basis }
      })
      const totalZAR = lines
        .filter((l) => l.status !== 'rejected')
        .reduce((s, l) => s + l.qty * l.quoteZAR, 0)
      return { ...o, lines, totalZAR: Math.round(totalZAR * 100) / 100, exRate: rate }
    })

    return NextResponse.json({
      orders: priced,
      accounts,
      skuInfo,
      rateFetchedAt: rateData.fetchedAt,
      binCount: binned.length,
    })
  } catch (error) {
    console.error('Error fetching supplier pre orders:', error)
    return NextResponse.json({
      orders: [],
      accounts: DEFAULT_COSTING_ACCOUNTS,
      skuInfo: {},
      rateFetchedAt: '',
      binCount: 0,
    })
  }
}

/**
 * PATCH — update one pre-order. Body: { id, ...fields }.
 *
 * `lines` replaces the whole array, so send the full set. Archiving stamps
 * archivedAt; an archived pre-order is a record only and is rejected here so a
 * stale tab cannot reopen or re-price it.
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const id = (body.id || '').trim()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const all = await blobRead<SupplierPreOrder[]>(KEY, [])
    const existing = all.find((o) => o.id === id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (existing.deletedAt) {
      return NextResponse.json(
        { error: 'This pre order is in the Bin. Restore it before editing.' },
        { status: 409 }
      )
    }

    if (existing.status === 'archived' && body.status !== 'archived') {
      return NextResponse.json(
        { error: 'This pre order is archived and kept for records only.' },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()
    const updated: SupplierPreOrder = {
      ...existing,
      ...body,
      id: existing.id,
      ref: existing.ref,
      customerId: existing.customerId,
      createdAt: existing.createdAt,
      updatedAt: now,
    }

    if (body.status === 'archived' && existing.status !== 'archived') {
      updated.archivedAt = now
    }

    await blobReplaceArrayItem(KEY, id, updated)
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update' }, { status: 500 })
  }
}

/**
 * DELETE — move to the Bin.
 *
 * ?id=abc            bin one (recoverable until the Bin is emptied)
 * ?ids=a,b,c         bin several in one write
 * &permanent=true    purge outright, skipping the Bin
 *
 * Binning hides the request from the client immediately — from their side it is
 * gone — while leaving it recoverable here. Archive is a different thing: that
 * is history, and an archived request can still be binned.
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const single = (searchParams.get('id') || '').trim()
    const many = (searchParams.get('ids') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const ids = single ? [single, ...many] : many
    const permanent = searchParams.get('permanent') === 'true'

    if (ids.length === 0) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const all = await blobRead<SupplierPreOrder[]>(KEY, [])
    const targets = all.filter((o) => ids.includes(o.id))
    if (targets.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (permanent) {
      const kept = all.filter((o) => !ids.includes(o.id))
      await blobWrite(KEY, kept)
      return NextResponse.json({
        success: true,
        permanent: true,
        refs: targets.map((o) => o.ref),
      })
    }

    const now = new Date().toISOString()
    const updated = all.map((o) =>
      ids.includes(o.id) && !o.deletedAt
        ? { ...o, deletedAt: now, statusBeforeDelete: o.status, updatedAt: now }
        : o
    )
    await blobWrite(KEY, updated)

    return NextResponse.json({
      success: true,
      permanent: false,
      binned: targets.length,
      refs: targets.map((o) => o.ref),
    })
  } catch (error: any) {
    console.error('Error binning supplier pre orders:', error)
    return NextResponse.json({ error: error?.message || 'Failed to delete' }, { status: 500 })
  }
}

/**
 * POST — { action: 'restore' | 'empty', ids?: string[] }
 *        { action: 'setStock', sku, quantity }
 *
 * restore puts a binned request back to the status it held when it was binned,
 * so restoring something archived returns it to Archive rather than to Open.
 * empty purges the whole Bin. Nothing expires on a timer — the Bin holds what
 * it holds until an admin clears it, so a delete is never lost to a clock.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const action = body.action
    const ids: string[] = Array.isArray(body.ids) ? body.ids : []
    const all = await blobRead<SupplierPreOrder[]>(KEY, [])

    // A corrected In Stock figure is a shelf count, not intake and not a sale, so
    // it is logged as 'stocktake' and the Stock Audit keeps the worksheet as the
    // intake figure. Only quantity is written — the product PUT would also
    // overwrite weight, which is not COALESCEd there. Same row the stock path
    // moves (resolveStockRow), and the before-value comes out of the write itself.
    if (action === 'setStock') {
      const sku = String(body.sku || '').trim()
      const quantity = Number(body.quantity)
      if (!sku) return NextResponse.json({ error: 'Missing SKU' }, { status: 400 })
      if (!Number.isInteger(quantity) || quantity < 0) {
        return NextResponse.json({ error: 'In Stock must be a whole number, 0 or more' }, { status: 400 })
      }
      const row = await resolveStockRow(sku)
      if (!row) {
        return NextResponse.json({ error: `${sku} is not in Inventory` }, { status: 404 })
      }
      const res = await db.query(
        `UPDATE products SET quantity = $2, updated_at = $3
           FROM (SELECT COALESCE(quantity, 0) AS q FROM products WHERE id = $1) AS prev
          WHERE products.id = $1
          RETURNING products.quantity, prev.q AS prev_quantity`,
        [row.id, quantity, new Date().toISOString()]
      )
      const before = Number(res.rows[0]?.prev_quantity) || 0
      const after = Number(res.rows[0]?.quantity) || 0
      if (after !== before) {
        await logStockChange({
          sku,
          changeQty: after - before,
          qtyBefore: before,
          qtyAfter: after,
          source: 'stocktake',
          reference: `Stocktake ${new Date().toISOString().slice(0, 10)} - Supplier Pre Orders`,
        })
      }
      return NextResponse.json({ success: true, sku, before, after })
    }

    if (action === 'empty') {
      const binned = all.filter((o) => !!o.deletedAt)
      if (binned.length === 0) return NextResponse.json({ success: true, purged: [] })
      await blobWrite(KEY, all.filter((o) => !o.deletedAt))
      return NextResponse.json({ success: true, purged: binned.map((o) => o.ref) })
    }

    if (action === 'restore') {
      if (ids.length === 0) return NextResponse.json({ error: 'No ids given' }, { status: 400 })
      const now = new Date().toISOString()
      const restored: string[] = []
      const updated = all.map((o) => {
        if (!ids.includes(o.id) || !o.deletedAt) return o
        restored.push(o.ref)
        const { deletedAt, statusBeforeDelete, ...rest } = o
        return { ...rest, status: statusBeforeDelete || o.status, updatedAt: now }
      })
      if (restored.length === 0) {
        return NextResponse.json({ error: 'Nothing to restore' }, { status: 404 })
      }
      await blobWrite(KEY, updated)
      return NextResponse.json({ success: true, restored })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
}
