'use client'

import { useRef, useState, useEffect, useCallback, useMemo, type ReactNode, type CSSProperties } from 'react'
import {
  DESIGN_CANVAS,
  type Breakpoint,
  type NormalizedPosition,
  type ResponsivePositionData,
  calculateZoomScale,
  normalizedToPixels,
  pixelsToNormalized,
  getPositionForBreakpoint,
  applyDragDelta,
  applyResizeDelta,
  snapToPercentageGrid,
  alignToCanvas,
} from '@/lib/editor/responsive-positioning'

// ─── Types ───

export type ResponsiveMode = 'percentage' | 'zoom-to-fit' | 'stack'

export interface ResponsiveCanvasProps {
  /** Current editing breakpoint */
  breakpoint: Breakpoint
  /** Responsive mode strategy */
  mode?: ResponsiveMode
  /** Whether to show the grid overlay */
  showGrid?: boolean
  /** Grid size in percentage (default: 5%) */
  gridPercent?: number
  /** Whether snap-to-grid is enabled */
  snapEnabled?: boolean
  /** Canvas background color */
  backgroundColor?: string
  /** Canvas background image */
  backgroundImage?: string
  /** Children elements */
  children?: ReactNode
  /** Callback when canvas is clicked (deselect) */
  onCanvasClick?: () => void
  /** Class name for additional styling */
  className?: string
}

export interface ResponsiveElementProps {
  /** Unique element ID */
  id: string
  /** Normalized position data per breakpoint */
  positions: ResponsivePositionData
  /** Current breakpoint */
  breakpoint: Breakpoint
  /** Whether this element is selected */
  isSelected?: boolean
  /** Whether snap-to-grid is enabled */
  snapEnabled?: boolean
  /** Grid size in percentage */
  gridPercent?: number
  /** Minimum width in percentage */
  minWidthPercent?: number
  /** Minimum height in percentage */
  minHeightPercent?: number
  /** Callback when element is clicked */
  onSelect?: () => void
  /** Callback when position changes */
  onPositionChange?: (breakpoint: Breakpoint, position: NormalizedPosition) => void
  /** Callback for context menu */
  onContextMenu?: (e: React.MouseEvent) => void
  /** Element content */
  children: ReactNode
  /** Element type label */
  typeLabel?: string
}

// ─── Responsive Canvas Component ───

/**
 * A responsive canvas container that maintains design canvas proportions
 * and handles positioning across breakpoints.
 *
 * Supports three modes:
 * - percentage: Elements use percentage-based positioning (default)
 * - zoom-to-fit: Canvas scales down with CSS transform when viewport is smaller
 * - stack: Elements stack vertically on mobile (not implemented in this component)
 */
