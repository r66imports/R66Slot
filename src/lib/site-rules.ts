/**
 * Site Rules — server-side helper
 *
 * Use this in any API route or server component to check whether a rule
 * is active or to read its configured value.
 *
 * Rule IDs:
 *   site_font              — Rule 0
 *   enforce_stock_limit    — Rule 1
 *   auto_create_product    — Rule 2
 *   invoice_stock_deduction— Rule 3
 *   backorder_to_invoice   — Rule 4
 *   document_shipping      — Rule 5
 *   invoice_price_type     — Rule 6
 */

import { blobRead } from '@/lib/blob-storage'

const KEY = 'data/site-rules.json'

interface StoredRule {
  id: string
  active: boolean
  value?: string
}

async function loadRules(): Promise<StoredRule[]> {
  try {
    return await blobRead<StoredRule[]>(KEY, [])
  } catch {
    return []
  }
}

/** Returns true if the rule is active. Falls back to `defaultActive` if the rule is not found. */
export async function isRuleActive(id: string, defaultActive = true): Promise<boolean> {
  const rules = await loadRules()
  const rule = rules.find((r) => r.id === id)
  return rule !== undefined ? rule.active : defaultActive
}

/** Returns the configured value for a rule (e.g. 'retail' for invoice_price_type). */
export async function getRuleValue(id: string): Promise<string | undefined> {
  const rules = await loadRules()
  return rules.find((r) => r.id === id)?.value
}
