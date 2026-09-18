import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import { DEFAULT_COSTING_ACCOUNTS } from '@/lib/preorder-pricing'
import type { CostingAccount } from '@/types/supplier-preorder'

const KEY = 'data/costing-accounts.json'

/**
 * Costing profiles for the two importing entities. Seeded from
 * DEFAULT_COSTING_ACCOUNTS and edited under Settings — the seeded percentages
 * are a starting point, not measured figures.
 */
async function getCostingAccounts(): Promise<CostingAccount[]> {
  const saved = await blobRead<CostingAccount[]>(KEY, [])
  if (saved.length === 0) return DEFAULT_COSTING_ACCOUNTS
  // Union with defaults so a newly added entity appears without a migration.
  return DEFAULT_COSTING_ACCOUNTS.map((d) => saved.find((s) => s.id === d.id) || d)
}

export async function GET() {
  try {
    return NextResponse.json(await getCostingAccounts())
  } catch {
    return NextResponse.json(DEFAULT_COSTING_ACCOUNTS)
  }
}

const num = (v: unknown, fallback: number) => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

// PUT — save one account's percentages.
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const id = (body.id || '').trim()
    if (id !== 'JDM' && id !== 'R66') {
      return NextResponse.json({ error: 'id must be JDM or R66' }, { status: 400 })
    }

    const accounts = await getCostingAccounts()
    const idx = accounts.findIndex((a) => a.id === id)
    const current = accounts[idx]

    const updated: CostingAccount = {
      ...current,
      name: (body.name || '').trim() || current.name,
      shippingPct: num(body.shippingPct, current.shippingPct),
      customsPct: num(body.customsPct, current.customsPct),
      handlingPct: num(body.handlingPct, current.handlingPct),
      markupPct: num(body.markupPct, current.markupPct),
      vatPct: num(body.vatPct, current.vatPct),
      landedMultiplier: num(body.landedMultiplier, current.landedMultiplier) || 1,
    }

    accounts[idx] = updated
    await blobWrite(KEY, accounts)
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save' }, { status: 500 })
  }
}