export function ResponsiveCanvas({
  breakpoint,
  mode = 'zoom-to-fit',
  showGrid = false,
  gridPercent = 5,
  snapEnabled = true,
  backgroundColor = '#ffffff',
  backgroundImage,
  children,
  onCanvasClick,
  className = '',
}: ResponsiveCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  const designCanvas = DESIGN_CANVAS[breakpoint]

  // Track container size for zoom calculations
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Calculate zoom scale for zoom-to-fit mode
  const zoomScale = useMemo(() => {
    if (mode !== 'zoom-to-fit' || containerSize.width === 0) return 1
    return calculateZoomScale(containerSize.width, designCanvas.width)
  }, [mode, containerSize.width, designCanvas.width])

  // Canvas styles based on mode
  const canvasStyles = useMemo<CSSProperties>(() => {
    const baseStyles: CSSProperties = {
      position: 'relative',
      backgroundColor,
      overflow: 'hidden',
    }

    if (mode === 'zoom-to-fit') {
      return {
        ...baseStyles,
        width: `${designCanvas.width}px`,
        minHeight: `${designCanvas.height}px`,
        transform: `scale(${zoomScale})`,
        transformOrigin: 'top left',
      }
    }

    // Percentage mode - canvas fills container
    return {
      ...baseStyles,
      width: '100%',
      minHeight: `${designCanvas.height}px`,
    }
  }, [mode, designCanvas, zoomScale, backgroundColor])

  // Wrapper styles to handle zoom overflow
  const wrapperStyles = useMemo<CSSProperties>(() => {
    if (mode === 'zoom-to-fit') {
      return {
        width: `${designCanvas.width * zoomScale}px`,
        height: `${designCanvas.height * zoomScale}px`,
        overflow: 'hidden',
      }
    }
    return { width: '100%' }
  }, [mode, designCanvas, zoomScale])

  // Grid overlay
  const gridOverlay = showGrid && (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(to right, rgba(99, 102, 241, 0.1) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(99, 102, 241, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: `${gridPercent}% ${gridPercent}%`,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  )

  // Background image layer
  const bgImageLayer = backgroundImage && (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url("${backgroundImage}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )

  return (
    <div
      ref={containerRef}
      className={`responsive-canvas-container ${className}`}
      style={wrapperStyles}
      onClick={onCanvasClick}
    >
      <div
        className="responsive-canvas"
        style={canvasStyles}
        data-breakpoint={breakpoint}
        data-mode={mode}
        data-zoom={zoomScale}
      >
        {bgImageLayer}
        {gridOverlay}

        {/* Content layer */}
        <div style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Responsive Element Component ───

/**
 * A positioned element within the responsive canvas.
 * Handles drag and resize with percentage-based positioning.
 */
export function ResponsiveElement({
  id,
  positions,
  breakpoint,
  isSelected = false,
  snapEnabled = true,
  gridPercent = 5,
  minWidthPercent = 5,
  minHeightPercent = 5,
  onSelect,
  onPositionChange,
  onContextMenu,
  children,
  typeLabel,
}: ResponsiveElementProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, handle: '' })

  // Get current position for breakpoint
  const currentPosition = useMemo(
    () => getPositionForBreakpoint(positions, breakpoint),
    [positions, breakpoint]
  )

  // Track container dimensions for delta calculations
  const getContainerDimensions = useCallback(() => {
    const canvas = elementRef.current?.closest('.responsive-canvas')
    if (!canvas) return { width: DESIGN_CANVAS[breakpoint].width, height: DESIGN_CANVAS[breakpoint].height }
    const rect = canvas.getBoundingClientRect()
    const zoom = parseFloat(canvas.getAttribute('data-zoom') || '1')
    return {
      width: rect.width / zoom,
      height: rect.height / zoom,
    }
  }, [breakpoint])

  // Position styles
  const positionStyles = useMemo<CSSProperties>(() => ({
    position: 'absolute',
    left: `${currentPosition.xPercent}%`,
    top: `${currentPosition.yPercent}%`,
    width: `${currentPosition.widthPercent}%`,
    height: `${currentPosition.heightPercent}%`,
    zIndex: currentPosition.zIndex,
    transform: currentPosition.rotation ? `rotate(${currentPosition.rotation}deg)` : undefined,
    transformOrigin: 'center center',
    cursor: isDragging ? 'grabbing' : isSelected ? 'grab' : 'pointer',
    userSelect: 'none',
    boxSizing: 'border-box',
  }), [currentPosition, isDragging, isSelected])

  // ─── Drag Handling ───
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isSelected || isResizing) return
    e.preventDefault()
    e.stopPropagation()

    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }, [isSelected, isResizing])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !onPositionChange) return

    const { width, height } = getContainerDimensions()
    const canvas = elementRef.current?.closest('.responsive-canvas')
    const zoom = canvas ? parseFloat(canvas.getAttribute('data-zoom') || '1') : 1

    const deltaX = (e.clientX - dragStart.x) / zoom
    const deltaY = (e.clientY - dragStart.y) / zoom

    let newPosition = applyDragDelta(currentPosition, deltaX, deltaY, width, height)

    if (snapEnabled) {
      newPosition = snapToPercentageGrid(newPosition, gridPercent)
    }

    onPositionChange(breakpoint, newPosition)
    setDragStart({ x: e.clientX, y: e.clientY })
  }, [isDragging, dragStart, currentPosition, breakpoint, onPositionChange, snapEnabled, gridPercent, getContainerDimensions])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
  }, [])

  // ─── Resize Handling ───
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: string) => {
    e.preventDefault()
    e.stopPropagation()

    setIsResizing(true)
    setResizeStart({ x: e.clientX, y: e.clientY, handle })
  }, [])

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !onPositionChange) return

    const { width, height } = getContainerDimensions()
    const canvas = elementRef.current?.closest('.responsive-canvas')
    const zoom = canvas ? parseFloat(canvas.getAttribute('data-zoom') || '1') : 1

    const deltaX = (e.clientX - resizeStart.x) / zoom
    const deltaY = (e.clientY - resizeStart.y) / zoom

    let newPosition = { ...currentPosition }

    // Handle different resize directions
    const handle = resizeStart.handle
    if (handle.includes('e')) {
      newPosition = applyResizeDelta(newPosition, deltaX, 0, width, height, minWidthPercent, minHeightPercent)
    }
    if (handle.includes('w')) {
      const widthDelta = -deltaX
      const xDelta = -widthDelta
      newPosition = applyResizeDelta(newPosition, widthDelta, 0, width, height, minWidthPercent, minHeightPercent)
      newPosition = applyDragDelta(newPosition, deltaX, 0, width, height)
    }
    if (handle.includes('s')) {
      newPosition = applyResizeDelta(newPosition, 0, deltaY, width, height, minWidthPercent, minHeightPercent)
    }
    if (handle.includes('n')) {
      const heightDelta = -deltaY
      newPosition = applyResizeDelta(newPosition, 0, heightDelta, width, height, minWidthPercent, minHeightPercent)
      newPosition = applyDragDelta(newPosition, 0, deltaY, width, height)
    }

    if (snapEnabled) {
      newPosition = snapToPercentageGrid(newPosition, gridPercent)
    }

    onPositionChange(breakpoint, newPosition)
    setResizeStart({ x: e.clientX, y: e.clientY, handle: resizeStart.handle })
  }, [isResizing, resizeStart, currentPosition, breakpoint, onPositionChange, snapEnabled, gridPercent, minWidthPercent, minHeightPercent, getContainerDimensions])

  // Global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleResizeMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing, handleResizeMove, handleMouseUp])

  // Resize handles
  const resizeHandles = isSelected && (
    <>
      {/* Corner handles */}
      <ResizeHandle position="nw" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
      <ResizeHandle position="ne" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
      <ResizeHandle position="sw" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
      <ResizeHandle position="se" onMouseDown={(e) => handleResizeStart(e, 'se')} />
      {/* Edge handles */}
      <ResizeHandle position="n" onMouseDown={(e) => handleResizeStart(e, 'n')} />
      <ResizeHandle position="s" onMouseDown={(e) => handleResizeStart(e, 's')} />
      <ResizeHandle position="e" onMouseDown={(e) => handleResizeStart(e, 'e')} />
      <ResizeHandle position="w" onMouseDown={(e) => handleResizeStart(e, 'w')} />
    </>
  )

  return (
    <div
      ref={elementRef}
      data-element-id={id}
      style={positionStyles}
      className={`
        responsive-element group
        ${isSelected ? 'ring-2 ring-purple-500 ring-offset-1' : 'hover:ring-2 hover:ring-purple-300'}
        ${isDragging ? 'opacity-80' : ''}
        ${isResizing ? 'opacity-90' : ''}
      `}
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.()
      }}
      onMouseDown={handleMouseDown}
      onContextMenu={onContextMenu}
    >
      {/* Type label */}
      {typeLabel && (
        <div
          className={`
            absolute -top-7 left-0 z-30 transition-opacity
            ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `}
        >
          <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded font-medium">
            {typeLabel}
          </span>
        </div>
      )}

      {/* Element content */}
      <div className="w-full h-full overflow-hidden">
        {children}
      </div>

      {/* Resize handles */}
      {resizeHandles}

      {/* Dimensions display when selected */}
      {isSelected && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
          {currentPosition.widthPercent.toFixed(1)}% x {currentPosition.heightPercent.toFixed(1)}%
        </div>
      )}
    </div>
  )
}

