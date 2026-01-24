'use client'

import { useEffect, useState } from 'react'
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

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Address>>({})

  useEffect(() => {
    fetchAddresses()
  }, [])

  const fetchAddresses = () => {
    fetch('/api/account/addresses')
      .then((res) => res.json())
      .then((data) => setAddresses(data))
      .catch(console.error)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const url = editingId
      ? `/api/account/addresses/${editingId}`
      : '/api/account/addresses'
    const method = editingId ? 'PUT' : 'POST'

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchAddresses()
        setIsAdding(false)
        setEditingId(null)
        setFormData({})
      }
    } catch (error) {
      console.error('Failed to save address')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this address?')) return

    try {
      const response = await fetch(`/api/account/addresses/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchAddresses()
      }
    } catch (error) {
      console.error('Failed to delete address')
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      const response = await fetch(`/api/account/addresses/${id}/default`, {
        method: 'POST',
      })

      if (response.ok) {
        fetchAddresses()
      }
    } catch (error) {
      console.error('Failed to set default address')
    }
  }

  if (isAdding || editingId) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold">
            {editingId ? 'Edit Address' : 'Add New Address'}
          </h2>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    First Name *
                  </label>
                  <Input
                    type="text"
                    name="firstName"
                    value={formData.firstName || ''}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Last Name *
                  </label>
                  <Input
                    type="text"
                    name="lastName"
                    value={formData.lastName || ''}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Address Line 1 *
                </label>
                <Input
                  type="text"
                  name="address1"
                  value={formData.address1 || ''}
                  onChange={handleChange}
                  placeholder="Street address, P.O. box"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Address Line 2
                </label>
                <Input
                  type="text"
                  name="address2"
                  value={formData.address2 || ''}
                  onChange={handleChange}
                  placeholder="Apartment, suite, unit, building, floor, etc."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    City *
                  </label>
                  <Input
                    type="text"
                    name="city"
                    value={formData.city || ''}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    State *
                  </label>
                  <Input
                    type="text"
                    name="state"
                    value={formData.state || ''}
                    onChange={handleChange}
                    placeholder="CA"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    ZIP Code *
                  </label>
                  <Input
                    type="text"
                    name="zip"
                    value={formData.zip || ''}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Country *
                </label>
                <Input
                  type="text"
                  name="country"
                  value={formData.country || 'United States'}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Phone Number *
                </label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  name="isDefault"
                  checked={formData.isDefault || false}
                  onChange={(e) =>
                    setFormData({ ...formData, isDefault: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="isDefault" className="text-sm">
                  Set as default address
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit">
                  {editingId ? 'Update Address' : 'Add Address'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false)
                    setEditingId(null)
                    setFormData({})
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Saved Addresses</h2>
          <p className="text-gray-600 mt-1">
            Manage your shipping addresses
          </p>
        </div>
        <Button onClick={() => setIsAdding(true)}>+ Add Address</Button>
      </div>

      {addresses.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <div className="text-6xl mb-4">📍</div>
              <h3 className="text-xl font-bold mb-2">No addresses saved</h3>
              <p className="text-gray-600 mb-6">
                Add an address for faster checkout
              </p>
              <Button onClick={() => setIsAdding(true)}>
                Add Your First Address
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((address) => (
            <Card key={address.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold">
                    {address.firstName} {address.lastName}
                  </h3>
                  {address.isDefault && (
                    <span className="px-2 py-1 bg-primary text-black text-xs rounded">
                      Default
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-600 space-y-1 mb-4">
                  <p>{address.address1}</p>
                  {address.address2 && <p>{address.address2}</p>}
                  <p>
                    {address.city}, {address.state} {address.zip}
                  </p>
                  <p>{address.country}</p>
                  <p>{address.phone}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingId(address.id)
                      setFormData(address)
                    }}
                  >
                    Edit
                  </Button>
                  {!address.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(address.id)}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(address.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
