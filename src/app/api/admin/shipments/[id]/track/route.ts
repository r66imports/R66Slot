import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import type { Shipment } from '../../route'

const KEY = 'data/shipments.json'

// Set FEDEX_ENV=sandbox in Railway to use sandbox credentials, omit for production
const FEDEX_BASE = process.env.FEDEX_ENV === 'sandbox'
  ? 'https://apis-sandbox.fedex.com'
  : 'https://apis.fedex.com'

// ─── FedEx token cache (scoped to current FEDEX_BASE) ────────────────────────
let fedexToken: { value: string; expiresAt: number; base: string } | null = null

async function getFedexToken(): Promise<string> {
  if (fedexToken && fedexToken.base === FEDEX_BASE && Date.now() < fedexToken.expiresAt - 60_000) return fedexToken.value
  const res = await fetch(`${FEDEX_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.FEDEX_CLIENT_ID!,
      client_secret: process.env.FEDEX_CLIENT_SECRET!,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`FedEx auth failed (${res.status}): ${err}`)
  }
  const data = await res.json()
  fedexToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000, base: FEDEX_BASE }
  return fedexToken.value
}

// ─── FedEx status code → our status ──────────────────────────────────────────
function fedexCodeToStatus(code: string): Shipment['status'] {
  switch (code?.toUpperCase()) {
    case 'OC': case 'PL': case 'AR': return 'pending'
    case 'PU': case 'IT': case 'DP': case 'EA': return 'in-transit'
    case 'OD': return 'out-for-delivery'
    case 'DL': return 'delivered'
    case 'DE': case 'CA': return 'failed'
    case 'RS': return 'returned'
    default:   return 'in-transit'
  }
}

// ─── FedEx live tracking ──────────────────────────────────────────────────────
async function trackFedex(trackingNumber: string) {
  const token = await getFedexToken()
  const res = await fetch(`${FEDEX_BASE}/track/v1/trackingnumbers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-locale': 'en_US',
    },
    body: JSON.stringify({
      trackingInfo: [{ trackingNumberInfo: { trackingNumber } }],
      includeDetailedScans: true,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`FedEx tracking failed (${res.status}): ${err}`)
  }
  const data = await res.json()
  const result = data?.output?.completeTrackResults?.[0]?.trackResults?.[0]
  if (!result) throw new Error('No tracking result returned by FedEx')

  const latest = result.latestStatusDetail
  const statusCode: string = latest?.code || latest?.derivedCode || 'IT'
  const description: string = latest?.statusByLocale || latest?.description || 'In transit'

  // Most recent scan event (FedEx returns newest first)
  const scans: any[] = result.scanEvents || []
  const topScan = scans[0]
  const location = topScan?.scanLocation
    ? [topScan.scanLocation.city, topScan.scanLocation.stateOrProvinceCode, topScan.scanLocation.countryName]
        .filter(Boolean).join(', ')
    : undefined

  const events = scans.slice(0, 15).map((e: any) => ({
    timestamp: e.date,
    description: e.eventDescription || e.derivedStatus || '',
    location: e.scanLocation
      ? [e.scanLocation.city, e.scanLocation.stateOrProvinceCode, e.scanLocation.countryName]
          .filter(Boolean).join(', ')
      : undefined,
  }))

  return {
    status: fedexCodeToStatus(statusCode),
    statusCode,
    description,
    location,
    events,
    lastUpdated: new Date().toISOString(),
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const shipments = await blobRead<Shipment[]>(KEY, [])
    const shipment = shipments.find((s) => s.id === id)
    if (!shipment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const code = shipment.courierCode?.toUpperCase()

    if (code === 'FEDEX') {
      if (!process.env.FEDEX_CLIENT_ID || !process.env.FEDEX_CLIENT_SECRET) {
        return NextResponse.json({
          error: 'not_configured',
          message: 'Add FEDEX_CLIENT_ID and FEDEX_CLIENT_SECRET to Railway environment variables',
        }, { status: 501 })
      }

      const result = await trackFedex(shipment.trackingNumber)

      // Persist live fields back to blob so they survive page refreshes
      const idx = shipments.findIndex((s) => s.id === id)
      if (idx !== -1) {
        shipments[idx] = {
          ...shipments[idx],
          status: result.status,
          liveDescription: result.description,
          liveLocation: result.location || '',
          liveLastUpdated: result.lastUpdated,
        }
        await blobWrite(KEY, shipments)
      }

      return NextResponse.json(result)
    }

    return NextResponse.json({
      error: 'unsupported',
      message: `Live tracking not available for ${shipment.courierName || code}`,
    }, { status: 501 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
