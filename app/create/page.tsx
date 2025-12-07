'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import TopNav from '@/components/navigation/TopNav'
import MobileNav from '@/components/navigation/MobileNav'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { getWalletAddress } from '@/lib/privy-helpers'
import { APP_BLOCKCHAIN } from '@/lib/blockchain-config'
import { createMarketOnChain } from '@/lib/solana-market'

const categories = [
  { id: 'crypto', icon: '💰', label: 'Crypto Prices' },
  { id: 'weather', icon: '⛅', label: 'Weather' },
  { id: 'sports', icon: '⚽', label: 'Sports' },
  { id: 'meme', icon: '🎭', label: 'Meme/Fun' },
]

const quickDeadlines = [
  { label: '1hr', value: 3600000 },
  { label: '24hr', value: 86400000 },
  { label: '1 week', value: 604800000 },
]

export default function CreatePage() {
  const router = useRouter()
  const { authenticated, user, ready } = usePrivy()
  const { wallets } = useWallets()
  const [step, setStep] = useState(1)
  const [category, setCategory] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [stake, setStake] = useState(0.1)
  const [deadline, setDeadline] = useState(86400000)
  const [duelType, setDuelType] = useState<'friend' | 'public'>('public')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  
  const totalSteps = 4
  
  // Get wallet address for the app's configured blockchain
  // This automatically uses the correct format (Solana, Ethereum, etc.) based on APP_BLOCKCHAIN setting
  const walletAddress = getWalletAddress(user, APP_BLOCKCHAIN)
  
  // Redirect to login if not authenticated (only when ready)
  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/login')
    }
  }, [ready, authenticated, router])
  
  // Show loading state while Privy initializes
  if (!ready) {
    return (
      <div className="min-h-screen bg-background-dark pb-20 flex items-center justify-center">
        <TopNav />
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary-from" size={48} />
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    )
  }
  
  // Show loading state while redirecting
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background-dark pb-20 flex items-center justify-center">
        <TopNav />
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary-from" size={48} />
          <p className="text-white/70">Redirecting to login...</p>
        </div>
      </div>
    )
  }
  
  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1)
  }
  
  const handleBack = () => {
    // If we're on step 1, go back to home page
    // Otherwise, go back to previous step
    if (step === 1) {
      router.push('/')
    } else {
      setStep(step - 1)
    }
  }
  
  /**
   * This function runs when you click "Launch Duel"
   * Think of it like mailing a letter - we package up all the information
   * and send it to our server to save in the database
   */
  const handleLaunch = async () => {
    // Step 1: Make sure we have all the required information
    if (!category || !question || !stake) {
      setError('Please fill in all fields')
      return
    }
    
    // Step 2: Show a loading spinner
    setIsLoading(true)
    setError(null)
    
    try {
      // Step 3: Calculate when the deadline is
      const deadlineDate = new Date(Date.now() + deadline)
      
      // Step 4: Get Solana wallet provider for on-chain transaction
      let solanaProvider: any = null
      
      // Try window.solana first (Phantom, Solflare, etc.)
      if (typeof window !== 'undefined' && (window as any).solana) {
        const provider = (window as any).solana
        if (provider.isPhantom || provider.isSolflare || provider.isBackpack) {
          if (provider.isConnected && provider.publicKey) {
            solanaProvider = provider
          } else {
            // Try to connect
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
        // Privy wallets might provide access differently
        // For now, we'll use window.solana as the primary method
        const solanaWallet = wallets.find((w: any) => 
          w.chainType === 'solana' || 
          (w.address && !w.address.startsWith('0x'))
        )
        
        // Note: Privy's wallet structure may need different access
        // This is a placeholder - you may need to adjust based on Privy's actual API
        if (solanaWallet && typeof window !== 'undefined' && (window as any).solana) {
          solanaProvider = (window as any).solana
        }
      }
      
      if (!solanaProvider) {
        throw new Error('No Solana wallet found. Please install and connect a Solana wallet like Phantom.')
      }
      
      // Step 5: Create market on-chain (user will sign transaction)
      let marketPda: string | null = null
      let transactionSignature: string | null = null
      
      try {
        // Ensure stake is a valid number
        const stakeAmount = typeof stake === 'number' && !isNaN(stake) && stake > 0 
          ? stake 
          : parseFloat(stake as any) || 0.01
        
        if (stakeAmount <= 0) {
          throw new Error('Stake amount must be greater than 0')
        }
        
        const onChainResult = await createMarketOnChain(solanaProvider, {
          question: question.trim(),
          category: category || 'other',
          stake: stakeAmount,
          deadline: deadlineDate,
          type: duelType,
        })
        marketPda = onChainResult.marketPda
        transactionSignature = onChainResult.signature
      } catch (onChainError) {
        console.error('On-chain creation error:', onChainError)
        throw new Error(
          onChainError instanceof Error 
            ? `Failed to create market on-chain: ${onChainError.message}`
            : 'Failed to create market on-chain. Please try again.'
        )
      }
      
      // Step 6: Send all the information to our server (including on-chain data)
      const response = await fetch('/api/predictions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creatorId: user?.id || 'temp-user-id',
          walletAddress: walletAddress,
          question: question,
          category: category,
          stake: stake,
          deadline: deadlineDate.toISOString(),
          type: duelType,
          marketPda: marketPda, // On-chain market address
          transactionSignature: transactionSignature, // Transaction signature
        }),
      })
      
      // Step 7: Check if it worked
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create duel')
      }
      
      // Step 8: Success! Show success message
      setIsLoading(false)
      setShowSuccess(true)
      
      // Wait 2 seconds to show success message, then navigate
      setTimeout(() => {
        router.push(`/duel/${data.prediction.id}`)
      }, 2000)
      
    } catch (err) {
      // If something went wrong, show an error message
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-background-dark pb-20">
      <TopNav />
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className="flex-1">
                  <div className={`
                    h-2 rounded-full transition-all
                    ${i + 1 <= step ? 'gradient-primary' : 'bg-white/10'}
                  `} />
                </div>
                {i < totalSteps - 1 && (
                  <div className={`
                    w-2 h-2 rounded-full mx-2 transition-all
                    ${i + 1 < step ? 'gradient-primary' : 'bg-white/10'}
                  `} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center text-sm text-white/60">
            Step {step} of {totalSteps}
          </div>
        </div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Step 1: Choose Category */}
            {step === 1 && (
              <Card variant="glass" className="p-8">
                <h2 className="text-3xl font-bold mb-6 text-center">Choose Category</h2>
                <div className="grid grid-cols-2 gap-4">
                  {categories.map((cat) => (
                    <motion.button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`
                        p-6 rounded-xl border-2 transition-all
                        ${category === cat.id
                          ? 'border-primary-from gradient-primary'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }
                      `}
                    >
                      <div className="text-4xl mb-2">{cat.icon}</div>
                      <div className="font-semibold">{cat.label}</div>
                    </motion.button>
                  ))}
                </div>
              </Card>
            )}
            
            {/* Step 2: Write Prediction */}
            {step === 2 && (
              <Card variant="glass" className="p-8">
                <h2 className="text-3xl font-bold mb-6 text-center">Write Your Prediction</h2>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Will SOL hit $200 this week?"
                  maxLength={100}
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:border-primary-from focus:ring-2 focus:ring-primary-from/50 resize-none"
                />
                <div className="flex justify-between items-center mt-2">
                  <div className="text-sm text-white/60">
                    {question.length}/100 characters
                  </div>
                  <div className="flex gap-2">
                    {['Will it rain tomorrow?', 'Will BTC pump?', 'Will SOL hit $200?'].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setQuestion(suggestion)}
                        className="text-xs px-3 py-1 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            )}
            
            {/* Step 3: Set Parameters */}
            {step === 3 && (
              <Card variant="glass" className="p-8 space-y-6">
                <h2 className="text-3xl font-bold mb-6 text-center">Set Parameters</h2>
                
                <div>
                  <label className="block mb-2 font-semibold">Stake Amount</label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0.01"
                      max="1"
                      step="0.01"
                      value={stake}
                      onChange={(e) => setStake(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-white/60">
                      <span>0.01 SOL</span>
                      <span className="text-lg font-bold text-white">{stake.toFixed(2)} SOL</span>
                      <span>1 SOL</span>
                    </div>
                    <div className="text-sm text-white/40 text-center">
                      ≈ ${(stake * 100).toFixed(2)} USD
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block mb-2 font-semibold">Deadline</label>
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {quickDeadlines.map((qd) => (
                      <button
                        key={qd.label}
                        type="button"
                        onClick={() => setDeadline(qd.value)}
                        className={`
                          px-4 py-2 rounded-lg transition-all
                          ${deadline === qd.value
                            ? 'gradient-primary'
                            : 'bg-white/5 hover:bg-white/10'
                          }
                        `}
                      >
                        {qd.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        // Set deadline to 1 hour ago for testing resolve functionality
                        const oneHourAgo = Date.now() - 3600000
                        setDeadline(oneHourAgo)
                      }}
                      className="px-4 py-2 rounded-lg bg-warning/20 hover:bg-warning/30 text-warning border border-warning/30 transition-all text-sm"
                      title="Set deadline to 1 hour ago (for testing resolve)"
                    >
                      Test (Past)
                    </button>
                  </div>
                  <input
                    type="datetime-local"
                    value={new Date(Date.now() + deadline).toISOString().slice(0, 16)}
                    onChange={(e) => {
                      const selectedDate = new Date(e.target.value).getTime()
                      const now = Date.now()
                      setDeadline(selectedDate - now)
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-from"
                  />
                  {deadline < 0 && (
                    <p className="mt-2 text-sm text-warning">
                      ⚠️ Deadline is in the past - good for testing resolve functionality!
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block mb-2 font-semibold">Duel Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setDuelType('friend')}
                      className={`
                        p-4 rounded-xl border-2 transition-all
                        ${duelType === 'friend'
                          ? 'border-primary-from gradient-primary'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }
                      `}
                    >
                      Challenge Friend
                    </button>
                    <button
                      onClick={() => setDuelType('public')}
                      className={`
                        p-4 rounded-xl border-2 transition-all
                        ${duelType === 'public'
                          ? 'border-primary-from gradient-primary'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }
                      `}
                    >
                      Public Pool
                    </button>
                  </div>
                </div>
              </Card>
            )}
            
            {/* Step 4: Preview & Launch */}
            {step === 4 && (
              <Card variant="glass" className="p-8">
                {showSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-12"
                  >
                    <div className="text-center">
                      <div className="text-6xl mb-4">🎉</div>
                      <h3 className="text-3xl font-bold text-success mb-2">
                        Duel Created Successfully!
                      </h3>
                      <p className="text-white/80 text-lg mb-4">
                        Your prediction is live!
                      </p>
                      <div className="flex items-center justify-center gap-2 text-white/60">
                        <Loader2 className="animate-spin" size={20} />
                        <span>Redirecting to your duel...</span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    <h2 className="text-3xl font-bold mb-6 text-center">Preview & Launch</h2>
                    
                    <Card variant="default" className="p-6 mb-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold">
                          You
                        </div>
                        <div>
                          <div className="font-semibold">Your Prediction</div>
                          <Badge variant="info">{category}</Badge>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-4">{question}</h3>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Stake:</span>
                        <span className="font-bold">{stake.toFixed(2)} SOL</span>
                      </div>
                    </Card>
                    
                    <div className="text-center mb-6">
                      <div className="text-2xl font-bold gradient-text mb-2">
                        Estimated Winnings: {(stake * 1.8).toFixed(2)} SOL
                      </div>
                      <div className="text-sm text-white/60">
                        (if you win)
                      </div>
                    </div>
                    
                    {error && (
                      <div className="mb-4 p-4 bg-danger/20 border border-danger/30 rounded-xl text-danger text-sm">
                        {error}
                      </div>
                    )}
                  </>
                )}
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
        
        {/* Navigation Buttons */}
        {!showSuccess && (
          <div className="flex justify-between mt-8">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={isLoading}
            >
              <ArrowLeft className="mr-2" size={20} />
              {step === 1 ? 'Back to Home' : 'Back'}
            </Button>
            
            {step < totalSteps ? (
              <Button onClick={handleNext} disabled={step === 1 && !category || step === 2 && !question}>
                Next
                <ArrowRight className="ml-2" size={20} />
              </Button>
            ) : (
              <Button 
                onClick={handleLaunch} 
                glow 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" size={20} />
                    Creating Duel...
                  </>
                ) : (
                  <>
                    Launch Duel 🚀
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
      
      <MobileNav />
    </div>
  )
}

