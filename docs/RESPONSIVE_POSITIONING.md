# Responsive Positioning System

This document explains the percentage-based positioning system for the freeform editor, which ensures elements stay in place across Desktop, Tablet, and Mobile breakpoints.

## Overview

The new system converts absolute pixel values to **normalized percentages** relative to a fixed-width "Design Canvas". This ensures:

1. **Consistent proportions** across all breakpoints
2. **Zoom-to-fit** for smaller viewports
3. **Per-breakpoint customization** when needed
4. **Backwards compatibility** with legacy pixel positions

## Design Canvas Dimensions

```typescript
const DESIGN_CANVAS = {
  desktop: { width: 1200, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
}
```

## Normalized Position Format

```typescript
interface NormalizedPosition {
  xPercent: number      // 0-100, position from left edge
  yPercent: number      // 0-100, position from top edge
  widthPercent: number  // 0-100, element width
  heightPercent: number // 0-100, element height
  zIndex: number        // Layer order
  rotation: number      // Degrees
}

interface ResponsivePositionData {
  desktop: NormalizedPosition
  tablet?: NormalizedPosition
  mobile?: NormalizedPosition
}
```

## Usage Examples

### 1. Basic React Component Integration

```tsx
import { FreeformElement } from '@/components/page-editor/freeform-element'
import type { Breakpoint } from '@/lib/editor/responsive-positioning'

function MyEditor() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop')

  const handlePositionChange = (
    componentId: string,
    normalizedPosition: ResponsivePositionData
  ) => {
    // Update component in your state management
    updateComponent(componentId, { normalizedPosition })
  }

  return (
    <div className="responsive-canvas" data-breakpoint={breakpoint}>
      {components.map((component) => (
        <FreeformElement
          key={component.id}
          component={component}
          breakpoint={breakpoint}
          isSelected={selectedId === component.id}
          snapEnabled={true}
          gridPercent={5}
          onSelect={() => setSelectedId(component.id)}
          onPositionChange={(positions) =>
            handlePositionChange(component.id, positions)
          }
        />
      ))}
    </div>
  )
}
```

### 2. Converting Legacy Pixel Positions

```typescript
import {
  pixelsToNormalized,
  migrateLegacyPosition,
} from '@/lib/editor/responsive-positioning'

// Single position
const legacyPosition = { x: 240, y: 160, width: 300, height: 200 }
const normalized = pixelsToNormalized(legacyPosition, 'desktop')
// Result: { xPercent: 20, yPercent: 20, widthPercent: 25, heightPercent: 25, ... }

// Per-breakpoint positions
const legacyByView = {
  desktop: { x: 240, y: 160, width: 300, height: 200 },
  tablet: { x: 100, y: 100, width: 400, height: 200 },
}
const migratedPositions = migrateLegacyPosition(legacyByView)
```

### 3. Using the Responsive Canvas Component

```tsx
import {
  ResponsiveCanvas,
  ResponsiveElement,
} from '@/components/page-editor/responsive-canvas'

function AdvancedEditor() {
  return (
    <ResponsiveCanvas
      breakpoint="desktop"
      mode="zoom-to-fit"
      showGrid={true}
      gridPercent={5}
      snapEnabled={true}
      backgroundColor="#ffffff"
      onCanvasClick={() => setSelectedId(null)}
    >
      <ResponsiveElement
        id="element-1"
        positions={{
          desktop: {
            xPercent: 10,
            yPercent: 10,
            widthPercent: 30,
            heightPercent: 25,
            zIndex: 10,
            rotation: 0,
          },
        }}
        breakpoint="desktop"
        isSelected={true}
        onSelect={() => {}}
        onPositionChange={(bp, pos) => console.log(bp, pos)}
      >
        <div className="bg-blue-500 p-4 text-white">
          My Element Content
        </div>
      </ResponsiveElement>
    </ResponsiveCanvas>
  )
}
```

### 4. Zoom-to-Fit Strategy

For freeform layouts, the "zoom-to-fit" approach scales the entire canvas to fit the viewport:

