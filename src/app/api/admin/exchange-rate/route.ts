import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const CACHE_KEY = 'data/exchange-rates.json'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

interface RateCache {
  rates: Record<string, number>  // currency code → ZAR value (1 unit = X ZAR)
  fetchedAt: string
}

async function fetchLiveRates(): Promise<Record<string, number>> {
  const res = await fetch('https://api.exchangerate-api.com/v4/latest/ZAR', {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`Exchange rate API returned ${res.status}`)
  const data = await res.json() as { rates: Record<string, number> }
  if (!data.rates) throw new Error('No rates in response')

  // Convert: data.rates[code] = how many units of code per 1 ZAR
  // We want: how many ZAR per 1 unit of code → invert
  const toZAR: Record<string, number> = { ZAR: 1 }
  for (const [code, ratePerZAR] of Object.entries(data.rates)) {
    if (ratePerZAR > 0) toZAR[code] = 1 / ratePerZAR
  }
  return toZAR
}

export async function GET() {
  try {
    const cached = await blobRead<RateCache>(CACHE_KEY, { rates: {}, fetchedAt: '' })
    const age = cached.fetchedAt ? Date.now() - new Date(cached.fetchedAt).getTime() : Infinity

    if (age < CACHE_TTL_MS && Object.keys(cached.rates).length > 0) {
      return NextResponse.json({ rates: cached.rates, fetchedAt: cached.fetchedAt, source: 'cache' })
    }

    const rates = await fetchLiveRates()
    const fetchedAt = new Date().toISOString()
    await blobWrite(CACHE_KEY, { rates, fetchedAt })

    return NextResponse.json({ rates, fetchedAt, source: 'live' })
  } catch (err: any) {
    const cached = await blobRead<RateCache>(CACHE_KEY, { rates: {}, fetchedAt: '' })
    if (Object.keys(cached.rates).length > 0) {
      return NextResponse.json({ rates: cached.rates, fetchedAt: cached.fetchedAt, source: 'stale-cache' })
    }
    return NextResponse.json({ error: err?.message || 'Failed to fetch rates' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const rates = await fetchLiveRates()
    const fetchedAt = new Date().toISOString()
    await blobWrite(CACHE_KEY, { rates, fetchedAt })
    return NextResponse.json({ rates, fetchedAt, source: 'live' })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
