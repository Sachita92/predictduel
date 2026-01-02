'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana'

export default function PrivyProviderWrapper({
  children,
}: {
  children: React.ReactNode
}) {
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

        // Solana wallet connectors - this enables Phantom, Solflare, Backpack, MetaMask (with Solana enabled), etc.
        externalWallets: {
          solana: {
            connectors: toSolanaWalletConnectors(),
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}
