import { NextResponse } from 'next/server'
import { getItems, saveItems, invalidateCache } from '@/lib/preorder-helpers'

// One-off wipe of the retired tier system from Pre-Order Dashboard cards.
//
// Pricing Tier 2 (a second wholesale price at a higher MOQ) and the Sales page tier
// discounts were removed from the code; nothing reads or writes these keys any more.
// This clears what is left in the stored cards so a new pricing system starts clean.
//
// GET  /api/admin/fix/strip-pricing-tiers          -> dry run, returns the plan
// GET  /api/admin/fix/strip-pricing-tiers?apply=1  -> writes

const TIER_KEYS = [
  'wholesalePrice2', 'wholesaleCurrency2', 'supplierSRP2', 'supplierDiscount2',
  'estimatedRetailPrice2', 'moq2Qty', 'moq2Enabled', 'moq2ResellerOnly',
  'salesTier1Discount', 'salesTier2Discount',
]

export async function GET(request: Request) {
  try {
    const apply = new URL(request.url).searchParams.get('apply') === '1'
    const items = await getItems()

    const plan = items
      .map((item: any) => ({ id: item.id, sku: item.sku, keys: TIER_KEYS.filter((k) => k in item) }))
      .filter((p) => p.keys.length > 0)

    if (!apply) return NextResponse.json({ dryRun: true, count: plan.length, plan })
    if (plan.length === 0) return NextResponse.json({ applied: false, count: 0, reason: 'Nothing to strip' })

    const hit = new Set(plan.map((p) => p.id))
    const updated = items.map((item: any) => {
      if (!hit.has(item.id)) return item
      const next = { ...item }
      for (const k of TIER_KEYS) delete next[k]
      return next
    })
    await saveItems(updated)
    invalidateCache()

    return NextResponse.json({ applied: true, count: plan.length, plan })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 })
  }
}
