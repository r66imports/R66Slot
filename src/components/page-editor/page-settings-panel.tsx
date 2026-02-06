'use client'

import { useState, useRef } from 'react'
import type { PageSettings } from '@/lib/pages/schema'
import { MediaLibraryPicker } from './media-library-picker'

interface PageSettingsPanelProps {
  pageSettings: PageSettings
  onUpdate: (settings: Partial<PageSettings>) => void
  onClose: () => void
}

type SettingsTab = 'background' | 'seo' | 'social'

export function PageSettingsPanel({ pageSettings, onUpdate, onClose }: PageSettingsPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const ogImageRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [showOgMediaPicker, setShowOgMediaPicker] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>('background')

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)
    setImgError(false)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        onUpdate({ backgroundImage: data.url })
      } else {
        const errData = await res.json().catch(() => ({ error: 'Upload failed' }))
        setUploadError(errData.error || `Upload failed (${res.status})`)
      }
    } catch (err) {
      console.error('Upload failed:', err)
      setUploadError('Network error — check your connection')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleOgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        onUpdate({ ogImage: data.url })
      }
    } catch (err) {
      console.error('OG image upload failed:', err)
    }
    if (ogImageRef.current) ogImageRef.current.value = ''
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 font-play">Page Settings</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">x</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {[
          { id: 'background' as const, label: 'Background', icon: '🎨' },
          { id: 'seo' as const, label: 'SEO', icon: '🔍' },
          { id: 'social' as const, label: 'Social', icon: '📱' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors font-play ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* ═══════════════════════════════════════════════════════════════
            SEO BASICS TAB
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'seo' && (
          <>
            <div className="bg-blue-50 rounded-lg p-3 mb-2">
              <p className="text-xs text-blue-700 font-play">
                <strong>SEO Basics</strong> help search engines understand and rank your page.
              </p>
            </div>

            {/* SEO Title */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 font-play">
                SEO Title
                <span className="ml-1 text-gray-400">({(pageSettings.seoTitle || '').length}/60)</span>
              </label>
              <input
                type="text"
                value={pageSettings.seoTitle || ''}
                onChange={(e) => onUpdate({ seoTitle: e.target.value })}
                placeholder="Page title for search engines"
                maxLength={60}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
              />
            </div>

            {/* SEO Description */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 font-play">
                Meta Description
                <span className="ml-1 text-gray-400">({(pageSettings.seoDescription || '').length}/160)</span>
              </label>
              <textarea
                value={pageSettings.seoDescription || ''}
                onChange={(e) => onUpdate({ seoDescription: e.target.value })}
                placeholder="Brief description for search results"
                maxLength={160}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play resize-none"
              />
            </div>

            {/* SEO Keywords */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Keywords</label>
              <input
                type="text"
                value={pageSettings.seoKeywords || ''}
                onChange={(e) => onUpdate({ seoKeywords: e.target.value })}
                placeholder="keyword1, keyword2, keyword3"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
              />
              <p className="text-[10px] text-gray-400 mt-1 font-play">Separate keywords with commas</p>
            </div>

            {/* Canonical URL */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Canonical URL</label>
              <input
                type="url"
                value={pageSettings.seoCanonicalUrl || ''}
                onChange={(e) => onUpdate({ seoCanonicalUrl: e.target.value })}
                placeholder="https://example.com/page"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
              />
              <p className="text-[10px] text-gray-400 mt-1 font-play">Leave empty to use current URL</p>
            </div>

            {/* Indexing Options */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-medium text-gray-500 mb-2 font-play">Search Engine Indexing</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pageSettings.seoNoIndex || false}
                    onChange={(e) => onUpdate({ seoNoIndex: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-xs text-gray-600 font-play">No Index (hide from search)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pageSettings.seoNoFollow || false}
                    onChange={(e) => onUpdate({ seoNoFollow: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-xs text-gray-600 font-play">No Follow (don't follow links)</span>
                </label>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            SOCIAL SHARING TAB
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'social' && (
          <>
            <div className="bg-purple-50 rounded-lg p-3 mb-2">
              <p className="text-xs text-purple-700 font-play">
                <strong>Social Sharing</strong> controls how your page appears when shared on social media.
              </p>
            </div>

            {/* Open Graph Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider font-play">
                Open Graph (Facebook, LinkedIn)
              </h4>

              {/* OG Title */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 font-play">OG Title</label>
                <input
                  type="text"
                  value={pageSettings.ogTitle || ''}
                  onChange={(e) => onUpdate({ ogTitle: e.target.value })}
                  placeholder="Title when shared on social media"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
                />
              </div>

              {/* OG Description */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 font-play">OG Description</label>
                <textarea
                  value={pageSettings.ogDescription || ''}
                  onChange={(e) => onUpdate({ ogDescription: e.target.value })}
                  placeholder="Description when shared"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play resize-none"
                />
              </div>

              {/* OG Image */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 font-play">OG Image</label>
                {pageSettings.ogImage ? (
                  <div className="relative group/ogimg rounded-lg overflow-hidden border border-gray-200 mb-2">
                    <img
                      src={pageSettings.ogImage}
                      alt="OG Preview"
                      className="w-full h-24 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/ogimg:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => ogImageRef.current?.click()}
                        className="px-2 py-1 bg-white text-gray-800 text-xs rounded font-play"
                      >
                        Change
                      </button>
                      <button
                        onClick={() => setShowOgMediaPicker(true)}
                        className="px-2 py-1 bg-blue-500 text-white text-xs rounded font-play"
                      >
                        Library
                      </button>
                      <button
                        onClick={() => onUpdate({ ogImage: '' })}
                        className="px-2 py-1 bg-red-500 text-white text-xs rounded font-play"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => ogImageRef.current?.click()}
                      className="flex-1 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-purple-400 hover:text-purple-600 font-play"
                    >
                      + Upload
                    </button>
                    <button
                      onClick={() => setShowOgMediaPicker(true)}
                      className="flex-1 py-2 bg-purple-50 text-purple-600 rounded-lg text-xs font-play"
                    >
                      Library
                    </button>
                  </div>
                )}
                <input ref={ogImageRef} type="file" accept="image/*" onChange={handleOgImageUpload} className="hidden" />
                <p className="text-[10px] text-gray-400 font-play">Recommended: 1200x630px</p>
                <MediaLibraryPicker
                  open={showOgMediaPicker}
                  onClose={() => setShowOgMediaPicker(false)}
                  onSelect={(url) => onUpdate({ ogImage: url })}
                />
              </div>

              {/* OG Type */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 font-play">OG Type</label>
                <select
                  value={pageSettings.ogType || 'website'}
                  onChange={(e) => onUpdate({ ogType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
                >
                  <option value="website">Website</option>
                  <option value="article">Article</option>
                  <option value="product">Product</option>
                </select>
              </div>
            </div>

            {/* Twitter Card Section */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider font-play">
                Twitter Card
              </h4>

              {/* Twitter Card Type */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Card Type</label>
                <select
                  value={pageSettings.twitterCard || 'summary_large_image'}
                  onChange={(e) => onUpdate({ twitterCard: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
                >
                  <option value="summary">Summary (small image)</option>
                  <option value="summary_large_image">Summary Large Image</option>
                </select>
              </div>

              {/* Use Same as OG */}
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-[10px] text-gray-500 font-play">
                  Twitter will use Open Graph data if no specific Twitter values are set.
                </p>
              </div>
            </div>

            {/* Preview */}
            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 font-play">Preview</h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {pageSettings.ogImage && (
                  <img src={pageSettings.ogImage} alt="" className="w-full h-32 object-cover" />
                )}
                <div className="p-3 bg-gray-50">
                  <p className="text-xs text-gray-400 font-play">r66slot.co.za</p>
                  <p className="text-sm font-semibold text-gray-900 font-play line-clamp-1">
                    {pageSettings.ogTitle || pageSettings.seoTitle || 'Page Title'}
                  </p>
                  <p className="text-xs text-gray-500 font-play line-clamp-2">
                    {pageSettings.ogDescription || pageSettings.seoDescription || 'Page description will appear here...'}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            BACKGROUND TAB (Original content)
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'background' && (
          <>
        {/* Canvas Selection with Measurement Bars */}
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 font-play flex items-center gap-2">
            <span>📐</span> Canvas Settings
          </h4>

          {/* Canvas Preview with Measurement Bars */}
          <div className="relative mb-3">
            {/* Top Ruler */}
            <div className="flex mb-1">
              <div className="w-6"></div>
              <div className="flex-1 h-4 bg-gray-200 rounded-t relative overflow-hidden">
                <div className="absolute inset-0 flex items-end">
                  {[0, 25, 50, 75, 100].map((tick) => (
                    <div key={tick} className="flex-1 flex flex-col items-center">
                      <div className="w-px h-2 bg-gray-400"></div>
                      <span className="text-[8px] text-gray-500">{Math.round((pageSettings.canvasWidth || 1200) * tick / 100)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex">
              {/* Left Ruler */}
              <div className="w-4 bg-gray-200 rounded-l relative mr-1">
                <div className="absolute inset-0 flex flex-col">
                  {[0, 25, 50, 75, 100].map((tick) => (
                    <div key={tick} className="flex-1 flex items-center">
                      <div className="h-px w-2 bg-gray-400"></div>
                      <span className="text-[7px] text-gray-500 ml-0.5 rotate-[-90deg] origin-left">{Math.round((pageSettings.canvasHeight || 800) * tick / 100)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Canvas Preview */}
              <div
                className="flex-1 h-32 border-2 border-dashed border-gray-300 rounded relative"
                style={{
                  backgroundColor: pageSettings.backgroundColor || '#ffffff',
                  backgroundImage: pageSettings.backgroundImage ? `url(${pageSettings.backgroundImage})` : undefined,
                  backgroundSize: pageSettings.backgroundSize || 'cover',
                  backgroundPosition: pageSettings.backgroundPosition || 'center',
                  opacity: pageSettings.backgroundOpacity ?? 1
                }}
              >
                {/* Grid Overlay */}
                {pageSettings.showGrid && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `
                        linear-gradient(to right, rgba(156,163,175,0.3) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(156,163,175,0.3) 1px, transparent 1px)
                      `,
                      backgroundSize: `${(pageSettings.gridSize || 20) / 2}px ${(pageSettings.gridSize || 20) / 2}px`
                    }}
                  />
                )}

                {/* Canvas Info Overlay */}
                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-play">
                  {pageSettings.canvasWidth || 1200} × {pageSettings.canvasHeight || 800}
                </div>

                {/* Origin Marker */}
                <div
                  className="absolute w-3 h-3 border-2 border-blue-500 rounded-full bg-blue-500/30"
                  style={{
                    left: `${((pageSettings.canvasX || 0) / (pageSettings.canvasWidth || 1200)) * 100}%`,
                    top: `${((pageSettings.canvasY || 0) / (pageSettings.canvasHeight || 800)) * 100}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                />
              </div>

              {/* Right Ruler */}
              <div className="w-4 bg-gray-200 rounded-r ml-1 relative">
                <div className="absolute inset-y-0 left-0 w-px bg-gray-400"></div>
              </div>
            </div>

            {/* Bottom Ruler */}
            <div className="flex mt-1">
              <div className="w-6"></div>
              <div className="flex-1 h-2 bg-gray-200 rounded-b relative">
                <div className="absolute top-0 left-0 right-0 h-px bg-gray-400"></div>
              </div>
            </div>
          </div>

          {/* Canvas Preset Selector */}
          <div className="mb-3">
            <label className="block text-[10px] font-medium text-gray-500 mb-1 font-play">Canvas Preset</label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'desktop', label: '🖥️', size: '1200×800', w: 1200, h: 800 },
                { id: 'tablet', label: '📱', size: '768×1024', w: 768, h: 1024 },
                { id: 'mobile', label: '📲', size: '375×667', w: 375, h: 667 },
                { id: 'custom', label: '✏️', size: 'Custom', w: null, h: null },
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    if (preset.w && preset.h) {
                      onUpdate({
                        canvasPreset: preset.id as any,
                        canvasWidth: preset.w,
                        canvasHeight: preset.h
                      })
                    } else {
                      onUpdate({ canvasPreset: 'custom' })
                    }
                  }}
                  className={`py-1.5 px-1 rounded text-center transition-colors ${
                    (pageSettings.canvasPreset || 'desktop') === preset.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span className="block text-sm">{preset.label}</span>
                  <span className="block text-[8px]">{preset.size}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Canvas Dimensions */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1 font-play">Width (px)</label>
              <input
                type="number"
                value={pageSettings.canvasWidth || 1200}
                onChange={(e) => onUpdate({ canvasWidth: parseInt(e.target.value) || 1200, canvasPreset: 'custom' })}
                className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-play"
                min={320}
                max={3840}
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1 font-play">Height (px)</label>
              <input
                type="number"
                value={pageSettings.canvasHeight || 800}
                onChange={(e) => onUpdate({ canvasHeight: parseInt(e.target.value) || 800, canvasPreset: 'custom' })}
                className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-play"
                min={320}
                max={3840}
              />
            </div>
          </div>

          {/* X, Y Position Controls */}
          <div className="border-t border-gray-200 pt-3">
            <h5 className="text-[10px] font-semibold text-gray-600 mb-2 font-play flex items-center gap-1">
              <span>📍</span> Origin Point (X, Y)
            </h5>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1 font-play">X Position</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={pageSettings.canvasX || 0}
                    onChange={(e) => onUpdate({ canvasX: parseInt(e.target.value) || 0 })}
                    className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs font-play"
                    min={0}
                    max={pageSettings.canvasWidth || 1200}
                  />
                  <span className="text-[10px] text-gray-400">px</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1 font-play">Y Position</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={pageSettings.canvasY || 0}
                    onChange={(e) => onUpdate({ canvasY: parseInt(e.target.value) || 0 })}
                    className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs font-play"
                    min={0}
                    max={pageSettings.canvasHeight || 800}
                  />
                  <span className="text-[10px] text-gray-400">px</span>
                </div>
              </div>
            </div>

            {/* Quick Position Buttons */}
            <div className="grid grid-cols-3 gap-1">
              {[
                { label: '↖', x: 0, y: 0 },
                { label: '↑', x: (pageSettings.canvasWidth || 1200) / 2, y: 0 },
                { label: '↗', x: pageSettings.canvasWidth || 1200, y: 0 },
                { label: '←', x: 0, y: (pageSettings.canvasHeight || 800) / 2 },
                { label: '⊙', x: (pageSettings.canvasWidth || 1200) / 2, y: (pageSettings.canvasHeight || 800) / 2 },
                { label: '→', x: pageSettings.canvasWidth || 1200, y: (pageSettings.canvasHeight || 800) / 2 },
                { label: '↙', x: 0, y: pageSettings.canvasHeight || 800 },
                { label: '↓', x: (pageSettings.canvasWidth || 1200) / 2, y: pageSettings.canvasHeight || 800 },
                { label: '↘', x: pageSettings.canvasWidth || 1200, y: pageSettings.canvasHeight || 800 },
              ].map((pos, i) => (
                <button
                  key={i}
                  onClick={() => onUpdate({ canvasX: Math.round(pos.x), canvasY: Math.round(pos.y) })}
                  className="py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs transition-colors"
                  title={`Set to ${pos.label}`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Settings */}
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pageSettings.showGrid || false}
                  onChange={(e) => onUpdate({ showGrid: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="text-[10px] text-gray-600 font-play">Show Grid</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pageSettings.snapToGrid || false}
                  onChange={(e) => onUpdate({ snapToGrid: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="text-[10px] text-gray-600 font-play">Snap to Grid</span>
              </label>
            </div>
            {pageSettings.showGrid && (
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1 font-play">Grid Size: {pageSettings.gridSize || 20}px</label>
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={5}
                  value={pageSettings.gridSize || 20}
                  onChange={(e) => onUpdate({ gridSize: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            )}
          </div>
        </div>

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

          {uploadError && (
            <div className="mb-2 px-2 py-1.5 bg-red-50 border border-red-200 rounded text-xs text-red-600 font-play">
              {uploadError}
            </div>
          )}

          {pageSettings.backgroundImage ? (
            <div className="relative group/img rounded-lg overflow-hidden border border-gray-200 mb-2">
              {imgError ? (
                <div className="w-full h-36 bg-gray-100 flex flex-col items-center justify-center text-gray-400">
                  <span className="text-2xl mb-1">⚠️</span>
                  <p className="text-xs font-play">Image failed to load</p>
                  <p className="text-[10px] font-play mt-1 max-w-[200px] truncate">{pageSettings.backgroundImage}</p>
                </div>
              ) : (
                <img
                  src={pageSettings.backgroundImage}
                  alt=""
                  className="w-full h-36 object-cover"
                  onError={() => setImgError(true)}
                />
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="px-3 py-1.5 bg-white text-gray-800 text-xs rounded-lg font-play font-medium"
                >
                  Change
                </button>
                <button
                  onClick={() => setShowMediaPicker(true)}
                  className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg font-play font-medium"
                >
                  Media Library
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
            <div className="space-y-2 mb-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-lg p-4 text-center transition-colors group/upload"
              >
                {uploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
                    <span className="text-xs text-gray-500 font-play">Uploading...</span>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl mb-1 text-gray-300 group-hover/upload:text-indigo-400 transition-colors">+</div>
                    <p className="text-xs text-gray-400 font-play">Upload background image</p>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowMediaPicker(true)}
                className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs rounded-lg font-play font-medium transition-colors flex items-center justify-center gap-2"
              >
                <span>🖼️</span> Choose from Media Library
              </button>
            </div>
          )}

          <input
            type="text"
            value={pageSettings.backgroundImage || ''}
            onChange={(e) => { setImgError(false); onUpdate({ backgroundImage: e.target.value }) }}
            placeholder="Or paste image URL..."
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-play text-gray-500 focus:text-gray-900 focus:ring-1 focus:ring-indigo-400"
          />

          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />

          <MediaLibraryPicker
            open={showMediaPicker}
            onClose={() => setShowMediaPicker(false)}
            onSelect={(url) => { setImgError(false); onUpdate({ backgroundImage: url }) }}
          />
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
        </>
        )}
      </div>
    </div>
  )
}
