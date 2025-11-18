'use client'

import { motion } from 'framer-motion'
import { Edit, Trophy, TrendingUp, Target, Award } from 'lucide-react'
import TopNav from '@/components/navigation/TopNav'
import MobileNav from '@/components/navigation/MobileNav'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

const achievements = [
  { id: 1, name: 'Prophet', icon: '🔮', earned: true, rarity: 'common' },
  { id: 2, name: 'First Blood', icon: '⚔️', earned: true, rarity: 'common' },
  { id: 3, name: 'Streak Master', icon: '🔥', earned: true, rarity: 'rare' },
  { id: 4, name: 'Crypto Oracle', icon: '💰', earned: true, rarity: 'epic' },
  { id: 5, name: 'Weather Wizard', icon: '⛅', earned: false, rarity: 'common' },
  { id: 6, name: 'Unstoppable', icon: '💪', earned: false, rarity: 'legendary' },
]

export default function ProfilePage() {
  const earnedCount = achievements.filter(a => a.earned).length
  
  return (
    <div className="min-h-screen bg-background-dark pb-20">
      <TopNav />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header Section */}
        <Card variant="glass" className="p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-4xl font-bold glow-effect">
                You
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">@yourusername</h1>
                <p className="text-white/60 mb-4">Crypto prediction enthusiast</p>
                <div className="flex gap-4">
                  <div>
                    <div className="text-2xl font-bold gradient-text">42</div>
                    <div className="text-sm text-white/60">Wins</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-danger">18</div>
                    <div className="text-sm text-white/60">Losses</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-accent">12.5 SOL</div>
                    <div className="text-sm text-white/60">Total Earned</div>
                  </div>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Edit size={16} className="mr-2" />
              Edit Profile
            </Button>
          </div>
        </Card>
        
        {/* Achievement Badges */}
        <Card variant="glass" className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Award className="text-accent" size={24} />
              Achievements
            </h2>
            <Badge variant="info">{earnedCount}/20 Badges Earned</Badge>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {achievements.map((achievement) => (
              <motion.div
                key={achievement.id}
                whileHover={{ scale: 1.1 }}
                className="text-center"
              >
                <div className={`
                  w-16 h-16 rounded-xl flex items-center justify-center text-3xl mb-2
                  ${achievement.earned
                    ? 'gradient-primary'
                    : 'bg-white/5 border border-white/10 opacity-50'
                  }
                `}>
                  {achievement.earned ? achievement.icon : '🔒'}
                </div>
                <div className="text-xs font-semibold">{achievement.name}</div>
                {achievement.earned && (
                  <Badge variant="success" className="text-xs mt-1">
                    {achievement.rarity}
                  </Badge>
                )}
              </motion.div>
            ))}
          </div>
        </Card>
        
        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card variant="glass" className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="text-success" size={20} />
              Win Rate
            </h3>
            <div className="relative w-32 h-32 mx-auto">
              <svg className="transform -rotate-90 w-32 h-32">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                  fill="none"
                />
                <motion.circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#10B981"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 56 * (1 - 0.7) }}
                  transition={{ duration: 1 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold">70%</div>
                  <div className="text-sm text-white/60">Win Rate</div>
                </div>
              </div>
            </div>
          </Card>
          
          <Card variant="glass" className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Target className="text-primary-from" size={20} />
              Favorite Category
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Crypto', value: 45, color: 'bg-primary-from' },
                { label: 'Weather', value: 30, color: 'bg-primary-to' },
                { label: 'Sports', value: 15, color: 'bg-success' },
                { label: 'Other', value: 10, color: 'bg-accent' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{item.label}</span>
                    <span className="text-white/60">{item.value}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.value}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className={`h-full ${item.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        
        {/* Recent Activity */}
        <Card variant="glass" className="p-6">
          <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {[
              { opponent: 'alice', prediction: 'BTC hits $100K', outcome: 'Won', amount: 0.5 },
              { opponent: 'bob', prediction: 'Rain tomorrow', outcome: 'Lost', amount: 0.1 },
              { opponent: 'charlie', prediction: 'SOL to $200', outcome: 'Won', amount: 0.3 },
            ].map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
              >
                <div>
                  <div className="font-semibold">vs @{activity.opponent}</div>
                  <div className="text-sm text-white/60">{activity.prediction}</div>
                </div>
                <div className="text-right">
                  <Badge variant={activity.outcome === 'Won' ? 'success' : 'danger'}>
                    {activity.outcome}
                  </Badge>
                  <div className={`text-sm mt-1 ${activity.outcome === 'Won' ? 'text-success' : 'text-danger'}`}>
                    {activity.outcome === 'Won' ? '+' : '-'}{activity.amount} SOL
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>
      
      <MobileNav />
    </div>
  )
}

