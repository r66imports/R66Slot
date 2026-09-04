import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import {
  PHOTON_URL,
  COUNTRY_TO_ISO,
  COUNTRY_BBOX,
  parseFeature,
  type AddressSuggestion,
} from '@/lib/address-lookup'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

/**
 * POST /api/address/lookup  { input, country? }
 *
 * Address type-ahead via Photon (OpenStreetMap). Signed-in customers only — the
 * public Photon instance is a free service used on our behalf, so this is not
 * left open to anonymous traffic.
 *
 * Every failure answers 200 with an empty list rather than an error: a lookup
 * that cannot reach Photon should leave the user typing their address by hand,
 * not staring at an error on every keystroke.
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('customer_token')?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    jwt.verify(token, JWT_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { input, country } = await request.json().catch(() => ({}) as any)
  if (typeof input !== 'string' || input.trim().length < 3) {
    return NextResponse.json({ suggestions: [] })
  }

  const iso = COUNTRY_TO_ISO[country as string]

  try {
    const url = new URL('/api', PHOTON_URL)
    url.searchParams.set('q', input.trim())
    url.searchParams.set('lang', 'en')
    // Over-fetch: results are filtered to the chosen country below, then trimmed.
    url.searchParams.set('limit', '20')
    // Streets and buildings only — no lakes, shops or country names.
    url.searchParams.append('layer', 'house')
    url.searchParams.append('layer', 'street')

    // Photon has no country parameter — a bounding box is what actually keeps
    // results inside the country chosen in the form. Without it, "12 Long Street"
    // returns nothing but British and Australian addresses.
    const bbox = iso ? COUNTRY_BBOX[iso] : undefined
    if (bbox) url.searchParams.set('bbox', bbox)

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'R66Slot/1.0 (+https://r66slot.co.za)' },
      // Photon is fast; give up rather than hold the form's spinner open.
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      console.error('Photon lookup failed', res.status)
      return NextResponse.json({ suggestions: [] })
    }

    const data = await res.json()
    const seen = new Set<string>()
    const suggestions: AddressSuggestion[] = (data.features || [])
      // bbox restricts the area; this drops the few strays that straddle a border.
      .filter((f: any) => !iso || (f.properties?.countrycode || '').toUpperCase() === iso)
      .map(parseFeature)
      .filter((s: AddressSuggestion | null): s is AddressSuggestion => s !== null)
      // OSM often holds a street as several segments; collapse them to one entry.
      .filter((s: AddressSuggestion) => {
        const key = `${s.mainText}|${s.secondaryText}`.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 8)

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Photon lookup error', error)
    return NextResponse.json({ suggestions: [] })
  }
}
