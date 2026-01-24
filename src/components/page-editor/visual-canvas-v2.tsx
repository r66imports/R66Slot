'use client'

import { useState, useRef, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
  DragOverEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { PageComponent } from '@/lib/pages/schema'
import { usePageEditor } from '@/contexts/PageEditorContext'
import { ResizableDraggable } from './resizable-draggable'

interface VisualCanvasProps {
  components: PageComponent[]
}

export function VisualCanvas({ components }: VisualCanvasProps) {
  const {
    selectedComponentId,
    setSelectedComponentId,
    updateComponent,
    deleteComponent,
    duplicateComponent,
    moveComponent,
    reorderComponents,
    addComponent,
  } = usePageEditor()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before dragging starts (allows clicking)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event

    // Check if dragging a new component from library
    if (active.data.current?.isNew && over) {
      // Find the index where we're hovering
      if (over.id === 'canvas-dropzone') {
        setOverIndex(components.length) // Add to end
      } else {
        const overIdx = components.findIndex(c => c.id === over.id)
        if (overIdx !== -1) {
          setOverIndex(overIdx)
        }
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverIndex(null)

    if (!over) return

    // Check if this is a new component from the library
    if (active.data.current?.isNew) {
      const componentType = active.data.current.type as PageComponent['type']

      // Determine insertion index
      let insertIndex: number | undefined
      if (over.id === 'canvas-dropzone') {
        insertIndex = components.length
      } else {
        insertIndex = components.findIndex(c => c.id === over.id)
        if (insertIndex !== -1) {
          // Insert before the component we're over
          insertIndex = Math.max(0, insertIndex)
        }
      }

      addComponent(componentType, insertIndex)
    } else if (active.id !== over.id) {
      // Reorder existing components
      const oldIndex = components.findIndex(c => c.id === active.id)
      const newIndex = components.findIndex(c => c.id === over.id)
      reorderComponents(oldIndex, newIndex)
    }
  }

  const handleDoubleClick = (component: PageComponent) => {
    if (component.type !== 'image' && component.type !== 'spacer' && component.type !== 'divider') {
      setEditingId(component.id)
    }
  }

  const handleContentBlur = (id: string, newContent: string) => {
    const component = components.find(c => c.id === id)
    if (component && newContent !== component.content) {
      updateComponent(id, { content: newContent })
    }
    setEditingId(null)
  }

  const activeComponent = components.find(c => c.id === activeId)

  // Separate components by position mode
  const flowComponents = components.filter(c => c.positionMode !== 'absolute')
  const absoluteComponents = components.filter(c => c.positionMode === 'absolute')

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <CanvasDropZone components={components}>
        {/* Absolute Positioned Components Layer */}
        {absoluteComponents.map((component) => (
          <ResizableDraggable
            key={component.id}
            component={component}
            isSelected={selectedComponentId === component.id}
            onSelect={() => setSelectedComponentId(component.id)}
            onDelete={() => deleteComponent(component.id)}
            onDuplicate={() => duplicateComponent(component.id)}
          >
            <ComponentRenderer
              component={component}
              isEditing={editingId === component.id}
              onContentChange={(content) => handleContentBlur(component.id, content)}
            />
          </ResizableDraggable>
        ))}

        {/* Flow Layout Components */}
        {flowComponents.length === 0 && absoluteComponents.length === 0 ? (
          <div className="p-24 text-center text-gray-400">
            <div className="text-6xl mb-4">👈</div>
            <p className="text-lg font-medium mb-2">
              Drag components from the left to build your page
            </p>
            <p className="text-sm">
              Or click a component to add it instantly
            </p>
          </div>
        ) : flowComponents.length > 0 ? (
          <SortableContext items={flowComponents.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {flowComponents.map((component, index) => (
              <SortableComponentItem
                key={component.id}
                component={component}
                index={index}
                isSelected={selectedComponentId === component.id}
                isEditing={editingId === component.id}
                totalComponents={flowComponents.length}
                onSelect={() => setSelectedComponentId(component.id)}
                onDoubleClick={() => handleDoubleClick(component)}
                onDelete={() => deleteComponent(component.id)}
                onDuplicate={() => duplicateComponent(component.id)}
                onMove={moveComponent}
                onContentBlur={handleContentBlur}
              />
            ))}
          </SortableContext>
        ) : null}
      </CanvasDropZone>

      <DragOverlay>
        {activeComponent ? (
          <div className="bg-white shadow-2xl border-2 border-primary rounded-lg p-4 opacity-90">
            <ComponentRenderer component={activeComponent} isEditing={false} onContentChange={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// Droppable canvas wrapper
function CanvasDropZone({
  children,
  components,
}: {
  children: React.ReactNode
  components: PageComponent[]
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-dropzone',
  })

  const hasAbsoluteComponents = components.some(c => c.positionMode === 'absolute')

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-gray-100">
      <div
        ref={setNodeRef}
        className={`
          max-w-4xl mx-auto bg-white shadow-lg min-h-screen transition-all
          ${hasAbsoluteComponents ? 'relative' : ''}
          ${isOver && components.length === 0 ? 'ring-4 ring-primary ring-opacity-50 bg-primary/5' : ''}
        `}
        style={{
          minHeight: hasAbsoluteComponents ? '2000px' : '100vh',
        }}
      >
        {children}
      </div>
    </div>
  )
}

interface SortableComponentItemProps {
  component: PageComponent
  index: number
  isSelected: boolean
  isEditing: boolean
  totalComponents: number
  onSelect: () => void
  onDoubleClick: () => void
  onDelete: () => void
  onDuplicate: () => void
  onMove: (id: string, direction: 'up' | 'down') => void
  onContentBlur: (id: string, content: string) => void
}

function SortableComponentItem({
  component,
  index,
  isSelected,
  isEditing,
  totalComponents,
  onSelect,
  onDoubleClick,
  onDelete,
  onDuplicate,
  onMove,
  onContentBlur,
}: SortableComponentItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: component.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative group transition-all
        ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
        ${isDragging ? 'z-50' : ''}
      `}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
    >
      <ComponentRenderer
        component={component}
        isEditing={isEditing}
        onContentChange={(content) => onContentBlur(component.id, content)}
      />

      {/* Component Controls */}
      {isSelected && (
        <div className="absolute top-2 right-2 flex gap-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-1 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMove(component.id, 'up')
            }}
            disabled={index === 0}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 transition-colors"
            title="Move up (Ctrl+↑)"
          >
            ↑
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMove(component.id, 'down')
            }}
            disabled={index === totalComponents - 1}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-400 transition-colors"
            title="Move down (Ctrl+↓)"
          >
            ↓
          </button>
          <div className="w-px bg-gray-300 mx-1"></div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDuplicate()
            }}
            className="px-3 py-1.5 bg-primary text-black border border-primary rounded text-xs font-medium hover:bg-primary/90 transition-colors"
            title="Duplicate (Ctrl+D)"
          >
            ⧉ Duplicate
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm('Delete this component?')) {
                onDelete()
              }
            }}
            className="px-3 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors"
            title="Delete (Del)"
          >
            ✕ Delete
          </button>
        </div>
      )}

      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-white/90 backdrop-blur-sm p-2 rounded shadow-md"
        title="Drag to reorder"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-gray-600">
          <circle cx="4" cy="4" r="1.5"/>
          <circle cx="12" cy="4" r="1.5"/>
          <circle cx="4" cy="8" r="1.5"/>
          <circle cx="12" cy="8" r="1.5"/>
          <circle cx="4" cy="12" r="1.5"/>
          <circle cx="12" cy="12" r="1.5"/>
        </svg>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -left-1 top-0 bottom-0 w-1 bg-primary rounded-full"></div>
      )}
    </div>
  )
}

// Component Renderer with inline editing support
function ComponentRenderer({
  component,
  isEditing,
  onContentChange,
}: {
  component: PageComponent
  isEditing: boolean
  onContentChange: (content: string) => void
}) {
  const contentRef = useRef<any>(null)

  useEffect(() => {
    if (isEditing && contentRef.current) {
      contentRef.current.focus()
      const range = document.createRange()
      range.selectNodeContents(contentRef.current)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }, [isEditing])

  const style: React.CSSProperties = {
    backgroundColor: component.styles.backgroundColor,
    color: component.styles.textColor,
    fontSize: component.styles.fontSize,
    fontWeight: component.styles.fontWeight as any,
    padding: component.styles.padding,
    paddingTop: component.styles.paddingTop,
    paddingRight: component.styles.paddingRight,
    paddingBottom: component.styles.paddingBottom,
    paddingLeft: component.styles.paddingLeft,
    margin: component.styles.margin,
    marginTop: component.styles.marginTop,
    marginRight: component.styles.marginRight,
    marginBottom: component.styles.marginBottom,
    marginLeft: component.styles.marginLeft,
    textAlign: component.styles.textAlign as any,
    borderRadius: component.styles.borderRadius,
    width: component.styles.width,
    maxWidth: component.styles.maxWidth,
    height: component.styles.height,
    minHeight: component.styles.minHeight,
    border: component.styles.border,
    borderColor: component.styles.borderColor,
    borderWidth: component.styles.borderWidth,
    boxShadow: component.styles.boxShadow,
    display: component.styles.display as any,
    flexDirection: component.styles.flexDirection as any,
    justifyContent: component.styles.justifyContent,
    alignItems: component.styles.alignItems,
    gap: component.styles.gap,
    backgroundImage: component.styles.backgroundImage,
    backgroundSize: component.styles.backgroundSize,
    backgroundPosition: component.styles.backgroundPosition,
  }

  const handleBlur = () => {
    if (contentRef.current) {
      onContentChange(contentRef.current.innerText)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && component.type !== 'text') {
      e.preventDefault()
      contentRef.current?.blur()
    }
    if (e.key === 'Escape') {
      contentRef.current?.blur()
    }
  }

  switch (component.type) {
    case 'heading':
      return isEditing ? (
        <h1
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          style={style}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="outline-none"
        >
          {component.content}
        </h1>
      ) : (
        <h1 style={style}>{component.content}</h1>
      )

    case 'text':
      return isEditing ? (
        <p
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          style={style}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="outline-none"
        >
          {component.content}
        </p>
      ) : (
        <p style={style}>{component.content}</p>
      )

    case 'button':
      return (
        <div style={{ padding: component.styles.padding || '10px' }}>
          {isEditing ? (
            <button
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              style={style}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="outline-none"
            >
              {component.content}
            </button>
          ) : (
            <button style={style}>{component.content}</button>
          )}
        </div>
      )

    case 'image':
      return (
        <img
          src={component.settings.imageUrl || ''}
          alt={component.settings.alt || ''}
          style={style}
          className="max-w-full"
        />
      )

    case 'section':
      return (
        <div style={style}>
          {component.children?.map((child) => (
            <ComponentRenderer
              key={child.id}
              component={child}
              isEditing={false}
              onContentChange={() => {}}
            />
          ))}
        </div>
      )

    case 'spacer':
      return (
        <div style={style} className="bg-gray-100/50">
          <div className="text-center text-xs text-gray-400 py-2">Spacer</div>
        </div>
      )

    case 'hero':
      return (
        <div style={style}>
          {isEditing ? (
            <h1
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              style={{ margin: 0 }}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="outline-none"
            >
              {component.content}
            </h1>
          ) : (
            <h1 style={{ margin: 0 }}>{component.content}</h1>
          )}
        </div>
      )

    case 'two-column':
      return (
        <div style={{ ...style, gridTemplateColumns: '1fr 1fr' }}>
          {component.children?.map((child) => (
            <ComponentRenderer
              key={child.id}
              component={child}
              isEditing={false}
              onContentChange={() => {}}
            />
          ))}
        </div>
      )

    case 'three-column':
      return (
        <div style={{ ...style, gridTemplateColumns: '1fr 1fr 1fr' }}>
          {component.children?.map((child) => (
            <ComponentRenderer
              key={child.id}
              component={child}
              isEditing={false}
              onContentChange={() => {}}
            />
          ))}
        </div>
      )

    case 'card':
      return isEditing ? (
        <div
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          style={style}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="outline-none"
        >
          {component.content}
        </div>
      ) : (
        <div style={style}>{component.content}</div>
      )

    case 'video':
      return (
        <iframe
          src={component.settings.videoUrl || ''}
          style={style}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )

    case 'divider':
      return <hr style={style} />

    case 'quote':
      return isEditing ? (
        <blockquote
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          style={style}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="outline-none"
        >
          {component.content}
        </blockquote>
      ) : (
        <blockquote style={style}>{component.content}</blockquote>
      )

    case 'icon-text':
      return (
        <div style={style}>
          <span style={{ fontSize: '24px' }}>{component.settings.icon}</span>
          {isEditing ? (
            <span
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="outline-none"
            >
              {component.content}
            </span>
          ) : (
            <span>{component.content}</span>
          )}
        </div>
      )

    case 'gallery':
      return (
        <div
          style={{
            ...style,
            gridTemplateColumns: `repeat(${component.settings.columns || 3}, 1fr)`,
          }}
        >
          {component.children?.map((child) => (
            <ComponentRenderer
              key={child.id}
              component={child}
              isEditing={false}
              onContentChange={() => {}}
            />
          ))}
        </div>
      )

    default:
      return isEditing ? (
        <div
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          style={style}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="outline-none"
        >
          {component.content}
        </div>
      ) : (
        <div style={style}>{component.content}</div>
      )
  }
}
