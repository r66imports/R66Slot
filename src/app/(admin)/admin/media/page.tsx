'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface MediaFile {
  id: string
  name: string
  url: string
  type: string
  size: number
  folder: string
  uploadedAt: string
}

interface MediaLibrary {
  files: MediaFile[]
  folders: string[]
}

interface UsageResult {
  products: { id: string; title: string; sku: string }[]
  pages: { id: string; title: string; slug: string }[]
}

type SortBy = 'name' | 'date' | 'size' | 'type'
type SortDir = 'asc' | 'desc'
type ViewMode = 'grid' | 'list'
type AspectRatio = '1/1' | '4/3' | '16/9' | null

// ─── Media Editor Panel ───────────────────────────────────────────────────────
function MediaEditorPanel({
  file,
  onClose,
  onSaved,
}: {
  file: MediaFile
  onClose: () => void
  onSaved: (oldUrl: string, newFile: MediaFile) => void
}) {
  const [aspect, setAspect] = useState<AspectRatio>(null)
  const [customW, setCustomW] = useState('')
  const [customH, setCustomH] = useState('')
  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(0)
  const [saturation, setSaturation] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [usage, setUsage] = useState<UsageResult | null>(null)
  const [loadingUsage, setLoadingUsage] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState('')
  const [naturalW, setNaturalW] = useState(0)
  const [naturalH, setNaturalH] = useState(0)
  const [previewUrl, setPreviewUrl] = useState(file.url)
  const [savedNewUrl, setSavedNewUrl] = useState('')
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const isImage = file.type.startsWith('image/')

  // Load image dimensions via proxy to avoid CORS issues
  useEffect(() => {
    if (!isImage) return
    const img = new Image()
    img.onload = () => { setNaturalW(img.naturalWidth); setNaturalH(img.naturalHeight) }
    img.src = `/api/admin/media/proxy?url=${encodeURIComponent(file.url)}`
  }, [file.url, isImage])

  // Scan usage on open
  useEffect(() => {
    scanUsage()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.url])

  async function scanUsage() {
    setLoadingUsage(true)
    try {
      const [prodRes, pageRes] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/admin/pages'),
      ])
      const products: any[] = prodRes.ok ? await prodRes.json() : []
      const pages: any[] = pageRes.ok ? await pageRes.json() : []

      const matchedProducts = products.filter(p => {
        if (p.imageUrl === file.url) return true
        if (Array.isArray(p.images) && p.images.includes(file.url)) return true
        return false
      }).map(p => ({ id: p.id, title: p.title || p.sku, sku: p.sku }))

      const matchedPages = pages.filter(p => {
        const str = JSON.stringify(p)
        return str.includes(file.url)
      }).map(p => ({ id: p.id, title: p.title, slug: p.slug }))

      setUsage({ products: matchedProducts, pages: matchedPages })
    } catch { setUsage({ products: [], pages: [] }) }
    finally { setLoadingUsage(false) }
  }

  // Apply brightness / contrast / saturation adjustments to canvas pixels
  function applyEnhancements(
    ctx: CanvasRenderingContext2D, w: number, h: number,
    bri: number, con: number, sat: number
  ) {
    const imageData = ctx.getImageData(0, 0, w, h)
    const d = imageData.data
    // Contrast factor: 0 = no change; ±127 = strong
    const cf = (259 * (con + 255)) / (255 * (259 - con))
    // Saturation multiplier: 0 = no change
    const sf = 1 + sat / 100

    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2]
      // Brightness
      r += bri; g += bri; b += bri
      // Contrast (scale around midpoint 128)
      r = cf * (r - 128) + 128
      g = cf * (g - 128) + 128
      b = cf * (b - 128) + 128
      // Saturation via perceived luminance
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      r = lum + (r - lum) * sf
      g = lum + (g - lum) * sf
      b = lum + (b - lum) * sf
      d[i]     = Math.max(0, Math.min(255, Math.round(r)))
      d[i + 1] = Math.max(0, Math.min(255, Math.round(g)))
      d[i + 2] = Math.max(0, Math.min(255, Math.round(b)))
    }
    ctx.putImageData(imageData, 0, 0)
  }

  // Process image: crop to aspect ratio + resize to custom px
  async function handleApply() {
    if (!isImage) return
    setProcessing(true)
    try {
      // Proxy through server to avoid canvas CORS taint on R2 images
      const proxyUrl = `/api/admin/media/proxy?url=${encodeURIComponent(file.url)}`
      const fetchRes = await fetch(proxyUrl)
      if (!fetchRes.ok) throw new Error('Failed to fetch image via proxy')
      const imageBlob = await fetchRes.blob()
      const objectUrl = URL.createObjectURL(imageBlob)

      const img = new Image()
      await new Promise<void>((res, rej) => {
        img.onload = () => res()
        img.onerror = rej
        img.src = objectUrl
      })

      const srcW = img.naturalWidth
      const srcH = img.naturalHeight

      // Determine target aspect
      let targetAR: number | null = null
      if (aspect === '1/1') targetAR = 1
      else if (aspect === '4/3') targetAR = 4 / 3
      else if (aspect === '16/9') targetAR = 16 / 9

      // Crop source rect to target aspect ratio (center crop)
      let cropX = 0, cropY = 0, cropW = srcW, cropH = srcH
      if (targetAR) {
        const srcAR = srcW / srcH
        if (srcAR > targetAR) {
          cropW = Math.round(srcH * targetAR)
          cropX = Math.round((srcW - cropW) / 2)
        } else {
          cropH = Math.round(srcW / targetAR)
          cropY = Math.round((srcH - cropH) / 2)
        }
      }

      // Output dimensions
      let outW = cropW
      let outH = cropH
      const pw = parseInt(customW)
      const ph = parseInt(customH)
      if (pw > 0 && ph > 0) { outW = pw; outH = ph }
      else if (pw > 0) { outW = pw; outH = Math.round(pw / (cropW / cropH)) }
      else if (ph > 0) { outH = ph; outW = Math.round(ph * (cropW / cropH)) }

      const canvas = canvasRef.current!
      canvas.width = outW
      canvas.height = outH
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outW, outH)
      if (brightness !== 0 || contrast !== 0 || saturation !== 0) {
        applyEnhancements(ctx, outW, outH, brightness, contrast, saturation)
      }
      URL.revokeObjectURL(objectUrl)

      // Determine mime type — keep original type
      const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'

      let blob: Blob
      try {
        blob = await new Promise<Blob>((res, rej) =>
          canvas.toBlob(b => b ? res(b) : rej(new Error('canvas.toBlob returned null')), mime, 0.92)
        )
      } catch (blobErr: any) {
        throw new Error(`Canvas export failed — ${blobErr?.message || blobErr}. This can happen if the image failed to load via proxy.`)
      }

      // Extract R2 key — handles both /api/media/... and absolute R2 public URLs
      let r2Key: string
      const apiMatch = file.url.match(/\/api\/media\/([^?]+)/)
      if (apiMatch) {
        r2Key = apiMatch[1]
      } else {
        try {
          r2Key = new URL(file.url).pathname.replace(/^\//, '')
        } catch {
          r2Key = file.url.replace(/^\//, '')
        }
      }

      const form = new FormData()
      form.append('file', blob, file.name)
      form.append('overwriteKey', r2Key)
      const upRes = await fetch('/api/admin/media/upload', { method: 'POST', body: form })
      if (!upRes.ok) throw new Error('Upload failed')

      // URL is unchanged — just bust browser cache on preview with a timestamp param
      const cacheBustedUrl = file.url + (file.url.includes('?') ? '&' : '?') + 't=' + Date.now()
      setPreviewUrl(cacheBustedUrl)
      setSavedNewUrl('')   // no new URL — sync not needed
      setSyncResult('Saved — same URL, website will show updated image automatically.')
      setNaturalW(outW)
      setNaturalH(outH)

      const updatedFile: MediaFile = {
        ...file,
        size: blob.size,
        type: mime,
        uploadedAt: new Date().toISOString(),
      }
      onSaved(file.url, updatedFile)
    } catch (err) {
      alert('Processing failed. Check console.')
      console.error(err)
    } finally {
      setProcessing(false)
    }
  }

  async function handleSync() {
    const urlToSync = savedNewUrl || file.url
    if (!savedNewUrl && !confirm('No edited version saved. Sync current URL everywhere?')) return
    setSyncing(true)
    setSyncResult('')
    try {
      const res = await fetch('/api/admin/media/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldUrl: file.url, newUrl: urlToSync }),
      })
      const data = await res.json()
      if (res.ok) {
        setSyncResult(`✓ Synced — ${data.products} product(s), ${data.pages} page(s) updated`)
        await scanUsage()
      } else {
        setSyncResult(`Error: ${data.error || 'Sync failed'}`)
      }
    } catch {
      setSyncResult('Error: Could not reach sync endpoint')
    } finally {
      setSyncing(false)
    }
  }

  const totalUsage = (usage?.products.length ?? 0) + (usage?.pages.length ?? 0)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div>
            <h2 className="text-base font-bold text-gray-900 font-play">Edit Image</h2>
            <p className="text-xs text-gray-500 truncate max-w-[300px]">{file.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Image Preview */}
          <div className="bg-gray-900 flex items-center justify-center" style={{ minHeight: 200 }}>
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={previewUrl}
                alt={file.name}
                className="max-w-full max-h-64 object-contain"
              />
            ) : (
              <div className="text-gray-400 text-5xl py-12">📄</div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {/* Image info */}
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex gap-4 text-xs text-gray-500">
            <span>{(file.size / 1024).toFixed(0)} KB</span>
            {naturalW > 0 && <span>{naturalW} × {naturalH} px</span>}
            <span>{file.type.split('/')[1]?.toUpperCase()}</span>
          </div>

          <div className="px-5 py-4 space-y-5">
            {/* Open in Photo Editor */}
            <div>
              <a
                href={`/admin/photo-editor?url=${encodeURIComponent(file.url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border-2 border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 transition-colors font-play"
              >
                🖌️ Open in Photo Editor
              </a>
            </div>

            {isImage && (
              <>
                {/* Aspect Ratio */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 font-play">
                    Aspect Ratio (center crop)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {([
                      { value: null, label: 'Original' },
                      { value: '1/1', label: '1:1' },
                      { value: '4/3', label: '4:3' },
                      { value: '16/9', label: '16:9' },
                    ] as { value: AspectRatio; label: string }[]).map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => setAspect(opt.value)}
                        className={`py-2 rounded-lg border-2 text-xs font-semibold font-play transition-all ${
                          aspect === opt.value
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* PX Size */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 font-play">
                    Custom Size (px)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Width"
                      value={customW}
                      onChange={e => setCustomW(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-play"
                    />
                    <span className="text-gray-400 text-sm">×</span>
                    <input
                      type="number"
                      placeholder="Height"
                      value={customH}
                      onChange={e => setCustomH(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-play"
                    />
                    <span className="text-xs text-gray-400">px</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 font-play">Leave blank to keep cropped size</p>
                </div>

                {/* Image Enhancer */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide font-play">
                      Image Enhancer
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setBrightness(8); setContrast(25); setSaturation(20) }}
                        className="text-[10px] font-semibold px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 font-play"
                      >
                        ✨ Auto Enhance
                      </button>
                      {(brightness !== 0 || contrast !== 0 || saturation !== 0) && (
                        <button
                          type="button"
                          onClick={() => { setBrightness(0); setContrast(0); setSaturation(0) }}
                          className="text-[10px] font-semibold px-2 py-1 rounded bg-gray-200 text-gray-600 hover:bg-gray-300 font-play"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {([
                      { label: 'Brightness', value: brightness, set: setBrightness },
                      { label: 'Contrast',   value: contrast,   set: setContrast   },
                      { label: 'Saturation', value: saturation, set: setSaturation },
                    ] as { label: string; value: number; set: (v: number) => void }[]).map(({ label, value, set }) => (
                      <div key={label}>
                        <div className="flex justify-between text-[11px] text-gray-500 font-play mb-1">
                          <span>{label}</span>
                          <span className={`font-mono font-semibold ${value !== 0 ? 'text-indigo-600' : 'text-gray-400'}`}>
                            {value > 0 ? `+${value}` : value}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          step={1}
                          value={value}
                          onChange={e => set(Number(e.target.value))}
                          className="w-full accent-indigo-600 h-1.5"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Apply */}
                <button
                  onClick={handleApply}
                  disabled={processing || (!aspect && !customW && !customH && brightness === 0 && contrast === 0 && saturation === 0)}
                  className="w-full py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-play"
                >
                  {processing ? 'Processing…' : '✂ Apply & Overwrite'}
                </button>
                <p className="text-[10px] text-gray-400 text-center -mt-3 font-play">
                  Overwrites original file — same URL, website updates automatically
                </p>

                {syncResult && !syncing && (
                  <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    {syncResult}
                  </div>
                )}
              </>
            )}

            {/* Where Used */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 font-play">
                Where This Image is Used
              </label>
              {loadingUsage ? (
                <p className="text-xs text-gray-400 font-play">Scanning…</p>
              ) : usage ? (
                <div className="space-y-1.5">
                  {totalUsage === 0 ? (
                    <p className="text-xs text-gray-400 font-play">Not found in any products or pages</p>
                  ) : (
                    <>
                      {usage.products.map(p => (
                        <div key={p.id} className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-gray-400">📦</span>
                          <a href={`/admin/products/${p.id}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-play truncate">
                            {p.title}
                          </a>
                          {p.sku && <span className="text-gray-400 font-mono ml-auto">{p.sku}</span>}
                        </div>
                      ))}
                      {usage.pages.map(p => (
                        <div key={p.id} className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-gray-400">📄</span>
                          <a href={`/admin/pages/editor/${p.id}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-play truncate">
                            {p.title}
                          </a>
                          <span className="text-gray-400 ml-auto">/{p.slug}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ) : null}
            </div>

            {/* Sync */}
            <div className="border-t border-gray-100 pt-4">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 font-play flex items-center justify-center gap-2"
              >
                {syncing ? 'Synchronizing…' : '↻ Sync Image to Website'}
              </button>
              <p className="text-[10px] text-gray-400 mt-1.5 text-center font-play">
                Force-refreshes all product & page references to this image URL
              </p>
              {syncResult && (
                <p className={`text-xs mt-2 text-center font-medium font-play ${syncResult.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                  {syncResult}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MediaLibraryPage() {
  const [library, setLibrary] = useState<MediaLibrary>({ files: [], folders: [] })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('')
  const [currentPath, setCurrentPath] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [moveTarget, setMoveTarget] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null)
  const [draggedFolderPath, setDraggedFolderPath] = useState<string | null>(null)
  const [dragOverFolderPath, setDragOverFolderPath] = useState<string | null>(null)
  const [editingFile, setEditingFile] = useState<MediaFile | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const libraryRef = useRef(library)
  const currentPathRef = useRef(currentPath)
  useEffect(() => { libraryRef.current = library }, [library])
  useEffect(() => { currentPathRef.current = currentPath }, [currentPath])

  useEffect(() => { loadLibrary() }, [])

  const loadLibrary = async () => {
    try {
      const res = await fetch('/api/admin/media')
      if (res.ok) {
        const data = await res.json()
        const files = (data.files || []).map((f: MediaFile) => ({
          ...f,
          folder: f.folder === 'All Files' ? '' : (f.folder ?? ''),
        }))
        const folders = (data.folders || []).filter((f: string) => f !== 'All Files')
        setLibrary({ files, folders })
      }
    } catch (err) { console.error('Failed to load media library:', err) }
  }

  const saveLibrary = useCallback(async (lib: MediaLibrary) => {
    setSaving(true)
    try {
      await fetch('/api/admin/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lib),
      })
    } catch (err) { console.error('Failed to save media library:', err) }
    finally { setSaving(false) }
  }, [])

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items || [])
      const imageItems = items.filter(item => item.type.startsWith('image/'))
      if (imageItems.length === 0) return
      setUploading(true)
      const newFiles: MediaFile[] = []
      for (const item of imageItems) {
        const file = item.getAsFile()
        if (!file) continue
        try {
          const formData = new FormData()
          const name = `paste-${Date.now()}.png`
          formData.append('file', file, name)
          const res = await fetch('/api/admin/media/upload', { method: 'POST', body: formData })
          const data = await res.json()
          if (res.ok) {
            newFiles.push({
              id: `media-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              name, url: data.url, type: file.type, size: file.size,
              folder: currentPathRef.current, uploadedAt: new Date().toISOString(),
            })
          }
        } catch {}
      }
      if (newFiles.length > 0) {
        const updated = { ...libraryRef.current, files: [...newFiles, ...libraryRef.current.files] }
        setLibrary(updated)
        await saveLibrary(updated)
      }
      setUploading(false)
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [saveLibrary])

  const uploadFiles = async (files: File[]) => {
    setUploading(true)
    setUploadError('')
    const newFiles: MediaFile[] = []
    const errors: string[] = []
    for (const file of files) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/admin/media/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (res.ok) {
          newFiles.push({
            id: `media-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            name: file.name, url: data.url, type: file.type, size: file.size,
            folder: currentPath, uploadedAt: new Date().toISOString(),
          })
        } else { errors.push(`${file.name}: ${data.error || 'Upload failed'}`) }
      } catch (err: any) { errors.push(`${file.name}: ${err?.message || 'Network error'}`) }
    }
    if (newFiles.length > 0) {
      const updated = { ...library, files: [...newFiles, ...library.files] }
      setLibrary(updated)
      await saveLibrary(updated)
    }
    if (errors.length > 0) setUploadError(errors.join('\n'))
    setUploading(false)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    await uploadFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  const handleDelete = async (id: string) => {
    const updated = { ...library, files: library.files.filter(f => f.id !== id) }
    setLibrary(updated)
    setSelectedFiles(prev => { const n = new Set(prev); n.delete(id); return n })
    await saveLibrary(updated)
  }

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return
    if (!confirm(`Delete ${selectedFiles.size} file(s)?`)) return
    const updated = { ...library, files: library.files.filter(f => !selectedFiles.has(f.id)) }
    setLibrary(updated)
    setSelectedFiles(new Set())
    await saveLibrary(updated)
  }

  // Persist a single file's folder to the DB
  const patchFileFolder = async (url: string, folder: string) => {
    await fetch('/api/admin/media', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, folder }),
    })
  }

  const handleBulkMove = async (targetFolder: string) => {
    const ids = Array.from(selectedFiles)
    const filesToMove = library.files.filter(f => ids.includes(f.id))
    const updated = { ...library, files: library.files.map(f => ids.includes(f.id) ? { ...f, folder: targetFolder } : f) }
    setLibrary(updated)
    setSelectedFiles(new Set())
    setMoveTarget(null)
    // Save folder list + persist each file's folder to DB
    await Promise.all([
      saveLibrary(updated),
      ...filesToMove.map(f => patchFileFolder(f.url, targetFolder)),
    ])
  }

  const handleCopyUrl = (url: string) => navigator.clipboard.writeText(url)

  const moveFile = async (fileId: string, targetFolder: string) => {
    const file = library.files.find(f => f.id === fileId)
    if (!file || file.folder === targetFolder) return
    const updated = { ...library, files: library.files.map(f => f.id === fileId ? { ...f, folder: targetFolder } : f) }
    setLibrary(updated)
    // Persist folder assignment to DB
    await Promise.all([
      saveLibrary(updated),
      patchFileFolder(file.url, targetFolder),
    ])
  }

  const moveFolder = async (srcPath: string, destParent: string) => {
    if (srcPath === destParent || destParent.startsWith(srcPath + '/')) return
    const folderName = srcPath.split('/').pop()!
    const newPath = destParent ? `${destParent}/${folderName}` : folderName
    if (srcPath === newPath) return
    const newFolders = library.folders.map(f => {
      if (f === srcPath) return newPath
      if (f.startsWith(srcPath + '/')) return newPath + f.slice(srcPath.length)
      return f
    })
    const newFiles = library.files.map(f => {
      if (f.folder === srcPath) return { ...f, folder: newPath }
      if (f.folder.startsWith(srcPath + '/')) return { ...f, folder: newPath + f.folder.slice(srcPath.length) }
      return f
    })
    const updated = { ...library, folders: newFolders, files: newFiles }
    setLibrary(updated)
    // Persist each moved file's new folder to DB
    const movedFiles = newFiles.filter(f => f.folder === newPath || f.folder.startsWith(newPath + '/'))
    await Promise.all([
      saveLibrary(updated),
      ...movedFiles.map(f => patchFileFolder(f.url, f.folder)),
    ])
  }

  const handleCreateFolder = () => {
    const name = newFolderName.trim()
    if (!name) return
    const fullPath = currentPath ? `${currentPath}/${name}` : name
    if (library.folders.includes(fullPath)) return
    const updated = { ...library, folders: [...library.folders, fullPath].sort() }
    setLibrary(updated)
    setNewFolderName('')
    setShowNewFolder(false)
    saveLibrary(updated)
  }

  const handleDeleteFolder = async (folderPath: string) => {
    if (!confirm(`Delete folder "${folderPath.split('/').pop()}"? Files inside will be moved to root.`)) return
    const affectedFiles = library.files.filter(f => f.folder === folderPath || f.folder.startsWith(folderPath + '/'))
    const newFolders = library.folders.filter(f => f !== folderPath && !f.startsWith(folderPath + '/'))
    const newFiles = library.files.map(f =>
      (f.folder === folderPath || f.folder.startsWith(folderPath + '/')) ? { ...f, folder: '' } : f
    )
    const updated = { ...library, folders: newFolders, files: newFiles }
    setLibrary(updated)
    if (currentPath === folderPath || currentPath.startsWith(folderPath + '/')) setCurrentPath('')
    // Persist each affected file's folder reset to DB
    await Promise.all([
      saveLibrary(updated),
      ...affectedFiles.map(f => patchFileFolder(f.url, '')),
    ])
  }

  const toggleFileSelect = (id: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Handle saved edited file — replace old entry, add new one
  const handleFileSaved = (oldUrl: string, newFile: MediaFile) => {
    setLibrary(prev => {
      const withoutOld = prev.files.filter(f => f.url !== oldUrl)
      const exists = withoutOld.find(f => f.url === newFile.url)
      const updated = exists ? withoutOld : [{ ...newFile, id: `media-${Date.now()}-${Math.random().toString(36).substring(7)}`, folder: currentPath }, ...withoutOld]
      const lib = { ...prev, files: updated }
      saveLibrary(lib)
      return lib
    })
  }

  const foldersHere = library.folders.filter(f => {
    if (currentPath === '') return !f.includes('/')
    return f.startsWith(currentPath + '/') && f.slice(currentPath.length + 1).indexOf('/') === -1
  })

  const filteredFiles = library.files
    .filter(f => {
      if (f.folder !== currentPath) return false
      if (filter && !f.name.toLowerCase().includes(filter.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortBy === 'date') cmp = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
      else if (sortBy === 'size') cmp = a.size - b.size
      else if (sortBy === 'type') cmp = a.type.localeCompare(b.type)
      return sortDir === 'asc' ? cmp : -cmp
    })

  const breadcrumbs = currentPath ? currentPath.split('/') : []
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })

  const totalSize = library.files.reduce((s, f) => s + f.size, 0)

  const handleDragOverFolder = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault()
    setDragOverFolderPath(folderPath)
  }

  const handleDropOnFolder = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (draggedFileId) moveFile(draggedFileId, folderPath)
    else if (draggedFolderPath && draggedFolderPath !== folderPath) moveFolder(draggedFolderPath, folderPath)
    setDragOverFolderPath(null)
    setDraggedFileId(null)
    setDraggedFolderPath(null)
  }

  return (
    <div>
      {editingFile && (
        <MediaEditorPanel
          file={editingFile}
          onClose={() => setEditingFile(null)}
          onSaved={handleFileSaved}
        />
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-play">Media Library</h1>
          <p className="text-gray-500 mt-1 text-sm font-play">
            {library.files.length} files · {formatSize(totalSize)} total
            {saving && <span className="ml-2 text-blue-500">Saving...</span>}
            {uploading && <span className="ml-2 text-indigo-500">Uploading...</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="font-play">
            {uploading ? 'Uploading...' : 'Upload Files'}
          </Button>
          <input ref={fileInputRef} type="file" multiple
            accept="image/*,.pdf,.doc,.docx,.mp4,.webm,.svg,.gif,.webp"
            onChange={handleUpload} className="hidden"
          />
        </div>
      </div>

      {uploadError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-700 mb-1">Upload failed:</p>
          <pre className="text-xs text-red-600 whitespace-pre-wrap">{uploadError}</pre>
          <button onClick={() => setUploadError('')} className="mt-2 text-xs text-red-500 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 mb-4 text-sm flex-wrap">
        <button onClick={() => setCurrentPath('')}
          className={`font-semibold font-play hover:text-blue-600 ${currentPath === '' ? 'text-gray-900' : 'text-blue-500'}`}>
          Media Library
        </button>
        {breadcrumbs.map((seg, i) => {
          const path = breadcrumbs.slice(0, i + 1).join('/')
          return (
            <span key={path} className="flex items-center gap-1">
              <span className="text-gray-400">/</span>
              <button onClick={() => setCurrentPath(path)}
                className={`font-semibold font-play hover:text-blue-600 ${currentPath === path ? 'text-gray-900' : 'text-blue-500'}`}>
                {seg}
              </button>
            </span>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <input type="text" placeholder="Search files..." value={filter}
          onChange={e => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-56 font-play"
        />
        <button onClick={() => setShowNewFolder(!showNewFolder)}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 font-play">
          📁 New Folder
        </button>
        {showNewFolder && (
          <div className="flex items-center gap-1">
            <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolder(false) }}
              placeholder="Folder name"
              className="px-3 py-2 border border-blue-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-play"
              autoFocus
            />
            <button onClick={handleCreateFolder} className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-play">Create</button>
            <button onClick={() => { setShowNewFolder(false); setNewFolderName('') }} className="px-2 py-2 text-sm text-gray-500 hover:text-gray-700">✕</button>
          </div>
        )}
        <select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)}
          className="px-2 py-2 border border-gray-300 rounded-lg text-sm font-play">
          <option value="date">Sort: Date</option>
          <option value="name">Sort: Name</option>
          <option value="size">Sort: Size</option>
          <option value="type">Sort: Type</option>
        </select>
        <button onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
          className="px-2 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          title={sortDir === 'asc' ? 'Ascending' : 'Descending'}>
          {sortDir === 'asc' ? '↑' : '↓'}
        </button>
        <div className="flex border border-gray-300 rounded-lg overflow-hidden">
          <button onClick={() => setViewMode('grid')}
            className={`px-3 py-2 text-sm font-play ${viewMode === 'grid' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}>Grid</button>
          <button onClick={() => setViewMode('list')}
            className={`px-3 py-2 text-sm border-l border-gray-300 font-play ${viewMode === 'list' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}>List</button>
        </div>
        <p className="text-xs text-gray-400 font-play ml-1">Paste image to upload</p>

        {selectedFiles.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-500 font-play">{selectedFiles.size} selected</span>
            {selectedFiles.size === 1 && (() => {
              const f = library.files.find(f => f.id === Array.from(selectedFiles)[0])
              return f ? (
                <button onClick={() => setEditingFile(f)}
                  className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded border border-indigo-200 hover:bg-indigo-100 font-play font-semibold">
                  ✏️ Edit Image
                </button>
              ) : null
            })()}
            <div className="relative">
              <button onClick={() => setMoveTarget(moveTarget ? null : 'open')}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 font-play">
                Move to...
              </button>
              {moveTarget && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-48 max-h-48 overflow-y-auto">
                  <button onClick={() => handleBulkMove('')}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 font-play">📁 Root</button>
                  {library.folders.map(folder => (
                    <button key={folder} onClick={() => handleBulkMove(folder)}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 font-play">📂 {folder}</button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleBulkDelete}
              className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100 font-play">Delete</button>
            <button onClick={() => setSelectedFiles(new Set())}
              className="px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded border border-gray-200 hover:bg-gray-100 font-play">Clear</button>
          </div>
        )}
      </div>

      {/* Content */}
      {foldersHere.length === 0 && filteredFiles.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-6xl mb-4">🖼️</div>
            <h3 className="text-xl font-semibold mb-2 font-play">
              {library.files.length === 0 ? 'No Media Files' : 'This folder is empty'}
            </h3>
            <p className="text-gray-600 mb-6 font-play">
              {library.files.length === 0
                ? 'Upload images, paste from clipboard, or drag files here.'
                : 'Upload files or drag them here from another folder.'}
            </p>
            {library.files.length === 0 && (
              <Button onClick={() => fileInputRef.current?.click()} className="font-play">Upload Your First File</Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {/* Folder cards */}
          {foldersHere.map(folderPath => {
            const folderName = folderPath.split('/').pop()!
            const fileCount = library.files.filter(f => f.folder === folderPath || f.folder.startsWith(folderPath + '/')).length
            const subCount = library.folders.filter(f => f.startsWith(folderPath + '/')).length
            const isDropTarget = dragOverFolderPath === folderPath
            const isBeingDragged = draggedFolderPath === folderPath
            return (
              <div key={folderPath} draggable
                onDragStart={e => { e.stopPropagation(); setDraggedFolderPath(folderPath); setDraggedFileId(null) }}
                onDragEnd={() => { setDraggedFolderPath(null); setDragOverFolderPath(null) }}
                onDragOver={e => handleDragOverFolder(e, folderPath)}
                onDragLeave={() => setDragOverFolderPath(null)}
                onDrop={e => handleDropOnFolder(e, folderPath)}
                onClick={() => setCurrentPath(folderPath)}
                className={`group relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all select-none ${
                  isDropTarget ? 'border-green-400 bg-green-50 shadow-lg scale-105'
                    : isBeingDragged ? 'opacity-50 border-dashed border-gray-400'
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                <div className="bg-gradient-to-br from-yellow-50 to-amber-100 h-28 flex items-center justify-center relative">
                  <span className="text-5xl">{isDropTarget ? '📂' : '📁'}</span>
                  {isDropTarget && (
                    <div className="absolute inset-0 bg-green-100/50 flex items-center justify-center">
                      <span className="text-green-700 text-sm font-semibold font-play bg-white/80 px-3 py-1 rounded-lg shadow">Drop here</span>
                    </div>
                  )}
                  <button onClick={e => { e.stopPropagation(); handleDeleteFolder(folderPath) }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-white/80 rounded-lg text-gray-400 hover:text-red-500 transition-opacity"
                    title="Delete folder">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div className="bg-white px-3 py-2">
                  <p className="text-sm font-semibold text-gray-800 truncate font-play">{folderName}</p>
                  <p className="text-xs text-gray-400 font-play">
                    {fileCount} file{fileCount !== 1 ? 's' : ''}
                    {subCount > 0 ? ` · ${subCount} folder${subCount !== 1 ? 's' : ''}` : ''}
                  </p>
                </div>
              </div>
            )
          })}

          {/* File cards */}
          {filteredFiles.map(file => (
            <Card key={file.id} draggable
              onDragStart={e => { e.stopPropagation(); setDraggedFileId(file.id); setDraggedFolderPath(null) }}
              onDragEnd={() => { setDraggedFileId(null); setDragOverFolderPath(null) }}
              className={`overflow-hidden group cursor-grab active:cursor-grabbing transition-all ${
                selectedFiles.has(file.id) ? 'ring-2 ring-blue-500 shadow-md'
                  : draggedFileId === file.id ? 'opacity-50 ring-2 ring-dashed ring-gray-400'
                  : 'hover:shadow-lg'
              }`}
              onClick={() => toggleFileSelect(file.id)}
            >
              <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                {selectedFiles.has(file.id) && (
                  <div className="absolute top-2 left-2 z-10 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
                {file.type.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.url} alt={file.name} className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center p-4">
                    <div className="text-4xl mb-2">
                      {file.type.includes('pdf') ? '📕' : file.type.includes('video') ? '🎬' : '📄'}
                    </div>
                    <p className="text-xs text-gray-500 truncate font-play">{file.name}</p>
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 flex-wrap p-2">
                  <button onClick={e => { e.stopPropagation(); setEditingFile(file) }}
                    className="px-2 py-1 bg-indigo-600 text-white text-xs rounded shadow font-play font-semibold hover:bg-indigo-700">
                    ✏️ Edit
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleCopyUrl(file.url) }}
                    className="px-2 py-1 bg-white text-gray-800 text-xs rounded shadow font-play hover:bg-gray-100">
                    Copy URL
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(file.id) }}
                    className="px-2 py-1 bg-red-500 text-white text-xs rounded shadow font-play hover:bg-red-600">
                    Delete
                  </button>
                </div>
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate font-play">{file.name}</p>
                <p className="text-xs text-gray-400 font-play">{formatSize(file.size)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* List view */
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-[auto,1fr,100px,100px,120px,100px] gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase font-play">
            <div className="w-5"></div>
            <div>Name</div>
            <div>Type</div>
            <div>Size</div>
            <div>Date</div>
            <div>Actions</div>
          </div>

          {foldersHere.map(folderPath => {
            const folderName = folderPath.split('/').pop()!
            const fileCount = library.files.filter(f => f.folder === folderPath || f.folder.startsWith(folderPath + '/')).length
            const isDropTarget = dragOverFolderPath === folderPath
            return (
              <div key={folderPath} draggable
                onDragStart={e => { e.stopPropagation(); setDraggedFolderPath(folderPath); setDraggedFileId(null) }}
                onDragEnd={() => { setDraggedFolderPath(null); setDragOverFolderPath(null) }}
                onDragOver={e => handleDragOverFolder(e, folderPath)}
                onDragLeave={() => setDragOverFolderPath(null)}
                onDrop={e => handleDropOnFolder(e, folderPath)}
                onClick={() => setCurrentPath(folderPath)}
                className={`grid grid-cols-[auto,1fr,100px,100px,120px,100px] gap-3 px-4 py-2.5 items-center border-b border-gray-100 cursor-pointer transition-colors group ${
                  isDropTarget ? 'bg-green-50 ring-inset ring-2 ring-green-400' : draggedFolderPath === folderPath ? 'opacity-50' : 'hover:bg-amber-50'
                }`}
              >
                <div className="w-5 h-5 text-base">📁</div>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold truncate font-play text-gray-800">{folderName}</span>
                  {isDropTarget && <span className="text-xs text-green-600 font-play">Drop here</span>}
                </div>
                <div className="text-xs text-gray-400 font-play">Folder</div>
                <div className="text-xs text-gray-400 font-play">{fileCount} item{fileCount !== 1 ? 's' : ''}</div>
                <div></div>
                <div>
                  <button onClick={e => { e.stopPropagation(); handleDeleteFolder(folderPath) }}
                    className="text-[10px] text-red-600 hover:underline font-play">Del</button>
                </div>
              </div>
            )
          })}

          {filteredFiles.map(file => (
            <div key={file.id} draggable
              onDragStart={e => { e.stopPropagation(); setDraggedFileId(file.id); setDraggedFolderPath(null) }}
              onDragEnd={() => setDraggedFileId(null)}
              onClick={() => toggleFileSelect(file.id)}
              className={`grid grid-cols-[auto,1fr,100px,100px,120px,100px] gap-3 px-4 py-2.5 items-center border-b border-gray-100 cursor-grab active:cursor-grabbing transition-colors ${
                selectedFiles.has(file.id) ? 'bg-blue-50' : draggedFileId === file.id ? 'opacity-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="w-5 h-5">
                <div className={`w-4 h-4 rounded border ${selectedFiles.has(file.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'} flex items-center justify-center`}>
                  {selectedFiles.has(file.id) && <span className="text-white text-[10px]">✓</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                {file.type.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 text-sm">
                    {file.type.includes('pdf') ? '📕' : '📄'}
                  </div>
                )}
                <span className="text-sm truncate font-play">{file.name}</span>
              </div>
              <div className="text-xs text-gray-500 font-play">{file.type.split('/')[1]?.toUpperCase() || file.type}</div>
              <div className="text-xs text-gray-500 font-play">{formatSize(file.size)}</div>
              <div className="text-xs text-gray-500 font-play">{formatDate(file.uploadedAt)}</div>
              <div className="flex gap-1.5">
                <button onClick={e => { e.stopPropagation(); setEditingFile(file) }}
                  className="text-[10px] text-indigo-600 hover:underline font-play font-semibold">Edit</button>
                <button onClick={e => { e.stopPropagation(); handleCopyUrl(file.url) }}
                  className="text-[10px] text-blue-600 hover:underline font-play">URL</button>
                <button onClick={e => { e.stopPropagation(); handleDelete(file.id) }}
                  className="text-[10px] text-red-600 hover:underline font-play">Del</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
