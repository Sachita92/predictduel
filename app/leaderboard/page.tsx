'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Medal, Flame, TrendingUp, Loader2 } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'
import TopNav from '@/components/navigation/TopNav'
import MobileNav from '@/components/navigation/MobileNav'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

const tabs = ['All-Time', 'This Week', 'Today'] // Removed 'Friends Only' for now

interface LeaderboardUser {
  rank: number
  id: string
  username: string
  avatar: string
  wins: number
  losses: number
  winRate: number
  totalWon: number
  streak: number
  bestStreak: number
}

export default function LeaderboardPage() {
  const { user, ready } = usePrivy()
  const [activeTab, setActiveTab] = useState('All-Time')
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [yourRank, setYourRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'totalEarned' | 'wins' | 'winRate' | 'currentStreak'>('totalEarned')
  
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Map tab names to API period values
        const periodMap: Record<string, string> = {
          'Today': 'today',
          'This Week': 'week',
          'All-Time': 'all-time',
        }
        const period = periodMap[activeTab] || 'all-time'
        
        const url = `/api/leaderboard?period=${period}&sortBy=${sortBy}&limit=50&privyId=${user?.id || ''}`
        const response = await fetch(url)
        const data = await response.json()
        
        if (data.success) {
          setLeaderboard(data.leaderboard || [])
          setYourRank(data.userRank || null)
        } else {
          setError(data.error || 'Failed to load leaderboard')
        }
      } catch (err) {
        console.error('Error fetching leaderboard:', err)
        setError('Failed to load leaderboard. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    
    if (ready) {
      fetchLeaderboard()
    }
  }, [activeTab, sortBy, user?.id, ready])
  
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
        
        {/* Sort Options */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setSortBy('totalEarned')}
            className={`px-3 py-1 rounded-lg text-sm whitespace-nowrap transition-all ${
              sortBy === 'totalEarned' ? 'gradient-primary' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            Total Earned
          </button>
          <button
            onClick={() => setSortBy('wins')}
            className={`px-3 py-1 rounded-lg text-sm whitespace-nowrap transition-all ${
              sortBy === 'wins' ? 'gradient-primary' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            Wins
          </button>
          <button
            onClick={() => setSortBy('winRate')}
            className={`px-3 py-1 rounded-lg text-sm whitespace-nowrap transition-all ${
              sortBy === 'winRate' ? 'gradient-primary' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            Win Rate
          </button>
          <button
            onClick={() => setSortBy('currentStreak')}
            className={`px-3 py-1 rounded-lg text-sm whitespace-nowrap transition-all ${
              sortBy === 'currentStreak' ? 'gradient-primary' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            Streak
          </button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-primary-from" size={48} />
          </div>
        ) : error ? (
          <Card variant="glass" className="p-8 text-center">
            <p className="text-danger">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </Card>
        ) : (
          <>
            {/* Your Position */}
            {yourRank !== null && (
              <Card variant="glass" className="mb-6 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-white/60 mb-1">Your Position</div>
                    <div className="text-2xl font-bold">#{yourRank}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white/60 mb-1">Keep Playing!</div>
                    <div className="text-lg font-semibold">Climb the ranks</div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((yourRank / leaderboard.length) * 100, 100)}%` }}
                      transition={{ duration: 1 }}
                      className="h-full gradient-primary"
                    />
                  </div>
                </div>
              </Card>
            )}
            
            {/* Top 3 Podium */}
            {leaderboard.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[1, 0, 2].map((index) => {
                  const user = leaderboard[index]
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
                    {user.avatar || user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="font-bold text-lg mb-1">{user.username}</div>
                  <div className="flex items-center justify-center gap-1 text-accent mb-2">
                    <Flame size={16} />
                    <span className="text-sm font-semibold">{user.streak} streak</span>
                  </div>
                  <div className="text-2xl font-bold mb-1">{user.totalWon.toFixed(2)} SOL</div>
                  <div className="text-sm text-white/60">{user.winRate.toFixed(1)}% win rate</div>
                </Card>
              </motion.div>
            )
          })}
        </div>
        
            {/* Rest of Leaderboard */}
            {leaderboard.length > 3 && (
              <div className="space-y-2">
                {leaderboard.slice(3).map((user, index) => (
                  <motion.div
                    key={user.id}
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
                            {user.avatar || user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold">{user.username}</div>
                            <div className="flex items-center gap-2 text-sm text-white/60">
                              <span className="flex items-center gap-1">
                                <Flame size={12} className="text-accent" />
                                {user.streak}
                              </span>
                              <span>•</span>
                              <span>{user.winRate.toFixed(1)}% win rate</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{user.totalWon.toFixed(2)} SOL</div>
                          <div className="text-xs text-white/40">{user.wins} wins</div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
            
            {leaderboard.length === 0 && !loading && (
              <Card variant="glass" className="p-8 text-center">
                <Trophy className="mx-auto mb-4 text-white/40" size={48} />
                <p className="text-white/60">No leaderboard data yet. Be the first to play!</p>
              </Card>
            )}
          </>
        )}
      </div>
      
      <MobileNav />
    </div>
  )
}

