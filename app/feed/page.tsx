'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import TopNav from '@/components/navigation/TopNav'
import MobileNav from '@/components/navigation/MobileNav'
import PredictionCard from '@/components/feed/PredictionCard'

const mockPredictions = [
  {
    id: '1',
    creator: { avatar: '', username: 'alice' },
    question: 'Will BTC hit $100K by Friday?',
    category: 'Crypto',
    deadline: new Date(Date.now() + 86400000),
    stake: 0.1,
    yesCount: 3,
    noCount: 7,
    poolSize: 1.0,
  },
  {
    id: '2',
    creator: { avatar: '', username: 'bob' },
    question: 'Will it rain tomorrow?',
    category: 'Weather',
    deadline: new Date(Date.now() + 3600000),
    stake: 0.05,
    yesCount: 12,
    noCount: 8,
    poolSize: 1.0,
  },
  {
    id: '3',
    creator: { avatar: '', username: 'charlie' },
    question: 'Will SOL reach $200 this week?',
    category: 'Crypto',
    deadline: new Date(Date.now() + 604800000),
    stake: 0.2,
    yesCount: 5,
    noCount: 5,
    poolSize: 2.0,
  },
]

export default function FeedPage() {
  const [predictions, setPredictions] = useState(mockPredictions)
  const [currentIndex, setCurrentIndex] = useState(0)
  
  const handlePredict = (prediction: 'yes' | 'no') => {
    console.log('Prediction made:', prediction)
    // Move to next card
    if (currentIndex < predictions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }
  
  if (currentIndex >= predictions.length) {
    return (
      <div className="min-h-screen bg-background-dark">
        <TopNav />
        <div className="flex items-center justify-center min-h-[80vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">You've seen all predictions!</h2>
            <p className="text-white/60">Check back later for more duels</p>
          </motion.div>
        </div>
        <MobileNav />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-background-dark pb-20">
      <TopNav />
      
      <div className="flex items-center justify-center min-h-[80vh] px-4">
        <div className="relative w-full max-w-md">
          {predictions.slice(currentIndex, currentIndex + 2).map((prediction, index) => (
            <motion.div
              key={prediction.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{
                opacity: index === 0 ? 1 : 0.5,
                y: index === 0 ? 0 : 20,
                scale: index === 0 ? 1 : 0.95,
              }}
              className={index === 0 ? 'relative z-10' : 'absolute inset-0 z-0'}
            >
              <PredictionCard
                {...prediction}
                onPredict={handlePredict}
              />
            </motion.div>
          ))}
        </div>
      </div>
      
      <MobileNav />
    </div>
  )
}

