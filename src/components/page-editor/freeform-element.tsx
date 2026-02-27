'use client'

import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import type { PageComponent } from '@/lib/pages/schema'
import { RenderedComponent } from './rendered-component'
import {
  DESIGN_CANVAS,
  type Breakpoint,
  type NormalizedPosition,
  type ResponsivePositionData,
  type SectionBounds,
  getPositionForBreakpoint,
  pixelsToNormalized,
  normalizedToPixels,
  applyDragDelta,
  applyResizeDelta,
  snapToPercentageGrid,
  calculateZoomScale,
} from '@/lib/editor/responsive-positioning'
import {
  getEffectivePosition,
  hasNormalizedPosition,
  migrateComponentPosition,
  createDefaultNormalizedPosition,
} from '@/lib/editor/position-migration'

// ─── Types ───

interface FreeformElementProps {
  component: PageComponent
  breakpoint: Breakpoint
  isSelected: boolean
  snapEnabled?: boolean
  gridPercent?: number
  onSelect: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  onPositionChange: (normalizedPosition: ResponsivePositionData) => void
  onUpdateSettings?: (key: string, value: any) => void
}

const RESIZE_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const
type ResizeHandle = (typeof RESIZE_HANDLES)[number]

// ─── Freeform Element Component ───

/**
 * A freeform positioned element with percentage-based positioning.
 * Supports drag, resize, and per-breakpoint position storage.
 */
