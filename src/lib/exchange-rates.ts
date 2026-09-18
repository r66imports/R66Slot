import { blobRead, blobWrite } from '@/lib/blob-storage'

/**
 * Live FX with a one-hour cache, shared by the admin exchange-rate route and the
 * customer-facing supplier catalogue. It lives here rather than in the route so
 * the storefront can price a sheet without reaching through /api/admin/*, which
 * middleware closes by default.
 */

const CACHE_KEY = 'data/exchange-rates.json'
const CACHE_TTL_MS = 60 * 60 * 1000

export interface RateCache {
  /** currency code → ZAR value (1 unit of code = X ZAR) */
  rates: Record<string, number>
  fetchedAt: string
}

export type RateSource = 'cache' | 'live' | 'stale-cache'

export async function fetchLiveRates(): Promise<Record<string, number>> {
  const res = await fetch('https://api.exchangerate-api.com/v4/latest/ZAR', {
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`Exchange rate API returned ${res.status}`)
  const data = (await res.json()) as { rates: Record<string, number> }
  if (!data.rates) throw new Error('No rates in response')

  // The API gives units-of-code per 1 ZAR; we want ZAR per 1 unit of code.
  const toZAR: Record<string, number> = { ZAR: 1 }
  for (const [code, ratePerZAR] of Object.entries(data.rates)) {
    if (ratePerZAR > 0) toZAR[code] = 1 / ratePerZAR
  }
  return toZAR
}

export async function refreshRates(): Promise<RateCache> {
  const rates = await fetchLiveRates()
  const fetchedAt = new Date().toISOString()
  await blobWrite(CACHE_KEY, { rates, fetchedAt })
  return { rates, fetchedAt }
}

/**
 * Cached rates, refreshed when stale. Never throws — a dead FX API falls back to
 * the last good cache so a sheet still renders prices rather than blanking out.
 */
export async function getRates(): Promise<RateCache & { source: RateSource }> {
  const cached = await blobRead<RateCache>(CACHE_KEY, { rates: {}, fetchedAt: '' })
  const age = cached.fetchedAt ? Date.now() - new Date(cached.fetchedAt).getTime() : Infinity

  if (age < CACHE_TTL_MS && Object.keys(cached.rates).length > 0) {
    return { ...cached, source: 'cache' }
  }

  try {
    const fresh = await refreshRates()
    return { ...fresh, source: 'live' }
  } catch {
    if (Object.keys(cached.rates).length > 0) return { ...cached, source: 'stale-cache' }
    return { rates: { ZAR: 1 }, fetchedAt: '', source: 'stale-cache' }
  }
}

/** ZAR per 1 unit of `code`. Falls back to 1 for ZAR and 0 for an unknown code. */
export function rateFor(rates: Record<string, number>, code: string): number {
  const c = (code || 'ZAR').toUpperCase()
  if (c === 'ZAR') return 1
  return rates[c] || 0
}
