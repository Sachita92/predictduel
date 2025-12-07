'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Clock, Users, TrendingUp, Loader2, Filter } from 'lucide-react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import TopNav from '@/components/navigation/TopNav'
import MobileNav from '@/components/navigation/MobileNav'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { getWalletAddress } from '@/lib/privy-helpers'
import { APP_BLOCKCHAIN, getAppCurrency } from '@/lib/blockchain-config'
import { placeBetOnChain } from '@/lib/solana-bet'

interface Duel {
  id: string
  question: string
  category: string
  stake: number
  deadline: string
  status: string
  poolSize: number
  yesCount: number
  noCount: number
  creator: {
    id: string
    username: string
    avatar: string
    walletAddress: string
    privyId: string
  }
  participants: number
  createdAt: string
  marketPda?: string | null
}

const categories = ['All', 'Crypto', 'Weather', 'Sports', 'Meme', 'Local', 'Other']

export default function DuelsPage() {
  const router = useRouter()
  const { authenticated, user, ready } = usePrivy()
  const { wallets } = useWallets()
  const [duels, setDuels] = useState<Duel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [bettingDuelId, setBettingDuelId] = useState<string | null>(null)
  const [betError, setBetError] = useState<string | null>(null)
  const [betSuccess, setBetSuccess] = useState<string | null>(null)
  
  const walletAddress = getWalletAddress(user, APP_BLOCKCHAIN)
  const currency = getAppCurrency()

  useEffect(() => {
    fetchDuels()
  }, [selectedCategory])

  const fetchDuels = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const categoryParam = selectedCategory === 'All' ? '' : selectedCategory
      const url = `/api/duels?status=active${categoryParam ? `&category=${categoryParam}` : ''}`
      
      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch duels')
      }

      setDuels(data.duels || [])
    } catch (err) {
      console.error('Error fetching duels:', err)
      setError(err instanceof Error ? err.message : 'Failed to load duels')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBet = async (duelId: string, prediction: 'yes' | 'no') => {
    if (!user || !walletAddress) {
      setBetError('Please connect your wallet')
      return
    }
    
    const duel = duels.find(d => d.id === duelId)
    if (!duel) {
      setBetError('Duel not found')
      return
    }
    
    if (!duel.marketPda) {
      setBetError('This duel is not connected to Solana. Please contact support.')
      return
    }
    
    // Check if user is creator
    if (user.id && duel.creator.privyId === user.id) {
      setBetError('You cannot bet on your own duel')
      return
    }
    
    setBettingDuelId(duelId)
    setBetError(null)
    setBetSuccess(null)
    
    try {
      // Get Solana wallet provider
      let solanaProvider: any = null
      
      if (typeof window !== 'undefined' && (window as any).solana) {
        const provider = (window as any).solana
        if (provider.isPhantom || provider.isSolflare || provider.isBackpack) {
          if (provider.isConnected && provider.publicKey) {
            solanaProvider = provider
          } else {
            try {
              await provider.connect()
              solanaProvider = provider
            } catch (connectError) {
              console.error('Failed to connect wallet:', connectError)
            }
          }
        }
      }
      
      if (!solanaProvider && wallets.length > 0) {
        const solanaWallet = wallets.find((w: any) => 
          w.chainType === 'solana' || 
          (w.address && !w.address.startsWith('0x'))
        )
        
        if (solanaWallet && typeof window !== 'undefined' && (window as any).solana) {
          solanaProvider = (window as any).solana
        }
      }
      
      if (!solanaProvider) {
        throw new Error('No Solana wallet found. Please install and connect a Solana wallet like Phantom.')
      }
      
      // Place bet on-chain
      const onChainResult = await placeBetOnChain(solanaProvider, {
        marketPda: duel.marketPda,
        prediction: prediction === 'yes',
        stakeAmount: duel.stake,
      })
      
      // Update MongoDB
      const response = await fetch(`/api/duels/${duelId}/bet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privyId: user.id,
          prediction: prediction,
          stake: duel.stake,
          transactionSignature: onChainResult.signature,
          participantPda: onChainResult.participantPda,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to place bet')
      }
      
      setBetSuccess(`Bet placed successfully! ${prediction.toUpperCase()}`)
      
      // Refresh duels
      setTimeout(() => {
        fetchDuels()
        setBetSuccess(null)
      }, 2000)
      
    } catch (error) {
      console.error('Error placing bet:', error)
      setBetError(error instanceof Error ? error.message : 'Failed to place bet')
    } finally {
      setBettingDuelId(null)
    }
  }
  
  const handleViewDuel = (duelId: string) => {
    router.push(`/duel/${duelId}`)
  }

  const formatTimeRemaining = (deadline: string) => {
    const now = new Date()
    const end = new Date(deadline)
    const diff = end.getTime() - now.getTime()

    if (diff <= 0) return 'Ended'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Crypto: 'bg-yellow-500/20 text-yellow-400',
      Weather: 'bg-blue-500/20 text-blue-400',
      Sports: 'bg-green-500/20 text-green-400',
      Meme: 'bg-pink-500/20 text-pink-400',
      Local: 'bg-purple-500/20 text-purple-400',
      Other: 'bg-gray-500/20 text-gray-400',
    }
    return colors[category] || colors.Other
  }

  return (
    <div className="min-h-screen bg-background-dark pb-20">
      <TopNav />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 font-display gradient-text">
            Active Duels
          </h1>
          <p className="text-white/70">
            Browse and predict on duels created by other users
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedCategory === category
                  ? 'gradient-primary text-white'
                  : 'bg-white/5 hover:bg-white/10 text-white/70'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-primary-from" size={48} />
              <p className="text-white/70">Loading duels...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Card variant="glass" className="p-8 text-center">
            <p className="text-danger mb-4">{error}</p>
            <Button onClick={fetchDuels} variant="secondary">
              Try Again
            </Button>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && duels.length === 0 && (
          <Card variant="glass" className="p-12 text-center">
            <div className="text-6xl mb-4">🔮</div>
            <h2 className="text-2xl font-bold mb-2">No Active Duels</h2>
            <p className="text-white/60 mb-6">
              There are no active duels in this category right now.
            </p>
            <Button onClick={() => router.push('/create')} glow>
              Create the First Duel
            </Button>
          </Card>
        )}

        {/* Duels Grid */}
        {!isLoading && !error && duels.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {duels.map((duel, index) => (
              <motion.div
                key={duel.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card variant="glass" hover className="p-6 h-full flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <Badge className={getCategoryColor(duel.category)}>
                      {duel.category}
                    </Badge>
                    <Badge
                      variant={duel.status === 'active' ? 'success' : 'info'}
                    >
                      {duel.status}
                    </Badge>
                  </div>

                  {/* Creator */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold">
                      {duel.creator.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-white/70">
                      @{duel.creator.username}
                    </span>
                  </div>

                  {/* Question */}
                  <h3 className="text-lg font-bold mb-4 line-clamp-2 flex-1">
                    {duel.question}
                  </h3>

                  {/* Stats */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-white/60">
                        <Clock size={14} />
                        <span>Time Left</span>
                      </div>
                      <span className="font-semibold">
                        {formatTimeRemaining(duel.deadline)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-white/60">
                        <Users size={14} />
                        <span>Participants</span>
                      </div>
                      <span className="font-semibold">
                        {duel.participants}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-white/60">
                        <TrendingUp size={14} />
                        <span>Pool Size</span>
                      </div>
                      <span className="font-semibold gradient-text">
                        {duel.poolSize.toFixed(2)} SOL
                      </span>
                    </div>
                  </div>

                  {/* Prediction Stats */}
                  <div className="flex gap-2 mb-4">
                    <div className="flex-1 bg-success/20 rounded-lg p-2 text-center">
                      <div className="text-xs text-white/60 mb-1">YES</div>
                      <div className="font-bold text-success">
                        {duel.yesCount}
                      </div>
                    </div>
                    <div className="flex-1 bg-danger/20 rounded-lg p-2 text-center">
                      <div className="text-xs text-white/60 mb-1">NO</div>
                      <div className="font-bold text-danger">
                        {duel.noCount}
                      </div>
                    </div>
                  </div>

                  {/* Error/Success Messages */}
                  {betError && bettingDuelId === duel.id && (
                    <div className="mb-3 p-2 bg-danger/20 border border-danger/30 rounded-lg text-danger text-xs">
                      {betError}
                    </div>
                  )}
                  
                  {betSuccess && bettingDuelId === duel.id && (
                    <div className="mb-3 p-2 bg-success/20 border border-success/30 rounded-lg text-success text-xs">
                      {betSuccess}
                    </div>
                  )}

                  {/* Betting Buttons */}
                  {authenticated && user?.id !== duel.creator.privyId && 
                   (duel.status === 'active' || duel.status === 'pending') &&
                   new Date(duel.deadline) > new Date() && (
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <Button
                        className="h-14 text-lg font-bold bg-success hover:bg-green-600 text-white border-0"
                        onClick={() => handleBet(duel.id, 'yes')}
                        disabled={bettingDuelId === duel.id}
                      >
                        {bettingDuelId === duel.id ? (
                          <Loader2 className="animate-spin" size={20} />
                        ) : (
                          'YES'
                        )}
                      </Button>
                      
                      <Button
                        className="h-14 text-lg font-bold bg-danger hover:bg-red-600 text-white border-0"
                        onClick={() => handleBet(duel.id, 'no')}
                        disabled={bettingDuelId === duel.id}
                      >
                        {bettingDuelId === duel.id ? (
                          <Loader2 className="animate-spin" size={20} />
                        ) : (
                          'NO'
                        )}
                      </Button>
                    </div>
                  )}

                  {/* View Details Button */}
                  <Button
                    onClick={() => handleViewDuel(duel.id)}
                    variant="secondary"
                    className="w-full"
                  >
                    View Details
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <MobileNav />
    </div>
  )
}

