'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Clock, Users, TrendingUp, Loader2, Filter, ChevronDown } from 'lucide-react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import TopNav from '@/components/navigation/TopNav'
import MobileNav from '@/components/navigation/MobileNav'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { getWalletAddress, getSolanaWalletProvider } from '@/lib/privy-helpers'
import { APP_BLOCKCHAIN, getAppCurrency } from '@/lib/blockchain-config'
import { placeBetOnChain } from '@/lib/solana-bet'

interface Duel {
  id: string
  question: string
  category: string
  stake: number
  deadline: string
  status: string
  outcome?: string | null
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
  const [selectedStatus, setSelectedStatus] = useState<string>('active') // active, resolved, all
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [bettingDuelId, setBettingDuelId] = useState<string | null>(null)
  const [bettingPrediction, setBettingPrediction] = useState<'yes' | 'no' | null>(null)
  const [betError, setBetError] = useState<string | null>(null)
  const [betSuccess, setBetSuccess] = useState<string | null>(null)
  const [votedDuels, setVotedDuels] = useState<Set<string>>(new Set()) // Track which duels user has voted on
  const statusDropdownRef = useRef<HTMLDivElement>(null)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)
  
  const walletAddress = getWalletAddress(user, APP_BLOCKCHAIN)
  const currency = getAppCurrency()

  useEffect(() => {
    fetchDuels()
  }, [selectedCategory, selectedStatus])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(target)) {
        setShowStatusDropdown(false)
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(target)) {
        setShowCategoryDropdown(false)
      }
    }
    
    if (showStatusDropdown || showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showStatusDropdown, showCategoryDropdown])

  const fetchDuels = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const categoryParam = selectedCategory === 'All' ? '' : selectedCategory
      const url = `/api/duels?status=${selectedStatus}${categoryParam ? `&category=${categoryParam}` : ''}`
      
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
    setBettingPrediction(prediction)
    setBetError(null)
    setBetSuccess(null)
    
    try {
      // Get Solana wallet provider (supports Phantom, Solflare, Backpack, MetaMask, etc.)
      let solanaProvider: any = null
      
      solanaProvider = await getSolanaWalletProvider()
      
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
        throw new Error('No Solana wallet found. Please install and connect a Solana wallet like Phantom, Solflare, Backpack, or MetaMask (with Solana enabled).')
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
      setVotedDuels(prev => new Set(prev).add(duelId)) // Mark as voted immediately
      
      // Refresh duels
      setTimeout(() => {
        fetchDuels()
        setBetSuccess(null)
      }, 2000)
      
    } catch (error) {
      console.error('Error placing bet:', error)
      setBetError(error instanceof Error ? error.message : 'Failed to place bet')
      // Remove from votedDuels on error to allow retry
      setVotedDuels(prev => {
        const newSet = new Set(prev)
        newSet.delete(duelId)
        return newSet
      })
    } finally {
      setBettingDuelId(null)
      setBettingPrediction(null)
    }
  }
  
  const handleViewDuel = (duelId: string) => {
    router.push(`/duel/${duelId}`)
  }

  const formatTimeRemaining = (deadline: string) => {
    try {
      const now = new Date()
      const end = new Date(deadline)
      
      // Validate date
      if (isNaN(end.getTime())) {
        return 'Invalid date'
      }
      
      const diff = end.getTime() - now.getTime()

      if (diff <= 0) return 'Ended'

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      // If more than 365 days, show years
      if (days > 365) {
        const years = Math.floor(days / 365)
        const remainingDays = days % 365
        return `${years}y ${remainingDays}d`
      }

      if (days > 0) return `${days}d ${hours}h`
      if (hours > 0) return `${hours}h ${minutes}m`
      return `${minutes}m`
    } catch (error) {
      console.error('Error formatting time remaining:', error)
      return 'Invalid date'
    }
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
            {selectedStatus === 'active' ? 'Active Duels' : selectedStatus === 'resolved' ? 'Completed Duels' : 'All Duels'}
          </h1>
          <p className="text-white/70">
            {selectedStatus === 'active' 
              ? 'Browse and predict on duels created by other users'
              : selectedStatus === 'resolved'
              ? 'View completed duels and their outcomes'
              : 'Browse all duels - active and completed'}
          </p>
        </div>

        {/* Filters - Dropdowns */}
        <div className="mb-6 flex flex-wrap gap-4">
          {/* Status Dropdown */}
          <div className="relative" ref={statusDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown)
                setShowCategoryDropdown(false)
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors min-w-[140px]"
            >
              <Filter size={16} />
              <span className="capitalize">
                {selectedStatus === 'active' ? 'Active' : selectedStatus === 'resolved' ? 'Completed' : 'All Status'}
              </span>
              <ChevronDown size={16} className={`transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full left-0 mt-2 w-full bg-background-dark border border-white/10 rounded-lg overflow-hidden z-20 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatus('active')
                    setShowStatusDropdown(false)
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-white/10 transition-colors ${
                    selectedStatus === 'active' ? 'bg-white/10' : ''
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatus('resolved')
                    setShowStatusDropdown(false)
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-white/10 transition-colors ${
                    selectedStatus === 'resolved' ? 'bg-white/10' : ''
                  }`}
                >
                  Completed
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatus('all')
                    setShowStatusDropdown(false)
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-white/10 transition-colors ${
                    selectedStatus === 'all' ? 'bg-white/10' : ''
                  }`}
                >
                  All
                </button>
              </div>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="relative" ref={categoryDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setShowCategoryDropdown(!showCategoryDropdown)
                setShowStatusDropdown(false)
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors min-w-[140px]"
            >
              <Filter size={16} />
              <span>{selectedCategory}</span>
              <ChevronDown size={16} className={`transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showCategoryDropdown && (
              <div className="absolute top-full left-0 mt-2 w-full bg-background-dark border border-white/10 rounded-lg overflow-hidden z-20 shadow-lg max-h-[300px] overflow-y-auto">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(category)
                      setShowCategoryDropdown(false)
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-white/10 transition-colors ${
                      selectedCategory === category ? 'bg-white/10' : ''
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>
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
            <h2 className="text-2xl font-bold mb-2">
              {selectedStatus === 'active' 
                ? 'No Active Duels'
                : selectedStatus === 'resolved'
                ? 'No Completed Duels'
                : 'No Duels Found'}
            </h2>
            <p className="text-white/60 mb-6">
              {selectedStatus === 'active'
                ? 'There are no active duels in this category right now.'
                : selectedStatus === 'resolved'
                ? 'No duels have been completed yet in this category.'
                : 'No duels found matching your filters.'}
            </p>
            {selectedStatus === 'active' && (
              <Button onClick={() => router.push('/create')} glow>
                Create the First Duel
              </Button>
            )}
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
                    <div className="flex gap-2">
                      {duel.status === 'resolved' && duel.outcome && (
                        <Badge
                          variant={duel.outcome === 'yes' ? 'success' : 'danger'}
                          className="text-xs"
                        >
                          {duel.outcome.toUpperCase()}
                        </Badge>
                      )}
                      {(() => {
                        const deadlinePassed = new Date(duel.deadline) < new Date()
                        const isExpired = deadlinePassed && duel.status !== 'resolved'
                        
                        if (isExpired) {
                          return (
                            <Badge variant="warning" className="text-xs">
                              Awaiting Resolution
                            </Badge>
                          )
                        }
                        
                        return (
                          <Badge
                            variant={duel.status === 'active' ? 'success' : duel.status === 'resolved' ? 'info' : 'default'}
                          >
                            {duel.status}
                          </Badge>
                        )
                      })()}
                    </div>
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
                        <span>{duel.status === 'resolved' ? 'Completed' : 'Time Left'}</span>
                      </div>
                      <span className="font-semibold">
                        {duel.status === 'resolved' 
                          ? new Date(duel.deadline) < new Date() 
                            ? 'Ended' 
                            : formatTimeRemaining(duel.deadline)
                          : formatTimeRemaining(duel.deadline)}
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

                  {/* Expired Duel Notice */}
                  {new Date(duel.deadline) < new Date() && duel.status !== 'resolved' && (
                    <div className="mb-4 p-3 bg-warning/20 border border-warning/30 rounded-lg">
                      <div className="text-sm font-semibold text-warning mb-1">⏰ Deadline Passed</div>
                      <div className="text-xs text-white/70">
                        Creator needs to resolve this duel. Winners will be determined after resolution.
                      </div>
                    </div>
                  )}

                  {/* Winners Section for Resolved Duels */}
                  {duel.status === 'resolved' && duel.outcome && (
                    <div className="mb-4 p-4 bg-success/10 border border-success/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-white">🏆 Outcome</span>
                        <Badge variant={duel.outcome === 'yes' ? 'success' : 'danger'}>
                          {duel.outcome.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-xs text-white/80 mt-2">
                        Total Pool: <span className="font-semibold text-success">{duel.poolSize.toFixed(2)} SOL</span>
                      </div>
                      <div className="text-xs text-white/60 mt-1">
                        Click "View Details" to see winners and claim prizes
                      </div>
                    </div>
                  )}

                  {/* Prediction Stats / Betting Buttons */}
                  {authenticated && user?.id !== duel.creator.privyId && 
                   (duel.status === 'active' || duel.status === 'pending') &&
                   new Date(duel.deadline) > new Date() && !votedDuels.has(duel.id) ? (
                    <div className="flex gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => handleBet(duel.id, 'yes')}
                        disabled={bettingDuelId === duel.id || votedDuels.has(duel.id)}
                        className="flex-1 bg-success/20 hover:bg-success/30 rounded-lg p-2 text-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-2 border-success/30 hover:border-success/50"
                      >
                        <div className="text-xs text-white/60 mb-1">YES</div>
                        <div className="font-bold text-success">
                          {bettingDuelId === duel.id && bettingPrediction === 'yes' ? (
                            <Loader2 className="animate-spin mx-auto" size={16} />
                          ) : (
                            duel.yesCount
                          )}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBet(duel.id, 'no')}
                        disabled={bettingDuelId === duel.id || votedDuels.has(duel.id)}
                        className="flex-1 bg-danger/20 hover:bg-danger/30 rounded-lg p-2 text-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-2 border-danger/30 hover:border-danger/50"
                      >
                        <div className="text-xs text-white/60 mb-1">NO</div>
                        <div className="font-bold text-danger">
                          {bettingDuelId === duel.id && bettingPrediction === 'no' ? (
                            <Loader2 className="animate-spin mx-auto" size={16} />
                          ) : (
                            duel.noCount
                          )}
                        </div>
                      </button>
                    </div>
                  ) : (
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
                  )}

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

