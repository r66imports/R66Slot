import { NextResponse } from 'next/server'
import { blobRead, blobReplaceArrayItem, blobRemoveArrayItem } from '@/lib/blob-storage'
import { getRates, rateFor } from '@/lib/exchange-rates'
import { accountById, lineEstRetailZAR, DEFAULT_COSTING_ACCOUNTS } from '@/lib/preorder-pricing'
import type { CostingAccount, SupplierPreOrder } from '@/types/supplier-preorder'

const KEY = 'data/supplier-preorders.json'

/**
 * Admin view of client Supplier Pre Orders. Unlike the customer route this one
 * returns wholesale prices and the costing account, because this is where they
 * get reviewed and re-priced.
 *
 * Still a request list, not stock — see Rule 59. Nothing in this file writes to
 * products, quantity or the stock log.
 */

// GET — ?status=open (default, everything not archived) | archived | all
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

    let orders = all
    if (status === 'open') orders = all.filter((o) => o.status !== 'archived')
    else if (status === 'archived') orders = all.filter((o) => o.status === 'archived')

    orders = [...orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Re-price every unlocked line against the live rate so the admin sees the
    // same number the client is currently being shown.
    const priced = orders.map((o) => {
      const account = accountById(accounts, o.account)
      const rate = rateFor(rateData.rates, o.currency)
      const lines = o.lines.map((l) => ({
        ...l,
        estRetailZAR: Math.round(lineEstRetailZAR(l, rate, account) * 100) / 100,
      }))
      const totalZAR = lines
        .filter((l) => l.status !== 'rejected')
        .reduce((s, l) => s + l.qty * l.estRetailZAR, 0)
      return { ...o, lines, totalZAR: Math.round(totalZAR * 100) / 100, exRate: rate }
    })

    return NextResponse.json({
      orders: priced,
      accounts,
      rateFetchedAt: rateData.fetchedAt,
    })
  } catch (error) {
    console.error('Error fetching supplier pre orders:', error)
    return NextResponse.json({ orders: [], accounts: DEFAULT_COSTING_ACCOUNTS, rateFetchedAt: '' })
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

// DELETE — ?id=. Removes the request outright; archiving is the softer option.
export async function DELETE(request: Request) {
  try {
    const id = (new URL(request.url).searchParams.get('id') || '').trim()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    await blobRemoveArrayItem(KEY, id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
