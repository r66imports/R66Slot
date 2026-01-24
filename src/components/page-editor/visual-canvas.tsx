'use client'

import { useState, useRef, useEffect } from 'react'
import type { PageComponent } from '@/lib/pages/schema'

interface VisualCanvasProps {
  components: PageComponent[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onUpdate: (id: string, updates: Partial<PageComponent>) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onMove: (id: string, direction: 'up' | 'down') => void
  onReorder: (dragIndex: number, hoverIndex: number) => void
}

export function VisualCanvas({
  components,
  selectedId,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onMove,
  onReorder,
}: VisualCanvasProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Handle drop from component library
  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(null)

    const componentType = e.dataTransfer.getData('componentType')
    const componentIndex = e.dataTransfer.getData('componentIndex')

    if (componentType) {
      // Drop from library - handled by parent
      return
    }

    if (componentIndex) {
      // Reorder existing component
      const dragIndex = parseInt(componentIndex)
      if (dragIndex !== index) {
        onReorder(dragIndex, index)
      }
    }
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('componentIndex', index.toString())
    setIsDragging(true)
  }

  const handleDragEnd = () => {
    setDragOverIndex(null)
    setIsDragging(false)
  }

  // Inline text editing
  const handleDoubleClick = (component: PageComponent) => {
    if (component.type !== 'image' && component.type !== 'spacer' && component.type !== 'divider') {
      setEditingId(component.id)
    }
  }

  const handleContentBlur = (id: string, newContent: string) => {
    if (newContent !== components.find(c => c.id === id)?.content) {
      onUpdate(id, { content: newContent })
    }
    setEditingId(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-gray-100">
      <div className="max-w-4xl mx-auto bg-white shadow-lg min-h-screen">
        {components.length === 0 ? (
          <div className="p-24 text-center text-gray-400">
            <div className="text-6xl mb-4">👈</div>
            <p className="text-lg">
              Drag components from the left to build your page
            </p>
          </div>
        ) : (
          components.map((component, index) => (
            <div
              key={component.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              className={`
                relative group transition-all
                ${selectedId === component.id ? 'ring-2 ring-primary' : ''}
                ${dragOverIndex === index ? 'border-t-4 border-primary' : ''}
                ${isDragging ? 'cursor-move' : 'cursor-pointer'}
              `}
              onClick={() => onSelect(component.id)}
              onDoubleClick={() => handleDoubleClick(component)}
            >
              <ComponentRenderer
                component={component}
                isEditing={editingId === component.id}
                onContentChange={(content) => handleContentBlur(component.id, content)}
              />

              {/* Component Controls - Show on hover or selection */}
              {(selectedId === component.id || dragOverIndex === index) && (
                <div className="absolute top-2 right-2 flex gap-1 bg-white/95 rounded shadow-lg p-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onMove(component.id, 'up')
                    }}
                    disabled={index === 0}
                    className="px-2 py-1 bg-white border border-gray-300 rounded text-xs disabled:opacity-30 hover:bg-gray-50"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onMove(component.id, 'down')
                    }}
                    disabled={index === components.length - 1}
                    className="px-2 py-1 bg-white border border-gray-300 rounded text-xs disabled:opacity-30 hover:bg-gray-50"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <div className="w-px bg-gray-300 mx-1"></div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDuplicate(component.id)
                    }}
                    className="px-2 py-1 bg-primary text-black border border-gray-300 rounded text-xs hover:bg-primary/90"
                    title="Duplicate"
                  >
                    ⧉
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(component.id)
                    }}
                    className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Drag handle indicator */}
              <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-6 h-6 flex items-center justify-center text-gray-400 cursor-move">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="4" cy="4" r="1.5"/>
                    <circle cx="12" cy="4" r="1.5"/>
                    <circle cx="4" cy="8" r="1.5"/>
                    <circle cx="12" cy="8" r="1.5"/>
                    <circle cx="4" cy="12" r="1.5"/>
                    <circle cx="12" cy="12" r="1.5"/>
                  </svg>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
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
      // Select all text
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
      if (contentRef.current) {
        contentRef.current.blur()
      }
    }
    if (e.key === 'Escape') {
      if (contentRef.current) {
        contentRef.current.blur()
      }
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
      return <div style={style} className="bg-gray-100/50" />

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
        <div
          style={{
            ...style,
            gridTemplateColumns: '1fr 1fr',
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

    case 'three-column':
      return (
        <div
          style={{
            ...style,
            gridTemplateColumns: '1fr 1fr 1fr',
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
