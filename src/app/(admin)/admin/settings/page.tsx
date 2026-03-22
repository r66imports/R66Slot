'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { SiteSettings } from '@/lib/site-settings/schema'

export default function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Backup / Restore state
  const [backupStatus, setBackupStatus] = useState<'idle' | 'downloading' | 'restoring' | 'done' | 'error'>('idle')
  const [backupMsg, setBackupMsg] = useState('')
  const [restoreConfirm, setRestoreConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleDownloadBackup() {
    setBackupStatus('downloading')
    setBackupMsg('')
    try {
      const res = await fetch('/api/admin/backup')
      if (!res.ok) throw new Error('Backup failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `r66slot-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setBackupStatus('done')
      setBackupMsg('Backup downloaded successfully.')
    } catch (e: any) {
      setBackupStatus('error')
      setBackupMsg(e.message || 'Download failed')
    }
  }

  async function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBackupStatus('restoring')
    setBackupMsg('')
    setRestoreConfirm(false)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Restore failed')
      setBackupStatus('done')
      setBackupMsg(`Restored ${data.restored} records successfully.`)
    } catch (e: any) {
      setBackupStatus('error')
      setBackupMsg(e.message || 'Restore failed')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

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

        {/* Backup & Restore */}
        <Card>
          <CardHeader>
            <CardTitle>Backup &amp; Restore</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Download a full backup of all your operational data — invoices, events, backorders, clients, worksheets, and more.
              Store it in Google Drive or email it to yourself. Run it weekly for peace of mind.
            </p>

            {/* What's included */}
            <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600 space-y-1">
              <div className="font-semibold text-gray-700 mb-2">What's included in the backup:</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {[
                  'Invoices & Orders', 'Events & P&L data',
                  'Backorders', 'Clients & Contacts',
                  'Worksheets', 'Price Lists',
                  'Pre-orders', 'Supplier Orders',
                  'Products catalogue', 'Site settings',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-1.5">
                    <span className="text-green-500">✓</span> {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Download */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadBackup}
                disabled={backupStatus === 'downloading' || backupStatus === 'restoring'}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {backupStatus === 'downloading' ? (
                  <>⏳ Downloading…</>
                ) : (
                  <>⬇️ Download Backup</>
                )}
              </button>
              <span className="text-xs text-gray-400">Downloads as a .json file</span>
            </div>

            {/* Restore */}
            <div className="border-t border-gray-200 pt-4">
              <div className="text-sm font-medium text-gray-700 mb-1">Restore from backup</div>
              <p className="text-xs text-gray-500 mb-3">
                Upload a previously downloaded backup file. This will overwrite existing data for all keys in the backup.
                <span className="text-orange-600 font-medium"> Use with caution.</span>
              </p>
              {!restoreConfirm ? (
                <button
                  onClick={() => setRestoreConfirm(true)}
                  disabled={backupStatus === 'downloading' || backupStatus === 'restoring'}
                  className="px-4 py-2 text-sm font-medium border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50"
                >
                  Restore from file…
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-orange-700 font-medium">Are you sure? This will overwrite live data.</span>
                  <label className="cursor-pointer px-4 py-2 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                    {backupStatus === 'restoring' ? 'Restoring…' : 'Yes, choose file'}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleRestoreFile}
                    />
                  </label>
                  <button
                    onClick={() => setRestoreConfirm(false)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Status message */}
            {backupMsg && (
              <div className={`text-sm px-3 py-2 rounded-lg ${backupStatus === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                {backupMsg}
              </div>
            )}
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
