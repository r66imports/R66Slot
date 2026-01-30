'use client'

import { useState, useRef } from 'react'
import type { PageSettings } from '@/lib/pages/schema'

interface PageSettingsPanelProps {
  pageSettings: PageSettings
  onUpdate: (settings: Partial<PageSettings>) => void
  onClose: () => void
}

export function PageSettingsPanel({ pageSettings, onUpdate, onClose }: PageSettingsPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        onUpdate({ backgroundImage: data.url })
      }
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 font-play">Page Background</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">x</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Background Color */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Background Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={pageSettings.backgroundColor || '#ffffff'}
              onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border border-gray-200"
            />
            <input
              type="text"
              value={pageSettings.backgroundColor || ''}
              onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
              placeholder="#ffffff"
              className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs font-play"
            />
          </div>
        </div>

        {/* Background Image */}
        <div className="pt-2 border-t border-gray-100">
          <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Background Image</label>

          {pageSettings.backgroundImage ? (
            <div className="relative group/img rounded-lg overflow-hidden border border-gray-200 mb-2">
              <img
                src={pageSettings.backgroundImage}
                alt=""
                className="w-full h-36 object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="px-3 py-1.5 bg-white text-gray-800 text-xs rounded-lg font-play font-medium"
                >
                  Change
                </button>
                <button
                  onClick={() => onUpdate({ backgroundImage: '' })}
                  className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg font-play font-medium"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-lg p-6 text-center transition-colors mb-2 group/upload"
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
                  <span className="text-xs text-gray-500 font-play">Uploading...</span>
                </div>
              ) : (
                <>
                  <div className="text-3xl mb-1 text-gray-300 group-hover/upload:text-indigo-400 transition-colors">+</div>
                  <p className="text-xs text-gray-400 font-play">Click to upload background image</p>
                </>
              )}
            </button>
          )}

          <input
            type="text"
            value={pageSettings.backgroundImage || ''}
            onChange={(e) => onUpdate({ backgroundImage: e.target.value })}
            placeholder="Or paste image URL..."
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-play text-gray-500 focus:text-gray-900 focus:ring-1 focus:ring-indigo-400"
          />

          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </div>

        {/* Full Width Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="fullWidth"
            checked={pageSettings.fullWidth || false}
            onChange={(e) => onUpdate({ fullWidth: e.target.checked })}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="fullWidth" className="text-xs text-gray-600 font-play">
            Full width background (cover entire page)
          </label>
        </div>

        {/* Background Size */}
        {!pageSettings.fullWidth && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Background Size</label>
            <select
              value={pageSettings.backgroundSize || 'cover'}
              onChange={(e) => onUpdate({ backgroundSize: e.target.value as PageSettings['backgroundSize'] })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            >
              <option value="cover">Cover (fill area)</option>
              <option value="contain">Contain (fit inside)</option>
              <option value="auto">Auto (original size)</option>
            </select>
          </div>
        )}

        {/* Background Position */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Background Position</label>
          <select
            value={pageSettings.backgroundPosition || 'center'}
            onChange={(e) => onUpdate({ backgroundPosition: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
          >
            <option value="center">Center</option>
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="top left">Top Left</option>
            <option value="top right">Top Right</option>
            <option value="bottom left">Bottom Left</option>
            <option value="bottom right">Bottom Right</option>
          </select>
        </div>

        {/* Background Opacity */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-500 font-play">Image Opacity</label>
            <span className="text-xs text-gray-400 font-play">
              {Math.round((typeof pageSettings.backgroundOpacity === 'number' ? pageSettings.backgroundOpacity : 1) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((typeof pageSettings.backgroundOpacity === 'number' ? pageSettings.backgroundOpacity : 1) * 100)}
            onChange={(e) => onUpdate({ backgroundOpacity: parseInt(e.target.value) / 100 })}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between text-[10px] text-gray-400 font-play mt-0.5">
            <span>Transparent</span>
            <span>Opaque</span>
          </div>
        </div>
      </div>
    </div>
  )
}
