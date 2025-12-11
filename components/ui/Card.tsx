'use client'

import { ReactNode, ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface CardProps extends ComponentPropsWithoutRef<'div'> {
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
    // Extract conflicting event handlers to avoid type conflicts with framer-motion
    const {
      onAnimationStart,
      onAnimationEnd,
      onAnimationIteration,
      onDragStart,
      onDragEnd,
      onDrag,
      ...restProps
    } = props
    return (
      <motion.div
        className={baseClassName}
        whileHover={{ scale: 1.02, y: -4 }}
        transition={{ duration: 0.2 }}
        {...restProps}
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

