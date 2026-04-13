'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SiteSettings } from '@/lib/site-settings/schema'

type HeaderConfig = NonNullable<SiteSettings['header']>

// ─── Font list ─────────────────────────────────────────────────────────────────
const FONT_LIST = [
  { name: 'System Default', value: 'system-ui, sans-serif', google: false },
  { name: 'Arial', value: 'Arial, sans-serif', google: false },
  { name: 'Georgia', value: 'Georgia, serif', google: false },
  { name: 'Inter', value: "'Inter', sans-serif", google: true },
  { name: 'Roboto', value: "'Roboto', sans-serif", google: true },
  { name: 'Open Sans', value: "'Open Sans', sans-serif", google: true },
  { name: 'Lato', value: "'Lato', sans-serif", google: true },
  { name: 'Montserrat', value: "'Montserrat', sans-serif", google: true },
  { name: 'Poppins', value: "'Poppins', sans-serif", google: true },
  { name: 'Nunito', value: "'Nunito', sans-serif", google: true },
  { name: 'Raleway', value: "'Raleway', sans-serif", google: true },
  { name: 'Work Sans', value: "'Work Sans', sans-serif", google: true },
  { name: 'Oswald', value: "'Oswald', sans-serif", google: true },
  { name: 'Playfair Display', value: "'Playfair Display', serif", google: true },
  { name: 'Merriweather', value: "'Merriweather', serif", google: true },
  { name: 'Lora', value: "'Lora', serif", google: true },
  { name: 'Bebas Neue', value: "'Bebas Neue', sans-serif", google: true },
  { name: 'Anton', value: "'Anton', sans-serif", google: true },
  { name: 'Dancing Script', value: "'Dancing Script', cursive", google: true },
  { name: 'Pacifico', value: "'Pacifico', cursive", google: true },
  { name: 'Lobster', value: "'Lobster', cursive", google: true },
]

function loadGoogleFont(fontFamily: string) {
  const match = fontFamily.match(/'([^']+)'/)
  if (!match) return
  const fontName = match[1]
  const id = `gfont-${fontName.replace(/\s+/g, '-').toLowerCase()}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`
  document.head.appendChild(link)
}

