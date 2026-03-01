'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { PageComponent } from '@/lib/pages/schema'
import { MediaLibraryPicker } from './media-library-picker'

interface EditorPropertiesPanelProps {
  component: PageComponent
  viewMode?: 'desktop' | 'tablet' | 'mobile'
  onUpdate: (updates: Partial<PageComponent>) => void
  onDelete: () => void
  onDuplicate: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onClose: () => void
  initialTab?: 'content' | 'style' | 'settings'
}

type TabId = 'content' | 'style' | 'settings'

export function EditorPropertiesPanel({
  component,
  viewMode = 'desktop',
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onClose,
  initialTab = 'content',
}: EditorPropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)

  const updateStyle = (key: string, value: string) => {
    onUpdate({ styles: { ...component.styles, [key]: value } })
  }
  const updateSetting = (key: string, value: any) => {
    onUpdate({ settings: { ...component.settings, [key]: value } })
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'content', label: 'Content' },
    { id: 'style', label: 'Style' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col min-h-0 flex-1">
      {/* Header */}
      <div className="p-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 capitalize font-play">
          {component.type.replace(/-/g, ' ')}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">x</button>
      </div>

      {/* Actions */}
      <div className="p-3 border-b border-gray-100 flex gap-1">
        <button onClick={onMoveUp} className="flex-1 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded text-gray-600 font-play">Up</button>
        <button onClick={onMoveDown} className="flex-1 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded text-gray-600 font-play">Down</button>
        <button onClick={onDuplicate} className="flex-1 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded text-gray-600 font-play">Copy</button>
        <button onClick={onDelete} className="flex-1 py-1.5 text-xs bg-red-50 hover:bg-red-100 rounded text-red-600 font-play">Delete</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {activeTab === 'content' && (
          <ContentTab component={component} viewMode={viewMode} onUpdate={onUpdate} updateSetting={updateSetting} />
        )}
        {activeTab === 'style' && (
          <StyleTab component={component} updateStyle={updateStyle} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab component={component} onUpdate={onUpdate} updateSetting={updateSetting} />
        )}
      </div>
    </div>
  )
}

// ─── Visual Image Field (thumbnail + upload) ───
function ImageField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (url: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showMediaPicker, setShowMediaPicker] = useState(false)

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
        onChange(data.url)
      }
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">{label}</label>

      {/* Image preview or upload area */}
      {value ? (
        <div className="relative group/img rounded-lg overflow-hidden border border-gray-200 mb-2">
          <img
            src={value}
            alt=""
            className="w-full h-36 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
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
              onClick={() => onChange('')}
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
            className="w-full border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg p-4 text-center transition-colors group/upload"
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                <span className="text-xs text-gray-500 font-play">Uploading...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl mb-1 text-gray-300 group-hover/upload:text-blue-400 transition-colors">+</div>
                <p className="text-xs text-gray-400 font-play">Upload image</p>
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

      {/* URL input (collapsed) */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or paste image URL..."
        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-play text-gray-500 focus:text-gray-900 focus:ring-1 focus:ring-blue-400"
      />

      <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />

      <MediaLibraryPicker
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(url) => onChange(url)}
      />
    </div>
  )
}

// ─── Visual Rich Text Editor ───
function RichTextEditor({
  label,
  value,
  onChange,
  rows,
}: {
  label: string
  value: string
  onChange: (html: string) => void
  rows?: number
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  // Track whether the latest value change came from user input so we don't
  // reset innerHTML (and therefore the cursor) while the user is typing.
  const fromUserInput = useRef(false)

  useEffect(() => {
    if (editorRef.current && !fromUserInput.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
    }
    fromUserInput.current = false
  }, [value])

  const execCommand = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val)
    if (editorRef.current) {
      fromUserInput.current = true
      onChange(editorRef.current.innerHTML)
    }
  }

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      fromUserInput.current = true
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">{label}</label>

      {/* Formatting toolbar */}
      <div className="flex items-center gap-0.5 p-1 bg-gray-50 rounded-t-lg border border-gray-200 border-b-0">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); execCommand('bold') }}
          className="w-7 h-7 flex items-center justify-center text-xs font-bold rounded hover:bg-gray-200 text-gray-700"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); execCommand('italic') }}
          className="w-7 h-7 flex items-center justify-center text-xs italic rounded hover:bg-gray-200 text-gray-700"
          title="Italic"
        >
          I
        </button>
        <div className="w-px h-5 bg-gray-300 mx-0.5" />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); execCommand('formatBlock', 'h2') }}
          className="w-7 h-7 flex items-center justify-center text-[10px] font-bold rounded hover:bg-gray-200 text-gray-700"
          title="Heading"
        >
          H2
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); execCommand('formatBlock', 'h3') }}
          className="w-7 h-7 flex items-center justify-center text-[10px] font-bold rounded hover:bg-gray-200 text-gray-700"
          title="Subheading"
        >
          H3
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); execCommand('formatBlock', 'p') }}
          className="w-7 h-7 flex items-center justify-center text-[10px] rounded hover:bg-gray-200 text-gray-700"
          title="Paragraph"
        >
          P
        </button>
        <div className="w-px h-5 bg-gray-300 mx-0.5" />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); execCommand('insertUnorderedList') }}
          className="w-7 h-7 flex items-center justify-center text-xs rounded hover:bg-gray-200 text-gray-700"
          title="Bullet List"
        >
          &#8226;
        </button>
      </div>

      {/* Editable area - explicit LTR to prevent text reversal */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        className="w-full px-3 py-2 border border-gray-200 rounded-b-lg text-sm font-play focus:ring-1 focus:ring-blue-400 focus:outline-none overflow-y-auto prose prose-sm max-w-none"
        style={{
          minHeight: rows ? `${rows * 24}px` : '72px',
          maxHeight: '200px',
          direction: 'ltr',
          textAlign: 'left',
          unicodeBidi: 'plaintext',
        }}
        dir="ltr"
      />
    </div>
  )
}

// ─── Padding Slider ───
function PaddingSlider({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const numValue = parseInt(value) || 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-gray-500 font-play">{label}</label>
        <span className="text-xs text-gray-400 font-play">{numValue}px</span>
      </div>
      <input
        type="range"
        min={0}
        max={200}
        value={numValue}
        onChange={(e) => onChange(`${e.target.value}px`)}
        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  )
}

