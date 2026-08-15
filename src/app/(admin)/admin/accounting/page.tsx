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
  paymentMethod?: string
  paymentMethod2?: string
  paymentMethod1Amount?: number
  paymentMethod2Amount?: number
  /** Payment history — the source of truth for how a document was paid (Rule 44). The flat
   *  paymentMethod fields above are only a fallback for docs written before it existed. */
  payments?: { date?: string; amountPaid?: number; creditApplied?: number; paymentMethod?: string; notes?: string }[]
  createdAt: string
}

interface PettyCashEntry {
  id: string
  date: string
  type: 'in' | 'out'
  description: string
  category: string
  reference?: string
  amount: number
  sourceId?: string
  createdAt: string
}

interface InvoiceCashPayment {
  /** Stable key for the import guard — `${docId}:${index}`, or `${docId}:m1|m2` for legacy docs. */
  sourceId: string
  docId: string
  docNumber: string
  clientName: string
  date: string
  method: string
  amount: number
  archived: boolean
  notes?: string
}

const PETTY_CATEGORIES = [
  'Float Top-Up', 'Fuel & Travel', 'Postage & Courier', 'Refreshments',
  'Stationery', 'Parking & Tolls', 'Repairs & Maintenance', 'Staff', 'Banking', 'Other',
]

const EMPTY_PETTY_FORM = () => ({
  date: new Date().toISOString().slice(0, 10),
  type: 'out' as 'in' | 'out',
  description: '',
  category: '',
  reference: '',
  amount: 0,
})

/** Matches "Cash", "Cash Deposit", "cash payment" — but not "Cashback". */
const isCashMethod = (m?: string) => /^cash\b/i.test(String(m || '').trim())

/** Every cash payment recorded against a document. payments[] is authoritative; the flat
 *  paymentMethod/paymentMethod2 pair is only read when a doc has no payment history. */
