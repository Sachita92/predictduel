'use client'

import { usePrivy } from '@privy-io/react-auth'
import WalletChecker from '@/components/debug/WalletChecker'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = usePrivy()

  return (
    <>
      {children}
      {/* Show wallet checker only when authenticated */}
      {ready && authenticated && process.env.NODE_ENV === 'development' && (
        <WalletChecker />
      )}
    </>
  )
}

