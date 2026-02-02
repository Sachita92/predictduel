'use client'

import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
import { Search, Bell, Wallet, User } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import Button from '@/components/ui/Button'

interface UserProfile {
  username: string
  name?: string
  avatar?: string
}

// Lazy load heavy modals
const SearchModal = lazy(() => import('@/components/search/SearchModal'))
const NotificationDropdown = lazy(() => import('@/components/notifications/NotificationDropdown'))
const ProfileDropdown = lazy(() => import('@/components/user/ProfileDropdown'))

export default function TopNav() {
  const router = useRouter()
  const { ready, authenticated, login, user } = usePrivy()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  
  // Fetch initial unread count
  useEffect(() => {
    if (authenticated && user?.id) {
      fetch(`/api/notifications?privyId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.unreadCount !== undefined) {
            setUnreadCount(data.unreadCount)
          }
        })
        .catch(err => console.error('Error fetching unread count:', err))
    }
  }, [authenticated, user?.id])

  // Fetch user profile for avatar
  useEffect(() => {
    if (authenticated && user?.id) {
      fetch(`/api/profile?privyId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setProfile(data.user)
          }
        })
        .catch(err => console.error('Error fetching profile:', err))
    }
  }, [authenticated, user?.id])
  
  const handleWalletClick = useCallback(() => {
    if (authenticated) {
      // User is logged in, show profile dropdown
      setIsProfileOpen(true)
      return
    }
    router.push('/login')
  }, [authenticated, router])
  
  return (
    <>
      <nav className="sticky top-0 z-40 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold gradient-text cursor-pointer hover:opacity-80 transition-opacity">
            PredictDuel
          </Link>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-lg hover:bg-white/10 active:scale-95 transition-all duration-150"
            >
              <Search size={20} className="text-white/80" />
            </button>
            
            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="relative p-2 rounded-lg hover:bg-white/10 active:scale-95 transition-all duration-150"
            >
              <Bell size={20} className="text-white/80" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-danger rounded-full flex items-center justify-center text-xs font-bold px-1 animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            {ready ? (
              authenticated ? (
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(true)}
                  className="p-2 rounded-full gradient-primary hover:scale-110 transition-transform glow-effect overflow-hidden"
                >
                  {profile?.avatar ? (
                    <img src={profile.avatar} alt="Profile" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <User size={20} className="text-white" />
                  )}
                </button>
              ) : (
                <Button size="sm" variant="secondary" onClick={handleWalletClick}>
                  <Wallet size={16} className="mr-2" />
                  Connect Wallet
                </Button>
              )
            ) : (
              <Button size="sm" variant="secondary" onClick={handleWalletClick}>
                <Wallet size={16} className="mr-2" />
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </nav>
      
      {isSearchOpen && (
        <Suspense fallback={null}>
          <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </Suspense>
      )}
      {isNotificationsOpen && (
        <Suspense fallback={null}>
          <NotificationDropdown 
            isOpen={isNotificationsOpen} 
            onClose={() => setIsNotificationsOpen(false)}
            onUnreadCountChange={setUnreadCount}
          />
        </Suspense>
      )}
      {isProfileOpen && (
        <Suspense fallback={null}>
          <ProfileDropdown isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        </Suspense>
      )}
    </>
  )
}

