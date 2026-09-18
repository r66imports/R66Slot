import { NextResponse } from 'next/server'
import { blobRead, blobWrite, blobReplaceArrayItem } from '@/lib/blob-storage'
import { getRates, rateFor } from '@/lib/exchange-rates'
import { accountById, lineEstRetailZAR, DEFAULT_COSTING_ACCOUNTS } from '@/lib/preorder-pricing'
import { sweepBin } from '@/lib/supplier-preorder-bin'
import { binDaysRemaining, BIN_RETENTION_DAYS } from '@/types/supplier-preorder'
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

// GET — ?status=open (default) | archived | bin | all
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'open'

    // Lazy 30-day sweep: no scheduler here, so an admin opening the page is what
    // keeps the Bin honest. Runs before the read so a purged row never renders.
    const swept = await sweepBin()

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
      return {
        ...o,
        lines,
        totalZAR: Math.round(totalZAR * 100) / 100,
        exRate: rate,
        binDaysLeft: o.deletedAt ? binDaysRemaining(o.deletedAt) : undefined,
      }
    })

    return NextResponse.json({
      orders: priced,
      accounts,
      rateFetchedAt: rateData.fetchedAt,
      binCount: binned.length,
      binRetentionDays: BIN_RETENTION_DAYS,
      autoPurged: swept.purged,
    })
  } catch (error) {
    console.error('Error fetching supplier pre orders:', error)
    return NextResponse.json({
      orders: [],
      accounts: DEFAULT_COSTING_ACCOUNTS,
      rateFetchedAt: '',
      binCount: 0,
      binRetentionDays: BIN_RETENTION_DAYS,
      autoPurged: [],
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
 * ?id=abc            bin one (recoverable for BIN_RETENTION_DAYS)
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
      retentionDays: BIN_RETENTION_DAYS,
    })
  } catch (error: any) {
    console.error('Error binning supplier pre orders:', error)
    return NextResponse.json({ error: error?.message || 'Failed to delete' }, { status: 500 })
  }
}

/**
 * POST — Bin actions. { action: 'restore' | 'empty', ids?: string[] }
 *
 * restore puts a binned request back to the status it held when it was binned,
 * so restoring something archived returns it to Archive rather than to Open.
 * empty purges the whole Bin now instead of waiting out the retention window.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const action = body.action
    const ids: string[] = Array.isArray(body.ids) ? body.ids : []
    const all = await blobRead<SupplierPreOrder[]>(KEY, [])

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
