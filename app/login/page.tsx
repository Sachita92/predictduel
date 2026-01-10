'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FaWallet } from 'react-icons/fa'
import { getWalletAddress, detectChainFromAddress } from '@/lib/privy-helpers'

export default function LoginPage() {
  const router = useRouter()
  const { login, authenticated, ready, user } = usePrivy()
  const [loginError, setLoginError] = useState<string | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  useEffect(() => {
    const checkOnboardingAndRedirect = async () => {
      if (ready && authenticated && user?.id) {
        // First, verify that the user connected with a Solana wallet
        const walletAddress = getWalletAddress(user, 'solana')
        const chainType = walletAddress ? detectChainFromAddress(walletAddress) : null
        
        // Check all linked accounts for non-Solana wallets
        if (user.linkedAccounts && user.linkedAccounts.length > 0) {
          for (const account of user.linkedAccounts) {
            if (account.type === 'wallet' && account.address) {
              const detectedChain = detectChainFromAddress(account.address)
              if (detectedChain && detectedChain !== 'solana') {
                setLoginError(
                  `❌ This app only supports Solana wallets!\n\n` +
                  `You connected with a ${detectedChain} wallet. Please disconnect and connect with a Solana wallet ` +
                  `(Phantom, Solflare, or Backpack) to continue.`
                )
                return // Don't proceed with onboarding check
              }
            }
          }
        }
        
        // Check default wallet if it exists
        if (user.wallet?.address) {
          const detectedChain = detectChainFromAddress(user.wallet.address)
          if (detectedChain && detectedChain !== 'solana') {
            setLoginError(
              `❌ This app only supports Solana wallets!\n\n` +
              `You connected with a ${detectedChain} wallet. Please disconnect and connect with a Solana wallet ` +
              `(Phantom, Solflare, or Backpack) to continue.`
            )
            return // Don't proceed with onboarding check
          }
        }
        
        // Check if no Solana wallet is found
        if (!walletAddress || chainType !== 'solana') {
          setLoginError(
            `❌ No Solana wallet detected!\n\n` +
            `This app only supports Solana wallets. Please connect with a Solana wallet ` +
            `(Phantom, Solflare, or Backpack) to continue.`
          )
          return // Don't proceed with onboarding check
        }
        
        try {
          console.log('Checking onboarding status for user:', user.id)
          // Check if user has completed onboarding in database
          const response = await fetch(`/api/onboarding?privyId=${user.id}`)
          const data = await response.json()
          
          console.log('Onboarding status:', data)
          
          if (data.completed) {
            console.log('Onboarding completed, redirecting to home')
            router.push('/')
          } else {
            console.log('Onboarding not completed, redirecting to onboarding')
            router.push('/onboarding')
          }
        } catch (error) {
          console.error('Error checking onboarding:', error)
          // Default to onboarding page on error
          router.push('/onboarding')
        }
      }
    }

    checkOnboardingAndRedirect()
  }, [ready, authenticated, user, router])

  const handleLogin = async () => {
    setLoginError(null)
    setIsLoggingIn(true)
    
    try {
      // Privy will show all enabled login methods
      await login()
    } catch (error: any) {
      console.error('Login error:', error)
      
      // Provide helpful error messages
      if (error.message?.includes('rejected')) {
        setLoginError('❌ You cancelled the connection. Please try again and approve the connection in your wallet.')
      } else if (error.message?.includes('No wallet')) {
        setLoginError('❌ No Solana wallet detected. Please install a Solana wallet (Phantom, Solflare, or Backpack).')
      } else if (error.message?.includes('network')) {
        setLoginError('❌ Network error. Make sure your wallet is on Solana network (not Ethereum).')
      } else if (error.message?.includes('ethereum') || error.message?.includes('Ethereum')) {
        setLoginError(
          '❌ This app only supports Solana wallets!\n\n' +
          'Please disconnect and connect with a Solana wallet (Phantom, Solflare, or Backpack).'
        )
      } else {
        setLoginError(`❌ Login failed: ${error.message || 'Unknown error'}`)
      }
    } finally {
      setIsLoggingIn(false)
    }
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 max-w-md w-full"
      >
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">PredictDuel</h1>
          <p className="text-slate-400">Sign in to start predicting</p>
        </div>

        {/* Error Message */}
        {loginError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6"
          >
            <p className="text-red-300 text-sm whitespace-pre-line">{loginError}</p>
          </motion.div>
        )}

        {/* Wallet Login Button */}
        <button
          onClick={() => handleLogin()}
          disabled={isLoggingIn}
          className="w-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 hover:from-purple-500/30 hover:to-pink-500/30 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          <FaWallet className="text-xl" />
          {isLoggingIn ? 'Connecting...' : 'Connect Wallet'}
        </button>

        {/* Terms Text */}
        <p className="text-center text-slate-400 text-xs">
          By logging in you'll accept the{' '}
          <span className="text-purple-400">terms and conditions</span> of PredictDuel
          <br />
          and also connected with{' '}
          <span className="text-purple-400">Privy</span>
        </p>
      </motion.div>
    </div>
  )
}
