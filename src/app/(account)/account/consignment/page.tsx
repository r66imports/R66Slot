'use client'

import { useEffect, useMemo, useState } from 'react'

interface PricedLine { description: string; qty: number; unitPrice: number; netUnit: number; net: number }
interface Line extends PricedLine { lineId: string; reported: number; remaining: number }
interface SoInvoice {
  id: string; docNumber: string; date: string; status: string; discountPct: number
  qty: number; total: number; paid: number; due: number; lines: PricedLine[]
}
interface SalesOrder {
  soId: string; soNumber: string; date: string; clientName: string; sourceQuoteNumber: string; lines: Line[]
  totalQty: number; totalReported: number; totalRemaining: number; sentQty: number; soldQty: number
  discountPct: number; outValue: number; outValueNet: number
  invoicedTotal: number; paid: number; due: number; invoices: SoInvoice[]
}

function Tile({ label, value, sub, tone = 'text-gray-900' }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 truncate" title={label}>{label}</div>
      <div className={`text-base font-bold ${tone}`}>{value}</div>
      {sub && <div className="text-[11px] text-gray-500 truncate" title={sub}>{sub}</div>}
    </div>
  )
}
interface Report { id: string; soNumber: string; status: 'new' | 'invoiced' | 'rejected'; createdAt: string; invoiceNumber?: string; totalQty: number }