// ─── Resize Handle Component ───

interface ResizeHandleProps {
  position: 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'
  onMouseDown: (e: React.MouseEvent) => void
}

function ResizeHandle({ position, onMouseDown }: ResizeHandleProps) {
  const positionStyles: Record<string, CSSProperties> = {
    n: { top: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' },
    s: { bottom: -4, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' },
    e: { right: -4, top: '50%', transform: 'translateY(-50%)', cursor: 'e-resize' },
    w: { left: -4, top: '50%', transform: 'translateY(-50%)', cursor: 'w-resize' },
    nw: { top: -4, left: -4, cursor: 'nw-resize' },
    ne: { top: -4, right: -4, cursor: 'ne-resize' },
    sw: { bottom: -4, left: -4, cursor: 'sw-resize' },
    se: { bottom: -4, right: -4, cursor: 'se-resize' },
  }

  const isCorner = position.length === 2

  return (
    <div
      className={`
        absolute z-40
        ${isCorner ? 'w-3 h-3 bg-purple-500 border-2 border-white rounded-sm' : 'w-2 h-2 bg-purple-400 rounded-full'}
        shadow-sm hover:scale-125 transition-transform
      `}
      style={positionStyles[position]}
      onMouseDown={onMouseDown}
    />
  )
}

// ─── Hook: Use Responsive Position ───

/**
 * Hook for managing responsive position state with breakpoint support.
 */
export function useResponsivePosition(
  initialPositions: ResponsivePositionData
): {
  positions: ResponsivePositionData
  updatePosition: (breakpoint: Breakpoint, position: NormalizedPosition) => void
  resetToDesktop: (breakpoint: Breakpoint) => void
  alignElement: (breakpoint: Breakpoint, alignment: Parameters<typeof alignToCanvas>[1]) => void
} {
  const [positions, setPositions] = useState<ResponsivePositionData>(initialPositions)

  const updatePosition = useCallback((breakpoint: Breakpoint, position: NormalizedPosition) => {
    setPositions((prev) => ({
      ...prev,
      [breakpoint]: position,
    }))
  }, [])

  const resetToDesktop = useCallback((breakpoint: Breakpoint) => {
    setPositions((prev) => ({
      ...prev,
      [breakpoint]: { ...prev.desktop },
    }))
  }, [])

  const alignElement = useCallback(
    (breakpoint: Breakpoint, alignment: Parameters<typeof alignToCanvas>[1]) => {
      setPositions((prev) => {
        const current = getPositionForBreakpoint(prev, breakpoint)
        return {
          ...prev,
          [breakpoint]: alignToCanvas(current, alignment),
        }
      })
    },
    []
  )

  return { positions, updatePosition, resetToDesktop, alignElement }
}

// ─── Export ───
export { DESIGN_CANVAS, type Breakpoint, type NormalizedPosition, type ResponsivePositionData }
