'use client'

import { useState, useRef, useEffect } from 'react'
import Draggable from 'react-draggable'
import { Resizable } from 'react-resizable'
import type { PageComponent } from '@/lib/pages/schema'
import { usePageEditor } from '@/contexts/PageEditorContext'
import 'react-resizable/css/styles.css'

interface ResizableDraggableProps {
  component: PageComponent
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onDuplicate: () => void
  children: React.ReactNode
}

export function ResizableDraggable({
  component,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  children,
}: ResizableDraggableProps) {
  const { updateComponent } = usePageEditor()
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const nodeRef = useRef<HTMLDivElement>(null)

  const position = component.position || { x: 0, y: 0, width: 400, height: 200, zIndex: 1 }

  const handleDragStart = () => {
    setIsDragging(true)
  }

  const handleDrag = (e: any, data: any) => {
    updateComponent(component.id, {
      position: {
        ...position,
        x: data.x,
        y: data.y,
      },
    })
  }

  const handleDragStop = () => {
    setIsDragging(false)
  }

  const handleResizeStart = () => {
    setIsResizing(true)
  }

  const handleResize = (e: any, { size }: any) => {
    updateComponent(component.id, {
      position: {
        ...position,
        width: size.width,
        height: size.height,
      },
    })
  }

  const handleResizeStop = () => {
    setIsResizing(false)
  }

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: position.x, y: position.y }}
      onStart={handleDragStart}
      onDrag={handleDrag}
      onStop={handleDragStop}
      handle=".drag-handle"
      bounds="parent"
      disabled={!isSelected}
    >
      <div
        ref={nodeRef}
        style={{
          position: 'absolute',
          zIndex: position.zIndex || 1,
          cursor: isDragging ? 'grabbing' : 'default',
        }}
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      >
        <Resizable
          width={position.width}
          height={position.height}
          onResizeStart={handleResizeStart}
          onResize={handleResize}
          onResizeStop={handleResizeStop}
          resizeHandles={isSelected ? ['se', 'sw', 'ne', 'nw', 'e', 'w', 'n', 's'] : []}
          draggableOpts={{ disabled: true }}
        >
          <div
            className={`
              relative
              ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
              ${isDragging || isResizing ? 'opacity-80' : ''}
              transition-opacity
            `}
            style={{
              width: `${position.width}px`,
              height: `${position.height}px`,
              overflow: 'hidden',
            }}
          >
            {/* Component Content */}
            <div className="w-full h-full overflow-auto">
              {children}
            </div>

            {/* Drag Handle (only visible when selected) */}
            {isSelected && (
              <div
                className="drag-handle absolute top-0 left-0 right-0 h-8 bg-primary/10 backdrop-blur-sm cursor-grab active:cursor-grabbing flex items-center justify-center gap-2 border-b border-primary/20"
                style={{ zIndex: 10 }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-primary">
                  <circle cx="4" cy="4" r="1.5"/>
                  <circle cx="12" cy="4" r="1.5"/>
                  <circle cx="4" cy="8" r="1.5"/>
                  <circle cx="12" cy="8" r="1.5"/>
                  <circle cx="4" cy="12" r="1.5"/>
                  <circle cx="12" cy="12" r="1.5"/>
                </svg>
                <span className="text-xs font-medium text-primary">
                  {position.width} × {position.height}
                </span>
              </div>
            )}

            {/* Control Buttons (only visible when selected) */}
            {isSelected && (
              <div className="absolute top-2 right-2 flex gap-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-1 z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    updateComponent(component.id, {
                      position: {
                        ...position,
                        zIndex: (position.zIndex || 1) + 1,
                      },
                    })
                  }}
                  className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
                  title="Bring Forward"
                >
                  ↑ Layer
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    updateComponent(component.id, {
                      position: {
                        ...position,
                        zIndex: Math.max(1, (position.zIndex || 1) - 1),
                      },
                    })
                  }}
                  className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
                  title="Send Backward"
                >
                  ↓ Layer
                </button>
                <div className="w-px bg-gray-300 mx-1"></div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDuplicate()
                  }}
                  className="px-2 py-1 bg-primary text-black border border-primary rounded text-xs font-medium hover:bg-primary/90 transition-colors"
                  title="Duplicate"
                >
                  ⧉
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Delete this component?')) {
                      onDelete()
                    }
                  }}
                  className="px-2 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute -left-1 top-0 bottom-0 w-1 bg-primary rounded-full pointer-events-none"></div>
            )}
          </div>
        </Resizable>
      </div>
    </Draggable>
  )
}
