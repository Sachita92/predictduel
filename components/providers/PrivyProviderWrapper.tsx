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
    // This helps detect Solana wallets like Solflare and Backpack that might load after Phantom
    const detectWallets = () => {
      const connectors = toSolanaWalletConnectors()
      setSolanaConnectors(connectors)
      
      // Log detected Solana wallets for debugging
      if (typeof window !== 'undefined') {
        const windowAny = window as any
        const detectedWallets = {
          phantom: !!windowAny.solana?.isPhantom,
          solflare: !!windowAny.solana?.isSolflare,
          backpack: !!windowAny.solana?.isBackpack,
          windowSolana: !!windowAny.solana,
          // Check for non-Solana wallets (these should not be used)
          metamaskEthereum: !!windowAny.ethereum?.isMetaMask,
          windowEthereum: !!windowAny.ethereum,
        }
        
        console.log('🔍 Solana Wallet Detection:', {
          connectors,
          detectedWallets,
          connectorCount: Object.keys(connectors || {}).length,
        })
        
        // Warn if non-Solana wallets are detected
        if (detectedWallets.metamaskEthereum || detectedWallets.windowEthereum) {
          console.info(
            'ℹ️ Non-Solana wallets detected (MetaMask, etc.).\n' +
            'This app only supports Solana wallets (Phantom, Solflare, Backpack).\n' +
            'Please use a Solana wallet to connect.'
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
          // Explicitly list Solana wallets to show
          // This ensures all detected Solana wallets appear in the login modal
          walletList: ['phantom', 'solflare', 'backpack', 'wallet_connect'] as any,
        },

        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          requireUserPasswordOnCreate: false,
        },

        // Solana wallet connectors - configured to detect all available Solana wallets
        // This detects Phantom, Solflare, Backpack, and other wallets that expose themselves via window.solana
        // Note: Only Solana wallets are supported. Non-Solana wallets (like MetaMask) will show an error.
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
