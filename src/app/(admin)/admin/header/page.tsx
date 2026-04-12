'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SiteSettings } from '@/lib/site-settings/schema'

type HeaderConfig = NonNullable<SiteSettings['header']>

const DEFAULT_HEADER: HeaderConfig = {
  logoText: 'R66SLOT',
  logoStyle: 'split',
  logoImage: '',
  logoSize: 80,
  logoPosition: 'left',
  backgroundColor: '#ffffff',
  textColor: '#111827',
  navItems: [
    { label: 'New Arrivals', href: '/collections/new-arrivals' },
    { label: 'Book for Next Shipment', href: '/book' },
  ],
  showSearch: true,
  showAccount: true,
  showCart: true,
  sticky: true,
}

// ─── Live Header Preview ───────────────────────────────────────────────────────
function HeaderPreview({ config }: { config: HeaderConfig }) {
  const logoEl = () => {
    if (config.logoImage) {
      const size = config.logoSize || 80
      return (
        <img
          src={config.logoImage}
          alt={config.logoText || 'Logo'}
          style={{ width: size, height: size, objectFit: 'contain' }}
        />
      )
    }
    if (config.logoStyle === 'split' && config.logoText.length > 3) {
      return (
        <div className="text-2xl font-bold">
          <span style={{ color: config.textColor }}>{config.logoText.substring(0, 3)}</span>
          <span className="text-primary">{config.logoText.substring(3)}</span>
        </div>
      )
    }
    return (
      <div className="text-2xl font-bold" style={{ color: config.textColor }}>
        {config.logoText}
      </div>
    )
  }

  const pos = config.logoPosition || 'left'

  return (
    <div
      className="w-full border border-gray-200 rounded-xl overflow-hidden shadow-sm"
      style={{ backgroundColor: config.backgroundColor }}
    >
      <div className="px-6">
        {pos === 'center' ? (
          <div className="relative flex h-16 items-center justify-between">
            {/* Nav left */}
            <nav className="hidden md:flex items-center gap-4">
              {config.navItems.slice(0, 2).map((item, i) => (
                <span key={i} className="text-sm font-medium" style={{ color: config.textColor }}>{item.label}</span>
              ))}
            </nav>
            {/* Logo absolutely centered */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
              {logoEl()}
            </div>
            {/* Actions right */}
            <div className="flex items-center gap-1">
              {config.showSearch && <div className="p-2 rounded-md"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke={config.textColor}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>}
              {config.showCart && <div className="p-2 rounded-md"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke={config.textColor}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg></div>}
            </div>
          </div>
        ) : pos === 'right' ? (
          <div className="flex h-16 items-center justify-between">
            <nav className="hidden md:flex items-center gap-4">
              {config.navItems.map((item, i) => (
                <span key={i} className="text-sm font-medium" style={{ color: config.textColor }}>{item.label}</span>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              {config.showSearch && <div className="p-2 rounded-md"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke={config.textColor}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>}
              {config.showCart && <div className="p-2 rounded-md"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke={config.textColor}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg></div>}
              {logoEl()}
            </div>
          </div>
        ) : (
          /* left (default) */
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">{logoEl()}</div>
            <nav className="hidden md:flex items-center gap-6">
              {config.navItems.map((item, i) => (
                <span key={i} className="text-sm font-medium" style={{ color: config.textColor }}>{item.label}</span>
              ))}
            </nav>
            <div className="flex items-center gap-1">
              {config.showSearch && <div className="p-2 rounded-md"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke={config.textColor}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>}
              {config.showAccount && <div className="p-2 rounded-md"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke={config.textColor}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>}
              {config.showCart && <div className="p-2 rounded-md"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke={config.textColor}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg></div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HeaderEditorPage() {
  const [config, setConfig] = useState<HeaderConfig>(DEFAULT_HEADER)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [mediaFiles, setMediaFiles] = useState<{ id: string; url: string; name: string }[]>([])
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [mediaLoading, setMediaLoading] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data: SiteSettings) => {
        if (data.header) setConfig({ ...DEFAULT_HEADER, ...data.header })
      })
      .catch(() => {})
  }, [])

  const loadMedia = () => {
    if (mediaFiles.length > 0) return // already loaded
    setMediaLoading(true)
    fetch('/api/admin/media')
      .then((r) => r.json())
      .then((data) => {
        const files = Array.isArray(data) ? data : (data.files ?? [])
        setMediaFiles(files.slice(0, 120))
      })
      .catch(() => {})
      .finally(() => setMediaLoading(false))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const settingsRes = await fetch('/api/settings')
      const current: SiteSettings = await settingsRes.json()
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...current, header: config }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      alert('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const updateConfig = (patch: Partial<HeaderConfig>) =>
    setConfig((prev) => ({ ...prev, ...patch }))

  const updateNavItem = (index: number, patch: Partial<HeaderConfig['navItems'][0]>) => {
    const newItems = [...config.navItems]
    newItems[index] = { ...newItems[index], ...patch }
    updateConfig({ navItems: newItems })
  }

  const removeNavItem = (index: number) =>
    updateConfig({ navItems: config.navItems.filter((_, i) => i !== index) })

  const addNavItem = () =>
    updateConfig({ navItems: [...config.navItems, { label: '', href: '/' }] })

  const logoSize = config.logoSize ?? 80

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Header Editor</h1>
          <p className="text-gray-500 mt-1 text-sm">Changes are reflected live in the preview below</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className={saved ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Header'}
        </Button>
      </div>

      {/* Live Preview */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Live Preview</p>
        <HeaderPreview config={config} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logo */}
        <Card>
          <CardHeader><CardTitle>Logo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Logo Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo Image</label>
              <div className="flex gap-2 items-center">
                {config.logoImage && (
                  <img src={config.logoImage} alt="Logo" className="h-12 w-12 object-contain border rounded bg-gray-50" />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setShowMediaPicker(true); loadMedia() }}
                >
                  {config.logoImage ? 'Change Image' : 'Pick from Media Library'}
                </Button>
                {config.logoImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => updateConfig({ logoImage: '' })}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">When an image is set, text logo is hidden.</p>
            </div>

            {/* Logo Size — only when image set */}
            {config.logoImage && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Logo Size (1:1)</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateConfig({ logoSize: Math.max(20, logoSize - 1) })}
                      className="w-7 h-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center text-sm font-bold"
                    >−</button>
                    <span className="text-sm font-mono text-gray-700 w-20 text-center">
                      {logoSize} × {logoSize} px
                    </span>
                    <button
                      onClick={() => updateConfig({ logoSize: Math.min(200, logoSize + 1) })}
                      className="w-7 h-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center text-sm font-bold"
                    >+</button>
                  </div>
                </div>
                <input
                  type="range"
                  min={20}
                  max={200}
                  step={1}
                  value={logoSize}
                  onChange={(e) => updateConfig({ logoSize: Number(e.target.value) })}
                  className="w-full accent-red-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                  <span>20px</span><span>100px</span><span>200px</span>
                </div>
              </div>
            )}

            {/* Logo Position */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo Position</label>
              <div className="flex gap-2">
                {(['left', 'center', 'right'] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => updateConfig({ logoPosition: pos })}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${
                      (config.logoPosition || 'left') === pos
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {pos === 'left' && <span>◀ Left</span>}
                    {pos === 'center' && <span>● Center</span>}
                    {pos === 'right' && <span>Right ▶</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Logo fallback */}
            {!config.logoImage && (
              <>
                <Input
                  label="Logo Text"
                  value={config.logoText}
                  onChange={(e) => updateConfig({ logoText: e.target.value })}
                  placeholder="R66SLOT"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo Style</label>
                  <div className="flex gap-3">
                    {(['split', 'solid'] as const).map((style) => (
                      <button
                        key={style}
                        onClick={() => updateConfig({ logoStyle: style })}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          config.logoStyle === style
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500'
                        }`}
                      >
                        {style === 'split' ? 'Split Color' : 'Solid Color'}
                      </button>
                    ))}
                  </div>
                  {config.logoStyle === 'split' && (
                    <p className="text-xs text-gray-400 mt-1">First 3 characters use text color, rest use brand red.</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Colors */}
        <Card>
          <CardHeader><CardTitle>Colors</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={config.backgroundColor}
                  onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <Input
                  value={config.backgroundColor}
                  onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                  className="flex-1 font-mono text-sm"
                  placeholder="#ffffff"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Text / Icon Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={config.textColor}
                  onChange={(e) => updateConfig({ textColor: e.target.value })}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <Input
                  value={config.textColor}
                  onChange={(e) => updateConfig({ textColor: e.target.value })}
                  className="flex-1 font-mono text-sm"
                  placeholder="#111827"
                />
              </div>
            </div>

            {/* Feature toggles */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'showSearch', label: 'Search' },
                  { key: 'showAccount', label: 'Account' },
                  { key: 'showCart', label: 'Cart' },
                  { key: 'sticky', label: 'Sticky Header' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={config[key as keyof HeaderConfig] as boolean}
                      onChange={(e) => updateConfig({ [key]: e.target.checked })}
                      className="w-4 h-4 accent-red-600"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Items */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Navigation Items</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {config.navItems.map((item, index) => (
              <div key={index} className="flex gap-2 items-center bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-gray-400 text-sm font-mono w-5 text-center">{index + 1}</span>
                <Input
                  value={item.label}
                  onChange={(e) => updateNavItem(index, { label: e.target.value })}
                  placeholder="Label"
                  className="flex-1"
                />
                <Input
                  value={item.href}
                  onChange={(e) => updateNavItem(index, { href: e.target.value })}
                  placeholder="/path or https://..."
                  className="flex-1 font-mono text-sm"
                />
                <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.isExternal || false}
                    onChange={(e) => updateNavItem(index, { isExternal: e.target.checked })}
                    className="accent-red-600"
                  />
                  External
                </label>
                <button
                  onClick={() => removeNavItem(index)}
                  className="text-gray-400 hover:text-red-600 transition-colors p-1"
                  title="Remove"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              onClick={addNavItem}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
            >
              + Add Navigation Item
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Select Logo Image</h3>
              <button onClick={() => setShowMediaPicker(false)} className="text-gray-400 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {mediaLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : mediaFiles.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-3">No media files found.</p>
                  <a href="/admin/media" target="_blank" className="text-sm text-red-600 hover:underline">
                    Upload images in Media Library →
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {mediaFiles.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => {
                        updateConfig({ logoImage: file.url })
                        setShowMediaPicker(false)
                      }}
                      className="aspect-square rounded-lg border-2 border-transparent hover:border-red-500 overflow-hidden bg-gray-100 transition-colors"
                      title={file.name}
                    >
                      <img src={file.url} alt={file.name} className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t flex justify-between items-center">
              <p className="text-xs text-gray-400">Or enter a URL manually:</p>
              <div className="flex gap-2 flex-1 ml-4">
                <input
                  type="url"
                  placeholder="https://..."
                  className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim()
                      if (val) { updateConfig({ logoImage: val }); setShowMediaPicker(false) }
                    }
                  }}
                />
                <span className="text-xs text-gray-400 self-center">Press Enter</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
