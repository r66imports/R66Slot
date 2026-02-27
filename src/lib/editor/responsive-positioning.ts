/**
 * Responsive Positioning System for Freeform Editor
 *
 * This module provides utilities for converting between absolute pixel positions
 * and normalized percentage-based positions, enabling responsive freeform layouts.
 *
 * Key Concepts:
 * - Design Canvas: Fixed reference dimensions (e.g., 1200x800 for desktop)
 * - Normalized Position: Percentages relative to design canvas (0-100)
 * - Viewport Position: Actual pixel position in current viewport
 */

// ─── Design Canvas Dimensions ───
export const DESIGN_CANVAS = {
  desktop: { width: 1200, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
} as const

export type Breakpoint = keyof typeof DESIGN_CANVAS

// ─── Normalized Position Interface ───
export interface NormalizedPosition {
  // Percentage values (0-100) relative to design canvas
  xPercent: number
  yPercent: number
  widthPercent: number
  heightPercent: number
  // Absolute values that don't scale
  zIndex: number
  rotation: number
}

// ─── Per-Breakpoint Normalized Positions ───
export interface ResponsivePositionData {
  desktop: NormalizedPosition
  tablet?: NormalizedPosition
  mobile?: NormalizedPosition
}

// ─── Legacy Position Interface (for migration) ───
export interface LegacyPosition {
  x: number
  y: number
  width: number
  height: number
  zIndex?: number
  rotation?: number
}

// ─── Conversion Functions ───

/**
 * Convert absolute pixel position to normalized percentages
 * relative to the design canvas for a specific breakpoint.
 */
export function pixelsToNormalized(
  pixels: LegacyPosition,
  breakpoint: Breakpoint = 'desktop'
): NormalizedPosition {
  const canvas = DESIGN_CANVAS[breakpoint]

  return {
    xPercent: (pixels.x / canvas.width) * 100,
    yPercent: (pixels.y / canvas.height) * 100,
    widthPercent: (pixels.width / canvas.width) * 100,
    heightPercent: (pixels.height / canvas.height) * 100,
    zIndex: pixels.zIndex ?? 10,
    rotation: pixels.rotation ?? 0,
  }
}

/**
 * Convert normalized percentages back to absolute pixels
 * for a specific viewport/canvas size.
 */
export function normalizedToPixels(
  normalized: NormalizedPosition,
  canvasWidth: number,
  canvasHeight: number
): LegacyPosition {
  return {
    x: (normalized.xPercent / 100) * canvasWidth,
    y: (normalized.yPercent / 100) * canvasHeight,
    width: (normalized.widthPercent / 100) * canvasWidth,
    height: (normalized.heightPercent / 100) * canvasHeight,
    zIndex: normalized.zIndex,
    rotation: normalized.rotation,
  }
}

/**
 * Get the appropriate position for current viewport,
 * with fallback cascade: mobile -> tablet -> desktop
 */
export function getPositionForBreakpoint(
  positions: ResponsivePositionData,
  breakpoint: Breakpoint
): NormalizedPosition {
  // Direct match
  if (positions[breakpoint]) {
    return positions[breakpoint]!
  }

  // Fallback cascade
  if (breakpoint === 'mobile' && positions.tablet) {
    return positions.tablet
  }

  // Always fall back to desktop
  return positions.desktop
}

/**
 * Scale a desktop position to fit a smaller breakpoint.
 * This maintains proportions but adjusts for the narrower canvas.
 */
export function scalePositionToBreakpoint(
  desktopPos: NormalizedPosition,
  targetBreakpoint: Breakpoint
): NormalizedPosition {
  if (targetBreakpoint === 'desktop') {
    return desktopPos
  }

  // For smaller breakpoints, we keep the same percentages
  // but the actual pixel values will be smaller due to canvas width
  return { ...desktopPos }
}

// ─── CSS Generation Functions ───

/**
 * Generate inline styles for a positioned element.
 * Uses percentage-based positioning with CSS calc() for precision.
 */
export function generatePositionStyles(
  normalized: NormalizedPosition,
  containerWidth: number,
  containerHeight: number
): React.CSSProperties {
  return {
    position: 'absolute' as const,
    left: `${normalized.xPercent}%`,
    top: `${normalized.yPercent}%`,
    width: `${normalized.widthPercent}%`,
    height: `${normalized.heightPercent}%`,
    zIndex: normalized.zIndex,
    transform: normalized.rotation ? `rotate(${normalized.rotation}deg)` : undefined,
    // Use transform-origin for proper rotation around center
    transformOrigin: 'center center',
  }
}

/**
 * Generate CSS custom properties for responsive positioning.
 * Can be used with CSS calc() in stylesheets.
 */
export function generateCSSVariables(
  normalized: NormalizedPosition
): Record<string, string> {
  return {
    '--el-x': `${normalized.xPercent}%`,
    '--el-y': `${normalized.yPercent}%`,
    '--el-w': `${normalized.widthPercent}%`,
    '--el-h': `${normalized.heightPercent}%`,
    '--el-z': String(normalized.zIndex),
    '--el-rotate': `${normalized.rotation}deg`,
  }
}

// ─── Zoom-to-Fit Strategy ───

/**
 * Calculate the scale factor needed to fit the design canvas
 * within the current viewport width.
 */
export function calculateZoomScale(
  viewportWidth: number,
  designWidth: number = DESIGN_CANVAS.desktop.width
): number {
  if (viewportWidth >= designWidth) {
    return 1 // No scaling needed
  }
  return viewportWidth / designWidth
}

/**
 * Generate transform styles for zoom-to-fit approach.
 * This scales the entire canvas to fit the viewport.
 */
export function generateZoomStyles(
  viewportWidth: number,
  designWidth: number = DESIGN_CANVAS.desktop.width
): React.CSSProperties {
  const scale = calculateZoomScale(viewportWidth, designWidth)

  return {
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    width: `${designWidth}px`,
    // Adjust container height to account for scaling
    height: `calc(100% / ${scale})`,
  }
}

// ─── Stacking Strategy for Mobile ───

export type StackingMode = 'none' | 'vertical' | 'grid'

/**
 * Calculate stacked positions for mobile view.
 * Converts freeform layout to vertical stack.
 */
export function calculateStackedPositions(
  positions: NormalizedPosition[],
  gap: number = 2 // percentage gap between items
): NormalizedPosition[] {
  let currentY = 0

  return positions.map((pos) => {
    const stacked: NormalizedPosition = {
      xPercent: 5, // 5% margin on each side = 90% width
      yPercent: currentY,
      widthPercent: 90,
      heightPercent: pos.heightPercent, // Keep original height ratio
      zIndex: 10, // Reset z-index for stacked view
      rotation: 0, // No rotation in stacked view
    }

    currentY += pos.heightPercent + gap
    return stacked
  })
}

// ─── Migration Utility ───

/**
 * Migrate legacy pixel-based position data to normalized format.
 * Handles both single position and per-breakpoint position data.
 */
export function migrateLegacyPosition(
  legacy: LegacyPosition | Record<Breakpoint, LegacyPosition | undefined>
): ResponsivePositionData {
  // Check if it's a per-breakpoint object
  if ('desktop' in legacy || 'tablet' in legacy || 'mobile' in legacy) {
    const perBreakpoint = legacy as Record<Breakpoint, LegacyPosition | undefined>

    // Desktop is required
    const desktopLegacy = perBreakpoint.desktop || { x: 50, y: 50, width: 300, height: 200 }

    return {
      desktop: pixelsToNormalized(desktopLegacy, 'desktop'),
      tablet: perBreakpoint.tablet
        ? pixelsToNormalized(perBreakpoint.tablet, 'tablet')
        : undefined,
      mobile: perBreakpoint.mobile
        ? pixelsToNormalized(perBreakpoint.mobile, 'mobile')
        : undefined,
    }
  }

  // Single legacy position - convert as desktop
  return {
    desktop: pixelsToNormalized(legacy as LegacyPosition, 'desktop'),
  }
}

// ─── Drag/Resize Handlers ───

/**
 * Convert a drag delta (in pixels) to normalized position update.
 */
export function applyDragDelta(
  current: NormalizedPosition,
  deltaX: number,
  deltaY: number,
  containerWidth: number,
  containerHeight: number
): NormalizedPosition {
  const deltaXPercent = (deltaX / containerWidth) * 100
  const deltaYPercent = (deltaY / containerHeight) * 100

  return {
    ...current,
    xPercent: Math.max(0, Math.min(100 - current.widthPercent, current.xPercent + deltaXPercent)),
    yPercent: Math.max(0, Math.min(100 - current.heightPercent, current.yPercent + deltaYPercent)),
  }
}

/**
 * Convert a resize delta (in pixels) to normalized size update.
 */
export function applyResizeDelta(
  current: NormalizedPosition,
  deltaWidth: number,
  deltaHeight: number,
  containerWidth: number,
  containerHeight: number,
  minWidthPercent: number = 5,
  minHeightPercent: number = 5
): NormalizedPosition {
  const deltaWPercent = (deltaWidth / containerWidth) * 100
  const deltaHPercent = (deltaHeight / containerHeight) * 100

  return {
    ...current,
    widthPercent: Math.max(minWidthPercent, current.widthPercent + deltaWPercent),
    heightPercent: Math.max(minHeightPercent, current.heightPercent + deltaHPercent),
  }
}

// ─── Snap to Grid (Percentage-based) ───

/**
 * Snap a position to a percentage-based grid.
 */
export function snapToPercentageGrid(
  position: NormalizedPosition,
  gridPercent: number = 5 // 5% grid = 20 columns
): NormalizedPosition {
  return {
    ...position,
    xPercent: Math.round(position.xPercent / gridPercent) * gridPercent,
    yPercent: Math.round(position.yPercent / gridPercent) * gridPercent,
    widthPercent: Math.round(position.widthPercent / gridPercent) * gridPercent,
    heightPercent: Math.round(position.heightPercent / gridPercent) * gridPercent,
  }
}

// ─── Alignment Helpers ───

/**
 * Align element to canvas edge or center.
 */
export function alignToCanvas(
  position: NormalizedPosition,
  alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
): NormalizedPosition {
  switch (alignment) {
    case 'left':
      return { ...position, xPercent: 0 }
    case 'center':
      return { ...position, xPercent: (100 - position.widthPercent) / 2 }
    case 'right':
      return { ...position, xPercent: 100 - position.widthPercent }
    case 'top':
      return { ...position, yPercent: 0 }
    case 'middle':
      return { ...position, yPercent: (100 - position.heightPercent) / 2 }
    case 'bottom':
      return { ...position, yPercent: 100 - position.heightPercent }
    default:
      return position
  }
}

// ─── Export Types ───
export type { LegacyPosition as PixelPosition }
