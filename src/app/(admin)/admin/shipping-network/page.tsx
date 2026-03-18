'use client'

import { useState, useEffect, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Courier {
  id: string
  name: string
  code: string
  contactName: string
  email: string
  phone: string
  trackingUrl: string
  notes: string
  isActive: boolean
}

interface Shipment {
  id: string
  trackingNumber: string
  courierId: string
  courierName: string
  courierCode: string
  reference: string
  dateShipped: string
  status: 'pending' | 'in-transit' | 'out-for-delivery' | 'delivered' | 'returned' | 'failed'
  notes: string
  createdAt: string
  liveDescription?: string
  liveLocation?: string
  liveLastUpdated?: string
}

interface TrackingResult {
  loading: boolean
  status?: string
  statusCode?: string
  description?: string
  location?: string
  lastUpdated?: string
  events?: Array<{ timestamp: string; description: string; location?: string }>
  error?: string
  notConfigured?: boolean
  unsupported?: boolean
}

const EMPTY_COURIER: Omit<Courier, 'id'> = {
  name: '', code: '', contactName: '', email: '', phone: '', trackingUrl: '', notes: '', isActive: true,
}

const EMPTY_SHIPMENT: Omit<Shipment, 'id' | 'createdAt'> = {
  trackingNumber: '', courierId: '', courierName: '', courierCode: '',
  reference: '', dateShipped: new Date().toISOString().split('T')[0],
  status: 'in-transit', notes: '',
}

const STATUS_STYLES: Record<string, string> = {
  'pending':          'bg-yellow-100 text-yellow-700',
  'in-transit':       'bg-blue-100 text-blue-700',
  'out-for-delivery': 'bg-purple-100 text-purple-700',
  'delivered':        'bg-green-100 text-green-700',
  'returned':         'bg-orange-100 text-orange-700',
  'failed':           'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  'pending':          'Pending',
  'in-transit':       'In Transit',
  'out-for-delivery': 'Out for Delivery',
  'delivered':        'Delivered',
  'returned':         'Returned',
  'failed':           'Failed',
}

function buildTrackUrl(courierCode: string, trackingNumber: string, baseUrl: string): string {
  const n = encodeURIComponent(trackingNumber)
  switch (courierCode?.toUpperCase()) {
    case 'FEDEX':   return `https://www.fedex.com/fedextrack/?tracknumbers=${n}`
    case 'ARAMEX':  return `https://www.aramex.com/track/results?ShipmentNumber=${n}`
    case 'POSTNET': return `https://tracking.postnet.co.za/?waybill=${n}`
    case 'TCG':     return `https://www.thecourierguy.co.za/tracking`
    default:        return baseUrl || '#'
  }
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function TruckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 .001M13 16H9m4 0h2m0 0h.01M5 16H3m10-10h3.586a1 1 0 01.707.293l2.914 2.914A1 1 0 0121 9.914V15a1 1 0 01-1 1h-1" />
    </svg>
  )
}

function SpinIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

