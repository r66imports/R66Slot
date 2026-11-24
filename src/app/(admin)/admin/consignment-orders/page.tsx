'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

interface Line { lineId: string; description: string; qty: number; unitPrice: number }
interface Report {
  id: string; soId: string; soNumber: string
  clientName: string; clientEmail: string; lines: Line[]; note?: string
  status: 'new' | 'invoiced' | 'rejected'; invoiceNumber?: string
  createdAt: string; invoicedAt?: string
}
interface PricedLine {
  description: string; sku: string; qty: number; unitPrice: number; netUnit: number; net: number
  landed: number; costIssue: 'missing' | 'suspect' | null; profit: number | null
}
interface Block { net: number; costedNet: number; landed: number; profit: number; marginPct: number | null; uncostedNet: number; uncostedCount: number }
interface SoInvoice {
  id: string; docNumber: string; date: string; status: string; discountPct: number; qty: number
  lines: PricedLine[]; total: number; paid: number; due: number
}
interface StockSO {
  soId: string; soNumber: string; date: string; clientName: string; clientEmail: string; sourceQuoteNumber: string
  lines: (PricedLine & { lineId: string; reported: number; remaining: number })[]
  totalQty: number; totalReported: number; sentQty: number; soldQty: number
  discountPct: number; discountSource: string; outValue: number; outValueNet: number
  invoicedTotal: number; paid: number; due: number
  sold: Block; out: Block; whole: Block
  uncosted: { sku: string; landed: number; issue: 'missing' | 'suspect' }[]
  invoices: SoInvoice[]
}

function fmt(n: number) { return 'R ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') }
function fmtDate(iso: string) {
  return iso ? new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}
const docLink = (tab: string, num: string) => `/admin/orders?tab=${tab}&open=${encodeURIComponent(num)}`
const STATUS: Record<Report['status'], string> = {
  new: 'bg-amber-100 text-amber-700', invoiced: 'bg-green-100 text-green-700', rejected: 'bg-gray-100 text-gray-500',
}

function Chip({ href, label, tone }: { href?: string; label: string; tone: string }) {
  const cls = `inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold ${tone}`
  return href ? <Link href={href} onClick={e => e.stopPropagation()} className={`${cls} hover:underline`}>{label}</Link> : <span className={cls}>{label}</span>
}
const Arrow = () => <span className="text-gray-400 text-xs">→</span>

