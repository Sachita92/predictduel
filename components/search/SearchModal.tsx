'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, TrendingUp, Users, Zap, Clock } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

const recentSearches = [
  'BTC price prediction',
  'Weather in Kathmandu',
  'SOL to $200',
]

const trendingPredictions = [
  { id: '1', question: 'Will BTC hit $100K this week?', category: 'Crypto', participants: 234 },
  { id: '2', question: 'Will it rain tomorrow?', category: 'Weather', participants: 89 },
  { id: '3', question: 'Will SOL reach $200?', category: 'Crypto', participants: 156 },
]

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<typeof trendingPredictions>([])

  useEffect(() => {
    if (searchQuery.trim()) {
      // Simulate search results
      const filtered = trendingPredictions.filter(prediction =>
        prediction.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prediction.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setResults(filtered)
    } else {
      setResults([])
    }
  }, [searchQuery])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="relative z-10 w-full max-w-2xl"
        >
          <Card variant="glass" className="p-6">
            {/* Search Input */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
                <input
                  type="text"
                  placeholder="Search predictions, users, categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-primary-from focus:ring-2 focus:ring-primary-from/50"
                  autoFocus
                />
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} className="text-white/80" />
              </button>
            </div>

            {/* Search Results or Suggestions */}
            {searchQuery.trim() ? (
              results.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm text-white/60 mb-2">Search Results</div>
                  {results.map((result) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{result.question}</h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="info">{result.category}</Badge>
                            <span className="text-xs text-white/60 flex items-center gap-1">
                              <Users size={12} />
                              {result.participants} participants
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-white/60">
                  <Search size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No results found for "{searchQuery}"</p>
                </div>
              )
            ) : (
              <div className="space-y-6">
                {/* Recent Searches */}
                <div>
                  <div className="text-sm text-white/60 mb-3 flex items-center gap-2">
                    <Clock size={16} />
                    Recent Searches
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => setSearchQuery(search)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trending Predictions */}
                <div>
                  <div className="text-sm text-white/60 mb-3 flex items-center gap-2">
                    <TrendingUp size={16} />
                    Trending Predictions
                  </div>
                  <div className="space-y-2">
                    {trendingPredictions.map((prediction) => (
                      <motion.div
                        key={prediction.id}
                        whileHover={{ scale: 1.02 }}
                        className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-2">{prediction.question}</h3>
                            <div className="flex items-center gap-2">
                              <Badge variant="info">{prediction.category}</Badge>
                              <span className="text-xs text-white/60 flex items-center gap-1">
                                <Users size={12} />
                                {prediction.participants} participants
                              </span>
                            </div>
                          </div>
                          <Zap className="text-accent" size={20} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

