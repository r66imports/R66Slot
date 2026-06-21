'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import React from 'react'

type LineItem = { qty: number; unitPrice: number }

type Invoice = {
  id: string
  docNumber: string
  date: string
  clientName: string
  clientEmail?: string
  lineItems: LineItem[]
  discountPct?: number
  shippingCost?: number
  depositPaid?: number
  amountPaid?: number
  creditApplied?: number
  overpaymentCredit?: number
  paymentMethod?: string
  paymentMethod2?: string
  paymentMethod1Amount?: number
  paymentMethod2Amount?: number
  status?: string
  type: string
}

type CreditTransaction = {
  id: string
  type: string
  invoiceNumber: string
  amount: number
  notes?: string
  date: string
}

type ClientCreditRecord = {
  clientName: string
  balance: number
  transactions: CreditTransaction[]
}

type CreditStore = Record<string, ClientCreditRecord>

type SortField = 'date' | 'docNumber' | 'clientName' | 'total' | 'depositPaid' | 'amountPaid' | 'creditApplied' | 'totalSettled' | 'balanceDue'

const PAYMENT_METHODS = ['', 'EFT', 'Cash', 'Card', 'Snapscan', 'PayFast', 'Yoco', 'Other']

function fmtPrice(n: number): string {
  return `R ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`
}

function fmtDate(d: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}

function invoiceTotal(doc: Invoice): number {
  const sub = doc.lineItems.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const disc = sub * (doc.discountPct || 0) / 100
  return sub - disc + (doc.shippingCost || 0)
}

function totalSettled(doc: Invoice): number {
  return (doc.amountPaid || 0) + (doc.creditApplied || 0) + (doc.depositPaid || 0)
}

function balanceDue(doc: Invoice): number {
  return Math.max(0, invoiceTotal(doc) - totalSettled(doc))
}

