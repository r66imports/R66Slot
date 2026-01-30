'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { PageComponent } from '@/lib/pages/schema'
import { usePageEditor } from '@/contexts/PageEditorContext'
import { RenderedComponent } from './rendered-component'
import { EditorPropertiesPanel } from './editor-properties-panel'
import { PageSettingsPanel } from './page-settings-panel'
import { TemplateChooser } from './template-chooser'
import { ResizableBox } from '@/components/editor/ResizableBox'
import Draggable, { type DraggableData, type DraggableEvent } from 'react-draggable'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface TrueWixEditorProps {
  pageId: string
}

// ─── Component library items ───
const COMPONENT_LIBRARY = [
  { type: 'hero' as const, label: 'Hero Banner', icon: '🖼️', desc: 'Full-width hero with image' },
  { type: 'text' as const, label: 'Text Block', icon: '📝', desc: 'Rich text content' },
  { type: 'image' as const, label: 'Image', icon: '🏞️', desc: 'Single image' },
  { type: 'button' as const, label: 'Button', icon: '🔘', desc: 'Call to action' },
  { type: 'gallery' as const, label: 'Image Gallery', icon: '🖼️', desc: 'Grid of images' },
  { type: 'three-column' as const, label: '3 Columns', icon: '▥', desc: 'Three column layout' },
  { type: 'two-column' as const, label: '2 Columns', icon: '▤', desc: 'Two column layout' },
  { type: 'video' as const, label: 'Video', icon: '🎬', desc: 'Embedded video' },
  { type: 'divider' as const, label: 'Divider', icon: '─', desc: 'Horizontal line' },
  { type: 'product-grid' as const, label: 'Product Grid', icon: '🛍️', desc: 'Product listing' },
  { type: 'featured-product' as const, label: 'Featured Product', icon: '⭐', desc: 'Showcase product' },
  { type: 'quote' as const, label: 'Quote', icon: '❝', desc: 'Blockquote text' },
  { type: 'section' as const, label: 'Section', icon: '📐', desc: 'Page section container' },
  { type: 'content-block' as const, label: 'Content Block', icon: '📄', desc: 'Text & image block' },
  { type: 'ui-component' as const, label: 'UI Component', icon: '🧩', desc: 'Reusable UI element' },
  { type: 'slot' as const, label: 'Slot', icon: '🔲', desc: 'Placeholder insertion point' },
  { type: 'widget' as const, label: 'Widget', icon: '⚙️', desc: 'Interactive module' },
  { type: 'media' as const, label: 'Media', icon: '🎨', desc: 'Image/video media block' },
]

