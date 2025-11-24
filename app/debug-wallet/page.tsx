'use client'

import { useEffect, useState } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'

export default function DebugWalletPage() {
  const { ready, authenticated, user, logout } = usePrivy()
  const { wallets } = useWallets()
  const [phantomDetected, setPhantomDetected] = useState(false)
  const [phantomNetwork, setPhantomNetwork] = useState<string>('unknown')
  const [windowSolana, setWindowSolana] = useState<any>(null)
  const [isClearing, setIsClearing] = useState(false)

  useEffect(() => {
    // Check if Phantom is installed
    if (typeof window !== 'undefined') {
      const solana = (window as any).solana
      setWindowSolana(solana)
      
      if (solana?.isPhantom) {
        setPhantomDetected(true)
        
        // Try to detect which network Phantom is on
        solana.connect({ onlyIfTrusted: true })
          .then(() => {
            // If publicKey exists, we can check the format
            if (solana.publicKey) {
              const pubKeyStr = solana.publicKey.toString()
              // Solana addresses are base58 and typically 32-44 characters
              // Ethereum addresses start with 0x and are 42 characters
              if (pubKeyStr.startsWith('0x')) {
                setPhantomNetwork('Ethereum')
              } else {
                setPhantomNetwork('Solana')
              }
            }
          })
          .catch(() => {
            // User hasn't connected yet
            setPhantomNetwork('Not connected')
          })
      }
    }
  }, [])

  const handleClearAll = async () => {
    setIsClearing(true)
    try {
      // 1. Logout from Privy
      if (authenticated) {
        await logout()
      }
      
      // 2. Clear all Privy localStorage
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith('privy:') || key.includes('privy')) {
            localStorage.removeItem(key)
          }
        })
      }
      
      // 3. Try to disconnect Phantom
      if (windowSolana?.disconnect) {
        try {
          await windowSolana.disconnect()
        } catch (e) {
          console.log('Phantom disconnect attempt:', e)
        }
      }
      
      alert('✅ Cleared Privy state!\n\n⚠️ Now do this manually:\n1. Open Phantom extension\n2. Settings → Trusted Apps\n3. Find "localhost:3000" and disconnect\n4. Then refresh this page')
      
      // Refresh after 2 seconds
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error('Clear error:', error)
      alert('Error clearing state. Please refresh manually.')
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">🔍 Wallet Debug Information</h1>

        {/* Privy Status */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">Privy Status</h2>
          <div className="space-y-2 text-slate-300">
            <p>Ready: {ready ? '✅' : '❌'}</p>
            <p>Authenticated: {authenticated ? '✅' : '❌'}</p>
            <p>User ID: {user?.id || 'Not logged in'}</p>
            <p>App ID: {process.env.NEXT_PUBLIC_PRIVY_APP_ID?.slice(0, 10)}...</p>
          </div>
        </div>

        {/* Phantom Detection */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">Phantom Wallet Detection</h2>
          <div className="space-y-2 text-slate-300">
            <p>Phantom Installed: {phantomDetected ? '✅ YES' : '❌ NO - Please install Phantom'}</p>
            <p>Current Network: {phantomNetwork}</p>
            {phantomNetwork === 'Ethereum' && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500 rounded-lg">
                <p className="text-red-300 font-semibold">⚠️ WARNING: Phantom is on Ethereum network!</p>
                <p className="text-red-300 text-sm mt-2">
                  Please switch to Solana network in Phantom settings:
                </p>
                <ol className="text-red-300 text-sm mt-2 ml-4 list-decimal">
                  <li>Open Phantom extension</li>
                  <li>Click the ⚙️ Settings icon</li>
                  <li>Go to "Active Networks"</li>
                  <li>Switch to "Solana"</li>
                  <li>Refresh this page</li>
                </ol>
              </div>
            )}
            {windowSolana && (
              <div className="mt-4">
                <p className="text-xs text-slate-500">Raw data:</p>
                <pre className="text-xs bg-slate-900 p-3 rounded mt-2 overflow-auto">
                  {JSON.stringify({
                    isPhantom: windowSolana.isPhantom,
                    publicKey: windowSolana.publicKey?.toString() || 'null',
                    isConnected: windowSolana.isConnected,
                  }, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Connected Wallets */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">Connected Wallets (via Privy)</h2>
          {wallets.length === 0 ? (
            <p className="text-slate-400">No wallets connected yet</p>
          ) : (
            <div className="space-y-4">
              {wallets.map((wallet, index) => (
                <div key={index} className="bg-slate-900 rounded-lg p-4">
                  <p className="text-white font-semibold">{wallet.walletClientType}</p>
                  <p className="text-slate-400 text-sm">Address: {wallet.address}</p>
                  <p className="text-slate-400 text-sm">Connected: {wallet.connectorType}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-blue-300 mb-4">📋 Troubleshooting Steps</h2>
          <ol className="text-blue-300 space-y-2 ml-4 list-decimal">
            <li><strong>Install Phantom:</strong> If not detected, install from <a href="https://phantom.app" target="_blank" className="underline">phantom.app</a></li>
            <li><strong>Switch to Solana:</strong> Open Phantom → Settings → Active Networks → Select "Solana"</li>
            <li><strong>Check Privy Dashboard:</strong> Make sure <code className="bg-blue-900/30 px-2 py-1 rounded">http://localhost:3000</code> is in allowed origins</li>
            <li><strong>Enable Solana:</strong> In Privy dashboard, enable Solana in Embedded Wallets → Supported Chains</li>
            <li><strong>Refresh:</strong> After making changes, hard refresh this page (Ctrl+Shift+R)</li>
          </ol>
        </div>

        {/* Stale Connection Warning */}
        {phantomDetected && !authenticated && phantomNetwork !== 'Not connected' && (
          <div className="bg-orange-500/20 border border-orange-500 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-orange-300 mb-4">⚠️ Stale Connection Detected!</h2>
            <p className="text-orange-300 mb-4">
              Phantom has localhost:3000 in connected sites, but you're not logged in.
              This causes "User rejected" errors.
            </p>
            <button
              onClick={handleClearAll}
              disabled={isClearing}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClearing ? 'Clearing...' : '🔄 Clear All & Reset Connection'}
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-6 flex gap-4">
          <a
            href="/login"
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Go to Login Page
          </a>
          <button
            onClick={() => window.location.reload()}
            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  )
}