```typescript
import { calculateZoomScale } from '@/lib/editor/responsive-positioning'

// Calculate scale factor
const viewportWidth = window.innerWidth
const designWidth = 1200 // Desktop canvas width
const scale = calculateZoomScale(viewportWidth, designWidth)
// If viewport is 900px: scale = 0.75 (75%)

// Apply to canvas
const canvasStyles = {
  width: `${designWidth}px`,
  transform: `scale(${scale})`,
  transformOrigin: 'top left',
}
```

### 5. CSS Custom Properties Approach

```css
/* Element positioned using CSS variables */
.pos-percent {
  position: absolute;
  left: var(--el-x, 0%);
  top: var(--el-y, 0%);
  width: var(--el-w, auto);
  height: var(--el-h, auto);
  z-index: var(--el-z, 1);
  transform: rotate(var(--el-rotate, 0deg));
}
```

```tsx
import { positionToCSSVars } from '@/lib/editor/position-migration'

const cssVars = positionToCSSVars(normalizedPosition)
// { '--el-x': '20%', '--el-y': '15%', '--el-w': '30%', '--el-h': '25%', ... }

<div className="pos-percent" style={cssVars}>
  Content
</div>
```

## Responsive Strategies

### 1. Percentage Mode (Default)
Elements use percentage-based positioning. They maintain their relative position and size as the viewport changes.

**Best for:** Layouts that should reflow naturally

### 2. Zoom-to-Fit Mode
The entire canvas scales down to fit the viewport while maintaining exact proportions.

**Best for:** Design-heavy freeform layouts where exact placement matters

### 3. Stack Mode
Elements stack vertically on mobile, ignoring their freeform positions.

**Best for:** Content-heavy pages that need to be readable on mobile

## JSON Schema

The updated `PageComponent` schema supports both legacy and normalized positions:

```typescript
interface PageComponent {
  // ... other fields ...

  // Position mode
  positionMode?: 'flow' | 'absolute'

  // Legacy (deprecated)
  position?: { x, y, width, height, zIndex?, rotation? }
  positionByView?: { desktop?, tablet?, mobile? }

  // NEW: Normalized percentage-based position
  normalizedPosition?: {
    desktop: NormalizedPosition
    tablet?: NormalizedPosition
    mobile?: NormalizedPosition
  }

  // Responsive strategy
  responsiveStrategy?: 'percentage' | 'zoom-to-fit' | 'stack'
}
```

## Migration Guide

### Automatic Migration

Components with legacy positions are automatically migrated when rendered:

```typescript
import { migrateComponentPosition } from '@/lib/editor/position-migration'

// Automatically migrates if needed
const migratedComponent = migrateComponentPosition(legacyComponent)
```

### Manual Migration

```typescript
import { migratePageComponents } from '@/lib/editor/position-migration'

// Migrate all components in a page
const migratedComponents = migratePageComponents(page.components)
```

## Fabric.js Integration

The Fabric.js-based Wix Studio editor now also uses percentage-based positioning:

```javascript
// In public/wix-studio/script.js

// Convert to percentages
const normalized = pixelsToPercent(obj, 'desktop')

// Apply percentages to object
applyNormalizedPosition(obj, normalized, 'tablet')

// Export for React integration
const json = window.exportNormalizedData()
```

## File Structure

```
src/
├── lib/editor/
│   ├── responsive-positioning.ts  # Core utilities
│   └── position-migration.ts      # Migration helpers
├── components/page-editor/
│   ├── responsive-canvas.tsx      # Canvas component
│   └── freeform-element.tsx       # Element component
└── styles/
    └── responsive-canvas.css      # CSS classes

public/wix-studio/
└── script.js                      # Fabric.js editor (updated)
```

## Best Practices

1. **Always use normalized positions** for new components
2. **Let migration happen automatically** for existing components
3. **Use zoom-to-fit** for design-heavy freeform layouts
4. **Store per-breakpoint positions** only when the user explicitly customizes them
5. **Fall back to desktop** when tablet/mobile positions aren't set
