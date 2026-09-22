import type { CostingAccount, CostingAccountId, SupplierPreOrderLine } from '@/types/supplier-preorder'

/**
 * The one implementation of the Supplier Pre Order estimate. The client sheet,
 * the admin review page and the quote all call through here so the three can
 * never drift apart.
 *
 * The formula mirrors the Worksheet (admin/worksheet/page.tsx, calcFinalLanded /
 * calcEntityFinalLanded / calcFinalRetail) so an estimate made months before the
 * shipment lands on the same number the Worksheet produces when it arrives:
 *
 *   landed = wholesale × exRate × (1 + (shipping% + customs% + handling%)/100)
 *   landed = landed × landedMultiplier        // R66 = 1.15, JDM = 1
 *   retail = landed × (1 + markup%) × (1 + vat%)
 */

/**
 * Seeded to match the Business Calculator (components/admin/costing-modal.tsx).
 * That calculator carries shipping and customs as a single 45% figure; it is
 * split here into its 25% shipping / 20% customs parts so the two can be tuned
 * separately, but 25 + 20 must keep summing to whatever the calculator uses or
 * the two will quote different prices for the same item.
 */
export const DEFAULT_COSTING_ACCOUNTS: CostingAccount[] = [
  {
    id: 'JDM',
    name: 'JDM Garage PTY LTD',
    shippingPct: 25,
    customsPct: 20,
    handlingPct: 0,
    markupPct: 30,
    /**
     * Zero. A pre-order estimate is quoted WITHOUT VAT on R66Slot (user,
     * 22 Sept 2026), matching the Pre-Order Dashboard's own VAT default and the
     * Worksheet, whose vatPct has always defaulted to 0. Kept as a field so it
     * can be raised on the Costing Accounts panel without a deploy.
     *
     * NOTE: these accounts are stored in data/costing-accounts.json and the
     * stored copy WINS over this default, so changing it here alone does
     * nothing to a live site -- the blob must be PATCHed too.
     */
    vatPct: 0,
    landedMultiplier: 1,
  },
  {
    id: 'R66',
    name: 'Route 66 Imports PTY LTD',
    shippingPct: 25,
    customsPct: 20,
    handlingPct: 0,
    markupPct: 30,
    /**
     * Zero. A pre-order estimate is quoted WITHOUT VAT on R66Slot (user,
     * 22 Sept 2026), matching the Pre-Order Dashboard's own VAT default and the
     * Worksheet, whose vatPct has always defaulted to 0. Kept as a field so it
     * can be raised on the Costing Accounts panel without a deploy.
     *
     * NOTE: these accounts are stored in data/costing-accounts.json and the
     * stored copy WINS over this default, so changing it here alone does
     * nothing to a live site -- the blob must be PATCHed too.
     */
    vatPct: 0,
    /**
     * 1, not 1.15. The Worksheet's calcEntityFinalLanded adds 15% on landed for
     * R66 as an internal inter-company figure, but the Business Calculator's
     * Spare Parts mode — which is what a client is quoted against — does not.
     * The client estimate follows the calculator, so both accounts price the
     * same item identically. Kept as a field so it can be raised on the Costing
     * Accounts panel without a deploy.
     */
    landedMultiplier: 1,
  },
]

export function accountById(accounts: CostingAccount[], id: CostingAccountId | undefined): CostingAccount {
  return (
    accounts.find((a) => a.id === id) ||
    accounts.find((a) => a.id === 'JDM') ||
    DEFAULT_COSTING_ACCOUNTS[0]
  )
}

/** Landed cost per unit in ZAR, before markup and VAT. */
export function calcLandedZAR(wholesale: number, exRate: number, account: CostingAccount): number {
  const w = Number(wholesale) || 0
  const r = Number(exRate) || 0
  if (w <= 0 || r <= 0) return 0
  const pct = (account.shippingPct || 0) + (account.customsPct || 0) + (account.handlingPct || 0)
  const base = w * r * (1 + pct / 100)
  return base * (account.landedMultiplier || 1)
}

/**
 * A supplier who bills us in Rands is local: nothing was shipped in and nothing
 * was cleared through customs, so the import percentages in calcEstRetailZAR
 * would invent a cost we never paid. Local retail is a price we set, not one we
 * derive — the estimate comes from Inventory instead (Rule 65).
 */
export function isLocalSupplierCurrency(code: string): boolean {
  return (code || '').trim().toUpperCase() === 'ZAR'
}

/** Estimated retail per unit in ZAR, incl. markup and VAT. */
export function calcEstRetailZAR(wholesale: number, exRate: number, account: CostingAccount): number {
  const landed = calcLandedZAR(wholesale, exRate, account)
  if (landed <= 0) return 0
  return landed * (1 + (account.markupPct || 0) / 100) * (1 + (account.vatPct || 0) / 100)
}

/**
 * Per-unit estimate for a saved line. A line the Worksheet has already finalised
 * keeps its locked price — the live rate must not move a price we have committed
 * to. Everything else re-prices against the current rate on every read.
 */
export function lineEstRetailZAR(
  line: Pick<SupplierPreOrderLine, 'wholesalePrice' | 'estRetailZAR' | 'priceLocked' | 'currency'>,
  exRate: number,
  account: CostingAccount
): number {
  if (line.priceLocked) return Number(line.estRetailZAR) || 0
  // A local supplier's line was priced from Inventory and never went through
  // the calculator (Rule 65); recomputing it would re-add shipping and customs
  // that were never paid, and quietly undo the stored figure on every read.
  const calculated = isLocalSupplierCurrency(line.currency)
    ? 0
    : calcEstRetailZAR(line.wholesalePrice, exRate, account)
  // No wholesale price means the line was priced from what we already sell the
  // item for, not through the calculator. Recomputing would return 0 and blank
  // the price out on every read, so the stored figure stands.
  return calculated > 0 ? calculated : Number(line.estRetailZAR) || 0
}

/** Order total in ZAR across active lines only — rejected lines do not count. */
export function preOrderTotalZAR(
  lines: SupplierPreOrderLine[],
  exRate: number,
  account: CostingAccount
): number {
  return lines
    .filter((l) => l.status !== 'rejected')
    .reduce((sum, l) => sum + (Number(l.qty) || 0) * lineEstRetailZAR(l, exRate, account), 0)
}

/** House format: R1 000.00 — space thousands separator, always two decimals. */
export function formatZAR(n: number): string {
  const v = Number(n) || 0
  return `R${v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`
}

/**
 * Natural sort for SKUs so RS10 comes before RS100 and after RS9, which a plain
 * string sort gets wrong on exactly the catalogues clients browse most.
 */
export function compareSku(a: string, b: string): number {
  const chunk = (s: string) => (s || '').toUpperCase().match(/\d+|\D+/g) || []
  const ca = chunk(a)
  const cb = chunk(b)
  for (let i = 0; i < Math.max(ca.length, cb.length); i++) {
    const x = ca[i]
    const y = cb[i]
    if (x === undefined) return -1
    if (y === undefined) return 1
    const nx = /^\d/.test(x)
    const ny = /^\d/.test(y)
    if (nx && ny) {
      const d = parseInt(x, 10) - parseInt(y, 10)
      if (d !== 0) return d
    } else if (x !== y) {
      return x < y ? -1 : 1
    }
  }
  return 0
}
