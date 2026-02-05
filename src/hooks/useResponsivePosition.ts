'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  DESIGN_CANVAS,
  type Breakpoint,
  type NormalizedPosition,
  type ResponsivePositionData,
  getPositionForBreakpoint,
  calculateZoomScale,
  alignToCanvas,
  snapToPercentageGrid,
} from '@/lib/editor/responsive-positioning'
import {
  hasNormalizedPosition,
  migrateComponentPosition,
  createDefaultNormalizedPosition,
} from '@/lib/editor/position-migration'
import type { PageComponent } from '@/lib/pages/schema'

// ─── Types ───

interface UseResponsivePositionOptions {
  /** Grid size in percentage for snapping (default: 5) */
  gridPercent?: number
  /** Whether snap-to-grid is enabled */
  snapEnabled?: boolean
  /** Callback when position changes */
  onChange?: (positions: ResponsivePositionData) => void
}

interface UseResponsivePositionReturn {
  /** Current normalized position for the active breakpoint */
  position: NormalizedPosition
  /** Full responsive position data */
  positions: ResponsivePositionData
  /** Update position for a specific breakpoint */
  updatePosition: (breakpoint: Breakpoint, position: NormalizedPosition) => void
  /** Align element to canvas edge/center */
  align: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void
  /** Reset breakpoint position to match desktop */
  resetToDesktop: () => void
  /** Get CSS styles for the current position */
  getStyles: () => React.CSSProperties
  /** Get CSS variables for the current position */
  getCSSVars: () => Record<string, string>
}

// ─── Hook ───

/**
 * Hook for managing responsive position state for a freeform component.
 *
 * @param component - The PageComponent with position data
 * @param breakpoint - Current active breakpoint
 * @param options - Configuration options
 */
export function useResponsivePosition(
  component: PageComponent,
  breakpoint: Breakpoint,
  options: UseResponsivePositionOptions = {}
): UseResponsivePositionReturn {
  const { gridPercent = 5, snapEnabled = true, onChange } = options

  // Get or migrate normalized positions
  const initialPositions = useMemo((): ResponsivePositionData => {
    if (hasNormalizedPosition(component)) {
      return component.normalizedPosition!
    }

    // Auto-migrate legacy positions
    const migrated = migrateComponentPosition(component)
    return migrated.normalizedPosition || {
      desktop: createDefaultNormalizedPosition(),
    }
  }, [component])

  const [positions, setPositions] = useState<ResponsivePositionData>(initialPositions)

  // Sync with external changes
  useEffect(() => {
    if (component.normalizedPosition) {
      setPositions(component.normalizedPosition)
    }
  }, [component.normalizedPosition])

  // Current position for active breakpoint
  const position = useMemo(
    () => getPositionForBreakpoint(positions, breakpoint),
    [positions, breakpoint]
  )

  // Update position
  const updatePosition = useCallback(
    (bp: Breakpoint, newPosition: NormalizedPosition) => {
      let finalPosition = newPosition

      // Apply snap if enabled
      if (snapEnabled) {
        finalPosition = snapToPercentageGrid(finalPosition, gridPercent)
      }

      const updated = {
        ...positions,
        [bp]: finalPosition,
      }

      setPositions(updated)
      onChange?.(updated)
    },
    [positions, snapEnabled, gridPercent, onChange]
  )

  // Align to canvas
  const align = useCallback(
    (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      const aligned = alignToCanvas(position, alignment)
      updatePosition(breakpoint, aligned)
    },
    [position, breakpoint, updatePosition]
  )

  // Reset to desktop
  const resetToDesktop = useCallback(() => {
    updatePosition(breakpoint, { ...positions.desktop })
  }, [breakpoint, positions.desktop, updatePosition])

  // Get CSS styles
  const getStyles = useCallback((): React.CSSProperties => {
    return {
      position: 'absolute',
      left: `${position.xPercent}%`,
      top: `${position.yPercent}%`,
      width: `${position.widthPercent}%`,
      height: `${position.heightPercent}%`,
      zIndex: position.zIndex,
      transform: position.rotation ? `rotate(${position.rotation}deg)` : undefined,
      transformOrigin: 'center center',
    }
  }, [position])

  // Get CSS variables
  const getCSSVars = useCallback((): Record<string, string> => {
    return {
      '--el-x': `${position.xPercent}%`,
      '--el-y': `${position.yPercent}%`,
      '--el-w': `${position.widthPercent}%`,
      '--el-h': `${position.heightPercent}%`,
      '--el-z': String(position.zIndex),
      '--el-rotate': `${position.rotation}deg`,
    }
  }, [position])

  return {
    position,
    positions,
    updatePosition,
    align,
    resetToDesktop,
    getStyles,
    getCSSVars,
  }
}

// ─── Canvas Zoom Hook ───

interface UseCanvasZoomOptions {
  /** Design canvas width (default: 1200) */
  designWidth?: number
  /** Minimum scale factor (default: 0.25) */
  minScale?: number
  /** Maximum scale factor (default: 1) */
  maxScale?: number
}

interface UseCanvasZoomReturn {
  /** Current zoom scale (0-1) */
  scale: number
  /** Container ref to attach to the parent element */
  containerRef: React.RefObject<HTMLDivElement>
  /** Get transform styles for the canvas */
  getCanvasStyles: () => React.CSSProperties
}

/**
 * Hook for managing canvas zoom-to-fit behavior.
 */
export function useCanvasZoom(options: UseCanvasZoomOptions = {}): UseCanvasZoomReturn {
  const { designWidth = DESIGN_CANVAS.desktop.width, minScale = 0.25, maxScale = 1 } = options

  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  // Calculate scale based on container width
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const calculateScale = () => {
      const containerWidth = container.clientWidth
      const rawScale = calculateZoomScale(containerWidth, designWidth)
      const clampedScale = Math.max(minScale, Math.min(maxScale, rawScale))
      setScale(clampedScale)
    }

    calculateScale()

    const observer = new ResizeObserver(calculateScale)
    observer.observe(container)

    return () => observer.disconnect()
  }, [designWidth, minScale, maxScale])

  const getCanvasStyles = useCallback((): React.CSSProperties => {
    return {
      width: `${designWidth}px`,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
    }
  }, [designWidth, scale])

  return {
    scale,
    containerRef,
    getCanvasStyles,
  }
}

// ─── Breakpoint Detection Hook ───

/**
 * Hook for detecting the current viewport breakpoint.
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop')

  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth
      if (width < 640) {
        setBreakpoint('mobile')
      } else if (width < 1024) {
        setBreakpoint('tablet')
      } else {
        setBreakpoint('desktop')
      }
    }

    checkBreakpoint()
    window.addEventListener('resize', checkBreakpoint)
    return () => window.removeEventListener('resize', checkBreakpoint)
  }, [])

  return breakpoint
}

// ─── Export ───
export { DESIGN_CANVAS, type Breakpoint, type NormalizedPosition, type ResponsivePositionData }
