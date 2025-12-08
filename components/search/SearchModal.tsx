'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, TrendingUp, Users, Zap, Clock, Loader2, User, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

interface DuelResult {
  id: string
  question: string
  category: string
  participants: number
  poolSize: number
  creator: {
    username: string
  }
}

interface UserResult {
  id: string
  username: string
  avatar: string
  privyId: string
  stats: {
    wins: number
    losses: number
    totalEarned: number
    winRate: number
    currentStreak: number
  }
}

type SearchType = 'duels' | 'people'

const RECENT_SEARCHES_KEY = 'predictduel_recent_searches'
const MAX_RECENT_SEARCHES = 5

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<SearchType>('duels')
  const [showDropdown, setShowDropdown] = useState(false)
  const [results, setResults] = useState<DuelResult[]>([])
  const [userResults, setUserResults] = useState<UserResult[]>([])
  const [trendingDuels, setTrendingDuels] = useState<DuelResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored))
        } catch (e) {
          console.error('Error loading recent searches:', e)
        }
      }
    }
  }, [])

  // Load trending duels when modal opens
  useEffect(() => {
    if (isOpen && !searchQuery.trim()) {
      fetchTrendingDuels()
    }
  }, [isOpen, searchQuery])

  const fetchTrendingDuels = async () => {
    try {
      const response = await fetch('/api/duels?status=active&limit=5')
      const data = await response.json()
      if (data.success && data.duels) {
        setTrendingDuels(data.duels.map((duel: any) => ({
          id: duel.id,
          question: duel.question,
          category: duel.category,
          participants: duel.participants,
          poolSize: duel.poolSize,
          creator: {
            username: duel.creator.username,
          },
        })))
      }
    } catch (error) {
      console.error('Error fetching trending duels:', error)
    }
  }

  // Search with debounce
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!searchQuery.trim()) {
      setResults([])
      setUserResults([])
      return
    }

    setIsLoading(true)

    // Debounce search by 300ms
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        if (searchType === 'duels') {
          const response = await fetch(`/api/duels?status=active&search=${encodeURIComponent(searchQuery)}&limit=20`)
          const data = await response.json()
          
          if (data.success && data.duels) {
            setResults(data.duels.map((duel: any) => ({
              id: duel.id,
              question: duel.question,
              category: duel.category,
              participants: duel.participants,
              poolSize: duel.poolSize,
              creator: {
                username: duel.creator.username,
              },
            })))
          } else {
            setResults([])
          }
          setUserResults([])
        } else {
          // Search for users
          const response = await fetch(`/api/users/search?search=${encodeURIComponent(searchQuery)}&limit=20`)
          const data = await response.json()
          
          if (data.success && data.users) {
            setUserResults(data.users)
          } else {
            setUserResults([])
          }
          setResults([])
        }
      } catch (error) {
        console.error('Error searching:', error)
        setResults([])
        setUserResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, searchType])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
      // Reset search when closing
      setSearchQuery('')
      setResults([])
      setUserResults([])
      setShowDropdown(false)
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown && !(event.target as Element).closest('.search-type-dropdown')) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDropdown])

  const handleSearchClick = (query: string) => {
    setSearchQuery(query)
  }

  const handleResultClick = (duelId: string) => {
    // Save to recent searches
    if (searchQuery.trim()) {
      const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)]
        .slice(0, MAX_RECENT_SEARCHES)
      setRecentSearches(updated)
      if (typeof window !== 'undefined') {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
      }
    }
    
    onClose()
    router.push(`/duel/${duelId}`)
  }

  const handleTrendingClick = (duelId: string) => {
    onClose()
    router.push(`/duel/${duelId}`)
  }

  const handleUserClick = (user: UserResult) => {
    // Save to recent searches
    if (searchQuery.trim()) {
      const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)]
        .slice(0, MAX_RECENT_SEARCHES)
      setRecentSearches(updated)
      if (typeof window !== 'undefined') {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
      }
    }
    
    onClose()
    // Navigate to profile using privyId
    // Note: Profile page may need to be updated to handle viewing other users' profiles
    router.push(`/profile?privyId=${user.privyId}`)
  }

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
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-2xl"
        >
          <Card variant="glass" className="p-6">
            {/* Search Input */}
            <div className="flex items-center gap-4 mb-6">
              {/* Search Type Dropdown */}
              <div className="relative search-type-dropdown">
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors min-w-[120px]"
                >
                  <span className="capitalize">{searchType}</span>
                  <ChevronDown size={16} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-full bg-background-dark border border-white/10 rounded-xl overflow-hidden z-20 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchType('duels')
                        setShowDropdown(false)
                        setResults([])
                        setUserResults([])
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-white/10 transition-colors ${
                        searchType === 'duels' ? 'bg-white/10' : ''
                      }`}
                    >
                      Duels
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchType('people')
                        setShowDropdown(false)
                        setResults([])
                        setUserResults([])
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-white/10 transition-colors ${
                        searchType === 'people' ? 'bg-white/10' : ''
                      }`}
                    >
                      People
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
                <input
                  type="text"
                  placeholder={searchType === 'duels' ? 'Search duels, categories...' : 'Search people by username...'}
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
              isLoading ? (
                <div className="text-center py-12 text-white/60">
                  <Loader2 className="mx-auto mb-4 animate-spin" size={48} />
                  <p>Searching...</p>
                </div>
              ) : searchType === 'duels' ? (
                results.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-sm text-white/60 mb-2">
                      Found {results.length} duel{results.length !== 1 ? 's' : ''}
                    </div>
                    {results.map((result) => (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => handleResultClick(result.id)}
                        className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{result.question}</h3>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="info">{result.category}</Badge>
                              <span className="text-xs text-white/60 flex items-center gap-1">
                                <Users size={12} />
                                {result.participants} participant{result.participants !== 1 ? 's' : ''}
                              </span>
                              <span className="text-xs text-white/60">
                                by @{result.creator.username}
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
                    <p>No duels found for "{searchQuery}"</p>
                    <p className="text-sm mt-2">Try searching for a different keyword</p>
                  </div>
                )
              ) : (
                // People search results
                userResults.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-sm text-white/60 mb-2">
                      Found {userResults.length} user{userResults.length !== 1 ? 's' : ''}
                    </div>
                    {userResults.map((user) => (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => handleUserClick(user)}
                        className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-lg font-bold">
                            {user.avatar || user.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold mb-1">@{user.username}</div>
                            <div className="flex items-center gap-3 text-xs text-white/60">
                              <span>{user.stats.wins} wins</span>
                              <span>•</span>
                              <span>{user.stats.winRate.toFixed(0)}% win rate</span>
                              {user.stats.totalEarned > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-success">{user.stats.totalEarned.toFixed(2)} SOL earned</span>
                                </>
                              )}
                            </div>
                          </div>
                          <User size={20} className="text-white/40" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-white/60">
                    <User size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No users found for "{searchQuery}"</p>
                    <p className="text-sm mt-2">Try searching for a different username</p>
                  </div>
                )
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
                    {recentSearches.length > 0 ? (
                      recentSearches.map((search, index) => (
                        <button
                          key={index}
                          onClick={() => handleSearchClick(search)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors"
                        >
                          {search}
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-white/40">No recent searches</p>
                    )}
                  </div>
                </div>

                {/* Trending Duels */}
                <div>
                  <div className="text-sm text-white/60 mb-3 flex items-center gap-2">
                    <TrendingUp size={16} />
                    Trending Duels
                  </div>
                  <div className="space-y-2">
                    {trendingDuels.length > 0 ? (
                      trendingDuels.map((duel) => (
                        <motion.div
                          key={duel.id}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => handleTrendingClick(duel.id)}
                          className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold mb-2">{duel.question}</h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="info">{duel.category}</Badge>
                                <span className="text-xs text-white/60 flex items-center gap-1">
                                  <Users size={12} />
                                  {duel.participants} participant{duel.participants !== 1 ? 's' : ''}
                                </span>
                                <span className="text-xs text-white/60">
                                  {duel.poolSize.toFixed(2)} SOL
                                </span>
                              </div>
                            </div>
                            <Zap className="text-accent" size={20} />
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-white/40">
                        <Loader2 className="mx-auto mb-2 animate-spin" size={24} />
                        <p className="text-sm">Loading trending duels...</p>
                      </div>
                    )}
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

