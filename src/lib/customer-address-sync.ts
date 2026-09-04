import { blobRead, blobWrite } from '@/lib/blob-storage'
import { shippingRequiresBranch } from '@/lib/shipping-options'

const ADDRESSES_KEY = 'data/addresses.json'
const CONTACTS_KEY  = 'data/contacts.json'
const CUSTOMERS_KEY = 'data/customers.json'

/**
 * A row of data/addresses.json — written by the customer's own back office
 * (Account → Saved Addresses). Field names differ from the Contact record,
 * which is why the two stores drifted apart before this module existed.
 */
export interface SavedAddress {
  id: string
  customerId: string
  firstName?: string
  lastName?: string
  company?: string
  address1?: string
  address2?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  phone?: string
  isDefault?: boolean
  createdAt?: string
  updatedAt?: string
}

/** Map a customer-account saved address onto the Contact address field names. */
export function addressToContactFields(a: SavedAddress) {
  return {
    addressStreet:     [a.address1, a.address2].map(s => s?.trim()).filter(Boolean).join(', '),
    addressCity:       a.city?.trim()    || '',
    addressProvince:   a.state?.trim()   || '',
    addressPostalCode: a.zip?.trim()     || '',
    addressCountry:    a.country?.trim() || 'South Africa',
  }
}

/**
 * The address that represents this customer: their default, or their only one
 * if they never marked a default.
 */
export function pickDefaultAddress(addresses: SavedAddress[]): SavedAddress | null {
  const def = addresses.find(a => a.isDefault)
  if (def) return def
  return addresses.length === 1 ? addresses[0] : null
}

/** All saved addresses for a customer, resolved by id and/or email. */
export async function getSavedAddresses(
  opts: { customerId?: string; email?: string }
): Promise<SavedAddress[]> {
  const email = opts.email?.trim().toLowerCase() || ''
  const [addresses, customers] = await Promise.all([
    blobRead<SavedAddress[]>(ADDRESSES_KEY, []),
    email ? blobRead<any[]>(CUSTOMERS_KEY, []) : Promise.resolve([] as any[]),
  ])

  const ids = new Set<string>()
  if (opts.customerId) ids.add(opts.customerId)
  if (email) {
    for (const c of customers) {
      if (c.email?.trim().toLowerCase() === email && c.id) ids.add(c.id)
    }
  }
  if (ids.size === 0) return []

  return addresses.filter(a => ids.has(a.customerId))
}

/**
 * Mirror a customer's DEFAULT saved address onto their contact record, so the
 * admin Contacts card and invoice/quote autofill show what the customer
 * actually entered in their back office. Contacts are matched by customerId
 * first, then by email (how the rest of the app links the two stores).
 *
 * FILL-ONLY, NEVER OVERWRITE. A contact address that is already populated is
 * frequently NOT a home address — it is a Courier Guy kiosk, PUDO locker or
 * PostNet branch the admin captured to match the customer's delivery
 * preference. Silently replacing that with a home address would break the
 * delivery. When a contact already has an address the customer's saved
 * addresses are surfaced read-only on the admin Contacts card instead, with a
 * "Use" button so a human decides. Pass { force: true } for that explicit
 * admin action only.
 *
 * Non-fatal by design — the customer's address is already saved by the time
 * this runs, so a failure here must never fail their request.
 */
export async function syncDefaultAddressToContact(
  customerId: string,
  opts: { force?: boolean } = {}
): Promise<boolean> {
  try {
    const [addresses, customers] = await Promise.all([
      blobRead<SavedAddress[]>(ADDRESSES_KEY, []),
      blobRead<any[]>(CUSTOMERS_KEY, []),
    ])

    const target = pickDefaultAddress(addresses.filter(a => a.customerId === customerId))
    if (!target) return false

    const customer = customers.find((c: any) => c.id === customerId)
    const email = customer?.email?.trim().toLowerCase() || ''

    const contacts = await blobRead<any[]>(CONTACTS_KEY, [])
    const idx = contacts.findIndex((c: any) =>
      (c.customerId && c.customerId === customerId) ||
      (email && c.email?.trim().toLowerCase() === email)
    )
    if (idx === -1) return false

    // Don't clobber an address already on the contact — see the note above
    const existing = contacts[idx]
    const hasAddress = !!(existing.addressStreet?.trim() || existing.addressCity?.trim())
    if (hasAddress && !opts.force) return false

    contacts[idx] = {
      ...contacts[idx],
      ...addressToContactFields(target),
      // Never clobber a phone the admin captured — only fill a blank one
      phone: contacts[idx].phone?.trim() || target.phone?.trim() || '',
      updatedAt: new Date().toISOString(),
    }
    await blobWrite(CONTACTS_KEY, contacts)
    return true
  } catch (err: any) {
    console.error('[syncDefaultAddressToContact]', err?.message || err)
    return false
  }
}

/**
 * Mirror the customer's preferred shipping method onto their contact record so
 * the admin Contacts card shows it and the invoice shipping dropdown can
 * prefill from it (Rule 54).
 *
 * Unlike the address sync this DOES overwrite, and deliberately so:
 * preferredShipping is a field only the customer sets, so there is no
 * admin-captured value to protect. Non-fatal — the preference is already saved
 * on the customer record by the time this runs.
 */
export async function syncShippingPreferenceToContact(customerId: string): Promise<boolean> {
  try {
    const customers = await blobRead<any[]>(CUSTOMERS_KEY, [])
    const customer = customers.find((c: any) => c.id === customerId)
    if (!customer) return false

    const preferredShipping = customer.preferredShipping || ''
    const courierGuyBranch = shippingRequiresBranch(preferredShipping)
      ? (customer.courierGuyBranch || '')
      : ''
    const email = customer.email?.trim().toLowerCase() || ''

    const contacts = await blobRead<any[]>(CONTACTS_KEY, [])
    const idx = contacts.findIndex((c: any) =>
      (c.customerId && c.customerId === customerId) ||
      (email && c.email?.trim().toLowerCase() === email)
    )
    if (idx === -1) return false

    contacts[idx] = {
      ...contacts[idx],
      preferredShipping,
      courierGuyBranch,
      updatedAt: new Date().toISOString(),
    }
    await blobWrite(CONTACTS_KEY, contacts)
    return true
  } catch (err: any) {
    console.error('[syncShippingPreferenceToContact]', err?.message || err)
    return false
  }
}
