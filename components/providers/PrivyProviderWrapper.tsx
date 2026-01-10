'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana'
import { useEffect, useState } from 'react'

export default function PrivyProviderWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const [solanaConnectors, setSolanaConnectors] = useState(() => toSolanaWalletConnectors())

  useEffect(() => {
    // Re-detect connectors after component mounts to catch wallets that load asynchronously
    // This helps detect wallets like MetaMask that might not be immediately available
    const detectWallets = () => {
      const connectors = toSolanaWalletConnectors()
      setSolanaConnectors(connectors)
      
      // Log detected wallets for debugging
      if (typeof window !== 'undefined') {
        const windowAny = window as any
        const detectedWallets = {
          phantom: !!windowAny.solana?.isPhantom,
          solflare: !!windowAny.solana?.isSolflare,
          backpack: !!windowAny.solana?.isBackpack,
          metamaskSolana: !!windowAny.solana?.isMetaMask,
          metamaskEthereum: !!windowAny.ethereum?.isMetaMask,
          windowSolana: !!windowAny.solana,
          windowEthereum: !!windowAny.ethereum,
        }
        
        console.log('🔍 Wallet Detection:', {
          connectors,
          detectedWallets,
        })
        
        // Helpful message if MetaMask is detected but not via window.solana
        if (detectedWallets.metamaskEthereum && !detectedWallets.metamaskSolana && !detectedWallets.windowSolana) {
          console.warn(
            '⚠️ MetaMask detected but Solana support may not be enabled.\n' +
            'To use MetaMask with Solana:\n' +
            '1. Ensure MetaMask has Solana support enabled\n' +
            '2. MetaMask must expose itself via window.solana for Privy to detect it\n' +
            '3. Try refreshing the page after enabling Solana support in MetaMask'
          )
        }
      }
    }

    // Initial detection
    detectWallets()

    // Re-detect after a short delay to catch wallets that load asynchronously
    const timeout = setTimeout(detectWallets, 500)

    // Listen for wallet installation events
    const handleWalletReady = () => {
      setTimeout(detectWallets, 100)
    }

    window.addEventListener('load', handleWalletReady)
    
    // Check periodically for newly installed wallets
    const interval = setInterval(detectWallets, 2000)

    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
      window.removeEventListener('load', handleWalletReady)
    }
  }, [])

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'clx1234567890'}
      config={{
        loginMethods: ['wallet', 'email', 'google', 'twitter', 'discord'],
        
        appearance: {
          theme: 'dark',
          accentColor: '#8B5CF6',
          showWalletLoginFirst: true,
          walletChainType: 'solana-only',
        },

        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          requireUserPasswordOnCreate: false,
        },

        // Solana wallet connectors - configured to detect all available wallets
        // This should detect Phantom, Solflare, Backpack, MetaMask (with Solana enabled), etc.
        // Note: MetaMask needs to have Solana support enabled and expose itself via window.solana
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}
