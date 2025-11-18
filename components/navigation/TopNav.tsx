'use client'

import { Search, Bell, Wallet } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import Button from '@/components/ui/Button'

export default function TopNav() {
  const router = useRouter()
  const { ready, authenticated, user, login, logout } = usePrivy()
  
  const handleWalletClick = () => {
    if (authenticated) {
      // User is logged in, show profile or logout option
      return
    }
    router.push('/login')
  }
  
  return (
    <nav className="sticky top-0 z-40 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <motion.div 
          className="text-2xl font-bold gradient-text cursor-pointer"
          whileHover={{ scale: 1.05 }}
          onClick={() => router.push('/')}
        >
          PredictDuel
        </motion.div>
        
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Search size={20} className="text-white/80" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Bell size={20} className="text-white/80" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
          </motion.button>
          
          {ready && (
            authenticated ? (
              <div className="flex items-center gap-3">
                <div className="text-sm text-white/80">
                  {user?.wallet?.address ? `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}` : 'Connected'}
                </div>
                <Button size="sm" variant="ghost" onClick={logout}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="secondary" onClick={handleWalletClick}>
                <Wallet size={16} className="mr-2" />
                Connect Wallet
              </Button>
            )
          )}
        </div>
      </div>
    </nav>
  )
}

