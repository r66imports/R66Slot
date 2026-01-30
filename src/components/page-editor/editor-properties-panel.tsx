'use client'

import { useState, useRef, useCallback } from 'react'
import type { PageComponent } from '@/lib/pages/schema'

interface EditorPropertiesPanelProps {
  component: PageComponent
  onUpdate: (updates: Partial<PageComponent>) => void
  onDelete: () => void
  onDuplicate: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onClose: () => void
}

type TabId = 'content' | 'style' | 'settings'

export function EditorPropertiesPanel({
  component,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onClose,
}: EditorPropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('content')

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
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
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
          <ContentTab component={component} onUpdate={onUpdate} updateSetting={updateSetting} />
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
              onClick={() => onChange('')}
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
          className="w-full border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg p-6 text-center transition-colors mb-2 group/upload"
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <span className="text-xs text-gray-500 font-play">Uploading...</span>
            </div>
          ) : (
            <>
              <div className="text-3xl mb-1 text-gray-300 group-hover/upload:text-blue-400 transition-colors">+</div>
              <p className="text-xs text-gray-400 font-play">Click to upload image</p>
            </>
          )}
        </button>
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

  const execCommand = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val)
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const handleInput = useCallback(() => {
    if (editorRef.current) {
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

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        dangerouslySetInnerHTML={{ __html: value }}
        className="w-full px-3 py-2 border border-gray-200 rounded-b-lg text-sm font-play focus:ring-1 focus:ring-blue-400 focus:outline-none overflow-y-auto prose prose-sm max-w-none"
        style={{ minHeight: rows ? `${rows * 24}px` : '72px', maxHeight: '200px' }}
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

// ─── Content Tab ───
function ContentTab({
  component,
  onUpdate,
  updateSetting,
}: {
  component: PageComponent
  onUpdate: (updates: Partial<PageComponent>) => void
  updateSetting: (key: string, value: any) => void
}) {
  return (
    <>
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
          {/* Layout Mode Toggle */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Layout Mode</label>
            <div className="flex gap-1">
              <button
                onClick={() => updateSetting('heroLayout', 'flow')}
                className={`flex-1 py-2 text-xs rounded-lg font-play font-medium transition-colors ${
                  (component.settings.heroLayout || 'flow') === 'flow'
                    ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                Flow
              </button>
              <button
                onClick={() => updateSetting('heroLayout', 'freeform')}
                className={`flex-1 py-2 text-xs rounded-lg font-play font-medium transition-colors ${
                  component.settings.heroLayout === 'freeform'
                    ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                Freeform
              </button>
            </div>
            {component.settings.heroLayout === 'freeform' && (
              <p className="text-[10px] text-purple-500 mt-1 font-play">Drag elements freely on the canvas</p>
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
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Alt Text</label>
            <input
              type="text"
              value={(component.settings.alt as string) || ''}
              onChange={(e) => updateSetting('alt', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
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

      {/* Button Link */}
      {component.type === 'button' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Link URL</label>
          <input
            type="text"
            value={(component.settings.link as string) || ''}
            onChange={(e) => updateSetting('link', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
          />
        </div>
      )}

      {/* Gallery - Visual Image Grid */}
      {component.type === 'gallery' && (
        <VisualGalleryEditor component={component} onUpdate={onUpdate} />
      )}

      {/* Column Content - Visual Editors */}
      {(component.type === 'two-column' || component.type === 'three-column') && (
        <VisualColumnEditor component={component} onUpdate={onUpdate} />
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
            index={idx}
            total={children.length}
            onChangeUrl={(url) => updateImageUrl(idx, url)}
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
  index,
  total,
  onChangeUrl,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  imageUrl: string
  index: number
  total: number
  onChangeUrl: (url: string) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
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
  )
}

// ─── Visual Column Editor ───
function VisualColumnEditor({
  component,
  onUpdate,
}: {
  component: PageComponent
  onUpdate: (updates: Partial<PageComponent>) => void
}) {
  const children = component.children || []

  const updateChildContent = (index: number, content: string) => {
    const updated = children.map((child, i) =>
      i === index ? { ...child, content } : child
    )
    onUpdate({ children: updated })
  }

  const updateChildIcon = (index: number, icon: string) => {
    const updated = children.map((child, i) =>
      i === index ? { ...child, settings: { ...child.settings, icon } } : child
    )
    onUpdate({ children: updated })
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
  return (
    <>
      {/* ─── Layout Mode (all components) ─── */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5 font-play">Layout Mode</label>
        <div className="flex gap-1">
          <button
            onClick={() => onUpdate({ positionMode: 'flow' })}
            className={`flex-1 py-2 text-xs rounded-lg font-play font-medium transition-colors ${
              (component.positionMode || 'flow') === 'flow'
                ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            Flow
          </button>
          <button
            onClick={() => onUpdate({
              positionMode: 'absolute',
              position: component.position || { x: 50, y: 50, width: 300, height: 200, zIndex: 10 },
            })}
            className={`flex-1 py-2 text-xs rounded-lg font-play font-medium transition-colors ${
              component.positionMode === 'absolute'
                ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            Freeform
          </button>
        </div>
        {component.positionMode === 'absolute' && (
          <p className="text-[10px] text-purple-500 mt-1 font-play">Drag this component freely on the canvas</p>
        )}
      </div>

      {/* Freeform position controls */}
      {component.positionMode === 'absolute' && component.position && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-play">Position</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 font-play">X</label>
              <input
                type="number"
                value={Math.round(component.position.x)}
                onChange={(e) => onUpdate({ position: { ...component.position!, x: parseInt(e.target.value) || 0 } })}
                className="w-full px-2 py-1 border border-gray-200 rounded text-xs font-play"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-play">Y</label>
              <input
                type="number"
                value={Math.round(component.position.y)}
                onChange={(e) => onUpdate({ position: { ...component.position!, y: parseInt(e.target.value) || 0 } })}
                className="w-full px-2 py-1 border border-gray-200 rounded text-xs font-play"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-play">Z-Index</label>
              <input
                type="number"
                value={component.position.zIndex || 10}
                onChange={(e) => onUpdate({ position: { ...component.position!, zIndex: parseInt(e.target.value) || 10 } })}
                className="w-full px-2 py-1 border border-gray-200 rounded text-xs font-play"
              />
            </div>
          </div>
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
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 font-play">Product Count</label>
            <input
              type="number"
              value={(component.settings.productCount as number) || 8}
              onChange={(e) => updateSetting('productCount', parseInt(e.target.value) || 8)}
              min={1}
              max={24}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            />
          </div>
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
            <label className="text-xs text-gray-600 font-play">Show Add to Cart</label>
          </div>
        </>
      )}

      {/* Gallery columns */}
      {component.type === 'gallery' && (
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
      )}

      {/* Generic info for types with no special settings */}
      {!['hero', 'divider', 'product-grid', 'gallery'].includes(component.type) && (
        <div className="text-xs text-gray-400 text-center py-4 font-play">
          No additional settings for this component type.
        </div>
      )}
    </>
  )
}