export function FreeformElement({
  component,
  breakpoint,
  isSelected,
  snapEnabled = true,
  gridPercent = 5,
  onSelect,
  onContextMenu,
  onPositionChange,
  onUpdateSettings,
}: FreeformElementProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 })
  const sectionBoundsRef = useRef<SectionBounds | null>(null)

  // Drag/resize state
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [startNormalized, setStartNormalized] = useState<NormalizedPosition | null>(null)

  // Get or migrate normalized position data
  const normalizedPositions = useMemo((): ResponsivePositionData => {
    if (hasNormalizedPosition(component)) {
      return component.normalizedPosition!
    }

    // Auto-migrate legacy positions
    const migrated = migrateComponentPosition(component)
    return migrated.normalizedPosition || {
      desktop: createDefaultNormalizedPosition(),
    }
  }, [component])

  // Get current position for breakpoint (with fallback)
  const currentPosition = useMemo(
    () => getPositionForBreakpoint(normalizedPositions, breakpoint),
    [normalizedPositions, breakpoint]
  )

  // Get container dimensions (considering zoom)
  const getContainerDimensions = useCallback(() => {
    const canvas = elementRef.current?.closest('.responsive-canvas, [data-canvas]')
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      const zoom = parseFloat(canvas.getAttribute('data-zoom') || '1')
      return {
        width: rect.width / zoom,
        height: rect.height / zoom,
      }
    }

    // Fallback to design canvas dimensions
    return DESIGN_CANVAS[breakpoint]
  }, [breakpoint])

  // Update container ref on mount and resize
  useEffect(() => {
    containerRef.current = getContainerDimensions()

    const handleResize = () => {
      containerRef.current = getContainerDimensions()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [getContainerDimensions])

  // ─── Determine if this is an image element (for high z-index layering) ───
  const isImageElement = useMemo(() => {
    return component.type === 'image' ||
           component.type === 'media' ||
           component.type === 'gallery' ||
           (component.settings as any)?.imageUrl ||
           (component.settings as any)?.backgroundImage
  }, [component])

  // ─── Position Styles (Percentage-based) ───
  // Images get z-index 1000+ to sit above static canvas elements
  const positionStyles = useMemo((): React.CSSProperties => ({
    position: 'absolute',
    left: `${currentPosition.xPercent}%`,
    top: `${currentPosition.yPercent}%`,
    width: `${currentPosition.widthPercent}%`,
    height: `${currentPosition.heightPercent}%`,
    // Images get high z-index (1000+), others use component z-index
    zIndex: isImageElement ? 1000 + (currentPosition.zIndex || 0) : currentPosition.zIndex,
    transform: currentPosition.rotation ? `rotate(${currentPosition.rotation}deg)` : undefined,
    transformOrigin: 'center center',
    cursor: isDragging ? 'grabbing' : isSelected ? 'grab' : 'pointer',
    userSelect: 'none',
    boxSizing: 'border-box',
  }), [currentPosition, isDragging, isSelected, isImageElement])

  // ─── Save Position ───
  const savePosition = useCallback((newPosition: NormalizedPosition) => {
    const updated: ResponsivePositionData = {
      ...normalizedPositions,
      [breakpoint]: newPosition,
    }
    onPositionChange(updated)
  }, [normalizedPositions, breakpoint, onPositionChange])

  // ─── Detect containing section bounds (as canvas %) ───
  const detectSectionBounds = useCallback((): SectionBounds | null => {
    if (!elementRef.current) return null
    const canvas = elementRef.current.closest('.responsive-canvas, [data-canvas]') as HTMLElement | null
    if (!canvas) return null

    const canvasRect = canvas.getBoundingClientRect()
    const zoom = parseFloat(canvas.getAttribute('data-zoom') || '1')
    const canvasW = canvasRect.width / zoom
    const canvasH = canvasRect.height / zoom

    const elemRect = elementRef.current.getBoundingClientRect()
    const cx = elemRect.left + elemRect.width / 2
    const cy = elemRect.top + elemRect.height / 2

    const sections = canvas.querySelectorAll('[data-section-container]')
    for (const sec of sections) {
      const r = sec.getBoundingClientRect()
      if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
        return {
          xMin: ((r.left - canvasRect.left) / zoom / canvasW) * 100,
          xMax: ((r.right - canvasRect.left) / zoom / canvasW) * 100,
          yMin: ((r.top - canvasRect.top) / zoom / canvasH) * 100,
          yMax: ((r.bottom - canvasRect.top) / zoom / canvasH) * 100,
        }
      }
    }
    return null
  }, [])

  // ─── Drag Handling ───
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!isSelected || isResizing) return
    e.preventDefault()
    e.stopPropagation()

    containerRef.current = getContainerDimensions()
    sectionBoundsRef.current = detectSectionBounds()
    setIsDragging(true)
    setStartPos({ x: e.clientX, y: e.clientY })
    setStartNormalized({ ...currentPosition })
  }, [isSelected, isResizing, currentPosition, getContainerDimensions, detectSectionBounds])

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !startNormalized) return

    const { width, height } = containerRef.current
    const canvas = elementRef.current?.closest('.responsive-canvas, [data-canvas]')
    const zoom = canvas ? parseFloat(canvas.getAttribute('data-zoom') || '1') : 1

    const deltaX = (e.clientX - startPos.x) / zoom
    const deltaY = (e.clientY - startPos.y) / zoom

    let newPosition = applyDragDelta(startNormalized, deltaX, deltaY, width, height, sectionBoundsRef.current)

    if (snapEnabled) {
      newPosition = snapToPercentageGrid(newPosition, gridPercent)
    }

    savePosition(newPosition)
  }, [isDragging, startNormalized, startPos, snapEnabled, gridPercent, savePosition])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
    setStartNormalized(null)
  }, [])

  // ─── Resize Handling ───
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    e.preventDefault()
    e.stopPropagation()

    containerRef.current = getContainerDimensions()
    sectionBoundsRef.current = detectSectionBounds()
    setIsResizing(true)
    setActiveHandle(handle)
    setStartPos({ x: e.clientX, y: e.clientY })
    setStartNormalized({ ...currentPosition })
  }, [currentPosition, getContainerDimensions, detectSectionBounds])

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !activeHandle || !startNormalized) return

    const { width, height } = containerRef.current
    const canvas = elementRef.current?.closest('.responsive-canvas, [data-canvas]')
    const zoom = canvas ? parseFloat(canvas.getAttribute('data-zoom') || '1') : 1

    const deltaX = (e.clientX - startPos.x) / zoom
    const deltaY = (e.clientY - startPos.y) / zoom

    let newPosition = { ...startNormalized }

    // Calculate delta percentages
    const deltaXPercent = (deltaX / width) * 100
    const deltaYPercent = (deltaY / height) * 100

    // Handle resize based on active handle
    if (activeHandle.includes('e')) {
      newPosition.widthPercent = Math.max(5, startNormalized.widthPercent + deltaXPercent)
    }
    if (activeHandle.includes('w')) {
      const newWidth = Math.max(5, startNormalized.widthPercent - deltaXPercent)
      const widthDiff = startNormalized.widthPercent - newWidth
      newPosition.xPercent = startNormalized.xPercent + widthDiff
      newPosition.widthPercent = newWidth
    }
    if (activeHandle.includes('s')) {
      newPosition.heightPercent = Math.max(5, startNormalized.heightPercent + deltaYPercent)
    }
    if (activeHandle.includes('n')) {
      const newHeight = Math.max(5, startNormalized.heightPercent - deltaYPercent)
      const heightDiff = startNormalized.heightPercent - newHeight
      newPosition.yPercent = startNormalized.yPercent + heightDiff
      newPosition.heightPercent = newHeight
    }

    // Clamp to valid range — keep element fully within section (or canvas if no section)
    const sb = sectionBoundsRef.current
    const xMin = sb?.xMin ?? 0
    const xMax = sb?.xMax ?? 100
    const yMin = sb?.yMin ?? 0
    const yMax = sb?.yMax ?? 100
    newPosition.xPercent = Math.max(xMin, Math.min(xMax - newPosition.widthPercent, newPosition.xPercent))
    newPosition.yPercent = Math.max(yMin, Math.min(yMax - newPosition.heightPercent, newPosition.yPercent))
    newPosition.widthPercent = Math.min(newPosition.widthPercent, xMax - newPosition.xPercent)
    newPosition.heightPercent = Math.min(newPosition.heightPercent, yMax - newPosition.yPercent)

    if (snapEnabled) {
      newPosition = snapToPercentageGrid(newPosition, gridPercent)
    }

    savePosition(newPosition)
  }, [isResizing, activeHandle, startNormalized, startPos, snapEnabled, gridPercent, savePosition])

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false)
    setActiveHandle(null)
    setStartNormalized(null)
  }, [])

  // ─── Global Mouse Event Listeners ───
  useEffect(() => {
    if (isDragging) {
      const handleMove = (e: MouseEvent) => handleDragMove(e)
      const handleUp = () => handleDragEnd()

      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)
      return () => {
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleUp)
      }
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  useEffect(() => {
    if (isResizing) {
      const handleMove = (e: MouseEvent) => handleResizeMove(e)
      const handleUp = () => handleResizeEnd()

      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)
      return () => {
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleUp)
      }
    }
  }, [isResizing, handleResizeMove, handleResizeEnd])

  // ─── Render ───
  return (
    <div
      ref={elementRef}
      data-element-id={component.id}
      data-breakpoint={breakpoint}
      style={positionStyles}
      className={`
        freeform-element group
        ${isImageElement ? 'r66-freeform-image' : ''}
        ${isSelected ? 'ring-2 ring-purple-500 ring-offset-1 selected' : 'hover:ring-2 hover:ring-purple-300'}
        ${isDragging ? 'opacity-80 shadow-xl dragging' : ''}
        ${isResizing ? 'opacity-90' : ''}
        transition-shadow
      `}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      onMouseDown={handleDragStart}
      onContextMenu={onContextMenu}
    >
      {/* Type Label */}
      <div
        className={`
          absolute -top-7 left-0 z-30 flex items-center gap-1 transition-opacity
          ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
        `}
      >
        <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded font-play font-medium capitalize">
          {component.type.replace(/-/g, ' ')} (freeform)
        </span>
        {/* Breakpoint indicator */}
        <span className="bg-gray-700 text-white text-xs px-1.5 py-0.5 rounded font-play">
          {breakpoint}
        </span>
      </div>

      {/* Content */}
      <div className="w-full h-full overflow-hidden">
        <RenderedComponent
          component={component}
          isEditing={true}
          onUpdateSettings={onUpdateSettings}
        />
      </div>

      {/* Resize Handles */}
      {isSelected && (
        <>
          {RESIZE_HANDLES.map((handle) => (
            <ResizeHandleUI
              key={handle}
              handle={handle}
              isActive={activeHandle === handle}
              onMouseDown={(e) => handleResizeStart(e, handle)}
            />
          ))}
        </>
      )}

      {/* Position Info (when selected) */}
      {isSelected && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap font-mono">
          {currentPosition.xPercent.toFixed(1)}%, {currentPosition.yPercent.toFixed(1)}% |{' '}
          {currentPosition.widthPercent.toFixed(1)}% x {currentPosition.heightPercent.toFixed(1)}%
        </div>
      )}
    </div>
  )
}

// ─── Resize Handle UI ───

interface ResizeHandleUIProps {
  handle: ResizeHandle
  isActive: boolean
  onMouseDown: (e: React.MouseEvent) => void
}

function ResizeHandleUI({ handle, isActive, onMouseDown }: ResizeHandleUIProps) {
  const positionClasses: Record<ResizeHandle, string> = {
    nw: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize',
    n: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-n-resize',
    ne: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize',
    e: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2 cursor-e-resize',
    se: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-se-resize',
    s: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-s-resize',
    sw: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize',
    w: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 cursor-w-resize',
  }

  const isCorner = handle.length === 2

  return (
    <div
      className={`
        absolute z-40 ${positionClasses[handle]}
        ${isCorner ? 'w-3 h-3' : 'w-2 h-2'}
        ${isActive ? 'bg-purple-700 scale-125' : 'bg-purple-500'}
        ${isCorner ? 'border-2 border-white rounded-sm' : 'rounded-full'}
        shadow-sm hover:scale-125 transition-transform
      `}
      onMouseDown={onMouseDown}
    />
  )
}

// ─── Export ───
export type { FreeformElementProps }
