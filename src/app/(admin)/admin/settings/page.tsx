'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { SiteSettings } from '@/lib/site-settings/schema'

export default function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Load settings on mount
  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings')
      const data = await response.json()
      setSettings(data)
    } catch (error) {
      console.error('Error fetching settings:', error)
      setMessage('Error loading settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return

    setIsSaving(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        setMessage('Settings saved successfully!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage('Error saving settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage('Error saving settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div>Loading settings...</div>
  }

  if (!settings) {
    return <div>Error loading settings</div>
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Site Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure your site information and preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Site Name"
              value={settings.siteName}
              onChange={(e) =>
                setSettings({ ...settings, siteName: e.target.value })
              }
            />
            <Input
              label="Site Description"
              value={settings.siteDescription}
              onChange={(e) =>
                setSettings({ ...settings, siteDescription: e.target.value })
              }
            />
            <Input
              label="Site URL"
              value={settings.siteUrl}
              onChange={(e) =>
                setSettings({ ...settings, siteUrl: e.target.value })
              }
            />
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={settings.email}
              onChange={(e) =>
                setSettings({ ...settings, email: e.target.value })
              }
            />
            <Input
              label="Phone"
              value={settings.phone}
              onChange={(e) =>
                setSettings({ ...settings, phone: e.target.value })
              }
            />
            <Input
              label="Address"
              value={settings.address || ''}
              onChange={(e) =>
                setSettings({ ...settings, address: e.target.value })
              }
            />
          </CardContent>
        </Card>

        {/* Social Media */}
        <Card>
          <CardHeader>
            <CardTitle>Social Media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Facebook URL"
              value={settings.facebook || ''}
              onChange={(e) =>
                setSettings({ ...settings, facebook: e.target.value })
              }
              placeholder="https://facebook.com/yourpage"
            />
            <Input
              label="Instagram URL"
              value={settings.instagram || ''}
              onChange={(e) =>
                setSettings({ ...settings, instagram: e.target.value })
              }
              placeholder="https://instagram.com/yourpage"
            />
            <Input
              label="Twitter URL"
              value={settings.twitter || ''}
              onChange={(e) =>
                setSettings({ ...settings, twitter: e.target.value })
              }
              placeholder="https://twitter.com/yourpage"
            />
            <Input
              label="YouTube URL"
              value={settings.youtube || ''}
              onChange={(e) =>
                setSettings({ ...settings, youtube: e.target.value })
              }
              placeholder="https://youtube.com/yourchannel"
            />
          </CardContent>
        </Card>

        {/* Header Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Header Navigation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Logo Text"
                value={settings.header?.logoText || 'R66SLOT'}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    header: { ...settings.header!, logoText: e.target.value },
                  })
                }
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logo Style
                </label>
                <select
                  value={settings.header?.logoStyle || 'split'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      header: {
                        ...settings.header!,
                        logoStyle: e.target.value as 'split' | 'solid',
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="split">Split (first 3 chars different color)</option>
                  <option value="solid">Solid color</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Background Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings.header?.backgroundColor || '#ffffff'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        header: { ...settings.header!, backgroundColor: e.target.value },
                      })
                    }
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <Input
                    value={settings.header?.backgroundColor || '#ffffff'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        header: { ...settings.header!, backgroundColor: e.target.value },
                      })
                    }
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings.header?.textColor || '#111827'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        header: { ...settings.header!, textColor: e.target.value },
                      })
                    }
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <Input
                    value={settings.header?.textColor || '#111827'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        header: { ...settings.header!, textColor: e.target.value },
                      })
                    }
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Navigation Items Editor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Navigation Items
              </label>
              <div className="space-y-2 border rounded-lg p-4 bg-gray-50">
                {(settings.header?.navItems || []).map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      value={item.label}
                      onChange={(e) => {
                        const newItems = [...(settings.header?.navItems || [])]
                        newItems[index] = { ...newItems[index], label: e.target.value }
                        setSettings({
                          ...settings,
                          header: { ...settings.header!, navItems: newItems },
                        })
                      }}
                      placeholder="Label"
                      className="flex-1"
                    />
                    <Input
                      value={item.href}
                      onChange={(e) => {
                        const newItems = [...(settings.header?.navItems || [])]
                        newItems[index] = { ...newItems[index], href: e.target.value }
                        setSettings({
                          ...settings,
                          header: { ...settings.header!, navItems: newItems },
                        })
                      }}
                      placeholder="/path"
                      className="flex-1"
                    />
                    <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={item.isExternal || false}
                        onChange={(e) => {
                          const newItems = [...(settings.header?.navItems || [])]
                          newItems[index] = { ...newItems[index], isExternal: e.target.checked }
                          setSettings({
                            ...settings,
                            header: { ...settings.header!, navItems: newItems },
                          })
                        }}
                      />
                      External
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newItems = (settings.header?.navItems || []).filter((_, i) => i !== index)
                        setSettings({
                          ...settings,
                          header: { ...settings.header!, navItems: newItems },
                        })
                      }}
                      className="text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newItems = [...(settings.header?.navItems || []), { label: '', href: '/' }]
                    setSettings({
                      ...settings,
                      header: { ...settings.header!, navItems: newItems },
                    })
                  }}
                  className="mt-2"
                >
                  + Add Navigation Item
                </Button>
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="grid grid-cols-4 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.header?.showSearch ?? true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      header: { ...settings.header!, showSearch: e.target.checked },
                    })
                  }
                  className="w-4 h-4"
                />
                Show Search
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.header?.showAccount ?? true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      header: { ...settings.header!, showAccount: e.target.checked },
                    })
                  }
                  className="w-4 h-4"
                />
                Show Account
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.header?.showCart ?? true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      header: { ...settings.header!, showCart: e.target.checked },
                    })
                  }
                  className="w-4 h-4"
                />
                Show Cart
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.header?.sticky ?? true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      header: { ...settings.header!, sticky: e.target.checked },
                    })
                  }
                  className="w-4 h-4"
                />
                Sticky Header
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Shipping Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Free Shipping Threshold ($)"
              type="number"
              value={settings.freeShippingThreshold}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  freeShippingThreshold: parseFloat(e.target.value),
                })
              }
            />
            <Input
              label="Standard Shipping Cost ($)"
              type="number"
              step="0.01"
              value={settings.standardShippingCost}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  standardShippingCost: parseFloat(e.target.value),
                })
              }
            />
            <Input
              label="Express Shipping Cost ($)"
              type="number"
              step="0.01"
              value={settings.expressShippingCost}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  expressShippingCost: parseFloat(e.target.value),
                })
              }
            />
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} size="lg">
            {isSaving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
