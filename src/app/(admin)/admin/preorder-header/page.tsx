'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type BrandLogo = {
  id: string
  name: string
  imageUrl: string
  active: boolean
}

type HeaderTheme = 'dark' | 'light' | 'red' | 'transparent'

const THEMES: { value: HeaderTheme; label: string; bg: string; text: string; sub: string }[] = [
  { value: 'dark',        label: 'Dark (Default)', bg: '#111',        text: '#fff', sub: '#C41230' },
  { value: 'light',       label: 'Light',          bg: '#f9f9f9',     text: '#111', sub: '#C41230' },
  { value: 'red',         label: 'Red',            bg: '#C41230',     text: '#fff', sub: '#fff'    },
  { value: 'transparent', label: 'Transparent',    bg: 'transparent', text: '#fff', sub: '#C41230' },
]

const HEADER_LOGO_ID = '__header_logo__'

function newLogo(): BrandLogo {
  return { id: crypto.randomUUID(), name: '', imageUrl: '', active: true }
}

async function uploadImageFile(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/admin/media/upload', { method: 'POST', body: fd })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Upload failed (${res.status})`)
  }
  const json = await res.json()
  return json.url as string
}

export default function PreorderHeaderEditorPage() {
  const [logos, setLogos] = useState<BrandLogo[]>([])
  const [theme, setTheme] = useState<HeaderTheme>('dark')
  const [headerLogo, setHeaderLogo] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [mediaFiles, setMediaFiles] = useState<{ id: string; url: string; name: string }[]>([])
  const [showMediaPicker, setShowMediaPicker] = useState<string | null>(null)
  const [mediaLoading, setMediaLoading] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [headerLogoDragOver, setHeaderLogoDragOver] = useState(false)

  const hoveredLogoIdRef = useRef<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/preorder-header')
      .then(r => r.json())
      .then(data => {
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          setLogos(Array.isArray(data.logos) ? data.logos : [])
          if (data.theme) setTheme(data.theme as HeaderTheme)
          if (data.headerLogo) setHeaderLogo(data.headerLogo)
        } else {
          setLogos(Array.isArray(data) ? data : [])
        }
      })
      .catch(() => {})
  }, [])

  const handleUpload = useCallback(async (file: File, targetId: string) => {
    if (!file.type.startsWith('image/')) return
    setUploadingId(targetId)
    try {
      const url = await uploadImageFile(file)
      if (targetId === HEADER_LOGO_ID) {
        setHeaderLogo(url)
      } else {
        setLogos(prev => prev.map(l => l.id === targetId ? { ...l, imageUrl: url } : l))
      }
    } catch (e: any) {
      alert(e.message || 'Upload failed')
    } finally {
      setUploadingId(null)
    }
  }, [])

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const targetId = hoveredLogoIdRef.current
      if (!targetId) return
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) handleUpload(file, targetId)
          break
        }
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [handleUpload])

  const loadMedia = () => {
    if (mediaFiles.length > 0) return
    setMediaLoading(true)
    fetch('/api/admin/media')
      .then(r => r.json())
      .then(data => {
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
      const res = await fetch('/api/admin/preorder-header', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logos, theme, headerLogo }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setSaveError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const update = (id: string, patch: Partial<BrandLogo>) =>
    setLogos(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)))

  const remove = (id: string) => setLogos(prev => prev.filter(l => l.id !== id))

  const moveUp = (i: number) => {
    if (i === 0) return
    const arr = [...logos]
    ;[arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]
    setLogos(arr)
  }

  const moveDown = (i: number) => {
    if (i === logos.length - 1) return
    const arr = [...logos]
    ;[arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
    setLogos(arr)
  }

  const pickMediaUrl = (url: string) => {
    if (showMediaPicker === HEADER_LOGO_ID) {
      setHeaderLogo(url)
    } else if (showMediaPicker) {
      update(showMediaPicker, { imageUrl: url })
    }
    setShowMediaPicker(null)
  }

  const activeTheme = THEMES.find(t => t.value === theme) ?? THEMES[0]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Pre-Orders Header Editor</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Configure the logo, theme, and brand filters for the /pre-orders page header.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveError && <span className="text-sm text-red-600 font-medium">{saveError}</span>}
          <a href="/pre-orders" target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 bg-gray-100 text-gray-700 border rounded-md font-semibold hover:bg-gray-200 text-sm">
            🌐 View Page
          </a>
          <Button onClick={handleSave} disabled={saving} className={saved ? 'bg-green-600 hover:bg-green-700' : ''}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
          </Button>
        </div>
      </div>

      {/* ── Header Logo ── */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Site Logo (next to R66SLOT text)</CardTitle>
        </CardHeader>
        <CardContent>
          <input id="header-logo-file" type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f, HEADER_LOGO_ID); e.target.value = '' }} />
          <div className="flex items-center gap-4">
            <label
              htmlFor="header-logo-file"
              className={`w-20 h-20 rounded-xl border-2 flex items-center justify-center shrink-0 cursor-pointer overflow-hidden transition-colors ${
                headerLogoDragOver ? 'border-red-500 bg-red-50'
                : uploadingId === HEADER_LOGO_ID ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-red-400'
              }`}
              title="Click to upload, drag & drop, or paste"
              onMouseEnter={() => { hoveredLogoIdRef.current = HEADER_LOGO_ID }}
              onMouseLeave={() => { if (hoveredLogoIdRef.current === HEADER_LOGO_ID) hoveredLogoIdRef.current = null }}
              onDragOver={e => { e.preventDefault(); setHeaderLogoDragOver(true) }}
              onDragLeave={() => setHeaderLogoDragOver(false)}
              onDrop={e => {
                e.preventDefault(); setHeaderLogoDragOver(false)
                const f = e.dataTransfer.files[0]; if (f) handleUpload(f, HEADER_LOGO_ID)
              }}
            >
              {uploadingId === HEADER_LOGO_ID ? (
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : headerLogo ? (
                <img src={headerLogo} alt="Header logo" className="w-full h-full object-contain p-1" />
              ) : (
                <div className="flex flex-col items-center gap-0.5 text-center pointer-events-none">
                  <span className="text-gray-300 text-2xl">🖼</span>
                  <span className="text-[9px] text-gray-400 leading-tight">Click / Drop<br/>/ Paste</span>
                </div>
              )}
            </label>

            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={headerLogo}
                  onChange={e => setHeaderLogo(e.target.value)}
                  placeholder="https://... or upload from left"
                  className="h-8 text-sm font-mono flex-1"
                />
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs shrink-0"
                  onClick={() => { setShowMediaPicker(HEADER_LOGO_ID); loadMedia() }}>
                  📁
                </Button>
                {headerLogo && (
                  <Button variant="outline" size="sm" className="h-8 px-2 text-xs shrink-0 text-red-500 hover:text-red-700"
                    onClick={() => setHeaderLogo('')}>
                    ✕
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-400">Tip: use a PNG/WebP with transparent background for best results. Click / drag / paste image onto the box.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Theme Selector ── */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Header Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            {THEMES.map(t => (
              <button key={t.value} onClick={() => setTheme(t.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                  theme === t.value ? 'border-red-600 ring-2 ring-red-200' : 'border-gray-200 hover:border-gray-400'
                }`}>
                <span className="w-5 h-5 rounded-full border border-gray-300 shrink-0"
                  style={{ background: t.bg === 'transparent' ? 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 10px 10px' : t.bg }} />
                {t.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Live Preview ── */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Preview</p>
        <div className="rounded-xl px-6 py-4 flex items-center gap-4 overflow-x-auto"
          style={{ background: activeTheme.bg === 'transparent' ? 'repeating-conic-gradient(#bbb 0% 25%, #fff 0% 50%) 0 0 / 16px 16px' : activeTheme.bg }}>
          <div className="flex items-center gap-2 shrink-0">
            {headerLogo && (
              <img src={headerLogo} alt="logo" className="h-10 w-10 object-contain" />
            )}
            <span className="font-bold text-xl" style={{ color: activeTheme.text }}>
              R66<span style={{ color: activeTheme.sub }}>SLOT</span>
            </span>
          </div>
          <div className="flex items-center gap-3 ml-4">
            {logos.filter(l => l.active && l.imageUrl).length === 0 ? (
              <span className="text-sm italic" style={{ color: activeTheme.text, opacity: 0.4 }}>No active brand logos yet</span>
            ) : (
              logos.filter(l => l.active && l.imageUrl).map(l => (
                <div key={l.id} className="rounded-xl px-3 py-2 flex flex-col items-center gap-1"
                  style={{ background: 'rgba(255,255,255,0.1)' }} title={l.name}>
                  <img src={l.imageUrl} alt={l.name} className="h-8 object-contain" />
                  {l.name && <span className="text-[10px] font-bold" style={{ color: activeTheme.text }}>{l.name}</span>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Brand Logos ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Brand Logos</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setLogos(prev => [...prev, newLogo()])}>+ Add Brand</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {logos.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <p className="mb-3">No brand logos configured yet.</p>
              <Button variant="outline" onClick={() => setLogos([newLogo()])}>Add your first brand</Button>
            </div>
          )}

          {logos.map((logo, i) => (
            <div key={logo.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-gray-50">
              <input id={`logo-file-${logo.id}`} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f, logo.id); e.target.value = '' }} />

              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveUp(i)} disabled={i === 0} className="w-6 h-6 rounded border border-gray-300 text-gray-500 hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center text-xs">▲</button>
                <button onClick={() => moveDown(i)} disabled={i === logos.length - 1} className="w-6 h-6 rounded border border-gray-300 text-gray-500 hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center text-xs">▼</button>
              </div>

              <label htmlFor={`logo-file-${logo.id}`}
                className={`w-16 h-16 bg-white border-2 rounded-lg flex items-center justify-center shrink-0 overflow-hidden cursor-pointer relative transition-colors ${
                  dragOverId === logo.id ? 'border-red-500 bg-red-50'
                  : uploadingId === logo.id ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 hover:border-red-400'
                }`}
                title="Click to upload, drag & drop, or paste"
                onMouseEnter={() => { hoveredLogoIdRef.current = logo.id }}
                onMouseLeave={() => { if (hoveredLogoIdRef.current === logo.id) hoveredLogoIdRef.current = null }}
                onDragOver={e => { e.preventDefault(); setDragOverId(logo.id) }}
                onDragLeave={() => setDragOverId(null)}
                onDrop={e => { e.preventDefault(); setDragOverId(null); const f = e.dataTransfer.files[0]; if (f) handleUpload(f, logo.id) }}
              >
                {uploadingId === logo.id ? (
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : logo.imageUrl ? (
                  <img src={logo.imageUrl} alt={logo.name} className="max-w-full max-h-full object-contain p-1" />
                ) : (
                  <div className="flex flex-col items-center gap-0.5 pointer-events-none">
                    <span className="text-gray-300 text-xl">🖼</span>
                    <span className="text-[9px] text-gray-400 text-center leading-tight">Click / Drop / Paste</span>
                  </div>
                )}
              </label>

              <div className="flex-1 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Brand Name</label>
                  <Input value={logo.name} onChange={e => update(logo.id, { name: e.target.value })}
                    placeholder="e.g. Revo" className="h-8 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Image URL</label>
                  <div className="flex gap-1">
                    <Input value={logo.imageUrl} onChange={e => update(logo.id, { imageUrl: e.target.value })}
                      placeholder="https://... or upload ↑" className="h-8 text-sm font-mono flex-1" />
                    <Button variant="outline" size="sm" className="h-8 px-2 text-xs shrink-0"
                      onClick={() => { setShowMediaPicker(logo.id); loadMedia() }}>
                      📁
                    </Button>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <input type="checkbox" checked={logo.active}
                  onChange={e => update(logo.id, { active: e.target.checked })}
                  className="w-4 h-4 accent-red-600" />
                <span className="text-sm text-gray-600">Active</span>
              </label>

              <button onClick={() => remove(logo.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {logos.length > 0 && (
            <button onClick={() => setLogos(prev => [...prev, newLogo()])}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors">
              + Add Brand
            </button>
          )}
        </CardContent>
      </Card>

      {/* ── Media Picker Modal ── */}
      {showMediaPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">
                {showMediaPicker === HEADER_LOGO_ID ? 'Select Site Logo' : 'Select Brand Logo Image'}
              </h3>
              <button onClick={() => setShowMediaPicker(null)} className="text-gray-400 hover:text-gray-700">
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
                  <a href="/admin/media" target="_blank" className="text-sm text-red-600 hover:underline">Upload images in Media Library →</a>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {mediaFiles.map(file => (
                    <button key={file.id} onClick={() => pickMediaUrl(file.url)}
                      className="aspect-square rounded-lg border-2 border-transparent hover:border-red-500 overflow-hidden bg-gray-100 transition-colors"
                      title={file.name}>
                      <img src={file.url} alt={file.name} className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t flex justify-between items-center">
              <p className="text-xs text-gray-400">Or enter a URL manually:</p>
              <div className="flex gap-2 flex-1 ml-4">
                <input type="url" placeholder="https://..."
                  className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim()
                      if (val) pickMediaUrl(val)
                    }
                  }} />
                <span className="text-xs text-gray-400 self-center">Press Enter</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
