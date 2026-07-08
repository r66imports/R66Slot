'use client'

import { useState, useEffect } from 'react'

const SERVICE_TYPES = [
  { id: 'setup',      label: 'Services - Setup' },
  { id: 'tyretruing', label: 'Services - Tyre Truing' },
  { id: 'braids',     label: 'Services - Braids' },
  { id: 'wiring',     label: 'Services - Wiring' },
]
function svcLabel(id: string) { return SERVICE_TYPES.find(s => s.id === id)?.label ?? id }

interface ManualServiceEntry {
  id: string
  source: 'manual'
  serviceType: string
  description: string
  clientName: string
  qty: number
  billedAmount: number
  staffCost: number
  staffMember: string
  paidToStaff: boolean
  paidToStaffAt?: string
  notes?: string
  date: string
  createdAt: string
}

interface ServiceStore {
  entries: ManualServiceEntry[]
  paid: Record<string, string>
}

interface ServiceLineItem {
  key: string            // docId_lineItemId | manualEntry.id
  source: 'document' | 'manual'
  date: string
  serviceType: string
  description: string
  clientName: string
  staffMember: string
  qty: number
  billedAmount: number
  staffCost: number
  paidToStaff: boolean
  paidToStaffAt?: string
  docNumber?: string
  docType?: string
  docId?: string
  lineItemId?: string
}

interface BankAccount {
  id: string
  companyName: string
  bankName: string
  accountName: string
  accountNumber: string
  branchCode: string
  accountType?: string
  address: string
}

interface OrderDoc {
  id: string
  type: 'quote' | 'salesorder' | 'invoice'
  docNumber: string
  date: string
  clientName: string
  lineItems: { id: string; qty: number; unitPrice: number; description: string; _service?: boolean; _serviceType?: string; _serviceCost?: number; _staffMember?: string }[]
  status: string
  discountPct?: number
  shippingCost?: number
  depositPaid?: number
  creditApplied?: number
  amountPaid?: number
  bankAccountId?: string
  createdAt: string
}

const EMPTY_ACCOUNT = (): Omit<BankAccount, 'id'> => ({
  companyName: '', bankName: '', accountName: '',
  accountNumber: '', branchCode: '', accountType: '', address: '',
})

function docSubtotal(doc: OrderDoc): number {
  const lineTotal = (doc.lineItems || []).reduce((s, li) => s + (li.qty * li.unitPrice), 0)
  const afterDiscount = lineTotal * (1 - (doc.discountPct ?? 0) / 100)
  return afterDiscount + (doc.shippingCost ?? 0)
}

const EMPTY_SVC_FORM = () => ({
  serviceType: 'setup', description: SERVICE_TYPES[0].label, clientName: '',
  staffMember: '', qty: 1, billedAmount: 0, staffCost: 0, notes: '',
  date: new Date().toISOString().slice(0, 10),
})

