'use client'

import { motion } from 'framer-motion'
import { Clock, Users, TrendingUp } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import CountdownTimer from '@/components/ui/CountdownTimer'
import { useState } from 'react'

interface PredictionCardProps {
  id: string
  creator: {
    avatar: string
    username: string
  }
  question: string
  category: string
  deadline: Date
  stake: number
  yesCount: number
  noCount: number
  poolSize: number
  onPredict: (prediction: 'yes' | 'no') => void
}

export default function PredictionCard({
  creator,
  question,
  category,
  deadline,
  stake,
  yesCount,
  noCount,
  poolSize,
  onPredict,
}: PredictionCardProps) {
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  
  const handleSwipe = (direction: 'left' | 'right') => {
    setSwipeDirection(direction)
    setTimeout(() => {
      onPredict(direction === 'right' ? 'yes' : 'no')
      setSwipeDirection(null)
    }, 300)
  }
  
  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(e, info) => {
        if (info.offset.x > 100) handleSwipe('right')
        if (info.offset.x < -100) handleSwipe('left')
      }}
      animate={{
        x: swipeDirection === 'right' ? 300 : swipeDirection === 'left' ? -300 : 0,
        opacity: swipeDirection ? 0 : 1,
        rotate: swipeDirection === 'right' ? 15 : swipeDirection === 'left' ? -15 : 0,
      }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      <Card variant="glass" className="p-6 space-y-6">
        {/* Top Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold">
              {creator.avatar || creator.username[0]}
            </div>
            <div>
              <div className="font-semibold">{creator.username}</div>
              <div className="text-sm text-white/60">challenges you to predict:</div>
            </div>
          </div>
          <Badge variant="info">{category}</Badge>
        </div>
        
        {/* Countdown Timer */}
        <div className="flex items-center justify-center">
          <CountdownTimer targetDate={deadline} />
        </div>
        
        {/* Question */}
        <div className="text-center py-4">
          <h3 className="text-2xl font-bold mb-2">{question}</h3>
          <div className="flex items-center justify-center gap-4 text-sm text-white/60">
            <div className="flex items-center gap-1">
              <TrendingUp size={16} />
              <span>{poolSize.toFixed(2)} SOL pool</span>
            </div>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-success">
            <Users size={16} />
            <span>{yesCount} predicted YES</span>
          </div>
          <div className="flex items-center gap-2 text-danger">
            <Users size={16} />
            <span>{noCount} predicted NO</span>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="destructive"
            size="lg"
            onClick={() => onPredict('no')}
            className="text-lg font-bold"
          >
            NO
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={() => onPredict('yes')}
            className="text-lg font-bold bg-success hover:bg-green-600"
          >
            YES
          </Button>
        </div>
        
        <div className="text-center text-sm text-white/60">
          {stake.toFixed(2)} SOL to join
        </div>
      </Card>
    </motion.div>
  )
}