function Tile({ label, value, sub, tone = 'text-gray-900' }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 min-w-[120px]">
      <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`text-sm font-bold ${tone}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-500">{sub}</div>}
    </div>
  )
}
const pct = (n: number | null) => n === null ? '—' : `${n.toFixed(1)}%`
const profitTone = (n: number) => n < 0 ? 'text-red-600' : 'text-green-700'

/** One priced table — Item / Qty / Price / After discount / Line / Landed / Profit. */
function PricedTable({ lines, discountPct, qtyLabel, extra }: {
  lines: (PricedLine & { reported?: number })[]; discountPct: number; qtyLabel: string; extra?: boolean
}) {
  return (
    <table className="w-full text-xs">
      <thead className="text-gray-400 uppercase">
        <tr>
          <th className="text-left py-1">Item</th>
          <th className="text-right py-1">{qtyLabel}</th>
          {extra && <th className="text-right py-1">Reported</th>}
          <th className="text-right py-1">Price</th>
          <th className="text-right py-1">{discountPct > 0 ? `Less ${discountPct}%` : 'Net'}</th>
          <th className="text-right py-1">Line</th>
          <th className="text-right py-1">Landed</th>
          <th className="text-right py-1">Profit</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l, i) => (
          <tr key={i} className="border-t border-gray-200">
            <td className="py-1.5">{l.description}</td>
            <td className="py-1.5 text-right font-semibold">{l.qty}</td>
            {extra && <td className="py-1.5 text-right">{l.reported || ''}</td>}
            <td className="py-1.5 text-right text-gray-500">{fmt(l.unitPrice)}</td>
            <td className="py-1.5 text-right">{fmt(l.netUnit)}</td>
            <td className="py-1.5 text-right font-semibold">{fmt(l.net)}</td>
            <td className="py-1.5 text-right">
              {l.costIssue
                ? <span className="text-amber-700 font-semibold" title={l.costIssue === 'missing' ? 'No landed cost on the product' : 'Landed cost under 15% of the price, likely a foreign price saved as Rand'}>{l.costIssue === 'missing' ? 'no cost' : `${fmt(l.landed)} ?`}</span>
                : fmt(l.landed)}
            </td>
            <td className={`py-1.5 text-right font-semibold ${l.profit === null ? 'text-gray-300' : profitTone(l.profit)}`}>{l.profit === null ? '—' : fmt(l.profit)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function ConsignmentOrdersPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [stock, setStock] = useState<StockSO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'new' | 'invoiced' | 'rejected' | 'all'>('new')
  const [busy, setBusy] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [openSO, setOpenSO] = useState<string | null>(null)

  const load = async () => {
    setError('')
    try {
      const [r, s] = await Promise.all([
        fetch('/api/admin/consignment-orders'),
        fetch('/api/admin/consignment-orders?view=stock'),
      ])
      if (!r.ok) throw new Error(`Could not load reported sales (${r.status})`)
      if (!s.ok) throw new Error(`Could not load consignment stock (${s.status})`)
      setReports(await r.json())
      setStock(await s.json())
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const act = async (row: Report, action: 'invoice' | 'reject' | 'reopen') => {
    if (action === 'invoice' && !window.confirm(`Send ${row.clientName}'s sold qtys to Invoice?\n\nThe sold qtys come off ${row.soNumber} onto a NEW invoice, which takes their stock over from the Sales Order — nothing is deducted twice.`)) return
    if (action === 'reject' && !window.confirm(`Reject this report? The qtys go back onto ${row.clientName}'s checklist.`)) return
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

  const shown = useMemo(() => filter === 'all' ? reports : reports.filter(r => r.status === filter), [reports, filter])
  const counts = useMemo(() => ({
    new: reports.filter(r => r.status === 'new').length,
    invoiced: reports.filter(r => r.status === 'invoiced').length,
    rejected: reports.filter(r => r.status === 'rejected').length,
    all: reports.length,
  }), [reports])

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold">Consignment Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            The <Link href="/admin/orders?tab=salesorders" className="text-blue-600 hover:underline">Sales Order</Link> is the consignment: tick &quot;Consignment stock&quot; on it.
            What sells comes off the Sales Order onto an invoice, so the SO always shows what is still out.
          </p>
        </div>
        <button onClick={() => { setLoading(true); load() }} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">↻ Refresh</button>
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      {/* Out on Consignment — every ticked Sales Order with its Quote → SO → Invoice chain. */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-1">Out on Consignment</h2>
        <p className="text-xs text-gray-500 mb-3">Sent = still out + sold. Sold = the invoices raised from the Sales Order. The first invoice&apos;s discount applies to the whole order. Profit uses the LATEST landed cost (product cost, kept current by the Worksheet). Click a card for the lines.</p>
        {loading ? <p className="text-gray-400">Loading…</p> : stock.length === 0 ? (
          <div className="bg-white rounded-xl border p-6 text-center text-gray-400 text-sm">No Sales Orders are ticked as consignment.</div>
        ) : (
          <div className="space-y-3">
            {stock.map(so => {
              const isOpen = openSO === so.soId
              return (
                <div key={so.soId} className="bg-white rounded-xl border overflow-hidden">
                  <div className="px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={() => setOpenSO(isOpen ? null : so.soId)}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{so.clientName}</div>
                        <div className="text-xs text-gray-400">{so.clientEmail}</div>
                      </div>
                      <div className="flex gap-5 text-sm">
                        <div className="text-right"><div className="text-[10px] uppercase text-gray-400">Sent</div><div className="font-semibold">{so.sentQty}</div></div>
                        <div className="text-right"><div className="text-[10px] uppercase text-gray-400">Sold</div><div className="font-semibold text-green-700">{so.soldQty}</div></div>
                        <div className="text-right"><div className="text-[10px] uppercase text-gray-400">Still Out</div><div className="font-bold">{so.totalQty}</div></div>
                        <div className="text-right"><div className="text-[10px] uppercase text-gray-400">Value Out{so.discountPct > 0 ? ` (less ${so.discountPct}%)` : ''}</div><div className="font-semibold">{fmt(so.outValueNet)}</div></div>
                        <div className="text-right"><div className="text-[10px] uppercase text-gray-400">Due</div><div className={`font-bold ${so.due > 0.005 ? 'text-red-600' : 'text-green-700'}`}>{fmt(so.due)}</div></div>
                      </div>
                    </div>
                    {/* Document flow: Quote → Sales Order → Invoice(s) → next sale on a new invoice */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {so.sourceQuoteNumber && (<><Chip href={docLink('quotes', so.sourceQuoteNumber)} label={so.sourceQuoteNumber} tone="bg-blue-50 text-blue-700" /><Arrow /></>)}
                      <Chip href={docLink('salesorders', so.soNumber)} label={so.soNumber} tone="bg-purple-50 text-purple-700" />
                      {so.invoices.map(inv => (
                        <Fragment key={inv.id}><Arrow /><Chip href={docLink('invoices', inv.docNumber)} label={`${inv.docNumber} · ${inv.qty} sold`} tone="bg-green-50 text-green-700" /></Fragment>
                      ))}
                      <Arrow />
                      <span className="text-xs text-gray-500 italic">next sale → new invoice</span>
                    </div>
                    {so.totalReported > 0 && (
                      <div className="mt-1.5 text-xs font-semibold text-amber-700">{so.totalReported} reported sold, waiting to be invoiced below</div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Tile label="Order discount" value={`${so.discountPct}%`} sub={`set by ${so.discountSource} · whole order`} />
                      <Tile label="Out — full price" value={fmt(so.outValue)} sub={`${so.totalQty} units`} />
                      <Tile label={`Out — less ${so.discountPct}%`} value={fmt(so.outValueNet)} />
                      <Tile label="Invoiced" value={fmt(so.invoicedTotal)} sub={`${so.invoices.length} invoice${so.invoices.length === 1 ? '' : 's'}`} />
                      <Tile label="Paid" value={fmt(so.paid)} tone="text-green-700" />
                      <Tile label="Due" value={fmt(so.due)} tone={so.due > 0.005 ? 'text-red-600' : 'text-green-700'} />
                      <Tile label="Profit — sold" value={fmt(so.sold.profit)} sub={`${pct(so.sold.marginPct)} on costed lines`} tone={profitTone(so.sold.profit)} />
                      <Tile label="Profit — if out sells" value={fmt(so.out.profit)} sub={`${pct(so.out.marginPct)} on costed lines`} tone={profitTone(so.out.profit)} />
                      <Tile label="Profit — whole order" value={fmt(so.whole.profit)} sub={`${pct(so.whole.marginPct)} · landed ${fmt(so.whole.landed)}`} tone={profitTone(so.whole.profit)} />
                    </div>
                    {so.uncosted.length > 0 && (
                      <div className="mt-2 text-[11px] text-amber-700">
                        Profit covers costed lines only — {fmt(so.whole.uncostedNet)} of {fmt(so.whole.net)} has no reliable landed cost ({so.uncosted.length} SKU{so.uncosted.length === 1 ? '' : 's'}): {so.uncosted.map(u => `${u.sku} (${u.issue === 'missing' ? 'no cost' : `${fmt(u.landed)} suspect`})`).join(', ')}.
                      </div>
                    )}
                  </div>
                  {isOpen && (
                    <div className="border-t bg-gray-50 px-6 py-3 space-y-4">
                      <div>
                        <div className="text-xs font-bold text-gray-500 uppercase mb-1">Still out on {so.soNumber} — at the order discount</div>
                        <PricedTable lines={so.lines} discountPct={so.discountPct} qtyLabel="Out" extra />
                        <div className="mt-1 text-right text-xs text-gray-600">Out {fmt(so.out.net)} · landed {fmt(so.out.landed)} · profit <span className={`font-bold ${profitTone(so.out.profit)}`}>{fmt(so.out.profit)}</span> ({pct(so.out.marginPct)})</div>
                      </div>
                      {so.invoices.map(inv => (
                        <div key={inv.id}>
                          <div className="text-xs font-bold text-green-700 uppercase mb-1">
                            Sold — <Link href={docLink('invoices', inv.docNumber)} className="hover:underline">{inv.docNumber}</Link> · {fmtDate(inv.date)} · {inv.status} · discount {inv.discountPct}%
                          </div>
                          <PricedTable lines={inv.lines} discountPct={inv.discountPct} qtyLabel="Sold" />
                          <div className="mt-1 text-right text-xs text-gray-600">
                            Total {fmt(inv.total)} · paid <span className="text-green-700 font-semibold">{fmt(inv.paid)}</span> · due <span className={`font-bold ${inv.due > 0.005 ? 'text-red-600' : 'text-green-700'}`}>{fmt(inv.due)}</span>
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-gray-500">Each new batch of sold qtys from {so.soNumber} is raised on a new invoice — it is never added to an earlier one.</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <h2 className="text-lg font-bold mb-3">Sold Qtys Reported by Clients</h2>
      <div className="flex gap-2 mb-4">
        {(['new', 'invoiced', 'rejected', 'all'] as const).map(k => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3 py-1.5 text-sm rounded-lg border font-medium ${filter === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'}`}>
            {k === 'new' ? 'To Invoice' : k[0].toUpperCase() + k.slice(1)} ({counts[k]})
          </button>
        ))}
      </div>

      {loading ? <p className="text-gray-400">Loading…</p> : shown.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">Nothing here.</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left px-4 py-2">Sales Order</th>
                <th className="text-left px-4 py-2">Reported</th>
                <th className="text-left px-4 py-2">Client</th>
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
                      <td className="px-4 py-2.5"><Chip href={docLink('salesorders', r.soNumber)} label={r.soNumber} tone="bg-purple-50 text-purple-700" /></td>
                      <td className="px-4 py-2.5 text-gray-600">{fmtDate(r.createdAt)}</td>
                      <td className="px-4 py-2.5 font-semibold">{r.clientName}<div className="text-xs text-gray-400 font-normal">{r.clientEmail}</div></td>
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
                            {busy === r.id ? '…' : 'Send to New Invoice'}
                          </button>
                          <button disabled={busy === r.id} onClick={() => act(r, 'reject')}
                            className="ml-2 px-3 py-1 text-xs font-semibold rounded-lg border text-gray-600 hover:bg-gray-100 disabled:opacity-50">Reject</button>
                        </>)}
                        {r.status === 'invoiced' && r.invoiceNumber && (
                          <Link href={docLink('invoices', r.invoiceNumber)} className="text-xs font-semibold text-blue-600 hover:underline">Open {r.invoiceNumber}</Link>
                        )}
                        {r.status === 'rejected' && (
                          <button disabled={busy === r.id} onClick={() => act(r, 'reopen')} className="px-3 py-1 text-xs font-semibold rounded-lg border hover:bg-gray-100">Reopen</button>
                        )}
                      </td>
                    </tr>
                    {open === r.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-6 py-3">
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
