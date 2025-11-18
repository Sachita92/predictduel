'use client'

import { motion } from 'framer-motion'
import { RotateCcw, Home } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface LossScreenProps {
  amount: number
  correctOutcome: string
  onRematch: () => void
  onReturn: () => void
}

export default function LossScreen({ amount, correctOutcome, onRematch, onReturn }: LossScreenProps) {
  return (
    <div className="fixed inset-0 z-50 bg-background-dark/95 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="max-w-md w-full"
      >
        <Card variant="glass" className="p-8 text-center space-y-6 border-danger/30">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="text-7xl"
          >
            😔
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold"
          >
            Not This Time...
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className="space-y-2"
          >
            <div className="text-3xl font-bold text-danger">
              -{amount.toFixed(2)} SOL
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-danger/10 border border-danger/30 rounded-xl p-4"
          >
            <div className="text-sm text-white/60 mb-1">Correct Outcome:</div>
            <div className="font-semibold">{correctOutcome}</div>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-white/70"
          >
            You were close! Try again?
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="space-y-3"
          >
            <Button
              size="lg"
              variant="primary"
              onClick={onRematch}
              className="w-full"
            >
              <RotateCcw size={18} className="mr-2" />
              Rematch
            </Button>
            
            <Button
              variant="ghost"
              onClick={onReturn}
              className="w-full"
            >
              <Home size={18} className="mr-2" />
              Return to Feed
            </Button>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  )
}

