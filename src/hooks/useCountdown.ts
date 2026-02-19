'use client'

import { useState, useEffect, useRef } from 'react'

interface CountdownState {
  days: number
  hours: number
  minutes: number
  seconds: number
  total: number
  isExpired: boolean
  isUrgent: boolean
  display: string
}

export function useCountdown(endsAt: string): CountdownState {
  const [state, setState] = useState<CountdownState>({
    days: 0, hours: 0, minutes: 0, seconds: 0,
    total: 0, isExpired: false, isUrgent: false, display: '',
  })
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const endTime = new Date(endsAt).getTime()

    const tick = () => {
      const now = Date.now()
      const diff = endTime - now

      if (diff <= 0) {
        setState({
          days: 0, hours: 0, minutes: 0, seconds: 0,
          total: 0, isExpired: true, isUrgent: false, display: 'Ended',
        })
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      const isUrgent = diff <= 5 * 60 * 1000

      let display: string
      if (days > 0) display = `${days}d ${hours}h ${minutes}m`
      else if (hours > 0) display = `${hours}h ${minutes}m ${seconds}s`
      else if (minutes > 0) display = `${minutes}m ${seconds}s`
      else display = `${seconds}s`

      setState({ days, hours, minutes, seconds, total: diff, isExpired: false, isUrgent, display })
      rafRef.current = requestAnimationFrame(tick)
    }

    tick()
    return () => cancelAnimationFrame(rafRef.current)
  }, [endsAt])

  return state
}
