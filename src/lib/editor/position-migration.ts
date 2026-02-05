/**
 * Position Migration Utilities
 *
 * Helpers for migrating legacy pixel-based positions to the new
 * normalized percentage-based format.
 */

import type { PageComponent } from '@/lib/pages/schema'
import {
  DESIGN_CANVAS,
  type Breakpoint,
  type NormalizedPosition,
  type ResponsivePositionData,
  type LegacyPosition,
  pixelsToNormalized,
} from './responsive-positioning'

/**
 * Check if a component has legacy pixel-based positioning
 */
export function hasLegacyPosition(component: PageComponent): boolean {
  return !!(component.position || component.positionByView) && !component.normalizedPosition
}

/**
 * Check if a component has the new normalized positioning
 */
export function hasNormalizedPosition(component: PageComponent): boolean {
  return !!component.normalizedPosition?.desktop
}

/**
 * Migrate a single component's position from legacy to normalized format
 */
export function migrateComponentPosition(component: PageComponent): PageComponent {
  // Already migrated or not a freeform component
  if (component.positionMode !== 'absolute' || hasNormalizedPosition(component)) {
    return component
  }

  // No position data to migrate
  if (!component.position && !component.positionByView) {
    return component
  }

  const normalizedPosition: ResponsivePositionData = {
    desktop: createDefaultNormalizedPosition(),
  }

  // Migrate legacy single position
  if (component.position && !component.positionByView) {
    normalizedPosition.desktop = pixelsToNormalized(component.position, 'desktop')
  }

  // Migrate per-breakpoint positions
  if (component.positionByView) {
    if (component.positionByView.desktop) {
      normalizedPosition.desktop = pixelsToNormalized(component.positionByView.desktop, 'desktop')
    }
    if (component.positionByView.tablet) {
      normalizedPosition.tablet = pixelsToNormalized(component.positionByView.tablet, 'tablet')
    }
    if (component.positionByView.mobile) {
      normalizedPosition.mobile = pixelsToNormalized(component.positionByView.mobile, 'mobile')
    }
  }

  return {
    ...component,
    normalizedPosition,
    // Set default responsive strategy
    responsiveStrategy: component.responsiveStrategy || 'zoom-to-fit',
  }
}

/**
 * Migrate all components in a page
 */
export function migratePageComponents(components: PageComponent[]): PageComponent[] {
  return components.map(migrateComponentPosition)
}

/**
 * Create a default normalized position for new freeform components
 */
export function createDefaultNormalizedPosition(): NormalizedPosition {
  return {
    xPercent: 5, // 5% from left
    yPercent: 5, // 5% from top
    widthPercent: 25, // 25% width (300px on 1200px canvas)
    heightPercent: 25, // 25% height (200px on 800px canvas)
    zIndex: 10,
    rotation: 0,
  }
}

/**
 * Create normalized position data for all breakpoints from desktop
 */
export function createResponsivePositionFromDesktop(
  desktop: NormalizedPosition
): ResponsivePositionData {
  return {
    desktop,
    // Tablet and mobile can inherit from desktop initially
    // Users can customize per-breakpoint
  }
}

/**
 * Convert normalized position to CSS custom properties
 * Useful for CSS-based positioning
 */
export function positionToCSSVars(
  position: NormalizedPosition,
  prefix: string = 'el'
): Record<string, string> {
  return {
    [`--${prefix}-x`]: `${position.xPercent}%`,
    [`--${prefix}-y`]: `${position.yPercent}%`,
    [`--${prefix}-w`]: `${position.widthPercent}%`,
    [`--${prefix}-h`]: `${position.heightPercent}%`,
    [`--${prefix}-z`]: String(position.zIndex),
    [`--${prefix}-rot`]: `${position.rotation}deg`,
  }
}

/**
 * Get the effective position for a component at a specific breakpoint.
 * Handles both legacy and normalized formats with fallback cascade.
 */
export function getEffectivePosition(
  component: PageComponent,
  breakpoint: Breakpoint,
  canvasWidth?: number,
  canvasHeight?: number
): LegacyPosition {
  // Use normalized position if available
  if (component.normalizedPosition) {
    const pos = component.normalizedPosition[breakpoint] || component.normalizedPosition.desktop
    const canvas = DESIGN_CANVAS[breakpoint]
    const width = canvasWidth || canvas.width
    const height = canvasHeight || canvas.height

    return {
      x: (pos.xPercent / 100) * width,
      y: (pos.yPercent / 100) * height,
      width: (pos.widthPercent / 100) * width,
      height: (pos.heightPercent / 100) * height,
      zIndex: pos.zIndex,
      rotation: pos.rotation,
    }
  }

  // Fall back to legacy position
  if (component.positionByView?.[breakpoint]) {
    return component.positionByView[breakpoint]!
  }

  if (component.position) {
    // Scale legacy position for smaller breakpoints
    const scale = DESIGN_CANVAS[breakpoint].width / DESIGN_CANVAS.desktop.width
    return {
      x: component.position.x * scale,
      y: component.position.y * scale,
      width: component.position.width * scale,
      height: component.position.height * scale,
      zIndex: component.position.zIndex,
      rotation: component.position.rotation,
    }
  }

  // Default position
  const canvas = DESIGN_CANVAS[breakpoint]
  return {
    x: canvas.width * 0.05,
    y: canvas.height * 0.05,
    width: canvas.width * 0.25,
    height: canvas.height * 0.25,
    zIndex: 10,
    rotation: 0,
  }
}

/**
 * Save a pixel position as normalized for a specific breakpoint
 */
export function savePositionAsNormalized(
  current: ResponsivePositionData | undefined,
  breakpoint: Breakpoint,
  pixelPosition: LegacyPosition
): ResponsivePositionData {
  const normalized = pixelsToNormalized(pixelPosition, breakpoint)

  return {
    desktop: current?.desktop || createDefaultNormalizedPosition(),
    ...current,
    [breakpoint]: normalized,
  }
}

/**
 * Get CSS styles for a positioned element (works with both formats)
 */
export function getPositionStyles(
  component: PageComponent,
  breakpoint: Breakpoint
): React.CSSProperties {
  // Prefer normalized position
  if (component.normalizedPosition) {
    const pos = component.normalizedPosition[breakpoint] || component.normalizedPosition.desktop
    return {
      position: 'absolute',
      left: `${pos.xPercent}%`,
      top: `${pos.yPercent}%`,
      width: `${pos.widthPercent}%`,
      height: `${pos.heightPercent}%`,
      zIndex: pos.zIndex,
      transform: pos.rotation ? `rotate(${pos.rotation}deg)` : undefined,
    }
  }

  // Fall back to legacy pixel position
  const pos = getEffectivePosition(component, breakpoint)
  return {
    position: 'absolute',
    left: `${pos.x}px`,
    top: `${pos.y}px`,
    width: `${pos.width}px`,
    height: `${pos.height}px`,
    zIndex: pos.zIndex,
    transform: pos.rotation ? `rotate(${pos.rotation}deg)` : undefined,
  }
}