const DEFAULT_HEADER: HeaderConfig = {
  logoText: 'R66SLOT',
  logoStyle: 'split',
  logoImage: '',
  logoSize: 80,
  logoPosition: 'left',
  showCompanyName: false,
  companyName: '',
  companyNameSize: 20,
  companyNameBold: false,
  companyNameColor: '#111827',
  companyNameOutline: '',
  companyNameLetterColors: [],
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

// ─── Company Name renderer ─────────────────────────────────────────────────────
function CompanyNameEl({ config }: { config: HeaderConfig }) {
  if (!config.showCompanyName || !config.companyName) return null
  const size = config.companyNameSize || 20
  const bold = config.companyNameBold
  const color = config.companyNameColor || config.textColor
  const outline = config.companyNameOutline
  const letterColors = config.companyNameLetterColors || []

  if (letterColors.length > 0) {
    return (
      <span
        className="ml-2 flex items-center leading-none"
        style={{ fontSize: size, fontWeight: bold ? 700 : 400 }}
      >
        {config.companyName.split('').map((ch, i) => (
          <span
            key={i}
            style={{
              color: letterColors[i] || color,
              WebkitTextStroke: outline ? `1px ${outline}` : undefined,
            }}
          >
            {ch}
          </span>
        ))}
      </span>
    )
  }

  return (
    <span
      className="ml-2 leading-none"
      style={{
        fontSize: size,
        fontWeight: bold ? 700 : 400,
        color,
        WebkitTextStroke: outline ? `1px ${outline}` : undefined,
      }}
    >
      {config.companyName}
    </span>
  )
}

// ─── Live Header Preview ───────────────────────────────────────────────────────
function HeaderPreview({ config }: { config: HeaderConfig }) {
  const logoEl = () => (
    <div className="flex items-center">
      {config.logoImage ? (
        <img
          src={config.logoImage}
          alt={config.logoText || 'Logo'}
          style={{ width: config.logoSize || 80, height: config.logoSize || 80, objectFit: 'contain' }}
        />
      ) : config.logoStyle === 'split' && config.logoText.length > 3 ? (
        <div className="text-2xl font-bold">
          <span style={{ color: config.textColor }}>{config.logoText.substring(0, 3)}</span>
          <span className="text-primary">{config.logoText.substring(3)}</span>
        </div>
      ) : (
        <div className="text-2xl font-bold" style={{ color: config.textColor }}>{config.logoText}</div>
      )}
      <CompanyNameEl config={config} />
    </div>
  )

  const pos = config.logoPosition || 'left'
  const navEl = (
    <nav className="hidden md:flex items-center gap-6">
      {config.navItems.map((item, i) => (
        <span key={i} style={{ color: config.textColor, fontFamily: config.navFontFamily || undefined, fontSize: config.navFontSize || 14, fontWeight: config.navFontWeight || 500 }}>{item.label}</span>
      ))}
    </nav>
  )
  const actionsEl = (
    <div className="flex items-center gap-1">
      {config.showSearch && <div className="p-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke={config.textColor}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>}
      {config.showAccount && <div className="p-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke={config.textColor}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>}
      {config.showCart && <div className="p-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke={config.textColor}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg></div>}
    </div>
  )

  const h = config.headerHeight ?? 64

  return (
    <div className="w-full border border-gray-200 rounded-xl overflow-hidden shadow-sm" style={{ backgroundColor: config.backgroundColor }}>
      <div className="px-6">
        {pos === 'center' ? (
          <div className="relative flex items-center justify-between" style={{ height: h }}>
            {navEl}
            <div className="absolute left-1/2 -translate-x-1/2">{logoEl()}</div>
            {actionsEl}
          </div>
        ) : pos === 'right' ? (
          <div className="flex items-center justify-between" style={{ height: h }}>
            {navEl}
            <div className="flex items-center gap-3">{actionsEl}{logoEl()}</div>
          </div>
        ) : (
          <div className="flex items-center justify-between" style={{ height: h }}>
            {logoEl()}
            {navEl}
            {actionsEl}
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
  const [saveError, setSaveError] = useState('')
  const [mediaFiles, setMediaFiles] = useState<{ id: string; url: string; name: string }[]>([])
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [mediaLoading, setMediaLoading] = useState(false)
  const [activeLetter, setActiveLetter] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data: SiteSettings) => {
        if (data?.header) setConfig({ ...DEFAULT_HEADER, ...data.header })
      })
      .catch(() => {})
  }, [])

  const loadMedia = () => {
    if (mediaFiles.length > 0) return
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
    setSaveError('')
    try {
      // POST only the header — updateSettings merges with current DB state
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ header: config }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`${res.status}: ${err}`)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    } catch (e: any) {
      setSaveError(e.message || 'Save failed')
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

  const logoSize = config.logoSize ?? 80
  const headerHeight = config.headerHeight ?? 64
  const letterColors = config.companyNameLetterColors ?? []
  const letters = (config.companyName ?? '').split('')

  const setLetterColor = (i: number, color: string) => {
    const arr = [...letterColors]
    while (arr.length < letters.length) arr.push(config.companyNameColor || config.textColor || '#111827')
    arr[i] = color
    updateConfig({ companyNameLetterColors: arr })
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Header Editor</h1>
          <p className="text-gray-500 mt-1 text-sm">Changes are reflected live in the preview below</p>
        </div>
        <div className="flex items-center gap-3">
          {saveError && <span className="text-sm text-red-600 font-medium">{saveError}</span>}
          <Button
            onClick={handleSave}
            disabled={saving}
            className={saved ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Header'}
          </Button>
        </div>
      </div>

      {/* Live Preview */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Live Preview</p>
        <HeaderPreview config={config} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Logo ── */}
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
                <Button variant="outline" size="sm" onClick={() => { setShowMediaPicker(true); loadMedia() }}>
                  {config.logoImage ? 'Change Image' : 'Pick from Media Library'}
                </Button>
                {config.logoImage && (
                  <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => updateConfig({ logoImage: '' })}>
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">When an image is set, text logo is hidden.</p>
            </div>

            {/* Logo Size */}
            {config.logoImage && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Logo Size (1:1)</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateConfig({ logoSize: Math.max(20, logoSize - 1) })} className="w-7 h-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center text-sm font-bold">−</button>
                    <span className="text-sm font-mono text-gray-700 w-20 text-center">{logoSize} × {logoSize} px</span>
                    <button onClick={() => updateConfig({ logoSize: Math.min(200, logoSize + 1) })} className="w-7 h-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center text-sm font-bold">+</button>
                  </div>
                </div>
                <input type="range" min={20} max={200} step={1} value={logoSize} onChange={(e) => updateConfig({ logoSize: Number(e.target.value) })} className="w-full accent-red-600" />
                <div className="flex justify-between text-xs text-gray-400 mt-0.5"><span>20px</span><span>100px</span><span>200px</span></div>
              </div>
            )}

            {/* Logo Position */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo Position</label>
              <div className="flex gap-2">
                {(['left', 'center', 'right'] as const).map((pos) => (
                  <button key={pos} onClick={() => updateConfig({ logoPosition: pos })}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${(config.logoPosition || 'left') === pos ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500'}`}
                  >
                    {pos === 'left' ? '◀ Left' : pos === 'center' ? '● Center' : 'Right ▶'}
                  </button>
                ))}
              </div>
            </div>

            {/* Header Height */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Header Height</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateConfig({ headerHeight: Math.max(40, headerHeight - 4) })} className="w-7 h-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center text-sm font-bold">−</button>
                  <span className="text-sm font-mono text-gray-700 w-14 text-center">{headerHeight}px</span>
                  <button onClick={() => updateConfig({ headerHeight: Math.min(200, headerHeight + 4) })} className="w-7 h-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center text-sm font-bold">+</button>
                </div>
              </div>
              <input type="range" min={40} max={200} step={4} value={headerHeight} onChange={(e) => updateConfig({ headerHeight: Number(e.target.value) })} className="w-full accent-red-600" />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5"><span>40px</span><span>64px (default)</span><span>200px</span></div>
            </div>

            {/* Text Logo fallback */}
            {!config.logoImage && (
              <>
                <Input label="Logo Text" value={config.logoText} onChange={(e) => updateConfig({ logoText: e.target.value })} placeholder="R66SLOT" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo Style</label>
                  <div className="flex gap-3">
                    {(['split', 'solid'] as const).map((style) => (
                      <button key={style} onClick={() => updateConfig({ logoStyle: style })}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${config.logoStyle === style ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500'}`}
                      >
                        {style === 'split' ? 'Split Color' : 'Solid Color'}
                      </button>
                    ))}
                  </div>
                  {config.logoStyle === 'split' && <p className="text-xs text-gray-400 mt-1">First 3 characters use text color, rest use brand red.</p>}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Company Name ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Company Name</CardTitle>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={config.showCompanyName || false} onChange={(e) => updateConfig({ showCompanyName: e.target.checked })} className="w-4 h-4 accent-red-600" />
                <span className="text-sm text-gray-600">Show next to logo</span>
              </label>
            </div>
          </CardHeader>
          {config.showCompanyName && (
            <CardContent className="space-y-4">
              <Input label="Company Name Text" value={config.companyName || ''} onChange={(e) => updateConfig({ companyName: e.target.value, companyNameLetterColors: [] })} placeholder="Route 66 Slot" />

              {/* Size + Bold */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">Font Size</label>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateConfig({ companyNameSize: Math.max(10, (config.companyNameSize || 20) - 1) })} className="w-6 h-6 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center text-xs font-bold">−</button>
                      <span className="text-xs font-mono w-10 text-center">{config.companyNameSize || 20}px</span>
                      <button onClick={() => updateConfig({ companyNameSize: Math.min(80, (config.companyNameSize || 20) + 1) })} className="w-6 h-6 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center text-xs font-bold">+</button>
                    </div>
                  </div>
                  <input type="range" min={10} max={80} step={1} value={config.companyNameSize || 20} onChange={(e) => updateConfig({ companyNameSize: Number(e.target.value) })} className="w-full accent-red-600" />
                </div>
                <div className="flex flex-col justify-center">
                  <label className="text-sm font-medium text-gray-700 mb-1">Bold</label>
                  <button onClick={() => updateConfig({ companyNameBold: !config.companyNameBold })}
                    className={`px-4 py-2 rounded-lg border text-sm font-bold transition-colors ${config.companyNameBold ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500'}`}
                  >
                    B
                  </button>
                </div>
              </div>

              {/* Overall Color + Outline */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={config.companyNameColor || '#111827'} onChange={(e) => updateConfig({ companyNameColor: e.target.value })} className="w-10 h-9 border border-gray-300 rounded cursor-pointer" />
                    <input type="text" value={config.companyNameColor || '#111827'} onChange={(e) => updateConfig({ companyNameColor: e.target.value })} className="flex-1 text-sm font-mono border border-gray-300 rounded-lg px-2 py-1.5" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Outline Color</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={config.companyNameOutline || '#000000'} onChange={(e) => updateConfig({ companyNameOutline: e.target.value })} className="w-10 h-9 border border-gray-300 rounded cursor-pointer" />
                    <input type="text" value={config.companyNameOutline || ''} onChange={(e) => updateConfig({ companyNameOutline: e.target.value })} className="flex-1 text-sm font-mono border border-gray-300 rounded-lg px-2 py-1.5" placeholder="None" />
                    {config.companyNameOutline && (
                      <button onClick={() => updateConfig({ companyNameOutline: '' })} className="text-xs text-red-500 hover:text-red-700">✕</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Per-letter colors */}
              {config.companyName && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Per-Letter Colors</label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {letters.map((ch, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveLetter(activeLetter === i ? null : i)}
                        className={`w-8 h-8 rounded border-2 text-sm font-bold transition-colors ${activeLetter === i ? 'border-red-500 ring-2 ring-red-300' : 'border-gray-300 hover:border-gray-500'}`}
                        style={{ color: letterColors[i] || config.companyNameColor || '#111827', backgroundColor: '#f9fafb' }}
                        title={`Letter "${ch}"`}
                      >
                        {ch === ' ' ? '·' : ch}
                      </button>
                    ))}
                    {letterColors.length > 0 && (
                      <button onClick={() => updateConfig({ companyNameLetterColors: [] })} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded border border-red-200 ml-1">Reset</button>
                    )}
                  </div>
                  {activeLetter !== null && activeLetter < letters.length && (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Letter <strong>"{letters[activeLetter]}"</strong> color:</span>
                      <input type="color" value={letterColors[activeLetter] || config.companyNameColor || '#111827'} onChange={(e) => setLetterColor(activeLetter, e.target.value)} className="w-10 h-8 border border-gray-300 rounded cursor-pointer" />
                      <input type="text" value={letterColors[activeLetter] || config.companyNameColor || '#111827'} onChange={(e) => setLetterColor(activeLetter, e.target.value)} className="w-24 text-sm font-mono border border-gray-300 rounded-lg px-2 py-1" />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* ── Colors ── */}
        <Card>
          <CardHeader><CardTitle>Colors</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={config.backgroundColor} onChange={(e) => updateConfig({ backgroundColor: e.target.value })} className="w-12 h-10 border border-gray-300 rounded cursor-pointer" />
                <Input value={config.backgroundColor} onChange={(e) => updateConfig({ backgroundColor: e.target.value })} className="flex-1 font-mono text-sm" placeholder="#ffffff" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Text / Icon Color</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={config.textColor} onChange={(e) => updateConfig({ textColor: e.target.value })} className="w-12 h-10 border border-gray-300 rounded cursor-pointer" />
                <Input value={config.textColor} onChange={(e) => updateConfig({ textColor: e.target.value })} className="flex-1 font-mono text-sm" placeholder="#111827" />
              </div>
            </div>
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
                    <input type="checkbox" checked={config[key as keyof HeaderConfig] as boolean} onChange={(e) => updateConfig({ [key]: e.target.checked })} className="w-4 h-4 accent-red-600" />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Typography ── */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Typography</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Font Family picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nav Font Family</label>
                <div className="grid grid-cols-2 gap-1.5 max-h-72 overflow-y-auto pr-1 border border-gray-200 rounded-xl p-2 bg-gray-50">
                  {FONT_LIST.map((f) => {
                    if (f.google) loadGoogleFont(f.value)
                    const isSelected = (config.navFontFamily || '') === f.value
                    return (
                      <button
                        key={f.name}
                        onClick={() => updateConfig({ navFontFamily: f.value })}
                        style={{ fontFamily: f.value }}
                        className={`px-3 py-2 rounded-lg border text-sm text-left truncate transition-colors ${isSelected ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`}
                      >
                        {f.name}
                      </button>
                    )
                  })}
                </div>
                <div style={{ fontFamily: config.navFontFamily || 'system-ui', fontSize: config.navFontSize || 14, fontWeight: config.navFontWeight || 500 }} className="mt-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-700">
                  Aa — The quick brown fox jumps over the lazy dog
                </div>
              </div>

              {/* Size, weight, hover options */}
              <div className="space-y-5">
                {/* Font Size */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">Font Size</label>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateConfig({ navFontSize: Math.max(10, (config.navFontSize || 14) - 1) })} className="w-6 h-6 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center text-xs font-bold">−</button>
                      <span className="text-xs font-mono w-10 text-center">{config.navFontSize || 14}px</span>
                      <button onClick={() => updateConfig({ navFontSize: Math.min(32, (config.navFontSize || 14) + 1) })} className="w-6 h-6 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center text-xs font-bold">+</button>
                    </div>
                  </div>
                  <input type="range" min={10} max={32} step={1} value={config.navFontSize || 14} onChange={(e) => updateConfig({ navFontSize: Number(e.target.value) })} className="w-full accent-red-600" />
                  <div className="flex justify-between text-xs text-gray-400 mt-0.5"><span>10px</span><span>14px (default)</span><span>32px</span></div>
                </div>

                {/* Font Weight */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Font Weight</label>
                  <div className="flex gap-2">
                    {[{ label: 'Regular', value: 400 }, { label: 'Medium', value: 500 }, { label: 'Semi-Bold', value: 600 }, { label: 'Bold', value: 700 }].map((w) => (
                      <button key={w.value} onClick={() => updateConfig({ navFontWeight: w.value })}
                        style={{ fontWeight: w.value }}
                        className={`flex-1 py-1.5 rounded-lg border text-xs transition-colors ${(config.navFontWeight || 500) === w.value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500'}`}
                      >{w.label}</button>
                    ))}
                  </div>
                </div>

                {/* Hover Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hover Color</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={config.navHoverColor || '#ef4444'} onChange={(e) => updateConfig({ navHoverColor: e.target.value })} className="w-10 h-9 border border-gray-300 rounded cursor-pointer" />
                    <input type="text" value={config.navHoverColor || '#ef4444'} onChange={(e) => updateConfig({ navHoverColor: e.target.value })} className="flex-1 text-sm font-mono border border-gray-300 rounded-lg px-2 py-1.5" />
                    <button onClick={() => updateConfig({ navHoverColor: '#ef4444' })} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-1.5">Reset</button>
                  </div>
                </div>

                {/* Hover Effect */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hover Effect</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'color', label: 'Color Change', desc: 'Text changes to hover color' },
                      { value: 'underline', label: 'Underline', desc: 'Colored underline appears' },
                      { value: 'background', label: 'Background', desc: 'Soft background highlight' },
                      { value: 'bold', label: 'Bold', desc: 'Text becomes bold + color' },
                    ].map((e) => (
                      <button key={e.value} onClick={() => updateConfig({ navHoverEffect: e.value as HeaderConfig['navHoverEffect'] })}
                        className={`px-3 py-2 rounded-lg border text-left transition-colors ${(config.navHoverEffect || 'color') === e.value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`}
                      >
                        <div className="text-xs font-semibold">{e.label}</div>
                        <div className={`text-[10px] mt-0.5 ${(config.navHoverEffect || 'color') === e.value ? 'text-gray-300' : 'text-gray-400'}`}>{e.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Navigation ── */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Navigation Items</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {config.navItems.map((item, index) => (
              <div key={index} className="flex gap-2 items-center bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-gray-400 text-sm font-mono w-5 text-center">{index + 1}</span>
                <Input value={item.label} onChange={(e) => updateNavItem(index, { label: e.target.value })} placeholder="Label" className="flex-1" />
                <Input value={item.href} onChange={(e) => updateNavItem(index, { href: e.target.value })} placeholder="/path or https://..." className="flex-1 font-mono text-sm" />
                <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap cursor-pointer">
                  <input type="checkbox" checked={item.isExternal || false} onChange={(e) => updateNavItem(index, { isExternal: e.target.checked })} className="accent-red-600" />
                  External
                </label>
                <button onClick={() => updateConfig({ navItems: config.navItems.filter((_, i) => i !== index) })} className="text-gray-400 hover:text-red-600 transition-colors p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
            <button onClick={() => updateConfig({ navItems: [...config.navItems, { label: '', href: '/' }] })} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors">
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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
                  <a href="/admin/media" target="_blank" className="text-sm text-red-600 hover:underline">Upload images in Media Library →</a>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {mediaFiles.map((file) => (
                    <button key={file.id} onClick={() => { updateConfig({ logoImage: file.url }); setShowMediaPicker(false) }}
                      className="aspect-square rounded-lg border-2 border-transparent hover:border-red-500 overflow-hidden bg-gray-100 transition-colors" title={file.name}
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
                <input type="url" placeholder="https://..." className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500"
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
