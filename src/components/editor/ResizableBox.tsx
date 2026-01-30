'use client'

import React, { useRef, useCallback, useState, useEffect } from 'react'

// ─── Handle positions ───
type HandlePosition = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const HANDLES: HandlePosition[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

const CURSOR_MAP: Record<HandlePosition, string> = {
  n: 'n-resize',
  s: 's-resize',
  e: 'e-resize',
  w: 'w-resize',
  ne: 'ne-resize',
  nw: 'nw-resize',
  se: 'se-resize',
  sw: 'sw-resize',
}

const ARIA_MAP: Record<HandlePosition, string> = {
  n: 'Resize handle north',
  s: 'Resize handle south',
  e: 'Resize handle east',
  w: 'Resize handle west',
  ne: 'Resize handle northeast',
  nw: 'Resize handle northwest',
  se: 'Resize handle southeast',
  sw: 'Resize handle southwest',
}

// ─── Handle positioning styles ───
function getHandleStyle(pos: HandlePosition): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: '#3b82f6',
    border: '1px solid #2563eb',
    borderRadius: 1,
    zIndex: 50,
    touchAction: 'none',
  }

  switch (pos) {
    case 'n':
      return { ...base, top: -4, left: '50%', marginLeft: -4, cursor: 'n-resize' }
    case 's':
      return { ...base, bottom: -4, left: '50%', marginLeft: -4, cursor: 's-resize' }
    case 'e':
      return { ...base, right: -4, top: '50%', marginTop: -4, cursor: 'e-resize' }
    case 'w':
      return { ...base, left: -4, top: '50%', marginTop: -4, cursor: 'w-resize' }
    case 'ne':
      return { ...base, top: -4, right: -4, cursor: 'ne-resize' }
    case 'nw':
      return { ...base, top: -4, left: -4, cursor: 'nw-resize' }
    case 'se':
      return { ...base, bottom: -4, right: -4, cursor: 'se-resize' }
    case 'sw':
      return { ...base, bottom: -4, left: -4, cursor: 'sw-resize' }
  }
}

// ─── Props ───
export interface ResizableBoxProps {
  children: React.ReactNode
  width: number
  height: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  snapGrid?: number
  lockAspectRatio?: boolean
  isSelected?: boolean
  onResizeStart?: (width: number, height: number) => void
  onResize?: (width: number, height: number, deltaX: number, deltaY: number) => void
  onResizeEnd?: (width: number, height: number) => void
  className?: string
  style?: React.CSSProperties
}

