'use client'

import { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'gradient'
  hover?: boolean
  children: ReactNode
  className?: string
}

export default function Card({ className, variant = 'default', hover = false, children, ...props }: CardProps) {
  const variants = {
    default: 'bg-background-darker rounded-2xl p-6',
    glass: 'glass rounded-2xl p-6',
    gradient: 'gradient-primary rounded-2xl p-6',
  }
  
  const baseClassName = cn(variants[variant as keyof typeof variants], className)
  
  if (hover) {
    return (
      <motion.div
        className={baseClassName}
        whileHover={{ scale: 1.02, y: -4 }}
        transition={{ duration: 0.2 }}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
  
  return (
    <div className={baseClassName} {...props}>
      {children}
    </div>
  )
}