export function TrueWixEditor({ pageId }: TrueWixEditorProps) {
  const router = useRouter()
  const {
    page,
    selectedComponentId,
    setSelectedComponentId,
    addComponent,
    updateComponent,
    deleteComponent,
    duplicateComponent,
    moveComponent,
    reorderComponents,
    updatePageSettings,
    undo,
    redo,
    canUndo,
    canRedo,
    savePage,
    loadPage,
    isSaving,
    loadError,
    selectedComponent,
  } = usePageEditor()

  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [showTemplateChooser, setShowTemplateChooser] = useState(false)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [showPageSettings, setShowPageSettings] = useState(false)

  // Load page on mount
  useEffect(() => {
    loadPage(pageId)
  }, [pageId, loadPage])

  // ─── Keyboard Shortcuts ───
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey

      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (isMod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      } else if (isMod && e.key === 's') {
        e.preventDefault()
        handleSave(false)
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedComponentId) {
        const active = document.activeElement
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) {
          return
        }
        e.preventDefault()
        deleteComponent(selectedComponentId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, selectedComponentId, deleteComponent])

  // ─── DnD Sensors ───
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null)
    const { active, over } = event
    if (!over || active.id === over.id || !page) return

    const oldIndex = page.components.findIndex(c => c.id === active.id)
    const newIndex = page.components.findIndex(c => c.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderComponents(oldIndex, newIndex)
    }
  }, [page, reorderComponents])

  const handleSave = async (publish: boolean) => {
    const success = await savePage(publish)
    if (success) {
      alert(publish ? 'Published!' : 'Saved!')
    } else {
      alert('Failed to save')
    }
  }

  if (!page) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center">
          {loadError ? (
            <>
              <div className="text-5xl mb-4">⚠️</div>
              <p className="text-red-600 font-play font-semibold mb-2">Failed to load page</p>
              <p className="text-gray-500 font-play text-sm mb-4 max-w-md">{loadError}</p>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPage(pageId)}
                >
                  Retry
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/admin/pages')}
                >
                  Back to Pages
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-500 font-play">Loading editor...</p>
            </>
          )}
        </div>
      </div>
    )
  }

  const canvasWidth = viewMode === 'desktop' ? '100%' : viewMode === 'tablet' ? '768px' : '375px'
  const draggedComponent = activeDragId ? page.components.find(c => c.id === activeDragId) : null
  const flowComponents = page.components.filter(c => c.positionMode !== 'absolute')
  const absoluteComponents = page.components.filter(c => c.positionMode === 'absolute')
  const ps = page.pageSettings || {}

  // Page background style
  const pageBackgroundStyle: React.CSSProperties = {
    backgroundColor: ps.backgroundColor || '#ffffff',
    position: 'relative' as const,
  }

  return (
    <div className="fixed inset-0 bg-gray-100 flex flex-col font-play">
      {/* ─── TOP TOOLBAR ─── */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm z-50">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/pages')}
            className="text-gray-600 hover:text-gray-900"
          >
            &larr; Back
          </Button>
          <div className="h-6 w-px bg-gray-200" />
          <h1 className="text-sm font-semibold text-gray-900 font-play">{page.title}</h1>
        </div>

        {/* Center: View Mode + Undo/Redo */}
        <div className="flex items-center gap-3">
          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
              title="Undo (Ctrl+Z)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a4 4 0 014 4v0a4 4 0 01-4 4H3m0-8l4-4m-4 4l4 4" />
              </svg>
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
              title="Redo (Ctrl+Y)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a4 4 0 00-4 4v0a4 4 0 004 4h10m0-8l-4-4m4 4l-4 4" />
              </svg>
            </button>
          </div>

          <div className="h-6 w-px bg-gray-200" />

          {/* View Mode */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(['desktop', 'tablet', 'mobile'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {mode === 'desktop' ? '🖥️' : mode === 'tablet' ? '📱' : '📲'} {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-gray-200" />

          {/* Page Settings */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShowPageSettings(true); setSelectedComponentId(null) }}
            className={showPageSettings ? 'bg-indigo-50 text-indigo-600 border-indigo-300' : 'text-gray-600'}
          >
            Page BG
          </Button>

          {/* Templates */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplateChooser(true)}
            className="text-gray-600"
          >
            Templates
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="font-play"
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            size="sm"
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 text-white font-play"
          >
            Publish
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ─── LEFT SIDEBAR: Component Library ─── */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-play">Components</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {COMPONENT_LIBRARY.map((item) => (
              <button
                key={item.type}
                onClick={() => addComponent(item.type)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-gray-50 transition-colors group"
              >
                <span className="text-lg flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-50">
                  {item.icon}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900 font-play">{item.label}</p>
                  <p className="text-xs text-gray-400 font-play">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ─── CANVAS: Live Preview ─── */}
        <div
          className="flex-1 overflow-y-auto bg-gray-100 p-6"
          onClick={() => { setSelectedComponentId(null); setShowPageSettings(false) }}
        >
          <div
            className="mx-auto shadow-lg transition-all duration-300 min-h-screen overflow-hidden"
            style={{ maxWidth: canvasWidth, ...pageBackgroundStyle }}
          >
            {/* Page background image layer */}
            {ps.backgroundImage && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `url("${ps.backgroundImage}")`,
                  backgroundSize: ps.fullWidth ? 'cover' : (ps.backgroundSize || 'cover'),
                  backgroundPosition: ps.backgroundPosition || 'center',
                  backgroundRepeat: 'no-repeat',
                  opacity: typeof ps.backgroundOpacity === 'number' ? ps.backgroundOpacity : 1,
                  zIndex: 0,
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Content layer */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              {page.components.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                  <div className="text-5xl mb-4">🖼️</div>
                  <p className="text-lg font-medium font-play">Start building your page</p>
                  <p className="text-sm font-play mt-1">Click a component from the left panel to add it</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowTemplateChooser(true) }}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-play font-medium transition-colors"
                  >
                    Start from Template
                  </button>
                </div>
              ) : (
                <>
                  {/* Flow components (sortable) */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={flowComponents.map(c => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {flowComponents.map((component) => (
                        <SortableLiveComponent
                          key={component.id}
                          component={component}
                          isSelected={selectedComponentId === component.id}
                          onSelect={() => { setSelectedComponentId(component.id); setShowPageSettings(false) }}
                          onUpdateSettings={(key, value) => {
                            updateComponent(component.id, {
                              settings: { ...component.settings, [key]: value }
                            })
                          }}
                        />
                      ))}
                    </SortableContext>
                    <DragOverlay>
                      {draggedComponent ? (
                        <div className="opacity-80 shadow-2xl rounded-lg overflow-hidden">
                          <RenderedComponent component={draggedComponent} />
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>

                  {/* Absolute/freeform components (draggable + resizable) */}
                  {absoluteComponents.map((component) => (
                    <FreeformComponent
                      key={component.id}
                      component={component}
                      isSelected={selectedComponentId === component.id}
                      onSelect={() => { setSelectedComponentId(component.id); setShowPageSettings(false) }}
                      onUpdatePosition={(x, y) => {
                        updateComponent(component.id, {
                          position: {
                            x,
                            y,
                            width: component.position?.width || 300,
                            height: component.position?.height || 200,
                            zIndex: component.position?.zIndex || 10,
                          }
                        })
                      }}
                      onUpdateSize={(w, h) => {
                        updateComponent(component.id, {
                          position: {
                            x: component.position?.x || 50,
                            y: component.position?.y || 50,
                            width: w,
                            height: h,
                            zIndex: component.position?.zIndex || 10,
                          }
                        })
                      }}
                      onUpdateSettings={(key, value) => {
                        updateComponent(component.id, {
                          settings: { ...component.settings, [key]: value }
                        })
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANEL: Properties / Page Settings ─── */}
        {showPageSettings ? (
          <PageSettingsPanel
            pageSettings={page.pageSettings || {}}
            onUpdate={updatePageSettings}
            onClose={() => setShowPageSettings(false)}
          />
        ) : selectedComponent ? (
          <EditorPropertiesPanel
            component={selectedComponent}
            onUpdate={(updates) => updateComponent(selectedComponent.id, updates)}
            onDelete={() => deleteComponent(selectedComponent.id)}
            onDuplicate={() => duplicateComponent(selectedComponent.id)}
            onMoveUp={() => moveComponent(selectedComponent.id, 'up')}
            onMoveDown={() => moveComponent(selectedComponent.id, 'down')}
            onClose={() => setSelectedComponentId(null)}
          />
        ) : (
          <div className="w-72 bg-white border-l border-gray-200 flex flex-col items-center justify-center text-gray-400 p-6">
            <div className="text-4xl mb-3">👆</div>
            <p className="text-sm font-medium font-play text-center">Click a component on the page to edit its properties</p>
            <button
              onClick={(e) => { e.stopPropagation(); setShowPageSettings(true) }}
              className="mt-4 px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs rounded-lg font-play font-medium hover:bg-indigo-100 transition-colors"
            >
              Edit Page Background
            </button>
          </div>
        )}
      </div>

      {/* Template Chooser Modal */}
      <TemplateChooserWrapper
        open={showTemplateChooser}
        onClose={() => setShowTemplateChooser(false)}
      />
    </div>
  )
}

// ─── Template Chooser Wrapper (uses context) ───
function TemplateChooserWrapper({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setPage, page } = usePageEditor()

  const handleSelect = (components: PageComponent[]) => {
    if (!page) return
    setPage({ ...page, components })
  }

  return (
    <TemplateChooser
      open={open}
      onClose={onClose}
      onSelect={handleSelect}
    />
  )
}

// ─── Sortable Live Component (flow mode) ───
function SortableLiveComponent({
  component,
  isSelected,
  onSelect,
  onUpdateSettings,
}: {
  component: PageComponent
  isSelected: boolean
  onSelect: () => void
  onUpdateSettings?: (key: string, value: any) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: component.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative' as const,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Selection outline + toolbar */}
      <div
        className={`relative cursor-pointer transition-all ${
          isSelected
            ? 'ring-2 ring-blue-500 ring-offset-0'
            : 'hover:ring-2 hover:ring-blue-200 hover:ring-offset-0'
        }`}
        onClick={(e) => { e.stopPropagation(); onSelect() }}
      >
        {/* Component label on hover / select */}
        <div className={`absolute -top-7 left-0 z-30 flex items-center gap-1 transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded font-play font-medium capitalize">
            {component.type.replace(/-/g, ' ')}
          </span>
          <span
            className="bg-gray-600 text-white text-xs px-1.5 py-0.5 rounded cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            ⋮⋮
          </span>
        </div>

        {/* Actual rendered component */}
        <RenderedComponent component={component} isEditing={true} onUpdateSettings={onUpdateSettings} />
      </div>
    </div>
  )
}

// ─── Freeform (absolute) Component with Resize ───
function FreeformComponent({
  component,
  isSelected,
  onSelect,
  onUpdatePosition,
  onUpdateSize,
  onUpdateSettings,
}: {
  component: PageComponent
  isSelected: boolean
  onSelect: () => void
  onUpdatePosition: (x: number, y: number) => void
  onUpdateSize: (w: number, h: number) => void
  onUpdateSettings?: (key: string, value: any) => void
}) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const pos = component.position || { x: 50, y: 50, width: 300, height: 200, zIndex: 10 }
  const [liveWidth, setLiveWidth] = useState(pos.width)
  const [liveHeight, setLiveHeight] = useState(pos.height)
  const isResizingRef = useRef(false)

  // Sync live dimensions when component position changes externally
  useEffect(() => {
    if (!isResizingRef.current) {
      setLiveWidth(pos.width)
      setLiveHeight(pos.height)
    }
  }, [pos.width, pos.height])

  const handleStop = useCallback((_e: DraggableEvent, data: DraggableData) => {
    if (!isResizingRef.current) {
      onUpdatePosition(data.x, data.y)
    }
  }, [onUpdatePosition])

  return (
    <Draggable
      nodeRef={nodeRef as React.RefObject<HTMLElement>}
      position={{ x: pos.x, y: pos.y }}
      onStop={handleStop}
      disabled={isResizingRef.current}
    >
      <div
        ref={nodeRef}
        style={{
          position: 'absolute',
          zIndex: pos.zIndex || 10,
          cursor: isResizingRef.current ? 'default' : 'grab',
          top: 0,
          left: 0,
        }}
        className="group"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onSelect() }}
      >
        {/* Label */}
        <div className={`absolute -top-7 left-0 z-30 flex items-center gap-1 transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded font-play font-medium capitalize">
            {component.type.replace(/-/g, ' ')} (freeform)
          </span>
        </div>

        <ResizableBox
          width={liveWidth}
          height={liveHeight}
          isSelected={isSelected}
          minWidth={60}
          minHeight={30}
          snapGrid={4}
          onResizeStart={() => {
            isResizingRef.current = true
          }}
          onResize={(w, h) => {
            setLiveWidth(w)
            setLiveHeight(h)
          }}
          onResizeEnd={(w, h) => {
            isResizingRef.current = false
            onUpdateSize(w, h)
          }}
        >
          <div
            className={`w-full h-full transition-all ${
              isSelected
                ? 'ring-2 ring-purple-500 ring-offset-1'
                : 'hover:ring-2 hover:ring-purple-300 hover:ring-offset-1'
            }`}
            style={{ overflow: 'hidden' }}
          >
            <RenderedComponent component={component} isEditing={true} onUpdateSettings={onUpdateSettings} />
          </div>
        </ResizableBox>
      </div>
    </Draggable>
  )
}
