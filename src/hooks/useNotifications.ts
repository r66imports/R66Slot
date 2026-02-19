'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { AuctionNotification } from '@/types/auction'

export function useNotifications(bidderId: string | null) {
  const [notifications, setNotifications] = useState<AuctionNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

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

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!bidderId) return

    const channel = supabase
      .channel(`notifications-${bidderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `bidder_id=eq.${bidderId}`,
        },
        (payload) => {
          const newNotification = payload.new as AuctionNotification
          setNotifications(prev => [newNotification, ...prev])
          setUnreadCount(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [bidderId])

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