export default function CustomerPaymentsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [credits, setCredits] = useState<CreditStore>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'payments' | 'credits' | 'statements'>('payments')

  // Payments tab state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Credits tab state
  const [creditSort, setCreditSort] = useState<'clientName' | 'balance'>('balance')
  const [creditSortDir, setCreditSortDir] = useState<'asc' | 'desc'>('desc')
  const [expandedClient, setExpandedClient] = useState<string | null>(null)

  // Statements tab state
  const [stmtSearch, setStmtSearch] = useState('')
  const [stmtEmailing, setStmtEmailing] = useState<string | null>(null) // clientName being emailed
  const [stmtEmailAddr, setStmtEmailAddr] = useState('')
  const [stmtEmailPrompt, setStmtEmailPrompt] = useState<string | null>(null) // clientName to confirm email for

  // Edit modal state
  const [editDoc, setEditDoc] = useState<Invoice | null>(null)
  const [editForm, setEditForm] = useState({
    amountPaid: '',
    creditApplied: '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [docsRes, creditsRes] = await Promise.all([
        fetch('/api/admin/orders/documents?type=invoice'),
        fetch('/api/admin/customer-credits'),
      ])
      const docs = docsRes.ok ? await docsRes.json() : []
      const creds = creditsRes.ok ? await creditsRes.json() : {}
      setInvoices(Array.isArray(docs) ? docs : [])
      setCredits(creds || {})
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openEdit = (doc: Invoice) => {
    setSaveError('')
    setEditDoc(doc)
    setEditForm({
      amountPaid: doc.amountPaid != null && doc.amountPaid > 0 ? String(doc.amountPaid) : '',
      creditApplied: doc.creditApplied != null && doc.creditApplied > 0 ? String(doc.creditApplied) : '',
    })
  }

  const handleSaveEdit = async () => {
    if (!editDoc) return
    setSaving(true)
    setSaveError('')
    try {
      const newAmtPaid = parseFloat(editForm.amountPaid) || 0
      const newCredit = parseFloat(editForm.creditApplied) || 0

      const patchRes = await fetch(`/api/admin/orders/documents/${editDoc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountPaid: Math.round(newAmtPaid * 100) / 100,
          creditApplied: Math.round(newCredit * 100) / 100,
          payments: [],
        }),
      })

      if (!patchRes.ok) {
        setSaveError('Failed to save — please try again')
        return
      }

      // Adjust credit store by delta
      const prevCredit = editDoc.creditApplied || 0
      const delta = newCredit - prevCredit
      if (Math.abs(delta) > 0.005) {
        await fetch('/api/admin/customer-credits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'record_payment',
            clientName: editDoc.clientName,
            invoiceNumber: editDoc.docNumber,
            amountPaid: 0,
            creditApplied: delta > 0 ? delta : 0,
            overpayment: delta < 0 ? -delta : 0,
          }),
        }).catch(() => {})
      }

      setEditDoc(null)
      await load()
    } catch {
      setSaveError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePayment = async (doc: Invoice) => {
    if (!confirm(`Clear all payment data for ${doc.docNumber} (${doc.clientName})?\n\nThis will remove the recorded payment. The invoice itself stays intact.`)) return
    setDeletingId(doc.id)
    try {
      const prevCredit = doc.creditApplied || 0
      await fetch(`/api/admin/orders/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountPaid: 0,
          paymentMethod: '',
          paymentMethod2: '',
          paymentMethod1Amount: 0,
          paymentMethod2Amount: 0,
          creditApplied: 0,
          overpaymentCredit: 0,
          payments: [],
        }),
      })
      // Return any previously applied credit back to the customer's balance
      if (prevCredit > 0.005) {
        await fetch('/api/admin/customer-credits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'record_payment',
            clientName: doc.clientName,
            invoiceNumber: doc.docNumber,
            amountPaid: 0,
            creditApplied: 0,
            overpayment: prevCredit,
          }),
        }).catch(() => {})
      }
      await load()
    } catch {}
    setDeletingId(null)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const handleCreditSort = (field: 'clientName' | 'balance') => {
    if (creditSort === field) setCreditSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setCreditSort(field); setCreditSortDir('desc') }
  }

  const filteredInvoices = useMemo(() => {
    let rows = [...invoices]

    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(d =>
        d.docNumber?.toLowerCase().includes(q) ||
        d.clientName?.toLowerCase().includes(q) ||
        d.paymentMethod?.toLowerCase().includes(q) ||
        d.paymentMethod2?.toLowerCase().includes(q)
      )
    }

    if (statusFilter !== 'all') {
      rows = rows.filter(d => {
        const bal = balanceDue(d)
        const settled = totalSettled(d)
        if (statusFilter === 'paid') return bal <= 0.005
        if (statusFilter === 'partial') return settled > 0.005 && bal > 0.005
        if (statusFilter === 'outstanding') return settled <= 0.005 && bal > 0.005
        return true
      })
    }

    rows.sort((a, b) => {
      let av: string | number
      let bv: string | number
      switch (sortField) {
        case 'date': av = a.date || ''; bv = b.date || ''; break
        case 'docNumber': av = a.docNumber || ''; bv = b.docNumber || ''; break
        case 'clientName': av = a.clientName || ''; bv = b.clientName || ''; break
        case 'total': av = invoiceTotal(a); bv = invoiceTotal(b); break
        case 'depositPaid': av = a.depositPaid || 0; bv = b.depositPaid || 0; break
        case 'amountPaid': av = a.amountPaid || 0; bv = b.amountPaid || 0; break
        case 'creditApplied': av = a.creditApplied || 0; bv = b.creditApplied || 0; break
        case 'totalSettled': av = totalSettled(a); bv = totalSettled(b); break
        case 'balanceDue': av = balanceDue(a); bv = balanceDue(b); break
        default: av = ''; bv = ''
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return rows
  }, [invoices, search, statusFilter, sortField, sortDir])

  const sortedCredits = useMemo(() => {
    return Object.values(credits).sort((a, b) => {
      const av = creditSort === 'balance' ? a.balance : a.clientName.toLowerCase()
      const bv = creditSort === 'balance' ? b.balance : b.clientName.toLowerCase()
      if (av < bv) return creditSortDir === 'asc' ? -1 : 1
      if (av > bv) return creditSortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [credits, creditSort, creditSortDir])

  const stats = useMemo(() => {
    const totalInvoiced = invoices.reduce((s, d) => s + invoiceTotal(d), 0)
    const totalPaid = invoices.reduce((s, d) => s + totalSettled(d), 0)
    const totalOutstanding = invoices.reduce((s, d) => s + balanceDue(d), 0)
    const totalCredits = Object.values(credits).reduce((s, c) => s + c.balance, 0)
    return { totalInvoiced, totalPaid, totalOutstanding, totalCredits }
  }, [invoices, credits])

  const clientSummaries = useMemo(() => {
    const map = new Map<string, { invoices: Invoice[]; email: string }>()
    for (const inv of invoices) {
      if (!map.has(inv.clientName)) map.set(inv.clientName, { invoices: [], email: inv.clientEmail || '' })
      const entry = map.get(inv.clientName)!
      entry.invoices.push(inv)
      if (!entry.email && inv.clientEmail) entry.email = inv.clientEmail
    }
    return Array.from(map.entries())
      .map(([name, { invoices: invs, email }]) => ({
        clientName: name,
        email,
        count: invs.length,
        totalInvoiced: invs.reduce((s, d) => s + invoiceTotal(d), 0),
        totalSettledAmt: invs.reduce((s, d) => s + totalSettled(d), 0),
        totalOutstanding: invs.reduce((s, d) => s + balanceDue(d), 0),
        creditBalance: credits[name.toLowerCase().replace(/\s+/g, '_')]?.balance || 0,
        invoiceList: invs.sort((a, b) => a.date.localeCompare(b.date)),
      }))
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding)
  }, [invoices, credits])

  const filteredClientSummaries = useMemo(() =>
    stmtSearch.trim()
      ? clientSummaries.filter(c => c.clientName.toLowerCase().includes(stmtSearch.toLowerCase()))
      : clientSummaries,
    [clientSummaries, stmtSearch]
  )

  function generateStatementHTML(clientName: string): string {
    const sum = clientSummaries.find(c => c.clientName === clientName)
    if (!sum) return ''
    const today = new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })
    const rows = sum.invoiceList.map(d => {
      const tot = invoiceTotal(d)
      const settled = totalSettled(d)
      const bal = balanceDue(d)
      const isPaid = bal <= 0.005
      const isPartial = settled > 0.005 && !isPaid
      return `<tr style="background:${isPaid ? '#f0fdf4' : isPartial ? '#fff7ed' : '#fff'}">
        <td style="padding:7px 10px;border-bottom:1px solid #e5e5e5">${fmtDate(d.date)}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e5e5;font-family:monospace;font-weight:700">${d.docNumber}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e5e5;text-align:right">${fmtPrice(tot)}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e5e5;text-align:right">${(d.depositPaid || 0) > 0 ? fmtPrice(d.depositPaid!) : '—'}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e5e5;text-align:right;color:#15803d">${(d.amountPaid || 0) > 0 ? fmtPrice(d.amountPaid!) : '—'}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e5e5;text-align:right;color:#2563eb">${(d.creditApplied || 0) > 0 ? fmtPrice(d.creditApplied!) : '—'}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:700;color:${isPaid ? '#15803d' : bal > 0 ? '#c0392b' : '#374151'}">${isPaid ? '✓ Paid' : fmtPrice(bal)}</td>
      </tr>`
    }).join('')
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Statement — ${clientName}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;padding:32px;max-width:900px;margin:0 auto}@media print{body{padding:12px}}</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;border-bottom:2px solid #1a1a1a;padding-bottom:16px">
  <div><div style="font-size:22px;font-weight:900;letter-spacing:1px">R66SLOT</div><div style="font-size:11px;color:#666;margin-top:2px">Route 66 Imports (Pty) Ltd · Your Slot Car Specialists</div></div>
  <div style="text-align:right"><div style="font-size:18px;font-weight:700;color:#c0392b">STATEMENT OF ACCOUNT</div><div style="font-size:11px;color:#666;margin-top:4px">Generated: ${today}</div></div>
</div>
<div style="margin-bottom:20px"><div style="font-size:15px;font-weight:700">${clientName}</div><div style="color:#666;font-size:11px;margin-top:2px">Account Statement — All Invoices</div></div>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px">
  <thead><tr style="background:#1a1a1a;color:#fff">
    <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase">Date</th>
    <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase">Invoice #</th>
    <th style="padding:8px 10px;text-align:right;font-size:11px;text-transform:uppercase">Total</th>
    <th style="padding:8px 10px;text-align:right;font-size:11px;text-transform:uppercase">Deposit</th>
    <th style="padding:8px 10px;text-align:right;font-size:11px;text-transform:uppercase">Paid</th>
    <th style="padding:8px 10px;text-align:right;font-size:11px;text-transform:uppercase">Credit</th>
    <th style="padding:8px 10px;text-align:right;font-size:11px;text-transform:uppercase">Balance</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr style="border-top:2px solid #1a1a1a;font-weight:700">
    <td colspan="2" style="padding:10px 10px">TOTALS</td>
    <td style="padding:10px 10px;text-align:right">${fmtPrice(sum.totalInvoiced)}</td>
    <td></td>
    <td style="padding:10px 10px;text-align:right;color:#15803d">${fmtPrice(sum.totalSettledAmt)}</td>
    <td></td>
    <td style="padding:10px 10px;text-align:right;font-weight:700;color:${sum.totalOutstanding > 0.005 ? '#c0392b' : '#15803d'}">${sum.totalOutstanding > 0.005 ? fmtPrice(sum.totalOutstanding) : '✓ CLEAR'}</td>
  </tr></tfoot>
</table>
<div style="border:1px solid #e5e5e5;border-radius:8px;padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px">
  <div>
    <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f0f0f0"><span>Total Invoiced</span><span>${fmtPrice(sum.totalInvoiced)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f0f0f0"><span>Total Settled</span><span>${fmtPrice(sum.totalSettledAmt)}</span></div>
    ${sum.creditBalance > 0.005 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;color:#15803d"><span>Credit Balance</span><span>${fmtPrice(sum.creditBalance)}</span></div>` : ''}
  </div>
  <div style="display:flex;align-items:center;justify-content:center">
    <div style="text-align:center;padding:16px;border-radius:8px;background:${sum.totalOutstanding > 0.005 ? '#fef2f2' : '#f0fdf4'};border:2px solid ${sum.totalOutstanding > 0.005 ? '#fca5a5' : '#86efac'}">
      <div style="font-size:11px;text-transform:uppercase;font-weight:700;color:${sum.totalOutstanding > 0.005 ? '#c0392b' : '#15803d'};margin-bottom:4px">${sum.totalOutstanding > 0.005 ? 'Amount Due' : 'All Clear'}</div>
      <div style="font-size:22px;font-weight:900;color:${sum.totalOutstanding > 0.005 ? '#c0392b' : '#15803d'}">${sum.totalOutstanding > 0.005 ? fmtPrice(sum.totalOutstanding) : '✓'}</div>
    </div>
  </div>
</div>
<div style="border-top:1px solid #e5e5e5;padding-top:12px;text-align:center;color:#999;font-size:10px">
  Generated ${today} · Route 66 Imports (Pty) Ltd · r66slot.co.za · VAT 4310297884
</div>
</body></html>`
  }

  function handleDownloadStatement(clientName: string) {
    const html = generateStatementHTML(clientName)
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  async function handleEmailStatement(clientName: string, email: string) {
    if (!email) return
    setStmtEmailing(clientName)
    const html = generateStatementHTML(clientName)
    const sum = clientSummaries.find(c => c.clientName === clientName)
    const subject = `Statement of Account — ${clientName}`
    try {
      const res = await fetch('/api/admin/send-document', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, subject, html, documentType: 'Statement' }),
      })
      const result = await res.json()
      if (result.success) alert(`✓ Statement emailed to ${email}`)
      else alert(`Failed to send: ${result.error || 'Unknown error'}`)
    } catch { alert('Network error — could not send email') }
    setStmtEmailing(null)
    setStmtEmailPrompt(null)
  }

  const SortBtn = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="px-3 py-2.5 text-left font-semibold cursor-pointer hover:bg-gray-700 select-none whitespace-nowrap"
      onClick={() => handleSort(field)}
    >
      {label}
      <span className={`ml-1 ${sortField === field ? 'opacity-100' : 'opacity-30'}`}>
        {sortField === field && sortDir === 'asc' ? '↑' : '↓'}
      </span>
    </th>
  )

  const CreditSortBtn = ({ field, label, right }: { field: 'clientName' | 'balance'; label: string; right?: boolean }) => (
    <th
      className={`px-3 py-2.5 font-semibold cursor-pointer hover:bg-gray-700 select-none ${right ? 'text-right' : 'text-left'}`}
      onClick={() => handleCreditSort(field)}
    >
      {label}
      <span className={`ml-1 ${creditSort === field ? 'opacity-100' : 'opacity-30'}`}>
        {creditSort === field && creditSortDir === 'asc' ? '↑' : '↓'}
      </span>
    </th>
  )

  // Live balance preview for edit modal
  const editPreview = useMemo(() => {
    if (!editDoc) return null
    const total = invoiceTotal(editDoc)
    const deposit = editDoc.depositPaid || 0
    const newAmtPaid = parseFloat(editForm.amountPaid) || 0
    const newCredit = parseFloat(editForm.creditApplied) || 0
    const settled = newAmtPaid + newCredit + deposit
    const balance = Math.max(0, total - settled)
    return { total, deposit, newAmtPaid, newCredit, settled, balance }
  }, [editDoc, editForm.amountPaid, editForm.creditApplied])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading payments…</div>
  )

  return (
    <div className="max-w-[1500px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Customer Payments</h1>
        <button onClick={() => load()} className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium">
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoiced', value: fmtPrice(stats.totalInvoiced), bg: 'bg-gray-800', text: 'text-white' },
          { label: 'Total Settled', value: fmtPrice(stats.totalPaid), bg: 'bg-green-700', text: 'text-white' },
          { label: 'Outstanding', value: fmtPrice(stats.totalOutstanding), bg: 'bg-orange-600', text: 'text-white' },
          { label: 'Credit Balances', value: fmtPrice(stats.totalCredits), bg: 'bg-blue-600', text: 'text-white' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={`${c.bg} ${c.text} rounded-lg px-3 py-2 text-sm font-bold whitespace-nowrap`}>{c.value}</div>
            <div className="text-xs text-gray-500 font-semibold leading-tight">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          ['payments', `Payments (${invoices.length})`],
          ['credits', `Credits (${Object.keys(credits).length} clients)`],
          ['statements', `Statements`],
        ] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${tab === t ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Payments Tab ── */}
      {tab === 'payments' && (
        <>
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="Search invoice, client, method…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <div className="flex gap-1.5">
              {([
                ['all', 'All'],
                ['paid', 'Paid'],
                ['partial', 'Partial'],
                ['outstanding', 'Outstanding'],
              ] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setStatusFilter(v)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${statusFilter === v ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600 hover:border-gray-500 hover:text-gray-800'}`}
                >
                  {l}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400 ml-auto">{filteredInvoices.length} invoices</span>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white text-xs">
                  <SortBtn field="date" label="Date" />
                  <SortBtn field="docNumber" label="Invoice #" />
                  <SortBtn field="clientName" label="Client" />
                  <SortBtn field="total" label="Total" />
                  <SortBtn field="depositPaid" label="Deposit" />
                  <SortBtn field="amountPaid" label="Paid" />
                  <SortBtn field="creditApplied" label="Credit" />
                  <SortBtn field="totalSettled" label="Settled" />
                  <SortBtn field="balanceDue" label="Balance Due" />
                  <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Method</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-10 text-center text-gray-400">No invoices found</td>
                  </tr>
                ) : filteredInvoices.map(doc => {
                  const total = invoiceTotal(doc)
                  const settled = totalSettled(doc)
                  const balance = balanceDue(doc)
                  const isPaid = balance <= 0.005
                  const isPartial = settled > 0.005 && !isPaid
                  const method = [doc.paymentMethod, doc.paymentMethod2].filter(Boolean).join(' + ')
                  return (
                    <tr
                      key={doc.id}
                      className={isPaid ? 'bg-green-50 hover:bg-green-100' : isPartial ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500 text-xs">{fmtDate(doc.date)}</td>
                      <td className="px-3 py-2 font-mono font-semibold text-gray-900 whitespace-nowrap">{doc.docNumber}</td>
                      <td className="px-3 py-2 text-gray-700 max-w-[160px] truncate">{doc.clientName}</td>
                      <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap">{fmtPrice(total)}</td>
                      <td className="px-3 py-2 text-right text-gray-500 whitespace-nowrap">
                        {(doc.depositPaid || 0) > 0 ? <span className="text-gray-600">{fmtPrice(doc.depositPaid!)}</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {(doc.amountPaid || 0) > 0 ? <span className="text-green-700 font-medium">{fmtPrice(doc.amountPaid!)}</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {(doc.creditApplied || 0) > 0 ? <span className="text-blue-600 font-medium">{fmtPrice(doc.creditApplied!)}</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-800 whitespace-nowrap">
                        {settled > 0.005 ? fmtPrice(settled) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {isPaid
                          ? <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Paid</span>
                          : <span className="font-semibold text-orange-600">{fmtPrice(balance)}</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs max-w-[110px] truncate">{method || <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => openEdit(doc)}
                            className="px-2.5 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 font-semibold transition-colors"
                          >
                            Edit
                          </button>
                          {totalSettled(doc) > 0.005 && (
                            <button
                              onClick={() => handleDeletePayment(doc)}
                              disabled={deletingId === doc.id}
                              className="px-2.5 py-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 font-semibold transition-colors disabled:opacity-40"
                            >
                              {deletingId === doc.id ? '…' : 'Delete'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Credits Tab ── */}
      {tab === 'credits' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-white text-xs">
                <th className="px-3 py-2.5 w-8" />
                <CreditSortBtn field="clientName" label="Client" />
                <CreditSortBtn field="balance" label="Balance" right />
                <th className="px-3 py-2.5 text-left font-semibold">Transactions</th>
                <th className="px-3 py-2.5 text-left font-semibold">Last Activity</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedCredits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-gray-400">No credit records</td>
                </tr>
              ) : sortedCredits.map(record => {
                const isExpanded = expandedClient === record.clientName
                const txns = [...record.transactions].sort((a, b) => b.date.localeCompare(a.date))
                const lastTxn = txns[0]
                return (
                  <React.Fragment key={record.clientName}>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedClient(isExpanded ? null : record.clientName)}>
                      <td className="px-3 py-2.5 text-center text-gray-400 text-xs select-none">{isExpanded ? '▼' : '▶'}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-800">{record.clientName}</td>
                      <td className={`px-3 py-2.5 text-right font-bold ${record.balance > 0.005 ? 'text-green-600' : 'text-gray-400'}`}>
                        {fmtPrice(record.balance)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">{record.transactions.length} transaction{record.transactions.length !== 1 ? 's' : ''}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">{lastTxn ? fmtDate(lastTxn.date) : '—'}</td>
                      <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                        {record.balance > 0.005 && (
                          <button
                            onClick={async () => {
                              if (!confirm(`Reset ${record.clientName}'s credit balance to R0.00? This cannot be undone.`)) return
                              await fetch('/api/admin/customer-credits', {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ clientName: record.clientName }),
                              })
                              await load()
                            }}
                            className="px-2.5 py-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 font-semibold"
                          >
                            Reset
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && txns.map(txn => (
                      <tr key={txn.id} className="bg-gray-50">
                        <td />
                        <td className="px-3 py-2 pl-8 text-xs text-gray-600" colSpan={2}>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold mr-2 ${
                            txn.type === 'overpayment' ? 'bg-green-100 text-green-700' :
                            txn.type === 'credit_applied' ? 'bg-blue-100 text-blue-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {txn.type.replace(/_/g, ' ')}
                          </span>
                          <span className="font-mono font-semibold text-gray-700">{txn.invoiceNumber}</span>
                          {txn.notes && <span className="ml-2 text-gray-400">· {txn.notes}</span>}
                        </td>
                        <td className={`px-3 py-2 text-right text-xs font-bold ${txn.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {txn.amount > 0 ? '+' : ''}{fmtPrice(Math.abs(txn.amount))}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-400">{fmtDate(txn.date)}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Statements Tab ── */}
      {tab === 'statements' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search client…"
              value={stmtSearch}
              onChange={e => setStmtSearch(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <span className="text-xs text-gray-400 ml-auto">{filteredClientSummaries.length} clients</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white text-xs">
                  <th className="px-3 py-2.5 text-left font-semibold">Client</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Invoices</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Total Invoiced</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Total Settled</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Outstanding</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Credit</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Statement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClientSummaries.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-10 text-center text-gray-400">No clients found</td></tr>
                ) : filteredClientSummaries.map(c => {
                  const isClear = c.totalOutstanding <= 0.005
                  const isEmailing = stmtEmailing === c.clientName
                  const isPrompting = stmtEmailPrompt === c.clientName
                  return (
                    <tr key={c.clientName} className={isClear ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'}>
                      <td className="px-3 py-2.5 font-medium text-gray-800">
                        <div>{c.clientName}</div>
                        {c.email && <div className="text-xs text-gray-400">{c.email}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-500">{c.count}</td>
                      <td className="px-3 py-2.5 text-right text-gray-700">{fmtPrice(c.totalInvoiced)}</td>
                      <td className="px-3 py-2.5 text-right text-green-700">{c.totalSettledAmt > 0.005 ? fmtPrice(c.totalSettledAmt) : <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2.5 text-right font-semibold">
                        {isClear
                          ? <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Clear</span>
                          : <span className="text-orange-600">{fmtPrice(c.totalOutstanding)}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {c.creditBalance > 0.005 ? <span className="text-blue-600 font-medium">{fmtPrice(c.creditBalance)}</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {isPrompting ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="email"
                              value={stmtEmailAddr}
                              onChange={e => setStmtEmailAddr(e.target.value)}
                              placeholder="Email address"
                              className="border border-gray-200 rounded px-2 py-1 text-xs w-44 focus:outline-none focus:ring-1 focus:ring-blue-300"
                              autoFocus
                            />
                            <button
                              onClick={() => handleEmailStatement(c.clientName, stmtEmailAddr)}
                              disabled={isEmailing || !stmtEmailAddr}
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 font-semibold"
                            >{isEmailing ? '…' : 'Send'}</button>
                            <button onClick={() => setStmtEmailPrompt(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                          </div>
                        ) : (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleDownloadStatement(c.clientName)}
                              className="px-2.5 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 font-semibold"
                            >Download PDF</button>
                            <button
                              onClick={() => { setStmtEmailPrompt(c.clientName); setStmtEmailAddr(c.email) }}
                              className="px-2.5 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 font-semibold"
                            >Email</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Edit Payment Modal ── */}
      {editDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <h2 className="text-lg font-bold">Edit Payment — {editDoc.docNumber}</h2>
              <button onClick={() => setEditDoc(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {/* Invoice summary */}
              <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Client</span>
                  <span className="font-semibold text-gray-800">{editDoc.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="text-gray-700">{fmtDate(editDoc.date)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                  <span className="text-gray-500">Invoice Total</span>
                  <span className="font-bold text-gray-900">{fmtPrice(invoiceTotal(editDoc))}</span>
                </div>
                {(editDoc.depositPaid || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Deposit Paid</span>
                    <span className="text-gray-600">-{fmtPrice(editDoc.depositPaid!)}</span>
                  </div>
                )}
              </div>

              {/* Payment history */}
              {((editDoc as any).payments || []).length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment History</div>
                    <button
                      onClick={async () => {
                        await fetch(`/api/admin/orders/documents/${editDoc!.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ payments: [] }),
                        })
                        setEditDoc(prev => prev ? { ...prev, payments: [] } as any : null)
                      }}
                      className="text-xs text-red-500 hover:text-red-700 underline"
                    >
                      Clear History
                    </button>
                  </div>
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                    {((editDoc as any).payments as Array<{ date: string; amountPaid: number; creditApplied: number; paymentMethod: string; notes: string }>).map((p, i) => (
                      <div key={i} className="flex items-start justify-between px-3 py-2 bg-white text-sm">
                        <div>
                          <span className="text-gray-500 text-xs">{p.date ? new Date(p.date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
                          <span className="mx-2 text-gray-300">|</span>
                          <span className="text-gray-700 font-medium">{p.paymentMethod || 'EFT'}</span>
                          {p.notes ? <span className="ml-2 text-gray-400 text-xs">— {p.notes}</span> : null}
                        </div>
                        <div className="text-right ml-4 flex-shrink-0">
                          {p.amountPaid > 0 && <div className="text-green-700 font-semibold">{fmtPrice(p.amountPaid)}</div>}
                          {p.creditApplied > 0 && <div className="text-blue-600 text-xs">+Credit {fmtPrice(p.creditApplied)}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cash received */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase tracking-wide">Total Cash Received</label>
                <input
                  type="number" min={0} step={0.01}
                  value={editForm.amountPaid}
                  onChange={e => setEditForm(f => ({ ...f, amountPaid: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-400 mt-1">Total cash received for this invoice.</p>
              </div>

              {/* Credit applied */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase tracking-wide">Credit Applied</label>
                <input
                  type="number" min={0} step={0.01}
                  value={editForm.creditApplied}
                  onChange={e => setEditForm(f => ({ ...f, creditApplied: e.target.value }))}
                  className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-400 mt-1">Adjusting credit will update this customer's credit balance automatically.</p>
              </div>

              {/* Live balance preview */}
              {editPreview && (
                <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1 border border-gray-100">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Balance Preview</div>
                  <div className="flex justify-between text-gray-500">
                    <span>Invoice Total</span><span>{fmtPrice(editPreview.total)}</span>
                  </div>
                  {editPreview.deposit > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Deposit Paid</span><span>-{fmtPrice(editPreview.deposit)}</span>
                    </div>
                  )}
                  {editPreview.newAmtPaid > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Cash Received</span><span>-{fmtPrice(editPreview.newAmtPaid)}</span>
                    </div>
                  )}
                  {editPreview.newCredit > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Credit Applied</span><span>-{fmtPrice(editPreview.newCredit)}</span>
                    </div>
                  )}
                  <div className={`flex justify-between font-bold border-t border-gray-200 pt-1.5 ${editPreview.balance <= 0.005 ? 'text-green-600' : 'text-orange-600'}`}>
                    <span>Balance Due</span>
                    <span>{editPreview.balance <= 0.005 ? '✓ Paid' : fmtPrice(editPreview.balance)}</span>
                  </div>
                </div>
              )}

              {saveError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{saveError}</div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3 flex-shrink-0">
              <button onClick={() => setEditDoc(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {saving ? 'Saving…' : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
