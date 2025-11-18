'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Twitter, Share2, Trophy } from 'lucide-react'
import Confetti from 'react-confetti'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface WinScreenProps {
  amount: number
  usdAmount: number
  onCollect: () => void
  onShare: () => void
  onChallenge: () => void
}

export default function WinScreen({ amount, usdAmount, onCollect, onShare, onChallenge }: WinScreenProps) {
  const [showConfetti, setShowConfetti] = useState(true)
  const [countedAmount, setCountedAmount] = useState(0)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
  }, [])
  
  useEffect(() => {
    const duration = 2000
    const steps = 60
    const increment = amount / steps
    const interval = duration / steps
    
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= amount) {
        setCountedAmount(amount)
        clearInterval(timer)
      } else {
        setCountedAmount(current)
      }
    }, interval)
    
    return () => clearInterval(timer)
  }, [amount])
  
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [])
  
  return (
    <div className="fixed inset-0 z-50 bg-background-dark/95 backdrop-blur-sm flex items-center justify-center p-4">
      {showConfetti && windowSize.width > 0 && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
        />
      )}
      
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="max-w-md w-full"
      >
        <Card variant="gradient" className="p-8 text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="text-7xl"
          >
            🎉
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold"
          >
            YOU WON!
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className="space-y-2"
          >
            <div className="text-5xl font-bold gradient-text">
              +{countedAmount.toFixed(2)} SOL
            </div>
            <div className="text-xl text-white/80">
              ≈ ${usdAmount.toFixed(2)} USD
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-center gap-2 bg-white/10 rounded-full px-4 py-2"
          >
            <Trophy className="text-accent" size={20} />
            <span className="font-semibold">5-Win Streak! 🔥</span>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="space-y-3"
          >
            <Button
              size="lg"
              glow
              onClick={onCollect}
              className="w-full"
            >
              Collect Winnings
            </Button>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                onClick={onShare}
                className="w-full"
              >
                <Twitter size={18} className="mr-2" />
                Share
              </Button>
              <Button
                variant="secondary"
                onClick={onChallenge}
                className="w-full"
              >
                Challenge Again
              </Button>
            </div>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  )
}

