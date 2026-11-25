// Rule 53 — products.price is always full retail; the selling price is derived from
// products.discount_pct. One helper so the grid, product page and cart round alike.
export function retailDiscountPct(product: { discountPct?: number | null }): number {
  return Math.max(0, Math.min(100, Number(product.discountPct) || 0))
}

export function sellingPrice(product: { price?: number | null; discountPct?: number | null }): number {
  const retail = Number(product.price) || 0
  const pct = retailDiscountPct(product)
  return pct ? Math.round(retail * (1 - pct / 100) * 100) / 100 : retail
}

/** R1 000.00 — space thousands, never toLocaleString. */
export function formatRand(n: number): string {
  return `R${(Number(n) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`
}
