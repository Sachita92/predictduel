'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect: (wallet: string) => void
}

const wallets = [
  { id: 'phantom', name: 'Phantom', icon: '👻' },
  { id: 'solflare', name: 'Solflare', icon: '🔥' },
  { id: 'backpack', name: 'Backpack', icon: '🎒' },
  { id: 'walletconnect', name: 'WalletConnect', icon: '🔗' },
]

export default function WalletModal({ isOpen, onClose, onConnect }: WalletModalProps) {
  if (!isOpen) return null
  
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative z-10 w-full max-w-md"
        >
          <Card variant="glass" className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Connect Your Wallet</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-3 mb-6">
              {wallets.map((wallet) => (
                <motion.button
                  key={wallet.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onConnect(wallet.id)
                    onClose()
                  }}
                  className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center gap-4 transition-all"
                >
                  <div className="text-3xl">{wallet.icon}</div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold">{wallet.name}</div>
                    <div className="text-sm text-white/60">Click to connect</div>
                  </div>
                  <div className="text-white/40">→</div>
                </motion.button>
              ))}
            </div>
            
            <a
              href="#"
              className="text-sm text-primary-from hover:underline text-center block"
            >
              New to Solana? Learn more
            </a>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

