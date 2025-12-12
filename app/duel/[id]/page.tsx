'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Share2, MessageCircle, Loader2, ArrowLeft, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import TopNav from '@/components/navigation/TopNav'
import MobileNav from '@/components/navigation/MobileNav'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import CountdownTimer from '@/components/ui/CountdownTimer'
import { getWalletAddress } from '@/lib/privy-helpers'
import { APP_BLOCKCHAIN, getAppCurrency } from '@/lib/blockchain-config'
import { placeBetOnChain } from '@/lib/solana-bet'
import { resolveMarketOnChain } from '@/lib/solana-resolve'
import { claimWinningsOnChain } from '@/lib/solana-claim'

interface Duel {
  id: string
  question: string
  category: string
  stake: number
  deadline: string
  status: string
  outcome: string | null
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
  participants: Array<{
    id: string
    user: {
      id: string
      username: string
      avatar: string
      walletAddress: string
    }
    prediction: 'yes' | 'no'
    stake: number
    won: boolean | null
    payout: number | null
    claimed?: boolean
  }>
  marketPda: string | null
  createdAt: string
}

export default function DuelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { ready, authenticated, user } = usePrivy()
  const { wallets } = useWallets()
  const [id, setId] = useState<string>('')
  const [duel, setDuel] = useState<Duel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBetting, setIsBetting] = useState(false)
  const [betError, setBetError] = useState<string | null>(null)
  const [betSuccess, setBetSuccess] = useState(false)
  const [selectedPrediction, setSelectedPrediction] = useState<'yes' | 'no' | null>(null)
  const [betAmount, setBetAmount] = useState(0.1)
  const [hasVoted, setHasVoted] = useState(false) // Track if user has voted (optimistic)
  
  // Resolution state
  const [isResolving, setIsResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [resolveSuccess, setResolveSuccess] = useState(false)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no' | null>(null)
  
  // Claim winnings state
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [claimSuccess, setClaimSuccess] = useState(false)
  const [claimTransactionSignature, setClaimTransactionSignature] = useState<string | null>(null)
  
  const walletAddress = useMemo(() => getWalletAddress(user, APP_BLOCKCHAIN), [user])
  const currency = useMemo(() => getAppCurrency(), [])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  // Fetch current user's MongoDB ID
  useEffect(() => {
    if (user?.id) {
      fetch(`/api/profile?privyId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.user?.id) {
            setCurrentUserId(data.user.id)
          }
        })
        .catch(err => console.error('Error fetching user ID:', err))
    }
  }, [user?.id])
  
  // Memoize expensive calculations
  const userParticipation = useMemo(() => 
    duel?.participants.find((p) => currentUserId && p.user.id === currentUserId),
    [duel?.participants, currentUserId]
  )
  
  const isCreator = useMemo(() => user?.id && duel?.creator.privyId === user.id, [user?.id, duel?.creator.privyId])
  const hasParticipated = useMemo(() => !!userParticipation || hasVoted, [userParticipation, hasVoted])
  const isDuelActive = useMemo(() => duel?.status === 'active' || duel?.status === 'pending', [duel?.status])
  const isDeadlineValid = useMemo(() => duel?.deadline && new Date(duel.deadline) > new Date(), [duel?.deadline])
  const canBet = useMemo(() => 
    authenticated && !isCreator && !hasParticipated && isDuelActive && isDeadlineValid,
    [authenticated, isCreator, hasParticipated, isDuelActive, isDeadlineValid]
  )
  
  // Resolution conditions
  const deadlineDate = useMemo(() => duel ? new Date(duel.deadline) : null, [duel?.deadline])
  const isDeadlinePassed = useMemo(() => deadlineDate ? new Date() >= deadlineDate : false, [deadlineDate])
  const canResolve = useMemo(() => 
    isCreator && isDeadlinePassed && duel?.status !== 'resolved' && duel?.status !== 'cancelled',
    [isCreator, isDeadlinePassed, duel?.status]
  )
  
  // Removed debug logging useEffect to reduce re-renders
  
  useEffect(() => {
    // Resolve params (Next.js 16+ uses Promise)
    params.then((resolvedParams) => {
      setId(resolvedParams.id)
    })
  }, [params])
  
  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/login')
    }
  }, [ready, authenticated, router])
  
  const fetchDuel = useCallback(async () => {
    if (!id) return
    try {
      setIsLoading(true)
      const response = await fetch(`/api/duels/${id}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch duel')
      }
      
      setDuel(data.duel)
      
      // Sync hasVoted with server state
      if (currentUserId && data.duel.participants) {
        const participated = data.duel.participants.some(
          (p: any) => p.user.id === currentUserId
        )
        setHasVoted(participated)
      }
    } catch (error) {
      console.error('Error fetching duel:', error)
      setBetError(error instanceof Error ? error.message : 'Failed to load duel')
    } finally {
      setIsLoading(false)
    }
  }, [id, currentUserId])
  
  useEffect(() => {
    if (id) {
      fetchDuel()
    }
  }, [id, fetchDuel])
  
  const handleBet = useCallback(async (prediction: 'yes' | 'no') => {
    if (!duel || !user || !walletAddress) {
      setBetError('Please connect your wallet')
      return
    }
    
    if (!duel.marketPda) {
      setBetError('This duel is not connected to Solana. Please contact support.')
      return
    }
    
    setIsBetting(true)
    setBetError(null)
    setBetSuccess(false)
    
    try {
      // Step 1: Get Solana wallet provider
      let solanaProvider: any = null
      
      // Try window.solana first (Phantom, Solflare, etc.)
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
      
      // If window.solana not available, try Privy wallets
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
      
      // Step 2: Place bet on-chain
      const onChainResult = await placeBetOnChain(solanaProvider, {
        marketPda: duel.marketPda,
        prediction: prediction === 'yes',
        stakeAmount: betAmount,
      })
      
      // Step 3: Update MongoDB
      const response = await fetch(`/api/duels/${id}/bet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privyId: user.id,
          prediction: prediction,
          stake: betAmount,
          transactionSignature: onChainResult.signature,
          participantPda: onChainResult.participantPda,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to place bet')
      }
      
      setBetSuccess(true)
      setHasVoted(true) // Immediately mark as voted to disable buttons
      
      // Refresh duel data
      setTimeout(() => {
        fetchDuel()
        setBetSuccess(false)
      }, 2000)
      
    } catch (error) {
      console.error('Error placing bet:', error)
      setBetError(error instanceof Error ? error.message : 'Failed to place bet')
      // Don't set hasVoted on error, allow retry
    } finally {
      setIsBetting(false)
    }
  }, [duel, user, walletAddress, id, betAmount, currentUserId])
  
  const handleResolve = useCallback(async (outcome: 'yes' | 'no') => {
    if (!duel || !user || !walletAddress) {
      setResolveError('Please connect your wallet')
      return
    }
    
    if (!duel.marketPda) {
      setResolveError('This duel is not connected to Solana. Please contact support.')
      return
    }
    
    setIsResolving(true)
    setResolveError(null)
    setResolveSuccess(false)
    
    try {
      // Step 1: Get Solana wallet provider
      let solanaProvider: any = null
      
      // Try window.solana first (Phantom, Solflare, etc.)
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
      
      // If window.solana not available, try Privy wallets
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
      
      // Step 2: Resolve market on-chain
      const onChainResult = await resolveMarketOnChain(solanaProvider, {
        marketPda: duel.marketPda,
        outcome: outcome === 'yes',
      })
      
      // Step 3: Update MongoDB
      const response = await fetch(`/api/duels/${id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privyId: user.id,
          outcome: outcome,
          transactionSignature: onChainResult.signature,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resolve duel')
      }
      
      setResolveSuccess(true)
      setShowResolveModal(false)
      
      // Refresh duel data
      setTimeout(() => {
        fetchDuel()
        setResolveSuccess(false)
      }, 2000)
      
    } catch (error) {
      console.error('Error resolving duel:', error)
      setResolveError(error instanceof Error ? error.message : 'Failed to resolve duel')
    } finally {
      setIsResolving(false)
    }
  }, [duel, user, walletAddress, id, wallets])
  
  const handleClaim = useCallback(async () => {
    if (!duel || !user || !walletAddress) {
      setClaimError('Please connect your wallet')
      return
    }
    
    if (!duel.marketPda) {
      setClaimError('This duel is not connected to Solana. Please contact support.')
      return
    }
    
    if (!userParticipation || !userParticipation.won) {
      setClaimError('You did not win this duel')
      return
    }
    
    if (userParticipation.claimed) {
      setClaimError('Winnings have already been claimed')
      return
    }
    
    setIsClaiming(true)
    setClaimError(null)
    setClaimSuccess(false)
    
    try {
      // Step 1: Get Solana wallet provider
      let solanaProvider: any = null
      
      // Try window.solana first (Phantom, Solflare, etc.)
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
      
      // If window.solana not available, try Privy wallets
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
      
      // Step 2: Claim winnings on-chain
      const onChainResult = await claimWinningsOnChain(solanaProvider, {
        marketPda: duel.marketPda,
      })
      
      // Step 3: Update MongoDB
      const response = await fetch(`/api/duels/${id}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privyId: user.id,
          transactionSignature: onChainResult.signature,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        // Check if error is "already claimed" - treat as success
        const errorMsg = data.error || 'Failed to claim winnings'
        const isAlreadyClaimed = 
          errorMsg.includes('already been claimed') ||
          errorMsg.includes('already claimed') ||
          errorMsg.includes('AlreadyClaimed')
        
        if (isAlreadyClaimed) {
          // Winnings already claimed - refresh data to show success state
          console.log('Winnings already claimed (from API) - refreshing duel data')
          fetchDuel()
          return // Exit early, don't throw error
        }
        
        throw new Error(errorMsg)
      }
      
      setClaimSuccess(true)
      setClaimTransactionSignature(onChainResult.signature)
      
      // Refresh duel data
      setTimeout(() => {
        fetchDuel()
        setClaimSuccess(false)
        setClaimTransactionSignature(null)
      }, 3000)
      
    } catch (error) {
      console.error('Error claiming winnings:', error)
      
      // Check if error is "AlreadyClaimed" (Error Code 6008)
      const errorMessage = error instanceof Error ? error.message : String(error)
      const isAlreadyClaimed = 
        errorMessage.includes('AlreadyClaimed') ||
        errorMessage.includes('6008') ||
        errorMessage.includes('Winnings already claimed') ||
        errorMessage.includes('already been claimed')
      
      if (isAlreadyClaimed) {
        // Winnings are already claimed - refresh data to show success state
        console.log('Winnings already claimed - refreshing duel data')
        setClaimError(null)
        // Refresh duel data to update the claimed status
        fetchDuel()
      } else {
        // Other errors - show error message
        setClaimError(errorMessage)
      }
    } finally {
      setIsClaiming(false)
    }
  }, [duel, user, walletAddress, userParticipation, id, wallets])
  
  // Claim handler for Winners section (uses participant directly)
  const handleClaimForParticipant = useCallback(async (participant: any) => {
    if (!duel || !user || !walletAddress) {
      setClaimError('Please connect your wallet')
      return
    }
    
    if (!duel.marketPda) {
      setClaimError('This duel is not connected to Solana. Please contact support.')
      return
    }
    
    // Check if this participant is the current user
    const isCurrentUserById = currentUserId && participant.user?.id === currentUserId
    const isCurrentUserByWallet = walletAddress && participant.user?.walletAddress && 
      participant.user.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    const isCurrentUser = isCurrentUserById || isCurrentUserByWallet
    
    if (!isCurrentUser) {
      setClaimError('You can only claim your own winnings')
      return
    }
    
    if (!participant.won) {
      setClaimError('You did not win this duel')
      return
    }
    
    if (participant.claimed) {
      setClaimError('Winnings have already been claimed')
      return
    }
    
    setIsClaiming(true)
    setClaimError(null)
    setClaimSuccess(false)
    
    try {
      // Step 1: Get Solana wallet provider
      let solanaProvider: any = null
      
      // Try window.solana first (Phantom, Solflare, etc.)
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
      
      // If window.solana not available, try Privy wallets
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
      
      // Step 2: Claim winnings on-chain
      const onChainResult = await claimWinningsOnChain(solanaProvider, {
        marketPda: duel.marketPda,
      })
      
      // Step 3: Update MongoDB
      const response = await fetch(`/api/duels/${id}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privyId: user.id,
          transactionSignature: onChainResult.signature,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        // Check if error is "already claimed" - treat as success
        const errorMsg = data.error || 'Failed to claim winnings'
        const isAlreadyClaimed = 
          errorMsg.includes('already been claimed') ||
          errorMsg.includes('already claimed') ||
          errorMsg.includes('AlreadyClaimed')
        
        if (isAlreadyClaimed) {
          // Winnings already claimed - refresh data to show success state
          console.log('Winnings already claimed (from API) - refreshing duel data')
          fetchDuel()
          return // Exit early, don't throw error
        }
        
        throw new Error(errorMsg)
      }
      
      setClaimSuccess(true)
      setClaimTransactionSignature(onChainResult.signature)
      
      // Refresh duel data
      setTimeout(() => {
        fetchDuel()
        setClaimSuccess(false)
        setClaimTransactionSignature(null)
      }, 3000)
      
    } catch (error) {
      console.error('Error claiming winnings:', error)
      
      // Check if error is "AlreadyClaimed" (Error Code 6008)
      const errorMessage = error instanceof Error ? error.message : String(error)
      const isAlreadyClaimed = 
        errorMessage.includes('AlreadyClaimed') ||
        errorMessage.includes('6008') ||
        errorMessage.includes('Winnings already claimed') ||
        errorMessage.includes('already been claimed')
      
      if (isAlreadyClaimed) {
        // Winnings are already claimed - refresh data to show success state
        console.log('Winnings already claimed - refreshing duel data')
        setClaimError(null)
        // Refresh duel data to update the claimed status
        fetchDuel()
      } else {
        // Other errors - show error message
        setClaimError(errorMessage)
      }
    } finally {
      setIsClaiming(false)
    }
  }, [duel, user, walletAddress, currentUserId, id, wallets, fetchDuel])
  
  // All hooks must be called before any early returns
  const deadline = useMemo(() => duel ? new Date(duel.deadline) : new Date(), [duel?.deadline])
  const isExpired = useMemo(() => new Date() >= deadline, [deadline])
  const yesStake = useMemo(() => 
    duel?.participants
      ?.filter(p => p.prediction === 'yes')
      .reduce((sum, p) => sum + p.stake, 0) || 0,
    [duel?.participants]
  )
  const noStake = useMemo(() => 
    duel?.participants
      ?.filter(p => p.prediction === 'no')
      .reduce((sum, p) => sum + p.stake, 0) || 0,
    [duel?.participants]
  )
  
  const handleYesBet = useCallback(() => {
    if (canBet && !isBetting) {
      setSelectedPrediction('yes')
      handleBet('yes')
    }
  }, [canBet, isBetting, handleBet])
  
  const handleNoBet = useCallback(() => {
    if (canBet && !isBetting) {
      setSelectedPrediction('no')
      handleBet('no')
    }
  }, [canBet, isBetting, handleBet])
  
  // Early returns after all hooks
  if (!ready || isLoading) {
    return (
      <div className="min-h-screen bg-background-dark">
        <TopNav />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-primary-from" size={48} />
            <p className="text-white/70">Loading duel...</p>
          </div>
        </div>
        <MobileNav />
      </div>
    )
  }
  
  if (!duel) {
    return (
      <div className="min-h-screen bg-background-dark pb-20">
        <TopNav />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-white/70 mb-4">Duel not found</p>
            <Button onClick={() => router.push('/duels')}>Back to Duels</Button>
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
        {/* Back Button */}
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/duels')}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Duels
          </Button>
        </div>
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="info">{duel.category}</Badge>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">
                <Share2 size={16} className="mr-2" />
                Share
              </Button>
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-4 font-display">{duel.question}</h1>
          
          {/* Resolved Duel Summary Banner */}
          {duel.status === 'resolved' && duel.outcome && (
            <div className="mb-6 p-4 bg-gradient-to-r from-success/20 to-primary-from/20 border-2 border-success/50 rounded-xl">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="text-sm text-white/70 mb-1">Final Outcome</div>
                  <div className="text-2xl font-bold">
                    <Badge variant={duel.outcome === 'yes' ? 'success' : 'danger'} className="text-lg px-4 py-2">
                      {duel.outcome.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white/70 mb-1">Total Pool</div>
                  <div className="text-2xl font-bold gradient-text">
                    {duel.poolSize.toFixed(2)} {currency}
                  </div>
                </div>
                {hasParticipated && userParticipation && (
                  <div className="w-full mt-2 pt-3 border-t border-white/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-white/70">Your Result</div>
                        <Badge variant={userParticipation.won ? 'success' : 'danger'} className="mt-1">
                          {userParticipation.won ? '🏆 Winner!' : 'Lost'}
                        </Badge>
                      </div>
                      {userParticipation.won && userParticipation.payout && userParticipation.payout > 0 && (
                        <div className="text-right">
                          <div className="text-sm text-white/70">Your Payout</div>
                          <div className="text-xl font-bold text-success">
                            {userParticipation.payout.toFixed(2)} {currency}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {duel.status !== 'resolved' && (
            <div className="flex items-center justify-center mb-4">
              <CountdownTimer targetDate={deadline} />
            </div>
          )}
          
          <div className="text-center">
            {(() => {
              const deadlinePassed = deadlineDate ? new Date() >= deadlineDate : false
              const isExpired = deadlinePassed && duel.status !== 'resolved'
              
              if (isExpired) {
                return (
                  <Badge variant="warning" className="text-lg px-4 py-2">
                    ⏰ Deadline Passed - Awaiting Resolution
                  </Badge>
                )
              }
              
              return (
                <Badge 
                  variant={
                    duel.status === 'active' ? 'success' :
                    duel.status === 'resolved' ? 'info' :
                    duel.status === 'pending' ? 'warning' :
                    'danger'
                  }
                  className="text-lg px-4 py-2"
                >
                  {duel.status === 'active' ? 'Active' :
                   duel.status === 'resolved' ? `Resolved: ${duel.outcome === 'yes' ? 'YES' : 'NO'}` :
                   duel.status === 'pending' ? 'Pending' :
                   'Cancelled'}
                </Badge>
              )
            })()}
          </div>
        </div>
        
        {/* Expired Duel Notice */}
        {isDeadlinePassed && duel.status !== 'resolved' && (
          <Card variant="glass" className="p-6 mb-6 border-2 border-warning/50">
            <div className="flex items-start gap-4">
              <div className="text-4xl">⏰</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-warning mb-2">Deadline Has Passed</h3>
                <p className="text-white/80 mb-3">
                  This duel's deadline has passed. The creator needs to resolve it to determine winners.
                </p>
                {isCreator && (
                  <div className="p-3 bg-warning/20 rounded-lg">
                    <p className="text-sm text-white/90 font-semibold mb-1">
                      👤 You are the creator
                    </p>
                    <p className="text-xs text-white/70">
                      Click the "Resolve Duel" button below to set the outcome and determine winners.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Pool Stats */}
        <Card variant="glass" className="p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">Pool Statistics</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold gradient-text mb-1">
                {duel.poolSize.toFixed(2)} {currency}
              </div>
              <div className="text-sm text-white/60">Total Pool</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success mb-1">
                YES: {duel.yesCount}
              </div>
              <div className="text-sm text-white/60">{yesStake.toFixed(2)} {currency}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-danger mb-1">
                NO: {duel.noCount}
              </div>
              <div className="text-sm text-white/60">{noStake.toFixed(2)} {currency}</div>
            </div>
          </div>
        </Card>
        
        {/* Betting Section */}
        {authenticated && !isCreator && (
          <Card variant="glass" className="p-6 mb-6">
            <h3 className="text-xl font-bold mb-4">Place Your Bet</h3>
            
            {!canBet && (
              <div className="mb-4 p-3 bg-warning/20 border border-warning/30 rounded-lg text-warning text-sm">
                {hasParticipated 
                  ? 'You have already placed a bet on this duel.'
                  : !isDuelActive
                  ? `This duel is ${duel?.status}. Betting is not available.`
                  : !isDeadlineValid
                  ? 'The deadline for this duel has passed.'
                  : 'Betting is currently unavailable.'}
              </div>
            )}
            
            {betError && (
              <div className="mb-4 p-3 bg-danger/20 border border-danger/30 rounded-lg text-danger text-sm">
                {betError}
              </div>
            )}
            
            {betSuccess && (
              <div className="mb-4 p-3 bg-success/20 border border-success/30 rounded-lg text-success text-sm">
                ✓ Bet placed successfully! Refreshing...
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Stake Amount ({currency})</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={betAmount}
                onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0.01)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-primary-from focus:outline-none"
                disabled={isBetting || !canBet}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                className="h-20 text-xl font-bold bg-success hover:bg-green-600 text-white border-0 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
                onClick={handleYesBet}
                disabled={isBetting || !canBet}
              >
                {isBetting && selectedPrediction === 'yes' ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  'YES'
                )}
              </button>
              
              <button
                type="button"
                className="h-20 text-xl font-bold bg-danger hover:bg-red-600 text-white border-0 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
                onClick={handleNoBet}
                disabled={isBetting || !canBet}
              >
                {isBetting && selectedPrediction === 'no' ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  'NO'
                )}
              </button>
            </div>
          </Card>
        )}
        
        {/* User's Participation */}
        {hasParticipated && userParticipation && (
          <Card variant="glass" className="p-6 mb-6">
            <h3 className="text-xl font-bold mb-4">Your Bet</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold mb-1">
                    {userParticipation.prediction.toUpperCase()}
                  </div>
                  <div className="text-white/60">
                    Stake: {userParticipation.stake.toFixed(2)} {currency}
                  </div>
                  {duel.status === 'resolved' && userParticipation.won && userParticipation.payout && (
                    <div className="text-success font-semibold mt-2">
                      Payout: {userParticipation.payout.toFixed(2)} {currency}
                    </div>
                  )}
                </div>
                {duel.status === 'resolved' && (
                  <Badge variant={userParticipation.won ? 'success' : 'danger'}>
                    {userParticipation.won ? 'Won' : 'Lost'}
                  </Badge>
                )}
              </div>
              
              {/* Winner Notice */}
              {duel.status === 'resolved' && userParticipation.won && (
                <div className="mb-4 p-4 bg-success/20 border-2 border-success/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🎉</span>
                    <h4 className="text-lg font-bold text-success">You Won!</h4>
                  </div>
                  {userParticipation.claimed ? (
                    <>
                      <p className="text-sm text-white/80 mb-2">
                        🎊 Congratulations! Your prediction was correct and your winnings have been claimed.
                      </p>
                      <div className="text-xs text-white/60">
                        Your payout: <span className="font-bold text-success text-sm">{userParticipation.payout?.toFixed(2) || '0.00'} {currency}</span> has been transferred to your wallet
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-white/80 mb-2">
                        Congratulations! Your prediction was correct. You can claim your winnings below.
                      </p>
                      <div className="text-xs text-white/60">
                        Your payout: <span className="font-bold text-success text-sm">{userParticipation.payout?.toFixed(2) || '0.00'} {currency}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Claim Winnings Button */}
              {duel.status === 'resolved' && userParticipation && userParticipation.won && userParticipation.payout && userParticipation.payout > 0 && (
                <div>
                  {claimError && (
                    <div className="mb-4 p-3 bg-danger/20 border border-danger/30 rounded-lg text-danger text-sm">
                      {claimError}
                    </div>
                  )}
                  
                  {claimSuccess && (
                    <div className="mb-4 p-3 bg-success/20 border border-success/30 rounded-lg text-success text-sm">
                      <div className="flex items-center justify-between">
                        <span>✓ Winnings claimed successfully!</span>
                        {claimTransactionSignature && (
                          <a
                            href={`https://solscan.io/tx/${claimTransactionSignature}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-success hover:underline ml-2 text-xs"
                          >
                            View Transaction
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {userParticipation.claimed ? (
                    <div className="p-4 bg-success/20 border-2 border-success/50 rounded-lg text-center">
                      <div className="text-2xl mb-2">✓</div>
                      <div className="text-success font-semibold">Winnings Claimed</div>
                      <div className="text-xs text-white/60 mt-1">
                        {userParticipation.payout.toFixed(2)} {currency} has been transferred to your wallet
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={handleClaim}
                      disabled={isClaiming}
                      className="w-full text-lg py-4"
                      variant="success"
                    >
                      {isClaiming ? (
                        <>
                          <Loader2 className="animate-spin mr-2" size={24} />
                          Claiming...
                        </>
                      ) : (
                        <>
                          <span className="text-xl mr-2">💰</span>
                          Claim {userParticipation.payout.toFixed(2)} {currency}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}
        
        {/* Winners Section for Resolved Duels */}
        {duel?.status === 'resolved' && duel?.outcome && (
          <Card variant="glass" className="p-6 mb-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>🏆 Winners</span>
              <Badge variant={duel.outcome === 'yes' ? 'success' : 'danger'}>
                Outcome: {duel.outcome.toUpperCase()}
              </Badge>
            </h3>
            
            <div className="mb-4 p-4 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60">Total Pool</span>
                <span className="text-2xl font-bold gradient-text">
                  {duel.poolSize.toFixed(2)} {currency}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Winners</span>
                <span className="font-semibold text-success">
                  {duel.participants.filter((p: any) => p.won).length} participant{duel.participants.filter((p: any) => p.won).length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {duel.participants.filter((p: any) => p.won).length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-white/80 mb-2">Winner Details:</div>
                {duel.participants
                  .filter((p: any) => p.won)
                  .map((participant: any, index: number) => {
                    // Multiple ways to check if this participant is the current user
                    const isCurrentUserById = currentUserId && participant.user?.id === currentUserId
                    const isCurrentUserByWallet = walletAddress && participant.user?.walletAddress && 
                      participant.user.walletAddress.toLowerCase() === walletAddress.toLowerCase()
                    // Check if userParticipation matches this participant (by ID or wallet)
                    const isUserParticipation = userParticipation && (
                      userParticipation.user?.id === participant.user?.id ||
                      (walletAddress && userParticipation.user?.walletAddress && 
                       userParticipation.user.walletAddress.toLowerCase() === walletAddress.toLowerCase())
                    )
                    // Check by Privy ID if available
                    const isCurrentUserByPrivyId = user?.id && participant.user?.privyId === user.id
                    
                    const isCurrentUser = isCurrentUserById || isCurrentUserByWallet || isUserParticipation || isCurrentUserByPrivyId
                    
                    // Show claim button if user is authenticated and this is their entry
                    const isWinner = participant.won === true
                    const hasPayout = participant.payout && participant.payout > 0
                    const notClaimed = !participant.claimed
                    
                    // Primary check: normal matching
                    const canClaim = authenticated && isCurrentUser && isWinner && notClaimed && hasPayout
                    
                    // Fallback: If userParticipation exists and shows they won, and this participant matches,
                    // show the button even if exact matching failed
                    const hasWinningParticipation = authenticated && userParticipation && userParticipation.won && 
                      !userParticipation.claimed && userParticipation.payout && userParticipation.payout > 0
                    const participantMatches = userParticipation && participant.user?.id === userParticipation.user?.id
                    
                    // Show button if: (normal matching) OR (userParticipation shows win and participant matches)
                    const shouldShowButton = canClaim || (hasWinningParticipation && participantMatches && notClaimed && hasPayout)
                    
                    // Debug logging - always log in development to help diagnose issues
                    if (process.env.NODE_ENV === 'development') {
                      console.log(`[Claim Button Debug] ${participant.user?.username}:`, {
                        authenticated,
                        currentUserId,
                        participantUserId: participant.user?.id,
                        isCurrentUserById,
                        walletAddress,
                        participantWallet: participant.user?.walletAddress,
                        isCurrentUserByWallet,
                        isUserParticipation,
                        isCurrentUserByPrivyId,
                        isCurrentUser,
                        isWinner,
                        hasPayout,
                        notClaimed,
                        canClaim,
                        hasWinningParticipation,
                        participantMatches,
                        shouldShowButton,
                        userParticipation: userParticipation ? {
                          won: userParticipation.won,
                          claimed: userParticipation.claimed,
                          payout: userParticipation.payout
                        } : null
                      })
                    }
                    
                    return (
                      <div
                        key={participant.id || index}
                        className="p-3 bg-success/10 border border-success/20 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold">
                              {participant.user?.username?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="font-semibold">@{participant.user?.username || 'Unknown'}</div>
                              <div className="text-xs text-white/60">
                                Stake: {participant.stake.toFixed(2)} {currency}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-success">
                              {participant.payout?.toFixed(2) || '0.00'} {currency}
                            </div>
                            <div className="text-xs text-white/60">
                              {participant.claimed ? '✓ Claimed' : 'Pending'}
                            </div>
                          </div>
                        </div>
                        
                        {/* Claim button for current user */}
                        {shouldShowButton && (
                          <div className="mt-3 pt-3 border-t border-success/20">
                            {claimError && (
                              <div className="mb-2 p-2 bg-danger/20 border border-danger/30 rounded-lg text-danger text-xs">
                                {claimError}
                              </div>
                            )}
                            
                            {claimSuccess && (
                              <div className="mb-2 p-2 bg-success/20 border border-success/30 rounded-lg text-success text-xs">
                                <div className="flex items-center justify-between">
                                  <span>✓ Winnings claimed successfully!</span>
                                  {claimTransactionSignature && (
                                    <a
                                      href={`https://solscan.io/tx/${claimTransactionSignature}?cluster=devnet`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-success hover:underline ml-2 text-xs"
                                    >
                                      View Transaction
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            <Button
                              onClick={() => handleClaimForParticipant(participant)}
                              disabled={isClaiming}
                              className="w-full text-sm py-2"
                              variant="success"
                            >
                              {isClaiming ? (
                                <>
                                  <Loader2 className="animate-spin mr-2" size={16} />
                                  Claiming...
                                </>
                              ) : (
                                <>
                                  <span className="text-lg mr-2">💰</span>
                                  Claim {participant.payout.toFixed(2)} {currency}
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            ) : (
              <div className="text-center py-4 text-white/60">
                No winners in this duel
              </div>
            )}
          </Card>
        )}

        {/* Creator Notice & Resolve Section */}
        {isCreator && (
          <Card variant="glass" className="p-6 mb-6">
            <p className="text-white/60 text-center mb-4">
              You created this duel. You cannot bet on your own prediction.
            </p>
            
            {canResolve && (
              <div className="mt-4">
                {resolveError && (
                  <div className="mb-4 p-3 bg-danger/20 border border-danger/30 rounded-lg text-danger text-sm">
                    {resolveError}
                  </div>
                )}
                
                {resolveSuccess && (
                  <div className="mb-4 p-3 bg-success/20 border border-success/30 rounded-lg text-success text-sm">
                    ✓ Duel resolved successfully! Refreshing...
                  </div>
                )}
                
                <Button
                  onClick={() => setShowResolveModal(true)}
                  disabled={isResolving || duel?.status === 'resolved'}
                  className="w-full"
                >
                  {isResolving ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={20} />
                      Resolving...
                    </>
                  ) : (
                    'Resolve Duel'
                  )}
                </Button>
              </div>
            )}
            
            {duel?.status === 'resolved' && (
              <div className="mt-4 text-center">
                <Badge variant="info" className="text-lg px-4 py-2">
                  Resolved: {duel.outcome?.toUpperCase()}
                </Badge>
              </div>
            )}
          </Card>
        )}
        
        {/* Resolve Modal */}
        {showResolveModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-background-dark border border-white/10 rounded-xl p-6 max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold">Resolve Duel</h3>
                <button
                  onClick={() => {
                    setShowResolveModal(false)
                    setResolveError(null)
                    setSelectedOutcome(null)
                  }}
                  className="text-white/60 hover:text-white transition-colors"
                  disabled={isResolving}
                >
                  <X size={24} />
                </button>
              </div>
              
              <p className="text-white/70 mb-6">
                Select the final outcome for this duel. This action cannot be undone.
              </p>
              
              {resolveError && (
                <div className="mb-4 p-3 bg-danger/20 border border-danger/30 rounded-lg text-danger text-sm">
                  {resolveError}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  type="button"
                  className={`h-20 text-xl font-bold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
                    selectedOutcome === 'yes'
                      ? 'bg-success text-white border-2 border-success'
                      : 'bg-success/20 text-success border-2 border-success/30 hover:bg-success/30'
                  }`}
                  onClick={() => setSelectedOutcome('yes')}
                  disabled={isResolving}
                >
                  YES
                </button>
                
                <button
                  type="button"
                  className={`h-20 text-xl font-bold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
                    selectedOutcome === 'no'
                      ? 'bg-danger text-white border-2 border-danger'
                      : 'bg-danger/20 text-danger border-2 border-danger/30 hover:bg-danger/30'
                  }`}
                  onClick={() => setSelectedOutcome('no')}
                  disabled={isResolving}
                >
                  NO
                </button>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowResolveModal(false)
                    setResolveError(null)
                    setSelectedOutcome(null)
                  }}
                  disabled={isResolving}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (selectedOutcome) {
                      handleResolve(selectedOutcome)
                    }
                  }}
                  disabled={isResolving || !selectedOutcome}
                  className="flex-1"
                >
                  {isResolving ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={20} />
                      Resolving...
                    </>
                  ) : (
                    'Confirm Resolution'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Participants List */}
        {duel.participants.length > 0 && (
          <Card variant="glass" className="p-6">
            <h3 className="text-xl font-bold mb-4">
              Participants ({duel.participants.length})
            </h3>
            <div className="space-y-2">
              {duel.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      participant.prediction === 'yes' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                    }`}>
                      {participant.user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold">@{participant.user.username}</div>
                      <div className="text-sm text-white/60">
                        {participant.prediction.toUpperCase()} - {participant.stake.toFixed(2)} {currency}
                      </div>
                    </div>
                  </div>
                  {duel.status === 'resolved' && (
                    <Badge variant={participant.won ? 'success' : 'danger'}>
                      {participant.won ? 'Won' : 'Lost'}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
      
      <MobileNav />
    </div>
  )
}