function fmtR(n: number) { return 'R ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') }
function fmtDate(iso: string) {
  return iso ? new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

export default function ConsignmentChecklistPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string>('')
  const [sold, setSold] = useState<Record<string, number>>({})
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState('')

  const load = async () => {
    try {
      const res = await fetch('/api/account/consignment')
      if (res.status === 401) { window.location.href = '/account/login'; return }
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Could not load your consignment stock')
      if (d.isReseller !== true) { window.location.href = '/account'; return }
      setOrders(d.salesOrders || [])
      setReports(d.reports || [])
      setSelected(s => s || (d.salesOrders || []).find((o: SalesOrder) => o.totalRemaining > 0)?.soId || '')
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const so = orders.find(o => o.soId === selected)
  const picked = useMemo(() => so ? so.lines.filter(l => (sold[l.lineId] || 0) > 0) : [], [so, sold])
  const pickedQty = picked.reduce((s, l) => s + (sold[l.lineId] || 0), 0)
  const pickedValue = picked.reduce((s, l) => s + (sold[l.lineId] || 0) * l.netUnit, 0)

  const setQty = (l: Line, q: number) => setSold(p => ({ ...p, [l.lineId]: Math.max(0, Math.min(l.remaining, q)) }))

  const submit = async () => {
    if (!so || picked.length === 0) return
    setSending(true); setError(''); setDone('')
    try {
      const res = await fetch('/api/account/consignment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soId: so.soId, note: note.trim() || undefined, lines: picked.map(l => ({ lineId: l.lineId, qty: sold[l.lineId] })) }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Could not send')
      setDone(`✓ Sent — ${pickedQty} item${pickedQty === 1 ? '' : 's'} off ${so.soNumber}. We'll invoice you for these.`)
      setSold({}); setNote('')
      await load()
    } catch (e: any) { setError(e.message) } finally { setSending(false) }
  }

  if (loading) return <div className="bg-white rounded-lg shadow-sm p-8 text-gray-400">Loading…</div>

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold">Consignment Checklist</h2>
        <p className="text-sm text-gray-500 mt-1">Pick a consignment order, tick off the qtys you have sold, and send. We&apos;ll invoice you for what you sold.</p>

        {error && <div className="mt-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
        {done && <div className="mt-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">{done}</div>}

        {orders.length === 0 ? (
          <p className="mt-6 text-gray-400 text-center py-8">You have no consignment stock with us right now.</p>
        ) : (
          <>
            <label className="block mt-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Consignment order</label>
            <select value={selected} onChange={e => { setSelected(e.target.value); setSold({}); setDone('') }}
              className="mt-1 w-full sm:w-96 px-3 py-2 border rounded-lg text-sm">
              <option value="">Select an order…</option>
              {orders.map(o => (
                <option key={o.soId} value={o.soId}>
                  {o.soNumber} · {fmtDate(o.date)} · {o.totalRemaining} of {o.totalQty} left
                </option>
              ))}
            </select>

            {so && (
              <div className="mt-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Tile label="Sent to you" value={`${so.sentQty} units`} sub={so.sourceQuoteNumber ? `${so.sourceQuoteNumber} → ${so.soNumber}` : so.soNumber} />
                  <Tile label="Sold (invoiced)" value={`${so.soldQty} units`} sub={`${so.invoices.length} invoice${so.invoices.length === 1 ? '' : 's'}`} tone="text-green-700" />
                  <Tile label="Still with you" value={`${so.totalQty} units`} sub={so.totalReported > 0 ? `${so.totalReported} sent to us, not yet invoiced` : undefined} />
                  <Tile label="Your discount" value={`${so.discountPct}%`} sub="on the whole order" />
                  <Tile label="Still with you — full price" value={fmtR(so.outValue)} />
                  <Tile label={so.discountPct > 0 ? `Still with you — less ${so.discountPct}%` : 'Still with you — your price'} value={fmtR(so.outValueNet)} />
                  <Tile label="Invoiced to date" value={fmtR(so.invoicedTotal)} sub={`Paid ${fmtR(so.paid)}`} />
                  <Tile label="You owe" value={fmtR(so.due)} tone={so.due > 0.005 ? 'text-red-600' : 'text-green-700'} sub={so.due > 0.005 ? 'on invoices below' : 'all paid up'} />
                </div>
              </div>
            )}

            {so && (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-gray-400 border-b">
                    <tr>
                      <th className="text-left py-2">Item</th>
                      <th className="text-right py-2 px-2">Price</th>
                      {so.discountPct > 0 && <th className="text-right py-2 px-2">Less {so.discountPct}%</th>}
                      <th className="text-right py-2 px-2">With you</th>
                      <th className="text-right py-2 px-2">Reported</th>
                      <th className="text-right py-2 px-2">Left</th>
                      <th className="text-center py-2 px-2">Sold now</th>
                    </tr>
                  </thead>
                  <tbody>
                    {so.lines.map(l => {
                      const q = sold[l.lineId] || 0
                      const full = l.remaining === 0
                      return (
                        <tr key={l.lineId} className={`border-b last:border-0 ${q > 0 ? 'bg-green-50' : ''} ${full ? 'opacity-50' : ''}`}>
                          <td className="py-2.5 pr-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" disabled={full} checked={q > 0}
                                onChange={e => setQty(l, e.target.checked ? 1 : 0)} className="w-4 h-4 accent-green-600" />
                              <span>{l.description}</span>
                            </label>
                          </td>
                          <td className="py-2.5 px-2 text-right text-gray-500 whitespace-nowrap">{fmtR(l.unitPrice)}</td>
                          {so.discountPct > 0 && <td className="py-2.5 px-2 text-right whitespace-nowrap">{fmtR(l.netUnit)}</td>}
                          <td className="py-2.5 px-2 text-right">{l.qty}</td>
                          <td className="py-2.5 px-2 text-right text-gray-500">{l.reported}</td>
                          <td className="py-2.5 px-2 text-right font-semibold">{l.remaining}</td>
                          <td className="py-2.5 px-2">
                            {full ? <div className="text-center text-xs text-green-600 font-semibold">All reported</div> : (
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => setQty(l, q - 1)} disabled={q === 0} className="w-7 h-7 rounded border hover:bg-gray-100 disabled:opacity-30">−</button>
                                <span className="w-8 text-center font-bold">{q}</span>
                                <button onClick={() => setQty(l, q + 1)} disabled={q >= l.remaining} className="w-7 h-7 rounded border hover:bg-gray-100 disabled:opacity-30">+</button>
                                <button onClick={() => setQty(l, l.remaining)} disabled={q >= l.remaining} className="ml-1 px-2 h-7 text-xs rounded border hover:bg-gray-100 disabled:opacity-30">All</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" rows={2}
                  className="mt-4 w-full px-3 py-2 border rounded-lg text-sm" />

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-gray-600">{pickedQty} item{pickedQty === 1 ? '' : 's'} ticked · {fmtR(pickedValue)}</p>
                  <button onClick={submit} disabled={sending || pickedQty === 0}
                    className="px-5 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-40">
                    {sending ? 'Sending…' : 'Send sold qtys'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {so && so.invoices.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-bold mb-1">Invoiced from {so.soNumber}</h3>
          <p className="text-xs text-gray-500 mb-3">Each batch you sell is invoiced on its own new invoice.</p>
          <div className="space-y-5">
            {so.invoices.map(inv => (
              <div key={inv.id}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-mono font-bold">{inv.docNumber} <span className="font-sans font-normal text-gray-500">· {fmtDate(inv.date)} · {inv.qty} item{inv.qty === 1 ? '' : 's'}</span></span>
                  <span>
                    Total <b>{fmtR(inv.total)}</b> · Paid <span className="text-green-700 font-semibold">{fmtR(inv.paid)}</span> · {inv.due > 0.005
                      ? <span className="text-red-600 font-bold">Due {fmtR(inv.due)}</span>
                      : <span className="text-green-700 font-bold">Paid up</span>}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs mt-2">
                    <thead className="text-gray-400 uppercase border-b">
                      <tr>
                        <th className="text-left py-1">Item</th>
                        <th className="text-right py-1 px-2">Qty</th>
                        <th className="text-right py-1 px-2">Price</th>
                        {inv.discountPct > 0 && <th className="text-right py-1 px-2">Less {inv.discountPct}%</th>}
                        <th className="text-right py-1">Line</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inv.lines.map((l, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-1.5 pr-2">{l.description}</td>
                          <td className="py-1.5 px-2 text-right font-semibold">{l.qty}</td>
                          <td className="py-1.5 px-2 text-right text-gray-500 whitespace-nowrap">{fmtR(l.unitPrice)}</td>
                          {inv.discountPct > 0 && <td className="py-1.5 px-2 text-right whitespace-nowrap">{fmtR(l.netUnit)}</td>}
                          <td className="py-1.5 text-right font-semibold whitespace-nowrap">{fmtR(l.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reports.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-bold mb-3">Sent so far</h3>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-gray-400 border-b">
              <tr><th className="text-left py-2">Date</th><th className="text-left py-2">Order</th><th className="text-right py-2">Qty</th><th className="text-right py-2">Status</th></tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 text-gray-500">{fmtDate(r.createdAt)}</td>
                  <td className="py-2 font-mono">{r.soNumber}</td>
                  <td className="py-2 text-right">{r.totalQty}</td>
                  <td className="py-2 text-right">
                    {r.status === 'invoiced' ? <span className="text-green-600 font-semibold">Invoiced {r.invoiceNumber}</span>
                      : r.status === 'rejected' ? <span className="text-gray-400">Returned to your list</span>
                      : <span className="text-amber-600 font-semibold">Received</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
