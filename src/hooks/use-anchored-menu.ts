'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * One way to hang a menu off a control, for every dropdown in the admin.
 *
 * Two faults kept coming back, both from menus positioned by guesswork:
 *
 *   1. A menu that always opens downwards runs off the bottom of the window on
 *      the last rows of a table, taking its last items out of reach. Guessing
 *      whether to flip from a fixed pixel threshold does not help - a menu's
 *      height depends on its items, and the threshold is wrong for most of them.
 *   2. A menu positioned `absolute` inside a table is clipped by that table's
 *      own overflow, so it disappears behind the edge of the scroll area.
 *
 * So: position `fixed` (nothing can clip it), measure the menu once it is on
 * screen, flip it up only when it genuinely does not fit below AND there is
 * more room above, and clamp its height to the space that actually exists so
 * it always ends inside the window and scrolls internally instead of being cut
 * off. The anchor is followed on scroll and resize, because a fixed menu does
 * not move with the row it belongs to.
 *
 * Usage:
 *   const { anchorRef, menuRef, menuStyle } = useAnchoredMenu(open)
 *   <div ref={anchorRef}> <input …/> </div>
 *   {open && <ul ref={menuRef} style={menuStyle} className="z-50 …">…</ul>}
 *
 * Give the menu a z-index in its className; everything else comes from the
 * hook. Drop `absolute`/`fixed`, `w-full`, `mt-1` and `max-h-*` from the
 * className - the style supplies all four.
 */

export type AnchoredMenuAlign = 'stretch' | 'left' | 'right'

export type AnchoredMenuOptions = {
  /** stretch = match the anchor's width (pickers), left/right = hug that edge (action menus). */
  align?: AnchoredMenuAlign
  /** Space between anchor and menu. */
  gap?: number
  /** Space kept clear of the window edge. */
  edge?: number
  /** Never clamp shorter than this, even in a cramped window - scroll instead. */
  minHeight?: number
  /** Cap the menu's height regardless of available room. */
  maxHeight?: number
  /** Widen a stretched menu past a narrow control (a table cell, say). */
  minWidth?: number
  /** Anchor to an element the caller already holds a ref to - a search input it
   *  also focuses, or a control two menus share. */
  anchor?: React.RefObject<HTMLElement | null>
  /** Anchor to a point in the window instead of an element - a right-click menu. */
  point?: { x: number; y: number } | null
}

export function useAnchoredMenu<
  A extends HTMLElement = HTMLDivElement,
  M extends HTMLElement = HTMLElement,
>(open: boolean, options: AnchoredMenuOptions = {}) {
  const { align = 'stretch', gap = 4, edge = 8, minHeight = 120, maxHeight, minWidth = 0 } = options
  const ownAnchorRef = useRef<A>(null)
  const anchorRef = (options.anchor ?? ownAnchorRef) as React.RefObject<A>

  // A callback ref that still answers to .current: placement has to happen when the
  // menu element actually mounts, not when some `open` flag flips. Menus are often
  // rendered on a narrower condition than the flag ("open AND there are results"),
  // and a plain RefObject gives the hook no way to notice that second condition.
  const menuNode = useRef<M | null>(null)
  const [mounted, setMounted] = useState(false)
  const menuRef = useMemo(() => {
    const fn = ((node: M | null) => {
      menuNode.current = node
      setMounted(!!node)
    }) as React.RefCallback<M> & { readonly current: M | null }
    Object.defineProperty(fn, 'current', { get: () => menuNode.current })
    return fn
  }, [])
  // Hidden until measured, so the menu never paints at the wrong place first.
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({
    position: 'fixed', top: 0, left: 0, visibility: 'hidden',
  })
  // Placement is re-run by a ResizeObserver, so an unchanged result must not
  // produce a new object - that would re-render, re-measure and never settle.
  const lastStyle = useRef('')

  const point = options.point ?? null
  const pointX = point?.x
  const pointY = point?.y

  const place = useCallback(() => {
    const anchor = anchorRef.current
    const menu = menuNode.current
    if (!menu) return
    if (pointX === undefined || pointY === undefined) {
      if (!anchor) return
    }
    // A cursor point is just a zero-sized anchor, so everything below is shared.
    const r = pointX !== undefined && pointY !== undefined
      ? ({ top: pointY, bottom: pointY, left: pointX, right: pointX, width: 0 } as DOMRect)
      : anchor!.getBoundingClientRect()

    const below = Math.max(0, window.innerHeight - r.bottom - gap - edge)
    const above = Math.max(0, r.top - gap - edge)
    const needed = maxHeight ? Math.min(menu.scrollHeight, maxHeight) : menu.scrollHeight
    // Flip only when it truly does not fit below and there is more room above.
    const dropUp = needed > below && above > below
    // A cramped window would otherwise clamp the menu down to nothing; keep it
    // usable and let it scroll.
    const room = Math.max(dropUp ? above : below, Math.min(minHeight, window.innerHeight - 2 * edge))
    const height = Math.min(needed, room)

    const style: React.CSSProperties = {
      position: 'fixed',
      top: dropUp ? Math.max(edge, r.top - gap - height) : Math.min(r.bottom + gap, window.innerHeight - edge - height),
      maxHeight: room,
    }
    if (align === 'stretch') {
      // Match the control, but never hang off the right of the window.
      const width = Math.min(Math.max(r.width, minWidth), window.innerWidth - 2 * edge)
      style.width = width
      style.left = Math.max(edge, Math.min(r.left, window.innerWidth - edge - width))
    } else if (align === 'right') {
      style.right = Math.max(edge, window.innerWidth - r.right)
    } else {
      const width = menu.offsetWidth
      style.left = Math.max(edge, Math.min(r.left, window.innerWidth - edge - width))
    }
    const key = JSON.stringify(style)
    if (key === lastStyle.current) return
    lastStyle.current = key
    setMenuStyle(style)
  }, [anchorRef, align, gap, edge, minHeight, maxHeight, minWidth, pointX, pointY])

  useEffect(() => {
    if (!open || !mounted) {
      lastStyle.current = ''
      setMenuStyle({ position: 'fixed', top: 0, left: 0, visibility: 'hidden' })
      return
    }
    place()
    const onMove = () => place()
    // Capture phase: the anchor may sit in any scrolling container, not just the window.
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    // Its own contents move too - a filtered list grows and shrinks as you type.
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onMove)
    if (ro && menuNode.current) ro.observe(menuNode.current)
    return () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
      ro?.disconnect()
    }
  }, [open, mounted, place])

  return { anchorRef, menuRef, menuStyle, reposition: place }
}