function RefreshIcon({ className = 'w-4 h-4', spinning = false }: { className?: string; spinning?: boolean }) {
  return (
    <svg className={`${className} ${spinning ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ShippingNetworkPage() {
  // Couriers
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [couriersLoading, setCouriersLoading] = useState(true)
  const [courierSearch, setCourierSearch] = useState('')
  const [showCourierModal, setShowCourierModal] = useState(false)
  const [editingCourierId, setEditingCourierId] = useState<string | null>(null)
  const [courierForm, setCourierForm] = useState<Omit<Courier, 'id'>>(EMPTY_COURIER)
  const [savingCourier, setSavingCourier] = useState(false)
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const actionsRef = useRef<HTMLDivElement>(null)

  // Shipments
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [shipmentsLoading, setShipmentsLoading] = useState(true)
  const [refreshingAll, setRefreshingAll] = useState(false)
  const [shipmentSearch, setShipmentSearch] = useState('')
  const [showShipmentModal, setShowShipmentModal] = useState(false)
  const [editingShipmentId, setEditingShipmentId] = useState<string | null>(null)
  const [shipmentForm, setShipmentForm] = useState<Omit<Shipment, 'id' | 'createdAt'>>(EMPTY_SHIPMENT)
  const [savingShipment, setSavingShipment] = useState(false)
  const [openShipmentActionId, setOpenShipmentActionId] = useState<string | null>(null)

  // Live tracking
  const [trackingData, setTrackingData] = useState<Record<string, TrackingResult>>({})
  const [expandedEvents, setExpandedEvents] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setOpenActionId(null)
        setOpenShipmentActionId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function loadCouriers() {
    setCouriersLoading(true)
    try {
      const res = await fetch('/api/admin/shipping-network')
      const data = await res.json()
      setCouriers(Array.isArray(data) ? data : [])
    } finally {
      setCouriersLoading(false)
    }
  }

  async function loadShipments(silent = false) {
    if (!silent) setShipmentsLoading(true)
    try {
      const res = await fetch('/api/admin/shipments')
      const data: Shipment[] = await res.json()
      const list = Array.isArray(data) ? data : []
      setShipments(list)
      // Auto-fetch live tracking for active FedEx shipments
      const toTrack = list.filter(
        (s) => s.courierCode?.toUpperCase() === 'FEDEX' && s.status !== 'delivered'
      )
      toTrack.forEach((s) => fetchTracking(s.id))
    } finally {
      setShipmentsLoading(false)
    }
  }

  async function fetchTracking(id: string) {
    setTrackingData((prev) => ({ ...prev, [id]: { ...prev[id], loading: true } }))
    try {
      const res = await fetch(`/api/admin/shipments/${id}/track`)
      const data = await res.json()
      if (res.ok) {
        setTrackingData((prev) => ({ ...prev, [id]: { loading: false, ...data } }))
        // Update in-memory shipment status too
        setShipments((prev) =>
          prev.map((s) =>
            s.id === id
              ? { ...s, status: data.status, liveDescription: data.description, liveLocation: data.location, liveLastUpdated: data.lastUpdated }
              : s
          )
        )
      } else if (data.error === 'not_configured') {
        setTrackingData((prev) => ({ ...prev, [id]: { loading: false, notConfigured: true } }))
      } else if (data.error === 'unsupported') {
        setTrackingData((prev) => ({ ...prev, [id]: { loading: false, unsupported: true } }))
      } else {
        setTrackingData((prev) => ({ ...prev, [id]: { loading: false, error: data.error || 'Unknown error' } }))
      }
    } catch {
      setTrackingData((prev) => ({ ...prev, [id]: { loading: false, error: 'Network error' } }))
    }
  }

  async function refreshAllFedex() {
    setRefreshingAll(true)
    const fedex = shipments.filter((s) => s.courierCode?.toUpperCase() === 'FEDEX' && s.status !== 'delivered')
    await Promise.all(fedex.map((s) => fetchTracking(s.id)))
    setRefreshingAll(false)
  }

  useEffect(() => { loadCouriers(); loadShipments() }, [])

  // ── Courier CRUD ──
  function openAddCourier() {
    setEditingCourierId(null)
    setCourierForm(EMPTY_COURIER)
    setShowCourierModal(true)
  }
  function openEditCourier(c: Courier) {
    setEditingCourierId(c.id)
    setCourierForm({ name: c.name, code: c.code, contactName: c.contactName, email: c.email, phone: c.phone, trackingUrl: c.trackingUrl, notes: c.notes, isActive: c.isActive !== false })
    setShowCourierModal(true)
    setOpenActionId(null)
  }
  async function handleSaveCourier() {
    if (!courierForm.name.trim()) return
    setSavingCourier(true)
    try {
      if (editingCourierId) {
        await fetch(`/api/admin/shipping-network/${editingCourierId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(courierForm) })
      } else {
        await fetch('/api/admin/shipping-network', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(courierForm) })
      }
      setShowCourierModal(false)
      await loadCouriers()
    } finally { setSavingCourier(false) }
  }
  async function handleDeleteCourier(id: string) {
    if (!confirm('Delete this courier?')) return
    setOpenActionId(null)
    await fetch(`/api/admin/shipping-network/${id}`, { method: 'DELETE' })
    await loadCouriers()
  }

  // ── Shipment CRUD ──
  function openAddShipment() {
    setEditingShipmentId(null)
    setShipmentForm({ ...EMPTY_SHIPMENT, dateShipped: new Date().toISOString().split('T')[0] })
    setShowShipmentModal(true)
  }
  function openEditShipment(s: Shipment) {
    setEditingShipmentId(s.id)
    setShipmentForm({ trackingNumber: s.trackingNumber, courierId: s.courierId, courierName: s.courierName, courierCode: s.courierCode, reference: s.reference, dateShipped: s.dateShipped, status: s.status, notes: s.notes })
    setShowShipmentModal(true)
    setOpenShipmentActionId(null)
  }
  function handleCourierSelect(courierId: string) {
    const c = couriers.find((x) => x.id === courierId)
    setShipmentForm((f) => ({ ...f, courierId, courierName: c?.name || '', courierCode: c?.code || '' }))
  }
  async function handleSaveShipment() {
    if (!shipmentForm.trackingNumber.trim()) return
    setSavingShipment(true)
    try {
      if (editingShipmentId) {
        await fetch(`/api/admin/shipments/${editingShipmentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(shipmentForm) })
      } else {
        const res = await fetch('/api/admin/shipments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(shipmentForm) })
        const created = await res.json()
        // Auto-track new FedEx shipment immediately
        if (shipmentForm.courierCode?.toUpperCase() === 'FEDEX' && created.id) {
          setTimeout(() => fetchTracking(created.id), 500)
        }
      }
      setShowShipmentModal(false)
      await loadShipments(true)
    } finally { setSavingShipment(false) }
  }
  async function handleDeleteShipment(id: string) {
    if (!confirm('Remove this shipment?')) return
    setOpenShipmentActionId(null)
    await fetch(`/api/admin/shipments/${id}`, { method: 'DELETE' })
    setShipments((prev) => prev.filter((s) => s.id !== id))
    setTrackingData((prev) => { const n = { ...prev }; delete n[id]; return n })
  }

  const filteredCouriers = couriers.filter((c) => {
    const q = courierSearch.toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
  })

  const filteredShipments = shipments.filter((s) => {
    const q = shipmentSearch.toLowerCase()
    return !q || s.trackingNumber.toLowerCase().includes(q) || s.courierName.toLowerCase().includes(q) || s.reference.toLowerCase().includes(q)
  })

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* ═══ COURIERS SECTION ═══ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shipping Network</h1>
            <p className="text-sm text-gray-500 mt-0.5">{couriers.length} courier{couriers.length !== 1 ? 's' : ''} saved</p>
          </div>
          <button onClick={openAddCourier} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
            + Add Courier
          </button>
        </div>

        <div className="mb-4">
          <input type="text" value={courierSearch} onChange={(e) => setCourierSearch(e.target.value)} placeholder="Search by name, code or email…" className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {couriersLoading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>
          ) : filteredCouriers.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">{courierSearch ? 'No couriers match your search.' : 'No couriers yet.'}</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tracking</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide sticky right-0 bg-gray-50 shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.07)]">Actions</th>
                </tr>
              </thead>
              <tbody ref={actionsRef}>
                {filteredCouriers.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{c.name}</td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-600">{c.code || '—'}</td>
                    <td className="py-3 px-4 text-gray-700">{c.contactName || '—'}</td>
                    <td className="py-3 px-4">{c.email ? <a href={`mailto:${c.email}`} className="text-blue-600 hover:underline">{c.email}</a> : '—'}</td>
                    <td className="py-3 px-4 text-gray-700">{c.phone || '—'}</td>
                    <td className="py-3 px-4">
                      {c.trackingUrl ? (
                        <a href={c.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                          {c.trackingUrl.replace(/^https?:\/\//, '').split('/')[0]}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs break-words max-w-[160px]">{c.notes || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center sticky right-0 bg-white shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.07)]" style={{ zIndex: openActionId === c.id ? 9999 : undefined }}>
                      <div className="relative inline-block">
                        <button onClick={() => setOpenActionId(openActionId === c.id ? null : c.id)} className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1">
                          Actions <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {openActionId === c.id && (
                          <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] py-1">
                            <button onClick={() => openEditCourier(c)} className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 w-full text-left">✏️ Edit</button>
                            <div className="border-t border-gray-100 my-1" />
                            <button onClick={() => handleDeleteCourier(c.id)} className="flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 w-full text-left">🗑️ Delete</button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ═══ SHIPMENTS TRACKING SECTION ═══ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Live Shipment Tracking</h2>
              <p className="text-sm text-gray-500 mt-0.5">{shipments.length} shipment{shipments.length !== 1 ? 's' : ''} logged</p>
            </div>
            <button
              onClick={refreshAllFedex}
              disabled={refreshingAll}
              title="Refresh all FedEx shipments"
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
            >
              <RefreshIcon spinning={refreshingAll} />
            </button>
          </div>
          <button onClick={openAddShipment} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            + Log Shipment
          </button>
        </div>

        <div className="mb-4">
          <input type="text" value={shipmentSearch} onChange={(e) => setShipmentSearch(e.target.value)} placeholder="Search by tracking #, courier or reference…" className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {shipmentsLoading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>
          ) : filteredShipments.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              {shipmentSearch ? 'No shipments match your search.' : 'No shipments logged yet. Click "+ Log Shipment" to start tracking.'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tracking #</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Courier</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reference</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date Shipped</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Live Status</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Track</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide sticky right-0 bg-gray-50 shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.07)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.map((s) => {
                  const td = trackingData[s.id]
                  const courier = couriers.find((c) => c.id === s.courierId)
                  const trackUrl = buildTrackUrl(s.courierCode, s.trackingNumber, courier?.trackingUrl || '')
                  const isFedex = s.courierCode?.toUpperCase() === 'FEDEX'

                  // Use live status if available, fall back to stored status
                  const displayStatus = td?.status || s.status
                  const displayDescription = td?.description || s.liveDescription
                  const displayLocation = td?.location || s.liveLocation
                  const displayLastUpdated = td?.lastUpdated || s.liveLastUpdated

                  return (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      {/* Tracking # */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-semibold text-gray-800">{s.trackingNumber}</span>
                        {/* Last event description */}
                        {displayDescription && (
                          <p className="text-[11px] text-gray-500 mt-0.5 max-w-[200px]">{displayDescription}</p>
                        )}
                        {/* Location */}
                        {displayLocation && (
                          <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-0.5">
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {displayLocation}
                          </p>
                        )}
                        {/* Error */}
                        {td?.error && !td.loading && (
                          <p className="text-[11px] text-red-500 mt-0.5">⚠️ {td.error}</p>
                        )}
                        {td?.notConfigured && (
                          <p className="text-[11px] text-amber-600 mt-0.5">⚙️ Add FEDEX_CLIENT_ID + FEDEX_CLIENT_SECRET to enable live tracking</p>
                        )}
                      </td>

                      {/* Courier */}
                      <td className="py-3 px-4 text-gray-700">{s.courierName || '—'}</td>

                      {/* Reference */}
                      <td className="py-3 px-4 text-gray-700">{s.reference || '—'}</td>

                      {/* Date */}
                      <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                        {s.dateShipped ? new Date(s.dateShipped + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>

                      {/* Live Status */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {/* Truck icon */}
                          <TruckIcon className={`w-4 h-4 flex-shrink-0 ${displayStatus === 'delivered' ? 'text-green-600' : displayStatus === 'out-for-delivery' ? 'text-purple-600' : 'text-blue-500'}`} />
                          {/* Status badge */}
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${STATUS_STYLES[displayStatus] || 'bg-gray-100 text-gray-600'}`}>
                            {STATUS_LABELS[displayStatus] || displayStatus}
                          </span>
                          {/* Spinning while fetching */}
                          {td?.loading && <SpinIcon className="w-3 h-3 text-gray-400" />}
                        </div>
                        {/* Last updated timestamp */}
                        {displayLastUpdated && !td?.loading && (
                          <p className="text-[10px] text-gray-400 mt-1 ml-0.5">↻ {formatRelativeTime(displayLastUpdated)}</p>
                        )}
                        {/* Show event history toggle for FedEx with data */}
                        {isFedex && td?.events && td.events.length > 0 && (
                          <button
                            onClick={() => setExpandedEvents(expandedEvents === s.id ? null : s.id)}
                            className="text-[10px] text-blue-500 hover:text-blue-700 mt-0.5 ml-0.5"
                          >
                            {expandedEvents === s.id ? '▲ hide history' : `▼ ${td.events.length} events`}
                          </button>
                        )}
                        {/* Event history dropdown */}
                        {expandedEvents === s.id && td?.events && (
                          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto border border-gray-100 rounded-lg p-2 bg-gray-50">
                            {td.events.map((ev, i) => (
                              <div key={i} className="text-[10px] leading-tight">
                                <span className="text-gray-400">{ev.timestamp ? new Date(ev.timestamp).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                <span className="text-gray-700 ml-1">{ev.description}</span>
                                {ev.location && <span className="text-gray-400 ml-1">· {ev.location}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Track + Refresh */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Refresh live tracking */}
                          {(isFedex) && (
                            <button
                              onClick={() => fetchTracking(s.id)}
                              disabled={td?.loading}
                              title="Refresh live tracking"
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40"
                            >
                              <RefreshIcon className="w-3.5 h-3.5" spinning={!!td?.loading} />
                            </button>
                          )}
                          {/* External track link */}
                          <a
                            href={trackUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Track
                          </a>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center sticky right-0 bg-white shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.07)]" style={{ zIndex: openShipmentActionId === s.id ? 9999 : undefined }}>
                        <div className="relative inline-block">
                          <button onClick={() => setOpenShipmentActionId(openShipmentActionId === s.id ? null : s.id)} className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1">
                            Actions <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          {openShipmentActionId === s.id && (
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] py-1">
                              <button onClick={() => openEditShipment(s)} className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 w-full text-left">✏️ Edit</button>
                              <div className="border-t border-gray-100 my-1" />
                              <button onClick={() => handleDeleteShipment(s.id)} className="flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 w-full text-left">🗑️ Remove</button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── Courier Add/Edit Modal ─── */}
      {showCourierModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-base font-semibold text-gray-900">{editingCourierId ? 'Edit Courier' : 'Add Courier'}</h2>
              <button onClick={() => setShowCourierModal(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                  <input type="text" value={courierForm.name} onChange={(e) => setCourierForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. The Courier Guy" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
                  <input type="text" value={courierForm.code} onChange={(e) => setCourierForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. TCG" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contact Name</label>
                  <input type="text" value={courierForm.contactName} onChange={(e) => setCourierForm((f) => ({ ...f, contactName: e.target.value }))} placeholder="Account manager" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <input type="text" value={courierForm.phone} onChange={(e) => setCourierForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+27 11 123 4567" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={courierForm.email} onChange={(e) => setCourierForm((f) => ({ ...f, email: e.target.value }))} placeholder="support@courier.co.za" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tracking URL</label>
                <input type="url" value={courierForm.trackingUrl} onChange={(e) => setCourierForm((f) => ({ ...f, trackingUrl: e.target.value }))} placeholder="https://tracking.courier.co.za" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={courierForm.notes} onChange={(e) => setCourierForm((f) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Account number, rates, special instructions…" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={courierForm.isActive !== false} onChange={(e) => setCourierForm((f) => ({ ...f, isActive: e.target.checked }))} className="h-4 w-4 accent-gray-900 cursor-pointer" />
                <label htmlFor="isActive" className="text-sm text-gray-700 cursor-pointer">Active courier</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowCourierModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSaveCourier} disabled={savingCourier || !courierForm.name.trim()} className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 disabled:opacity-50">
                {savingCourier ? 'Saving…' : editingCourierId ? 'Save Changes' : 'Add Courier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Shipment Add/Edit Modal ─── */}
      {showShipmentModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-base font-semibold text-gray-900">{editingShipmentId ? 'Edit Shipment' : 'Log Shipment'}</h2>
              <button onClick={() => setShowShipmentModal(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tracking Number <span className="text-red-500">*</span></label>
                <input type="text" value={shipmentForm.trackingNumber} onChange={(e) => setShipmentForm((f) => ({ ...f, trackingNumber: e.target.value }))} placeholder="e.g. 1234567890" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Courier</label>
                  <select value={shipmentForm.courierId} onChange={(e) => handleCourierSelect(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Select courier…</option>
                    {couriers.filter((c) => c.isActive !== false).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date Shipped</label>
                  <input type="date" value={shipmentForm.dateShipped} onChange={(e) => setShipmentForm((f) => ({ ...f, dateShipped: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reference (customer / order)</label>
                <input type="text" value={shipmentForm.reference} onChange={(e) => setShipmentForm((f) => ({ ...f, reference: e.target.value }))} placeholder="e.g. John Smith – RS0303" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={shipmentForm.notes} onChange={(e) => setShipmentForm((f) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Contents, special instructions…" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowShipmentModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSaveShipment} disabled={savingShipment || !shipmentForm.trackingNumber.trim()} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {savingShipment ? 'Saving…' : editingShipmentId ? 'Save Changes' : 'Log Shipment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
