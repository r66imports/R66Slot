/**
 * The shipping methods a customer may choose as their preference, in their own
 * back office (Account → Saved Addresses → Preferred Shipping). ONE canonical
 * list — the customer picker, the admin Contacts card and the invoice shipping
 * dropdown all read it, so a label can never drift between what the customer
 * chose and what prints on the invoice.
 */
export interface ShippingOption {
  id: string
  carrier: 'RAM' | 'Courier Guy'
  /** Exactly what appears on the invoice */
  label: string
  /** Kiosk / PostNet options are meaningless without knowing which branch */
  requiresBranch?: boolean
  /** What that branch is called to the customer, e.g. "PostNet Branch" */
  branchLabel?: string
  /** Example branch, shown in the empty input */
  branchPlaceholder?: string
  /** Shown to the customer under the option */
  note?: string
}

export const SHIPPING_OPTIONS: ShippingOption[] = [
  {
    id: 'ram_door_to_door',
    carrier: 'RAM',
    label: 'RAM — Door to Door',
  },
  {
    id: 'ram_door_to_postnet',
    carrier: 'RAM',
    label: 'RAM — Door to PostNet',
    requiresBranch: true,
    branchLabel: 'PostNet Branch',
    branchPlaceholder: 'PostNet Rivonia, Rivonia Junction Centre',
  },
  {
    id: 'cg_kiosk_to_kiosk',
    carrier: 'Courier Guy',
    label: 'Courier Guy — Kiosk to Kiosk',
    requiresBranch: true,
    branchLabel: 'Courier Guy Branch',
    branchPlaceholder: 'Courier Guy Rivonia, Rivonia Junction Centre',
  },
  {
    id: 'cg_door_to_door',
    carrier: 'Courier Guy',
    label: 'Courier Guy — Door to Door',
    note: 'More expensive',
  },
  {
    id: 'cg_door_to_door_insured',
    carrier: 'Courier Guy',
    label: 'Courier Guy — Door to Door with Insurance',
  },
  {
    id: 'cg_kiosk_to_kiosk_insured',
    carrier: 'Courier Guy',
    label: 'Courier Guy — Kiosk to Kiosk with Insurance',
    requiresBranch: true,
    branchLabel: 'Courier Guy Branch',
    branchPlaceholder: 'Courier Guy Rivonia, Rivonia Junction Centre',
  },
]

/**
 * How each carrier's group of options is headed in the customer picker — the
 * carrier name plus whatever the customer needs to know before choosing it.
 */
export const CARRIER_HEADINGS: Record<ShippingOption['carrier'], { title: string; note?: string }> = {
  'RAM': {
    title: 'RAM Shipping',
    note: 'Min shipping rate R87.67 for box size 40 x 30 x 20 — Economy Service (ES)',
  },
  'Courier Guy': {
    title: 'Courier Guy',
  },
}

export function getShippingOption(id?: string | null): ShippingOption | null {
  if (!id) return null
  return SHIPPING_OPTIONS.find(o => o.id === id) || null
}

export function shippingRequiresBranch(id?: string | null): boolean {
  return !!getShippingOption(id)?.requiresBranch
}

/** What to call the branch field for this option — never blank while it shows */
export function shippingBranchLabel(id?: string | null): string {
  return getShippingOption(id)?.branchLabel || 'Branch'
}

export function shippingBranchPlaceholder(id?: string | null): string {
  return getShippingOption(id)?.branchPlaceholder || ''
}

/**
 * The one-line form that prints on the invoice — the option label, with the
 * branch appended when the option needs one.
 */
export function shippingLabel(id?: string | null, branch?: string | null): string {
  const opt = getShippingOption(id)
  if (!opt) return ''
  const b = branch?.trim()
  return opt.requiresBranch && b ? `${opt.label} (${b})` : opt.label
}
