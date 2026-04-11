'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Product {
  id: string
  sku: string
  title: string
  price: number
  brand: string
  images: string[]
  status: string
}

const TEMPLATES = [
  { id: 'dark', label: 'Dark', bg: '#1a1a2e', text: '#ffffff', accent: '#e63946', sub: '#aaaaaa' },
  { id: 'racing', label: 'Racing', bg: '#111111', text: '#ffffff', accent: '#ff0000', sub: '#cccccc' },
  { id: 'light', label: 'Light', bg: '#ffffff', text: '#1f2937', accent: '#4f46e5', sub: '#6b7280' },
  { id: 'gold', label: 'Gold', bg: '#1c1c1c', text: '#f5d76e', accent: '#f5d76e', sub: '#aaaaaa' },
  { id: 'blue', label: 'Blue', bg: '#0f172a', text: '#ffffff', accent: '#38bdf8', sub: '#94a3b8' },
]

function normalizeImageUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ''
  return base ? `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}` : url
}

export default function FlyerGeneratorPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)
  const [templateId, setTemplateId] = useState('dark')
  const [showDropdown, setShowDropdown] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [customTag, setCustomTag] = useState('New Arrival')
  const [showTag, setShowTag] = useState(true)
  const [showSku, setShowSku] = useState(true)
  const [showPrice, setShowPrice] = useState(true)
  const [showWebsite, setShowWebsite] = useState(true)
  const flyerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  const tpl = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0]

  useEffect(() => {
    fetch('/api/admin/products')
      .then(r => r.ok ? r.json() : [])
      .then((data: Product[]) => setProducts(data.filter(p => p.status === 'active')))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = products.filter(p =>
    !search ||
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 20)

  const handleDownload = useCallback(async () => {
    if (!flyerRef.current || !selected) return
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(flyerRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: tpl.bg,
        width: 540,
        height: 540,
      })
      const link = document.createElement('a')
      link.download = `${selected.sku || selected.title}-flyer.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Download failed:', err)
      alert('Download failed. Check console for details.')
    } finally {
      setDownloading(false)
    }
  }, [selected, tpl.bg])

  const productImage = selected?.images?.[0] ? normalizeImageUrl(selected.images[0]) : ''

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flyer Generator</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create product flyers for social media</p>
        </div>
        <div className="flex gap-2">
          <button
            disabled
            title="Connect Facebook first — coming soon"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
          >
            📘 Post to Facebook
          </button>
          <button
            disabled
            title="Connect Instagram first — coming soon"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
          >
            📸 Post to Instagram
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* ── Controls Panel ── */}
        <div className="space-y-5">

          {/* Product Search */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Select Product</h2>
            <div ref={searchRef} className="relative">
              <input
                type="text"
                placeholder="Search by name, SKU or brand..."
                value={search}
                onChange={e => { setSearch(e.target.value); setShowDropdown(true) }}
                onFocus={() => setShowDropdown(true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {showDropdown && filtered.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {filtered.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelected(p); setSearch(p.title); setShowDropdown(false) }}
                      className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 border-b border-gray-100 last:border-0"
                    >
                      <div className="text-sm font-medium text-gray-900 truncate">{p.title}</div>
                      <div className="text-xs text-gray-500">{p.sku} · {p.brand} · R{p.price?.toFixed(2)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selected && (
              <div className="mt-2 flex items-center gap-2 text-xs text-indigo-600 font-medium">
                <span>✓</span>
                <span className="truncate">{selected.title}</span>
                <button onClick={() => { setSelected(null); setSearch('') }} className="ml-auto text-gray-400 hover:text-red-500">✕</button>
              </div>
            )}
          </div>

          {/* Template */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Template</h2>
            <div className="grid grid-cols-5 gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTemplateId(t.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${templateId === t.id ? 'border-indigo-500 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="w-8 h-8 rounded-md" style={{ background: t.bg, border: `2px solid ${t.accent}` }} />
                  <span className="text-xs text-gray-600">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">Options</h2>

            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600 flex items-center gap-2">
                <input type="checkbox" checked={showTag} onChange={e => setShowTag(e.target.checked)} className="rounded" />
                Badge Label
              </label>
              {showTag && (
                <input
                  value={customTag}
                  onChange={e => setCustomTag(e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              )}
            </div>

            <label className="text-sm text-gray-600 flex items-center gap-2">
              <input type="checkbox" checked={showSku} onChange={e => setShowSku(e.target.checked)} className="rounded" />
              Show SKU
            </label>
            <label className="text-sm text-gray-600 flex items-center gap-2">
              <input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)} className="rounded" />
              Show Price
            </label>
            <label className="text-sm text-gray-600 flex items-center gap-2">
              <input type="checkbox" checked={showWebsite} onChange={e => setShowWebsite(e.target.checked)} className="rounded" />
              Show Website URL
            </label>
          </div>

          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={!selected || downloading}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {downloading ? 'Generating PNG...' : '⬇ Download Flyer (PNG)'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Facebook/Instagram posting available once Meta API is connected.
          </p>
        </div>

        {/* ── Flyer Preview ── */}
        <div className="flex flex-col items-center">
          <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide font-medium">Preview — 1080 × 1080</p>

          {/* The actual flyer — captured by html2canvas */}
          <div
            ref={flyerRef}
            style={{
              width: 540,
              height: 540,
              background: tpl.bg,
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 16,
              fontFamily: 'Arial, sans-serif',
              flexShrink: 0,
              boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
            }}
          >
            {!selected ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 48 }}>🎨</div>
                <div style={{ color: tpl.sub, fontSize: 14, textAlign: 'center', padding: '0 40px' }}>
                  Select a product from the left panel to generate a flyer
                </div>
              </div>
            ) : (
              <>
                {/* Background accent stripe */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 180,
                  background: `linear-gradient(to top, ${tpl.accent}22, transparent)`,
                }} />

                {/* Top bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0' }}>
                  <div style={{ color: tpl.text, fontWeight: 900, fontSize: 18, letterSpacing: '0.08em' }}>
                    <span style={{ color: tpl.accent }}>R66</span>SLOT
                  </div>
                  {showTag && customTag && (
                    <div style={{
                      background: tpl.accent, color: '#fff',
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                      padding: '4px 12px', borderRadius: 99, textTransform: 'uppercase',
                    }}>
                      {customTag}
                    </div>
                  )}
                </div>

                {/* Product image */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 280, padding: '12px 40px' }}>
                  {productImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={productImage}
                      alt={selected.title}
                      crossOrigin="anonymous"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }}
                    />
                  ) : (
                    <div style={{ width: 200, height: 200, background: '#ffffff15', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tpl.sub, fontSize: 13 }}>
                      No image
                    </div>
                  )}
                </div>

                {/* Info block */}
                <div style={{ padding: '0 24px 20px', position: 'relative' }}>
                  {selected.brand && (
                    <div style={{ color: tpl.accent, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                      {selected.brand}
                    </div>
                  )}
                  <div style={{ color: tpl.text, fontSize: 17, fontWeight: 800, lineHeight: 1.25, marginBottom: 6, maxHeight: 44, overflow: 'hidden' }}>
                    {selected.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    {showSku && selected.sku && (
                      <div style={{ color: tpl.sub, fontSize: 11, fontFamily: 'monospace', background: '#ffffff10', padding: '2px 8px', borderRadius: 4 }}>
                        {selected.sku}
                      </div>
                    )}
                    {showPrice && selected.price > 0 && (
                      <div style={{ color: tpl.accent, fontSize: 22, fontWeight: 900 }}>
                        R{selected.price.toFixed(2)}
                      </div>
                    )}
                  </div>
                  {showWebsite && (
                    <div style={{ color: tpl.sub, fontSize: 10, marginTop: 10, letterSpacing: '0.06em' }}>
                      www.r66slot.co.za
                    </div>
                  )}
                </div>

                {/* Bottom accent line */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: tpl.accent }} />
              </>
            )}
          </div>

          {selected && (
            <p className="text-xs text-gray-400 mt-3">
              Download exports at 2× resolution (1080×1080px)
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
