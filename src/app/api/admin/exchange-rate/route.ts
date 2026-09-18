import { NextResponse } from 'next/server'
import { getRates, refreshRates } from '@/lib/exchange-rates'

// The cache and fetch logic live in @/lib/exchange-rates so the customer-facing
// supplier catalogue can price a sheet without calling through /api/admin/*,
// which middleware closes by default.

export async function GET() {
  const { rates, fetchedAt, source } = await getRates()
  if (Object.keys(rates).length <= 1 && !fetchedAt) {
    return NextResponse.json({ error: 'Failed to fetch rates' }, { status: 500 })
  }
  return NextResponse.json({ rates, fetchedAt, source })
}

export async function POST() {
  try {
    const { rates, fetchedAt } = await refreshRates()
    return NextResponse.json({ rates, fetchedAt, source: 'live' })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
