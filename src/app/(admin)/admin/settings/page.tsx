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
