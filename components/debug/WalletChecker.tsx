'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Copy, Check } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { getAllWalletAddresses, getWalletAddress, detectChainFromAddress } from '@/lib/privy-helpers'
import { APP_BLOCKCHAIN, getAppCurrency } from '@/lib/blockchain-config'

export default function WalletChecker() {
  const { user } = usePrivy()
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState('')

  if (!user) return null

  const allWallets = getAllWalletAddresses(user)
  const currentWallet = getWalletAddress(user, APP_BLOCKCHAIN)
  const currency = getAppCurrency()

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address)
    setCopied(address)
    setTimeout(() => setCopied(''), 2000)
  }

  return (
    <div className="fixed bottom-24 right-4 z-50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 rounded-full gradient-primary shadow-lg hover:scale-110 transition-transform"
      >
        {isOpen ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-16 right-0 w-96"
          >
            <Card variant="glass" className="p-4">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                🔍 Wallet Debug Info
              </h3>

              {/* Current App Settings */}
              <div className="mb-4 p-3 bg-primary-from/20 rounded-lg border border-primary-from/30">
                <div className="text-xs text-white/60 mb-1">App Configured For:</div>
                <div className="font-bold text-primary-from uppercase">{APP_BLOCKCHAIN}</div>
                <div className="text-xs text-white/60 mt-1">Currency: {currency}</div>
              </div>

              {/* Current Detected Wallet */}
              <div className="mb-4">
                <div className="text-sm font-semibold mb-2">Currently Using:</div>
                {currentWallet ? (
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={detectChainFromAddress(currentWallet) === 'solana' ? 'success' : 'warning'}>
                        {detectChainFromAddress(currentWallet) || 'Unknown'}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleCopy(currentWallet)}
                        className="p-1 hover:bg-white/10 rounded"
                      >
                        {copied === currentWallet ? (
                          <Check size={14} className="text-success" />
                        ) : (
                          <Copy size={14} className="text-white/60" />
                        )}
                      </button>
                    </div>
                    <div className="text-xs font-mono break-all text-white/80">
                      {currentWallet}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-danger/20 rounded-lg text-danger text-sm">
                    ❌ No {APP_BLOCKCHAIN} wallet found!
                  </div>
                )}
              </div>

              {/* All Connected Wallets */}
              <div>
                <div className="text-sm font-semibold mb-2">All Connected Wallets:</div>
                {Object.keys(allWallets).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(allWallets).map(([chain, address]) => (
                      <div key={chain} className="p-2 bg-white/5 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <Badge 
                            variant={chain.toLowerCase() === APP_BLOCKCHAIN ? 'success' : 'default'}
                            className="text-xs"
                          >
                            {chain}
                          </Badge>
                          <button
                            type="button"
                            onClick={() => handleCopy(address)}
                            className="p-1 hover:bg-white/10 rounded"
                          >
                            {copied === address ? (
                              <Check size={12} className="text-success" />
                            ) : (
                              <Copy size={12} className="text-white/60" />
                            )}
                          </button>
                        </div>
                        <div className="text-xs font-mono break-all text-white/70">
                          {address.slice(0, 20)}...{address.slice(-10)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-white/5 rounded-lg text-white/60 text-sm text-center">
                    No wallets detected via linkedAccounts
                  </div>
                )}
              </div>

              {/* Privy User Info */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="text-xs text-white/40">
                  <div>Privy ID: {user.id}</div>
                  {user.wallet?.address && (
                    <div className="mt-1">
                      Default Wallet: {user.wallet.address.slice(0, 10)}...
                      <Badge variant="warning" className="text-xs ml-2">
                        {detectChainFromAddress(user.wallet.address) || 'Unknown'}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Help Text */}
              {currentWallet && currentWallet.startsWith('0x') ? (
                <div className="mt-4 p-3 bg-danger/20 border border-danger/30 rounded-lg">
                  <div className="text-xs text-danger">
                    <strong>⚠️ WARNING:</strong> Ethereum address detected!
                    <ul className="list-disc ml-4 mt-1 space-y-1">
                      <li>This app is SOLANA ONLY</li>
                      <li>Disconnect and reconnect with Phantom on Solana network</li>
                      <li>In Phantom, switch from Ethereum to Solana</li>
                    </ul>
                  </div>
                </div>
              ) : !currentWallet ? (
                <div className="mt-4 p-3 bg-danger/20 border border-danger/30 rounded-lg">
                  <div className="text-xs text-danger">
                    <strong>❌ No Solana wallet found!</strong>
                    <ul className="list-disc ml-4 mt-1 space-y-1">
                      <li>Connect with Phantom wallet</li>
                      <li>Make sure Phantom is on Solana network</li>
                      <li>Disconnect and reconnect if needed</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-success/20 border border-success/30 rounded-lg">
                  <div className="text-xs text-success">
                    <strong>✅ Perfect!</strong> Solana wallet connected correctly!
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

