'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Address {
  id: string
  firstName: string
  lastName: string
  address1: string
  address2?: string
  city: string
  state: string
  zip: string
  country: string
  phone: string
  isDefault: boolean
}

// ── Country → Province/State options ────────────────────────────────────────

const COUNTRY_OPTIONS = [
  'South Africa',
  'Zimbabwe',
  'Namibia',
  'Botswana',
  'Mozambique',
  'Zambia',
  'Lesotho',
  'Eswatini',
  'United Kingdom',
  'United States',
  'Australia',
  'Canada',
  'Germany',
  'France',
  'Netherlands',
  'Other',
]

const PROVINCE_OPTIONS: Record<string, string[]> = {
  'South Africa': [
    'Eastern Cape',
    'Free State',
    'Gauteng',
    'KwaZulu-Natal',
    'Limpopo',
    'Mpumalanga',
    'North West',
    'Northern Cape',
    'Western Cape',
  ],
  'United States': [
    'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
    'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
    'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
    'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire',
    'New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio',
    'Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota',
    'Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia',
    'Wisconsin','Wyoming',
  ],
  'Australia': [
    'Australian Capital Territory','New South Wales','Northern Territory',
    'Queensland','South Australia','Tasmania','Victoria','Western Australia',
  ],
  'Canada': [
    'Alberta','British Columbia','Manitoba','New Brunswick',
    'Newfoundland and Labrador','Northwest Territories','Nova Scotia','Nunavut',
    'Ontario','Prince Edward Island','Quebec','Saskatchewan','Yukon',
  ],
  'United Kingdom': ['England','Scotland','Wales','Northern Ireland'],
}

// ── Postal code autofill via Nominatim ──────────────────────────────────────

