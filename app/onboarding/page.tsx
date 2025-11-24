'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type OnboardingStep = 'username' | 'email' | 'complete'

export default function OnboardingPage() {
  const router = useRouter()
  const { ready, authenticated, user } = usePrivy()
  const [step, setStep] = useState<OnboardingStep>('username')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/login')
    }

    // Check if user has already completed onboarding in database
    const checkOnboarding = async () => {
      if (ready && authenticated && user?.id) {
        try {
          const response = await fetch(`/api/onboarding?privyId=${user.id}`)
          const data = await response.json()
          
          if (data.completed) {
            router.push('/')
          }
        } catch (error) {
          console.error('Error checking onboarding:', error)
        }
      }
    }

    checkOnboarding()
  }, [ready, authenticated, user?.id, router])

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username.trim()) {
      setError('Username is required')
      return
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }

    if (username.length > 20) {
      setError('Username must be less than 20 characters')
      return
    }

    // Check if username contains only valid characters
    const validUsername = /^[a-zA-Z0-9_-]+$/.test(username)
    if (!validUsername) {
      setError('Username can only contain letters, numbers, underscores, and hyphens')
      return
    }
    
    // Move to email step
    setStep('email')
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (email && !isValidEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)

    try {
      // Save to database
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privyId: user?.id,
          username,
          email: email || undefined,
          walletAddress: user?.wallet?.address,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete onboarding')
      }
      
      // Redirect to home
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Failed to save profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkipEmail = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Save to database without email
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privyId: user?.id,
          username,
          walletAddress: user?.wallet?.address,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete onboarding')
      }
      
      // Redirect to home
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Failed to save profile')
    } finally {
      setIsLoading(false)
    }
  }

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-dark flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {step === 'username' && (
          <motion.div
            key="username"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 max-w-md w-full"
          >
            {/* Progress Indicator */}
            <div className="flex gap-2 mb-8">
              <div className="flex-1 h-1 bg-purple-600 rounded-full"></div>
              <div className="flex-1 h-1 bg-slate-700 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Choose your username</h1>
              <p className="text-slate-400">This is how other users will see you on PredictDuel</p>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6"
              >
                <p className="text-red-300 text-sm">{error}</p>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleUsernameSubmit}>
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-lg"
                    autoFocus
                    disabled={isLoading}
                    maxLength={20}
                  />
                  {username && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                      {username.length}/20
                    </div>
                  )}
                </div>
                
                {/* Preview */}
                {username && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-3 bg-slate-900/30 rounded-lg border border-slate-700/50"
                  >
                    <p className="text-slate-400 text-xs mb-2">Preview:</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {username[0].toUpperCase()}
                      </div>
                      <span className="text-white font-medium">@{username}</span>
                    </div>
                  </motion.div>
                )}
                
                <p className="text-slate-500 text-xs mt-2">
                  3-20 characters, letters, numbers, underscores, and hyphens only
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || !username.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isLoading ? 'Saving...' : 'Continue'}
              </button>
            </form>
          </motion.div>
        )}

        {step === 'email' && (
          <motion.div
            key="email"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 max-w-md w-full"
          >
            {/* Progress Indicator */}
            <div className="flex gap-2 mb-8">
              <div className="flex-1 h-1 bg-purple-600 rounded-full"></div>
              <div className="flex-1 h-1 bg-purple-600 rounded-full"></div>
            </div>

            {/* Back Button */}
            <button
              onClick={() => setStep('username')}
              className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Add your email</h1>
              <p className="text-slate-400">Get updates and notifications (optional)</p>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6"
              >
                <p className="text-red-300 text-sm">{error}</p>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleEmailSubmit}>
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-lg"
                    autoFocus
                    disabled={isLoading}
                  />
                  {email && isValidEmail(email) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                    >
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </motion.div>
                  )}
                </div>
                
                {/* Benefits */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 space-y-2"
                >
                  {[
                    '📬 Get notified when someone challenges you',
                    '🏆 Receive weekly performance summaries',
                    '💡 Exclusive tips and market insights'
                  ].map((benefit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className="flex items-start gap-2 text-slate-400 text-sm"
                    >
                      <span>{benefit}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              <button
                type="submit"
                disabled={isLoading || (email.length > 0 && !isValidEmail(email))}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none mb-3"
              >
                {isLoading ? 'Saving...' : 'Connect Email'}
              </button>

              <button
                type="button"
                onClick={handleSkipEmail}
                disabled={isLoading}
                className="w-full bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-medium py-4 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                I'll do it later
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

