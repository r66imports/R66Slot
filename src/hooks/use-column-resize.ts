import { useState, useCallback } from 'react'

export function useColumnResize(key: string, defaults: Record<string, number>) {
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    try {
      const s = typeof window !== 'undefined' ? localStorage.getItem(`col:${key}`) : null
      return s ? { ...defaults, ...JSON.parse(s) } : { ...defaults }
    } catch { return { ...defaults } }
  })

  const setWidth = useCallback((col: string, w: number) => {
    setWidths(prev => {
      const next = { ...prev, [col]: w }
      try { localStorage.setItem(`col:${key}`, JSON.stringify(next)) } catch {}
      return next
    })
  }, [key])

  return { widths, setWidth }
}
