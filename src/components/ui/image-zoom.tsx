'use client'

import { useEffect, useState } from 'react'

interface ImageWithZoomProps {
  src: string
  alt: string
  className?: string
  style?: React.CSSProperties
  imgClassName?: string
  imgStyle?: React.CSSProperties
  wrapperClassName?: string
  wrapperStyle?: React.CSSProperties
  wrapperId?: string
}

export function ImageWithZoom({
  src,
  alt,
  className,
  style,
  imgClassName,
  imgStyle,
  wrapperClassName,
  wrapperStyle,
  wrapperId,
}: ImageWithZoomProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Image wrapper — preserves all original sizing */}
      <div
        id={wrapperId}
        className={`relative group ${wrapperClassName || ''}`}
        style={wrapperStyle}
      >
        <div className={className} style={style}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className={imgClassName} style={imgStyle} />
        </div>

        {/* Spyglass button — top-right corner */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Enlarge image"
          className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 hover:bg-white hover:scale-110 z-10"
        >
          <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
      </div>

      {/* Lightbox modal */}
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.88)' }}
          onClick={() => setOpen(false)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-colors z-10"
            title="Close (Esc)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Zoomed image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="rounded-xl shadow-2xl object-contain select-none"
            style={{ maxHeight: '88vh', maxWidth: '88vw' }}
          />

          {/* Hint */}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs select-none">
            Click outside or press Esc to close
          </p>
        </div>
      )}
    </>
  )
}
