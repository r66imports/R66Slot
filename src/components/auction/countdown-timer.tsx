'use client'

import { useState, useEffect, useRef } from 'react'

interface CountdownTimerProps {
  endsAt: string
  onExpired?: () => void
  className?: string
}

export default function CountdownTimer({ endsAt, onExpired, className = '' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const rafRef = useRef<number>(0)
  const onExpiredRef = useRef(onExpired)
  onExpiredRef.current = onExpired

  useEffect(() => {
    const endTime = new Date(endsAt).getTime()

    const tick = () => {
      const now = Date.now()
      const diff = endTime - now

      if (diff <= 0) {
        setTimeLeft('Ended')
        setIsExpired(true)
        onExpiredRef.current?.()
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setIsUrgent(diff <= 5 * 60 * 1000)

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`)
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`)
      } else {
        setTimeLeft(`${seconds}s`)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    tick()
    return () => cancelAnimationFrame(rafRef.current)
  }, [endsAt])

  return (
    <span
      className={`font-play font-bold ${
        isExpired
          ? 'text-gray-500'
          : isUrgent
          ? 'text-red-600 animate-pulse'
          : 'text-gray-900'
      } ${className}`}
    >
      {timeLeft}
    </span>
  )
}