export function ResizableBox({
  children,
  width,
  height,
  minWidth = 40,
  minHeight = 24,
  maxWidth = 2000,
  maxHeight = 2000,
  snapGrid = 1,
  lockAspectRatio = false,
  isSelected = false,
  onResizeStart,
  onResize,
  onResizeEnd,
  className = '',
  style = {},
}: ResizableBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [activeHandle, setActiveHandle] = useState<HandlePosition | null>(null)

  // Refs for tracking resize state without re-renders
  const startRect = useRef({ width: 0, height: 0 })
  const startPointer = useRef({ x: 0, y: 0 })
  const currentHandle = useRef<HandlePosition | null>(null)
  const aspectRatio = useRef(1)

  // ─── Snap to grid ───
  const snap = useCallback(
    (value: number) => {
      if (snapGrid <= 1) return value
      return Math.round(value / snapGrid) * snapGrid
    },
    [snapGrid]
  )

  // ─── Clamp within constraints ───
  const clamp = useCallback(
    (w: number, h: number): [number, number] => {
      let newW = Math.max(minWidth, Math.min(maxWidth, snap(w)))
      let newH = Math.max(minHeight, Math.min(maxHeight, snap(h)))

      if (lockAspectRatio && aspectRatio.current > 0) {
        // Maintain aspect ratio based on the larger change
        const wRatio = newW / startRect.current.width
        const hRatio = newH / startRect.current.height
        if (Math.abs(wRatio - 1) > Math.abs(hRatio - 1)) {
          newH = Math.max(minHeight, Math.min(maxHeight, snap(newW / aspectRatio.current)))
        } else {
          newW = Math.max(minWidth, Math.min(maxWidth, snap(newH * aspectRatio.current)))
        }
      }

      return [newW, newH]
    },
    [minWidth, minHeight, maxWidth, maxHeight, snap, lockAspectRatio]
  )

  // ─── Compute new size based on handle direction ───
  const computeSize = useCallback(
    (dx: number, dy: number, handle: HandlePosition): [number, number] => {
      const { width: sw, height: sh } = startRect.current
      let newW = sw
      let newH = sh

      // Horizontal resizing
      if (handle.includes('e')) newW = sw + dx
      if (handle.includes('w')) newW = sw - dx

      // Vertical resizing
      if (handle.includes('s')) newH = sh + dy
      if (handle.includes('n')) newH = sh - dy

      return clamp(newW, newH)
    },
    [clamp]
  )

  // ─── Pointer events ───
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, handle: HandlePosition) => {
      e.preventDefault()
      e.stopPropagation()

      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)

      startRect.current = { width, height }
      startPointer.current = { x: e.clientX, y: e.clientY }
      currentHandle.current = handle
      aspectRatio.current = width / height

      setIsResizing(true)
      setActiveHandle(handle)
      onResizeStart?.(width, height)
    },
    [width, height, onResizeStart]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!currentHandle.current) return

      const dx = e.clientX - startPointer.current.x
      const dy = e.clientY - startPointer.current.y
      const [newW, newH] = computeSize(dx, dy, currentHandle.current)

      onResize?.(newW, newH, dx, dy)
    },
    [computeSize, onResize]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!currentHandle.current) return

      const target = e.currentTarget as HTMLElement
      target.releasePointerCapture(e.pointerId)

      const dx = e.clientX - startPointer.current.x
      const dy = e.clientY - startPointer.current.y
      const [newW, newH] = computeSize(dx, dy, currentHandle.current)

      currentHandle.current = null
      setIsResizing(false)
      setActiveHandle(null)
      onResizeEnd?.(newW, newH)
    },
    [computeSize, onResizeEnd]
  )

  // ─── Keyboard resize ───
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isSelected) return
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return

      e.preventDefault()
      const step = e.shiftKey ? 10 : 1
      let newW = width
      let newH = height

      switch (e.key) {
        case 'ArrowRight':
          newW += step
          break
        case 'ArrowLeft':
          newW -= step
          break
        case 'ArrowDown':
          newH += step
          break
        case 'ArrowUp':
          newH -= step
          break
      }

      const [clampedW, clampedH] = clamp(newW, newH)
      onResize?.(clampedW, clampedH, clampedW - width, clampedH - height)
      onResizeEnd?.(clampedW, clampedH)
    },
    [width, height, isSelected, clamp, onResize, onResizeEnd]
  )

  return (
    <div
      ref={boxRef}
      className={`relative ${className}`}
      style={{
        width,
        height,
        ...style,
        outline: isResizing ? '2px solid #3b82f6' : undefined,
      }}
      tabIndex={isSelected ? 0 : -1}
      onKeyDown={handleKeyDown}
      role="group"
      aria-label={`Resizable block, ${Math.round(width)} by ${Math.round(height)} pixels`}
    >
      {children}

      {/* Render 8 resize handles when selected */}
      {isSelected &&
        HANDLES.map((pos) => (
          <div
            key={pos}
            style={{
              ...getHandleStyle(pos),
              transform: activeHandle === pos ? 'scale(1.25)' : undefined,
              backgroundColor: activeHandle === pos ? '#2563eb' : '#3b82f6',
            }}
            role="separator"
            aria-label={ARIA_MAP[pos]}
            aria-orientation={
              pos === 'n' || pos === 's' ? 'horizontal' : 'vertical'
            }
            tabIndex={isSelected ? 0 : -1}
            onPointerDown={(e) => handlePointerDown(e, pos)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onFocus={() => setActiveHandle(pos)}
            onBlur={() => setActiveHandle(null)}
            onKeyDown={(e) => {
              // Allow keyboard resize from focused handles
              if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
              e.preventDefault()
              const step = e.shiftKey ? 10 : 1
              let newW = width
              let newH = height

              // Map arrow keys to handle direction
              if (pos.includes('e') && e.key === 'ArrowRight') newW += step
              if (pos.includes('e') && e.key === 'ArrowLeft') newW -= step
              if (pos.includes('w') && e.key === 'ArrowRight') newW -= step
              if (pos.includes('w') && e.key === 'ArrowLeft') newW += step
              if (pos.includes('s') && e.key === 'ArrowDown') newH += step
              if (pos.includes('s') && e.key === 'ArrowUp') newH -= step
              if (pos.includes('n') && e.key === 'ArrowDown') newH -= step
              if (pos.includes('n') && e.key === 'ArrowUp') newH += step

              // Edge handles: allow perpendicular direction too
              if ((pos === 'n' || pos === 's') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return
              if ((pos === 'e' || pos === 'w') && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) return

              const [clampedW, clampedH] = clamp(newW, newH)
              onResize?.(clampedW, clampedH, clampedW - width, clampedH - height)
              onResizeEnd?.(clampedW, clampedH)
            }}
          />
        ))}

      {/* Size indicator during resize */}
      {isResizing && (
        <div
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap font-play z-50 pointer-events-none"
        >
          {Math.round(width)} &times; {Math.round(height)}
        </div>
      )}
    </div>
  )
}
