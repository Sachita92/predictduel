'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import TopNav from '@/components/navigation/TopNav'

export default function DuelPage() {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(true)
  
  useEffect(() => {
    // Redirect to feed page
    router.push('/feed')
    // Small delay to show loading state
    const timer = setTimeout(() => setIsRedirecting(false), 100)
    return () => clearTimeout(timer)
  }, [router])
  
  return (
    <div className="min-h-screen bg-background-dark">
      <TopNav />
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary-from" size={48} />
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    </div>
  )
}

