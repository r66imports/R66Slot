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
  /** Kiosk options are meaningless without knowing which kiosk */
  requiresBranch?: boolean
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
  },
  {
    id: 'cg_kiosk_to_kiosk',
    carrier: 'Courier Guy',
    label: 'Courier Guy — Kiosk to Kiosk',
    requiresBranch: true,
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
  },
]

export function getShippingOption(id?: string | null): ShippingOption | null {
  if (!id) return null
  return SHIPPING_OPTIONS.find(o => o.id === id) || null
}

export function shippingRequiresBranch(id?: string | null): boolean {
  return !!getShippingOption(id)?.requiresBranch
}

/**
 * The one-line form that prints on the invoice — the option label, with the
 * Courier Guy branch appended when the option is a kiosk one.
 */
export function shippingLabel(id?: string | null, branch?: string | null): string {
  const opt = getShippingOption(id)
  if (!opt) return ''
  const b = branch?.trim()
  return opt.requiresBranch && b ? `${opt.label} (${b})` : opt.label
}
