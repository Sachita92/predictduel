'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Share2, MessageCircle, Loader2, CheckCircle, XCircle } from 'lucide-react'
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
  }>
  marketPda: string | null
  createdAt: string
}

export default function DuelDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
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
  
  const walletAddress = getWalletAddress(user, APP_BLOCKCHAIN)
  const currency = getAppCurrency()
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
  
  // Get current user's participation
  const userParticipation = duel?.participants.find(
    (p) => currentUserId && p.user.id === currentUserId
  )
  
  const isCreator = user?.id && duel?.creator.privyId === user.id
  const hasParticipated = !!userParticipation
  const isDuelActive = duel?.status === 'active' || duel?.status === 'pending'
  const isDeadlineValid = duel?.deadline && new Date(duel.deadline) > new Date()
  const canBet = authenticated && !isCreator && !hasParticipated && isDuelActive && isDeadlineValid
  
  // Debug logging
  useEffect(() => {
    if (duel && user) {
      console.log('Betting Debug:', {
        authenticated,
        isCreator,
        hasParticipated,
        isDuelActive,
        isDeadlineValid,
        canBet,
        duelStatus: duel.status,
        deadline: duel.deadline,
        currentUserId,
        userParticipation: userParticipation ? 'found' : 'not found',
        participants: duel.participants.length
      })
    }
  }, [duel, user, authenticated, isCreator, hasParticipated, isDuelActive, isDeadlineValid, canBet, currentUserId])
  
  useEffect(() => {
    // Handle both sync and async params (Next.js 14 vs 15)
    if (typeof params === 'object' && 'then' in params) {
      params.then((resolvedParams) => {
        setId(resolvedParams.id)
      })
    } else {
      setId(params.id)
    }
  }, [params])
  
  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/login')
    }
  }, [ready, authenticated, router])
  
  useEffect(() => {
    if (id) {
      fetchDuel()
    }
  }, [id])
  
  const fetchDuel = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/duels/${id}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch duel')
      }
      
      setDuel(data.duel)
    } catch (error) {
      console.error('Error fetching duel:', error)
      setBetError(error instanceof Error ? error.message : 'Failed to load duel')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleBet = async (prediction: 'yes' | 'no') => {
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
      
      // Refresh duel data
      setTimeout(() => {
        fetchDuel()
        setBetSuccess(false)
      }, 2000)
      
    } catch (error) {
      console.error('Error placing bet:', error)
      setBetError(error instanceof Error ? error.message : 'Failed to place bet')
    } finally {
      setIsBetting(false)
    }
  }
  
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
  
  const deadline = new Date(duel.deadline)
  const isExpired = new Date() >= deadline
  const yesStake = duel.participants
    .filter(p => p.prediction === 'yes')
    .reduce((sum, p) => sum + p.stake, 0)
  const noStake = duel.participants
    .filter(p => p.prediction === 'no')
    .reduce((sum, p) => sum + p.stake, 0)
  
  return (
    <div className="min-h-screen bg-background-dark pb-20">
      <TopNav />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
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
          
          <div className="flex items-center justify-center mb-4">
            <CountdownTimer targetDate={deadline} />
          </div>
          
          <div className="text-center">
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
          </div>
        </div>
        
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
              <div className="mb-4 p-3 bg-success/20 border border-success/30 rounded-lg text-success text-sm flex items-center gap-2">
                <CheckCircle size={16} />
                Bet placed successfully! Refreshing...
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
              <Button
                variant={selectedPrediction === 'yes' ? 'primary' : 'outline'}
                className="h-20 text-xl font-bold"
                onClick={() => {
                  if (canBet && !isBetting) {
                    setSelectedPrediction('yes')
                    handleBet('yes')
                  }
                }}
                disabled={isBetting || !canBet}
              >
                {isBetting && selectedPrediction === 'yes' ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <>
                    <CheckCircle size={24} className="mr-2" />
                    YES
                  </>
                )}
              </Button>
              
              <Button
                variant={selectedPrediction === 'no' ? 'primary' : 'outline'}
                className="h-20 text-xl font-bold"
                onClick={() => {
                  if (canBet && !isBetting) {
                    setSelectedPrediction('no')
                    handleBet('no')
                  }
                }}
                disabled={isBetting || !canBet}
              >
                {isBetting && selectedPrediction === 'no' ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <>
                    <XCircle size={24} className="mr-2" />
                    NO
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}
        
        {/* User's Participation */}
        {hasParticipated && userParticipation && (
          <Card variant="glass" className="p-6 mb-6">
            <h3 className="text-xl font-bold mb-4">Your Bet</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold mb-1">
                  {userParticipation.prediction.toUpperCase()}
                </div>
                <div className="text-white/60">
                  Stake: {userParticipation.stake.toFixed(2)} {currency}
                </div>
              </div>
              {duel.status === 'resolved' && (
                <Badge variant={userParticipation.won ? 'success' : 'danger'}>
                  {userParticipation.won ? 'Won' : 'Lost'}
                </Badge>
              )}
            </div>
          </Card>
        )}
        
        {/* Creator Notice */}
        {isCreator && (
          <Card variant="glass" className="p-6 mb-6">
            <p className="text-white/60 text-center">
              You created this duel. You cannot bet on your own prediction.
            </p>
          </Card>
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
