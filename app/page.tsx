'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ArrowRight, TrendingUp, Zap, Users } from 'lucide-react'
import TopNav from '@/components/navigation/TopNav'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

interface Activity {
  type: string
  emoji: string
  message: string
  timestamp: string
}

export default function Home() {
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalDuels: 0,
    totalWon: 0,
  })
  
  // Fetch real activity feed
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/activity/feed?limit=20')
        const data = await response.json()
        
        if (data.success) {
          if (data.activities) {
            setActivities(data.activities)
          }
          if (data.stats) {
            setStats(data.stats)
          }
        } else {
          // Fallback to default messages if no activities
          setActivities([
            { type: 'default', emoji: '🔥', message: 'Welcome to PredictDuel! Start your first prediction.', timestamp: new Date().toISOString() },
          ])
        }
      } catch (error) {
        console.error('Error fetching activities:', error)
        // Fallback to default messages on error
        setActivities([
          { type: 'default', emoji: '🔥', message: 'Welcome to PredictDuel! Start your first prediction.', timestamp: new Date().toISOString() },
        ])
      } finally {
        setLoading(false)
      }
    }
    
    fetchActivities()
    
    // Refresh activities every 30 seconds
    const interval = setInterval(fetchActivities, 30000)
    return () => clearInterval(interval)
  }, [])
  
  const handleStartDuel = useCallback(() => {
    // When button is clicked, take user to the create duel page
    router.push('/create')
  }, [router])
  
  const handleViewDuels = useCallback(() => {
    // When button is clicked, take user to the duels page to see other duels
    router.push('/duels')
  }, [router])
  
  return (
    <div className="min-h-screen bg-background-dark">
      <TopNav />
      
      {/* Live Feed Ticker - Right after header */}
      <section className="relative overflow-hidden pt-4 pb-4">
        <div className="max-w-7xl mx-auto px-4">
          <Card variant="glass" className="overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-success">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                <span className="text-sm font-medium">LIVE</span>
              </div>
              <div className="flex-1 overflow-hidden relative">
                {loading ? (
                  <div className="flex items-center justify-center py-2">
                    <span className="text-white/60 text-sm">Loading activity...</span>
                  </div>
                ) : activities.length > 0 ? (
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{
                      duration: activities.length * 8, // Adjust speed based on number of activities
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="flex items-center gap-8 whitespace-nowrap"
                  >
                    {/* Duplicate activities for seamless loop */}
                    {[...activities, ...activities].map((activity, index) => (
                      <span key={`${activity.timestamp}-${index}`} className="text-white/80">
                        {activity.emoji} {activity.message}
                      </span>
                    ))}
                  </motion.div>
                ) : (
                  <div className="flex items-center justify-center py-2">
                    <span className="text-white/60 text-sm">No recent activity</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </section>

      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-20 left-10 w-96 h-96 bg-primary-from/30 rounded-full blur-3xl"
            animate={{
              x: [0, 100, 0],
              y: [0, 50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute top-40 right-20 w-96 h-96 bg-primary-to/30 rounded-full blur-3xl"
            animate={{
              x: [0, -100, 0],
              y: [0, -50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 font-display">
              <span className="gradient-text">Challenge Friends.</span>
              <br />
              Predict Outcomes.
              <br />
              <span className="gradient-text">Win Instantly.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/70 mb-8 max-w-2xl mx-auto">
              Social prediction battles powered by Solana
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                glow 
                className="text-lg px-8 py-4 w-full sm:w-auto"
                onClick={handleStartDuel}
              >
                Start Your First Duel
                <ArrowRight className="ml-2 inline" size={20} />
              </Button>
              
              <Button 
                size="lg" 
                variant="secondary"
                className="text-lg px-8 py-4 w-full sm:w-auto bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 hover:from-purple-500/30 hover:to-pink-500/30 text-white"
                onClick={handleViewDuels}
              >
                View Predict Duels
              </Button>
            </div>
          </motion.div>
          
          {/* Stats Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {[
              { icon: Users, label: stats.totalDuels > 0 ? `${stats.totalDuels.toLocaleString()}+` : '10,000+', sublabel: 'Predictions Made' },
              { icon: TrendingUp, label: stats.totalWon > 0 ? `${stats.totalWon.toFixed(1)} SOL` : '$50K+', sublabel: 'Won' },
              { icon: Zap, label: '1ms', sublabel: 'Settlement' },
            ].map((stat, index) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                >
                  <Card variant="glass" hover className="text-center">
                    <Icon className="mx-auto mb-2 text-primary-from" size={32} />
                    <div className="text-2xl font-bold gradient-text">{stat.label}</div>
                    <div className="text-sm text-white/60">{stat.sublabel}</div>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>
      
      {/* Floating 3D Elements Preview */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 font-display">
            How It Works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '1',
                title: 'Create a Duel',
                description: 'Challenge a friend or join a public pool',
                icon: '⚔️',
              },
              {
                step: '2',
                title: 'Make Your Prediction',
                description: 'Choose YES or NO on any outcome',
                icon: '🎯',
              },
              {
                step: '3',
                title: 'Win Instantly',
                description: 'Get paid automatically when you\'re right',
                icon: '💰',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card variant="glass" hover className="text-center h-full">
                  <div className="text-5xl mb-4">{item.icon}</div>
                  <Badge variant="info" className="mb-4">Step {item.step}</Badge>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-white/70">{item.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

