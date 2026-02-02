'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Wallet, Copy, Check, ExternalLink, Loader2, LogOut, TrendingUp } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { getWalletAddress } from '@/lib/privy-helpers'
import { APP_BLOCKCHAIN, getAppCurrency, getExplorerUrl } from '@/lib/blockchain-config'
import { getWalletBalance, formatBalance } from '@/lib/wallet-balance'

interface UserProfile {
  username: string
  name?: string
  avatar?: string
  stats: {
    wins: number
    losses: number
    totalEarned: number
    winRate: number
  }
}

interface ProfileDropdownProps {
  isOpen: boolean
  onClose: () => void
}

export default function ProfileDropdown({ isOpen, onClose }: ProfileDropdownProps) {
  const router = useRouter()
  const { user, logout } = usePrivy()
  const [balance, setBalance] = useState<number | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [copied, setCopied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const walletAddress = getWalletAddress(user, APP_BLOCKCHAIN)
  const currency = getAppCurrency()

  // Close dropdown when clicking outside
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

  const createProfile = useCallback(async () => {
    if (!user?.id || !walletAddress) return
    
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privyId: user.id,
          walletAddress: walletAddress,
          username: `user_${walletAddress.slice(0, 8)}`,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          setProfile(data.user)
        }
      }
    } catch (error) {
      console.error('Error creating profile:', error)
    }
  }, [user?.id, walletAddress])

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) return
    
    try {
      setLoadingBalance(true)
      const bal = await getWalletBalance(walletAddress)
      setBalance(bal)
    } catch (error) {
      console.error('Error fetching balance:', error)
    } finally {
      setLoadingBalance(false)
    }
  }, [walletAddress])

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return
    
    try {
      setLoadingProfile(true)
      const response = await fetch(`/api/profile?privyId=${user.id}`)
      const data = await response.json()
      
      if (data.user) {
        setProfile(data.user)
      } else {
        // Auto-create profile if it doesn't exist
        await createProfile()
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoadingProfile(false)
    }
  }, [user?.id, createProfile])

  // Fetch wallet balance
  useEffect(() => {
    if (walletAddress && isOpen) {
      fetchBalance()
    }
  }, [walletAddress, isOpen, fetchBalance])

  // Fetch user profile
  useEffect(() => {
    if (user?.id && isOpen) {
      fetchProfile()
    }
  }, [user?.id, isOpen, fetchProfile])

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleViewProfile = () => {
    onClose()
    router.push('/profile')
  }

  const handleLogout = () => {
    onClose()
    logout()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          
          {/* Dropdown */}
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-4 top-16 z-50 w-80 glass rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-primary-from/20 to-primary-to/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-xl font-bold overflow-hidden">
                  {profile?.avatar ? (
                    <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    profile?.name ? profile.name.charAt(0).toUpperCase() : profile?.username?.charAt(0).toUpperCase() || <User size={20} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {loadingProfile ? (
                    <div className="h-5 w-24 bg-white/10 rounded animate-pulse" />
                  ) : (
                    <>
                      {profile?.name && (
                        <div className="font-bold text-white truncate">{profile.name}</div>
                      )}
                      <div className="text-sm text-white/70 truncate">
                        @{profile?.username || 'Anonymous'}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Wallet Address */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/60 flex items-center gap-1">
                  <Wallet size={12} />
                  Wallet Address
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title="Copy address"
                  >
                    {copied ? <Check size={14} className="text-success" /> : <Copy size={14} className="text-white/60" />}
                  </button>
                  {walletAddress && (
                    <a
                      href={getExplorerUrl(walletAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      title="View on explorer"
                    >
                      <ExternalLink size={14} className="text-white/60" />
                    </a>
                  )}
                </div>
              </div>
              <p className="font-mono text-xs text-white/90 break-all">
                {walletAddress ? (
                  <span>{walletAddress.slice(0, 16)}...{walletAddress.slice(-16)}</span>
                ) : (
                  'No wallet connected'
                )}
              </p>
            </div>

            {/* Stats */}
            <div className="p-4 space-y-3">
              {/* Balance */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary-from/10 to-primary-to/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-primary-from" />
                  <span className="text-sm text-white/80">Balance</span>
                </div>
                {loadingBalance ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary-from" />
                ) : (
                  <div className="text-right">
                    <div className="font-bold gradient-text">
                      {balance !== null ? formatBalance(balance) : '0'}
                    </div>
                    <div className="text-xs text-white/50">{currency}</div>
                  </div>
                )}
              </div>

              {/* Win Rate */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-success/10 to-green-500/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-success" />
                  <span className="text-sm text-white/80">Win Rate</span>
                </div>
                {loadingProfile ? (
                  <Loader2 className="w-4 h-4 animate-spin text-success" />
                ) : (
                  <div className="text-right">
                    <div className="font-bold text-success">
                      {profile ? Math.round(profile.stats.winRate * 100) : 0}%
                    </div>
                    <div className="text-xs text-white/50">
                      {profile?.stats.wins || 0}W - {profile?.stats.losses || 0}L
                    </div>
                  </div>
                )}
              </div>

              {/* Total Earned */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg">
                <span className="text-sm text-white/80">Total Earned</span>
                {loadingProfile ? (
                  <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                ) : (
                  <div className="text-right">
                    <div className="font-bold text-yellow-400">
                      {profile?.stats.totalEarned.toFixed(4) || '0.0000'}
                    </div>
                    <div className="text-xs text-white/50">{currency}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 pt-0 space-y-2">
              <Button 
                onClick={handleViewProfile}
                className="w-full"
                variant="primary"
              >
                <User size={16} className="mr-2" />
                View Full Profile
              </Button>
              <Button 
                onClick={handleLogout}
                className="w-full"
                variant="ghost"
              >
                <LogOut size={16} className="mr-2" />
                Disconnect
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

