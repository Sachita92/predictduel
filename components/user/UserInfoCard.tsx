'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Wallet, Copy, Check, ExternalLink, Loader2 } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { getWalletAddress } from '@/lib/privy-helpers'
import { APP_BLOCKCHAIN, getAppCurrency, getExplorerUrl } from '@/lib/blockchain-config'
import { getWalletBalance, formatBalance } from '@/lib/wallet-balance'

interface UserProfile {
  username: string
  stats: {
    wins: number
    losses: number
    totalEarned: number
    winRate: number
  }
}

export default function UserInfoCard() {
  const router = useRouter()
  const { authenticated, user, ready } = usePrivy()
  const [balance, setBalance] = useState<number | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [copied, setCopied] = useState(false)
  
  const walletAddress = getWalletAddress(user, APP_BLOCKCHAIN)
  const currency = getAppCurrency()

  // Fetch wallet balance
  useEffect(() => {
    if (walletAddress) {
      fetchBalance()
    }
  }, [walletAddress])

  // Fetch user profile
  useEffect(() => {
    if (user?.id) {
      fetchProfile()
    }
  }, [user?.id])

  const fetchBalance = async () => {
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
  }

  const fetchProfile = async () => {
    try {
      setLoadingProfile(true)
      const response = await fetch(`/api/profile?privyId=${user?.id}`)
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
  }

  const createProfile = async () => {
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privyId: user?.id,
          walletAddress: walletAddress,
          username: `user_${walletAddress?.slice(0, 8)}`,
        }),
      })

      if (response.ok) {
        await fetchProfile()
      }
    } catch (error) {
      console.error('Error creating profile:', error)
    }
  }

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!ready || !authenticated) {
    return null
  }

  return (
    <Card variant="glass" className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold glow-effect">
            {profile?.username ? profile.username.charAt(0).toUpperCase() : <User size={28} />}
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {loadingProfile ? (
                <span className="text-white/50">Loading...</span>
              ) : (
                `@${profile?.username || 'Anonymous'}`
              )}
            </h2>
            <p className="text-sm text-white/60">Welcome back!</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => router.push('/profile')}
        >
          View Profile
        </Button>
      </div>

      {/* Wallet Address */}
      <div className="mb-6 p-4 bg-white/5 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/60 flex items-center gap-2">
            <Wallet size={16} />
            Wallet Address
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAddress}
              className="text-primary-from hover:text-primary-to transition-colors p-1"
              title="Copy address"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            {walletAddress && (
              <a
                href={getExplorerUrl(walletAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-from hover:text-primary-to transition-colors p-1"
                title="View on explorer"
              >
                <ExternalLink size={16} />
              </a>
            )}
          </div>
        </div>
        <p className="font-mono text-sm text-white/90 break-all">
          {walletAddress ? (
            <span>
              {walletAddress.slice(0, 12)}...{walletAddress.slice(-12)}
            </span>
          ) : (
            'No wallet connected'
          )}
        </p>
      </div>

      {/* Balance & Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Balance */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-4 bg-gradient-to-br from-primary-from/20 to-primary-to/20 rounded-lg border border-primary-from/30"
        >
          <div className="flex items-center gap-2 text-sm text-white/60 mb-2">
            <Wallet size={14} />
            <span>Balance</span>
          </div>
          {loadingBalance ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary-from" />
          ) : (
            <>
              <div className="text-2xl font-bold gradient-text">
                {balance !== null ? formatBalance(balance) : '0'}
              </div>
              <div className="text-xs text-white/50 mt-1">{currency}</div>
            </>
          )}
        </motion.div>

        {/* Win Rate */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-4 bg-gradient-to-br from-success/20 to-green-500/20 rounded-lg border border-success/30"
        >
          <div className="text-sm text-white/60 mb-2">Win Rate</div>
          {loadingProfile ? (
            <Loader2 className="w-6 h-6 animate-spin text-success" />
          ) : (
            <>
              <div className="text-2xl font-bold text-success">
                {profile ? Math.round(profile.stats.winRate * 100) : 0}%
              </div>
              <div className="text-xs text-white/50 mt-1">
                {profile?.stats.wins || 0}W - {profile?.stats.losses || 0}L
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Total Earned */}
      <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-white/60 mb-1">Total Earned</div>
            {loadingProfile ? (
              <Loader2 className="w-5 h-5 animate-spin text-yellow-400" />
            ) : (
              <div className="text-xl font-bold text-yellow-400">
                {profile?.stats.totalEarned.toFixed(4) || '0.0000'} {currency}
              </div>
            )}
          </div>
          <Badge variant="warning" className="text-2xl">
            💰
          </Badge>
        </div>
      </div>
    </Card>
  )
}