async function lookupPostalCode(suburb: string, city: string, country: string): Promise<string | null> {
  const q = [suburb, city, country].filter(Boolean).join(', ')
  if (!q.trim() || q.length < 4) return null
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=1`
    const res = await fetch(url, { headers: { 'User-Agent': 'R66Slot/1.0' } })
    const data = await res.json()
    return data?.[0]?.address?.postcode || null
  } catch {
    return null
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Address>>({ country: 'South Africa' })
  const [lookingUpZip, setLookingUpZip] = useState(false)
  const zipLookupRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { fetchAddresses() }, [])

  const fetchAddresses = () => {
    fetch('/api/account/addresses')
      .then((res) => res.json())
      .then((data) => setAddresses(Array.isArray(data) ? data : []))
      .catch(console.error)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    const updated = { ...formData, [name]: value }

    // Reset state when country changes
    if (name === 'country') updated.state = ''

    setFormData(updated)

    // Trigger postal code autofill when suburb (address1) or city changes
    if (name === 'address1' || name === 'city') {
      if (zipLookupRef.current) clearTimeout(zipLookupRef.current)
      zipLookupRef.current = setTimeout(async () => {
        const suburb = name === 'address1' ? value : updated.address1 || ''
        const city   = name === 'city'     ? value : updated.city     || ''
        const country = updated.country || 'South Africa'
        if (!city && !suburb) return
        setLookingUpZip(true)
        const postal = await lookupPostalCode(suburb, city, country)
        if (postal) setFormData((prev) => ({ ...prev, zip: postal }))
        setLookingUpZip(false)
      }, 900)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingId ? `/api/account/addresses/${editingId}` : '/api/account/addresses'
    const method = editingId ? 'PUT' : 'POST'
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        fetchAddresses()
        setIsAdding(false)
        setEditingId(null)
        setFormData({ country: 'South Africa' })
      }
    } catch {
      console.error('Failed to save address')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this address?')) return
    try {
      const res = await fetch(`/api/account/addresses/${id}`, { method: 'DELETE' })
      if (res.ok) fetchAddresses()
    } catch { console.error('Failed to delete address') }
  }

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/account/addresses/${id}/default`, { method: 'POST' })
      if (res.ok) fetchAddresses()
    } catch { console.error('Failed to set default') }
  }

  const provinceOptions = PROVINCE_OPTIONS[formData.country || 'South Africa'] || []
  const selectClass = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white'

  // ── Form view ──────────────────────────────────────────────────────────────

  if (isAdding || editingId) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold">{editingId ? 'Edit Address' : 'Add New Address'}</h2>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">First Name *</label>
                  <Input type="text" name="firstName" value={formData.firstName || ''} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Last Name *</label>
                  <Input type="text" name="lastName" value={formData.lastName || ''} onChange={handleChange} required />
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium mb-2">Country *</label>
                <select name="country" value={formData.country || 'South Africa'} onChange={handleChange} required className={selectClass}>
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Province / State */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {formData.country === 'South Africa' ? 'Province *' : 'State / Province *'}
                </label>
                {provinceOptions.length > 0 ? (
                  <select name="state" value={formData.state || ''} onChange={handleChange} required className={selectClass}>
                    <option value="">— Select —</option>
                    {provinceOptions.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                ) : (
                  <Input type="text" name="state" value={formData.state || ''} onChange={handleChange} placeholder="State / Province" required />
                )}
              </div>

              {/* Street address */}
              <div>
                <label className="block text-sm font-medium mb-2">Address Line 1 *</label>
                <Input
                  type="text"
                  name="address1"
                  value={formData.address1 || ''}
                  onChange={handleChange}
                  placeholder="Street address, complex, suburb"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Address Line 2</label>
                <Input type="text" name="address2" value={formData.address2 || ''} onChange={handleChange} placeholder="Unit, floor, etc." />
              </div>

              {/* City + Postal code */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">City *</label>
                  <Input type="text" name="city" value={formData.city || ''} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Postal Code *
                    {lookingUpZip && <span className="ml-2 text-xs text-indigo-500 font-normal animate-pulse">Looking up…</span>}
                  </label>
                  <Input
                    type="text"
                    name="zip"
                    value={formData.zip || ''}
                    onChange={handleChange}
                    placeholder="Auto-fills from suburb + city"
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number *</label>
                <Input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="+27 83 123 4567" required />
              </div>

              {/* Default */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault || false}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="isDefault" className="text-sm">Set as default address</label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit">{editingId ? 'Update Address' : 'Add Address'}</Button>
                <Button type="button" variant="outline" onClick={() => { setIsAdding(false); setEditingId(null); setFormData({ country: 'South Africa' }) }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── List view ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Saved Addresses</h2>
          <p className="text-gray-600 mt-1">Manage your shipping addresses</p>
        </div>
        <Button onClick={() => setIsAdding(true)}>+ Add Address</Button>
      </div>

      {addresses.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <div className="text-6xl mb-4">📍</div>
              <h3 className="text-xl font-bold mb-2">No addresses saved</h3>
              <p className="text-gray-600 mb-6">Add an address for faster checkout</p>
              <Button onClick={() => setIsAdding(true)}>Add Your First Address</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((address) => (
            <Card key={address.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold">{address.firstName} {address.lastName}</h3>
                  {address.isDefault && (
                    <span className="px-2 py-1 bg-primary text-black text-xs rounded">Default</span>
                  )}
                </div>
                <div className="text-sm text-gray-600 space-y-1 mb-4">
                  <p>{address.address1}</p>
                  {address.address2 && <p>{address.address2}</p>}
                  <p>{address.city}{address.state ? `, ${address.state}` : ''} {address.zip}</p>
                  <p>{address.country}</p>
                  {address.phone && <p>{address.phone}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingId(address.id); setFormData(address) }}>Edit</Button>
                  {!address.isDefault && (
                    <Button variant="outline" size="sm" onClick={() => handleSetDefault(address.id)}>Set Default</Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleDelete(address.id)} className="text-red-600 hover:text-red-700">Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