function cashPaymentsOf(doc: OrderDoc): InvoiceCashPayment[] {
  const base = {
    docId: doc.id,
    docNumber: doc.docNumber,
    clientName: doc.clientName || '',
    archived: doc.status === 'archived',
  }
  const docDate = (doc.date || doc.createdAt || '').slice(0, 10)

  const fromHistory = (doc.payments || [])
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => isCashMethod(p.paymentMethod) && (Number(p.amountPaid) || 0) > 0.005)
    .map(({ p, i }) => ({
      ...base,
      sourceId: `${doc.id}:${i}`,
      date: (p.date || docDate || '').slice(0, 10),
      method: (p.paymentMethod || 'Cash').trim(),
      amount: Number(p.amountPaid) || 0,
      notes: p.notes,
    }))
  if (fromHistory.length) return fromHistory

  // ── Legacy docs (no payments[]) ──
  const out: InvoiceCashPayment[] = []
  const m1 = String(doc.paymentMethod || '').trim()
  const m2 = String(doc.paymentMethod2 || '').trim()
  const a1 = Number(doc.paymentMethod1Amount) || 0
  const a2 = Number(doc.paymentMethod2Amount) || 0
  const paid = Number(doc.amountPaid) || 0

  if (isCashMethod(m1)) {
    // Split amounts are only populated on multi-method docs. Falling back to the full
    // amountPaid when a second method exists would book the other method's money as cash.
    const amt = a1 > 0.005 ? a1 : (m2 ? 0 : paid)
    if (amt > 0.005) out.push({ ...base, sourceId: `${doc.id}:m1`, date: docDate, method: m1, amount: amt })
  }
  if (isCashMethod(m2) && a2 > 0.005) {
    out.push({ ...base, sourceId: `${doc.id}:m2`, date: docDate, method: m2, amount: a2 })
  }
  return out
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
  const [activeTab, setActiveTab] = useState<'stats' | 'banks' | 'petty' | 'services'>('stats')
  const [statPeriod, setStatPeriod] = useState<'all' | '30' | '90' | 'year'>('all')

  // Petty Cash tab state
  const [petty, setPetty] = useState<PettyCashEntry[]>([])
  const [pettyLoaded, setPettyLoaded] = useState(false)
  const [showPettyForm, setShowPettyForm] = useState(false)
  const [pettyForm, setPettyForm] = useState(EMPTY_PETTY_FORM())
  const [savingPetty, setSavingPetty] = useState(false)
  const [pettyEditId, setPettyEditId] = useState<string | null>(null)
  const [pettyFilter, setPettyFilter] = useState<'all' | 'in' | 'out'>('all')
  const [pettyCatFilter, setPettyCatFilter] = useState('all')
  const [pettyView, setPettyView] = useState<'book' | 'invoices'>('book')
  const [cashFrom, setCashFrom] = useState('')
  const [cashTo, setCashTo] = useState('')
  const [cashSearch, setCashSearch] = useState('')
  const [importingCash, setImportingCash] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)

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

  // Load petty cash the first time the tab is opened
  useEffect(() => {
    if (activeTab !== 'petty' || pettyLoaded) return
    fetch('/api/admin/petty-cash').then(r => r.ok ? r.json() : []).then(data => {
      setPetty(Array.isArray(data) ? data : [])
      setPettyLoaded(true)
    }).catch(() => setPettyLoaded(true))
  }, [activeTab, pettyLoaded])

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
            staffCost: (li.qty || 1) * (li.unitPrice || 0),
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

  // ── Petty Cash helpers ─────────────────────────────────────────────────────

  // Running balance is always computed over EVERY entry in chronological order,
  // so a filtered view still shows the true balance after each movement.
  const pettyChronological = [...petty].sort((a, b) =>
    (a.date || '').localeCompare(b.date || '') || (a.createdAt || '').localeCompare(b.createdAt || '')
  )
  const pettyBalanceAfter: Record<string, number> = {}
  let pettyRunning = 0
  for (const e of pettyChronological) {
    pettyRunning += e.type === 'in' ? e.amount : -e.amount
    pettyBalanceAfter[e.id] = pettyRunning
  }

  const pettyIn      = petty.filter(e => e.type === 'in').reduce((s, e) => s + e.amount, 0)
  const pettyOut     = petty.filter(e => e.type === 'out').reduce((s, e) => s + e.amount, 0)
  const pettyBalance = pettyIn - pettyOut

  const thisMonth = new Date().toISOString().slice(0, 7)
  const pettyMonthOut = petty
    .filter(e => e.type === 'out' && (e.date || '').slice(0, 7) === thisMonth)
    .reduce((s, e) => s + e.amount, 0)

  const pettyCategories = Array.from(new Set([
    ...PETTY_CATEGORIES,
    ...petty.map(e => e.category).filter(Boolean),
  ]))

  const filteredPetty = petty
    .filter(e => pettyFilter === 'all' || e.type === pettyFilter)
    .filter(e => pettyCatFilter === 'all' || e.category === pettyCatFilter)

  const filteredPettyNet = filteredPetty.reduce((s, e) => s + (e.type === 'in' ? e.amount : -e.amount), 0)

  const startPettyEdit = (e: PettyCashEntry) => {
    setPettyEditId(e.id)
    setPettyForm({
      date: e.date, type: e.type, description: e.description,
      category: e.category || '', reference: e.reference || '', amount: e.amount,
    })
    setShowPettyForm(true)
  }

  const closePettyForm = () => {
    setShowPettyForm(false); setPettyEditId(null); setPettyForm(EMPTY_PETTY_FORM())
  }

  const savePetty = async () => {
    if (!pettyForm.description.trim() || pettyForm.amount <= 0) return
    setSavingPetty(true)
    try {
      const res = await fetch('/api/admin/petty-cash', {
        method: pettyEditId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pettyEditId ? { id: pettyEditId, ...pettyForm } : pettyForm),
      })
      if (res.ok) {
        const entry: PettyCashEntry = await res.json()
        setPetty(prev => {
          const next = pettyEditId ? prev.map(e => e.id === entry.id ? entry : e) : [entry, ...prev]
          return next.sort((a, b) =>
            (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '')
          )
        })
        closePettyForm()
      }
    } finally { setSavingPetty(false) }
  }

  const deletePetty = async (id: string) => {
    await fetch(`/api/admin/petty-cash?id=${id}`, { method: 'DELETE' })
    setPetty(prev => prev.filter(e => e.id !== id))
    if (pettyEditId === id) closePettyForm()
  }

  // ── Invoice cash payments ──────────────────────────────────────────────────

  // Archived invoices are DELIBERATELY included here, unlike the statistics tab. Archiving is
  // a filing action — it does not un-receive the money — so excluding them would hide cash
  // that was genuinely taken in.
  const cashSourceInvoices = docs.filter(d => d.type === 'invoice' && d.status !== 'cancelled')

  const invoiceCash = cashSourceInvoices
    .flatMap(cashPaymentsOf)
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.docNumber.localeCompare(b.docNumber))

  const filteredCash = invoiceCash
    .filter(p => !cashFrom || (p.date && p.date >= cashFrom))
    .filter(p => !cashTo || (p.date && p.date <= cashTo))
    .filter(p => {
      const q = cashSearch.trim().toLowerCase()
      if (!q) return true
      return p.docNumber.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q)
    })

  const cashTotal = filteredCash.reduce((s, p) => s + p.amount, 0)
  const cashInvoiceNumbers = Array.from(new Set(filteredCash.map(p => p.docNumber)))

  const bookedSourceIds = new Set(petty.map(e => e.sourceId).filter(Boolean) as string[])
  const unbookedCash = filteredCash.filter(p => !bookedSourceIds.has(p.sourceId))
  const unbookedTotal = unbookedCash.reduce((s, p) => s + p.amount, 0)

  const cashDateRangeActive = Boolean(cashFrom || cashTo || cashSearch.trim())

  const importCash = async (rows: InvoiceCashPayment[]) => {
    if (rows.length === 0) return
    setImportingCash(true)
    setImportResult(null)
    try {
      const res = await fetch('/api/admin/petty-cash', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import',
          entries: rows.map(p => ({
            date: p.date,
            description: `Cash received — ${p.docNumber}${p.clientName ? ` · ${p.clientName}` : ''}`,
            category: 'Invoice Cash',
            reference: p.docNumber,
            amount: p.amount,
            sourceId: p.sourceId,
          })),
        }),
      })
      if (res.ok) {
        const { created, imported, skipped } = await res.json()
        if (Array.isArray(created) && created.length > 0) {
          setPetty(prev => [...created, ...prev].sort((a, b) =>
            (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '')
          ))
        }
        setImportResult(
          `${imported} payment${imported !== 1 ? 's' : ''} booked to the cash book` +
          (skipped ? ` · ${skipped} already booked` : '')
        )
      } else {
        setImportResult('Import failed')
      }
    } finally { setImportingCash(false) }
  }

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
          <button onClick={() => setActiveTab('petty')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'petty' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            💵 Petty Cash
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

      {/* ── PETTY CASH TAB ── */}
      {activeTab === 'petty' && (
        <div className="space-y-4">
          {!pettyLoaded ? (
            <div className="text-center py-20 text-gray-400 text-sm">Loading petty cash…</div>
          ) : (
            <>
              {/* Summary cards */}
              {pettyView === 'book' && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl border border-green-200 p-5">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Cash In</p>
                  <p className="text-2xl font-bold text-green-700">{fmt(pettyIn)}</p>
                  <p className="text-xs text-gray-400 mt-1">{petty.filter(e => e.type === 'in').length} top-up{petty.filter(e => e.type === 'in').length !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-white rounded-2xl border border-red-200 p-5">
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">Cash Out</p>
                  <p className="text-2xl font-bold text-red-600">{fmt(pettyOut)}</p>
                  <p className="text-xs text-gray-400 mt-1">{petty.filter(e => e.type === 'out').length} payment{petty.filter(e => e.type === 'out').length !== 1 ? 's' : ''}</p>
                </div>
                <div className={`bg-white rounded-2xl border p-5 ${pettyBalance < 0 ? 'border-red-200' : 'border-blue-200'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${pettyBalance < 0 ? 'text-red-500' : 'text-blue-500'}`}>Balance on Hand</p>
                  <p className={`text-2xl font-bold ${pettyBalance < 0 ? 'text-red-600' : 'text-blue-600'}`}>{fmt(pettyBalance)}</p>
                  <p className="text-xs text-gray-400 mt-1">{pettyBalance < 0 ? 'Overdrawn — float needs a top-up' : 'Cash in the tin'}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Spent This Month</p>
                  <p className="text-2xl font-bold text-gray-800">{fmt(pettyMonthOut)}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleString('en-ZA', { month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
              )}

              {/* Invoice cash summary cards */}
              {pettyView === 'invoices' && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-white rounded-2xl border border-green-200 p-5">
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Total Cash Received</p>
                    <p className="text-2xl font-bold text-green-700">{fmt(cashTotal)}</p>
                    <p className="text-xs text-gray-400 mt-1">{cashDateRangeActive ? 'filtered view' : 'all invoices'}</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Cash Payments</p>
                    <p className="text-2xl font-bold text-gray-800">{filteredCash.length}</p>
                    <p className="text-xs text-gray-400 mt-1">of {invoiceCash.length} on record</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-blue-200 p-5">
                    <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">Invoices</p>
                    <p className="text-2xl font-bold text-blue-600">{cashInvoiceNumbers.length}</p>
                    <p className="text-xs text-gray-400 mt-1">paid with cash</p>
                  </div>
                  <div className={`bg-white rounded-2xl border p-5 ${unbookedCash.length > 0 ? 'border-amber-200' : 'border-gray-200'}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${unbookedCash.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>Not Yet in Cash Book</p>
                    <p className={`text-2xl font-bold ${unbookedCash.length > 0 ? 'text-amber-600' : 'text-gray-800'}`}>{fmt(unbookedTotal)}</p>
                    <p className="text-xs text-gray-400 mt-1">{unbookedCash.length} payment{unbookedCash.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              )}

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {pettyView === 'book' ? (
                    <>
                      {(['all', 'in', 'out'] as const).map(v => (
                        <button key={v} onClick={() => setPettyFilter(v)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${pettyFilter === v ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {v === 'all' ? 'All' : v === 'in' ? 'Cash In' : 'Cash Out'}
                        </button>
                      ))}
                      <span className="w-px h-5 bg-gray-200 mx-1" />
                      <select value={pettyCatFilter} onChange={e => setPettyCatFilter(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40">
                        <option value="all">All Categories</option>
                        {pettyCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <span className="w-px h-5 bg-gray-200 mx-1" />
                    </>
                  ) : (
                    <>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">From</label>
                      <input type="date" value={cashFrom} onChange={e => setCashFrom(e.target.value)}
                        className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40" />
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">To</label>
                      <input type="date" value={cashTo} onChange={e => setCashTo(e.target.value)}
                        className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40" />
                      <input value={cashSearch} onChange={e => setCashSearch(e.target.value)}
                        placeholder="Invoice # or client…"
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs w-44 focus:outline-none focus:ring-2 focus:ring-primary/40" />
                      {cashDateRangeActive && (
                        <button onClick={() => { setCashFrom(''); setCashTo(''); setCashSearch('') }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200">Clear</button>
                      )}
                      <span className="w-px h-5 bg-gray-200 mx-1" />
                    </>
                  )}
                  <button onClick={() => { setPettyView('book'); setImportResult(null) }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${pettyView === 'book' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    📒 Cash Book
                  </button>
                  <button onClick={() => { setPettyView('invoices'); setImportResult(null) }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${pettyView === 'invoices' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    🧾 Invoice Cash{invoiceCash.length > 0 ? ` (${invoiceCash.length})` : ''}
                  </button>
                </div>
                {pettyView === 'book' ? (
                  <button onClick={() => showPettyForm ? closePettyForm() : setShowPettyForm(true)}
                    className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-dark">
                    + Add Entry
                  </button>
                ) : (
                  <button onClick={() => importCash(unbookedCash)}
                    disabled={importingCash || unbookedCash.length === 0}
                    title={unbookedCash.length === 0 ? 'Every cash payment in this view is already in the cash book' : 'Book these payments as Cash In entries'}
                    className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-40">
                    {importingCash ? 'Booking…' : `↓ Book ${unbookedCash.length} to Cash Book`}
                  </button>
                )}
              </div>

              {importResult && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-2.5 text-sm flex items-center justify-between">
                  <span>{importResult}</span>
                  <button onClick={() => setImportResult(null)} className="text-blue-400 hover:text-blue-700 text-xs">✕</button>
                </div>
              )}

              {/* Add / Edit form */}
              {pettyView === 'book' && showPettyForm && (
                <div className="bg-white rounded-2xl border border-primary/30 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4">{pettyEditId ? 'Edit Petty Cash Entry' : 'New Petty Cash Entry'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Date *</label>
                      <input
                        type="date"
                        value={pettyForm.date}
                        onChange={e => setPettyForm(f => ({ ...f, date: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Type *</label>
                      <div className="flex gap-2">
                        {([['in', 'Cash In'], ['out', 'Cash Out']] as const).map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setPettyForm(f => ({ ...f, type: v }))}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                              pettyForm.type === v
                                ? v === 'in' ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600'
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Amount (R) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={pettyForm.amount || ''}
                        onChange={e => setPettyForm(f => ({ ...f, amount: Number(e.target.value) }))}
                        placeholder="0.00"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description *</label>
                      <input
                        type="text"
                        value={pettyForm.description}
                        onChange={e => setPettyForm(f => ({ ...f, description: e.target.value }))}
                        placeholder={pettyForm.type === 'in' ? 'e.g. Float top-up from FNB' : 'e.g. Fuel — courier run to PostNet'}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Category</label>
                      <select
                        value={pettyForm.category}
                        onChange={e => setPettyForm(f => ({ ...f, category: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                        <option value="">— None —</option>
                        {pettyCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Reference / Received By</label>
                      <input
                        type="text"
                        value={pettyForm.reference}
                        onChange={e => setPettyForm(f => ({ ...f, reference: e.target.value }))}
                        placeholder="Optional — slip number, staff member…"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={closePettyForm}
                      className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                    <button
                      onClick={savePetty}
                      disabled={savingPetty || !pettyForm.description.trim() || pettyForm.amount <= 0}
                      className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark disabled:opacity-50">
                      {savingPetty ? 'Saving…' : pettyEditId ? 'Update Entry' : 'Add Entry'}
                    </button>
                  </div>
                </div>
              )}

              {/* Cash book */}
              {pettyView === 'book' && (filteredPetty.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">💵</div>
                  <p className="font-medium">No petty cash entries found</p>
                  <p className="text-sm mt-1">Record a float top-up as Cash In, then log each cash payment as Cash Out.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <th className="pl-5 pr-3 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Description</th>
                        <th className="px-4 py-3 text-left">Category</th>
                        <th className="px-4 py-3 text-left">Reference</th>
                        <th className="px-4 py-3 text-right">Cash In</th>
                        <th className="px-4 py-3 text-right">Cash Out</th>
                        <th className="px-4 py-3 text-right">Balance</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredPetty.map(e => {
                        const bal = pettyBalanceAfter[e.id] ?? 0
                        return (
                          <tr key={e.id} className={`transition-colors ${pettyEditId === e.id ? 'bg-primary/5' : e.type === 'in' ? 'bg-green-50/40' : ''}`}>
                            <td className="pl-5 pr-3 py-3 text-gray-600 whitespace-nowrap text-xs">
                              {e.date ? new Date(e.date + 'T00:00:00').toLocaleDateString('en-ZA') : '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-800">{e.description || '—'}</td>
                            <td className="px-4 py-3">
                              {e.category
                                ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{e.category}</span>
                                : <span className="text-xs text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{e.reference || '—'}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold text-green-700">
                              {e.type === 'in' ? fmt(e.amount) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-semibold text-red-600">
                              {e.type === 'out' ? fmt(e.amount) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className={`px-4 py-3 text-right font-mono font-semibold ${bal < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                              {fmt(bal)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 justify-end">
                                <button
                                  onClick={() => startPettyEdit(e)}
                                  className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">✏ Edit</button>
                                <button
                                  onClick={() => deletePetty(e.id)}
                                  className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50">✕</button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <div className="border-t border-gray-100 px-5 py-3 bg-gray-50 flex justify-between items-center text-xs text-gray-500">
                    <span>{filteredPetty.length} entr{filteredPetty.length !== 1 ? 'ies' : 'y'}{(pettyFilter !== 'all' || pettyCatFilter !== 'all') ? ' (filtered)' : ''}</span>
                    <span className="flex items-center gap-4">
                      <span>Net for view: <span className={`font-semibold ${filteredPettyNet < 0 ? 'text-red-600' : 'text-gray-700'}`}>{fmt(filteredPettyNet)}</span></span>
                      <span className="font-semibold text-gray-700">Balance on hand: {fmt(pettyBalance)}</span>
                    </span>
                  </div>
                </div>
              ))}

              {/* ── INVOICE CASH PAYMENTS VIEW ── */}
              {pettyView === 'invoices' && (
                filteredCash.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <div className="text-4xl mb-3">🧾</div>
                    <p className="font-medium">No cash payments found</p>
                    {invoiceCash.length > 0 ? (
                      <p className="text-sm mt-1">No cash payments in this date range — clear the filters to see them all.</p>
                    ) : (
                      <>
                        <p className="text-sm mt-1">
                          Nothing on record was paid with cash — all {cashSourceInvoices.length} invoices were settled by another method.
                        </p>
                        <p className="text-sm mt-1">
                          Payments land here when Orders → Invoices → Record Payment is set to <strong>Cash</strong> (it defaults to EFT).
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Invoice numbers paid with cash */}
                    <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        Invoice Numbers — Cash ({cashInvoiceNumbers.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {cashInvoiceNumbers.map(n => (
                          <span key={n} className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            <th className="pl-5 pr-3 py-3 text-left">Date</th>
                            <th className="px-4 py-3 text-left">Invoice #</th>
                            <th className="px-4 py-3 text-left">Client</th>
                            <th className="px-4 py-3 text-left">Payment Type</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-center">Cash Book</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredCash.map(p => {
                            const booked = bookedSourceIds.has(p.sourceId)
                            return (
                              <tr key={p.sourceId} className={`transition-colors ${booked ? 'bg-green-50/40' : ''}`}>
                                <td className="pl-5 pr-3 py-3 text-gray-600 whitespace-nowrap text-xs">
                                  {p.date ? new Date(p.date + 'T00:00:00').toLocaleDateString('en-ZA') : '—'}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">
                                  {p.docNumber}
                                  {p.archived && (
                                    <span title="Invoice is archived — the cash was still received" className="ml-1.5 font-sans text-[10px] font-medium text-gray-400">archived</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-gray-800">{p.clientName || '—'}</td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{p.method}</span>
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-semibold text-green-700">{fmt(p.amount)}</td>
                                <td className="px-4 py-3 text-center">
                                  {booked
                                    ? <span className="text-xs text-green-700 font-semibold">✓ Booked</span>
                                    : <span className="text-xs text-amber-600 font-semibold">Not booked</span>}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {!booked && (
                                    <button
                                      onClick={() => importCash([p])}
                                      disabled={importingCash}
                                      className="text-xs px-2.5 py-1 rounded-lg border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50">
                                      ↓ Book
                                    </button>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      <div className="border-t border-gray-100 px-5 py-3 bg-gray-50 flex justify-between items-center text-xs text-gray-500">
                        <span>
                          {filteredCash.length} cash payment{filteredCash.length !== 1 ? 's' : ''} across {cashInvoiceNumbers.length} invoice{cashInvoiceNumbers.length !== 1 ? 's' : ''}
                          {cashDateRangeActive ? ' (filtered)' : ''}
                        </span>
                        <span className="font-semibold text-green-700">Total cash: {fmt(cashTotal)}</span>
                      </div>
                    </div>
                  </>
                )
              )}
            </>
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
