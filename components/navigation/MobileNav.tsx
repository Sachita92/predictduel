'use client'

import { useState } from 'react'
import { Home, Zap, Plus, Trophy, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Zap, label: 'Lightning', path: '/lightning' },
  { icon: Plus, label: 'Create', path: '/create' },
  { icon: Trophy, label: 'Leaderboard', path: '/leaderboard' },
  { icon: User, label: 'Profile', path: '/profile' },
]

export default function MobileNav() {
  const [active, setActive] = useState('/')
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10">
      <div className="flex items-center justify-around px-2 py-3 max-w-md mx-auto">
        {navItems.map((item, index) => {
          const Icon = item.icon
          const isCreate = item.label === 'Create'
          
          return (
            <motion.button
              key={item.path}
              onClick={() => setActive(item.path)}
              className={cn(
                'relative flex flex-col items-center justify-center',
                isCreate && 'scale-125 -mt-2'
              )}
              whileTap={{ scale: 0.9 }}
            >
              <div className={cn(
                'p-3 rounded-full transition-all',
                active === item.path 
                  ? 'gradient-primary shadow-lg' 
                  : 'bg-white/5 hover:bg-white/10',
                isCreate && 'p-4'
              )}>
                <Icon 
                  size={isCreate ? 24 : 20} 
                  className={active === item.path ? 'text-white' : 'text-white/60'}
                />
              </div>
              {!isCreate && (
                <span className={cn(
                  'text-xs mt-1',
                  active === item.path ? 'text-white' : 'text-white/40'
                )}>
                  {item.label}
                </span>
              )}
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}

