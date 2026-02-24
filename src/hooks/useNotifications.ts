'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { AuctionNotification } from '@/types/auction'

const POLL_INTERVAL = 15000 // 15 seconds for notifications

export function useNotifications(bidderId: string | null) {
  const [notifications, setNotifications] = useState<AuctionNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchNotifications = useCallback(async () => {
    if (!bidderId) return
    try {
      const res = await fetch('/api/auctions/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
        setUnreadCount(data.filter((n: AuctionNotification) => !n.read).length)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }, [bidderId])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Poll for new notifications
  useEffect(() => {
    if (!bidderId) return
    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [bidderId, fetchNotifications])

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/auctions/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notificationId }),
      })
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  return { notifications, unreadCount, markAsRead, refetch: fetchNotifications }
}
