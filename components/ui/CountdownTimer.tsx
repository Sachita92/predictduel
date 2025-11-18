'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface CountdownTimerProps {
  targetDate: Date
  className?: string
  onComplete?: () => void
}

export default function CountdownTimer({ targetDate, className, onComplete }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0,
  })
  
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const target = targetDate.getTime()
      const difference = target - now
      
      if (difference <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, total: 0 })
        onComplete?.()
        return
      }
      
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((difference / (1000 * 60)) % 60)
      const seconds = Math.floor((difference / 1000) % 60)
      
      setTimeLeft({ hours, minutes, seconds, total: difference })
    }
    
    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)
    
    return () => clearInterval(interval)
  }, [targetDate, onComplete])
  
  const isUrgent = timeLeft.total < 3600000 // Less than 1 hour
  const isVeryUrgent = timeLeft.total < 300000 // Less than 5 minutes
  
  const formatTime = (value: number) => String(value).padStart(2, '0')
  
  return (
    <div className={cn(
      'flex items-center gap-2',
      isVeryUrgent && 'animate-pulse',
      className
    )}>
      <div className={cn(
        'px-4 py-2 rounded-lg font-mono font-bold text-lg',
        isVeryUrgent ? 'bg-danger text-white' : isUrgent ? 'bg-accent text-white' : 'bg-white/10 text-white'
      )}>
        {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
      </div>
    </div>
  )
}