// ─── Layout Mode Panel (shown in Content tab for all components) ───
function LayoutModePanel({
  component,
  viewMode = 'desktop',
  onUpdate,
}: {
  component: PageComponent
  viewMode?: 'desktop' | 'tablet' | 'mobile'
  onUpdate: (updates: Partial<PageComponent>) => void
}) {
  const updateStyle = (key: string, value: string) => {
    onUpdate({ styles: { ...component.styles, [key]: value } })
  }

  const isAbsolute = component.positionMode === 'absolute'

  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-3 border border-gray-200">
      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider font-play flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
        Layout Mode
      </h4>

      {/* Flow / Freeform toggle */}
      <div className="flex gap-1">
        <button
          onClick={() => onUpdate({ positionMode: 'flow' })}
          className={`flex-1 py-2 text-xs rounded-lg font-play font-medium transition-colors ${
            !isAbsolute
              ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
              : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          Flow
        </button>
        <button
          onClick={() => {
            const initial = component.position || { x: 50, y: 50, width: 300, height: 200, zIndex: 10 }
            const existing = (component as any).positionByView || {}
            onUpdate({
              positionMode: 'absolute',
              position: initial,
              positionByView: {
                ...existing,
                [viewMode]: initial,
              }
            })
          }}
          className={`flex-1 py-2 text-xs rounded-lg font-play font-medium transition-colors ${
            isAbsolute
              ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
              : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          Freeform
        </button>
      </div>

      {/* Flow-mode layout options */}
      {!isAbsolute && (
        <div className="space-y-2">
          {/* Display mode — hidden for image elements */}
          {component.type !== 'image' && (
            <div>
              <label className="text-[10px] text-gray-500 font-play mb-1 block">Display</label>
              <div className="flex gap-1">
                {(['block', 'flex', 'inline-block', 'grid'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => updateStyle('display', mode)}
                    className={`flex-1 py-1 text-[10px] rounded font-play font-medium transition-colors ${
                      (component.styles.display || 'block') === mode
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Flex / Grid options */}
          {(component.styles.display === 'flex' || component.styles.display === 'grid') && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500 font-play">Direction</label>
                  <select
                    value={component.styles.flexDirection || 'row'}
                    onChange={(e) => updateStyle('flexDirection', e.target.value)}
                    className="w-full px-1.5 py-1 border border-gray-200 rounded text-[11px] font-play"
                  >
                    <option value="row">Row</option>
                    <option value="column">Column</option>
                    <option value="row-reverse">Row Reverse</option>
                    <option value="column-reverse">Col Reverse</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-play">Gap</label>
                  <input
                    type="text"
                    value={component.styles.gap || '0px'}
                    onChange={(e) => updateStyle('gap', e.target.value)}
                    placeholder="8px"
                    className="w-full px-1.5 py-1 border border-gray-200 rounded text-[11px] font-play"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500 font-play">Justify</label>
                  <select
                    value={component.styles.justifyContent || 'flex-start'}
                    onChange={(e) => updateStyle('justifyContent', e.target.value)}
                    className="w-full px-1.5 py-1 border border-gray-200 rounded text-[11px] font-play"
                  >
                    <option value="flex-start">Start</option>
                    <option value="center">Center</option>
                    <option value="flex-end">End</option>
                    <option value="space-between">Between</option>
                    <option value="space-around">Around</option>
                    <option value="space-evenly">Evenly</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-play">Align</label>
                  <select
                    value={component.styles.alignItems || 'stretch'}
                    onChange={(e) => updateStyle('alignItems', e.target.value)}
                    className="w-full px-1.5 py-1 border border-gray-200 rounded text-[11px] font-play"
                  >
                    <option value="stretch">Stretch</option>
                    <option value="flex-start">Start</option>
                    <option value="center">Center</option>
                    <option value="flex-end">End</option>
                    <option value="baseline">Baseline</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Width / Height for flow mode — hidden for image (Image Size section handles this) */}
          {component.type !== 'image' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500 font-play">Width</label>
                  <input
                    type="text"
                    value={component.styles.width || ''}
                    onChange={(e) => updateStyle('width', e.target.value)}
                    placeholder="auto"
                    className="w-full px-1.5 py-1 border border-gray-200 rounded text-[11px] font-play"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-play">Max Width</label>
                  <input
                    type="text"
                    value={component.styles.maxWidth || ''}
                    onChange={(e) => updateStyle('maxWidth', e.target.value)}
                    placeholder="100%"
                    className="w-full px-1.5 py-1 border border-gray-200 rounded text-[11px] font-play"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500 font-play">Height</label>
                  <input
                    type="text"
                    value={component.styles.height || ''}
                    onChange={(e) => updateStyle('height', e.target.value)}
                    placeholder="auto"
                    className="w-full px-1.5 py-1 border border-gray-200 rounded text-[11px] font-play"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-play">Min Height</label>
                  <input
                    type="text"
                    value={component.styles.minHeight || ''}
                    onChange={(e) => updateStyle('minHeight', e.target.value)}
                    placeholder="auto"
                    className="w-full px-1.5 py-1 border border-gray-200 rounded text-[11px] font-play"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Freeform position & size controls */}
      {isAbsolute && ((component as any).positionByView?.[viewMode] || component.position) && (
        <div className="space-y-2">
          {( () => {
            const pos = (component as any).positionByView?.[viewMode] || component.position || { x: 50, y: 50, width: 300, height: 200, zIndex: 10 }
            const existing = (component as any).positionByView || {}
            return (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 font-play">X</label>
                    <input
                      type="number"
                      value={Math.round(pos.x)}
                      onChange={(e) => onUpdate({ positionByView: { ...existing, [viewMode]: { ...pos, x: parseInt(e.target.value) || 0 } } })}
                      className="w-full px-1.5 py-1 border border-gray-200 rounded text-[11px] font-play"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-play">Y</label>
                    <input
                      type="number"
                      value={Math.round(pos.y)}
                      onChange={(e) => onUpdate({ positionByView: { ...existing, [viewMode]: { ...pos, y: parseInt(e.target.value) || 0 } } })}
                      className="w-full px-1.5 py-1 border border-gray-200 rounded text-[11px] font-play"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 font-play">Width</label>
                    <input
                      type="number"
                      value={Math.round(pos.width)}
                      onChange={(e) => onUpdate({ positionByView: { ...existing, [viewMode]: { ...pos, width: Math.max(40, parseInt(e.target.value) || 100) } } })}
                      className="w-full px-1.5 py-1 border border-gray-200 rounded text-[11px] font-play"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-play">Height</label>
                    <input
                      type="number"
                      value={Math.round(pos.height)}
                      onChange={(e) => onUpdate({ positionByView: { ...existing, [viewMode]: { ...pos, height: Math.max(24, parseInt(e.target.value) || 100) } } })}
                      className="w-full px-1.5 py-1 border border-gray-200 rounded text-[11px] font-play"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-play">Z</label>
                    <input
                      type="number"
                      value={pos.zIndex || 10}
                      onChange={(e) => onUpdate({ positionByView: { ...existing, [viewMode]: { ...pos, zIndex: parseInt(e.target.value) || 10 } } })}
                      className="w-full px-1.5 py-1 border border-gray-200 rounded text-[11px] font-play"
                    />
                  </div>
                </div>
                {/* Rotation */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-gray-500 font-play">Rotation</label>
                    <span className="text-[10px] text-gray-400 font-play">{pos.rotation || 0}°</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={pos.rotation || 0}
                    onChange={(e) => onUpdate({ positionByView: { ...existing, [viewMode]: { ...pos, rotation: parseInt(e.target.value) || 0 } } })}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 font-play mt-0.5">
                    <span>0°</span>
                    <span>180°</span>
                    <span>360°</span>
                  </div>
                </div>
                <p className="text-[10px] text-purple-500 font-play">Drag to position, resize from handles</p>
              </>
            )
          })() }
        </div>
      )}
    </div>
  )
}

// ─── Content Tab ───
function ContentTab({
  component,
  viewMode = 'desktop',
  onUpdate,
  updateSetting,
}: {
  component: PageComponent
  viewMode?: 'desktop' | 'tablet' | 'mobile'
  onUpdate: (updates: Partial<PageComponent>) => void
  updateSetting: (key: string, value: any) => void
}) {
  const updateStyle = (key: string, value: string) => {
    onUpdate({ styles: { ...component.styles, [key]: value } })
  }
  return (
    <>
      {/* ─── Layout Mode (all components) ─── */}
      <LayoutModePanel component={component} viewMode={viewMode} onUpdate={onUpdate} />

      {/* Product Grid Layout controls */}
      {component.type === 'product-grid' && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-3 border border-gray-200">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider font-play">Grid Layout</h4>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Rows to Show</label>
            <input
              type="number"
              value={(component.settings.productRows as number) || 3}
              onChange={(e) => updateSetting('productRows', parseInt(e.target.value) || 3)}
              min={1}
              max={10}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
            <p className="text-[10px] text-gray-400 mt-1 font-play">3 products per row (desktop). Rows × 3 = total shown.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Card Size</label>
            <select
              value={(component.settings.cardSize as string) || 'standard'}
              onChange={(e) => updateSetting('cardSize', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            >
              <option value="compact">Compact (small image)</option>
              <option value="standard">Standard</option>
              <option value="large">Large (tall image)</option>
            </select>
          </div>
        </div>
      )}

      {/* Rich text content for text type */}
      {component.type === 'text' && (
        <RichTextEditor
          label="Text Content"
          value={component.content}
          onChange={(html) => onUpdate({ content: html })}
          rows={5}
        />
      )}

      {/* Simple text for button */}
      {component.type === 'button' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Button Text</label>
          <input
            type="text"
            value={component.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
          />
        </div>
      )}

      {/* Simple text for quote */}
      {component.type === 'quote' && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Quote Text</label>
            <textarea
              value={component.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play italic"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Author</label>
            <input
              type="text"
              value={(component.settings.author as string) || ''}
              onChange={(e) => updateSetting('author', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
          </div>
        </>
      )}

      {/* Hero Content */}
      {component.type === 'hero' && (
        <>
          {/* Hero inner layout (Flow / Freeform elements) */}
          <div className="bg-purple-50 rounded-lg p-2.5 border border-purple-200">
            <label className="block text-[10px] font-semibold text-purple-600 mb-1.5 font-play uppercase tracking-wider">Hero Element Layout</label>
            <div className="flex gap-1">
              <button
                onClick={() => updateSetting('heroLayout', 'flow')}
                className={`flex-1 py-1.5 text-[11px] rounded font-play font-medium transition-colors ${
                  (component.settings.heroLayout || 'flow') === 'flow'
                    ? 'bg-white text-blue-700 ring-1 ring-blue-300'
                    : 'bg-purple-100 text-gray-500 hover:bg-purple-200'
                }`}
              >
                Stacked
              </button>
              <button
                onClick={() => updateSetting('heroLayout', 'freeform')}
                className={`flex-1 py-1.5 text-[11px] rounded font-play font-medium transition-colors ${
                  component.settings.heroLayout === 'freeform'
                    ? 'bg-white text-purple-700 ring-1 ring-purple-300'
                    : 'bg-purple-100 text-gray-500 hover:bg-purple-200'
                }`}
              >
                Freeform
              </button>
            </div>
            {component.settings.heroLayout === 'freeform' && (
              <p className="text-[10px] text-purple-500 mt-1 font-play">Drag title, subtitle & buttons freely</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Title</label>
            <input
              type="text"
              value={(component.settings.title as string) || ''}
              onChange={(e) => updateSetting('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Subtitle</label>
            <textarea
              value={(component.settings.subtitle as string) || ''}
              onChange={(e) => updateSetting('subtitle', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
          </div>

          {/* Background Image */}
          <div className="pt-2 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 font-play">Background Image</h4>
            <ImageField
              label="Image"
              value={(component.settings.imageUrl as string) || ''}
              onChange={(url) => updateSetting('imageUrl', url)}
            />
          </div>

          {/* Overlay Opacity */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-500 font-play">Image Overlay Opacity</label>
              <span className="text-xs text-gray-400 font-play">
                {Math.round((typeof component.settings.overlayOpacity === 'number' ? component.settings.overlayOpacity : 0.5) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round((typeof component.settings.overlayOpacity === 'number' ? component.settings.overlayOpacity : 0.5) * 100)}
              onChange={(e) => updateSetting('overlayOpacity', parseInt(e.target.value) / 100)}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-play mt-0.5">
              <span>Lighter</span>
              <span>Darker</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Primary Button</label>
            <input
              type="text"
              value={(component.settings.buttonText as string) || ''}
              onChange={(e) => updateSetting('buttonText', e.target.value)}
              placeholder="Button text"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play mb-1"
            />
            <input
              type="text"
              value={(component.settings.buttonLink as string) || ''}
              onChange={(e) => updateSetting('buttonLink', e.target.value)}
              placeholder="Link URL"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Secondary Button</label>
            <input
              type="text"
              value={(component.settings.secondaryButtonText as string) || ''}
              onChange={(e) => updateSetting('secondaryButtonText', e.target.value)}
              placeholder="Secondary text (optional)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play mb-1"
            />
            <input
              type="text"
              value={(component.settings.secondaryButtonLink as string) || ''}
              onChange={(e) => updateSetting('secondaryButtonLink', e.target.value)}
              placeholder="Link URL"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
          </div>

          {/* Freeform Position Controls */}
          {component.settings.heroLayout === 'freeform' && (
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-play">Element Positions</h4>
                <button
                  onClick={() => {
                    updateSetting('titleX', 0)
                    updateSetting('titleY', 0)
                    updateSetting('subtitleX', 0)
                    updateSetting('subtitleY', 60)
                    updateSetting('btnPrimaryX', 0)
                    updateSetting('btnPrimaryY', 120)
                    updateSetting('btnSecondaryX', 200)
                    updateSetting('btnSecondaryY', 120)
                  }}
                  className="text-[10px] text-blue-500 hover:text-blue-700 font-play font-medium"
                >
                  Reset All
                </button>
              </div>
              <div className="space-y-2">
                <PositionInput label="Title" x={(component.settings.titleX as number) || 0} y={(component.settings.titleY as number) || 0} onChangeX={(v) => updateSetting('titleX', v)} onChangeY={(v) => updateSetting('titleY', v)} />
                <PositionInput label="Subtitle" x={(component.settings.subtitleX as number) || 0} y={(component.settings.subtitleY as number) || 60} onChangeX={(v) => updateSetting('subtitleX', v)} onChangeY={(v) => updateSetting('subtitleY', v)} />
                <PositionInput label="Primary Btn" x={(component.settings.btnPrimaryX as number) || 0} y={(component.settings.btnPrimaryY as number) || 120} onChangeX={(v) => updateSetting('btnPrimaryX', v)} onChangeY={(v) => updateSetting('btnPrimaryY', v)} />
                <PositionInput label="Secondary Btn" x={(component.settings.btnSecondaryX as number) || 200} y={(component.settings.btnSecondaryY as number) || 120} onChangeX={(v) => updateSetting('btnSecondaryX', v)} onChangeY={(v) => updateSetting('btnSecondaryY', v)} />
              </div>
            </div>
          )}
        </>
      )}

      {/* Image Content */}
      {component.type === 'image' && (
        <>
          <ImageField
            label="Image"
            value={(component.settings.imageUrl as string) || ''}
            onChange={(url) => updateSetting('imageUrl', url)}
          />

          {/* Image Size */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider font-play">Image Size</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 font-play mb-1 block">Width (px)</label>
                <input
                  type="number"
                  value={parseInt(component.styles.width as string) || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    updateStyle('width', val ? `${val}px` : '')
                  }}
                  placeholder="auto"
                  min={1}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-play"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-play mb-1 block">Height (px)</label>
                <input
                  type="number"
                  value={parseInt(component.styles.height as string) || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    updateStyle('height', val ? `${val}px` : '')
                  }}
                  placeholder="auto"
                  min={1}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-play"
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 font-play">Leave blank to use auto sizing</p>
          </div>

          {/* Container / Object Fit */}
          <div className="bg-blue-50 rounded-lg p-3 space-y-2 border border-blue-200">
            <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wider font-play">Container</h4>
            <div>
              <label className="text-[10px] text-gray-500 font-play mb-1 block">Fit to Box</label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { value: 'cover', label: 'Cover' },
                  { value: 'contain', label: 'Contain' },
                  { value: 'fill', label: 'Fill' },
                  { value: 'scale-down', label: 'Shrink' },
                  { value: 'none', label: 'Original' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateSetting('objectFit', opt.value)}
                    className={`py-1.5 text-[10px] rounded font-play font-medium transition-colors ${
                      (component.settings.objectFit || 'cover') === opt.value
                        ? 'bg-blue-600 text-white ring-1 ring-blue-400'
                        : 'bg-white text-gray-500 hover:bg-blue-100 border border-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-blue-500 mt-1.5 font-play">
                {(component.settings.objectFit || 'cover') === 'cover' && 'Fills the box — may crop edges'}
                {component.settings.objectFit === 'contain' && 'Fits entirely inside — no cropping'}
                {component.settings.objectFit === 'fill' && 'Stretches to fill exactly'}
                {component.settings.objectFit === 'scale-down' && 'Shrinks to fit if needed, never enlarges'}
                {component.settings.objectFit === 'none' && 'Displays at original size'}
              </p>
            </div>

            {/* Object Position — useful in both modes */}
            <div>
              <label className="text-[10px] text-gray-500 font-play mb-1 block">Image Anchor</label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { label: '↖', value: 'top left' },
                  { label: '↑', value: 'top center' },
                  { label: '↗', value: 'top right' },
                  { label: '←', value: 'center left' },
                  { label: '●', value: 'center center' },
                  { label: '→', value: 'center right' },
                  { label: '↙', value: 'bottom left' },
                  { label: '↓', value: 'bottom center' },
                  { label: '↘', value: 'bottom right' },
                ].map((pos) => (
                  <button
                    key={pos.value}
                    onClick={() => updateSetting('objectPosition', pos.value)}
                    className={`py-1.5 text-[11px] rounded font-play transition-colors ${
                      (component.settings.objectPosition || 'center center') === pos.value
                        ? 'bg-blue-600 text-white ring-1 ring-blue-400'
                        : 'bg-white text-gray-500 hover:bg-blue-100 border border-gray-200'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Alt Text</label>
            <input
              type="text"
              value={(component.settings.alt as string) || ''}
              onChange={(e) => updateSetting('alt', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
          </div>
          <div className="pt-2 border-t border-gray-100">
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Link URL (opens in new tab)</label>
            <input
              type="text"
              value={(component.settings.link as string) || ''}
              onChange={(e) => updateSetting('link', e.target.value)}
              placeholder="https://example.com or /page-slug"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
            {component.settings.link && (
              <p className="text-[10px] text-green-600 mt-1 font-play">Image will link to: {String(component.settings.link)}</p>
            )}
          </div>
        </>
      )}

      {/* Video Content */}
      {component.type === 'video' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Video Embed URL</label>
          <input
            type="text"
            value={(component.settings.videoUrl as string) || ''}
            onChange={(e) => updateSetting('videoUrl', e.target.value)}
            placeholder="YouTube or Vimeo embed URL"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
          />
          {component.settings.videoUrl && (
            <div className="mt-2 aspect-video rounded-lg overflow-hidden border border-gray-200">
              <iframe
                src={component.settings.videoUrl as string}
                className="w-full h-full"
                allowFullScreen
                title="Video preview"
              />
            </div>
          )}
        </div>
      )}

      {/* Featured Product Content */}
      {component.type === 'featured-product' && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Product Name</label>
            <input
              type="text"
              value={component.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play font-bold"
            />
          </div>
          <ImageField
            label="Product Image"
            value={(component.settings.imageUrl as string) || ''}
            onChange={(url) => updateSetting('imageUrl', url)}
          />
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Price</label>
            <input
              type="text"
              value={(component.settings.price as string) || ''}
              onChange={(e) => updateSetting('price', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play text-red-600 font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Description</label>
            <textarea
              value={(component.settings.description as string) || ''}
              onChange={(e) => updateSetting('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
          </div>
        </>
      )}

      {/* Button Options */}
      {component.type === 'button' && (
        <>
          {/* Link URL */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Link URL</label>
            <input
              type="text"
              value={(component.settings.link as string) || ''}
              onChange={(e) => updateSetting('link', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
              placeholder="https://..."
            />
          </div>

          {/* Open in new tab */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="btn-new-tab"
              checked={!!component.settings.openInNewTab}
              onChange={(e) => updateSetting('openInNewTab', e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="btn-new-tab" className="text-xs font-medium text-gray-500 font-play">Open in new tab</label>
          </div>

          {/* Button Variant */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Button Style</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { value: 'primary', label: 'Primary', preview: 'bg-primary text-black' },
                { value: 'secondary', label: 'Secondary', preview: 'bg-gray-800 text-white' },
                { value: 'outline', label: 'Outline', preview: 'border-2 border-gray-800 text-gray-800 bg-white' },
                { value: 'ghost', label: 'Ghost', preview: 'text-gray-800 bg-gray-100' },
                { value: 'danger', label: 'Danger', preview: 'bg-red-600 text-white' },
                { value: 'success', label: 'Success', preview: 'bg-green-600 text-white' },
              ].map((v) => (
                <button
                  key={v.value}
                  onClick={() => updateSetting('variant', v.value)}
                  className={`px-2 py-1.5 rounded text-xs font-semibold font-play transition-all ${v.preview} ${
                    (component.settings.variant || 'primary') === v.value
                      ? 'ring-2 ring-blue-500 ring-offset-1'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Button Size */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Size</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { value: 'small', label: 'Small' },
                { value: 'medium', label: 'Medium' },
                { value: 'large', label: 'Large' },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => updateSetting('size', s.value)}
                  className={`px-2 py-1.5 rounded border text-xs font-medium font-play transition-all ${
                    (component.settings.size || 'medium') === s.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Button Shape */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Shape</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { value: 'rounded', label: 'Rounded' },
                { value: 'pill', label: 'Pill' },
                { value: 'square', label: 'Square' },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => updateSetting('shape', s.value)}
                  className={`px-2 py-1.5 border text-xs font-medium font-play transition-all ${
                    s.value === 'pill' ? 'rounded-full' : s.value === 'square' ? 'rounded-none' : 'rounded-lg'
                  } ${
                    (component.settings.shape || 'rounded') === s.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Full Width */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="btn-full-width"
              checked={!!component.settings.fullWidth}
              onChange={(e) => updateSetting('fullWidth', e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="btn-full-width" className="text-xs font-medium text-gray-500 font-play">Full width</label>
          </div>

          {/* Min Width — lock a minimum size so buttons don't shrink on short text */}
          {!component.settings.fullWidth && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">
                Min Width <span className="font-normal text-gray-400">(e.g. 120px)</span>
              </label>
              <input
                type="text"
                value={(component.settings.minWidth as string) || ''}
                onChange={(e) => updateSetting('minWidth', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
                placeholder="e.g. 140px"
              />
            </div>
          )}

          {/* Button Icon */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Icon (optional)</label>
            <div className="flex gap-1.5 flex-wrap">
              {['', '→', '←', '↗', '🛒', '❤️', '⬇️', '✉️', '🔍', '⚡'].map((ic) => (
                <button
                  key={ic}
                  onClick={() => updateSetting('icon', ic)}
                  className={`w-8 h-8 rounded border text-sm flex items-center justify-center transition-all ${
                    (component.settings.icon || '') === ic
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {ic || '✕'}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Position */}
          {component.settings.icon && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Icon Position</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { value: 'left', label: 'Left' },
                  { value: 'right', label: 'Right' },
                ].map((p) => (
                  <button
                    key={p.value}
                    onClick={() => updateSetting('iconPosition', p.value)}
                    className={`px-2 py-1.5 rounded border text-xs font-medium font-play transition-all ${
                      (component.settings.iconPosition || 'right') === p.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Gallery - Visual Image Grid */}
      {component.type === 'gallery' && (
        <VisualGalleryEditor component={component} onUpdate={onUpdate} />
      )}

      {/* Column Content - Visual Editors */}
      {(component.type === 'two-column' || component.type === 'three-column' || component.type === 'columns') && (
        <>
          {/* Column count selector (for new 'columns' type) */}
          {component.type === 'columns' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Number of Columns</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      const currentCols = component.children?.length || 0
                      let newChildren = [...(component.children || [])]
                      if (n > currentCols) {
                        // Add missing columns
                        for (let i = currentCols; i < n; i++) {
                          newChildren.push({
                            id: `col-${i + 1}-${Date.now()}`,
                            type: 'text',
                            content: `Column ${i + 1}`,
                            styles: { padding: '10px' },
                            settings: {},
                          })
                        }
                      } else if (n < currentCols) {
                        // Trim extra columns
                        newChildren = newChildren.slice(0, n)
                      }
                      onUpdate({ settings: { ...component.settings, columns: n }, children: newChildren })
                    }}
                    className={`py-2 rounded border text-xs font-bold font-play transition-all ${
                      (component.settings.columns || 2) === n
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1 font-play">Select 1 to 4 columns</p>
            </div>
          )}
          <VisualColumnEditor component={component} onUpdate={onUpdate} viewMode={viewMode} />
        </>
      )}

      {/* Section Content */}
      {component.type === 'section' && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Section Title</label>
            <input
              type="text"
              value={(component.settings.sectionTitle as string) || ''}
              onChange={(e) => updateSetting('sectionTitle', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Section Subtitle</label>
            <textarea
              value={(component.settings.sectionSubtitle as string) || ''}
              onChange={(e) => updateSetting('sectionSubtitle', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
          </div>
        </>
      )}

      {/* Content Block */}
      {component.type === 'content-block' && (
        <>
          <RichTextEditor
            label="Block Content"
            value={component.content}
            onChange={(html) => onUpdate({ content: html })}
            rows={4}
          />
          <ImageField
            label="Block Image"
            value={(component.settings.imageUrl as string) || ''}
            onChange={(url) => updateSetting('imageUrl', url)}
          />
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Image Position</label>
            <select
              value={(component.settings.imagePosition as string) || 'top'}
              onChange={(e) => updateSetting('imagePosition', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            >
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Button Text</label>
            <input
              type="text"
              value={(component.settings.buttonText as string) || ''}
              onChange={(e) => updateSetting('buttonText', e.target.value)}
              placeholder="Optional button"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play mb-1"
            />
            <input
              type="text"
              value={(component.settings.buttonLink as string) || ''}
              onChange={(e) => updateSetting('buttonLink', e.target.value)}
              placeholder="Button URL"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
          </div>
        </>
      )}

      {/* UI Component */}
      {component.type === 'ui-component' && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Component Type</label>
            <select
              value={(component.settings.componentType as string) || 'card'}
              onChange={(e) => updateSetting('componentType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            >
              <option value="card">Card</option>
              <option value="stat">Stat / Counter</option>
              <option value="badge">Badge / Tag</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{(component.settings.icon as string) || '🧩'}</span>
            <input
              type="text"
              value={(component.settings.icon as string) || ''}
              onChange={(e) => updateSetting('icon', e.target.value)}
              placeholder="Emoji icon"
              className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm font-play"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Title</label>
            <input
              type="text"
              value={(component.settings.title as string) || ''}
              onChange={(e) => updateSetting('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Description</label>
            <textarea
              value={(component.settings.description as string) || ''}
              onChange={(e) => updateSetting('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Action Text</label>
            <input
              type="text"
              value={(component.settings.actionText as string) || ''}
              onChange={(e) => updateSetting('actionText', e.target.value)}
              placeholder="e.g. Learn More"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play mb-1"
            />
            <input
              type="text"
              value={(component.settings.actionLink as string) || ''}
              onChange={(e) => updateSetting('actionLink', e.target.value)}
              placeholder="Link URL"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
          </div>
        </>
      )}

      {/* Slot */}
      {component.type === 'slot' && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Slot Label</label>
            <input
              type="text"
              value={(component.settings.slotLabel as string) || ''}
              onChange={(e) => updateSetting('slotLabel', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Min Height (px)</label>
            <input
              type="number"
              value={(component.settings.slotMinHeight as string) || '120'}
              onChange={(e) => updateSetting('slotMinHeight', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
          </div>
        </>
      )}

      {/* Booking Form */}
      {component.type === 'booking-form' && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Section Title</label>
            <input
              type="text"
              value={(component.settings.bookingTitle as string) || ''}
              onChange={(e) => updateSetting('bookingTitle', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
              placeholder="Pre-Order Now"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Subtitle</label>
            <textarea
              value={(component.settings.bookingSubtitle as string) || ''}
              onChange={(e) => updateSetting('bookingSubtitle', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play resize-none"
              placeholder="Browse available items..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Layout</label>
            <select
              value={(component.settings.bookingLayout as string) || 'grid'}
              onChange={(e) => updateSetting('bookingLayout', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            >
              <option value="grid">Grid</option>
              <option value="list">List</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="bfBrandFilter"
              type="checkbox"
              checked={component.settings.showBrandFilter !== false}
              onChange={(e) => updateSetting('showBrandFilter', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="bfBrandFilter" className="text-xs font-medium text-gray-500 font-play cursor-pointer">
              Show Brand Filter
            </label>
          </div>
        </>
      )}

      {/* Footer */}
      {component.type === 'footer' && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Brand Name</label>
            <input
              type="text"
              value={(component.settings.brandName as string) || ''}
              onChange={(e) => updateSetting('brandName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
              placeholder="R66SLOT"
            />
            <p className="text-[10px] text-gray-400 mt-0.5 font-play">The word SLOT will be coloured with the accent colour.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Accent Colour</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={(component.settings.brandAccentColor as string) || '#ef4444'}
                onChange={(e) => updateSetting('brandAccentColor', e.target.value)}
                className="w-10 h-8 rounded border border-gray-200 cursor-pointer"
              />
              <input
                type="text"
                value={(component.settings.brandAccentColor as string) || '#ef4444'}
                onChange={(e) => updateSetting('brandAccentColor', e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs font-play"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Tagline</label>
            <input
              type="text"
              value={(component.settings.tagline as string) || ''}
              onChange={(e) => updateSetting('tagline', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
              placeholder="Your premium destination..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Copyright Text</label>
            <input
              type="text"
              value={(component.settings.copyright as string) || ''}
              onChange={(e) => updateSetting('copyright', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
              placeholder={`© ${new Date().getFullYear()} R66SLOT. All rights reserved.`}
            />
          </div>
          {[1, 2, 3].map((colNum) => (
            <div key={colNum}>
              <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Column {colNum} Title</label>
              <input
                type="text"
                value={(component.settings[`col${colNum}Title`] as string) || ''}
                onChange={(e) => updateSetting(`col${colNum}Title`, e.target.value)}
                className="w-full px-2 py-1 border border-gray-200 rounded text-sm font-play mb-1"
                placeholder={`Column ${colNum}`}
              />
              <label className="block text-[10px] text-gray-400 mb-1 font-play">Links (one per line: Label|/url)</label>
              <textarea
                value={(component.settings[`col${colNum}Links`] as string) || ''}
                onChange={(e) => updateSetting(`col${colNum}Links`, e.target.value)}
                rows={4}
                className="w-full px-2 py-1 border border-gray-200 rounded text-xs font-play resize-none"
                placeholder={'Shop Now|/products\nBrands|/brands'}
              />
            </div>
          ))}
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-xs font-play cursor-pointer">
              <input
                type="checkbox"
                checked={component.settings.showPrivacyLink !== 'false'}
                onChange={(e) => updateSetting('showPrivacyLink', e.target.checked ? 'true' : 'false')}
                className="rounded"
              />
              Privacy Link
            </label>
            <label className="flex items-center gap-1.5 text-xs font-play cursor-pointer">
              <input
                type="checkbox"
                checked={component.settings.showTermsLink !== 'false'}
                onChange={(e) => updateSetting('showTermsLink', e.target.checked ? 'true' : 'false')}
                className="rounded"
              />
              Terms Link
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Background Colour</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={component.styles.backgroundColor || '#1f2937'}
                onChange={(e) => onUpdate({ styles: { ...component.styles, backgroundColor: e.target.value } })}
                className="w-10 h-8 rounded border border-gray-200 cursor-pointer"
              />
              <span className="text-xs text-gray-400 font-play">{component.styles.backgroundColor || '#1f2937'}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Text Colour</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={component.styles.textColor || '#ffffff'}
                onChange={(e) => onUpdate({ styles: { ...component.styles, textColor: e.target.value } })}
                className="w-10 h-8 rounded border border-gray-200 cursor-pointer"
              />
              <span className="text-xs text-gray-400 font-play">{component.styles.textColor || '#ffffff'}</span>
            </div>
          </div>
        </>
      )}

      {/* Widget */}
      {component.type === 'widget' && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Widget Type</label>
            <select
              value={(component.settings.widgetType as string) || 'search'}
              onChange={(e) => updateSetting('widgetType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            >
              <option value="search">Search Bar</option>
              <option value="newsletter">Newsletter Signup</option>
              <option value="contact-form">Contact Form</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Title</label>
            <input
              type="text"
              value={(component.settings.title as string) || ''}
              onChange={(e) => updateSetting('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
          </div>
          {(component.settings.widgetType === 'search') && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Placeholder</label>
              <input
                type="text"
                value={(component.settings.placeholder as string) || ''}
                onChange={(e) => updateSetting('placeholder', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
              />
            </div>
          )}
          {(component.settings.widgetType === 'newsletter' || component.settings.widgetType === 'contact-form') && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Description</label>
              <textarea
                value={(component.settings.description as string) || ''}
                onChange={(e) => updateSetting('description', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
              />
            </div>
          )}
        </>
      )}

      {/* Media */}
      {component.type === 'media' && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Media Type</label>
            <select
              value={(component.settings.mediaType as string) || 'image'}
              onChange={(e) => updateSetting('mediaType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </div>
          {(component.settings.mediaType || 'image') === 'image' ? (
            <ImageField
              label="Image"
              value={(component.settings.imageUrl as string) || ''}
              onChange={(url) => updateSetting('imageUrl', url)}
            />
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Video URL</label>
              <input
                type="text"
                value={(component.settings.videoUrl as string) || ''}
                onChange={(e) => updateSetting('videoUrl', e.target.value)}
                placeholder="YouTube or Vimeo embed URL"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Alt Text</label>
            <input
              type="text"
              value={(component.settings.alt as string) || ''}
              onChange={(e) => updateSetting('alt', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Caption</label>
            <input
              type="text"
              value={(component.settings.caption as string) || ''}
              onChange={(e) => updateSetting('caption', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Aspect Ratio</label>
            <select
              value={(component.settings.aspectRatio as string) || '16/9'}
              onChange={(e) => updateSetting('aspectRatio', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            >
              <option value="16/9">16:9 (Widescreen)</option>
              <option value="4/3">4:3 (Standard)</option>
              <option value="1/1">1:1 (Square)</option>
              <option value="21/9">21:9 (Ultra-wide)</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </>
      )}
    </>
  )
}

// ─── Visual Gallery Editor (shows image thumbnails) ───
function VisualGalleryEditor({
  component,
  onUpdate,
}: {
  component: PageComponent
  onUpdate: (updates: Partial<PageComponent>) => void
}) {
  const children = component.children || []

  const addImage = () => {
    const newChild: PageComponent = {
      id: `child-${Date.now()}`,
      type: 'image',
      content: '',
      styles: {},
      settings: { imageUrl: '', alt: '' },
    }
    onUpdate({ children: [...children, newChild] })
  }

  const removeImage = (index: number) => {
    const updated = children.filter((_, i) => i !== index)
    onUpdate({ children: updated })
  }

  const updateImageUrl = (index: number, url: string) => {
    const updated = children.map((child, i) =>
      i === index ? { ...child, settings: { ...child.settings, imageUrl: url } } : child
    )
    onUpdate({ children: updated })
  }

  const updateImageSize = (index: number, key: string, value: string) => {
    const updated = children.map((child, i) =>
      i === index ? { ...child, styles: { ...child.styles, [key]: value } } : child
    )
    onUpdate({ children: updated })
  }

  const updateImageLink = (index: number, link: string) => {
    const updated = children.map((child, i) =>
      i === index ? { ...child, settings: { ...child.settings, link } } : child
    )
    onUpdate({ children: updated })
  }

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= children.length) return
    const updated = [...children]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    onUpdate({ children: updated })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-gray-500 font-play">Gallery Images ({children.length})</label>
        <button
          onClick={addImage}
          className="px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 rounded font-play font-medium"
        >
          + Add Image
        </button>
      </div>

      {/* Visual image grid */}
      <div className="grid grid-cols-2 gap-2">
        {children.map((child, idx) => (
          <GalleryImageCard
            key={child.id}
            imageUrl={(child.settings.imageUrl as string) || ''}
            imageLink={(child.settings.link as string) || ''}
            imageWidth={(child.styles?.width as string) || ''}
            imageHeight={(child.styles?.height as string) || ''}
            index={idx}
            total={children.length}
            onChangeUrl={(url) => updateImageUrl(idx, url)}
            onChangeLink={(link) => updateImageLink(idx, link)}
            onChangeWidth={(w) => updateImageSize(idx, 'width', w)}
            onChangeHeight={(h) => updateImageSize(idx, 'height', h)}
            onRemove={() => removeImage(idx)}
            onMoveUp={() => moveImage(idx, idx - 1)}
            onMoveDown={() => moveImage(idx, idx + 1)}
          />
        ))}
      </div>

      {children.length === 0 && (
        <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-xs text-gray-400 font-play">No images yet</p>
          <button
            onClick={addImage}
            className="mt-2 text-xs text-blue-600 font-play font-medium hover:underline"
          >
            Add your first image
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Gallery Image Card (visual thumbnail) ───
function GalleryImageCard({
  imageUrl,
  imageLink,
  imageWidth,
  imageHeight,
  index,
  total,
  onChangeUrl,
  onChangeLink,
  onChangeWidth,
  onChangeHeight,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  imageUrl: string
  imageLink: string
  imageWidth: string
  imageHeight: string
  index: number
  total: number
  onChangeUrl: (url: string) => void
  onChangeLink: (link: string) => void
  onChangeWidth: (w: string) => void
  onChangeHeight: (h: string) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showSize, setShowSize] = useState(false)
  const [showLink, setShowLink] = useState(false)

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
        onChangeUrl(data.url)
      }
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-1">
      <div className="relative group/card aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full h-full flex flex-col items-center justify-center text-gray-300 hover:text-blue-400 transition-colors"
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            ) : (
              <>
                <span className="text-2xl">+</span>
                <span className="text-[10px] font-play">Upload</span>
              </>
            )}
          </button>
        )}

        {/* Hover overlay with actions */}
        {imageUrl && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
            <button
              onClick={() => fileRef.current?.click()}
              className="px-2 py-1 bg-white text-gray-800 text-[10px] rounded font-play"
            >
              Change
            </button>
            <div className="flex gap-1">
              <button
                onClick={() => setShowSize(!showSize)}
                className="px-1.5 py-0.5 bg-blue-500 text-white text-[10px] rounded"
                title="Resize"
              >
                ⤡
              </button>
              <button
                onClick={() => setShowLink(!showLink)}
                className={`px-1.5 py-0.5 text-white text-[10px] rounded ${imageLink ? 'bg-green-500' : 'bg-purple-500'}`}
                title="Link"
              >
                🔗
              </button>
              {index > 0 && (
                <button onClick={onMoveUp} className="px-1.5 py-0.5 bg-white/80 text-gray-800 text-[10px] rounded">
                  &#8592;
                </button>
              )}
              {index < total - 1 && (
                <button onClick={onMoveDown} className="px-1.5 py-0.5 bg-white/80 text-gray-800 text-[10px] rounded">
                  &#8594;
                </button>
              )}
              <button onClick={onRemove} className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded">
                &#10005;
              </button>
            </div>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      </div>

      {/* Per-image size controls */}
      {showSize && imageUrl && (
        <div className="flex gap-1">
          <input
            type="text"
            value={imageWidth}
            onChange={(e) => onChangeWidth(e.target.value)}
            placeholder="W"
            className="flex-1 px-1 py-0.5 border border-gray-200 rounded text-[10px] font-play text-center"
            title="Width (e.g. 300px, 100%)"
          />
          <input
            type="text"
            value={imageHeight}
            onChange={(e) => onChangeHeight(e.target.value)}
            placeholder="H"
            className="flex-1 px-1 py-0.5 border border-gray-200 rounded text-[10px] font-play text-center"
            title="Height (e.g. auto, 200px)"
          />
        </div>
      )}

      {/* Per-image link */}
      {showLink && imageUrl && (
        <div>
          <input
            type="text"
            value={imageLink}
            onChange={(e) => onChangeLink(e.target.value)}
            placeholder="Page link (e.g. /products)"
            className="w-full px-1.5 py-0.5 border border-gray-200 rounded text-[10px] font-play"
            title="Link URL for this image"
          />
        </div>
      )}
    </div>
  )
}

// ─── Visual Column Editor ───
function VisualColumnEditor({
  component,
  onUpdate,
  viewMode = 'desktop',
}: {
  component: PageComponent
  onUpdate: (updates: Partial<PageComponent>) => void
  viewMode?: 'desktop' | 'tablet' | 'mobile'
}) {
  const children = component.children || []
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({})

  const updateChild = (index: number, updates: Partial<PageComponent>) => {
    const updated = children.map((child, i) =>
      i === index ? { ...child, ...updates } : child
    )
    onUpdate({ children: updated })
  }

  const updateChildContent = (index: number, content: string) => {
    updateChild(index, { content })
  }

  const updateChildIcon = (index: number, icon: string) => {
    const child = children[index]
    updateChild(index, { settings: { ...child.settings, icon } })
  }

  const updateChildSetting = (index: number, key: string, value: string) => {
    const child = children[index]
    updateChild(index, { settings: { ...child.settings, [key]: value } })
  }

  const updateChildStyle = (index: number, key: string, value: string) => {
    const child = children[index]
    updateChild(index, { styles: { ...child.styles, [key]: value } })
  }

  const handleColumnImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        updateChildSetting(index, 'imageUrl', data.url)
      }
    } catch (err) {
      console.error('Upload failed:', err)
    }
    if (fileRefs.current[index]) fileRefs.current[index]!.value = ''
  }

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-gray-500 font-play">Columns</label>
      {children.map((child, idx) => (
        <div key={child.id} className="bg-gray-50 rounded-lg p-2.5 space-y-2 border border-gray-100">
          <p className="text-xs font-semibold text-gray-700 font-play">Column {idx + 1}</p>

          {/* Icon picker for icon-text children */}
          {child.settings.icon !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-2xl">{(child.settings.icon as string) || '?'}</span>
              <input
                type="text"
                value={(child.settings.icon as string) || ''}
                onChange={(e) => updateChildIcon(idx, e.target.value)}
                placeholder="Emoji icon"
                className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm font-play"
              />
            </div>
          )}

          {/* Column Image Upload */}
          <div>
            <label className="block text-[10px] font-medium text-gray-400 mb-1 font-play">Image</label>
            {(child.settings.imageUrl as string) ? (
              <div className="relative group/colimg">
                <img
                  src={child.settings.imageUrl as string}
                  alt=""
                  className="w-full h-20 object-cover rounded border border-gray-200"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/colimg:opacity-100 transition-opacity flex items-center justify-center gap-1 rounded">
                  <button
                    onClick={() => fileRefs.current[idx]?.click()}
                    className="px-2 py-0.5 bg-white text-gray-800 text-[10px] rounded font-play"
                  >
                    Change
                  </button>
                  <button
                    onClick={() => updateChildSetting(idx, 'imageUrl', '')}
                    className="px-2 py-0.5 bg-red-500 text-white text-[10px] rounded"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileRefs.current[idx]?.click()}
                className="w-full py-2 border border-dashed border-gray-300 rounded text-[10px] text-gray-400 hover:text-blue-500 hover:border-blue-300 transition-colors font-play"
              >
                + Upload Image
              </button>
            )}
            <input
              ref={(el) => { fileRefs.current[idx] = el }}
              type="file"
              accept="image/*"
              onChange={(e) => handleColumnImageUpload(idx, e)}
              className="hidden"
            />
            {/* Image Fit + Height */}
            {(child.settings.imageUrl as string) && (
              <>
                <div className="mt-1.5">
                  <label className="block text-[10px] font-medium text-gray-400 mb-1 font-play">Image Fit</label>
                  <select
                    value={(child.settings.objectFit as string) || 'cover'}
                    onChange={(e) => updateChildSetting(idx, 'objectFit', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs font-play"
                  >
                    <option value="cover">Cover (fill, may crop)</option>
                    <option value="contain">Contain (fit, may letterbox)</option>
                    <option value="fill">Fill (stretch to fit)</option>
                    <option value="none">None (original size)</option>
                    <option value="scale-down">Scale Down (shrink only)</option>
                  </select>
                </div>
                <div className="mt-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-medium text-gray-400 font-play">Image Size</label>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-play font-bold ${
                      viewMode === 'mobile' ? 'bg-blue-100 text-blue-600' :
                      viewMode === 'tablet' ? 'bg-purple-100 text-purple-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {viewMode === 'mobile' ? 'Mobile' : viewMode === 'tablet' ? 'Tablet' : 'Desktop'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {(['Width', 'Height'] as const).map((dim) => {
                      const settingKey = dim === 'Width'
                        ? (viewMode === 'mobile' ? 'imageWidthMobile' : viewMode === 'tablet' ? 'imageWidthTablet' : 'imageWidth')
                        : (viewMode === 'mobile' ? 'imageHeightMobile' : viewMode === 'tablet' ? 'imageHeightTablet' : 'imageHeight')
                      const storedVal = (child.settings[settingKey] as string) || ''
                      const numVal = storedVal.replace('px', '')
                      return (
                        <div key={dim} className="flex-1">
                          <label className="block text-[10px] text-gray-400 mb-1 font-play">{dim} (px)</label>
                          <input
                            type="number"
                            min="0"
                            value={numVal}
                            onChange={(e) => updateChildSetting(idx, settingKey, e.target.value ? `${e.target.value}px` : '')}
                            placeholder="auto"
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs font-play"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
                <p className="text-[9px] text-gray-400 mt-0.5 font-play">Switch viewport (Mobile/Tablet/Desktop) to set sizes independently.</p>
              </>
            )}
          </div>

          {/* Column Link */}
          <div>
            <label className="block text-[10px] font-medium text-gray-400 mb-1 font-play">Link URL</label>
            <input
              type="text"
              value={(child.settings.link as string) || ''}
              onChange={(e) => updateChildSetting(idx, 'link', e.target.value)}
              placeholder="/page-slug or https://..."
              className="w-full px-2 py-1 border border-gray-200 rounded text-xs font-play"
            />
          </div>

          {/* Text Alignment */}
          <div>
            <label className="block text-[10px] font-medium text-gray-400 mb-1 font-play">Text Align</label>
            <div className="flex gap-1">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => updateChildStyle(idx, 'textAlign', align)}
                  className={`flex-1 py-1 text-[10px] rounded font-play font-medium transition-colors border ${
                    (child.styles?.textAlign || 'left') === align
                      ? 'bg-blue-100 text-blue-700 border-blue-300'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {align === 'left' ? '⇐ Left' : align === 'center' ? '⇔ Centre' : 'Right ⇒'}
                </button>
              ))}
            </div>
          </div>

          {/* Rich text editor for content */}
          <RichTextEditor
            label="Content"
            value={child.content}
            onChange={(html) => updateChildContent(idx, html)}
            rows={3}
          />
        </div>
      ))}
    </div>
  )
}

// ─── Position Input (X/Y pair) ───
function PositionInput({
  label,
  x,
  y,
  onChangeX,
  onChangeY,
}: {
  label: string
  x: number
  y: number
  onChangeX: (v: number) => void
  onChangeY: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 font-play w-20 truncate">{label}</span>
      <div className="flex items-center gap-1 flex-1">
        <span className="text-[10px] text-gray-400">X</span>
        <input
          type="number"
          value={Math.round(x)}
          onChange={(e) => onChangeX(parseInt(e.target.value) || 0)}
          className="w-14 px-1 py-0.5 border border-gray-200 rounded text-[11px] font-play text-center"
        />
        <span className="text-[10px] text-gray-400">Y</span>
        <input
          type="number"
          value={Math.round(y)}
          onChange={(e) => onChangeY(parseInt(e.target.value) || 0)}
          className="w-14 px-1 py-0.5 border border-gray-200 rounded text-[11px] font-play text-center"
        />
      </div>
    </div>
  )
}

// ─── Opacity Slider ───
function OpacitySlider({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const numValue = parseInt(value) || 100
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-gray-500 font-play">Opacity</label>
        <span className="text-xs text-gray-400 font-play">{numValue}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={numValue}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <div className="flex justify-between text-[10px] text-gray-400 font-play mt-0.5">
        <span>Transparent</span>
        <span>Opaque</span>
      </div>
    </div>
  )
}

// ─── Style Tab ───
function StyleTab({
  component,
  updateStyle,
}: {
  component: PageComponent
  updateStyle: (key: string, value: string) => void
}) {
  return (
    <>
      {/* Opacity Control */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 font-play flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Opacity
        </h4>
        <OpacitySlider
          value={component.styles.opacity || '100'}
          onChange={(v) => updateStyle('opacity', v)}
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1 font-play">Background Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={component.styles.backgroundColor || '#ffffff'}
            onChange={(e) => updateStyle('backgroundColor', e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-gray-200"
          />
          <input
            type="text"
            value={component.styles.backgroundColor || ''}
            onChange={(e) => updateStyle('backgroundColor', e.target.value)}
            placeholder="#ffffff"
            className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs font-play"
          />
        </div>
        {/* Background Opacity */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-gray-500 font-play">Background Opacity</label>
            <span className="text-[10px] text-gray-400 font-play">{parseInt(component.styles.backgroundOpacity || '100')}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={parseInt(component.styles.backgroundOpacity || '100')}
            onChange={(e) => updateStyle('backgroundOpacity', e.target.value)}
            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1 font-play">Text Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={component.styles.textColor || '#000000'}
            onChange={(e) => updateStyle('textColor', e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-gray-200"
          />
          <input
            type="text"
            value={component.styles.textColor || ''}
            onChange={(e) => updateStyle('textColor', e.target.value)}
            placeholder="#000000"
            className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs font-play"
          />
        </div>
        {/* Text Opacity */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-gray-500 font-play">Text Opacity</label>
            <span className="text-[10px] text-gray-400 font-play">{parseInt(component.styles.textOpacity || '100')}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={parseInt(component.styles.textOpacity || '100')}
            onChange={(e) => updateStyle('textOpacity', e.target.value)}
            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1 font-play">Text Align</label>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              onClick={() => updateStyle('textAlign', align)}
              className={`flex-1 py-1.5 text-xs rounded ${
                component.styles.textAlign === align
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {align.charAt(0).toUpperCase() + align.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Border & Shadow */}
      <div className="pt-2 border-t border-gray-100">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 font-play">Border & Shadow</h4>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-gray-500 font-play mb-1 block">Border Radius</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={50}
                value={parseInt(component.styles.borderRadius || '0')}
                onChange={(e) => updateStyle('borderRadius', `${e.target.value}px`)}
                className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-[10px] text-gray-400 font-play w-10 text-right">{parseInt(component.styles.borderRadius || '0')}px</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 font-play mb-1 block">Border Width</label>
              <input
                type="text"
                value={component.styles.borderWidth || ''}
                onChange={(e) => updateStyle('borderWidth', e.target.value)}
                placeholder="0px"
                className="w-full px-1.5 py-1 border border-gray-200 rounded text-[11px] font-play"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-play mb-1 block">Border Color</label>
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={component.styles.borderColor || '#e5e7eb'}
                  onChange={(e) => updateStyle('borderColor', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border border-gray-200"
                />
                <input
                  type="text"
                  value={component.styles.borderColor || ''}
                  onChange={(e) => updateStyle('borderColor', e.target.value)}
                  placeholder="#e5e7eb"
                  className="flex-1 px-1 py-1 border border-gray-200 rounded text-[11px] font-play"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 font-play mb-1 block">Box Shadow</label>
            <select
              value={component.styles.boxShadow || ''}
              onChange={(e) => updateStyle('boxShadow', e.target.value)}
              className="w-full px-1.5 py-1 border border-gray-200 rounded text-[11px] font-play"
            >
              <option value="">None</option>
              <option value="0 1px 3px rgba(0,0,0,0.12)">Small</option>
              <option value="0 4px 6px rgba(0,0,0,0.1)">Medium</option>
              <option value="0 10px 25px rgba(0,0,0,0.15)">Large</option>
              <option value="0 20px 50px rgba(0,0,0,0.2)">XL</option>
            </select>
          </div>
        </div>
      </div>

      {/* Visual Padding Controls */}
      <div className="pt-2 border-t border-gray-100">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 font-play">Padding</h4>
        <div className="space-y-2">
          <PaddingSlider
            label="Top"
            value={component.styles.paddingTop || '0px'}
            onChange={(v) => updateStyle('paddingTop', v)}
          />
          <PaddingSlider
            label="Bottom"
            value={component.styles.paddingBottom || '0px'}
            onChange={(v) => updateStyle('paddingBottom', v)}
          />
          <PaddingSlider
            label="Left"
            value={component.styles.paddingLeft || '16px'}
            onChange={(v) => updateStyle('paddingLeft', v)}
          />
          <PaddingSlider
            label="Right"
            value={component.styles.paddingRight || '16px'}
            onChange={(v) => updateStyle('paddingRight', v)}
          />
        </div>
      </div>

      {/* Margin Controls */}
      <div className="pt-2 border-t border-gray-100">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 font-play">Margin</h4>
        <div className="space-y-2">
          <PaddingSlider
            label="Top"
            value={component.styles.marginTop || '0px'}
            onChange={(v) => updateStyle('marginTop', v)}
          />
          <PaddingSlider
            label="Bottom"
            value={component.styles.marginBottom || '0px'}
            onChange={(v) => updateStyle('marginBottom', v)}
          />
        </div>
      </div>
    </>
  )
}

// ─── Settings Tab ───
function SettingsTab({
  component,
  onUpdate,
  updateSetting,
}: {
  component: PageComponent
  onUpdate: (updates: Partial<PageComponent>) => void
  updateSetting: (key: string, value: any) => void
}) {
  const [carBrandDropdownOpen, setCarBrandDropdownOpen] = useState(false)
  const [carClassDropdownOpen, setCarClassDropdownOpen] = useState(false)
  const [revoPartDropdownOpen, setRevoPartDropdownOpen] = useState(false)

  const CAR_BRANDS = [
    'Ford Escort MK I',
  ]

  const CAR_CLASSES = ['GT', 'GT 1', 'GT 2', 'GT 3', 'Group 2', 'Group 5', 'GT/IUMSA']
  const REVO_PARTS = ['Tyres', 'Wheels', 'Axle', 'Bearings', 'Gears', 'Pinions', 'Screws and Nuts', 'Motors', 'Guides', 'Body Plates & Chassis', 'White body parts set', 'Clear parts set', 'Lexan Cockpit Set']

  const selectedCarBrands: string[] = Array.isArray(component.settings.carBrands)
    ? (component.settings.carBrands as string[])
    : []

  // carClasses: new multi-value setting; falls back to legacy carClass string
  const selectedCarClasses: string[] = Array.isArray(component.settings.carClasses)
    ? (component.settings.carClasses as string[])
    : (component.settings.carClass ? [component.settings.carClass as string] : [])

  // revoParts: new multi-value setting; falls back to legacy revoPart string
  const selectedRevoParts: string[] = Array.isArray(component.settings.revoParts)
    ? (component.settings.revoParts as string[])
    : (component.settings.revoPart ? [component.settings.revoPart as string] : [])

  const KEEP_EMPTY = '__EMPTY__'

  const toggleCarBrand = (brand: string) => {
    if (brand === KEEP_EMPTY) {
      updateSetting('carBrands', selectedCarBrands.includes(KEEP_EMPTY) ? [] : [KEEP_EMPTY])
      return
    }
    const base = selectedCarBrands.filter(b => b !== KEEP_EMPTY)
    updateSetting('carBrands', base.includes(brand) ? base.filter(b => b !== brand) : [...base, brand])
  }

  const toggleCarClass = (cls: string) => {
    if (cls === KEEP_EMPTY) {
      onUpdate({ settings: { ...component.settings, carClasses: selectedCarClasses.includes(KEEP_EMPTY) ? [] : [KEEP_EMPTY], carClass: '' } })
      return
    }
    const base = selectedCarClasses.filter(c => c !== KEEP_EMPTY)
    const next = base.includes(cls) ? base.filter(c => c !== cls) : [...base, cls]
    onUpdate({ settings: { ...component.settings, carClasses: next, carClass: '' } })
  }

  const toggleRevoPart = (part: string) => {
    if (part === KEEP_EMPTY) {
      onUpdate({ settings: { ...component.settings, revoParts: selectedRevoParts.includes(KEEP_EMPTY) ? [] : [KEEP_EMPTY], revoPart: '' } })
      return
    }
    const base = selectedRevoParts.filter(p => p !== KEEP_EMPTY)
    const next = base.includes(part) ? base.filter(p => p !== part) : [...base, part]
    onUpdate({ settings: { ...component.settings, revoParts: next, revoPart: '' } })
  }

  return (
    <>
      {/* Current mode indicator */}
      <div className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-gray-50 border border-gray-200">
        <span className={`w-2 h-2 rounded-full ${component.positionMode === 'absolute' ? 'bg-purple-500' : 'bg-blue-500'}`} />
        <span className="text-[11px] text-gray-600 font-play font-medium">
          {component.positionMode === 'absolute' ? 'Freeform mode' : 'Flow mode'}
        </span>
        <span className="text-[10px] text-gray-400 font-play ml-auto">Change in Content tab</span>
      </div>

      {/* Animation */}
      <div className="bg-indigo-50 rounded-lg p-3 space-y-2 border border-indigo-200">
        <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wider font-play">Animation</h4>
        <div>
          <label className="text-[10px] text-gray-500 font-play mb-1 block">Type</label>
          <select
            value={(component.settings.animation as string) || 'none'}
            onChange={(e) => updateSetting('animation', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-play"
          >
            <option value="none">None</option>
            <option value="fade-in">Fade In</option>
            <option value="slide-up">Slide Up</option>
            <option value="slide-left">Slide Left</option>
            <option value="slide-right">Slide Right</option>
            <option value="zoom-in">Zoom In</option>
            <option value="bounce">Bounce</option>
          </select>
        </div>
        {(component.settings.animation as string) && (component.settings.animation as string) !== 'none' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 font-play mb-1 block">Duration</label>
              <select
                value={String(component.settings.animationDuration || '0.6')}
                onChange={(e) => updateSetting('animationDuration', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-play"
              >
                <option value="0.3">0.3s</option>
                <option value="0.6">0.6s</option>
                <option value="1">1s</option>
                <option value="1.5">1.5s</option>
                <option value="2">2s</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-play mb-1 block">Delay</label>
              <select
                value={String(component.settings.animationDelay || '0')}
                onChange={(e) => updateSetting('animationDelay', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-play"
              >
                <option value="0">0s</option>
                <option value="0.2">0.2s</option>
                <option value="0.4">0.4s</option>
                <option value="0.6">0.6s</option>
                <option value="1">1s</option>
              </select>
            </div>
          </div>
        )}
        <p className="text-[10px] text-indigo-500 font-play">Animations play on scroll in published page</p>
      </div>

      {/* Columns dimensions */}
      {(component.type === 'columns' || component.type === 'two-column' || component.type === 'three-column') && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-200">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider font-play">Dimensions</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 font-play">Width</label>
              <input
                type="text"
                value={component.styles.width || ''}
                onChange={(e) => onUpdate({ styles: { ...component.styles, width: e.target.value } })}
                placeholder="auto"
                className="w-full px-1.5 py-1 border border-gray-200 rounded text-[11px] font-play"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-play">Max Width</label>
              <input
                type="text"
                value={component.styles.maxWidth || ''}
                onChange={(e) => onUpdate({ styles: { ...component.styles, maxWidth: e.target.value } })}
                placeholder="100%"
                className="w-full px-1.5 py-1 border border-gray-200 rounded text-[11px] font-play"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 font-play">Height</label>
              <input
                type="text"
                value={component.styles.height || ''}
                onChange={(e) => onUpdate({ styles: { ...component.styles, height: e.target.value } })}
                placeholder="auto"
                className="w-full px-1.5 py-1 border border-gray-200 rounded text-[11px] font-play"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-play">Min Height</label>
              <input
                type="text"
                value={component.styles.minHeight || ''}
                onChange={(e) => onUpdate({ styles: { ...component.styles, minHeight: e.target.value } })}
                placeholder="auto"
                className="w-full px-1.5 py-1 border border-gray-200 rounded text-[11px] font-play"
              />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 font-play">Use CSS values: 500px, 80%, 50vw. Also in Content tab → Layout Mode.</p>
        </div>
      )}

      {/* Hero alignment */}
      {component.type === 'hero' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Alignment</label>
          <select
            value={(component.settings.alignment as string) || 'left'}
            onChange={(e) => updateSetting('alignment', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
          </select>
        </div>
      )}

      {/* Divider settings */}
      {component.type === 'divider' && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Thickness</label>
            <input
              type="text"
              value={(component.settings.thickness as string) || '1px'}
              onChange={(e) => updateSetting('thickness', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Style</label>
            <select
              value={(component.settings.style as string) || 'solid'}
              onChange={(e) => updateSetting('style', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={(component.settings.color as string) || '#e5e7eb'}
                onChange={(e) => updateSetting('color', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-gray-200"
              />
              <input
                type="text"
                value={(component.settings.color as string) || ''}
                onChange={(e) => updateSetting('color', e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs font-play"
              />
            </div>
          </div>
        </>
      )}

      {/* Product Grid settings */}
      {component.type === 'product-grid' && (
        <>
          {/* ── Reusable filter helper ──────────────────────────────────────────── */}
          {/* Racing Class filter */}
          {(([open, setOpen, selected, toggle, clearFn, items, label]: any) => (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 font-play">{label}</label>
              <div className="relative">
                <button type="button" onClick={() => setOpen(!open)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm font-play text-left flex items-center justify-between bg-white ${
                    selected.length > 0 ? (selected.includes(KEEP_EMPTY) ? 'border-orange-300 bg-orange-50' : 'border-red-300 bg-red-50') : 'border-gray-200'
                  }`}>
                  <span className={selected.length === 0 ? 'text-gray-400' : selected.includes(KEEP_EMPTY) ? 'text-orange-700 font-semibold' : 'text-gray-800'}>
                    {selected.length === 0 ? '— No Filter —' : selected.includes(KEEP_EMPTY) ? 'Keep Empty' : selected.length === 1 ? selected[0] : `${selected.length} selected`}
                  </span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {open && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    <label className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 bg-gray-50">
                      <input type="checkbox" checked={selected.length === 0} onChange={() => clearFn()} className="rounded" />
                      <span className="text-xs text-gray-700 font-play font-semibold">— No Filter — (show all)</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 hover:bg-orange-50 cursor-pointer border-b-2 border-gray-200 bg-orange-50/40">
                      <input type="checkbox" checked={selected.includes(KEEP_EMPTY)} onChange={() => toggle(KEEP_EMPTY)} className="rounded accent-orange-500" />
                      <span className="text-xs text-orange-700 font-play font-semibold">Keep Empty <span className="font-normal text-orange-500">(products with no {label.replace(' Filter','')})</span></span>
                    </label>
                    {items.map((item: string) => (
                      <label key={item} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={selected.includes(item)} onChange={() => toggle(item)} className="rounded" />
                        <span className="text-xs text-gray-800 font-play">{item}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {selected.length > 0 ? (
                <div className="mt-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-[10px] font-play font-medium ${selected.includes(KEEP_EMPTY) ? 'text-orange-600' : 'text-red-600'}`}>
                      {selected.includes(KEEP_EMPTY) ? 'Keep Empty — showing products with no value' : `Active: ${selected.length} selected`}
                    </p>
                    <button onClick={() => clearFn()} className="text-[10px] text-gray-400 hover:text-red-500 font-play underline">Clear</button>
                  </div>
                  {!selected.includes(KEEP_EMPTY) && (
                    <div className="flex flex-wrap gap-1">
                      {selected.map((v: string) => (
                        <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-play font-semibold rounded-full">
                          {v}<button onClick={() => toggle(v)} className="hover:text-red-900">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 mt-1 font-play">No filter — all shown</p>
              )}
            </div>
          ))([
            carClassDropdownOpen, setCarClassDropdownOpen,
            selectedCarClasses,
            toggleCarClass,
            () => { onUpdate({ settings: { ...component.settings, carClasses: [], carClass: '' } }) },
            CAR_CLASSES,
            'Racing Class Filter',
          ])}

          {/* Revo Parts filter */}
          {(([open, setOpen, selected, toggle, clearFn, items, label]: any) => (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 font-play">{label}</label>
              <div className="relative">
                <button type="button" onClick={() => setOpen(!open)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm font-play text-left flex items-center justify-between bg-white ${
                    selected.length > 0 ? (selected.includes(KEEP_EMPTY) ? 'border-orange-300 bg-orange-50' : 'border-red-300 bg-red-50') : 'border-gray-200'
                  }`}>
                  <span className={selected.length === 0 ? 'text-gray-400' : selected.includes(KEEP_EMPTY) ? 'text-orange-700 font-semibold' : 'text-gray-800'}>
                    {selected.length === 0 ? '— No Filter —' : selected.includes(KEEP_EMPTY) ? 'Keep Empty' : selected.length === 1 ? selected[0] : `${selected.length} selected`}
                  </span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {open && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    <label className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 bg-gray-50">
                      <input type="checkbox" checked={selected.length === 0} onChange={() => clearFn()} className="rounded" />
                      <span className="text-xs text-gray-700 font-play font-semibold">— No Filter — (show all)</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 hover:bg-orange-50 cursor-pointer border-b-2 border-gray-200 bg-orange-50/40">
                      <input type="checkbox" checked={selected.includes(KEEP_EMPTY)} onChange={() => toggle(KEEP_EMPTY)} className="rounded accent-orange-500" />
                      <span className="text-xs text-orange-700 font-play font-semibold">Keep Empty <span className="font-normal text-orange-500">(products with no {label.replace(' Filter','')})</span></span>
                    </label>
                    {items.map((item: string) => (
                      <label key={item} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={selected.includes(item)} onChange={() => toggle(item)} className="rounded" />
                        <span className="text-xs text-gray-800 font-play">{item}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {selected.length > 0 ? (
                <div className="mt-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-[10px] font-play font-medium ${selected.includes(KEEP_EMPTY) ? 'text-orange-600' : 'text-red-600'}`}>
                      {selected.includes(KEEP_EMPTY) ? 'Keep Empty — showing products with no value' : `Active: ${selected.length} selected`}
                    </p>
                    <button onClick={() => clearFn()} className="text-[10px] text-gray-400 hover:text-red-500 font-play underline">Clear</button>
                  </div>
                  {!selected.includes(KEEP_EMPTY) && (
                    <div className="flex flex-wrap gap-1">
                      {selected.map((v: string) => (
                        <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-play font-semibold rounded-full">
                          {v}<button onClick={() => toggle(v)} className="hover:text-red-900">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 mt-1 font-play">No filter — all shown</p>
              )}
            </div>
          ))([
            revoPartDropdownOpen, setRevoPartDropdownOpen,
            selectedRevoParts,
            toggleRevoPart,
            () => { onUpdate({ settings: { ...component.settings, revoParts: [], revoPart: '' } }) },
            REVO_PARTS,
            'Revo Parts Filter',
          ])}

          {/* Car Brand filter */}
          {(([open, setOpen, selected, toggle, clearFn, items, label]: any) => (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 font-play">{label}</label>
              <div className="relative">
                <button type="button" onClick={() => setOpen(!open)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm font-play text-left flex items-center justify-between bg-white ${
                    selected.length > 0 ? (selected.includes(KEEP_EMPTY) ? 'border-orange-300 bg-orange-50' : 'border-red-300 bg-red-50') : 'border-gray-200'
                  }`}>
                  <span className={selected.length === 0 ? 'text-gray-400' : selected.includes(KEEP_EMPTY) ? 'text-orange-700 font-semibold' : 'text-gray-800'}>
                    {selected.length === 0 ? '— No Filter —' : selected.includes(KEEP_EMPTY) ? 'Keep Empty' : selected.length === 1 ? selected[0] : `${selected.length} selected`}
                  </span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {open && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    <label className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 bg-gray-50">
                      <input type="checkbox" checked={selected.length === 0} onChange={() => clearFn()} className="rounded" />
                      <span className="text-xs text-gray-700 font-play font-semibold">— No Filter — (show all)</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 hover:bg-orange-50 cursor-pointer border-b-2 border-gray-200 bg-orange-50/40">
                      <input type="checkbox" checked={selected.includes(KEEP_EMPTY)} onChange={() => toggle(KEEP_EMPTY)} className="rounded accent-orange-500" />
                      <span className="text-xs text-orange-700 font-play font-semibold">Keep Empty <span className="font-normal text-orange-500">(products with no {label.replace(' Filter','')})</span></span>
                    </label>
                    {items.map((item: string) => (
                      <label key={item} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={selected.includes(item)} onChange={() => toggle(item)} className="rounded" />
                        <span className="text-xs text-gray-800 font-play">{item}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {selected.length > 0 ? (
                <div className="mt-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-[10px] font-play font-medium ${selected.includes(KEEP_EMPTY) ? 'text-orange-600' : 'text-red-600'}`}>
                      {selected.includes(KEEP_EMPTY) ? 'Keep Empty — showing products with no value' : `Active: ${selected.length} selected`}
                    </p>
                    <button onClick={() => clearFn()} className="text-[10px] text-gray-400 hover:text-red-500 font-play underline">Clear</button>
                  </div>
                  {!selected.includes(KEEP_EMPTY) && (
                    <div className="flex flex-wrap gap-1">
                      {selected.map((v: string) => (
                        <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-play font-semibold rounded-full">
                          {v}<button onClick={() => toggle(v)} className="hover:text-red-900">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 mt-1 font-play">No filter — all shown</p>
              )}
            </div>
          ))([
            carBrandDropdownOpen, setCarBrandDropdownOpen,
            selectedCarBrands,
            toggleCarBrand,
            () => updateSetting('carBrands', []),
            CAR_BRANDS,
            'Car Brand Filter',
          ])}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={component.settings.showPrice as boolean}
              onChange={(e) => updateSetting('showPrice', e.target.checked)}
              className="rounded"
            />
            <label className="text-xs text-gray-600 font-play">Show Price</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={component.settings.showAddToCart as boolean}
              onChange={(e) => updateSetting('showAddToCart', e.target.checked)}
              className="rounded"
            />
            <label className="text-xs text-gray-600 font-play">Show Book Now</label>
          </div>
        </>
      )}

      {/* Gallery settings */}
      {component.type === 'gallery' && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Image Display Mode</label>
            <select
              value={(component.settings.galleryMode as string) || 'square'}
              onChange={(e) => updateSetting('galleryMode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            >
              <option value="square">Square (200x200, object-fit cover)</option>
              <option value="fixed">Fixed Width (300px, keep aspect ratio)</option>
              <option value="responsive">Responsive (fill container)</option>
            </select>
            <p className="text-[10px] text-gray-400 mt-1 font-play">
              {(component.settings.galleryMode || 'square') === 'square'
                ? 'Images cover a 200x200 container without distortion'
                : (component.settings.galleryMode) === 'fixed'
                ? 'Images display at 300px wide, maintaining aspect ratio'
                : 'Images fill container width, never exceed original height'}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Columns</label>
            <select
              value={(component.settings.columns as number) || 3}
              onChange={(e) => updateSetting('columns', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            >
              <option value={2}>2 Columns</option>
              <option value={3}>3 Columns</option>
              <option value={4}>4 Columns</option>
            </select>
          </div>
        </>
      )}

      {/* Widget settings */}
      {component.type === 'widget' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Widget Type</label>
          <select
            value={(component.settings.widgetType as string) || 'search'}
            onChange={(e) => updateSetting('widgetType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
          >
            <option value="search">Search Bar</option>
            <option value="newsletter">Newsletter Signup</option>
            <option value="contact-form">Contact Form</option>
          </select>
        </div>
      )}

      {/* UI Component type */}
      {component.type === 'ui-component' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Display Type</label>
          <select
            value={(component.settings.componentType as string) || 'card'}
            onChange={(e) => updateSetting('componentType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
          >
            <option value="card">Card</option>
            <option value="stat">Stat / Counter</option>
            <option value="badge">Badge / Tag</option>
          </select>
        </div>
      )}

      {/* Media aspect ratio */}
      {component.type === 'media' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Aspect Ratio</label>
          <select
            value={(component.settings.aspectRatio as string) || '16/9'}
            onChange={(e) => updateSetting('aspectRatio', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
          >
            <option value="16/9">16:9</option>
            <option value="4/3">4:3</option>
            <option value="1/1">1:1</option>
            <option value="auto">Auto</option>
          </select>
        </div>
      )}

      {/* Header menu settings */}
      {component.type === 'header' && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Logo Text</label>
            <input
              type="text"
              value={(component.settings.logoText as string) || 'R66SLOT'}
              onChange={(e) => updateSetting('logoText', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
            <p className="text-[10px] text-gray-400 mt-1 font-play">First 3 characters white, rest red</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Menu Items</label>
            <textarea
              value={(component.settings.menuItems as string) || ''}
              onChange={(e) => updateSetting('menuItems', e.target.value)}
              rows={3}
              placeholder="Products,Brands,About,Contact"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
            <p className="text-[10px] text-gray-400 mt-1 font-play">Comma-separated menu labels</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Menu Links</label>
            <textarea
              value={(component.settings.menuLinks as string) || ''}
              onChange={(e) => updateSetting('menuLinks', e.target.value)}
              rows={3}
              placeholder="/products,/brands,/about,/contact"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
            <p className="text-[10px] text-gray-400 mt-1 font-play">Comma-separated URLs (same order as items)</p>
          </div>
        </>
      )}

      {/* Generic info for types with no special settings */}
      {!['hero', 'divider', 'product-grid', 'gallery', 'section', 'content-block', 'ui-component', 'slot', 'widget', 'media', 'header', 'columns', 'two-column', 'three-column'].includes(component.type) && (
        <div className="text-xs text-gray-400 text-center py-4 font-play">
          No additional settings for this component type.
        </div>
      )}
    </>
  )
}