export default function AccountingPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [docs, setDocs] = useState<OrderDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_ACCOUNT())
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'stats' | 'banks' | 'services'>('stats')
  const [statPeriod, setStatPeriod] = useState<'all' | '30' | '90' | 'year'>('all')

  // Services tab state
  const [svcStore, setSvcStore] = useState<ServiceStore>({ entries: [], paid: {} })
  const [svcLoaded, setSvcLoaded] = useState(false)
  const [showSvcForm, setShowSvcForm] = useState(false)
  const [svcForm, setSvcForm] = useState(EMPTY_SVC_FORM())
  const [savingSvc, setSavingSvc] = useState(false)
  const [svcFilter, setSvcFilter] = useState<'all' | string>('all')
  const [svcPaidFilter, setSvcPaidFilter] = useState<'all' | 'unpaid' | 'paid'>('all')

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/bank-accounts').then(r => r.json()),
      fetch('/api/admin/orders/documents').then(r => r.json()).catch(() => []),
    ]).then(([accs, docData]) => {
      setAccounts(Array.isArray(accs) ? accs : [])
      setDocs(Array.isArray(docData) ? docData : [])
      setLoading(false)
    })
  }, [])

  // Load services data the first time the services tab is opened
  useEffect(() => {
    if (activeTab !== 'services' || svcLoaded) return
    fetch('/api/admin/services').then(r => r.ok ? r.json() : { entries: [], paid: {} }).then(data => {
      setSvcStore({ entries: data.entries ?? [], paid: data.paid ?? {} })
      setSvcLoaded(true)
    }).catch(() => setSvcLoaded(true))
  }, [activeTab, svcLoaded])

  const save = async () => {
    setSaving(true)
    try {
      if (editId) {
        const res = await fetch('/api/admin/bank-accounts', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editId, ...form }),
        })
        if (res.ok) {
          const updated = await res.json()
          setAccounts(prev => prev.map(a => a.id === editId ? updated : a))
        }
      } else {
        const res = await fetch('/api/admin/bank-accounts', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (res.ok) {
          const created = await res.json()
          setAccounts(prev => [...prev, created])
        }
      }
      setShowForm(false); setEditId(null); setForm(EMPTY_ACCOUNT())
    } finally { setSaving(false) }
  }

  const startEdit = (a: BankAccount) => {
    setEditId(a.id)
    setForm({ companyName: a.companyName, bankName: a.bankName, accountName: a.accountName,
      accountNumber: a.accountNumber, branchCode: a.branchCode, accountType: a.accountType || '', address: a.address })
    setShowForm(true)
  }

  const deleteAccount = async (id: string) => {
    setDeleting(id)
    await fetch(`/api/admin/bank-accounts?id=${id}`, { method: 'DELETE' })
    setAccounts(prev => prev.filter(a => a.id !== id))
    setDeleting(null)
  }

  // ── Services helpers ──────────────────────────────────────────────────────

  const allServiceItems: ServiceLineItem[] = [
    // Document-derived services
    ...docs.flatMap(doc =>
      (doc.lineItems || [])
        .filter((li: any) => li._service)
        .map((li: any): ServiceLineItem => {
          const key = `${doc.id}_${li.id}`
          return {
            key,
            source: 'document',
            date: doc.date || doc.createdAt?.slice(0, 10) || '',
            serviceType: li._serviceType || 'setup',
            description: li.description || '',
            clientName: doc.clientName || '',
            staffMember: li._staffMember || '',
            qty: li.qty || 1,
            billedAmount: (li.qty || 1) * (li.unitPrice || 0),
            staffCost: li._serviceCost || 0,
            paidToStaff: !!svcStore.paid[key],
            paidToStaffAt: svcStore.paid[key],
            docNumber: doc.docNumber,
            docType: doc.type,
            docId: doc.id,
            lineItemId: li.id,
          }
        })
    ),
    // Manual entries
    ...svcStore.entries.map((e): ServiceLineItem => ({
      key: e.id,
      source: 'manual',
      date: e.date,
      serviceType: e.serviceType,
      description: e.description,
      clientName: e.clientName,
      staffMember: e.staffMember,
      qty: e.qty,
      billedAmount: e.billedAmount,
      staffCost: e.staffCost,
      paidToStaff: e.paidToStaff,
      paidToStaffAt: e.paidToStaffAt,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const filteredServices = allServiceItems
    .filter(s => svcFilter === 'all' || s.serviceType === svcFilter)
    .filter(s => svcPaidFilter === 'all' || (svcPaidFilter === 'paid' ? s.paidToStaff : !s.paidToStaff))

  const svcTotalBilled   = filteredServices.reduce((s, e) => s + e.billedAmount, 0)
  const svcTotalCost     = filteredServices.reduce((s, e) => s + e.staffCost, 0)
  const svcTotalPaid     = filteredServices.filter(e => e.paidToStaff).reduce((s, e) => s + e.staffCost, 0)
  const svcTotalOwed     = filteredServices.filter(e => !e.paidToStaff).reduce((s, e) => s + e.staffCost, 0)

  const togglePaid = async (item: ServiceLineItem) => {
    const newPaid = !item.paidToStaff
    if (item.source === 'document') {
      await fetch('/api/admin/services', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: newPaid ? 'mark_paid_doc' : 'unmark_paid_doc', docId: item.docId, lineItemId: item.lineItemId }) })
      setSvcStore(prev => {
        const paid = { ...prev.paid }
        if (newPaid) paid[item.key] = new Date().toISOString()
        else delete paid[item.key]
        return { ...prev, paid }
      })
    } else {
      await fetch('/api/admin/services', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: newPaid ? 'mark_paid_manual' : 'unmark_paid_manual', id: item.key }) })
      setSvcStore(prev => ({
        ...prev,
        entries: prev.entries.map(e => e.id === item.key
          ? { ...e, paidToStaff: newPaid, paidToStaffAt: newPaid ? new Date().toISOString() : undefined }
          : e),
      }))
    }
  }

  const deleteManualSvc = async (key: string) => {
    await fetch('/api/admin/services', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id: key }) })
    setSvcStore(prev => ({ ...prev, entries: prev.entries.filter(e => e.id !== key) }))
  }

  const saveSvc = async () => {
    if (!svcForm.staffMember.trim()) return
    setSavingSvc(true)
    try {
      const res = await fetch('/api/admin/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(svcForm) })
      if (res.ok) {
        const entry = await res.json()
        setSvcStore(prev => ({ ...prev, entries: [entry, ...prev.entries] }))
        setShowSvcForm(false)
        setSvcForm(EMPTY_SVC_FORM())
      }
    } finally { setSavingSvc(false) }
  }

  // ── Profit Statistics ──────────────────────────────────────────────────────

  const invoices = docs.filter(d => d.type === 'invoice' && !['cancelled', 'archived'].includes(d.status))
  const quotes = docs.filter(d => d.type === 'quote')
  const salesOrders = docs.filter(d => d.type === 'salesorder')

  const filterByPeriod = (items: OrderDoc[]) => {
    if (statPeriod === 'all') return items
    const days = statPeriod === '30' ? 30 : statPeriod === '90' ? 90 : 365
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days)
    return items.filter(d => new Date(d.createdAt) >= cutoff)
  }

  const periodInvoices = filterByPeriod(invoices)

  const totalInvoiced = periodInvoices.reduce((s, d) => s + docSubtotal(d), 0)
  const totalPaid = periodInvoices.reduce((s, d) => s + (d.amountPaid ?? (d.status === 'paid' ? docSubtotal(d) : 0)), 0)
  const totalOutstanding = totalInvoiced - totalPaid
  const totalDeposits = periodInvoices.reduce((s, d) => s + (d.depositPaid ?? 0), 0)

  // Monthly revenue breakdown (last 6 months)
  const monthlyRevenue: { label: string; amount: number; paid: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i)
    const label = d.toLocaleString('en-ZA', { month: 'short', year: '2-digit' })
    const monthInvs = invoices.filter(inv => {
      const c = new Date(inv.createdAt)
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth()
    })
    monthlyRevenue.push({
      label,
      amount: monthInvs.reduce((s, inv) => s + docSubtotal(inv), 0),
      paid: monthInvs.reduce((s, inv) => s + (inv.amountPaid ?? (inv.status === 'paid' ? docSubtotal(inv) : 0)), 0),
    })
  }
  const maxMonth = Math.max(...monthlyRevenue.map(m => m.amount), 1)

  // Group bank accounts by companyName
  const grouped = accounts.reduce<Record<string, BankAccount[]>>((acc, a) => {
    const key = a.companyName || '— No Company'
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  const fmt = (n: number) => `R ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-play">Accounting</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bank accounts, company profiles & profit statistics</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'stats' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            📊 Statistics
          </button>
          <button onClick={() => setActiveTab('banks')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'banks' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            🏦 Bank Accounts
          </button>
          <button onClick={() => setActiveTab('services')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'services' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            ⚙ Services
          </button>
        </div>
      </div>

      {/* ── STATISTICS TAB ── */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Period selector */}
          <div className="flex gap-2">
            {([['all','All Time'],['30','Last 30 Days'],['90','Last 90 Days'],['year','This Year']] as const).map(([v,l]) => (
              <button key={v} onClick={() => setStatPeriod(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statPeriod === v ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {l}
              </button>
            ))}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Total Invoiced</p>
              <p className="text-2xl font-bold text-gray-900">{fmt(totalInvoiced)}</p>
              <p className="text-xs text-gray-400 mt-1">{periodInvoices.length} invoice{periodInvoices.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-white rounded-2xl border border-green-200 p-5">
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Total Paid</p>
              <p className="text-2xl font-bold text-green-700">{fmt(totalPaid)}</p>
              <p className="text-xs text-gray-400 mt-1">{totalInvoiced > 0 ? ((totalPaid / totalInvoiced) * 100).toFixed(0) : 0}% collected</p>
            </div>
            <div className="bg-white rounded-2xl border border-red-200 p-5">
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">Outstanding</p>
              <p className="text-2xl font-bold text-red-600">{fmt(totalOutstanding)}</p>
              <p className="text-xs text-gray-400 mt-1">{periodInvoices.filter(d => d.status !== 'paid' && d.status !== 'complete').length} unpaid</p>
            </div>
            <div className="bg-white rounded-2xl border border-blue-200 p-5">
              <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">Deposits Held</p>
              <p className="text-2xl font-bold text-blue-600">{fmt(totalDeposits)}</p>
              <p className="text-xs text-gray-400 mt-1">from invoices</p>
            </div>
          </div>

          {/* Total Sales by Account */}
          {accounts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">Total Sales by Account</h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5">
                {accounts.map(acc => {
                  const accInvoices = periodInvoices.filter(d => d.bankAccountId === acc.id)
                  const total = accInvoices.reduce((s, d) => s + docSubtotal(d), 0)
                  const paid = accInvoices.reduce((s, d) => s + (d.amountPaid ?? (d.status === 'paid' ? docSubtotal(d) : 0)), 0)
                  return (
                    <div key={acc.id} className="border border-gray-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{acc.accountName || acc.companyName}</p>
                      <p className="text-xl font-bold text-gray-900">{fmt(total)}</p>
                      <p className="text-xs text-gray-400 mt-1">{accInvoices.length} invoice{accInvoices.length !== 1 ? 's' : ''} · {fmt(paid)} paid</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Document counts */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
              <span className="text-3xl">📄</span>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Quotes</p>
                <p className="text-xl font-bold text-gray-800">{quotes.length}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
              <span className="text-3xl">📦</span>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Sales Orders</p>
                <p className="text-xl font-bold text-gray-800">{salesOrders.length}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
              <span className="text-3xl">🧾</span>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Invoices</p>
                <p className="text-xl font-bold text-gray-800">{invoices.length}</p>
              </div>
            </div>
          </div>

          {/* Monthly revenue chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly Revenue — Last 6 Months</h2>
            <div className="flex items-end gap-3 h-40">
              {monthlyRevenue.map(m => (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                  <p className="text-[10px] text-gray-500 font-semibold">
                    {m.amount > 0 ? `R${(m.amount / 1000).toFixed(0)}k` : '—'}
                  </p>
                  <div className="w-full flex flex-col justify-end" style={{ height: '100px' }}>
                    {/* Paid portion */}
                    <div
                      className="w-full bg-green-500 rounded-t-sm"
                      style={{ height: `${maxMonth > 0 ? (m.paid / maxMonth) * 100 : 0}%`, minHeight: m.paid > 0 ? '3px' : '0' }}
                    />
                    {/* Outstanding portion */}
                    <div
                      className="w-full bg-blue-200"
                      style={{ height: `${maxMonth > 0 ? ((m.amount - m.paid) / maxMonth) * 100 : 0}%`, minHeight: m.amount > m.paid ? '2px' : '0' }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400">{m.label}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-2">
              <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Paid</span>
              <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-3 h-3 rounded-sm bg-blue-200 inline-block" /> Outstanding</span>
            </div>
          </div>

          {/* Recent invoices */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Recent Invoices</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="text-left px-5 py-2">Invoice #</th>
                  <th className="text-left px-3 py-2">Client</th>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-right px-3 py-2">Amount</th>
                  <th className="text-right px-5 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filterByPeriod(invoices).slice(0, 10).map(inv => {
                  const amt = docSubtotal(inv)
                  const isPaid = inv.status === 'paid' || inv.status === 'complete'
                  return (
                    <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-2 font-mono text-xs font-semibold text-primary">{inv.docNumber}</td>
                      <td className="px-3 py-2 text-gray-700 truncate max-w-[150px]">{inv.clientName}</td>
                      <td className="px-3 py-2 text-gray-400 text-xs">{new Date(inv.createdAt).toLocaleDateString('en-ZA')}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-800">{fmt(amt)}</td>
                      <td className="px-5 py-2 text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {isPaid ? 'Paid' : inv.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filterByPeriod(invoices).length === 0 && (
              <p className="text-center py-8 text-gray-400 text-sm">No invoices found for this period</p>
            )}
          </div>
        </div>
      )}

      {/* ── BANK ACCOUNTS TAB ── */}
      {activeTab === 'banks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Add company banking profiles. Each profile's details appear on Quotes, Sales Orders and Invoices when selected.</p>
            <button
              onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_ACCOUNT()) }}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-dark"
            >
              + Add Bank Account
            </button>
          </div>

          {/* Add / Edit form */}
          {showForm && (
            <div className="bg-white rounded-2xl border border-primary/30 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4">{editId ? 'Edit Bank Account' : 'New Bank Account'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Account Name / Company *</label>
                  <input value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                    placeholder="e.g. Route 66 Imports PTY LTD"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                  <p className="text-[10px] text-gray-400 mt-0.5">This name groups your bank accounts and appears as the billing entity on documents.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Bank Name *</label>
                  <input value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
                    placeholder="e.g. FNB, ABSA, Nedbank"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Account Holder Name *</label>
                  <input value={form.accountName} onChange={e => setForm(f => ({ ...f, accountName: e.target.value }))}
                    placeholder="e.g. Route 66 Imports"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Account Number *</label>
                  <input value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))}
                    placeholder="e.g. 62012345678"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Branch Code</label>
                  <input value={form.branchCode} onChange={e => setForm(f => ({ ...f, branchCode: e.target.value }))}
                    placeholder="e.g. 250655"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Account Type</label>
                  <select value={form.accountType} onChange={e => setForm(f => ({ ...f, accountType: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                    <option value="">Select type…</option>
                    <option>Cheque / Current</option>
                    <option>Savings</option>
                    <option>Business Cheque</option>
                    <option>Transmission</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Address / Reference Info</label>
                  <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="e.g. 217 Clarkson Road, Estoire, Bloemfontein"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY_ACCOUNT()) }}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                <button onClick={save} disabled={saving || !form.companyName || !form.bankName || !form.accountNumber}
                  className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark disabled:opacity-50">
                  {saving ? 'Saving…' : editId ? 'Update' : 'Add Account'}
                </button>
              </div>
            </div>
          )}

          {/* Grouped bank accounts */}
          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">🏦</div>
              <p className="font-medium">No bank accounts yet</p>
              <p className="text-sm mt-1">Add your first bank account to get started.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([company, accs]) => (
              <div key={company} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏢</span>
                    <h3 className="font-bold text-gray-800">{company}</h3>
                    <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">{accs.length} account{accs.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {accs.map(acc => (
                    <div key={acc.id} className="px-5 py-4 flex items-start justify-between gap-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 flex-1">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Bank</p>
                          <p className="text-sm font-semibold text-gray-800">{acc.bankName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Account Holder</p>
                          <p className="text-sm font-semibold text-gray-800">{acc.accountName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Account Number</p>
                          <p className="text-sm font-mono font-semibold text-gray-800">{acc.accountNumber}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Branch Code</p>
                          <p className="text-sm font-mono text-gray-700">{acc.branchCode || '—'}</p>
                        </div>
                        {acc.accountType && (
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Type</p>
                            <p className="text-sm text-gray-600">{acc.accountType}</p>
                          </div>
                        )}
                        {acc.address && (
                          <div className="md:col-span-3">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Address</p>
                            <p className="text-xs text-gray-500">{acc.address}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => startEdit(acc)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">✏ Edit</button>
                        <button onClick={() => deleteAccount(acc.id)} disabled={deleting === acc.id}
                          className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50">
                          {deleting === acc.id ? '…' : '✕'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── SERVICES TAB ── */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          {!svcLoaded ? (
            <div className="text-center py-20 text-gray-400 text-sm">Loading services…</div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Billed', val: svcTotalBilled, color: 'text-gray-800' },
                  { label: 'Total Staff Cost', val: svcTotalCost, color: 'text-orange-600' },
                  { label: 'Paid to Staff', val: svcTotalPaid, color: 'text-green-600' },
                  { label: 'Owed to Staff', val: svcTotalOwed, color: 'text-red-600' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                    <p className={`text-xl font-bold ${color}`}>
                      R{val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                    </p>
                  </div>
                ))}
              </div>

              {/* Filter bar + Add button */}
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex flex-wrap gap-2">
                  <select value={svcFilter} onChange={e => setSvcFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                    <option value="all">All Types</option>
                    {SERVICE_TYPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <select value={svcPaidFilter} onChange={e => setSvcPaidFilter(e.target.value as 'all' | 'paid' | 'unpaid')}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                    <option value="all">All Status</option>
                    <option value="unpaid">Owed to Staff</option>
                    <option value="paid">Paid to Staff</option>
                  </select>
                </div>
                <button onClick={() => setShowSvcForm(v => !v)}
                  className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-dark">
                  + Add Service
                </button>
              </div>

              {/* Add form */}
              {showSvcForm && (
                <div className="bg-white rounded-2xl border border-primary/30 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4">Manual Service Entry</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Date</label>
                      <input type="date" value={svcForm.date} onChange={e => setSvcForm(f => ({ ...f, date: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Service Type *</label>
                      <select value={svcForm.serviceType} onChange={e => setSvcForm(f => ({ ...f, serviceType: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                        {SERVICE_TYPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Staff Member *</label>
                      <input value={svcForm.staffMember} onChange={e => setSvcForm(f => ({ ...f, staffMember: e.target.value }))}
                        placeholder="Name"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</label>
                      <input value={svcForm.description} onChange={e => setSvcForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Service description"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Client</label>
                      <input value={svcForm.clientName} onChange={e => setSvcForm(f => ({ ...f, clientName: e.target.value }))}
                        placeholder="Client name"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Qty</label>
                      <input type="number" min={1} value={svcForm.qty} onChange={e => setSvcForm(f => ({ ...f, qty: Number(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Billed to Client (R)</label>
                      <input type="number" step="0.01" min={0} value={svcForm.billedAmount} onChange={e => setSvcForm(f => ({ ...f, billedAmount: Number(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Staff Cost (R)</label>
                      <input type="number" step="0.01" min={0} value={svcForm.staffCost} onChange={e => setSvcForm(f => ({ ...f, staffCost: Number(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => { setShowSvcForm(false); setSvcForm(EMPTY_SVC_FORM()) }}
                      className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                    <button onClick={saveSvc} disabled={savingSvc || !svcForm.staffMember.trim()}
                      className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark disabled:opacity-50">
                      {savingSvc ? 'Saving…' : 'Add Service'}
                    </button>
                  </div>
                </div>
              )}

              {/* Services table */}
              {filteredServices.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">⚙</div>
                  <p className="font-medium">No services found</p>
                  <p className="text-sm mt-1">Services added to quotes, sales orders and invoices will appear here.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Type</th>
                        <th className="px-4 py-3 text-left">Description</th>
                        <th className="px-4 py-3 text-left">Client</th>
                        <th className="px-4 py-3 text-left">Staff</th>
                        <th className="px-4 py-3 text-left">Source</th>
                        <th className="px-4 py-3 text-right">Billed</th>
                        <th className="px-4 py-3 text-right">Staff Cost</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredServices.map(item => (
                        <tr key={item.key} className={`transition-colors ${item.paidToStaff ? 'bg-green-50/40' : ''}`}>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{item.date || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                              {svcLabel(item.serviceType)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700 max-w-[160px] truncate">{item.description || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{item.clientName || '—'}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{item.staffMember || '—'}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                            {item.source === 'document'
                              ? <span className="text-xs text-blue-600 font-medium">{item.docNumber ?? item.docType}</span>
                              : <span className="text-xs text-gray-400">Manual</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-gray-800">
                            R{item.billedAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-orange-600">
                            R{item.staffCost.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.paidToStaff
                              ? <span className="inline-flex items-center gap-1 text-xs text-green-700 font-semibold">✓ Paid</span>
                              : <span className="inline-flex items-center gap-1 text-xs text-red-600 font-semibold">Owed</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => togglePaid(item)}
                                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${item.paidToStaff ? 'border-gray-200 text-gray-500 hover:bg-gray-50' : 'border-green-300 text-green-700 hover:bg-green-50'}`}>
                                {item.paidToStaff ? 'Unmark' : '✓ Mark Paid'}
                              </button>
                              {item.source === 'manual' && (
                                <button onClick={() => deleteManualSvc(item.key)}
                                  className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50">✕</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
