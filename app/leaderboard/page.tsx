'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Medal, Flame, TrendingUp } from 'lucide-react'
import TopNav from '@/components/navigation/TopNav'
import MobileNav from '@/components/navigation/MobileNav'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

const tabs = ['Today', 'This Week', 'All-Time', 'Friends Only']

const mockLeaderboard = [
  { rank: 1, username: 'alice', wins: 45, winRate: 87, totalWon: 12.5, streak: 8, avatar: 'A' },
  { rank: 2, username: 'bob', wins: 38, winRate: 82, totalWon: 10.2, streak: 5, avatar: 'B' },
  { rank: 3, username: 'charlie', wins: 32, winRate: 75, totalWon: 8.7, streak: 3, avatar: 'C' },
  { rank: 4, username: 'dave', wins: 28, winRate: 70, totalWon: 7.1, streak: 2, avatar: 'D' },
  { rank: 5, username: 'eve', wins: 25, winRate: 68, totalWon: 6.5, streak: 4, avatar: 'E' },
]

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState('All-Time')
  const [yourRank] = useState(47)
  
  return (
    <div className="min-h-screen bg-background-dark pb-20">
      <TopNav />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block mb-4"
          >
            <Trophy className="text-accent" size={48} />
          </motion.div>
          <h1 className="text-4xl font-bold mb-2 font-display">Leaderboard</h1>
          <p className="text-white/60">Top predictors this week</p>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all
                ${activeTab === tab
                  ? 'gradient-primary'
                  : 'bg-white/5 hover:bg-white/10'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {/* Your Position */}
        <Card variant="glass" className="mb-6 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/60 mb-1">Your Position</div>
              <div className="text-2xl font-bold">#{yourRank}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/60 mb-1">Next Rank</div>
              <div className="text-lg font-semibold">Win 3 more to reach #30</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '60%' }}
                transition={{ duration: 1 }}
                className="h-full gradient-primary"
              />
            </div>
          </div>
        </Card>
        
        {/* Top 3 Podium */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 0, 2].map((index) => {
            const user = mockLeaderboard[index]
            if (!user) return null
            
            const isTop = user.rank === 1
            const colors = {
              1: 'from-yellow-400 to-yellow-600',
              2: 'from-gray-300 to-gray-500',
              3: 'from-orange-400 to-orange-600',
            }
            
            return (
              <motion.div
                key={user.rank}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  ${isTop ? 'order-2' : index === 0 ? 'order-1' : 'order-3'}
                `}
              >
                <Card
                  variant={isTop ? 'gradient' : 'glass'}
                  className={`p-6 text-center ${isTop ? 'scale-110' : ''}`}
                >
                  {isTop && (
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-3xl mb-2"
                    >
                      👑
                    </motion.div>
                  )}
                  <div className={`
                    w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold
                    ${isTop ? 'bg-white/20' : 'gradient-primary'}
                  `}>
                    {user.avatar}
                  </div>
                  <div className="font-bold text-lg mb-1">{user.username}</div>
                  <div className="flex items-center justify-center gap-1 text-accent mb-2">
                    <Flame size={16} />
                    <span className="text-sm font-semibold">{user.streak} streak</span>
                  </div>
                  <div className="text-2xl font-bold mb-1">{user.totalWon.toFixed(1)} SOL</div>
                  <div className="text-sm text-white/60">{user.winRate}% win rate</div>
                </Card>
              </motion.div>
            )
          })}
        </div>
        
        {/* Rest of Leaderboard */}
        <div className="space-y-2">
          {mockLeaderboard.slice(3).map((user, index) => (
            <motion.div
              key={user.rank}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
            >
              <Card variant="glass" hover className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-white/40 w-8">
                      {user.rank}
                    </div>
                    <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-bold">
                      {user.avatar}
                    </div>
                    <div>
                      <div className="font-semibold">{user.username}</div>
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <span className="flex items-center gap-1">
                          <Flame size={12} className="text-accent" />
                          {user.streak}
                        </span>
                        <span>•</span>
                        <span>{user.winRate}% win rate</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{user.totalWon.toFixed(1)} SOL</div>
                    <Button size="sm" variant="outline">
                      Challenge
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
      
      <MobileNav />
    </div>
  )
}

