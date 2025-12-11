'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Check, CheckCheck, Loader2, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import TopNav from '@/components/navigation/TopNav'
import MobileNav from '@/components/navigation/MobileNav'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Trophy, Users, Zap } from 'lucide-react'
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
  relatedUser?: {
    username: string
    avatar: string
  }
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
      return <Trophy className="text-success" size={24} />
    case 'challenge':
    case 'bet':
      return <Users className="text-primary-from" size={24} />
    case 'achievement':
      return <Trophy className="text-accent" size={24} />
    case 'reminder':
      return <Zap className="text-accent" size={24} />
    default:
      return <Bell size={24} className="text-white/60" />
  }
}

export default function NotificationsPage() {
  const router = useRouter()
  const { ready, authenticated, user } = usePrivy()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const unreadCount = notifications.filter(n => !n.read).length

  // Redirect if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/login')
    }
  }, [ready, authenticated, router])

  // Fetch notifications
  useEffect(() => {
    if (user?.id) {
      fetchNotifications()
    }
  }, [user?.id])

  const fetchNotifications = useCallback(async () => {
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
  }, [user?.id])

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

    setIsMarkingAll(true)
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
    } finally {
      setIsMarkingAll(false)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  if (!ready || isLoading) {
    return (
      <div className="min-h-screen bg-background-dark">
        <TopNav />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-primary-from" size={48} />
            <p className="text-white/70">Loading notifications...</p>
          </div>
        </div>
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-dark pb-20">
      <TopNav />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <ArrowLeft size={18} className="mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Bell size={24} className="text-white/80" />
                <h1 className="text-3xl font-bold font-display">Notifications</h1>
                {unreadCount > 0 && (
                  <Badge variant="danger" className="ml-2">
                    {unreadCount} unread
                  </Badge>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={markAllAsRead}
                disabled={isMarkingAll}
              >
                {isMarkingAll ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    Marking...
                  </>
                ) : (
                  <>
                    <CheckCheck size={16} className="mr-2" />
                    Mark all read
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Card variant="glass" className="p-12 text-center">
            <Bell size={64} className="mx-auto mb-4 opacity-50 text-white/40" />
            <h2 className="text-2xl font-bold mb-2">No notifications yet</h2>
            <p className="text-white/60 mb-6">
              You'll see notifications here when someone bets on your duels or when you win!
            </p>
            <Button onClick={() => router.push('/duels')}>
              Browse Duels
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                variant="glass"
                className={cn(
                  'p-5 hover:bg-white/5 transition-all cursor-pointer',
                  !notification.read && 'border-l-4 border-l-primary-from bg-primary-from/5'
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <h3 className={cn(
                          'font-semibold text-lg mb-1',
                          !notification.read && 'text-white'
                        )}>
                          {notification.title}
                        </h3>
                        {notification.relatedUser && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-xs font-bold">
                              {notification.relatedUser.username.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-white/60">
                              @{notification.relatedUser.username}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notification.read && (
                          <div className="w-3 h-3 bg-primary-from rounded-full" />
                        )}
                        {notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Already read, no action needed
                            }}
                            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                            title="Mark as unread"
                          >
                            <Check size={16} className="text-white/40" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-white/80 mb-3 leading-relaxed">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/50">
                        {notification.time}
                      </span>
                      {notification.actionUrl && (
                        <span className="text-xs text-primary-from">
                          View →
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      <MobileNav />
    </div>
  )
}

