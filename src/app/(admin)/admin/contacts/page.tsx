'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Contact = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  source: 'book-now' | 'manual' | 'import'
  notes: string
  totalOrders: number
  totalSpent: number
  createdAt: string
  updatedAt: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  // Add form state
  const [formFirstName, setFormFirstName] = useState('')
  const [formLastName, setFormLastName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/admin/contacts')
      if (response.ok) {
        const data = await response.json()
        setContacts(data)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncFromOrders = async () => {
    setSyncing(true)
    setSyncMessage('')
    try {
      const response = await fetch('/api/admin/contacts', { method: 'PUT' })
      if (response.ok) {
        const data = await response.json()
        setSyncMessage(`Synced ${data.synced} new contacts. Total: ${data.total}`)
        fetchContacts()
      }
    } catch (error) {
      console.error('Error syncing contacts:', error)
      setSyncMessage('Failed to sync contacts')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMessage(''), 4000)
    }
  }

  const handleAddContact = async () => {
    if (!formFirstName.trim() || !formPhone.trim()) {
      alert('First name and phone are required')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formFirstName,
          lastName: formLastName,
          email: formEmail,
          phone: formPhone,
          notes: formNotes,
          source: 'manual',
        }),
      })

      if (response.ok) {
        setFormFirstName('')
        setFormLastName('')
        setFormEmail('')
        setFormPhone('')
        setFormNotes('')
        setShowAddForm(false)
        fetchContacts()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to add contact')
      }
    } catch (error) {
      console.error('Error adding contact:', error)
      alert('Failed to add contact')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteContact = async (id: string, name: string) => {
    if (!confirm(`Delete contact "${name}"?`)) return

    try {
      const response = await fetch(`/api/admin/contacts?id=${id}`, { method: 'DELETE' })
      if (response.ok) {
        setContacts(contacts.filter(c => c.id !== id))
      }
    } catch (error) {
      console.error('Error deleting contact:', error)
    }
  }

  const handleExportCSV = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Source', 'Orders', 'Total Spent', 'Notes', 'Created'],
      ...contacts.map(c => [
        `${c.firstName} ${c.lastName}`,
        c.email,
        c.phone,
        c.source,
        c.totalOrders.toString(),
        `R${c.totalSpent.toFixed(2)}`,
        c.notes,
        new Date(c.createdAt).toLocaleDateString(),
      ]),
    ].map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const filteredContacts = contacts.filter(c => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q)
    )
  })

  const sourceLabel = (source: string) => {
    switch (source) {
      case 'book-now': return 'Book Now'
      case 'manual': return 'Manual'
      case 'import': return 'Import'
      default: return source
    }
  }

  const sourceColor = (source: string) => {
    switch (source) {
      case 'book-now': return 'bg-blue-100 text-blue-700'
      case 'manual': return 'bg-green-100 text-green-700'
      case 'import': return 'bg-purple-100 text-purple-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (isLoading) {
    return (
      <div className="font-play flex items-center justify-center min-h-[400px]">
        <p className="text-lg">Loading contacts...</p>
      </div>
    )
  }

  return (
    <div className="font-play">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold font-play">Contacts</h1>
          <p className="text-gray-600 mt-1 font-play">
            All customer contact information in one place
          </p>
        </div>
        <div className="flex items-center gap-3">
          {syncMessage && (
            <span className={`text-sm font-medium ${syncMessage.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
              {syncMessage}
            </span>
          )}
          <Button
            onClick={handleSyncFromOrders}
            variant="outline"
            className="font-play"
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : 'Sync from Orders'}
          </Button>
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="font-play"
            disabled={contacts.length === 0}
          >
            Export CSV
          </Button>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-play"
          >
            + Add Contact
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 font-play">Total Contacts</p>
            <p className="text-3xl font-bold font-play">{contacts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 font-play">From Book Now</p>
            <p className="text-3xl font-bold text-blue-600 font-play">
              {contacts.filter(c => c.source === 'book-now').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 font-play">Manual Entries</p>
            <p className="text-3xl font-bold text-green-600 font-play">
              {contacts.filter(c => c.source === 'manual').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 font-play">Total Revenue</p>
            <p className="text-3xl font-bold text-primary font-play">
              R{contacts.reduce((sum, c) => sum + (c.totalSpent || 0), 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Contact Form */}
      {showAddForm && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="font-play text-lg">Add New Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-play">First Name *</label>
                <input
                  type="text"
                  value={formFirstName}
                  onChange={(e) => setFormFirstName(e.target.value)}
                  placeholder="John"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-play"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-play">Last Name</label>
                <input
                  type="text"
                  value={formLastName}
                  onChange={(e) => setFormLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-play"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-play">Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-play"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-play">Phone *</label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+27 61 234 5678"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-play"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1 font-play">Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="Any notes about this contact..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-play"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <Button
                onClick={handleAddContact}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-play"
              >
                {isSaving ? 'Saving...' : 'Save Contact'}
              </Button>
              <Button
                onClick={() => setShowAddForm(false)}
                variant="outline"
                className="font-play"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search contacts by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-play focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Contacts Table */}
      {filteredContacts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold font-play mb-2">
              {searchQuery ? 'No Contacts Found' : 'No Contacts Yet'}
            </h3>
            <p className="text-gray-600 font-play mb-4">
              {searchQuery
                ? 'Try a different search term'
                : 'Add contacts manually or sync from Book Now orders'}
            </p>
            {!searchQuery && (
              <div className="flex items-center justify-center gap-3">
                <Button onClick={() => setShowAddForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-play">
                  + Add Contact
                </Button>
                <Button onClick={handleSyncFromOrders} variant="outline" className="font-play">
                  Sync from Orders
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="font-play">
              Contacts ({filteredContacts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-3 px-3 font-semibold text-xs font-play text-gray-500">Name</th>
                    <th className="py-3 px-3 font-semibold text-xs font-play text-gray-500">Email</th>
                    <th className="py-3 px-3 font-semibold text-xs font-play text-gray-500">Phone</th>
                    <th className="py-3 px-3 font-semibold text-xs font-play text-gray-500">Source</th>
                    <th className="py-3 px-3 font-semibold text-xs font-play text-gray-500">Orders</th>
                    <th className="py-3 px-3 font-semibold text-xs font-play text-gray-500">Total Spent</th>
                    <th className="py-3 px-3 font-semibold text-xs font-play text-gray-500">Notes</th>
                    <th className="py-3 px-3 font-semibold text-xs font-play text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact) => (
                    <tr key={contact.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <p className="font-medium text-sm font-play">
                          {contact.firstName} {contact.lastName}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-sm font-play">
                        {contact.email ? (
                          <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                            {contact.email}
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-sm font-play">
                        {contact.phone ? (
                          <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">
                            {contact.phone}
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium font-play ${sourceColor(contact.source)}`}>
                          {sourceLabel(contact.source)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-sm font-play text-center">
                        {contact.totalOrders}
                      </td>
                      <td className="py-3 px-3 text-sm font-bold font-play">
                        R{(contact.totalSpent || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-sm font-play text-gray-500 max-w-[200px] truncate">
                        {contact.notes || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleDeleteContact(contact.id, `${contact.firstName} ${contact.lastName}`)}
                          className="text-red-600 hover:text-red-700 text-xs font-play font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
