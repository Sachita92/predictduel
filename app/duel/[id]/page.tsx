'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Share2, MessageCircle, X, TrendingUp } from 'lucide-react'
import TopNav from '@/components/navigation/TopNav'
import MobileNav from '@/components/navigation/MobileNav'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import CountdownTimer from '@/components/ui/CountdownTimer'

export default function DuelDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const id = typeof params === 'object' && 'then' in params ? '' : params.id
  const [status] = useState<'waiting' | 'active' | 'resolving'>('active')
  const [yourPosition] = useState<'yes' | 'no'>('yes')
  const [opponentPosition] = useState<'yes' | 'no'>('no')
  const [yourStake] = useState(0.1)
  const [opponentStake] = useState(0.1)
  const [currentPrice] = useState(99500)
  const [targetPrice] = useState(100000)
  
  const deadline = new Date(Date.now() + 86400000)
  const question = 'Will BTC hit $100K by Friday?'
  
  return (
    <div className="min-h-screen bg-background-dark pb-20">
      <TopNav />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="info">Crypto</Badge>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">
                <Share2 size={16} className="mr-2" />
                Share
              </Button>
              <Button variant="ghost" size="sm">
                <MessageCircle size={16} className="mr-2" />
                Chat
              </Button>
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-4 font-display">{question}</h1>
          
          <div className="flex items-center justify-center">
            <CountdownTimer targetDate={deadline} />
          </div>
        </div>
        
        {/* VS Battle View */}
        <Card variant="glass" className="p-8 mb-6">
          <div className="text-center mb-6">
            <div className={`
              inline-block px-4 py-2 rounded-full font-bold text-lg mb-4
              ${status === 'active' ? 'bg-success/20 text-success' : 
                status === 'waiting' ? 'bg-accent/20 text-accent' : 
                'bg-white/10 text-white'}
            `}>
              {status === 'active' ? 'Battle Active!' : 
               status === 'waiting' ? 'Waiting for opponent...' : 
               'Resolving...'}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* You */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-center"
            >
              <div className={`
                w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold
                ${yourPosition === 'yes' ? 'gradient-primary' : 'bg-danger'}
              `}>
                You
              </div>
              <div className="font-bold text-xl mb-2">
                {yourPosition === 'yes' ? 'YES' : 'NO'}
              </div>
              <div className="text-2xl font-bold gradient-text mb-1">
                {yourStake.toFixed(2)} SOL
              </div>
              <div className="text-sm text-white/60">Your Stake</div>
            </motion.div>
            
            {/* VS */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-4xl font-bold gradient-text"
              >
                VS
              </motion.div>
            </div>
            
            {/* Opponent */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-center"
            >
              <div className={`
                w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold
                ${opponentPosition === 'yes' ? 'gradient-primary' : 'bg-danger'}
              `}>
                @bob
              </div>
              <div className="font-bold text-xl mb-2">
                {opponentPosition === 'yes' ? 'YES' : 'NO'}
              </div>
              <div className="text-2xl font-bold gradient-text mb-1">
                {opponentStake.toFixed(2)} SOL
              </div>
              <div className="text-sm text-white/60">Opponent Stake</div>
            </motion.div>
          </div>
        </Card>
        
        {/* Live Stats */}
        <Card variant="glass" className="p-6 mb-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="text-primary-from" size={20} />
            Live Status
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/60">Current Price</span>
                <span className="font-bold">${currentPrice.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentPrice / targetPrice) * 100}%` }}
                  transition={{ duration: 1 }}
                  className="h-full gradient-primary"
                />
              </div>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
              <div>
                <div className="text-sm text-white/60 mb-1">Target to Hit</div>
                <div className="text-2xl font-bold">${targetPrice.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-white/60 mb-1">Remaining</div>
                <div className="text-xl font-bold text-accent">
                  ${(targetPrice - currentPrice).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Mini Chart Placeholder */}
        <Card variant="glass" className="p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">Price History</h3>
          <div className="h-32 bg-white/5 rounded-lg flex items-center justify-center text-white/40">
            Chart visualization would go here
          </div>
        </Card>
        
        {/* Actions */}
        {status === 'waiting' && (
          <Button variant="destructive" className="w-full">
            <X className="mr-2" size={18} />
            Cancel Duel
          </Button>
        )}
      </div>
      
      <MobileNav />
    </div>
  )
}

