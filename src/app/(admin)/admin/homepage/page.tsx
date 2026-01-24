'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { SiteSettings } from '@/lib/site-settings/schema'

export default function HomepageEditor() {
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

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
        setMessage('Homepage content saved! Refresh your site to see changes.')
        setTimeout(() => setMessage(''), 5000)
      } else {
        setMessage('Error saving content')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage('Error saving content')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!settings) {
    return <div>Error loading settings</div>
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Homepage Content</h1>
          <p className="text-gray-600 mt-1">
            Edit your homepage hero section and featured content
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <a href="/" target="_blank">
              Preview Site
            </a>
          </Button>
          <Button onClick={handleSave} disabled={isSaving} size="lg">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        {/* Hero Section */}
        <Card>
          <CardHeader>
            <CardTitle>Hero Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Hero Title Line 1"
              value={settings.hero.title}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  hero: { ...settings.hero, title: e.target.value },
                })
              }
              placeholder="Premium Slot Cars"
            />
            <Input
              label="Hero Title Line 2"
              value={settings.hero.subtitle}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  hero: { ...settings.hero, subtitle: e.target.value },
                })
              }
              placeholder="For Collectors"
            />
            <Input
              label="Call-to-Action Button Text"
              value={settings.hero.ctaText}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  hero: { ...settings.hero, ctaText: e.target.value },
                })
              }
              placeholder="Shop Now"
            />
            <Input
              label="Call-to-Action Link"
              value={settings.hero.ctaLink}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  hero: { ...settings.hero, ctaLink: e.target.value },
                })
              }
              placeholder="/products"
            />
          </CardContent>
        </Card>

        {/* Featured Brands */}
        <Card>
          <CardHeader>
            <CardTitle>Featured Brands</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter brand names (comma-separated). These will appear on the homepage.
            </p>
            <Input
              label="Featured Brands"
              value={settings.featuredBrands.join(', ')}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  featuredBrands: e.target.value
                    .split(',')
                    .map((b) => b.trim())
                    .filter((b) => b),
                })
              }
              placeholder="Carrera, Scalextric, Slot.it, NSR, Ninco, Fly"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {settings.featuredBrands.map((brand) => (
                <span
                  key={brand}
                  className="px-3 py-1 bg-gray-100 rounded-full text-sm"
                >
                  {brand}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Announcement Banner */}
        <Card>
          <CardHeader>
            <CardTitle>Announcement Banner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="announcement-enabled"
                checked={settings.announcement?.enabled || false}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    announcement: {
                      ...settings.announcement!,
                      enabled: e.target.checked,
                    },
                  })
                }
                className="w-5 h-5 rounded border-gray-300"
              />
              <label htmlFor="announcement-enabled" className="text-sm font-medium">
                Show announcement banner on homepage
              </label>
            </div>
            {settings.announcement?.enabled && (
              <>
                <Input
                  label="Announcement Message"
                  value={settings.announcement.message}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      announcement: {
                        ...settings.announcement!,
                        message: e.target.value,
                      },
                    })
                  }
                  placeholder="Free shipping on orders over $100!"
                />
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Banner Style
                  </label>
                  <select
                    value={settings.announcement.type}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        announcement: {
                          ...settings.announcement!,
                          type: e.target.value as 'info' | 'warning' | 'success',
                        },
                      })
                    }
                    className="w-full px-4 py-2 border rounded-md"
                  >
                    <option value="info">Info (Blue)</option>
                    <option value="success">Success (Green)</option>
                    <option value="warning">Warning (Yellow)</option>
                  </select>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={fetchSettings}>
            Reset Changes
          </Button>
          <Button onClick={handleSave} disabled={isSaving} size="lg">
            {isSaving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
