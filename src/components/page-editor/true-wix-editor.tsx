'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { Page, PageComponent } from '@/lib/pages/schema'

interface TrueWixEditorProps {
  pageId: string
}

export function TrueWixEditor({ pageId }: TrueWixEditorProps) {
  const router = useRouter()
  const [page, setPage] = useState<Page | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const loadPage = async () => {
      try {
        const response = await fetch(`/api/admin/pages/${pageId}`)
        if (response.ok) {
          const data = await response.json()
          const componentsWithPosition = data.components.map((comp: PageComponent, index: number) => ({
            ...comp,
            positionMode: 'absolute',
            position: comp.position || {
              x: 50,
              y: 100 + (index * 150),
              width: 600,
              height: 100,
            },
          }))
          setPage({ ...data, components: componentsWithPosition })
        }
      } catch (error) {
        console.error('Error:', error)
      }
    }
    loadPage()
  }, [pageId])

  const addComponent = (type: PageComponent['type']) => {
    if (!page) return

    const newComponent: PageComponent = {
      id: `comp-${Date.now()}`,
      type,
      content: type === 'heading' ? 'Double-click to edit' : type === 'text' ? 'Double-click to edit text' : type === 'button' ? 'Button' : '',
      styles: type === 'heading' ? { fontSize: '32px', fontWeight: 'bold', textColor: '#000000', backgroundColor: 'transparent' } : type === 'text' ? { fontSize: '16px', textColor: '#000000', backgroundColor: 'transparent' } : type === 'button' ? { backgroundColor: '#FFDD00', textColor: '#000000', fontSize: '16px', fontWeight: '600' } : { backgroundColor: 'transparent' },
      settings: {},
      positionMode: 'absolute',
      position: {
        x: 100,
        y: 100,
        width: type === 'button' ? 200 : 400,
        height: type === 'heading' ? 60 : type === 'button' ? 50 : 100,
      },
    }

    setPage({ ...page, components: [...page.components, newComponent] })
    setSelectedId(newComponent.id)
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

  const deleteComponent = () => {
    if (!page || !selectedId) return
    setPage({
      ...page,
      components: page.components.filter((c) => c.id !== selectedId),
    })
    setSelectedId(null)
  }

  const handleMouseDown = (e: React.MouseEvent, componentId: string) => {
    e.stopPropagation()
    setSelectedId(componentId)
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedId || !page) return

    const component = page.components.find((c) => c.id === selectedId)
    if (!component || !component.position) return

    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y

    updateComponent(selectedId, {
      position: {
        ...component.position,
        x: component.position.x + deltaX,
        y: component.position.y + deltaY,
      },
    })

    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
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
        alert(publish ? 'Published!' : 'Saved!')
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
    <div className="fixed inset-0 bg-gray-900 flex flex-col">
      {/* TOP TOOLBAR */}
      <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/pages')} className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">← Exit</Button>
          <div className="text-white text-sm font-medium">{page.title}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={isSaving} className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">Save</Button>
          <Button size="sm" onClick={() => handleSave(true)} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">Publish</Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* LEFT TOOLBAR */}
        <div className="w-16 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 gap-4">
          <button onClick={() => addComponent('heading')} className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white text-xl font-bold" title="Add Heading">H</button>
          <button onClick={() => addComponent('text')} className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white text-sm" title="Add Text">T</button>
          <button onClick={() => addComponent('button')} className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white text-xs" title="Add Button">BTN</button>
          <button onClick={() => addComponent('image')} className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white text-2xl" title="Add Image">🖼️</button>
          <button onClick={() => addComponent('product-grid')} className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white text-2xl" title="Products">🛍️</button>
        </div>

        {/* CANVAS */}
        <div className="flex-1 bg-gray-600 overflow-auto relative" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onClick={() => setSelectedId(null)}>
          <div className="relative bg-white mx-auto my-8" style={{ width: '1200px', minHeight: '800px' }}>
            {page.components.map((c) => (
              <EditableElement key={c.id} component={c} isSelected={selectedId === c.id} onMouseDown={(e) => handleMouseDown(e, c.id)} onUpdate={(u) => updateComponent(c.id, u)} />
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        {selected && (
          <div className="w-64 bg-gray-800 border-l border-gray-700 overflow-y-auto p-4">
            <div className="text-white mb-4">
              <h3 className="font-semibold mb-4 capitalize">{selected.type}</h3>
              <Button onClick={deleteComponent} variant="outline" size="sm" className="w-full mb-4 bg-red-600 hover:bg-red-700 text-white border-red-500">Delete</Button>

              <div className="mb-4">
                <label className="block text-sm mb-2">Background</label>
                <input type="color" value={selected.styles.backgroundColor || '#ffffff'} onChange={(e) => updateComponent(selected.id, { styles: { ...selected.styles, backgroundColor: e.target.value } })} className="w-full h-10 rounded cursor-pointer" />
              </div>

              {!['image', 'product-grid'].includes(selected.type) && (
                <div className="mb-4">
                  <label className="block text-sm mb-2">Text Color</label>
                  <input type="color" value={selected.styles.textColor || '#000000'} onChange={(e) => updateComponent(selected.id, { styles: { ...selected.styles, textColor: e.target.value } })} className="w-full h-10 rounded cursor-pointer" />
                </div>
              )}

              {['heading', 'text', 'button'].includes(selected.type) && (
                <div className="mb-4">
                  <label className="block text-sm mb-2">Font Size: {selected.styles.fontSize || '16px'}</label>
                  <input type="range" min="12" max="72" value={parseInt(selected.styles.fontSize || '16')} onChange={(e) => updateComponent(selected.id, { styles: { ...selected.styles, fontSize: e.target.value + 'px' } })} className="w-full" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EditableElement({ component, isSelected, onMouseDown, onUpdate }: { component: PageComponent; isSelected: boolean; onMouseDown: (e: React.MouseEvent) => void; onUpdate: (updates: Partial<PageComponent>) => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setTimeout(() => contentRef.current?.focus(), 0)
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (contentRef.current) onUpdate({ content: contentRef.current.innerText })
  }

  const style: React.CSSProperties = {
    position: 'absolute',
    left: component.position?.x || 0,
    top: component.position?.y || 0,
    width: component.position?.width || 400,
    height: component.position?.height || 100,
    backgroundColor: component.styles.backgroundColor,
    color: component.styles.textColor,
    fontSize: component.styles.fontSize,
    fontWeight: component.styles.fontWeight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px',
    cursor: 'grab',
    border: isSelected ? '2px solid #3B82F6' : '1px solid transparent',
  }

  return (
    <div style={style} onMouseDown={onMouseDown} onDoubleClick={handleDoubleClick}>
      {isSelected && (
        <>
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
        </>
      )}

      {['heading', 'text', 'button'].includes(component.type) && (
        <div ref={contentRef} contentEditable={isEditing} suppressContentEditableWarning onBlur={handleBlur} className="w-full outline-none text-center">
          {component.content}
        </div>
      )}

      {component.type === 'image' && (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">Image</div>
      )}

      {component.type === 'product-grid' && (
        <div className="w-full h-full grid grid-cols-3 gap-2 p-2">
          {[1,2,3,4,5,6].map(i => <div key={i} className="bg-gray-100 rounded aspect-square flex items-center justify-center text-2xl">🏎️</div>)}
        </div>
      )}
    </div>
  )
}
