'use client'

import { useState, useCallback } from 'react'
import { Search, Bell, Wallet, User } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import Button from '@/components/ui/Button'
import SearchModal from '@/components/search/SearchModal'
import NotificationDropdown from '@/components/notifications/NotificationDropdown'
import ProfileDropdown from '@/components/user/ProfileDropdown'

export default function TopNav() {
  const router = useRouter()
  const { ready, authenticated, login } = usePrivy()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  
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
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Search size={20} className="text-white/80" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsNotificationsOpen(true)}
              className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Bell size={20} className="text-white/80" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full animate-pulse" />
            </motion.button>
            
            {ready ? (
              authenticated ? (
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(true)}
                  className="p-2 rounded-full gradient-primary hover:scale-110 transition-transform glow-effect"
                >
                  <User size={20} className="text-white" />
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
      
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <NotificationDropdown isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
      <ProfileDropdown isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  )
}

