'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { compareSku, formatZAR } from '@/lib/preorder-pricing'
import { documentTotal, settledAmount, balanceDue, MONEY_EPSILON } from '@/lib/payment-math'
import type { CostingAccount, SupplierPreOrder, SupplierPreOrderLine } from '@/types/supplier-preorder'

type Order = SupplierPreOrder & { totalZAR: number; exRate: number }

interface OpenSupplierOrder {
  ref: string
  name: string
  supplierName: string
  lines: number
  /** Raised by us rather than gathered from clients — the merge targets. */
  fromClients: boolean
}

const STATUS_STYLES: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800',
  reviewed: 'bg-indigo-100 text-indigo-800',
  quoted: 'bg-purple-100 text-purple-800',
  ordered: 'bg-amber-100 text-amber-800',
  'deposit-paid': 'bg-teal-100 text-teal-800',
  paid: 'bg-green-100 text-green-800',
  archived: 'bg-gray-200 text-gray-700',
}

export default function SupplierPreOrdersAdminPage() {
  const [tab, setTab] = useState<'open' | 'archived'>('open')
  const [orders, setOrders] = useState<Order[]>([])
  const [accounts, setAccounts] = useState<CostingAccount[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [supplierOrders, setSupplierOrders] = useState<OpenSupplierOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [mergeRef, setMergeRef] = useState('')
  const [quoteTarget, setQuoteTarget] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [poRes, docRes, soRes] = await Promise.all([
        fetch(`/api/admin/supplier-preorders?status=${tab}`),
        fetch('/api/admin/orders/documents'),
        fetch('/api/admin/supplier-orders'),
      ])
      if (poRes.ok) {
        const data = await poRes.json()
        setOrders(data.orders || [])
        setAccounts(data.accounts || [])
      }
      if (docRes.ok) setDocs(await docRes.json())
      if (soRes.ok) {
        const lines: any[] = await soRes.json()
        const map = new Map<string, OpenSupplierOrder>()
        for (const l of lines) {
          const ref = l.supplierOrderRef
          if (!ref) continue
          const cur = map.get(ref)
          const fromClient = (l.source || '').startsWith('supplier-preorder:')
          if (cur) {
            cur.lines++
            cur.fromClients = cur.fromClients && fromClient
          } else {
            map.set(ref, {
              ref,
              name: l.supplierOrderName || ref,
              supplierName: l.supplierName || '',
              lines: 1,
              fromClients: fromClient,
            })
          }
        }
        setSupplierOrders([...map.values()])
      }
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  const docById = useMemo(() => new Map(docs.map((d) => [d.id, d])), [docs])

  const patchOrder = async (id: string, patch: Partial<SupplierPreOrder>) => {
    const res = await fetch('/api/admin/supplier-preorders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      setNote({ kind: 'err', text: e?.error || 'Could not save' })
      return false
    }
    await load()
    return true
  }

  const patchLine = (order: Order, lineId: string, patch: Partial<SupplierPreOrderLine>) => {
    const lines = order.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l))
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, lines } : o)))
    return lines
  }

  const saveLines = (order: Order, lines: SupplierPreOrderLine[]) =>
    patchOrder(order.id, { lines })

  const toggleSelect = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  // Selection must stay within one supplier — a supplier order goes to one supplier.
  const selectedOrders = orders.filter((o) => selected.includes(o.id))
  const selectedSuppliers = [...new Set(selectedOrders.map((o) => o.supplierId))]
  const mixedSuppliers = selectedSuppliers.length > 1
  const sendableSupplier = selectedOrders[0]?.supplierName || ''

  const mergeCandidates = supplierOrders.filter(
    (so) => !so.fromClients && (!sendableSupplier || so.supplierName === sendableSupplier)
  )

  const sendToSupplierOrder = async (mode: 'new' | 'existing') => {
    if (selected.length === 0) return
    if (mixedSuppliers) {
      setNote({ kind: 'err', text: 'Those pre orders are for different suppliers. Send one at a time.' })
      return
    }
    if (mode === 'existing' && !mergeRef) {
      setNote({ kind: 'err', text: 'Pick an order to merge into.' })
      return
    }
    setBusy(true)
    setNote(null)
    try {
      const res = await fetch('/api/admin/supplier-preorders/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected, mode, supplierOrderRef: mode === 'existing' ? mergeRef : '' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Send failed')
      setNote({
        kind: 'ok',
        text: data.merged
          ? `Merged ${data.linesAdded} lines into ${data.supplierOrderRef}.`
          : `Created ${data.supplierOrderRef} with ${data.linesAdded} lines.`,
      })
      setSelected([])
      setMergeRef('')
      await load()
    } catch (e: any) {
      setNote({ kind: 'err', text: e?.message || 'Send failed' })
    } finally {
      setBusy(false)
    }
  }

  /**
   * Send to Quote, done from here rather than server-side because that is how
   * the rest of the admin raises documents.
   *
   * stockAlreadyReserved:true is doing real work — without it the documents API
   * runs autoCreateMissingProducts and every client-typed SKU on the request
   * becomes a draft Inventory product, which Rule 59 forbids. A quote is not
   * stockable either way, so the flag only suppresses the product creation.
   */
  const sendToQuote = async (order: Order, mode: 'new' | 'existing') => {
    const active = order.lines.filter((l) => l.status !== 'rejected')
    if (active.length === 0) {
      setNote({ kind: 'err', text: 'Every line on that pre order is rejected.' })
      return
    }
    const unpriced = active.filter((l) => l.estRetailZAR <= 0)
    if (unpriced.length > 0) {
      setNote({ kind: 'err', text: `Price these first: ${unpriced.map((l) => l.sku).join(', ')}` })
      return
    }

    setBusy(true)
    setNote(null)
    try {
      const lineItems = active.map((l, i) => ({
        id: `li_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        description: `${l.sku} – ${l.description || l.brand}`,
        qty: l.qty,
        unitPrice: l.estRetailZAR,
      }))

      if (mode === 'existing') {
        const targetId = quoteTarget[order.id]
        if (!targetId) throw new Error('Pick a document to add to.')
        const target = docById.get(targetId)
        // appendLineItems merges against the document as it stands on the server.
        // Building the array here from a stale copy is what used to drop lines
        // when two sends raced each other.
        const res = await fetch(`/api/admin/orders/documents/${targetId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          // Both flags, though the target is always a quote and so not stockable:
          // stockAlreadyReserved skips the shortfall check, skipStockAdjust stops
          // any stock movement. If the target list is ever widened beyond quotes,
          // these are what keep a pre-order off Inventory (Rule 59).
          body: JSON.stringify({
            appendLineItems: lineItems,
            stockAlreadyReserved: true,
            skipStockAdjust: true,
          }),
        })
        if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Could not update')
        await patchOrder(order.id, {
          status: 'quoted',
          quoteId: targetId,
          quoteNumber: target?.docNumber,
        })
        setNote({ kind: 'ok', text: `Added ${lineItems.length} lines to ${target?.docNumber}.` })
        return
      }

      const nums = docs.map((d) => {
        const m = /^QR66(\d+)$/i.exec(d?.docNumber || '')
        return m ? parseInt(m[1], 10) : 0
      })
      const docNumber = `QR66${Math.max(0, ...nums) + 1}`

      const res = await fetch('/api/admin/orders/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'quote',
          docNumber,
          date: new Date().toISOString().slice(0, 10),
          clientName: order.clientName,
          clientEmail: order.clientEmail || '',
          clientPhone: order.clientPhone || '',
          lineItems,
          notes: [`Supplier Pre Order ${order.ref} — ${order.supplierName}`, order.notes]
            .filter(Boolean)
            .join('\n'),
          status: 'draft',
          depositMode: false,
          stockAlreadyReserved: true,
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Could not create quote')
      const doc = await res.json()
      // A quote that came back without its lines must not badge the pre-order —
      // an unlinked request can be retried, a wrongly-linked one strands the client.
      if (!doc?.id || (doc.lineItems || []).length === 0) {
        throw new Error(`${doc?.docNumber || 'The quote'} was created without lines — check it.`)
      }
      await patchOrder(order.id, { status: 'quoted', quoteId: doc.id, quoteNumber: doc.docNumber })
      setNote({ kind: 'ok', text: `Created ${doc.docNumber} with ${lineItems.length} lines.` })
    } catch (e: any) {
      setNote({ kind: 'err', text: e?.message || 'Send to quote failed' })
    } finally {
      setBusy(false)
    }
  }

  /** Payment state read off the linked document — never hand-rolled (payment-math.ts). */
  const paymentState = (order: Order) => {
    const doc = order.quoteId ? docById.get(order.quoteId) : null
    if (!doc) return null
    const total = documentTotal(doc)
    const settled = settledAmount(doc)
    const balance = balanceDue(doc)
    if (settled <= MONEY_EPSILON) return { label: 'Unpaid', tone: 'text-gray-500', total, settled, balance, doc }
    if (balance <= MONEY_EPSILON) {
      return { label: doc.type === 'invoice' ? 'Invoice Paid' : 'Paid', tone: 'text-green-700', total, settled, balance, doc }
    }
    return { label: 'Deposit Paid', tone: 'text-teal-700', total, settled, balance, doc }
  }

  /**
   * Open QUOTES for this client, and deliberately nothing else.
   *
   * Invoices and sales orders are stockable, so appending to one runs the PATCH
   * route's adjustStock and deducts inventory for goods that have not been
   * ordered from the supplier yet, let alone landed — exactly what Rule 59
   * forbids. (stockAlreadyReserved does NOT prevent that on PATCH; it only
   * skips the shortfall check. skipStockAdjust is the flag that stops the
   * movement.) Restricting the target to quotes keeps this off the stock path
   * altogether, and matches what the feature is for: Send to Quote.
   */
  const openDocsFor = (order: Order) => {
    const email = (order.clientEmail || '').toLowerCase()
    const openStatuses = ['draft', 'sent', 'accepted', 'pending', 'processing', 'active']
    return docs.filter(
      (d) =>
        d.type === 'quote' &&
        openStatuses.includes(d.status) &&
        (d.clientEmail?.toLowerCase() === email ||
          d.clientName?.toLowerCase() === order.clientName?.toLowerCase())
    )
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Order[]>()
    for (const o of orders) {
      const key = o.supplierName || 'Unassigned'
      const cur = map.get(key)
      if (cur) cur.push(o)
      else map.set(key, [o])
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [orders])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Supplier Pre Orders</h1>
        <p className="text-sm text-gray-600 mt-1">
          What clients have asked us to order. Gathered separately from our own supplier orders and
          merged into one only when you send them. <strong>Requests, not stock</strong> — nothing
          here touches Inventory.
        </p>
      </div>

      <div className="flex gap-2">
        {(['open', 'archived'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t)
              setSelected([])
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              tab === t ? 'bg-gray-900 text-white' : 'bg-white border border-gray-300 text-gray-700'
            }`}
          >
            {t === 'open' ? 'Open' : 'Archived'}
          </button>
        ))}
      </div>

      {note && (
        <div
          className={`text-sm rounded-md px-3 py-2 ${
            note.kind === 'ok'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {note.text}
        </div>
      )}

      {/* Send bar */}
      {tab === 'open' && selected.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-amber-900">
            {selected.length} selected
            {sendableSupplier && !mixedSuppliers ? ` · ${sendableSupplier}` : ''}
          </span>
          {mixedSuppliers ? (
            <span className="text-sm text-red-700">
              Different suppliers selected — send one supplier at a time.
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => sendToSupplierOrder('new')}
                disabled={busy}
                className="px-3 py-2 text-sm font-medium rounded-md bg-gray-900 text-white disabled:opacity-40"
              >
                New Supplier Order
              </button>
              <span className="text-sm text-amber-900">or merge into</span>
              <select
                value={mergeRef}
                onChange={(e) => setMergeRef(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Select an order…</option>
                {mergeCandidates.map((so) => (
                  <option key={so.ref} value={so.ref}>
                    {so.ref} — {so.name} ({so.lines})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => sendToSupplierOrder('existing')}
                disabled={busy || !mergeRef}
                className="px-3 py-2 text-sm font-medium rounded-md bg-amber-600 text-white disabled:opacity-40"
              >
                Merge
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setSelected([])}
            className="text-sm text-amber-800 underline ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 py-10 text-center">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-10 text-center">
          <p className="text-sm text-gray-500">
            {tab === 'open' ? 'No client pre orders yet.' : 'Nothing archived yet.'}
          </p>
        </div>
      ) : (
        grouped.map(([supplierName, group]) => (
          <div key={supplierName} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{supplierName}</h2>
              <span className="text-xs text-gray-500">
                {group.length} request{group.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {group.map((order) => {
                const pay = paymentState(order)
                const isOpen = expanded === order.id
                const account = accounts.find((a) => a.id === order.account)
                return (
                  <div key={order.id} className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {tab === 'open' && (
                        <input
                          type="checkbox"
                          checked={selected.includes(order.id)}
                          onChange={() => toggleSelect(order.id)}
                          className="w-4 h-4"
                          aria-label={`Select ${order.ref}`}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : order.id)}
                        className="flex-1 flex items-center justify-between gap-4 text-left min-w-0"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-gray-900">{order.ref}</span>
                          <span className="ml-2 text-sm text-gray-700">{order.clientName}</span>
                          <span className="ml-2 text-xs text-gray-400">
                            {new Date(order.createdAt).toLocaleDateString('en-ZA')} ·{' '}
                            {order.lines.length} line{order.lines.length === 1 ? '' : 's'}
                          </span>
                          {order.supplierOrderRef && (
                            <span className="ml-2 text-xs text-amber-700">
                              → {order.supplierOrderRef}
                            </span>
                          )}
                          {order.quoteNumber && (
                            <span className="ml-2 text-xs text-purple-700">{order.quoteNumber}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 whitespace-nowrap">
                          {pay && <span className={`text-xs font-medium ${pay.tone}`}>{pay.label}</span>}
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {order.status.replace('-', ' ')}
                          </span>
                          <span className="font-semibold">{formatZAR(order.totalZAR)}</span>
                          <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                        </div>
                      </button>
                    </div>

                    {isOpen && (
                      <div className="mt-4 pl-1 space-y-4">
                        {/* Controls */}
                        <div className="flex flex-wrap items-end gap-3 text-sm">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Costing account</label>
                            <select
                              value={order.account}
                              onChange={(e) => patchOrder(order.id, { account: e.target.value as any })}
                              disabled={tab === 'archived'}
                              className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                            >
                              {accounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Currency</label>
                            <input
                              defaultValue={order.currency}
                              onBlur={(e) =>
                                e.target.value.toUpperCase() !== order.currency &&
                                patchOrder(order.id, { currency: e.target.value.toUpperCase() })
                              }
                              disabled={tab === 'archived'}
                              className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div className="text-xs text-gray-500 pb-2">
                            1 {order.currency} ={' '}
                            {order.exRate > 0 ? formatZAR(order.exRate) : 'no rate'}
                            {account && (
                              <span className="ml-2">
                                · {account.shippingPct + account.customsPct + account.handlingPct}%
                                landed · {account.markupPct}% markup · {account.vatPct}% VAT
                              </span>
                            )}
                          </div>
                          <div className="ml-auto text-xs text-gray-500 pb-2">
                            {order.clientEmail}
                            {order.clientPhone ? ` · ${order.clientPhone}` : ''}
                          </div>
                        </div>

                        {/* Lines */}
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                                <th className="py-2 pr-3 font-medium">Brand</th>
                                <th className="py-2 pr-3 font-medium">SKU</th>
                                <th className="py-2 pr-3 font-medium">Description</th>
                                <th className="py-2 pr-3 font-medium text-center">Qty</th>
                                <th className="py-2 pr-3 font-medium text-right">
                                  Wholesale ({order.currency})
                                </th>
                                <th className="py-2 pr-3 font-medium text-right">Est. Retail</th>
                                <th className="py-2 font-medium text-center">Keep</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {[...order.lines]
                                .sort((a, b) => compareSku(a.sku, b.sku))
                                .map((l) => (
                                  <tr
                                    key={l.id}
                                    className={l.status === 'rejected' ? 'opacity-40' : undefined}
                                  >
                                    <td className="py-2 pr-3 text-gray-600">{l.brand}</td>
                                    <td className="py-2 pr-3 font-mono text-xs">
                                      {l.sku}
                                      {l.isNewSku && (
                                        <span className="ml-1 text-[10px] uppercase bg-yellow-100 text-yellow-800 px-1 rounded">
                                          new
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 pr-3">
                                      <input
                                        defaultValue={l.description}
                                        onBlur={(e) =>
                                          e.target.value !== l.description &&
                                          saveLines(
                                            order,
                                            patchLine(order, l.id, { description: e.target.value })
                                          )
                                        }
                                        disabled={tab === 'archived'}
                                        className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-gray-300 rounded text-sm"
                                      />
                                    </td>
                                    <td className="py-2 pr-3 text-center">
                                      <input
                                        type="number"
                                        min={1}
                                        defaultValue={l.qty}
                                        onBlur={(e) => {
                                          const q = Math.max(1, parseInt(e.target.value, 10) || 1)
                                          if (q !== l.qty)
                                            saveLines(order, patchLine(order, l.id, { qty: q }))
                                        }}
                                        disabled={tab === 'archived'}
                                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                                      />
                                    </td>
                                    <td className="py-2 pr-3 text-right">
                                      <input
                                        type="number"
                                        step="0.01"
                                        min={0}
                                        defaultValue={l.wholesalePrice}
                                        onBlur={(e) => {
                                          const w = Number(e.target.value) || 0
                                          if (w !== l.wholesalePrice)
                                            saveLines(
                                              order,
                                              patchLine(order, l.id, { wholesalePrice: w })
                                            )
                                        }}
                                        disabled={tab === 'archived' || l.priceLocked}
                                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right disabled:bg-gray-100"
                                      />
                                    </td>
                                    <td className="py-2 pr-3 text-right font-semibold">
                                      {l.estRetailZAR > 0 ? formatZAR(l.estRetailZAR) : '—'}
                                      {l.priceLocked && (
                                        <span className="ml-1 text-[10px] uppercase text-green-700">
                                          locked
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 text-center">
                                      <input
                                        type="checkbox"
                                        checked={l.status !== 'rejected'}
                                        onChange={(e) =>
                                          saveLines(
                                            order,
                                            patchLine(order, l.id, {
                                              status: e.target.checked ? 'active' : 'rejected',
                                            })
                                          )
                                        }
                                        disabled={tab === 'archived'}
                                        className="w-4 h-4"
                                        aria-label={`Keep ${l.sku}`}
                                      />
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>

                        {order.notes && (
                          <p className="text-xs text-gray-600 italic">Client note: {order.notes}</p>
                        )}

                        {/* Payment */}
                        {pay && (
                          <div className="text-xs bg-gray-50 border border-gray-200 rounded px-3 py-2 flex flex-wrap gap-4">
                            <span>
                              {pay.doc.docNumber} total{' '}
                              <strong>{formatZAR(pay.total)}</strong>
                            </span>
                            <span>
                              settled <strong>{formatZAR(pay.settled)}</strong>
                            </span>
                            <span>
                              balance <strong>{formatZAR(pay.balance)}</strong>
                            </span>
                            <span className={pay.tone}>{pay.label}</span>
                          </div>
                        )}

                        {/* Actions */}
                        {tab === 'open' && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => sendToQuote(order, 'new')}
                              disabled={busy}
                              className="px-3 py-2 text-sm font-medium rounded-md bg-purple-600 text-white disabled:opacity-40"
                            >
                              New Quote
                            </button>
                            <select
                              value={quoteTarget[order.id] || ''}
                              onChange={(e) =>
                                setQuoteTarget((p) => ({ ...p, [order.id]: e.target.value }))
                              }
                              className="px-2 py-2 border border-gray-300 rounded-md text-sm"
                            >
                              <option value="">Add to existing quote…</option>
                              {openDocsFor(order).map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.docNumber} ({d.type})
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => sendToQuote(order, 'existing')}
                              disabled={busy || !quoteTarget[order.id]}
                              className="px-3 py-2 text-sm font-medium rounded-md border border-purple-300 text-purple-700 disabled:opacity-40"
                            >
                              Add
                            </button>

                            <span className="mx-1 text-gray-300">|</span>

                            {order.status !== 'paid' && (
                              <button
                                type="button"
                                onClick={() => patchOrder(order.id, { status: 'paid' })}
                                disabled={busy}
                                className="px-3 py-2 text-sm font-medium rounded-md bg-green-600 text-white disabled:opacity-40"
                              >
                                Mark as Paid
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Archive ${order.ref}? It becomes a read-only record and cannot be edited or sent again.`
                                  )
                                )
                                  patchOrder(order.id, { status: 'archived' })
                              }}
                              disabled={busy}
                              className="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 disabled:opacity-40"
                            >
                              Archive
                            </button>
                          </div>
                        )}
                        {tab === 'archived' && (
                          <p className="text-xs text-gray-500 italic">
                            Archived {order.archivedAt ? new Date(order.archivedAt).toLocaleDateString('en-ZA') : ''} — kept for records only.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
