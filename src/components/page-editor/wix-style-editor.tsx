'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { Page, PageComponent } from '@/lib/pages/schema'

interface WixStyleEditorProps {
  pageId: string
}

export function WixStyleEditor({ pageId }: WixStyleEditorProps) {
  const router = useRouter()
  const [page, setPage] = useState<Page | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [showAddPanel, setShowAddPanel] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Load page data
  useEffect(() => {
    const loadPage = async () => {
      try {
        const response = await fetch(`/api/admin/pages/${pageId}`)
        if (response.ok) {
          const data = await response.json()
          setPage(data)
        }
      } catch (error) {
        console.error('Error loading page:', error)
      }
    }
    loadPage()
  }, [pageId])

  const addComponent = (type: PageComponent['type']) => {
    if (!page) return

    const newComponent: PageComponent = {
      id: `comp-${Date.now()}`,
      type,
      content: getDefaultContent(type),
      styles: getDefaultStyles(type),
      settings: getDefaultSettings(type),
    }

    setPage({ ...page, components: [...page.components, newComponent] })
  }

  const updateComponent = (id: string, updates: Partial<PageComponent>) => {
    if (!page) return
    setPage({
      ...page,
      components: page.components.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })
  }

  const deleteComponent = (id: string) => {
    if (!page) return
    setPage({
      ...page,
      components: page.components.filter((c) => c.id !== id),
    })
    setSelectedId(null)
  }

  const duplicateComponent = (id: string) => {
    if (!page) return
    const comp = page.components.find((c) => c.id === id)
    if (!comp) return

    const duplicate = {
      ...comp,
      id: `comp-${Date.now()}`,
    }

    setPage({ ...page, components: [...page.components, duplicate] })
  }

  const handleSave = async (publish: boolean = false) => {
    if (!page) return
    setIsSaving(true)

    try {
      const response = await fetch(`/api/admin/pages/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...page, published: publish }),
      })

      if (response.ok) {
        alert(publish ? 'Page published!' : 'Draft saved!')
      }
    } catch (error) {
      alert('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  if (!page) return <div className="p-8">Loading...</div>

  const selected = page.components.find((c) => c.id === selectedId)

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col">
      {/* TOP TOOLBAR - Wix Style */}
      <div className="h-14 bg-white border-b flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/pages')}
          >
            ← Exit
          </Button>
          <div className="text-sm font-medium">{page.title}</div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={isSaving}>
            Save
          </Button>
          <Button size="sm" onClick={() => handleSave(true)} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
            Publish
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL - Add Elements */}
        <div className="w-64 bg-white border-r overflow-y-auto">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-lg">Add Elements</h2>
          </div>

          {/* Text */}
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold mb-3 text-gray-600">TEXT</h3>
            <div className="space-y-2">
              <button
                onClick={() => addComponent('heading')}
                className="w-full text-left p-3 rounded hover:bg-gray-100 border"
              >
                <div className="font-semibold text-sm">Heading</div>
                <div className="text-xs text-gray-500">Add a title</div>
              </button>
              <button
                onClick={() => addComponent('text')}
                className="w-full text-left p-3 rounded hover:bg-gray-100 border"
              >
                <div className="font-semibold text-sm">Text</div>
                <div className="text-xs text-gray-500">Add a paragraph</div>
              </button>
            </div>
          </div>

          {/* Media */}
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold mb-3 text-gray-600">MEDIA</h3>
            <div className="space-y-2">
              <button
                onClick={() => addComponent('image')}
                className="w-full text-left p-3 rounded hover:bg-gray-100 border"
              >
                <div className="font-semibold text-sm">Image</div>
                <div className="text-xs text-gray-500">Add a picture</div>
              </button>
              <button
                onClick={() => addComponent('video')}
                className="w-full text-left p-3 rounded hover:bg-gray-100 border"
              >
                <div className="font-semibold text-sm">Video</div>
                <div className="text-xs text-gray-500">Embed video</div>
              </button>
              <button
                onClick={() => addComponent('gallery')}
                className="w-full text-left p-3 rounded hover:bg-gray-100 border"
              >
                <div className="font-semibold text-sm">Gallery</div>
                <div className="text-xs text-gray-500">Image grid</div>
              </button>
            </div>
          </div>

          {/* Button */}
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold mb-3 text-gray-600">BUTTON</h3>
            <button
              onClick={() => addComponent('button')}
              className="w-full text-left p-3 rounded hover:bg-gray-100 border"
            >
              <div className="font-semibold text-sm">Button</div>
              <div className="text-xs text-gray-500">Add a button</div>
            </button>
          </div>

          {/* Store */}
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold mb-3 text-gray-600">STORE</h3>
            <div className="space-y-2">
              <button
                onClick={() => addComponent('product-grid')}
                className="w-full text-left p-3 rounded hover:bg-gray-100 border"
              >
                <div className="font-semibold text-sm">Product Grid</div>
                <div className="text-xs text-gray-500">Show products</div>
              </button>
              <button
                onClick={() => addComponent('product-card')}
                className="w-full text-left p-3 rounded hover:bg-gray-100 border"
              >
                <div className="font-semibold text-sm">Product Card</div>
                <div className="text-xs text-gray-500">Single product</div>
              </button>
              <button
                onClick={() => addComponent('add-to-cart')}
                className="w-full text-left p-3 rounded hover:bg-gray-100 border"
              >
                <div className="font-semibold text-sm">Add to Cart</div>
                <div className="text-xs text-gray-500">Cart button</div>
              </button>
            </div>
          </div>

          {/* Layout */}
          <div className="p-4">
            <h3 className="text-sm font-semibold mb-3 text-gray-600">LAYOUT</h3>
            <div className="space-y-2">
              <button
                onClick={() => addComponent('section')}
                className="w-full text-left p-3 rounded hover:bg-gray-100 border"
              >
                <div className="font-semibold text-sm">Section</div>
                <div className="text-xs text-gray-500">Container box</div>
              </button>
              <button
                onClick={() => addComponent('two-column')}
                className="w-full text-left p-3 rounded hover:bg-gray-100 border"
              >
                <div className="font-semibold text-sm">2 Columns</div>
                <div className="text-xs text-gray-500">Split layout</div>
              </button>
              <button
                onClick={() => addComponent('spacer')}
                className="w-full text-left p-3 rounded hover:bg-gray-100 border"
              >
                <div className="font-semibold text-sm">Spacer</div>
                <div className="text-xs text-gray-500">Add spacing</div>
              </button>
            </div>
          </div>
        </div>

        {/* CENTER CANVAS - Visual Editor */}
        <div className="flex-1 overflow-auto bg-gray-100 p-8">
          <div className="max-w-5xl mx-auto bg-white shadow-lg min-h-screen">
            {page.components.length === 0 ? (
              <div className="p-20 text-center text-gray-400">
                <div className="text-6xl mb-4">+</div>
                <div className="text-lg">Click elements on the left to add to your page</div>
              </div>
            ) : (
              <div className="relative">
                {page.components.map((component) => (
                  <div
                    key={component.id}
                    className={`relative group ${
                      selectedId === component.id ? 'ring-2 ring-blue-500' : ''
                    } ${hoveredId === component.id ? 'ring-1 ring-blue-300' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedId(component.id)
                    }}
                    onMouseEnter={() => setHoveredId(component.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Element Toolbar - appears on hover/select */}
                    {(selectedId === component.id || hoveredId === component.id) && (
                      <div className="absolute -top-10 left-0 bg-blue-600 text-white px-2 py-1 rounded text-xs flex items-center gap-2 z-10">
                        <span className="font-medium">{component.type}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            duplicateComponent(component.id)
                          }}
                          className="hover:bg-blue-700 px-2 py-0.5 rounded"
                        >
                          Duplicate
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteComponent(component.id)
                          }}
                          className="hover:bg-red-600 px-2 py-0.5 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    )}

                    {/* Render Component */}
                    <ComponentPreview component={component} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL - Properties */}
        {selected && (
          <div className="w-80 bg-white border-l overflow-y-auto">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-lg capitalize">{selected.type}</h2>
            </div>

            <div className="p-4 space-y-4">
              {/* Content */}
              {!['image', 'spacer', 'section'].includes(selected.type) && (
                <div>
                  <label className="block text-sm font-medium mb-2">Content</label>
                  <textarea
                    value={selected.content}
                    onChange={(e) =>
                      updateComponent(selected.id, { content: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded"
                    rows={3}
                  />
                </div>
              )}

              {/* Background Color */}
              <div>
                <label className="block text-sm font-medium mb-2">Background</label>
                <input
                  type="color"
                  value={selected.styles.backgroundColor || '#ffffff'}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      styles: { ...selected.styles, backgroundColor: e.target.value },
                    })
                  }
                  className="w-full h-10 rounded border cursor-pointer"
                />
              </div>

              {/* Text Color */}
              {!['image', 'spacer', 'section'].includes(selected.type) && (
                <div>
                  <label className="block text-sm font-medium mb-2">Text Color</label>
                  <input
                    type="color"
                    value={selected.styles.textColor || '#000000'}
                    onChange={(e) =>
                      updateComponent(selected.id, {
                        styles: { ...selected.styles, textColor: e.target.value },
                      })
                    }
                    className="w-full h-10 rounded border cursor-pointer"
                  />
                </div>
              )}

              {/* Font Size */}
              {['heading', 'text', 'button'].includes(selected.type) && (
                <div>
                  <label className="block text-sm font-medium mb-2">Font Size</label>
                  <input
                    type="range"
                    min="12"
                    max="72"
                    value={parseInt(selected.styles.fontSize || '16')}
                    onChange={(e) =>
                      updateComponent(selected.id, {
                        styles: { ...selected.styles, fontSize: e.target.value + 'px' },
                      })
                    }
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {selected.styles.fontSize || '16px'}
                  </div>
                </div>
              )}

              {/* Padding */}
              <div>
                <label className="block text-sm font-medium mb-2">Padding</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={parseInt(selected.styles.padding || '20')}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      styles: { ...selected.styles, padding: e.target.value + 'px' },
                    })
                  }
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {selected.styles.padding || '20px'}
                </div>
              </div>

              {/* Image URL */}
              {selected.type === 'image' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Image URL</label>
                  <input
                    type="text"
                    value={selected.settings.imageUrl || ''}
                    onChange={(e) =>
                      updateComponent(selected.id, {
                        settings: { ...selected.settings, imageUrl: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border rounded"
                    placeholder="https://..."
                  />
                </div>
              )}

              {/* Button Link */}
              {selected.type === 'button' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Link URL</label>
                  <input
                    type="text"
                    value={selected.settings.link || ''}
                    onChange={(e) =>
                      updateComponent(selected.id, {
                        settings: { ...selected.settings, link: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border rounded"
                    placeholder="/products"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Component Preview Renderer
function ComponentPreview({ component }: { component: PageComponent }) {
  const style: React.CSSProperties = {
    backgroundColor: component.styles.backgroundColor,
    color: component.styles.textColor,
    fontSize: component.styles.fontSize,
    fontWeight: component.styles.fontWeight,
    padding: component.styles.padding,
    textAlign: component.styles.textAlign as any,
    borderRadius: component.styles.borderRadius,
  }

  switch (component.type) {
    case 'heading':
      return <h2 style={style}>{component.content}</h2>
    case 'text':
      return <p style={style}>{component.content}</p>
    case 'button':
      return (
        <div style={{ padding: component.styles.padding || '20px' }}>
          <button
            style={{
              ...style,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {component.content}
          </button>
        </div>
      )
    case 'image':
      return (
        <div style={style}>
          {component.settings.imageUrl ? (
            <img
              src={component.settings.imageUrl as string}
              alt=""
              style={{ width: '100%', height: 'auto' }}
            />
          ) : (
            <div className="bg-gray-200 p-12 text-center text-gray-400">
              No image selected
            </div>
          )}
        </div>
      )
    case 'spacer':
      return <div style={{ height: component.styles.height || '40px' }} />
    case 'section':
      return (
        <div style={style}>
          <div className="text-gray-400 text-center p-8">Section Container</div>
        </div>
      )
    case 'product-grid':
      return (
        <div style={style}>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="border rounded p-4 bg-white">
                <div className="bg-gray-200 aspect-square mb-2 rounded"></div>
                <div className="font-semibold">Product {i}</div>
                <div className="text-primary">$99.99</div>
              </div>
            ))}
          </div>
        </div>
      )
    default:
      return <div style={style}>{component.content}</div>
  }
}

function getDefaultContent(type: PageComponent['type']): string {
  switch (type) {
    case 'heading':
      return 'Heading Text'
    case 'text':
      return 'Your text here...'
    case 'button':
      return 'Click Me'
    default:
      return ''
  }
}

function getDefaultStyles(type: PageComponent['type']) {
  switch (type) {
    case 'heading':
      return { fontSize: '32px', fontWeight: 'bold', padding: '20px' }
    case 'text':
      return { fontSize: '16px', padding: '20px' }
    case 'button':
      return {
        backgroundColor: '#FFDD00',
        textColor: '#000000',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
      }
    case 'image':
      return { padding: '0px' }
    case 'product-grid':
      return { padding: '40px' }
    default:
      return { padding: '20px' }
  }
}

function getDefaultSettings(type: PageComponent['type']) {
  switch (type) {
    case 'button':
      return { link: '#' }
    case 'image':
      return { imageUrl: 'https://via.placeholder.com/600x400' }
    case 'product-grid':
      return { productCount: 6, showPrice: true, showAddToCart: true }
    default:
      return {}
  }
}
