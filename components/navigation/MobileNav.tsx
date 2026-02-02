'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Home, Zap, Plus, Trophy, User } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { cn } from '@/lib/utils'

interface UserProfile {
  username: string
  avatar?: string
}

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Zap, label: 'Lightning', path: '/lightning' },
  { icon: Plus, label: 'Create', path: '/create' },
  { icon: Trophy, label: 'Leaderboard', path: '/leaderboard' },
  { icon: User, label: 'Profile', path: '/profile' },
]

export default function MobileNav() {
  const pathname = usePathname()
  const { authenticated, user } = usePrivy()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  
  // Fetch user profile for avatar
  useEffect(() => {
    if (authenticated && user?.id) {
      fetch(`/api/profile?privyId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setProfile(data.user)
          }
        })
        .catch(err => console.error('Error fetching profile:', err))
    }
  }, [authenticated, user?.id])
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10">
      <div className="flex items-center justify-around px-2 py-3 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isCreate = item.label === 'Create'
          const isProfile = item.label === 'Profile'
          const isActive = pathname === item.path
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                'relative flex flex-col items-center justify-center active:scale-95 transition-transform',
                isCreate && 'scale-125 -mt-2'
              )}
            >
              <div className={cn(
                'p-3 rounded-full transition-all overflow-hidden',
                isActive 
                  ? 'gradient-primary shadow-lg' 
                  : 'bg-white/5 hover:bg-white/10',
                isCreate && 'p-4'
              )}>
                {isProfile && profile?.avatar ? (
                  <img 
                    src={profile.avatar} 
                    alt="Profile" 
                    className={cn(
                      'rounded-full object-cover',
                      isActive ? 'w-5 h-5' : 'w-5 h-5'
                    )} 
                  />
                ) : (
                  <Icon 
                    size={isCreate ? 24 : 20} 
                    className={isActive ? 'text-white' : 'text-white/60'}
                  />
                )}
              </div>
              {!isCreate && (
                <span className={cn(
                  'text-xs mt-1',
                  isActive ? 'text-white' : 'text-white/40'
                )}>
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

