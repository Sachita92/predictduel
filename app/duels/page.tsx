'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Clock, Users, TrendingUp, Loader2, Filter } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'
import TopNav from '@/components/navigation/TopNav'
import MobileNav from '@/components/navigation/MobileNav'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

interface Duel {
  id: string
  question: string
  category: string
  stake: number
  deadline: string
  status: string
  poolSize: number
  yesCount: number
  noCount: number
  creator: {
    id: string
    username: string
    avatar: string
    walletAddress: string
  }
  participants: number
  createdAt: string
}

const categories = ['All', 'Crypto', 'Weather', 'Sports', 'Meme', 'Local', 'Other']

export default function DuelsPage() {
  const router = useRouter()
  const { authenticated, user, ready } = usePrivy()
  const [duels, setDuels] = useState<Duel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  useEffect(() => {
    fetchDuels()
  }, [selectedCategory])

  const fetchDuels = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const categoryParam = selectedCategory === 'All' ? '' : selectedCategory
      const url = `/api/duels?status=active${categoryParam ? `&category=${categoryParam}` : ''}`
      
      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch duels')
      }

      setDuels(data.duels || [])
    } catch (err) {
      console.error('Error fetching duels:', err)
      setError(err instanceof Error ? err.message : 'Failed to load duels')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePredict = (duelId: string) => {
    // Navigate to duel detail page where user can make prediction
    router.push(`/duel/${duelId}`)
  }

  const formatTimeRemaining = (deadline: string) => {
    const now = new Date()
    const end = new Date(deadline)
    const diff = end.getTime() - now.getTime()

    if (diff <= 0) return 'Ended'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Crypto: 'bg-yellow-500/20 text-yellow-400',
      Weather: 'bg-blue-500/20 text-blue-400',
      Sports: 'bg-green-500/20 text-green-400',
      Meme: 'bg-pink-500/20 text-pink-400',
      Local: 'bg-purple-500/20 text-purple-400',
      Other: 'bg-gray-500/20 text-gray-400',
    }
    return colors[category] || colors.Other
  }

  return (
    <div className="min-h-screen bg-background-dark pb-20">
      <TopNav />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 font-display gradient-text">
            Active Duels
          </h1>
          <p className="text-white/70">
            Browse and predict on duels created by other users
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedCategory === category
                  ? 'gradient-primary text-white'
                  : 'bg-white/5 hover:bg-white/10 text-white/70'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-primary-from" size={48} />
              <p className="text-white/70">Loading duels...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Card variant="glass" className="p-8 text-center">
            <p className="text-danger mb-4">{error}</p>
            <Button onClick={fetchDuels} variant="secondary">
              Try Again
            </Button>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && duels.length === 0 && (
          <Card variant="glass" className="p-12 text-center">
            <div className="text-6xl mb-4">🔮</div>
            <h2 className="text-2xl font-bold mb-2">No Active Duels</h2>
            <p className="text-white/60 mb-6">
              There are no active duels in this category right now.
            </p>
            <Button onClick={() => router.push('/create')} glow>
              Create the First Duel
            </Button>
          </Card>
        )}

        {/* Duels Grid */}
        {!isLoading && !error && duels.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {duels.map((duel, index) => (
              <motion.div
                key={duel.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card variant="glass" hover className="p-6 h-full flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <Badge className={getCategoryColor(duel.category)}>
                      {duel.category}
                    </Badge>
                    <Badge
                      variant={duel.status === 'active' ? 'success' : 'info'}
                    >
                      {duel.status}
                    </Badge>
                  </div>

                  {/* Creator */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold">
                      {duel.creator.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-white/70">
                      @{duel.creator.username}
                    </span>
                  </div>

                  {/* Question */}
                  <h3 className="text-lg font-bold mb-4 line-clamp-2 flex-1">
                    {duel.question}
                  </h3>

                  {/* Stats */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-white/60">
                        <Clock size={14} />
                        <span>Time Left</span>
                      </div>
                      <span className="font-semibold">
                        {formatTimeRemaining(duel.deadline)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-white/60">
                        <Users size={14} />
                        <span>Participants</span>
                      </div>
                      <span className="font-semibold">
                        {duel.participants}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-white/60">
                        <TrendingUp size={14} />
                        <span>Pool Size</span>
                      </div>
                      <span className="font-semibold gradient-text">
                        {duel.poolSize.toFixed(2)} SOL
                      </span>
                    </div>
                  </div>

                  {/* Prediction Stats */}
                  <div className="flex gap-2 mb-4">
                    <div className="flex-1 bg-success/20 rounded-lg p-2 text-center">
                      <div className="text-xs text-white/60 mb-1">YES</div>
                      <div className="font-bold text-success">
                        {duel.yesCount}
                      </div>
                    </div>
                    <div className="flex-1 bg-danger/20 rounded-lg p-2 text-center">
                      <div className="text-xs text-white/60 mb-1">NO</div>
                      <div className="font-bold text-danger">
                        {duel.noCount}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => handlePredict(duel.id)}
                    className="w-full"
                    glow
                  >
                    Make Prediction
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <MobileNav />
    </div>
  )
}

