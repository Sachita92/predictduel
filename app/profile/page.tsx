'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Edit, Trophy, TrendingUp, Target, Award, Loader2, Wallet, MoreVertical, Trash2, X } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import TopNav from '@/components/navigation/TopNav'
import MobileNav from '@/components/navigation/MobileNav'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { getWalletAddress } from '@/lib/privy-helpers'
import { APP_BLOCKCHAIN, getAppCurrency } from '@/lib/blockchain-config'
import { getWalletBalance, formatBalance } from '@/lib/wallet-balance'

interface UserProfile {
  id: string
  privyId: string
  walletAddress?: string
  username: string
  name?: string
  avatar?: string
  bio?: string
  stats: {
    wins: number
    losses: number
    totalEarned: number
    winRate: number
    currentStreak: number
    bestStreak: number
  }
  achievements: any[]
  favoriteCategories: string[]
  createdAt: string
}

interface Activity {
  id: string
  opponent: string
  prediction: string
  outcome: 'Won' | 'Lost' | 'Active' | 'Pending' | 'Resolved' | string
  amount: number
  date: string
  status?: string
  category?: string
  isCreator?: boolean
  stake?: number
  deadline?: string
  participantCount?: number
}

interface CategoryStat {
  label: string
  value: number
  color: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { ready, authenticated, user } = usePrivy()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [recentActivity, setRecentActivity] = useState<Activity[]>([])
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    bio: '',
    avatar: '',
  })
  const [nameError, setNameError] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  
  // Edit/Delete duel states
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingDuel, setEditingDuel] = useState<Activity | null>(null)
  const [deletingDuel, setDeletingDuel] = useState<Activity | null>(null)
  const [duelEditForm, setDuelEditForm] = useState({ stake: 0, deadline: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const walletAddress = getWalletAddress(user, APP_BLOCKCHAIN)
  const currency = getAppCurrency()

  const createProfile = useCallback(async () => {
    if (!user?.id || !walletAddress) return
    
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privyId: user.id,
          walletAddress: walletAddress,
          username: `user_${walletAddress.slice(0, 8)}`,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          setProfile(data.user)
        setEditForm({
          name: data.user.name || '',
          username: data.user.username || '',
          bio: data.user.bio || '',
          avatar: data.user.avatar || '',
        })
        setAvatarPreview(data.user.avatar || null)
        }
      }
    } catch (error) {
      console.error('Error creating profile:', error)
    }
  }, [user?.id, walletAddress])

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const response = await fetch(
        `/api/profile?privyId=${user.id}&walletAddress=${walletAddress}`
      )
      const data = await response.json()

      if (data.user) {
        setProfile(data.user)
        setRecentActivity(data.recentActivity || [])
        setCategoryStats(data.categoryStats || [])
        setEditForm({
          name: data.user.name || '',
          username: data.user.username || '',
          bio: data.user.bio || '',
          avatar: data.user.avatar || '',
        })
        setAvatarPreview(data.user.avatar || null)
      } else {
        // User doesn't exist, auto-create profile
        await createProfile()
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id, walletAddress, createProfile])

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/login')
    }
  }, [ready, authenticated, router])

  useEffect(() => {
    if (ready && authenticated && user?.id) {
      fetchProfile()
    }
  }, [ready, authenticated, user?.id, fetchProfile])

  // Fetch wallet balance
  useEffect(() => {
    if (walletAddress) {
      const fetchBalance = async () => {
        try {
          setLoadingBalance(true)
          const bal = await getWalletBalance(walletAddress)
          setBalance(bal)
        } catch (error) {
          console.error('Error fetching balance:', error)
        } finally {
          setLoadingBalance(false)
        }
      }
      fetchBalance()
    }
  }, [walletAddress])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB')
        return
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setAvatarPreview(result)
        setEditForm({ ...editForm, avatar: result })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpdateProfile = useCallback(async () => {
    // Validate name is required
    if (!editForm.name || editForm.name.trim() === '') {
      setNameError('Name is required')
      return
    }
    
    setNameError('')
    
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privyId: user?.id,
          name: editForm.name,
          username: editForm.username,
          bio: editForm.bio,
          avatar: editForm.avatar,
        }),
      })

      if (response.ok) {
        await fetchProfile()
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }, [editForm.name, editForm.username, editForm.bio, editForm.avatar, user?.id, fetchProfile])

  const handleEditDuel = async () => {
    if (!editingDuel || !user?.id) return
    
    setIsSaving(true)
    try {
      const response = await fetch(`/api/duels/${editingDuel.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privyId: user.id,
          stake: duelEditForm.stake,
          deadline: duelEditForm.deadline,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Failed to update duel')
        return
      }

      setEditingDuel(null)
      await fetchProfile()
    } catch (error) {
      console.error('Error updating duel:', error)
      alert('Failed to update duel')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteDuel = async () => {
    if (!deletingDuel || !user?.id) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/duels/${deletingDuel.id}?privyId=${user.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Failed to delete duel')
        return
      }

      setDeletingDuel(null)
      await fetchProfile()
    } catch (error) {
      console.error('Error deleting duel:', error)
      alert('Failed to delete duel')
    } finally {
      setIsDeleting(false)
    }
  }


  if (!ready || loading) {
    return (
      <div className="min-h-screen bg-background-dark pb-20">
        <TopNav />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-12 h-12 animate-spin text-primary-from" />
        </div>
        <MobileNav />
      </div>
    )
  }


  if (!ready || loading || !profile) {
    return (
      <div className="min-h-screen bg-background-dark pb-20">
        <TopNav />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-12 h-12 animate-spin text-primary-from" />
        </div>
        <MobileNav />
      </div>
    )
  }

  const earnedCount = profile.achievements.length
  const totalGames = profile.stats.wins + profile.stats.losses
  const winRatePercent = totalGames > 0 ? Math.round(profile.stats.winRate * 100) : 0
  
  return (
    <div className="min-h-screen bg-background-dark pb-20">
      <TopNav />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header Section */}
        <Card variant="glass" className="p-8 mb-6">
          {isEditing ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold mb-4">Edit Profile</h2>
              
              {/* Profile Picture Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">Profile Picture</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-4xl font-bold glow-effect overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{editForm.name ? editForm.name.charAt(0).toUpperCase() : editForm.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <label
                      htmlFor="avatar-upload"
                      className="inline-block px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 cursor-pointer transition-colors text-sm"
                    >
                      Choose Image
                    </label>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarPreview(null)
                          setEditForm({ ...editForm, avatar: '' })
                        }}
                        className="ml-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                      >
                        Remove
                      </button>
                    )}
                    <p className="text-xs text-white/40 mt-2">
                      JPG, PNG or GIF (max 5MB)
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => {
                    setEditForm({ ...editForm, name: e.target.value })
                    setNameError('')
                  }}
                  className={`w-full px-4 py-2 bg-white/5 border ${nameError ? 'border-danger' : 'border-white/10'} rounded-lg focus:border-primary-from focus:outline-none`}
                  placeholder="Enter your name"
                />
                {nameError && (
                  <div className="text-xs text-danger mt-1">{nameError}</div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Username</label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-primary-from focus:outline-none"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Bio</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-primary-from focus:outline-none resize-none"
                  placeholder="Tell us about yourself..."
                  rows={3}
                  maxLength={200}
                />
                <div className="text-xs text-white/40 mt-1">
                  {editForm.bio.length}/200 characters
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleUpdateProfile}>Save Changes</Button>
                <Button variant="outline" onClick={() => {
                  setIsEditing(false)
                  setNameError('')
                  setAvatarPreview(profile?.avatar || null)
                  setEditForm({
                    name: profile?.name || '',
                    username: profile?.username || '',
                    bio: profile?.bio || '',
                    avatar: profile?.avatar || '',
                  })
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-4xl font-bold glow-effect overflow-hidden">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span>{profile.name ? profile.name.charAt(0).toUpperCase() : profile.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  {profile.name && (
                    <h1 className="text-3xl font-bold mb-1">{profile.name}</h1>
                  )}
                  <p className="text-xl text-white/80 mb-2">@{profile.username}</p>
                  <p className="text-white/60 mb-2">
                    {profile.bio || 'No bio yet'}
                  </p>
                  {walletAddress && (
                    <>
                      <p className="text-xs text-white/40 mb-2 font-mono">
                        {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                      </p>
                      <div className="mb-4 flex items-center gap-2">
                        {loadingBalance ? (
                          <Loader2 className="w-5 h-5 animate-spin text-primary-from" />
                        ) : (
                          <>
                            <Wallet size={18} className="text-primary-from" />
                            <span className="text-lg font-bold gradient-text">
                              {balance !== null ? formatBalance(balance) : '0'} {currency}
                            </span>
                          </>
                        )}
                      </div>
                    </>
                  )}
                  <div className="flex gap-4">
                    <div>
                      <div className="text-2xl font-bold gradient-text">{profile.stats.wins}</div>
                      <div className="text-sm text-white/60">Wins</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-danger">{profile.stats.losses}</div>
                      <div className="text-sm text-white/60">Losses</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-accent">
                        {profile.stats.totalEarned.toFixed(2)} {currency}
                      </div>
                      <div className="text-sm text-white/60">Total Earned</div>
                    </div>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit size={16} className="mr-2" />
                Edit Profile
              </Button>
            </div>
          )}
        </Card>
        
        {/* Achievement Badges */}
        <Card variant="glass" className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Award className="text-accent" size={24} />
              Achievements
            </h2>
            <Badge variant="info">{earnedCount} Badges Earned</Badge>
          </div>
          {profile.achievements.length > 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {profile.achievements.map((achievement: any, index: number) => (
                <motion.div
                  key={achievement._id || index}
                  whileHover={{ scale: 1.1 }}
                  className="text-center"
                >
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl mb-2 gradient-primary">
                    {achievement.icon}
                  </div>
                  <div className="text-xs font-semibold">{achievement.name}</div>
                  <Badge variant="success" className="text-xs mt-1">
                    {achievement.rarity}
                  </Badge>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/60">
              <Trophy size={48} className="mx-auto mb-4 opacity-30" />
              <p>No achievements yet. Keep playing to earn badges!</p>
            </div>
          )}
        </Card>
        
        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card variant="glass" className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="text-success" size={20} />
              Win Rate & Streak
            </h3>
            <div className="relative w-32 h-32 mx-auto mb-6">
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
                  animate={{ strokeDashoffset: 2 * Math.PI * 56 * (1 - winRatePercent / 100) }}
                  transition={{ duration: 1 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold">{winRatePercent}%</div>
                  <div className="text-sm text-white/60">Win Rate</div>
                </div>
              </div>
            </div>
            <div className="flex gap-4 justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">
                  🔥 {profile.stats.currentStreak}
                </div>
                <div className="text-xs text-white/60">Current Streak</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  ⭐ {profile.stats.bestStreak}
                </div>
                <div className="text-xs text-white/60">Best Streak</div>
              </div>
            </div>
          </Card>
          
          <Card variant="glass" className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Target className="text-primary-from" size={20} />
              Prediction Categories
            </h3>
            {categoryStats.length > 0 ? (
              <div className="space-y-3">
                {categoryStats.slice(0, 5).map((item) => (
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
            ) : (
              <div className="text-center py-8 text-white/60">
                <Target size={48} className="mx-auto mb-4 opacity-30" />
                <p>No prediction data yet.</p>
              </div>
            )}
          </Card>
        </div>
        
        {/* Recent Activity */}
        <Card variant="glass" className="p-6">
          <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => router.push(`/duel/${activity.id}`)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="info" className="text-xs">
                        {activity.category || 'Other'}
                      </Badge>
                      {activity.isCreator ? (
                        <span className="font-semibold text-primary-from">
                          Created • {activity.participantCount || 0} {(activity.participantCount || 0) === 1 ? 'bet' : 'bets'}
                        </span>
                      ) : (
                        <span className="font-semibold">vs @{activity.opponent}</span>
                      )}
                    </div>
                    <div className="text-sm text-white/60 line-clamp-1 mb-1">
                      {activity.prediction}
                    </div>
                    <div className="text-xs text-white/40">
                      {new Date(activity.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <Badge 
                        variant={
                          activity.outcome === 'Won' ? 'success' : 
                          activity.outcome === 'Lost' ? 'danger' :
                          activity.outcome === 'Active' ? 'info' :
                          'warning'
                        }
                      >
                        {activity.outcome}
                      </Badge>
                      {(activity.outcome === 'Won' || activity.outcome === 'Lost') && (
                        <div className={`text-sm mt-1 ${activity.outcome === 'Won' ? 'text-success' : 'text-danger'}`}>
                          {activity.outcome === 'Won' ? '+' : '-'}{activity.amount.toFixed(2)} {currency}
                        </div>
                      )}
                      {activity.outcome === 'Active' && (
                        <div className="text-sm mt-1 text-white/60">
                          Stake: {activity.amount.toFixed(2)} {currency}
                        </div>
                      )}
                    </div>
                    
                    {/* Three-dot menu - only show if user is creator and duel is pending/active */}
                    {activity.isCreator && (activity.status === 'pending' || activity.status === 'active') && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(openMenuId === activity.id ? null : activity.id)
                          }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <MoreVertical size={18} className="text-white/60" />
                        </button>
                        
                        {openMenuId === activity.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-40"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 top-full mt-2 bg-background-dark border border-white/10 rounded-lg shadow-lg z-50 min-w-[150px]">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingDuel(activity)
                                  setDuelEditForm({
                                    stake: activity.stake || 0,
                                    deadline: activity.deadline ? new Date(activity.deadline).toISOString().slice(0, 16) : ''
                                  })
                                  setOpenMenuId(null)
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-white/10 flex items-center gap-2 text-sm"
                              >
                                <Edit size={16} />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeletingDuel(activity)
                                  setOpenMenuId(null)
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-white/10 flex items-center gap-2 text-sm text-danger"
                              >
                                <Trash2 size={16} />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/60">
              <Trophy size={48} className="mx-auto mb-4 opacity-30" />
              <p>No activity yet. Start making predictions!</p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => router.push('/create')}
              >
                Create Your First Duel
              </Button>
            </div>
          )}
        </Card>
      </div>
      
      {/* Edit Duel Modal */}
      {editingDuel && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background-dark border border-white/10 rounded-xl p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold">Edit Duel</h3>
              <button
                onClick={() => setEditingDuel(null)}
                className="text-white/60 hover:text-white transition-colors"
                disabled={isSaving}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-white/70 text-sm mb-4">{editingDuel.prediction}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Stake Amount ({currency})</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={duelEditForm.stake}
                  onChange={(e) => setDuelEditForm({ ...duelEditForm, stake: parseFloat(e.target.value) || 0.01 })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-primary-from focus:outline-none"
                  disabled={isSaving}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Deadline</label>
                <input
                  type="datetime-local"
                  value={duelEditForm.deadline}
                  onChange={(e) => setDuelEditForm({ ...duelEditForm, deadline: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-primary-from focus:outline-none"
                  disabled={isSaving}
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => setEditingDuel(null)}
                disabled={isSaving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditDuel}
                disabled={isSaving || !duelEditForm.stake || !duelEditForm.deadline}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20} />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Delete Duel Confirmation Modal */}
      {deletingDuel && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background-dark border border-white/10 rounded-xl p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-danger">Delete Duel</h3>
              <button
                onClick={() => setDeletingDuel(null)}
                className="text-white/60 hover:text-white transition-colors"
                disabled={isDeleting}
              >
                <X size={24} />
              </button>
            </div>
            
            <p className="text-white/70 mb-2">
              Are you sure you want to delete this duel?
            </p>
            <p className="text-sm text-white/60 mb-6 font-semibold">
              "{deletingDuel.prediction}"
            </p>
            <p className="text-sm text-warning mb-6">
              ⚠️ This action cannot be undone. You can only delete duels with no participants.
            </p>
            
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setDeletingDuel(null)}
                disabled={isDeleting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteDuel}
                disabled={isDeleting}
                variant="destructive"
                className="flex-1"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20} />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} className="mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
      
      <MobileNav />
    </div>
  )
}

