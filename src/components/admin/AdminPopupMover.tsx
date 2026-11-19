'use client'

/**
 * Makes every admin pop-up movable and resizable, so whatever is hidden behind
 * one can be seen without closing it. Mirrored verbatim between R66Slot and
 * R66Emporium; mounted once by AdminSkinMain.
 *
 * It works on the pop-ups as they already are — no page needs changing. A
 * pop-up is any overlay matching OVERLAY (the admin's `fixed inset-0 flex
 * items-center justify-center` pattern, or anything marked
 * data-movable-popup); its first child is the box.
 * • Drag: press on the top DRAG_ZONE px of the box (not on a button, input or
 *   link) and move. The box keeps its place until the pop-up closes.
 * • Resize: the corner handle at the bottom right (CSS resize).
 * • A drag or resize that ends outside the box would count as a click on the
 *   overlay and close the pop-up — that click is swallowed.
 *
 * Nothing is added to the box's DOM (React owns it); only inline styles are set.
 */

import { useEffect } from 'react'

const OVERLAY = '.fixed.inset-0.flex.items-center.justify-center, [data-movable-popup]'
const INTERACTIVE =
  'input, textarea, select, button, a, label, option, [role="button"], [role="slider"], [contenteditable="true"]'
const DRAG_ZONE = 48

export default function AdminPopupMover() {
  useEffect(() => {
    const done = new WeakSet<Element>()
    let pressedOverlay: Element | null = null

    const enhance = (overlay: HTMLElement) => {
      const box = overlay.firstElementChild as HTMLElement | null
      if (!box || done.has(box)) return
      done.add(box)
      const r = box.getBoundingClientRect()
      if (r.width < 160 || r.height < 80) return // spinners and toasts stay put

      // Fix the width it opened at, so `w-full max-w-md` boxes can be resized
      // past their class limits without jumping to full width.
      box.style.width = `${Math.round(r.width)}px`
      box.style.maxWidth = '96vw'
      box.style.maxHeight = '96vh'
      box.style.minWidth = '260px'
      box.style.minHeight = '120px'
      if (getComputedStyle(box).overflow === 'visible') box.style.overflow = 'auto'
      box.style.resize = 'both'

      let dx = 0
      let dy = 0
      let drag: { sx: number; sy: number; ox: number; oy: number; left: number; top: number; w: number } | null = null

      const inZone = (e: PointerEvent) => {
        const b = box.getBoundingClientRect()
        const t = e.target as Element
        return e.clientY - b.top <= DRAG_ZONE && !t.closest(INTERACTIVE)
      }

      box.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || !inZone(e)) return
        const b = box.getBoundingClientRect()
        drag = { sx: e.clientX, sy: e.clientY, ox: dx, oy: dy, left: b.left - dx, top: b.top - dy, w: b.width }
        box.setPointerCapture(e.pointerId)
        e.preventDefault()
      })
      box.addEventListener('pointermove', (e) => {
        if (!drag) {
          box.style.cursor = inZone(e) ? 'move' : ''
          return
        }
        // Keep the drag strip on screen so the box can always be grabbed back.
        const nx = drag.ox + e.clientX - drag.sx
        const ny = drag.oy + e.clientY - drag.sy
        const minX = 80 - drag.w - drag.left
        const maxX = window.innerWidth - 80 - drag.left
        const minY = -drag.top
        const maxY = window.innerHeight - DRAG_ZONE - drag.top
        dx = Math.min(maxX, Math.max(minX, nx))
        dy = Math.min(maxY, Math.max(minY, ny))
        // `translate` (not `transform`) so Tailwind transform classes keep working.
        box.style.translate = `${dx}px ${dy}px`
      })
      const end = () => {
        drag = null
      }
      box.addEventListener('pointerup', end)
      box.addEventListener('pointercancel', end)
    }

    const scan = () => document.querySelectorAll<HTMLElement>(OVERLAY).forEach(enhance)
    let queued = false
    const observer = new MutationObserver(() => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        scan()
      })
    })
    observer.observe(document.body, { childList: true, subtree: true })
    scan()

    // A press that starts inside a box and is released on the overlay must not
    // close the pop-up.
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element
      const overlay = t.closest?.(OVERLAY)
      pressedOverlay = overlay && overlay !== t && overlay.firstElementChild?.contains(t) ? overlay : null
    }
    const onClick = (e: MouseEvent) => {
      if (pressedOverlay && e.target === pressedOverlay) {
        e.stopPropagation()
        e.preventDefault()
      }
      pressedOverlay = null
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('click', onClick, true)
    return () => {
      observer.disconnect()
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('click', onClick, true)
    }
  }, [])

  return null
}
