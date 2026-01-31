'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

export type AnimationType = 'none' | 'fade-in' | 'slide-up' | 'slide-left' | 'slide-right' | 'zoom-in' | 'bounce'

interface AnimatedWrapperProps {
  children: ReactNode
  animation: AnimationType
  duration?: number
  delay?: number
}

const ANIMATION_CLASSES: Record<AnimationType, string> = {
  'none': '',
  'fade-in': 'animate-fadeIn',
  'slide-up': 'animate-slideUp',
  'slide-left': 'animate-slideLeft',
  'slide-right': 'animate-slideRight',
  'zoom-in': 'animate-zoomIn',
  'bounce': 'animate-bounce-custom',
}

export function AnimatedWrapper({ children, animation, duration = 0.6, delay = 0 }: AnimatedWrapperProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (animation === 'none') {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [animation])

  if (animation === 'none') {
    return <>{children}</>
  }

  const animClass = ANIMATION_CLASSES[animation] || ''

  return (
    <div
      ref={ref}
      className={isVisible ? animClass : ''}
      style={{
        opacity: isVisible ? undefined : 0,
        '--anim-duration': `${duration}s`,
        '--anim-delay': `${delay}s`,
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
