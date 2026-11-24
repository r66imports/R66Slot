'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

interface Line { lineId: string; description: string; qty: number; unitPrice: number }
interface SoView { soNumber: string; totalQty: number; totalSold: number; totalRemaining: number }
interface Row {
  id: string; number: string; soId: string; soNumber: string
  clientName: string; clientEmail: string; lines: Line[]; note?: string
  status: 'new' | 'invoiced' | 'rejected'; invoiceNumber?: string
  createdAt: string; invoicedAt?: string; so: SoView | null
}

function fmt(n: number) { return 'R ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') }
function fmtDate(iso: string) {
  return iso ? new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}
const STATUS: Record<Row['status'], string> = {
  new: 'bg-amber-100 text-amber-700', invoiced: 'bg-green-100 text-green-700', rejected: 'bg-gray-100 text-gray-500',
}

export default function ConsignmentOrdersPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'new' | 'invoiced' | 'rejected' | 'all'>('new')
  const [busy, setBusy] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  const load = async () => {
    setError('')
    try {
      const res = await fetch('/api/admin/consignment-orders')
      if (!res.ok) throw new Error(`Could not load consignment orders (${res.status})`)
      setRows(await res.json())
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const act = async (row: Row, action: 'invoice' | 'reject' | 'reopen') => {
    if (action === 'invoice' && !window.confirm(`Send ${row.number} (${row.clientName}) to Invoice?\n\nStock already came off when ${row.soNumber} was made — the invoice will not deduct it again.`)) return
    if (action === 'reject' && !window.confirm(`Reject ${row.number}? The qtys go back onto ${row.clientName}'s checklist.`)) return
    setBusy(row.id); setError('')
    try {
      const res = await fetch('/api/admin/consignment-orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      await load()
    } catch (e: any) { setError(e.message) } finally { setBusy(null) }
  }

  const shown = useMemo(() => filter === 'all' ? rows : rows.filter(r => r.status === filter), [rows, filter])
  const counts = useMemo(() => ({
    new: rows.filter(r => r.status === 'new').length,
    invoiced: rows.filter(r => r.status === 'invoiced').length,
    rejected: rows.filter(r => r.status === 'rejected').length,
    all: rows.length,
  }), [rows])

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold">Consignment Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Sold qtys resellers ticked off on their Consignment Checklist. Tick &quot;Consignment stock&quot; on a{' '}
            <Link href="/admin/orders?tab=salesorders" className="text-blue-600 hover:underline">Sales Order</Link> to put it on the client&apos;s checklist.
          </p>
        </div>
        <button onClick={() => { setLoading(true); load() }} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">↻ Refresh</button>
      </div>

      <div className="flex gap-2 mb-4">
        {(['new', 'invoiced', 'rejected', 'all'] as const).map(k => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3 py-1.5 text-sm rounded-lg border font-medium ${filter === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'}`}>
            {k === 'new' ? 'To Invoice' : k[0].toUpperCase() + k.slice(1)} ({counts[k]})
          </button>
        ))}
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      {loading ? <p className="text-gray-400">Loading…</p> : shown.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">No consignment orders here.</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left px-4 py-2">No.</th>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Client</th>
                <th className="text-left px-4 py-2">Sales Order</th>
                <th className="text-right px-4 py-2">Sold Qty</th>
                <th className="text-right px-4 py-2">Value</th>
                <th className="text-center px-4 py-2">Status</th>
                <th className="text-right px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(r => {
                const qty = r.lines.reduce((s, l) => s + l.qty, 0)
                const value = r.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)
                return (
                  <Fragment key={r.id}>
                    <tr className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => setOpen(open === r.id ? null : r.id)}>
                      <td className="px-4 py-2.5 font-mono font-bold text-blue-700">{r.number}</td>
                      <td className="px-4 py-2.5 text-gray-600">{fmtDate(r.createdAt)}</td>
                      <td className="px-4 py-2.5 font-semibold">{r.clientName}<div className="text-xs text-gray-400 font-normal">{r.clientEmail}</div></td>
                      <td className="px-4 py-2.5">
                        <Link href={`/admin/orders?tab=salesorders&open=${encodeURIComponent(r.soNumber)}`} onClick={e => e.stopPropagation()} className="font-mono text-blue-600 hover:underline">{r.soNumber}</Link>
                        {r.so && <div className="text-xs text-gray-400">{r.so.totalSold} of {r.so.totalQty} sold · {r.so.totalRemaining} left</div>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold">{qty}</td>
                      <td className="px-4 py-2.5 text-right">{fmt(value)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS[r.status]}`}>
                          {r.status === 'invoiced' ? `Invoiced ${r.invoiceNumber || ''}` : r.status === 'new' ? 'To Invoice' : 'Rejected'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        {r.status === 'new' && (<>
                          <button disabled={busy === r.id} onClick={() => act(r, 'invoice')}
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                            {busy === r.id ? '…' : 'Send to Invoice'}
                          </button>
                          <button disabled={busy === r.id} onClick={() => act(r, 'reject')}
                            className="ml-2 px-3 py-1 text-xs font-semibold rounded-lg border text-gray-600 hover:bg-gray-100 disabled:opacity-50">Reject</button>
                        </>)}
                        {r.status === 'invoiced' && r.invoiceNumber && (
                          <Link href={`/admin/orders?tab=invoices&open=${encodeURIComponent(r.invoiceNumber)}`} className="text-xs font-semibold text-blue-600 hover:underline">Open {r.invoiceNumber}</Link>
                        )}
                        {r.status === 'rejected' && (
                          <button disabled={busy === r.id} onClick={() => act(r, 'reopen')} className="px-3 py-1 text-xs font-semibold rounded-lg border hover:bg-gray-100">Reopen</button>
                        )}
                      </td>
                    </tr>
                    {open === r.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={8} className="px-6 py-3">
                          <table className="w-full text-xs">
                            <thead className="text-gray-400 uppercase"><tr><th className="text-left py-1">Item</th><th className="text-right py-1">Sold</th><th className="text-right py-1">Unit</th><th className="text-right py-1">Total</th></tr></thead>
                            <tbody>
                              {r.lines.map(l => (
                                <tr key={l.lineId} className="border-t border-gray-200">
                                  <td className="py-1.5">{l.description}</td>
                                  <td className="py-1.5 text-right font-semibold">{l.qty}</td>
                                  <td className="py-1.5 text-right">{fmt(l.unitPrice)}</td>
                                  <td className="py-1.5 text-right">{fmt(l.qty * l.unitPrice)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {r.note && <p className="mt-2 text-xs text-gray-600"><span className="font-semibold">Note from client:</span> {r.note}</p>}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
