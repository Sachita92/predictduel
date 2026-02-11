'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Share2, MessageCircle, Loader2, ArrowLeft, X, MoreVertical, Edit, Trash2, Copy, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import TopNav from '@/components/navigation/TopNav'
import MobileNav from '@/components/navigation/MobileNav'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import CountdownTimer from '@/components/ui/CountdownTimer'
import PredictionMarketChart from '@/components/charts/PredictionMarketChart'
import { LineChartComponent, LineChartData } from '@/components/charts/ProbabilityBarChart'
import { getWalletAddress, getSolanaWalletProvider } from '@/lib/privy-helpers'
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
  options?: string[] // Optional options array
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
  
  // Delete duel state
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  
  // Comments state
  const [comments, setComments] = useState<Array<{
    id: string
    text: string
    createdAt: string
    user: {
      id: string
      username: string
      avatar: string
      privyId?: string | null
    }
  }>>([])
  const [commentText, setCommentText] = useState('')
  const [isPostingComment, setIsPostingComment] = useState(false)
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)
  
  // Probability history state
  const [probabilityHistory, setProbabilityHistory] = useState<Array<{
    time: string
    timestamp: Date
    yesProbability: number
    noProbability: number
    yesStake: number
    noStake: number
    poolSize: number
    yesCount: number
    noCount: number
  }>>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [isEditingComment, setIsEditingComment] = useState(false)
  const [isDeletingComment, setIsDeletingComment] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [showDeleteCommentModal, setShowDeleteCommentModal] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null)
  
  // Share functionality state
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const shareMenuRef = useRef<HTMLDivElement>(null)
  
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
  const userParticipation = useMemo(() => {
    if (!duel?.participants || !user) return undefined
    
    // Try multiple matching strategies for reliability
    return duel.participants.find((p) => {
      // Match by MongoDB user ID if available
      if (currentUserId && p.user.id === currentUserId) return true
      
      // Match by wallet address (case-insensitive)
      if (walletAddress && p.user.walletAddress) {
        return p.user.walletAddress.toLowerCase() === walletAddress.toLowerCase()
      }
      
      // Match by Privy ID if available in user object
      // Note: participants might not have privyId, so this is a fallback
      return false
    })
  }, [duel?.participants, currentUserId, user, walletAddress])
  
  const isCreator = useMemo(() => user?.id && duel?.creator.privyId === user.id, [user?.id, duel?.creator.privyId])
  
  // Only consider hasParticipated true if we actually found participation OR if we just voted successfully
  const hasParticipated = useMemo(() => {
    // If we have userParticipation, definitely participated
    if (userParticipation) return true
    
    // If hasVoted is true, we just voted (optimistic update)
    // But only trust it if we're authenticated and have user info
    if (hasVoted && authenticated && user) return true
    
    return false
  }, [userParticipation, hasVoted, authenticated, user])
  
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
  
  // Delete conditions - can delete if no votes (yesCount === 0 && noCount === 0)
  const canDelete = useMemo(() => 
    isCreator && duel && duel.yesCount === 0 && duel.noCount === 0 && duel.participants.length === 0,
    [isCreator, duel]
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
      
      // Sync hasVoted with server state - check multiple ways
      if (data.duel.participants && user) {
        const participated = data.duel.participants.some((p: any) => {
          // Match by MongoDB user ID
          if (currentUserId && p.user.id === currentUserId) return true
          
          // Match by wallet address (case-insensitive)
          if (walletAddress && p.user.walletAddress) {
            return p.user.walletAddress.toLowerCase() === walletAddress.toLowerCase()
          }
          
          return false
        })
        setHasVoted(participated)
      } else {
        // If no user or no participants, reset hasVoted
        setHasVoted(false)
      }
    } catch (error) {
      console.error('Error fetching duel:', error)
      setBetError(error instanceof Error ? error.message : 'Failed to load duel')
    } finally {
      setIsLoading(false)
    }
  }, [id, currentUserId, walletAddress, user])
  
  const fetchProbabilityHistory = useCallback(async () => {
    if (!id) return
    try {
      setIsLoadingHistory(true)
      const response = await fetch(`/api/duels/${id}/probability-history?limit=100&hours=168`) // Last 7 days
      const data = await response.json()
      
      if (response.ok && data.success) {
        setProbabilityHistory(data.history || [])
      }
    } catch (error) {
      console.error('Error fetching probability history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [id])

  const fetchComments = useCallback(async () => {
    if (!id) return
    try {
      setIsLoadingComments(true)
      const response = await fetch(`/api/duels/${id}/comments`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch comments')
      }
      
      setComments(data.comments || [])
    } catch (error) {
      console.error('Error fetching comments:', error)
      setCommentError(error instanceof Error ? error.message : 'Failed to load comments')
    } finally {
      setIsLoadingComments(false)
    }
  }, [id])
  
  useEffect(() => {
    if (id) {
      fetchDuel()
      fetchComments()
      fetchProbabilityHistory()
    }
  }, [id, fetchDuel, fetchComments, fetchProbabilityHistory])
  
  const handlePostComment = useCallback(async () => {
    if (!user || !commentText.trim()) return
    
    setIsPostingComment(true)
    setCommentError(null)
    
    try {
      const response = await fetch(`/api/duels/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privyId: user.id,
          text: commentText.trim(),
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to post comment')
      }
      
      // Add new comment to the list (ensure privyId is included)
      const newComment = {
        ...data.comment,
        user: {
          ...data.comment.user,
          privyId: user?.id || null,
        },
      }
      setComments((prev) => [newComment, ...prev])
      setCommentText('')
    } catch (error) {
      console.error('Error posting comment:', error)
      setCommentError(error instanceof Error ? error.message : 'Failed to post comment')
    } finally {
      setIsPostingComment(false)
    }
  }, [user, commentText, id])

  const handleEditComment = useCallback(async (commentId: string) => {
    if (!user || !editCommentText.trim()) return
    
    setIsEditingComment(true)
    setCommentError(null)
    
    try {
      const response = await fetch(`/api/duels/${id}/comments`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId,
          privyId: user.id,
          text: editCommentText.trim(),
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update comment')
      }
      
      // Update comment in the list
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, text: data.comment.text }
            : c
        )
      )
      setEditingCommentId(null)
      setEditCommentText('')
      setOpenMenuId(null)
    } catch (error) {
      console.error('Error updating comment:', error)
      setCommentError(error instanceof Error ? error.message : 'Failed to update comment')
    } finally {
      setIsEditingComment(false)
    }
  }, [user, editCommentText, id])

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!user) return
    
    setIsDeletingComment(true)
    setCommentError(null)
    
    try {
      const response = await fetch(`/api/duels/${id}/comments?commentId=${commentId}&privyId=${user.id}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete comment')
      }
      
      // Remove comment from the list
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      setOpenMenuId(null)
      setShowDeleteCommentModal(false)
      setCommentToDelete(null)
    } catch (error) {
      console.error('Error deleting comment:', error)
      setCommentError(error instanceof Error ? error.message : 'Failed to delete comment')
    } finally {
      setIsDeletingComment(false)
    }
  }, [user, id])

  const startEditComment = useCallback((comment: { id: string; text: string }) => {
    setEditingCommentId(comment.id)
    setEditCommentText(comment.text)
    setOpenMenuId(null)
  }, [])

  const cancelEditComment = useCallback(() => {
    setEditingCommentId(null)
    setEditCommentText('')
    setOpenMenuId(null)
  }, [])
  
  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false)
      }
    }
    
    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showShareMenu])
  
  // Share functions
  const getShareUrl = useCallback(() => {
    if (typeof window !== 'undefined') {
      return window.location.href
    }
    return ''
  }, [])
  
  const getShareText = useCallback(() => {
    if (!duel) return ''
    return `Check out this prediction duel: "${duel.question}"\n\nPool: ${duel.poolSize.toFixed(2)} ${currency}\n\n`
  }, [duel, currency])
  
  // Check if native share is available
  const canUseNativeShare = useMemo(() => {
    return typeof navigator !== 'undefined' && navigator.share !== undefined
  }, [])
  
  const handleShare = useCallback((platform: string) => {
    const url = getShareUrl()
    const text = getShareText()
    
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + url)}`, '_blank')
        break
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank')
        break
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
        break
      case 'discord':
        // Discord doesn't have a direct share URL, so we'll copy to clipboard
        navigator.clipboard.writeText(`${text}${url}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        break
      case 'native':
        // Use Web Share API (mobile)
        if (navigator.share) {
          navigator.share({
            title: duel?.question || 'Prediction Duel',
            text: text,
            url: url,
          }).catch(() => {})
        }
        break
      case 'copy':
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        break
    }
    
    setShowShareMenu(false)
  }, [getShareUrl, getShareText, duel])
  
  const handleBet = useCallback(async (prediction: 'yes' | 'no') => {
    // Prevent double-submission
    if (isBetting) {
      return
    }
    
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
      // Step 1: Get Solana wallet provider (supports Phantom, Solflare, Backpack, MetaMask, etc.)
      let solanaProvider: any = null
      
      solanaProvider = await getSolanaWalletProvider()
      
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
        throw new Error('No Solana wallet found. Please install and connect a Solana wallet like Phantom, Solflare, Backpack, or MetaMask (with Solana enabled).')
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
        // Check if error is about duplicate transaction
        const errorMsg = data.error || 'Failed to place bet'
        if (errorMsg.includes('already been processed') || errorMsg.includes('already processed')) {
          // Transaction was successful but we're trying to submit it again
          // Refresh to get latest state
          await fetchDuel()
          await fetchProbabilityHistory()
          setBetError('Transaction may have already been processed. Refreshing...')
          setTimeout(() => {
            setBetError(null)
          }, 3000)
          return
        }
        throw new Error(errorMsg)
      }
      
      setBetSuccess(true)
      setHasVoted(true) // Immediately mark as voted to disable buttons
      
      // Refresh duel data and probability history
      await fetchDuel()
      await fetchProbabilityHistory()

      // Clear success state after a short delay (no refetch)
      setTimeout(() => {
        setBetSuccess(false)
      }, 2000)
      
    } catch (error) {
      console.error('Error placing bet:', error)
      
      // Handle specific Solana transaction errors
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      if (errorMessage.includes('already been processed') || 
          errorMessage.includes('already processed') ||
          errorMessage.includes('Transaction simulation failed')) {
        // Transaction might have succeeded - refresh to check
        await fetchDuel()
        await fetchProbabilityHistory()
        setBetError('Transaction may have already been processed. Please refresh the page to see your bet.')
      } else {
        setBetError(errorMessage)
      }
      // Don't set hasVoted on error, allow retry
    } finally {
      setIsBetting(false)
    }
  }, [duel, user, walletAddress, id, betAmount, currentUserId, fetchDuel, fetchProbabilityHistory, isBetting, wallets])
  
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
      // Step 1: Get Solana wallet provider (supports Phantom, Solflare, Backpack, MetaMask, etc.)
      let solanaProvider: any = null
      
      solanaProvider = await getSolanaWalletProvider()
      
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
        throw new Error('No Solana wallet found. Please install and connect a Solana wallet like Phantom, Solflare, Backpack, or MetaMask (with Solana enabled).')
      }
      
      // Step 1.5: Verify the connected wallet matches the creator's wallet
      const connectedWalletAddress = solanaProvider.publicKey?.toString()
      const creatorWalletAddress = duel.creator.walletAddress
      
      if (!connectedWalletAddress) {
        throw new Error('Could not get wallet address. Please ensure your wallet is connected.')
      }
      
      if (creatorWalletAddress && connectedWalletAddress !== creatorWalletAddress) {
        throw new Error(
          `Wallet mismatch! This duel was created with wallet ${creatorWalletAddress.slice(0, 8)}...${creatorWalletAddress.slice(-8)}. ` +
          `Please connect the same wallet that was used to create this duel (currently connected: ${connectedWalletAddress.slice(0, 8)}...${connectedWalletAddress.slice(-8)}).`
        )
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
      
      // Refresh duel data without unnecessary reloads
      await fetchDuel()

      // Clear success state after a short delay (no refetch)
      setTimeout(() => {
        setResolveSuccess(false)
      }, 1500)
      
    } catch (error) {
      console.error('Error resolving duel:', error)
      setResolveError(error instanceof Error ? error.message : 'Failed to resolve duel')
    } finally {
      setIsResolving(false)
    }
  }, [duel, user, walletAddress, id, wallets, fetchDuel])
  
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
      // Step 1: Get Solana wallet provider (supports Phantom, Solflare, Backpack, MetaMask, etc.)
      let solanaProvider: any = null
      
      solanaProvider = await getSolanaWalletProvider()
      
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
        throw new Error('No Solana wallet found. Please install and connect a Solana wallet like Phantom, Solflare, Backpack, or MetaMask (with Solana enabled).')
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
      
      // Refresh duel data without unnecessary reloads
      await fetchDuel()

      // Clear success indicators after a short delay (no refetch)
      setTimeout(() => {
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
  }, [duel, user, walletAddress, userParticipation, id, wallets, fetchDuel])
  
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
      // Step 1: Get Solana wallet provider (supports Phantom, Solflare, Backpack, MetaMask, etc.)
      let solanaProvider: any = null
      
      solanaProvider = await getSolanaWalletProvider()
      
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
        throw new Error('No Solana wallet found. Please install and connect a Solana wallet like Phantom, Solflare, Backpack, or MetaMask (with Solana enabled).')
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
      
      // Refresh duel data without unnecessary reloads
      await fetchDuel()

      // Clear success indicators after a short delay (no refetch)
      setTimeout(() => {
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
  
  const handleDelete = useCallback(async () => {
    if (!duel || !user) {
      setDeleteError('Please connect your wallet')
      return
    }
    
    setIsDeleting(true)
    setDeleteError(null)
    
    try {
      const response = await fetch(`/api/duels/${id}?privyId=${user.id}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete duel')
      }
      
      // Redirect to duels page after successful deletion
      router.push('/duels')
      
    } catch (error) {
      console.error('Error deleting duel:', error)
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete duel')
    } finally {
      setIsDeleting(false)
    }
  }, [duel, user, id, router])
  
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

  // Calculate potential payout and odds based on current pool distribution
  const totalPool = useMemo(() => (duel?.poolSize || 0) + betAmount, [duel?.poolSize, betAmount])
  
  // Calculate potential payout if betting YES
  const yesPayout = useMemo(() => {
    if (totalPool === 0 || betAmount === 0) return 0
    const newYesPool = yesStake + betAmount
    if (newYesPool === 0) return 0
    // Payout = (your_stake / winning_pool) * total_pool
    return (betAmount / newYesPool) * totalPool
  }, [yesStake, betAmount, totalPool])

  // Calculate potential payout if betting NO
  const noPayout = useMemo(() => {
    if (totalPool === 0 || betAmount === 0) return 0
    const newNoPool = noStake + betAmount
    if (newNoPool === 0) return 0
    // Payout = (your_stake / winning_pool) * total_pool
    return (betAmount / newNoPool) * totalPool
  }, [noStake, betAmount, totalPool])

  // Calculate profit (payout - stake)
  const yesProfit = yesPayout - betAmount
  const noProfit = noPayout - betAmount

  // Calculate implied probability (current odds)
  const yesProbability = totalPool > 0 ? (yesStake / totalPool) * 100 : 50
  const noProbability = totalPool > 0 ? (noStake / totalPool) * 100 : 50
  
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
      
      <div className="max-w-7xl mx-auto px-4 py-8">
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
            <div className="flex gap-2 relative" ref={shareMenuRef}>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowShareMenu(!showShareMenu)}
              >
                <Share2 size={16} className="mr-2" />
                Share
              </Button>
              
              {/* Share Dropdown Menu */}
              {showShareMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowShareMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 z-20 bg-[#1a1d29] border border-white/10 rounded-lg shadow-xl min-w-[200px] overflow-hidden">
                    <button
                      onClick={() => handleShare('whatsapp')}
                      className="w-full px-4 py-3 text-left text-sm text-white/90 hover:bg-white/10 flex items-center gap-3 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      WhatsApp
                    </button>
                    <button
                      onClick={() => handleShare('telegram')}
                      className="w-full px-4 py-3 text-left text-sm text-white/90 hover:bg-white/10 flex items-center gap-3 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                      </svg>
                      Telegram
                    </button>
                    <button
                      onClick={() => handleShare('twitter')}
                      className="w-full px-4 py-3 text-left text-sm text-white/90 hover:bg-white/10 flex items-center gap-3 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      Twitter
                    </button>
                    <button
                      onClick={() => handleShare('discord')}
                      className="w-full px-4 py-3 text-left text-sm text-white/90 hover:bg-white/10 flex items-center gap-3 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                      Discord
                    </button>
                    <div className="border-t border-white/10" />
                    {canUseNativeShare && (
                      <button
                        onClick={() => handleShare('native')}
                        className="w-full px-4 py-3 text-left text-sm text-white/90 hover:bg-white/10 flex items-center gap-3 transition-colors"
                      >
                        <Share2 size={20} />
                        Share via...
                      </button>
                    )}
                    <button
                      onClick={() => handleShare('copy')}
                      className="w-full px-4 py-3 text-left text-sm text-white/90 hover:bg-white/10 flex items-center gap-3 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check size={20} className="text-success" />
                          <span className="text-success">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={20} />
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Creator Info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold overflow-hidden">
              {duel.creator.avatar ? (
                <img src={duel.creator.avatar} alt={duel.creator.username} className="w-full h-full object-cover" />
              ) : (
                duel.creator.username.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="text-xs text-white/60 mb-0.5">Created by</div>
              <div className="text-sm font-semibold text-white/90">@{duel.creator.username}</div>
            </div>
          </div>

          {/* Question with Timer and Status on the right */}
          <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-bold font-display flex-1 min-w-0">{duel.question}</h1>
            
            {/* Timer and Status on the right */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {duel.status !== 'resolved' && (
                <CountdownTimer targetDate={deadline} />
              )}
              
              {(() => {
                const deadlinePassed = deadlineDate ? new Date() >= deadlineDate : false
                const isExpired = deadlinePassed && duel.status !== 'resolved'
                
                if (isExpired) {
                  return (
                    <Badge variant="warning" className="text-sm px-3 py-1">
                      ⏰ Deadline Passed
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
                    className="text-sm px-3 py-1"
                  >
                    {duel.status === 'active' ? 'Active' :
                     duel.status === 'resolved' 
                       ? `Resolved: ${duel.options && duel.options.length === 2 
                           ? (duel.outcome === 'yes' ? duel.options[0] : duel.options[1])
                           : (duel.outcome === 'yes' ? 'YES' : 'NO')}` :
                     duel.status === 'pending' ? 'Pending' :
                     'Cancelled'}
                  </Badge>
                )
              })()}
            </div>
          </div>
          
          {/* Resolved Duel Summary Banner */}
          {duel.status === 'resolved' && duel.outcome && (
            <div className="mb-6 p-4 bg-gradient-to-r from-success/20 to-primary-from/20 border-2 border-success/50 rounded-xl">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="text-sm text-white/70 mb-1">Final Outcome</div>
                  <div className="text-2xl font-bold">
                    <Badge variant={duel.outcome === 'yes' ? 'success' : 'danger'} className="text-lg px-4 py-2">
                      {duel.options && duel.options.length === 2 
                        ? (duel.outcome === 'yes' ? duel.options[0] : duel.options[1])
                        : duel.outcome.toUpperCase()}
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

        {/* Main Content: Chart + Voting Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Chart Section (Middle - 2 columns on large screens) */}
          <div className="lg:col-span-2">
            {/* Conditional Chart: Price Chart for price questions, Bar Chart for non-price questions */}
            <Card variant="glass" className="p-6">
              {(() => {
                const question = duel.question.toLowerCase()
                
                // Detect if it's a price-related question
                const isPriceQuestion = 
                  question.includes('price') || 
                  question.includes('hit') || 
                  question.includes('reach') ||
                  question.includes('above') ||
                  question.includes('below') ||
                  question.includes('$') ||
                  question.includes('sol') || question.includes('solana') ||
                  question.includes('btc') || question.includes('bitcoin') ||
                  question.includes('eth') || question.includes('ethereum')
                
                if (isPriceQuestion) {
                  // Show price chart for price-related questions
                  let chartSymbol = 'BINANCE:SOLUSDT' // Default
                  
                  if (question.includes('sol') || question.includes('solana')) {
                    chartSymbol = 'BINANCE:SOLUSDT'
                  } else if (question.includes('btc') || question.includes('bitcoin')) {
                    chartSymbol = 'BINANCE:BTCUSDT'
                  } else if (question.includes('eth') || question.includes('ethereum')) {
                    chartSymbol = 'BINANCE:ETHUSDT'
                  }
                  
                  return (
                    <PredictionMarketChart
                      symbol={chartSymbol}
                      yesLiquidity={yesStake}
                      noLiquidity={noStake}
                      height={400}
                      theme="dark"
                    />
                  )
                } else {
                  // Show probability line chart for non-price questions (e.g., "Will it rain?", "Will X win?")
                  const totalStake = yesStake + noStake
                  const yesProbability = totalStake > 0 ? (yesStake / totalStake) * 100 : 50
                  const noProbability = totalStake > 0 ? (noStake / totalStake) * 100 : 50
                  
                  // Transform historical probability data for line chart
                  let lineChartData: LineChartData[] = []
                  
                  if (probabilityHistory.length > 0) {
                    // Use historical data if available
                    lineChartData = probabilityHistory.map((entry, index) => {
                      const date = new Date(entry.timestamp)
                      // Format time as "HH:MM" or "MM/DD HH:MM" if different day
                      const timeStr = date.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: false 
                      })
                      const dateStr = date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })
                      
                      // Show date if it's the first entry or if date changed
                      const prevEntry = index > 0 ? probabilityHistory[index - 1] : null
                      const showDate = !prevEntry || 
                        new Date(prevEntry.timestamp).toDateString() !== date.toDateString()
                      
                      return {
                        time: showDate ? `${dateStr} ${timeStr}` : timeStr,
                        value: entry.yesProbability,
                        label: `Yes: ${entry.yesProbability.toFixed(1)}% | No: ${entry.noProbability.toFixed(1)}%`,
                      }
                    })
                  } else {
                    // Fallback to current value if no history
                    lineChartData = [
                      { 
                        time: 'Current', 
                        value: yesProbability, 
                        label: `Yes Probability: ${yesProbability.toFixed(1)}%` 
                      },
                    ]
                  }
                  
                  return (
                    <div>
                      {isLoadingHistory ? (
                        <div className="flex items-center justify-center h-[400px]">
                          <Loader2 className="animate-spin text-primary-from" size={32} />
                        </div>
                      ) : (
                        <LineChartComponent
                          data={lineChartData}
                          height={400}
                          theme="dark"
                          lineColor="#10b981"
                          showDots={lineChartData.length <= 20} // Only show dots if not too many points
                          yAxisLabel="Yes Probability (%)"
                          xAxisLabel=""
                        />
                      )}
                      <div className="mt-3 text-xs text-center text-slate-400 space-y-1">
                        <div>
                          <span className="font-medium">Current Probabilities:</span>{' '}
                          <span className="text-emerald-400">Yes {yesProbability.toFixed(1)}%</span>
                          {' | '}
                          <span className="text-red-400">No {noProbability.toFixed(1)}%</span>
                        </div>
                        {(yesStake !== undefined || noStake !== undefined) && (
                          <div>
                            <span className="font-medium">Liquidity:</span>{' '}
                            <span className="text-emerald-400">
                              Yes {yesStake >= 1000000 ? `${(yesStake / 1000000).toFixed(2)}M` : yesStake >= 1000 ? `${(yesStake / 1000).toFixed(2)}K` : yesStake.toFixed(0)}
                            </span>
                            {' | '}
                            <span className="text-red-400">
                              No {noStake >= 1000000 ? `${(noStake / 1000000).toFixed(2)}M` : noStake >= 1000 ? `${(noStake / 1000).toFixed(2)}K` : noStake.toFixed(0)}
                            </span>
                          </div>
                        )}
                        {probabilityHistory.length > 0 && (
                          <div className="text-slate-500 text-[10px] mt-1">
                            Showing {probabilityHistory.length} data point{probabilityHistory.length !== 1 ? 's' : ''} over time
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }
              })()}
            </Card>
          </div>
          
          {/* Voting Section (Right Sidebar - 1 column on large screens) */}
          <div className="lg:col-span-1">
            <Card variant="glass" className="p-6 sticky top-4">
              {/* Pool Stats */}
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-4">Pool Statistics</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-white/70">Total Pool</span>
                    <span className="text-xl font-bold gradient-text">
                      {duel.poolSize.toFixed(2)} {currency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                    <span className="text-white/70">YES</span>
                    <div className="text-right">
                      <div className="text-lg font-bold text-success">{duel.yesCount}</div>
                      <div className="text-xs text-white/60">{yesStake.toFixed(2)} {currency}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-danger/10 rounded-lg">
                    <span className="text-white/70">NO</span>
                    <div className="text-right">
                      <div className="text-lg font-bold text-danger">{duel.noCount}</div>
                      <div className="text-xs text-white/60">{noStake.toFixed(2)} {currency}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Betting Section */}
              {authenticated && !isCreator && (
                <div>
                  <h3 className="text-lg font-bold mb-4">Place Your Bet</h3>
                  
                  {!canBet && (
                    <div className="mb-4 p-3 bg-warning/20 border border-warning/30 rounded-lg text-warning text-xs">
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
                    <div className="mb-4 p-3 bg-danger/20 border border-danger/30 rounded-lg text-danger text-xs">
                      {betError}
                    </div>
                  )}
                  
                  {betSuccess && (
                    <div className="mb-4 p-3 bg-success/20 border border-success/30 rounded-lg text-success text-xs">
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
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-primary-from focus:outline-none text-white"
                      disabled={isBetting || !canBet}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setBetAmount(1)}
                        className="flex-1 px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded transition-colors"
                        disabled={isBetting || !canBet}
                      >
                        +$1
                      </button>
                      <button
                        type="button"
                        onClick={() => setBetAmount(20)}
                        className="flex-1 px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded transition-colors"
                        disabled={isBetting || !canBet}
                      >
                        +$20
                      </button>
                      <button
                        type="button"
                        onClick={() => setBetAmount(100)}
                        className="flex-1 px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded transition-colors"
                        disabled={isBetting || !canBet}
                      >
                        +$100
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {duel.options && duel.options.length === 2 ? (
                      <>
                        <button
                          type="button"
                          className="w-full h-16 text-xl font-bold bg-success hover:bg-green-600 text-white border-0 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
                          onClick={handleYesBet}
                          disabled={isBetting || !canBet}
                        >
                          {isBetting && selectedPrediction === 'yes' ? (
                            <Loader2 className="animate-spin" size={24} />
                          ) : (
                            <>{duel.options[0]} <span className="ml-2 text-sm opacity-80">
                              {yesProfit > 0 ? `+${yesProfit.toFixed(2)} ${currency}` : `${yesPayout.toFixed(2)} ${currency}`}
                            </span></>
                          )}
                        </button>
                        
                        <button
                          type="button"
                          className="w-full h-16 text-xl font-bold bg-white/10 hover:bg-white/20 text-white border-0 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
                          onClick={handleNoBet}
                          disabled={isBetting || !canBet}
                        >
                          {isBetting && selectedPrediction === 'no' ? (
                            <Loader2 className="animate-spin" size={24} />
                          ) : (
                            <>{duel.options[1]} <span className="ml-2 text-sm opacity-80">
                              {noProfit > 0 ? `+${noProfit.toFixed(2)} ${currency}` : `${noPayout.toFixed(2)} ${currency}`}
                            </span></>
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="w-full h-16 text-xl font-bold bg-success hover:bg-green-600 text-white border-0 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
                          onClick={handleYesBet}
                          disabled={isBetting || !canBet}
                        >
                          {isBetting && selectedPrediction === 'yes' ? (
                            <Loader2 className="animate-spin" size={24} />
                          ) : (
                            <>YES <span className="ml-2 text-sm opacity-80">
                              {yesProfit > 0 ? `+${yesProfit.toFixed(2)} ${currency}` : `${yesPayout.toFixed(2)} ${currency}`}
                            </span></>
                          )}
                        </button>
                        
                        <button
                          type="button"
                          className="w-full h-16 text-xl font-bold bg-white/10 hover:bg-white/20 text-white border-0 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
                          onClick={handleNoBet}
                          disabled={isBetting || !canBet}
                        >
                          {isBetting && selectedPrediction === 'no' ? (
                            <Loader2 className="animate-spin" size={24} />
                          ) : (
                            <>NO <span className="ml-2 text-sm opacity-80">
                              {noProfit > 0 ? `+${noProfit.toFixed(2)} ${currency}` : `${noPayout.toFixed(2)} ${currency}`}
                            </span></>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                  
                  {canBet && (
                    <div className="mt-4 p-3 bg-white/5 rounded-lg text-xs text-white/60">
                      <div className="flex items-center justify-between mb-1">
                        <span>Potential Payout (YES)</span>
                        <span className="text-success font-semibold">
                          {yesPayout > 0 ? `${yesPayout.toFixed(2)} ${currency}` : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <span>Potential Payout (NO)</span>
                        <span className="text-white/80 font-semibold">
                          {noPayout > 0 ? `${noPayout.toFixed(2)} ${currency}` : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Current Odds</span>
                        <span>YES: {yesProbability.toFixed(1)}% | NO: {noProbability.toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
        
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
            
            {canDelete && (
              <div className="mt-4">
                {deleteError && (
                  <div className="mb-4 p-3 bg-danger/20 border border-danger/30 rounded-lg text-danger text-sm">
                    {deleteError}
                  </div>
                )}
                
                <Button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isDeleting}
                  className="w-full"
                  variant="destructive"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={20} />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <X size={18} className="mr-2" />
                      Delete Duel
                    </>
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
        
        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-background-dark border border-white/10 rounded-xl p-6 max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-danger">Delete Duel</h3>
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeleteError(null)
                  }}
                  className="text-white/60 hover:text-white transition-colors"
                  disabled={isDeleting}
                >
                  <X size={24} />
                </button>
              </div>
              
              <p className="text-white/70 mb-6">
                Are you sure you want to delete this duel? This action cannot be undone. The duel will be permanently removed.
              </p>
              
              {deleteError && (
                <div className="mb-4 p-3 bg-danger/20 border border-danger/30 rounded-lg text-danger text-sm">
                  {deleteError}
                </div>
              )}
              
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeleteError(null)
                  }}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1"
                  variant="destructive"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={20} />
                      Deleting...
                    </>
                  ) : (
                    'Delete Duel'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Participants List */}
        {duel.participants.length > 0 && (
          <Card variant="glass" className="p-6 mb-6">
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
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold overflow-hidden ${
                      participant.prediction === 'yes' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                    }`}>
                      {participant.user.avatar ? (
                        <img src={participant.user.avatar} alt={participant.user.username} className="w-full h-full object-cover" />
                      ) : (
                        participant.user.username.charAt(0).toUpperCase()
                      )}
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
        
        {/* Comments Section */}
        <Card variant="glass" className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle size={20} />
            <h3 className="text-xl font-bold">
              Comments ({comments.length})
            </h3>
          </div>
          
          {/* Post Comment Form */}
          {authenticated && (
            <div className="mb-6">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-primary-from focus:outline-none text-white placeholder-white/40 resize-none"
                rows={3}
                maxLength={500}
                disabled={isPostingComment}
              />
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-white/60">
                  {commentText.length}/500 characters
                </div>
                <Button
                  onClick={handlePostComment}
                  disabled={isPostingComment || !commentText.trim()}
                  size="sm"
                >
                  {isPostingComment ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={16} />
                      Posting...
                    </>
                  ) : (
                    'Post Comment'
                  )}
                </Button>
              </div>
              {commentError && (
                <div className="mt-2 p-2 bg-danger/20 border border-danger/30 rounded-lg text-danger text-sm">
                  {commentError}
                </div>
              )}
            </div>
          )}
          
          {!authenticated && (
            <div className="mb-6 p-4 bg-white/5 rounded-lg text-center text-white/60 text-sm">
              Please log in to post a comment
            </div>
          )}
          
          {/* Comments List */}
          {isLoadingComments ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-primary-from" size={24} />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-white/60">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => {
                // Check if current user owns the comment - compare by privyId (most reliable)
                const isCurrentUserByPrivyId = user?.id && comment.user.privyId === user.id
                // Fallback: compare by MongoDB ID if privyId not available
                const isCurrentUserById = currentUserId && comment.user.id === currentUserId
                const isCurrentUser = isCurrentUserByPrivyId || isCurrentUserById
                const isEditing = editingCommentId === comment.id
                
                return (
                  <div
                    key={comment.id}
                    className="p-4 bg-white/5 rounded-lg relative"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center font-bold text-white flex-shrink-0 overflow-hidden">
                        {comment.user.avatar ? (
                          <img src={comment.user.avatar} alt={comment.user.username} className="w-full h-full object-cover" />
                        ) : (
                          comment.user.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">@{comment.user.username}</span>
                            <span className="text-xs text-white/60">
                              {new Date(comment.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          
                          {/* Three-dot menu - only show for current user's comments */}
                          {authenticated && isCurrentUser && !isEditing && (
                            <div className="relative">
                              <button
                                onClick={() => setOpenMenuId(openMenuId === comment.id ? null : comment.id)}
                                className="p-1 hover:bg-white/10 rounded transition-colors"
                                disabled={isDeletingComment}
                              >
                                <MoreVertical size={16} className="text-white/60" />
                              </button>
                              
                              {/* Dropdown menu */}
                              {openMenuId === comment.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setOpenMenuId(null)}
                                  />
                                  <div className="absolute right-0 top-8 z-20 bg-[#1a1d29] border border-white/10 rounded-lg shadow-xl min-w-[120px] overflow-hidden">
                                    <button
                                      onClick={() => startEditComment(comment)}
                                      className="w-full px-4 py-2 text-left text-sm text-white/90 hover:bg-white/10 flex items-center gap-2 transition-colors"
                                    >
                                      <Edit size={14} />
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        setCommentToDelete(comment.id)
                                        setShowDeleteCommentModal(true)
                                        setOpenMenuId(null)
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-danger/10 flex items-center gap-2 transition-colors"
                                      disabled={isDeletingComment}
                                    >
                                      <Trash2 size={14} />
                                      Delete
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Edit mode */}
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={editCommentText}
                              onChange={(e) => setEditCommentText(e.target.value)}
                              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-primary-from focus:outline-none text-white placeholder-white/40 resize-none"
                              rows={3}
                              maxLength={500}
                              disabled={isEditingComment}
                              autoFocus
                            />
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-white/60">
                                {editCommentText.length}/500 characters
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={cancelEditComment}
                                  className="px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 rounded transition-colors"
                                  disabled={isEditingComment}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleEditComment(comment.id)}
                                  disabled={isEditingComment || !editCommentText.trim()}
                                  className="px-3 py-1.5 text-sm bg-primary-from hover:bg-primary-to rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isEditingComment ? (
                                    <>
                                      <Loader2 className="animate-spin inline mr-1" size={14} />
                                      Saving...
                                    </>
                                  ) : (
                                    'Save'
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-white/90 whitespace-pre-wrap break-words">
                            {comment.text}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
      
      {/* Delete Comment Confirmation Modal */}
      {showDeleteCommentModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-background-dark border border-white/10 rounded-xl p-6 max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-danger">Delete Comment</h3>
              <button
                onClick={() => {
                  setShowDeleteCommentModal(false)
                  setCommentToDelete(null)
                  setCommentError(null)
                }}
                className="text-white/60 hover:text-white transition-colors"
                disabled={isDeletingComment}
              >
                <X size={24} />
              </button>
            </div>
            
            <p className="text-white/70 mb-6">
              Are you sure you want to delete this comment? This action cannot be undone. The comment will be permanently removed.
            </p>
            
            {commentError && (
              <div className="mb-4 p-3 bg-danger/20 border border-danger/30 rounded-lg text-danger text-sm">
                {commentError}
              </div>
            )}
            
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteCommentModal(false)
                  setCommentToDelete(null)
                  setCommentError(null)
                }}
                disabled={isDeletingComment}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (commentToDelete) {
                    handleDeleteComment(commentToDelete)
                  }
                }}
                disabled={isDeletingComment}
                className="flex-1"
                variant="destructive"
              >
                {isDeletingComment ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20} />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} className="mr-2" />
                    Delete Comment
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <MobileNav />
    </div>
  )
}
