'use client'

import { useMemo, useEffect, useState } from 'react'
import type { PageComponent } from '@/lib/pages/schema'
import type { Breakpoint } from '@/lib/editor/responsive-positioning'
import { getPositionForBreakpoint } from '@/lib/editor/responsive-positioning'

interface SpacingGuidesProps {
  draggingId: string | null
  components: PageComponent[]
  breakpoint: Breakpoint
  canvasRef: React.RefObject<HTMLDivElement>
}

interface GuideRect {
  left: number
  top: number
  right: number
  bottom: number
}

interface Guide {
  type: 'h' | 'v'
  x: number    // start x (canvas px)
  y: number    // start y (canvas px)
  length: number // gap in canvas px
}

function toRect(comp: PageComponent, breakpoint: Breakpoint, cw: number, ch: number): GuideRect | null {
  if (!comp.normalizedPosition) return null
  const pos = getPositionForBreakpoint(comp.normalizedPosition, breakpoint)
  return {
    left: (pos.xPercent / 100) * cw,
    top: (pos.yPercent / 100) * ch,
    right: ((pos.xPercent + pos.widthPercent) / 100) * cw,
    bottom: ((pos.yPercent + pos.heightPercent) / 100) * ch,
  }
}

function computeGuides(
  dragging: GuideRect,
  others: GuideRect[],
): Guide[] {
  const guides: Guide[] = []

  for (const o of others) {
    // ── Horizontal gap (side-by-side) — requires vertical overlap ──
    const overlapYMin = Math.max(dragging.top, o.top)
    const overlapYMax = Math.min(dragging.bottom, o.bottom)

    if (overlapYMin < overlapYMax) {
      const midY = (overlapYMin + overlapYMax) / 2

      if (o.left >= dragging.right) {
        const gap = o.left - dragging.right
        if (gap > 0) guides.push({ type: 'h', x: dragging.right, y: midY, length: gap })
      } else if (dragging.left >= o.right) {
        const gap = dragging.left - o.right
        if (gap > 0) guides.push({ type: 'h', x: o.right, y: midY, length: gap })
      }
    }

    // ── Vertical gap (stacked) — requires horizontal overlap ──
    const overlapXMin = Math.max(dragging.left, o.left)
    const overlapXMax = Math.min(dragging.right, o.right)

    if (overlapXMin < overlapXMax) {
      const midX = (overlapXMin + overlapXMax) / 2

      if (o.top >= dragging.bottom) {
        const gap = o.top - dragging.bottom
        if (gap > 0) guides.push({ type: 'v', x: midX, y: dragging.bottom, length: gap })
      } else if (dragging.top >= o.bottom) {
        const gap = dragging.top - o.bottom
        if (gap > 0) guides.push({ type: 'v', x: midX, y: o.bottom, length: gap })
      }
    }
  }

  return guides
}

// ─── Horizontal spacing indicator ───
function HGuide({ x, y, length }: { x: number; y: number; length: number }) {
  const px = Math.round(length)
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: length,
        pointerEvents: 'none',
        transform: 'translateY(-50%)',
      }}
    >
      {/* Line */}
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: '#e91e8c', transform: 'translateY(-50%)' }} />
      {/* Left tick */}
      <div style={{ position: 'absolute', left: 0, top: '50%', width: 1, height: 8, backgroundColor: '#e91e8c', transform: 'translateY(-50%)' }} />
      {/* Right tick */}
      <div style={{ position: 'absolute', right: 0, top: '50%', width: 1, height: 8, backgroundColor: '#e91e8c', transform: 'translateY(-50%)' }} />
      {/* Label */}
      {px > 4 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#e91e8c',
          color: '#fff',
          fontSize: 10,
          fontFamily: 'monospace',
          fontWeight: 600,
          padding: '1px 4px',
          borderRadius: 3,
          whiteSpace: 'nowrap',
          lineHeight: '14px',
        }}>
          {px}px
        </div>
      )}
    </div>
  )
}

// ─── Vertical spacing indicator ───
function VGuide({ x, y, length }: { x: number; y: number; length: number }) {
  const px = Math.round(length)
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        height: length,
        pointerEvents: 'none',
        transform: 'translateX(-50%)',
      }}
    >
      {/* Line */}
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: '#e91e8c', transform: 'translateX(-50%)' }} />
      {/* Top tick */}
      <div style={{ position: 'absolute', top: 0, left: '50%', width: 8, height: 1, backgroundColor: '#e91e8c', transform: 'translateX(-50%)' }} />
      {/* Bottom tick */}
      <div style={{ position: 'absolute', bottom: 0, left: '50%', width: 8, height: 1, backgroundColor: '#e91e8c', transform: 'translateX(-50%)' }} />
      {/* Label */}
      {px > 4 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#e91e8c',
          color: '#fff',
          fontSize: 10,
          fontFamily: 'monospace',
          fontWeight: 600,
          padding: '1px 4px',
          borderRadius: 3,
          whiteSpace: 'nowrap',
          lineHeight: '14px',
        }}>
          {px}px
        </div>
      )}
    </div>
  )
}

// ─── Main SpacingGuides component ───
export function SpacingGuides({ draggingId, components, breakpoint, canvasRef }: SpacingGuidesProps) {
  const [canvasDims, setCanvasDims] = useState({ w: 1200, h: 800 })

  useEffect(() => {
    const update = () => {
      if (!canvasRef.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      const zoom = parseFloat(canvasRef.current.getAttribute('data-zoom') || '1')
      setCanvasDims({ w: rect.width / zoom, h: rect.height / zoom })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [canvasRef])

  const guides = useMemo(() => {
    if (!draggingId) return []

    const draggingComp = components.find(c => c.id === draggingId)
    if (!draggingComp) return []

    const { w, h } = canvasDims
    const draggingRect = toRect(draggingComp, breakpoint, w, h)
    if (!draggingRect) return []

    const otherRects = components
      .filter(c => c.id !== draggingId && c.positionMode === 'absolute' && c.normalizedPosition)
      .map(c => toRect(c, breakpoint, w, h))
      .filter((r): r is GuideRect => r !== null)

    return computeGuides(draggingRect, otherRects)
  }, [draggingId, components, breakpoint, canvasDims])

  if (!draggingId || guides.length === 0) return null

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9998 }}>
      {guides.map((g, i) =>
        g.type === 'h'
          ? <HGuide key={i} x={g.x} y={g.y} length={g.length} />
          : <VGuide key={i} x={g.x} y={g.y} length={g.length} />
      )}
    </div>
  )
}
