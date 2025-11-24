'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useState } from 'react'
import { debugWalletConnection, isWalletProperlyConfigured, getWalletConfigurationError } from '@/lib/wallet-debug'
import { getWalletAddress, getAllWalletAddresses } from '@/lib/privy-helpers'
import { APP_BLOCKCHAIN, getAppCurrency, getAppBlockchainName } from '@/lib/blockchain-config'

/**
 * Debug Panel Component
 * 
 * Add this to any page temporarily to debug wallet connection issues
 * 
 * Usage:
 * import WalletDebugPanel from '@/components/debug/WalletDebugPanel'
 * 
 * <WalletDebugPanel />
 */
export default function WalletDebugPanel() {
  const { user, authenticated } = usePrivy()
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (!authenticated || !user) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-red-500/20 border border-red-500 rounded-lg p-4 max-w-md">
        <div className="text-red-400 font-bold mb-2">🔴 Not Authenticated</div>
        <div className="text-sm text-white/70">Please log in to test wallet connection</div>
      </div>
    )
  }
  
  const walletAddress = getWalletAddress(user, APP_BLOCKCHAIN)
  const isConfigured = isWalletProperlyConfigured(user)
  const error = getWalletConfigurationError(user)
  const allWallets = getAllWalletAddresses(user)
  
  const handleDebugLog = () => {
    debugWalletConnection(user)
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      {/* Collapsed View */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={`
            px-4 py-2 rounded-lg font-bold shadow-lg
            ${isConfigured 
              ? 'bg-green-500/20 border border-green-500 text-green-400' 
              : 'bg-red-500/20 border border-red-500 text-red-400'
            }
          `}
        >
          {isConfigured ? '✅ Wallet OK' : '❌ Wallet Issue'}
        </button>
      )}
      
      {/* Expanded View */}
      {isExpanded && (
        <div className="bg-gray-900 border border-white/20 rounded-lg p-4 shadow-2xl">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-white">🔍 Wallet Debug</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-white/50 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          {/* Configuration */}
          <div className="mb-4 p-3 bg-white/5 rounded">
            <div className="text-xs font-bold text-white/50 mb-2">APP CONFIGURATION</div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-white/70">Blockchain:</span>
                <span className="text-white font-mono">{APP_BLOCKCHAIN}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Currency:</span>
                <span className="text-white font-mono">{getAppCurrency()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Network:</span>
                <span className="text-white font-mono">{getAppBlockchainName()}</span>
              </div>
            </div>
          </div>
          
          {/* Status */}
          <div className={`
            mb-4 p-3 rounded
            ${isConfigured 
              ? 'bg-green-500/10 border border-green-500/30' 
              : 'bg-red-500/10 border border-red-500/30'
            }
          `}>
            <div className="text-xs font-bold mb-2 text-white/50">
              {isConfigured ? '✅ STATUS: CONFIGURED' : '❌ STATUS: ISSUE'}
            </div>
            {error && (
              <div className="text-sm text-red-400 mb-2">{error}</div>
            )}
            {walletAddress && (
              <div className="text-sm space-y-1">
                <div className="text-white/70">Current Address:</div>
                <div className="font-mono text-xs break-all bg-black/30 p-2 rounded">
                  {walletAddress}
                </div>
                <div className="text-white/50 text-xs">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </div>
              </div>
            )}
          </div>
          
          {/* All Wallets */}
          {Object.keys(allWallets).length > 0 && (
            <div className="mb-4 p-3 bg-white/5 rounded">
              <div className="text-xs font-bold text-white/50 mb-2">
                ALL CONNECTED WALLETS
              </div>
              <div className="space-y-2 text-sm">
                {Object.entries(allWallets).map(([chain, address]) => (
                  <div key={chain} className="flex justify-between items-start">
                    <span className={`
                      font-bold text-xs uppercase
                      ${chain === APP_BLOCKCHAIN ? 'text-green-400' : 'text-white/50'}
                    `}>
                      {chain}
                      {chain === APP_BLOCKCHAIN && ' (Active)'}
                    </span>
                    <span className="font-mono text-xs text-white/70 ml-2">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={handleDebugLog}
              className="w-full px-3 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded text-sm hover:bg-blue-500/30 transition-colors"
            >
              📋 Log Full Debug Info to Console
            </button>
            
            {!isConfigured && (
              <div className="text-xs text-white/50 p-2 bg-white/5 rounded">
                💡 <strong>Tip:</strong> Disconnect wallet, switch network in Phantom, then reconnect
              </div>
            )}
          </div>
          
          {/* Hint */}
          <div className="mt-4 pt-3 border-t border-white/10 text-xs text-white/40">
            Remove this component before production
          </div>
        </div>
      )}
    </div>
  )
}


