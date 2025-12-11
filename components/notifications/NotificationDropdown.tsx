'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Trophy, Zap, Users, Check, Loader2 } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: 'win' | 'challenge' | 'reminder' | 'achievement' | 'system' | 'bet'
  title: string
  message: string
  time: string
  read: boolean
  actionUrl?: string
  createdAt?: string
}

interface NotificationDropdownProps {
  isOpen: boolean
  onClose: () => void
  onUnreadCountChange?: (count: number) => void
}

// Helper function to format time ago
const formatTimeAgo = (date: string | Date): string => {
  const now = new Date()
  const past = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)

  if (diffInSeconds < 60) return `${diffInSeconds}s ago`
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return past.toLocaleDateString()
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'win':
      return <Trophy className="text-success" size={20} />
    case 'challenge':
    case 'bet':
      return <Users className="text-primary-from" size={20} />
    case 'achievement':
      return <Trophy className="text-accent" size={20} />
    case 'reminder':
      return <Zap className="text-accent" size={20} />
    default:
      return <Bell size={20} />
  }
}

export default function NotificationDropdown({ isOpen, onClose, onUnreadCountChange }: NotificationDropdownProps) {
  const { user } = usePrivy()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const unreadCount = notifications.filter(n => !n.read).length

  // Notify parent of unread count changes
  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(unreadCount)
    }
  }, [unreadCount, onUnreadCountChange])

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchNotifications()
    }
  }, [isOpen, user?.id])

  const fetchNotifications = async () => {
    if (!user?.id) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/notifications?privyId=${user.id}`)
      const data = await response.json()

      if (response.ok && data.notifications) {
        // Format notifications with time ago
        const formatted = data.notifications.map((notif: any) => ({
          ...notif,
          time: formatTimeAgo(notif.createdAt || new Date()),
        }))
        setNotifications(formatted)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const markAsRead = async (id: string) => {
    if (!user?.id) return

    // Optimistically update UI
    setNotifications(prev =>
      prev.map(notif => notif.id === id ? { ...notif, read: true } : notif)
    )

    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privyId: user.id,
          notificationId: id,
        }),
      })
    } catch (error) {
      console.error('Error marking notification as read:', error)
      // Revert on error
      fetchNotifications()
    }
  }

  const markAllAsRead = async () => {
    if (!user?.id) return

    // Optimistically update UI
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })))

    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privyId: user.id,
          markAll: true,
        }),
      })
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      // Revert on error
      fetchNotifications()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        />
        
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-16 right-4 w-96 max-w-[calc(100vw-2rem)] z-10"
        >
          <Card variant="glass" className="p-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Bell size={20} className="text-white/80" />
                <h3 className="font-bold text-lg">Notifications</h3>
                {unreadCount > 0 && (
                  <Badge variant="danger" className="ml-2">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-primary-from hover:text-primary-to transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X size={18} className="text-white/80" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center text-white/60">
                  <Loader2 className="mx-auto mb-4 animate-spin" size={32} />
                  <p>Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-white/60">
                  <Bell size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        'p-4 hover:bg-white/5 transition-colors cursor-pointer relative',
                        !notification.read && 'bg-primary-from/5'
                      )}
                      onClick={() => {
                        if (!notification.read) {
                          markAsRead(notification.id)
                        }
                        if (notification.actionUrl) {
                          router.push(notification.actionUrl)
                          onClose()
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className={cn(
                              'font-semibold text-sm',
                              !notification.read && 'text-white'
                            )}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary-from rounded-full flex-shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-sm text-white/70 mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                          <span className="text-xs text-white/50">
                            {notification.time}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-white/10 text-center">
                <button
                  onClick={() => {
                    router.push('/notifications')
                    onClose()
                  }}
                  className="text-sm text-primary-from hover:text-primary-to transition-colors"
                >
                  View All Notifications
                </button>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

