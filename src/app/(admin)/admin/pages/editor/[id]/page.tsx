'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import type { Page, PageComponent } from '@/lib/pages/schema'
import { COMPONENT_LIBRARY } from '@/components/page-editor/component-library'
import { PAGE_TEMPLATES } from '@/components/page-editor/page-templates'
import { DraggableLibrary } from '@/components/page-editor/draggable-library'
import { VisualCanvas } from '@/components/page-editor/visual-canvas'

export default function PageEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [pageId, setPageId] = useState<string>('')
  const [page, setPage] = useState<Page | null>(null)
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showMediaManager, setShowMediaManager] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [history, setHistory] = useState<Page[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  useEffect(() => {
    const loadPage = async () => {
      const resolvedParams = await params
      setPageId(resolvedParams.id)

      try {
        const response = await fetch(`/api/admin/pages/${resolvedParams.id}`)
        if (response.ok) {
          const data = await response.json()
          setPage(data)
        }
      } catch (error) {
        console.error('Error loading page:', error)
      }
    }

    loadPage()
  }, [params])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [historyIndex, history])

  const addComponent = (type: PageComponent['type']) => {
    if (!page) return

    const template = COMPONENT_LIBRARY.find((c) => c.type === type)
    if (!template) return

    const newComponent: PageComponent = {
      id: `comp-${Date.now()}`,
      type,
      content: template.defaultProps.content || '',
      styles: template.defaultProps.styles || {},
      settings: template.defaultProps.settings || {},
      children: template.defaultProps.children || [],
    }

    const newPage = {
      ...page,
      components: [...page.components, newComponent],
    }

    setPage(newPage)
    saveToHistory(newPage)
  }

  const updateComponent = (id: string, updates: Partial<PageComponent>) => {
    if (!page) return

    const newPage = {
      ...page,
      components: page.components.map((comp) =>
        comp.id === id ? { ...comp, ...updates } : comp
      ),
    }

    setPage(newPage)
    // Don't save every keystroke to history, debounce it
  }

  const deleteComponent = (id: string) => {
    if (!page) return

    const newPage = {
      ...page,
      components: page.components.filter((comp) => comp.id !== id),
    }

    setPage(newPage)
    saveToHistory(newPage)
    setSelectedComponent(null)
  }

  const moveComponent = (id: string, direction: 'up' | 'down') => {
    if (!page) return

    const index = page.components.findIndex((c) => c.id === id)
    if (index === -1) return

    const newComponents = [...page.components]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= newComponents.length) return

    ;[newComponents[index], newComponents[targetIndex]] = [
      newComponents[targetIndex],
      newComponents[index],
    ]

    const newPage = { ...page, components: newComponents }
    setPage(newPage)
    saveToHistory(newPage)
  }

  const duplicateComponent = (id: string) => {
    if (!page) return

    const component = page.components.find((c) => c.id === id)
    if (!component) return

    const duplicated: PageComponent = {
      ...component,
      id: `comp-${Date.now()}`,
      children: component.children?.map((child) => ({
        ...child,
        id: `comp-${Date.now()}-${Math.random()}`,
      })),
    }

    const index = page.components.findIndex((c) => c.id === id)
    const newComponents = [...page.components]
    newComponents.splice(index + 1, 0, duplicated)

    const newPage = { ...page, components: newComponents }
    setPage(newPage)
    saveToHistory(newPage)
    setSelectedComponent(duplicated.id)
  }

  // History management
  const saveToHistory = (newPage: Page) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(JSON.parse(JSON.stringify(newPage)))

    // Keep only last 50 states
    if (newHistory.length > 50) {
      newHistory.shift()
    }

    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setPage(JSON.parse(JSON.stringify(history[historyIndex - 1])))
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setPage(JSON.parse(JSON.stringify(history[historyIndex + 1])))
    }
  }

  // Save initial state to history when page loads
  useEffect(() => {
    if (page && history.length === 0) {
      saveToHistory(page)
    }
  }, [page?.id])

  // Add template components
  const addTemplate = (templateId: string) => {
    if (!page) return

    const template = PAGE_TEMPLATES.find((t) => t.id === templateId)
    if (!template) return

    const newComponents = template.components.map((comp) => ({
      ...comp,
      id: `comp-${Date.now()}-${Math.random()}`,
      children: comp.children?.map((child) => ({
        ...child,
        id: `comp-${Date.now()}-${Math.random()}`,
      })),
    }))

    const newPage = {
      ...page,
      components: [...page.components, ...newComponents],
    }

    setPage(newPage)
    saveToHistory(newPage)
    setShowTemplates(false)
  }

  const handleSave = async (publish: boolean = false) => {
    if (!page) return

    setIsSaving(true)

    try {
      const response = await fetch(`/api/admin/pages/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...page,
          published: publish,
        }),
      })

      if (response.ok) {
        alert('Page saved successfully!')
        if (publish) {
          const updated = await response.json()
          setPage(updated)
        }
      } else {
        alert('Failed to save page')
      }
    } catch (error) {
      console.error('Error saving page:', error)
      alert('Failed to save page')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUploadImage = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        return data.url
      }
    } catch (error) {
      console.error('Error uploading image:', error)
    }

    return null
  }

  if (!page) {
    return <div className="p-8">Loading...</div>
  }

  const selected = page.components.find((c) => c.id === selectedComponent)

  // Handle drag and reorder
  const handleReorder = (dragIndex: number, hoverIndex: number) => {
    if (!page) return

    const newComponents = [...page.components]
    const [removed] = newComponents.splice(dragIndex, 1)
    newComponents.splice(hoverIndex, 0, removed)

    const newPage = { ...page, components: newComponents }
    setPage(newPage)
    saveToHistory(newPage)
  }

  return (
    <div className="fixed inset-0 bg-gray-100 flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/pages')}
          >
            ← Back
          </Button>
          <div>
            <Input
              value={page.title}
              onChange={(e) => setPage({ ...page, title: e.target.value })}
              className="font-semibold text-lg border-0 px-2 focus:ring-2 focus:ring-primary rounded"
              placeholder="Page Title"
            />
            <Input
              value={page.slug}
              onChange={(e) => setPage({ ...page, slug: e.target.value })}
              className="text-sm text-gray-600 border-0 px-2 focus:ring-2 focus:ring-primary rounded"
              placeholder="page-slug"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Undo (Ctrl+Z)"
          >
            ↶ Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Redo (Ctrl+Y)"
          >
            ↷ Redo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplates(true)}
          >
            📋 Templates
          </Button>
          <div className="border-l border-gray-300 mx-2"></div>
          <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
            💾 Save Draft
          </Button>
          <Button onClick={() => handleSave(true)} disabled={isSaving} size="lg" className="bg-primary text-black hover:bg-primary/90">
            {page.published ? '✓ Update & Publish' : '🚀 Publish'}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Component Library - Left Sidebar */}
        <DraggableLibrary onAddComponent={addComponent} />

        {/* Canvas - Center */}
        <VisualCanvas
          components={page.components}
          selectedId={selectedComponent}
          onSelect={setSelectedComponent}
          onUpdate={updateComponent}
          onDelete={deleteComponent}
          onDuplicate={duplicateComponent}
          onMove={moveComponent}
          onReorder={handleReorder}
        />

        {/* Properties Panel - Right Sidebar */}
        {selected && (
          <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto p-4">
            <h3 className="font-semibold mb-4">Properties</h3>

            {/* Content */}
            {selected.type !== 'image' && selected.type !== 'spacer' && selected.type !== 'section' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Content</label>
                <textarea
                  value={selected.content}
                  onChange={(e) =>
                    updateComponent(selected.id, { content: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                />
              </div>
            )}

            {/* Image URL */}
            {selected.type === 'image' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Image URL</label>
                <Input
                  value={selected.settings.imageUrl || ''}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      settings: { ...selected.settings, imageUrl: e.target.value },
                    })
                  }
                />
                <label className="block mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const url = await handleUploadImage(file)
                        if (url) {
                          updateComponent(selected.id, {
                            settings: { ...selected.settings, imageUrl: url },
                          })
                        }
                      }
                    }}
                  />
                  <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                    <span>Upload New Image</span>
                  </Button>
                </label>
              </div>
            )}

            {/* Link (for buttons) */}
            {selected.type === 'button' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Link URL</label>
                <Input
                  value={selected.settings.link || ''}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      settings: { ...selected.settings, link: e.target.value },
                    })
                  }
                  placeholder="/products"
                />
              </div>
            )}

            {/* Video URL */}
            {selected.type === 'video' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Video URL (YouTube/Vimeo Embed)</label>
                <Input
                  value={selected.settings.videoUrl || ''}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      settings: { ...selected.settings, videoUrl: e.target.value },
                    })
                  }
                  placeholder="https://www.youtube.com/embed/..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use embed URLs from YouTube or Vimeo
                </p>
              </div>
            )}

            {/* Icon Selection */}
            {selected.type === 'icon-text' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Icon</label>
                <Input
                  value={selected.settings.icon || ''}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      settings: { ...selected.settings, icon: e.target.value },
                    })
                  }
                  placeholder="⭐"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {['⭐', '✅', '🎯', '💡', '🚀', '⚡', '🔥', '💎', '🎨', '📱', '🌟', '✨'].map((icon) => (
                    <button
                      key={icon}
                      onClick={() =>
                        updateComponent(selected.id, {
                          settings: { ...selected.settings, icon },
                        })
                      }
                      className="w-10 h-10 border rounded hover:bg-gray-100 text-xl"
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Column Count */}
            {(selected.type === 'gallery' || selected.type === 'two-column' || selected.type === 'three-column') && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Number of Columns</label>
                <Input
                  type="number"
                  min="1"
                  max="6"
                  value={selected.settings.columns || 2}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      settings: { ...selected.settings, columns: parseInt(e.target.value) },
                    })
                  }
                />
              </div>
            )}

            {/* Background Image (for hero) */}
            {selected.type === 'hero' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Background Image URL</label>
                <Input
                  value={selected.styles.backgroundImage?.replace('url(', '').replace(')', '') || ''}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      styles: {
                        ...selected.styles,
                        backgroundImage: e.target.value ? `url(${e.target.value})` : '',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      },
                    })
                  }
                  placeholder="https://..."
                />
              </div>
            )}

            {/* Styles */}
            <h4 className="font-semibold mb-2 mt-6">Styles</h4>

            {/* Background Color */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Background Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={selected.styles.backgroundColor || '#ffffff'}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      styles: { ...selected.styles, backgroundColor: e.target.value },
                    })
                  }
                  className="w-12 h-10 rounded border"
                />
                <Input
                  value={selected.styles.backgroundColor || ''}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      styles: { ...selected.styles, backgroundColor: e.target.value },
                    })
                  }
                  placeholder="#ffffff"
                />
              </div>
            </div>

            {/* Text Color */}
            {selected.type !== 'image' && selected.type !== 'spacer' && (
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Text Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={selected.styles.textColor || '#000000'}
                    onChange={(e) =>
                      updateComponent(selected.id, {
                        styles: { ...selected.styles, textColor: e.target.value },
                      })
                    }
                    className="w-12 h-10 rounded border"
                  />
                  <Input
                    value={selected.styles.textColor || ''}
                    onChange={(e) =>
                      updateComponent(selected.id, {
                        styles: { ...selected.styles, textColor: e.target.value },
                      })
                    }
                    placeholder="#000000"
                  />
                </div>
              </div>
            )}

            {/* Font Size */}
            {selected.type !== 'image' && selected.type !== 'spacer' && (
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Font Size</label>
                <Input
                  value={selected.styles.fontSize || ''}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      styles: { ...selected.styles, fontSize: e.target.value },
                    })
                  }
                  placeholder="16px"
                />
              </div>
            )}

            {/* Padding */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Padding</label>
              <Input
                value={selected.styles.padding || ''}
                onChange={(e) =>
                  updateComponent(selected.id, {
                    styles: { ...selected.styles, padding: e.target.value },
                  })
                }
                placeholder="20px or 10px 20px"
              />
              <div className="grid grid-cols-4 gap-2 mt-2">
                <Input
                  value={selected.styles.paddingTop || ''}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      styles: { ...selected.styles, paddingTop: e.target.value },
                    })
                  }
                  placeholder="Top"
                  className="text-xs"
                />
                <Input
                  value={selected.styles.paddingRight || ''}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      styles: { ...selected.styles, paddingRight: e.target.value },
                    })
                  }
                  placeholder="Right"
                  className="text-xs"
                />
                <Input
                  value={selected.styles.paddingBottom || ''}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      styles: { ...selected.styles, paddingBottom: e.target.value },
                    })
                  }
                  placeholder="Bottom"
                  className="text-xs"
                />
                <Input
                  value={selected.styles.paddingLeft || ''}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      styles: { ...selected.styles, paddingLeft: e.target.value },
                    })
                  }
                  placeholder="Left"
                  className="text-xs"
                />
              </div>
            </div>

            {/* Margin */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Margin</label>
              <Input
                value={selected.styles.margin || ''}
                onChange={(e) =>
                  updateComponent(selected.id, {
                    styles: { ...selected.styles, margin: e.target.value },
                  })
                }
                placeholder="20px or 10px 20px"
              />
              <div className="grid grid-cols-4 gap-2 mt-2">
                <Input
                  value={selected.styles.marginTop || ''}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      styles: { ...selected.styles, marginTop: e.target.value },
                    })
                  }
                  placeholder="Top"
                  className="text-xs"
                />
                <Input
                  value={selected.styles.marginRight || ''}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      styles: { ...selected.styles, marginRight: e.target.value },
                    })
                  }
                  placeholder="Right"
                  className="text-xs"
                />
                <Input
                  value={selected.styles.marginBottom || ''}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      styles: { ...selected.styles, marginBottom: e.target.value },
                    })
                  }
                  placeholder="Bottom"
                  className="text-xs"
                />
                <Input
                  value={selected.styles.marginLeft || ''}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      styles: { ...selected.styles, marginLeft: e.target.value },
                    })
                  }
                  placeholder="Left"
                  className="text-xs"
                />
              </div>
            </div>

            {/* Text Align */}
            {selected.type !== 'image' && selected.type !== 'spacer' && (
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Text Align</label>
                <select
                  value={selected.styles.textAlign || 'left'}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      styles: { ...selected.styles, textAlign: e.target.value as 'left' | 'center' | 'right' },
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            )}

            {/* Border Radius */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Border Radius</label>
              <Input
                value={selected.styles.borderRadius || ''}
                onChange={(e) =>
                  updateComponent(selected.id, {
                    styles: { ...selected.styles, borderRadius: e.target.value },
                  })
                }
                placeholder="8px"
              />
            </div>

            {/* Width Controls */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Width</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={selected.styles.width || ''}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      styles: { ...selected.styles, width: e.target.value },
                    })
                  }
                  placeholder="100%"
                />
                <Input
                  value={selected.styles.maxWidth || ''}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      styles: { ...selected.styles, maxWidth: e.target.value },
                    })
                  }
                  placeholder="Max width"
                />
              </div>
            </div>

            {/* Height Controls */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Height</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={selected.styles.height || ''}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      styles: { ...selected.styles, height: e.target.value },
                    })
                  }
                  placeholder="auto"
                />
                <Input
                  value={selected.styles.minHeight || ''}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      styles: { ...selected.styles, minHeight: e.target.value },
                    })
                  }
                  placeholder="Min height"
                />
              </div>
            </div>

            {/* Border Controls */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Border</label>
              <Input
                value={selected.styles.border || ''}
                onChange={(e) =>
                  updateComponent(selected.id, {
                    styles: { ...selected.styles, border: e.target.value },
                  })
                }
                placeholder="1px solid #000"
              />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Input
                  value={selected.styles.borderWidth || ''}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      styles: { ...selected.styles, borderWidth: e.target.value },
                    })
                  }
                  placeholder="Width"
                  className="text-xs"
                />
                <Input
                  value={selected.styles.borderColor || ''}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      styles: { ...selected.styles, borderColor: e.target.value },
                    })
                  }
                  placeholder="Color"
                  className="text-xs"
                />
              </div>
            </div>

            {/* Box Shadow */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Box Shadow</label>
              <select
                value={selected.styles.boxShadow || 'none'}
                onChange={(e) =>
                  updateComponent(selected.id, {
                    styles: { ...selected.styles, boxShadow: e.target.value === 'none' ? '' : e.target.value },
                  })
                }
                className="w-full px-3 py-2 border rounded-md mb-2"
              >
                <option value="none">None</option>
                <option value="0 1px 3px rgba(0,0,0,0.12)">Small</option>
                <option value="0 4px 6px rgba(0,0,0,0.1)">Medium</option>
                <option value="0 10px 20px rgba(0,0,0,0.15)">Large</option>
                <option value="0 20px 40px rgba(0,0,0,0.2)">Extra Large</option>
              </select>
              <Input
                value={selected.styles.boxShadow || ''}
                onChange={(e) =>
                  updateComponent(selected.id, {
                    styles: { ...selected.styles, boxShadow: e.target.value },
                  })
                }
                placeholder="Custom shadow"
                className="text-xs"
              />
            </div>

            {/* Layout Controls (for containers) */}
            {(selected.type === 'section' ||
              selected.type === 'two-column' ||
              selected.type === 'three-column' ||
              selected.type === 'gallery' ||
              selected.type === 'icon-text') && (
              <>
                <h4 className="font-semibold mb-2 mt-6">Layout</h4>

                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Display</label>
                  <select
                    value={selected.styles.display || 'block'}
                    onChange={(e) =>
                      updateComponent(selected.id, {
                        styles: { ...selected.styles, display: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="block">Block</option>
                    <option value="flex">Flex</option>
                    <option value="grid">Grid</option>
                    <option value="inline-block">Inline Block</option>
                  </select>
                </div>

                {selected.styles.display === 'flex' && (
                  <>
                    <div className="mb-3">
                      <label className="block text-sm font-medium mb-1">Flex Direction</label>
                      <select
                        value={selected.styles.flexDirection || 'row'}
                        onChange={(e) =>
                          updateComponent(selected.id, {
                            styles: { ...selected.styles, flexDirection: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="row">Row</option>
                        <option value="column">Column</option>
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="block text-sm font-medium mb-1">Justify Content</label>
                      <select
                        value={selected.styles.justifyContent || 'flex-start'}
                        onChange={(e) =>
                          updateComponent(selected.id, {
                            styles: { ...selected.styles, justifyContent: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="flex-start">Start</option>
                        <option value="center">Center</option>
                        <option value="flex-end">End</option>
                        <option value="space-between">Space Between</option>
                        <option value="space-around">Space Around</option>
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="block text-sm font-medium mb-1">Align Items</label>
                      <select
                        value={selected.styles.alignItems || 'flex-start'}
                        onChange={(e) =>
                          updateComponent(selected.id, {
                            styles: { ...selected.styles, alignItems: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="flex-start">Start</option>
                        <option value="center">Center</option>
                        <option value="flex-end">End</option>
                        <option value="stretch">Stretch</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Gap</label>
                  <Input
                    value={selected.styles.gap || ''}
                    onChange={(e) =>
                      updateComponent(selected.id, {
                        styles: { ...selected.styles, gap: e.target.value },
                      })
                    }
                    placeholder="16px"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowTemplates(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Page Templates</h2>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-gray-500 hover:text-black text-2xl"
              >
                ✕
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              Choose a pre-built section template to add to your page
            </p>

            {/* Hero Templates */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Hero Sections</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PAGE_TEMPLATES.filter((t) => t.category === 'hero').map((template) => (
                  <button
                    key={template.id}
                    onClick={() => addTemplate(template.id)}
                    className="text-left p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-gray-50 transition-all"
                  >
                    <div className="text-3xl mb-2">{template.icon}</div>
                    <h4 className="font-semibold mb-1">{template.name}</h4>
                    <p className="text-sm text-gray-600">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Feature Templates */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PAGE_TEMPLATES.filter((t) => t.category === 'features').map((template) => (
                  <button
                    key={template.id}
                    onClick={() => addTemplate(template.id)}
                    className="text-left p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-gray-50 transition-all"
                  >
                    <div className="text-3xl mb-2">{template.icon}</div>
                    <h4 className="font-semibold mb-1">{template.name}</h4>
                    <p className="text-sm text-gray-600">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Templates */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Content Sections</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PAGE_TEMPLATES.filter((t) => t.category === 'content').map((template) => (
                  <button
                    key={template.id}
                    onClick={() => addTemplate(template.id)}
                    className="text-left p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-gray-50 transition-all"
                  >
                    <div className="text-3xl mb-2">{template.icon}</div>
                    <h4 className="font-semibold mb-1">{template.name}</h4>
                    <p className="text-sm text-gray-600">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* CTA Templates */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Call to Action</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PAGE_TEMPLATES.filter((t) => t.category === 'cta').map((template) => (
                  <button
                    key={template.id}
                    onClick={() => addTemplate(template.id)}
                    className="text-left p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-gray-50 transition-all"
                  >
                    <div className="text-3xl mb-2">{template.icon}</div>
                    <h4 className="font-semibold mb-1">{template.name}</h4>
                    <p className="text-sm text-gray-600">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

